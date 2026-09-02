import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { calculateDistressScore, levelFromScore, LEVEL_META } from "@/lib/distress/engine";

async function createSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* no-op in RSC */ }
        },
      },
    }
  );
}

/** GET /api/chat/context — lightweight profile summary for ChatWidget UI */
export async function GET() {
  try {
    const supabase = await createSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ authenticated: false });
    }

    const [
      { data: profile },
      { data: contacts },
      { data: safeLocations },
      { data: incidents },
    ] = await Promise.all([
      supabase.from("profiles").select("full_name, helper_availability").eq("id", user.id).single(),
      supabase.from("trusted_contacts").select("id").eq("user_id", user.id),
      supabase.from("safe_locations").select("id, is_active").eq("user_id", user.id),
      supabase.from("incidents").select("id, started_at").eq("user_id", user.id)
        .gte("started_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const firstName = profile?.full_name?.trim().split(" ")[0] ?? null;
    const activeSafeZones = (safeLocations ?? []).filter(s => s.is_active).length;
    const trustedContactCount = (contacts ?? []).length;
    const recentIncidentCount = (incidents ?? []).length;

    // Compute a basic distress score using time-of-day + history only
    // (no GPS available server-side — client will compute full score)
    const hourOfDay = new Date().getHours();
    const basicScore = calculateDistressScore({
      userLat: null, userLng: null,
      safeLocations: [], homeLocation: null, workLocations: [], regularRoutes: [],
      totalIncidents: recentIncidentCount, recentIncidents: recentIncidentCount,
      lastActiveAt: new Date(), hourOfDay,
      manualTrigger: false, userReportedUnsafe: false,
    });

    return NextResponse.json({
      authenticated: true,
      firstName,
      activeSafeZones,
      trustedContactCount,
      recentIncidentCount,
      helperAvailable: profile?.helper_availability ?? false,
      baseScore: basicScore.score,
      baseLevel: basicScore.level,
      levelMeta: LEVEL_META[basicScore.level],
    });
  } catch (err) {
    console.error("Context API error:", err);
    return NextResponse.json({ authenticated: false });
  }
}

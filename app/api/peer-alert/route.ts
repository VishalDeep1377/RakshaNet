import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** POST — broadcast a peer help alert to nearby available users */
export async function POST(req: NextRequest) {
  const supabase = await createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { lat, lng, address, incident_id, radius_km = 5 } = body;

  if (!lat || !lng) {
    return NextResponse.json({ error: "Location required" }, { status: 400 });
  }

  // 1. Find all available helpers (excluding sender)
  const { data: helpers, error: helpersErr } = await supabase
    .from("profiles")
    .select("id, full_name, helper_availability, helper_location")
    .eq("helper_availability", true)
    .neq("id", user.id);

  if (helpersErr) {
    return NextResponse.json({ error: helpersErr.message }, { status: 500 });
  }

  // 2. Filter by distance
  const nearby = (helpers ?? []).filter((h) => {
    const loc = h.helper_location as { lat?: number; lng?: number } | null;
    if (!loc?.lat || !loc?.lng) return false;
    const dist = haversineKm(lat, lng, loc.lat, loc.lng);
    return dist <= radius_km;
  });

  if (nearby.length === 0) {
    return NextResponse.json({ sent: 0, message: "No available helpers nearby" });
  }

  // 3. Insert peer_alert rows for each nearby helper
  const alerts = nearby.map((h) => {
    const loc = h.helper_location as { lat?: number; lng?: number };
    const dist = haversineKm(lat, lng, loc.lat!, loc.lng!);
    return {
      sender_id: user.id,
      helper_id: h.id,
      incident_id: incident_id || null,
      sender_location: { lat, lng, address: address || "" },
      distance_km: Math.round(dist * 100) / 100,
      message: `🆘 Someone ${Math.round(dist * 1000)}m away needs help — are you ready to help? Please respond immediately if you can assist.`,
      status: "pending",
    };
  });

  const { data: inserted, error: insertErr } = await supabase
    .from("peer_alerts")
    .insert(alerts)
    .select("id");

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ sent: inserted?.length ?? 0, helpers_notified: nearby.length });
}

/** GET — fetch peer alerts sent to the current user */
export async function GET() {
  const supabase = await createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("peer_alerts")
    .select("*")
    .eq("helper_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alerts: data ?? [] });
}

/** PATCH — update alert status (accept / dismiss) */
export async function PATCH(req: NextRequest) {
  const supabase = await createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { alert_id, status } = await req.json();
  if (!alert_id || !["accepted", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const { error } = await supabase
    .from("peer_alerts")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", alert_id)
    .eq("helper_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

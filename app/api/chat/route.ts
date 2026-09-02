import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { LEVEL_META, type DistressLevel } from "@/lib/distress/engine";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent";

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

// ── Build rich system prompt from user profile ─────────────────────────────────
function buildSystemPrompt(profile: Record<string, unknown> | null, meta: {
  contacts: Array<{ name: string; relationship: string | null; priority: string }>;
  safeLocations: Array<{ name: string; address: string | null; is_active: boolean }>;
  recentIncidents: number;
  totalIncidents: number;
  distressScore: number | null;
  distressLevel: DistressLevel | null;
  locationContext: string | null;
  // Live GPS context
  userLat: number | null;
  userLng: number | null;
  locationAddress: string | null;
  routeDeviationScore: number | null;
  locationSafetyScore: number | null;
  speedKmh: number | null;
  routeContext: string | null;
}): string {
  const name = (profile?.full_name as string | null) ?? "the user";
  const firstName = name.trim().split(" ")[0];
  const levelInfo = meta.distressLevel ? LEVEL_META[meta.distressLevel] : null;

  // Build live GPS block
  const gpsBlock = meta.userLat !== null && meta.userLng !== null
    ? `\nLIVE GPS POSITION (real-time):
• Coordinates: ${meta.userLat.toFixed(5)}, ${meta.userLng.toFixed(5)}
• Address: ${meta.locationAddress ?? meta.locationContext ?? "Unknown"}
• Location Safety Score: ${meta.locationSafetyScore ?? "?"}/100
• Route Deviation Score: ${meta.routeDeviationScore ?? "?"}/100
• Route Context: ${meta.routeContext ?? "Unknown"}
• Estimated Speed: ${meta.speedKmh !== null && meta.speedKmh > 0 ? `${meta.speedKmh} km/h` : "Stationary or slow"}`
    : "\nLIVE GPS: Location permission not granted or unavailable.";

  const contactsList = meta.contacts.length > 0
    ? meta.contacts.map(c => `  • ${c.name} (${c.relationship ?? "Contact"}, ${c.priority} priority)`).join("\n")
    : "  • No trusted contacts saved yet";

  const safeList = meta.safeLocations.filter(s => s.is_active).length > 0
    ? meta.safeLocations.filter(s => s.is_active).map(s => `  • ${s.name}${s.address ? ": " + s.address : ""}`).join("\n")
    : "  • No active safe zones configured";

  const distressBlock = meta.distressScore !== null
    ? `\nCurrent Distress Score: ${meta.distressScore}/100 — Level: ${meta.distressLevel}
Description: ${levelInfo?.description ?? ""}
Location Context: ${meta.locationContext ?? "Unknown"}`
    : "";

  return `You are RakshaNet's AI Safety Companion — a warm, empathetic, and highly intelligent personal safety assistant specifically for ${firstName}.

You have direct access to ${firstName}'s real safety profile AND live location from the RakshaNet database. Use this data actively in every response. Reference specific details (names, locations, scores) to make responses feel personal and useful, not generic.

═══════════════════════════════════
PROFILE: ${name}
═══════════════════════════════════
• Full Name: ${(profile?.full_name as string) ?? "Not set"}
• Age Range: ${(profile?.age_range as string) ?? "Not set"}
• Blood Group: ${(profile?.blood_group as string) ?? "Not set"}
• Phone: ${(profile?.phone as string) ?? "Not set"}
• Medical Notes: ${(profile?.medical_notes as string) ?? "None"}
• Preferred Language: ${(profile?.preferred_language as string) ?? "English"}
${distressBlock}
${gpsBlock}

TRUSTED CONTACTS (${meta.contacts.length} total):
${contactsList}

ACTIVE SAFE ZONES (${meta.safeLocations.filter(s => s.is_active).length} active):
${safeList}

INCIDENT HISTORY:
• Total incidents: ${meta.totalIncidents}
• Recent (last 30 days): ${meta.recentIncidents}
${meta.recentIncidents > 2 ? "⚠ Elevated recent activity — be especially attentive." : ""}

HOME: ${(profile?.home_location as { address?: string } | null)?.address ?? "Not configured"}
WORK: ${((profile?.work_locations as Array<{ name: string; address: string }>) ?? []).map(w => `${w.name}: ${w.address}`).join("; ") || "Not configured"}

═══════════════════════════════════
BEHAVIOUR RULES
═══════════════════════════════════
1. ALWAYS greet ${firstName} by name in the first message.
2. Reference her REAL data: "Your trusted contact Priya can be reached at...", "You have 2 active safe zones: Market and College".
3. When the distress score is CAUTION (51+): mention it and suggest she move to a safe zone or share her location.
4. When the distress score is DANGER (66+): be urgent. Tell her the system has alerted her contacts. Ask if she needs to trigger SOS.
5. When the distress score is CRITICAL (81+): immediately confirm SOS is active, remind her to stay in a public place, tell her help is being dispatched.
6. Proactively offer to help with: adding safe zones, checking in with contacts, explaining her distress score, triggering SOS, route planning.
7. Be concise — 3-4 sentences unless more detail is truly needed. Use simple, clear language.
8. For emergencies, ALWAYS say: "Call 112 immediately."
9. If ${firstName} says she feels unsafe, set internal flag — respond as if distress score is DANGER regardless of current score.
10. Do NOT answer questions unrelated to safety, wellness, or ${firstName}'s profile.
11. When asked about current location: use the LIVE GPS data above. Be specific: "You are currently near [address], [distance] from home."
12. When route deviation is high (>50): proactively mention it and suggest the user verify she's on her planned route.
13. If speed is >80 km/h: acknowledge the user may be in a vehicle and adjust safety advice accordingly.`;
}

// ── POST /api/chat ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured in .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      messages, distressScore, distressLevel, locationContext,
      userLat, userLng, locationAddress,
      routeDeviationScore, locationSafetyScore, speedKmh, routeContext,
    } = body as {
      messages: Array<{ role: string; content: string }>;
      distressScore?: number | null;
      distressLevel?: DistressLevel | null;
      locationContext?: string | null;
      userLat?: number | null;
      userLng?: number | null;
      locationAddress?: string | null;
      routeDeviationScore?: number | null;
      locationSafetyScore?: number | null;
      speedKmh?: number | null;
      routeContext?: string | null;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Fetch user profile — falls back gracefully if unauthenticated
    const supabase = await createSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    let systemPrompt: string;

    if (user) {
      // Fetch all profile data in parallel
      const [
        { data: profile },
        { data: contacts },
        { data: safeLocations },
        { data: recentInc },
        { data: allInc },
      ] = await Promise.all([
        supabase.from("profiles").select(
          "full_name, age_range, blood_group, phone, medical_notes, preferred_language, home_location, work_locations, regular_routes, helper_availability"
        ).eq("id", user.id).single(),
        supabase.from("trusted_contacts").select("name, relationship, priority").eq("user_id", user.id),
        supabase.from("safe_locations").select("name, address, is_active").eq("user_id", user.id),
        supabase.from("incidents").select("id, started_at").eq("user_id", user.id)
          .gte("started_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("incidents").select("id").eq("user_id", user.id),
      ]);

      systemPrompt = buildSystemPrompt(profile as Record<string, unknown> | null, {
        contacts: (contacts ?? []) as Array<{ name: string; relationship: string | null; priority: string }>,
        safeLocations: (safeLocations ?? []) as Array<{ name: string; address: string | null; is_active: boolean }>,
        recentIncidents: (recentInc ?? []).length,
        totalIncidents: (allInc ?? []).length,
        distressScore: distressScore ?? null,
        distressLevel: distressLevel ?? null,
        locationContext: locationContext ?? null,
        userLat: userLat ?? null,
        userLng: userLng ?? null,
        locationAddress: locationAddress ?? null,
        routeDeviationScore: routeDeviationScore ?? null,
        locationSafetyScore: locationSafetyScore ?? null,
        speedKmh: speedKmh ?? null,
        routeContext: routeContext ?? null,
      });
    } else {
      // Public / landing page — generic assistant
      systemPrompt = `You are a helpful public-facing assistant for RakshaNet — a women's safety initiative by Iron Feather Foundation in India.
Help visitors understand RakshaNet's mission, initiatives (SilentShield, SafeRoute, Verified Responders), and how to get involved.
For emergencies: always say "Call 112 immediately."
Keep responses to 3-4 sentences. Do not answer unrelated questions.`;
    }

    // Build Gemini contents
    const contents = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const geminiBody = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: 600,
        topP: 0.9,
      },
    };

    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("Gemini API error:", err);
      return NextResponse.json(
        { error: "AI service temporarily unavailable. Please try again." },
        { status: 500 }
      );
    }

    const geminiData = await geminiRes.json();
    const reply =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "I'm unable to respond right now. Please try again.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

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

/** Build a Google Maps link for coordinates */
function buildMapsLink(lat: number | null, lng: number | null): string | null {
  if (!lat || !lng) return null;
  return `https://maps.google.com/?q=${lat},${lng}`;
}

/** Build the full SMS alert message */
function buildAlertMessage(
  userName: string,
  locationAddress: string | null,
  lat: number | null,
  lng: number | null,
  isCritical = false,
  responderInstructions: string | null = null,
): string {
  const mapsLink = buildMapsLink(lat, lng);

  const instructionsText = responderInstructions
    ? `\n🚨 Special Instructions:\n"${responderInstructions}"\n`
    : ``;

  if (isCritical) {
    // Level 4 — Critical Emergency: all contacts + police notified
    const lines = [
      `🆘 CRITICAL EMERGENCY — RakshaNet SilentShield`,
      ``,
      `${userName} is in a danger situation and needs URGENT help immediately!`,
      ``,
      `This is a critical alert. Please reach them RIGHT NOW or call emergency services.`,
      ``,
      locationAddress ? `📍 Last known location: ${locationAddress}` : `📍 Location: Not available`,
      mapsLink ? `🗺️ Navigate: ${mapsLink}` : ``,
      instructionsText,
      `Emergency services have been automatically notified.`,
      `Sent by RakshaNet SilentShield — AI Safety Network.`,
    ].filter(Boolean);
    return lines.join("\n");
  }

  // Level 3 — Confirmed Risk: primary trusted contact notified
  const lines = [
    `🆘 EMERGENCY ALERT — RakshaNet SilentShield`,
    ``,
    `${userName} is in a danger situation and needs help.`,
    ``,
    `Please check on them immediately — call or go to their location.`,
    ``,
    locationAddress ? `📍 Current location: ${locationAddress}` : `📍 Location: Not available`,
    mapsLink ? `🗺️ Navigate: ${mapsLink}` : ``,
    instructionsText,
    `Sent automatically by RakshaNet SilentShield — AI Safety Network.`,
  ].filter(Boolean);
  return lines.join("\n");
}

/** Build WhatsApp deep link for manual fallback */
function buildWhatsAppLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const e164 =
    digits.startsWith("91") && digits.length === 12
      ? digits
      : digits.startsWith("0")
      ? `91${digits.slice(1)}`
      : digits.length === 10
      ? `91${digits}`
      : digits;
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}


// ── POST: Trusted contact alert at Level 3 ─────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { raksha_score, raksha_level, location_address, location_lat, location_lng, incident_id } = body;

  // 1. Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, preferred_responder")
    .eq("id", user.id)
    .single();
  const userName = profile?.full_name || "A RakshaNet user";
  const instructions = profile?.preferred_responder?.instructions || null;

  // 2. Fetch primary trusted contact (fallback to any)
  const { data: contacts } = await supabase
    .from("trusted_contacts")
    .select("name, phone")
    .eq("user_id", user.id)
    .eq("priority", "Primary")
    .limit(1);

  let contact = contacts?.[0];
  if (!contact) {
    const { data: any } = await supabase
      .from("trusted_contacts")
      .select("name, phone")
      .eq("user_id", user.id)
      .limit(1);
    contact = any?.[0];
  }

  // 3. Build message with location + Google Maps link
  const message = buildAlertMessage(
    userName,
    location_address || null,
    location_lat || null,
    location_lng || null,
    false,
    instructions
  );

  const whatsappLink = buildWhatsAppLink(contact?.phone, message);

  // 4. (SMS removed, WhatsApp link generated)
  let smsSent = false;
  let smsResponse: unknown = null;

  // 5. Store alert in DB
  const { data: alertRecord, error: insertErr } = await supabase
    .from("trusted_contact_alerts")
    .insert({
      user_id: user.id,
      contact_name: contact?.name || "Emergency Contact",
      contact_phone: contact?.phone || null,
      user_full_name: userName,
      message,
      location_address: location_address || null,
      location_lat: location_lat || null,
      location_lng: location_lng || null,
      raksha_score: raksha_score || null,
      raksha_level: raksha_level || "CONFIRMED",
      incident_id: incident_id || null,
      status: "sent",
    })
    .select()
    .single();

  if (insertErr) {
    console.error("[trusted-alert] DB insert error:", insertErr.message);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    alert_id: alertRecord?.id,
    contact_name: contact?.name || "Emergency Contact",
    contact_phone: contact?.phone || null,
    user_name: userName,
    message,
    sms_sent: smsSent,
    sms_response: smsResponse,
    whatsapp_link: whatsappLink,
  });
}

// ── PUT: Police alert + all contacts at Level 4 ────────────────────────────
export async function PUT(req: NextRequest) {
  const supabase = await createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { raksha_score, location_address, location_lat, location_lng, incident_id } = body;

  // Fetch user name and instructions
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, preferred_responder")
    .eq("id", user.id)
    .single();
  const userName = profile?.full_name || "A RakshaNet user";
  const instructions = profile?.preferred_responder?.instructions || null;

  // Generate PCR reference number
  const pcrRef = `PCR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;

  // Build CRITICAL message
  const criticalMessage = buildAlertMessage(
    userName,
    location_address || null,
    location_lat || null,
    location_lng || null,
    true, // isCritical = true
    instructions
  );

  // Fetch ALL trusted contacts for Level 4 (SMS all of them)
  const { data: allContacts } = await supabase
    .from("trusted_contacts")
    .select("name, phone")
    .eq("user_id", user.id)
    .limit(5);

  // Generate WhatsApp links for every contact
  const contactLinks: Array<{
    name: string;
    phone: string;
    sms_sent: boolean;
    whatsapp_link: string | null;
  }> = [];

  for (const c of allContacts ?? []) {
    contactLinks.push({
      name: c.name,
      phone: c.phone,
      sms_sent: false,
      whatsapp_link: buildWhatsAppLink(c.phone, criticalMessage),
    });
  }

  // Store police alert
  const { data: policeRecord, error: policeErr } = await supabase
    .from("police_alerts")
    .insert({
      user_id: user.id,
      user_full_name: userName,
      location_address: location_address || null,
      location_lat: location_lat || null,
      location_lng: location_lng || null,
      raksha_score: raksha_score || null,
      incident_id: incident_id || null,
      station_name: "Nearest PCR Unit",
      pcr_reference: pcrRef,
      status: "dispatched",
    })
    .select()
    .single();

  if (policeErr) {
    console.error("[trusted-alert PUT] DB insert error:", policeErr.message);
    return NextResponse.json({ error: policeErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    police_alert_id: policeRecord?.id,
    pcr_reference: pcrRef,
    user_name: userName,
    station_name: "Nearest PCR Unit",
    contact_links: contactLinks,
    message: criticalMessage,
  });
}

// ── GET: Fetch alerts for current user ─────────────────────────────────────
export async function GET() {
  const supabase = await createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: contactAlerts }, { data: policeAlerts }] = await Promise.all([
    supabase
      .from("trusted_contact_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("police_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    trusted_contact_alerts: contactAlerts ?? [],
    police_alerts: policeAlerts ?? [],
  });
}

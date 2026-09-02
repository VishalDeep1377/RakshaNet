// =============================================================
// RAKSHANET — Geocoding API Route
// Server-side geocoding using Google Maps Geocoding API.
// Keeps the API key server-side, safe from browser exposure.
// =============================================================
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "address param required" }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Try Google Maps Geocoding first
  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === "OK" && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        return NextResponse.json({ lat, lng, source: "google" });
      }
    } catch (e) {
      console.error("[Geocode] Google failed:", e);
    }
  }

  // Fallback: Nominatim (OpenStreetMap) with User-Agent header
  const tryCandidates = [address, ...address.split(/[,]+/).slice(-2).map(s => s.trim())];

  for (const candidate of tryCandidates) {
    if (!candidate) continue;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(candidate)}&limit=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "RakshaNet-Safety-App/1.0 (contact@rakshanet.app)" }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        return NextResponse.json({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          source: "nominatim"
        });
      }
    } catch (e) {
      console.error("[Geocode] Nominatim failed:", e);
    }
  }

  return NextResponse.json({ error: "Could not geocode address" }, { status: 404 });
}

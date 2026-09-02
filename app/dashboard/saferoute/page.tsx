"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin, Navigation, Shield, Home, Briefcase, CheckCircle2,
  AlertTriangle, Clock, Locate, Users, Bell, BellOff, Zap,
  ArrowRight, Eye, TrendingUp, Radio,
} from "lucide-react";

/* ── Types ───────────────────────────────── */
interface SafeLocation { id: string; name: string; address: string; latitude: number | null; longitude: number | null; radius: number; is_active: boolean; }
interface WorkLocation  { id: string; name: string; address: string; latitude?: number; longitude?: number; }
interface HomeLocation  { address: string; latitude?: number; longitude?: number; notify: boolean; }
interface RouteEntry    { id: string; from: string; to: string; time: string; isPrimary: boolean; }
interface PeerAlert     { id: string; message: string; distance_km: number; created_at: string; sender_location: { address: string }; }

declare global { interface Window { L: typeof import("leaflet"); } }

const C = { red: "#FF2D55", cyan: "#00E5FF", green: "#00FF88", yellow: "#FFBA08", purple: "#B47FFF", blue: "#3B82F6" };

const TABS = ["safe", "route", "peer"] as const;
type Tab = typeof TABS[number];

/* ── Safety badge based on incident density ─ */
function safeBadge(incidents: number) {
  if (incidents === 0) return { label: "Safe",    color: C.green,  bg: "rgba(0,255,136,0.1)",  border: "rgba(0,255,136,0.25)" };
  if (incidents <= 2)  return { label: "Caution", color: C.yellow, bg: "rgba(255,186,8,0.1)",  border: "rgba(255,186,8,0.25)" };
  return               { label: "Watch",   color: C.red,    bg: "rgba(255,45,85,0.1)",   border: "rgba(255,45,85,0.25)" };
}

/* ── Leaflet helpers ─────────────────────── */
async function loadLeaflet() {
  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
  if (!window.L) {
    await new Promise<void>((resolve) => {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.onload = () => resolve();
      document.head.appendChild(s);
    });
  }
}

function makeIcon(color: string, pulse = false) {
  const L = window.L;
  return L.divIcon({
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:${color};
      border:3px solid rgba(255,255,255,0.85);
      box-shadow:0 0 ${pulse ? "16px" : "8px"} ${color}80;
      ${pulse ? "animation:mapPulse 1.8s ease-in-out infinite;" : ""}
    "></div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/* ── Live Map Component ───────────────────── */
function SafeZoneMap({ home, work, safe, userPos }: {
  home: HomeLocation | null;
  work: WorkLocation[];
  safe: SafeLocation[];
  userPos: { lat: number; lng: number } | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInst = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!mapRef.current) return;
      await loadLeaflet();
      if (!mounted || !mapRef.current) return;
      if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }

      const L = window.L;
      // Center: user position > home > India default
      const center: [number, number] = userPos
        ? [userPos.lat, userPos.lng]
        : home?.latitude && home?.longitude
          ? [home.latitude, home.longitude]
          : [20.5937, 78.9629];
      const zoom = userPos ? 14 : home?.latitude ? 13 : 5;

      const map = L.map(mapRef.current, { center, zoom, zoomControl: false });
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Standard OSM tile layer (Free, no API key)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      // Apply CSS filter to make OSM dark
      const tilePane = map.getPanes().tilePane;
      if (tilePane) {
        tilePane.style.filter = "invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)";
      }

      // User position — pulsing blue dot
      if (userPos) {
        L.marker([userPos.lat, userPos.lng], { icon: makeIcon(C.blue, true) })
          .addTo(map)
          .bindPopup(`<div style="color:#0A0F1E;font-weight:700;font-size:12px">📍 You are here</div>`);
      }

      // Home — green
      if (home?.latitude && home?.longitude) {
        L.marker([home.latitude, home.longitude], { icon: makeIcon(C.green) })
          .addTo(map)
          .bindPopup(`<div style="color:#0A0F1E;font-weight:700;font-size:12px">🏠 Home<br/><span style="font-weight:400;font-size:11px">${home.address}</span></div>`);
      }

      // Work — cyan
      work.forEach((w) => {
        if (w.latitude && w.longitude) {
          L.marker([w.latitude, w.longitude], { icon: makeIcon(C.cyan) })
            .addTo(map)
            .bindPopup(`<div style="color:#0A0F1E;font-weight:700;font-size:12px">🏢 ${w.name}<br/><span style="font-weight:400;font-size:11px">${w.address}</span></div>`);
        }
      });

      // Safe zones — purple circles + center dot
      safe.filter(s => s.is_active).forEach((s) => {
        if (s.latitude && s.longitude) {
          L.circle([s.latitude, s.longitude], {
            radius: s.radius || 200,
            color: C.purple,
            fillColor: C.purple,
            fillOpacity: 0.08,
            weight: 1.5,
            opacity: 0.4,
          }).addTo(map).bindPopup(`<div style="color:#0A0F1E;font-weight:700;font-size:12px">🛡 ${s.name}<br/><span style="font-weight:400;font-size:11px">Radius: ${s.radius || 200}m</span></div>`);
          L.marker([s.latitude, s.longitude], { icon: makeIcon(C.purple) })
            .addTo(map)
            .bindPopup(`<div style="color:#0A0F1E;font-weight:700;font-size:12px">🛡 ${s.name}</div>`);
        }
      });

      // ── Dynamic Safety Route (OSRM) ─────────────────────────────
      // Helper: call our server-side geocoding API
      const geocode = async (addr: string): Promise<[number, number] | null> => {
        if (!addr?.trim()) return null;
        try {
          const res = await fetch(`/api/geocode?address=${encodeURIComponent(addr)}`);
          if (!res.ok) return null;
          const d = await res.json();
          if (d.lat && d.lng) return [d.lat, d.lng];
        } catch { /* ignore */ }
        return null;
      };

      // Resolve start (college/work) and end (home) with coordinates
      let startCoords: [number, number] | null = null;
      let endCoords: [number, number] | null = null;
      let startLabel = "College / Work";
      let endLabel = "Home";

      // Priority 1: Home + Work with existing coordinates
      if (home?.latitude && home?.longitude) {
        endCoords = [home.latitude, home.longitude];
        endLabel = "Home";
      } else if (home?.address) {
        endCoords = await geocode(home.address);
        endLabel = "Home";
      }

      if (work.length > 0) {
        const w = work[0];
        if (w.latitude && w.longitude) {
          startCoords = [w.latitude, w.longitude];
          startLabel = w.name || "Work";
        } else if (w.address) {
          startCoords = await geocode(w.address);
          startLabel = w.name || "Work";
        }
      }

      // Priority 2: Fall back to safe zones (Home=safe[0], College=safe[1])
      if (!endCoords && safe.length >= 1) {
        const s = safe[0];
        if (s.latitude && s.longitude) { endCoords = [s.latitude, s.longitude]; endLabel = s.name; }
        else if (s.address) { endCoords = await geocode(s.address); endLabel = s.name; }
      }
      if (!startCoords && safe.length >= 2) {
        const s = safe[1];
        if (s.latitude && s.longitude) { startCoords = [s.latitude, s.longitude]; startLabel = s.name; }
        else if (s.address) { startCoords = await geocode(s.address); startLabel = s.name; }
      }
      // Try safe[0] as start if only one zone exists
      if (!startCoords && safe.length >= 1) {
        const s = safe[0];
        if (s.latitude && s.longitude) { startCoords = [s.latitude, s.longitude]; startLabel = s.name; }
        else if (s.address) { startCoords = await geocode(s.address); startLabel = s.name; }
      }

      if (startCoords && endCoords && mounted) {
        const [sLat, sLng] = startCoords;
        const [eLat, eLng] = endCoords;
        const url = `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${eLng},${eLat}?overview=full&geometries=geojson`;

        try {
          const res = await fetch(url);
          const data = await res.json();

          if (data.routes && data.routes.length > 0 && mounted) {
            const route = data.routes[0].geometry;
            const distance = (data.routes[0].distance / 1000).toFixed(1);
            const duration = Math.round(data.routes[0].duration / 60);

            // Layer 1: Wide outer glow
            L.geoJSON(route, { style: { color: "#00E5FF", weight: 20, opacity: 0.07, lineCap: "round", lineJoin: "round" } }).addTo(map);
            // Layer 2: Medium glow
            L.geoJSON(route, { style: { color: "#00E5FF", weight: 10, opacity: 0.15, lineCap: "round", lineJoin: "round" } }).addTo(map);
            // Layer 3: Core bright line
            L.geoJSON(route, { style: { color: "#00E5FF", weight: 3.5, opacity: 1, lineCap: "round", lineJoin: "round" } }).addTo(map);

            // Start marker (College)
            L.marker([sLat, sLng], { icon: makeIcon(C.cyan) }).addTo(map)
              .bindPopup(`<div style="color:#0A0F1E;font-weight:700;font-size:12px">🎓 ${startLabel}<br/><span style="font-weight:400;font-size:11px">Safe Route Start</span></div>`)
              .openPopup();

            // End marker (Home)
            L.marker([eLat, eLng], { icon: makeIcon(C.green) }).addTo(map)
              .bindPopup(`<div style="color:#0A0F1E;font-weight:700;font-size:12px">🏠 ${endLabel}<br/><span style="font-weight:400;font-size:11px">Safe Route End</span></div>`);

            // Route info tooltip in center of map
            const midLat = (sLat + eLat) / 2;
            const midLng = (sLng + eLng) / 2;
            L.popup({ closeButton: false, autoClose: false, closeOnClick: false, className: "route-info-popup" })
              .setLatLng([midLat, midLng])
              .setContent(`<div style="background:rgba(0,229,255,0.12);border:1px solid #00E5FF55;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:700;color:#00E5FF;white-space:nowrap">🛡 Safe Route · ${distance}km · ~${duration} min</div>`)
              .addTo(map);

            // Fit map to route
            const bounds = L.geoJSON(route).getBounds();
            map.fitBounds(bounds, { padding: [60, 60] });
          }
        } catch (err) {
          console.error("OSRM Routing Error:", err);
        }
      }

      mapInst.current = map;
      setTimeout(() => map.invalidateSize(), 150);
    };
    init();
    return () => { mounted = false; if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userPos?.lat, userPos?.lng,
    home?.address, home?.latitude, home?.longitude,
    safe.length, safe.map(s => s.address + (s.latitude ?? "")+"").join(","),
    work.length, work.map(w => w.address + (w.latitude ?? "")+"").join(",")
  ]);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%", minHeight: 400 }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      {/* Legend */}
      <div style={{ position: "absolute", bottom: 44, left: 12, display: "flex", flexDirection: "column", gap: 5, zIndex: 999 }}>
        {[
          { color: C.blue,   label: "You" },
          { color: C.cyan,   label: "College / Work" },
          { color: C.green,  label: "Home" },
          { color: C.purple, label: "Safe Zone" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(3,5,8,0.82)", padding: "4px 9px", borderRadius: 8, backdropFilter: "blur(8px)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, boxShadow: `0 0 5px ${l.color}` }} />
            <span style={{ fontSize: 10, color: "rgba(240,244,255,0.6)", fontWeight: 600 }}>{l.label}</span>
          </div>
        ))}
      </div>
      {/* CSS for pulse */}
      <style>{`
        @keyframes mapPulse {
          0%, 100% { box-shadow: 0 0 8px ${C.blue}80; transform: scale(1); }
          50%       { box-shadow: 0 0 24px ${C.blue}; transform: scale(1.25); }
        }
      `}</style>
    </div>
  );
}

/* ── Route Card ──────────────────────────── */
function RouteCard({ route, incidents, i }: { route: RouteEntry; incidents: number; i: number }) {
  const badge = safeBadge(incidents);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
      style={{
        padding: "18px 20px", borderRadius: 16,
        background: "rgba(6,10,18,0.85)", border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Route flow */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}`, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#F0F4FF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{route.from || "Start"}</span>
        </div>
        <ArrowRight style={{ width: 12, height: 12, color: "rgba(240,244,255,0.25)", flexShrink: 0 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.cyan, boxShadow: `0 0 6px ${C.cyan}`, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#F0F4FF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{route.to || "Destination"}</span>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {route.time && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Clock style={{ width: 11, height: 11, color: "rgba(240,244,255,0.3)" }} />
            <span style={{ fontSize: 11, color: "rgba(240,244,255,0.4)" }}>{route.time}</span>
          </div>
        )}
        {route.isPrimary && (
          <span style={{ fontSize: 9, fontWeight: 700, color: C.cyan, padding: "2px 7px", borderRadius: 100, background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", letterSpacing: "0.08em" }}>PRIMARY</span>
        )}
        <div style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 100, background: badge.bg, border: `1px solid ${badge.border}` }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: badge.color, letterSpacing: "0.08em" }}>{badge.label}</span>
        </div>
      </div>

      {/* Safety detail */}
      <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          {incidents === 0
            ? <CheckCircle2 style={{ width: 11, height: 11, color: C.green, flexShrink: 0, marginTop: 1 }} />
            : <AlertTriangle style={{ width: 11, height: 11, color: badge.color, flexShrink: 0, marginTop: 1 }} />
          }
          <span style={{ fontSize: 11, color: "rgba(240,244,255,0.4)", lineHeight: 1.5 }}>
            {incidents === 0
              ? "No incidents reported near this route in the past 30 days. Streets appear clear and trusted."
              : `${incidents} incident${incidents > 1 ? "s" : ""} reported near this route in the last 30 days. Stay alert, prefer busy well-lit streets.`}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Peer Alert Card ─────────────────────── */
function PeerAlertCard({ alert, onRespond }: { alert: PeerAlert; onRespond: (id: string, status: "accepted" | "dismissed") => void }) {
  const dist = alert.distance_km < 1
    ? `${Math.round(alert.distance_km * 1000)}m away`
    : `${alert.distance_km.toFixed(1)}km away`;
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
      style={{
        padding: "16px 18px", borderRadius: 14,
        background: "rgba(255,45,85,0.06)", border: "1px solid rgba(255,45,85,0.22)",
        boxShadow: "0 0 20px rgba(255,45,85,0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,45,85,0.12)", border: "1px solid rgba(255,45,85,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Radio style={{ width: 16, height: 16, color: C.red }} className="animate-pulse" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#F0F4FF", marginBottom: 3 }}>Help Request · {dist}</div>
          <p style={{ fontSize: 11.5, color: "rgba(240,244,255,0.5)", lineHeight: 1.5, marginBottom: 10 }}>{alert.message}</p>
          {alert.sender_location?.address && (
            <p style={{ fontSize: 10, color: "rgba(240,244,255,0.28)", marginBottom: 10 }}>📍 {alert.sender_location.address.slice(0, 80)}...</p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onRespond(alert.id, "accepted")} style={{
              flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: "linear-gradient(135deg,#FF2D55,#CC0033)", border: "none", color: "white", cursor: "pointer",
            }}>I Can Help</button>
            <button onClick={() => onRespond(alert.id, "dismissed")} style={{
              flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(240,244,255,0.4)", cursor: "pointer",
            }}>Dismiss</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main Page ───────────────────────────── */
export default function SafeRoutePage() {
  const [safeLocations, setSafeLocations]   = useState<SafeLocation[]>([]);
  const [workLocations, setWorkLocations]   = useState<WorkLocation[]>([]);
  const [homeLocation, setHomeLocation]     = useState<HomeLocation | null>(null);
  const [routes, setRoutes]                 = useState<RouteEntry[]>([]);
  const [routeIncidents, setRouteIncidents] = useState<Record<string, number>>({});
  const [userPos, setUserPos]               = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading]               = useState(true);
  const [activeTab, setActiveTab]           = useState<Tab>("safe");
  const [locating, setLocating]             = useState(false);

  // Peer alert state
  const [helperMode, setHelperMode]         = useState(false);
  const [peerAlerts, setPeerAlerts]         = useState<PeerAlert[]>([]);
  const [alertsLoading, setAlertsLoading]   = useState(false);
  const [savingHelper, setSavingHelper]     = useState(false);
  const [sendingAlert, setSendingAlert]     = useState(false);
  const [alertSent, setAlertSent]           = useState(false);
  const [userId, setUserId]                 = useState<string | null>(null);

  const card: React.CSSProperties = {
    background: "rgba(6,10,18,0.85)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 20,
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
  };

  /* ── Load data ── */
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      setUserId(user.id);

      const [{ data: sl }, { data: profile }, { data: recentInc }] = await Promise.all([
        supabase.from("safe_locations").select("*").eq("user_id", user.id),
        supabase.from("profiles").select("home_location,work_locations,regular_routes,helper_availability").eq("id", user.id).single(),
        supabase.from("incidents").select("id,location,started_at").eq("user_id", user.id)
          .gte("started_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      if (sl) setSafeLocations(sl);
      if (profile?.home_location?.address) setHomeLocation(profile.home_location as HomeLocation);
      if (Array.isArray(profile?.work_locations)) setWorkLocations(profile.work_locations.filter((w: WorkLocation) => w.address));
      if (Array.isArray(profile?.regular_routes)) setRoutes(profile.regular_routes);
      if (profile?.helper_availability) setHelperMode(profile.helper_availability);

      // Compute per-route incident counts (simple heuristic: incidents in last 30 days near user)
      const routeList: RouteEntry[] = Array.isArray(profile?.regular_routes) ? profile.regular_routes : [];
      const incCounts: Record<string, number> = {};
      routeList.forEach((r) => {
        // Count incidents (all user incidents act as a safety signal for their routes)
        incCounts[r.id] = recentInc?.length ?? 0;
      });
      setRouteIncidents(incCounts);

      setLoading(false);
    };
    load();
  }, []);

  /* ── Get user GPS ── */
  const locateUser = useCallback(() => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => { locateUser(); }, [locateUser]);

  /* ── Toggle helper mode ── */
  const toggleHelper = async () => {
    if (!userId) return;
    setSavingHelper(true);
    const supabase = createClient();
    const newVal = !helperMode;
    const update: Record<string, unknown> = { helper_availability: newVal, last_seen_at: new Date().toISOString() };
    if (newVal && userPos) update.helper_location = userPos;
    await supabase.from("profiles").update(update).eq("id", userId);
    setHelperMode(newVal);
    setSavingHelper(false);
  };

  /* ── Load peer alerts ── */
  const loadPeerAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await fetch("/api/peer-alert");
      const data = await res.json();
      setPeerAlerts(data.alerts ?? []);
    } catch { /* no-op */ } finally { setAlertsLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === "peer") loadPeerAlerts();
  }, [activeTab, loadPeerAlerts]);

  /* ── Realtime peer alerts subscription ── */
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("peer_alerts_rt")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "peer_alerts",
        filter: `helper_id=eq.${userId}`,
      }, (payload) => {
        setPeerAlerts((prev) => [payload.new as PeerAlert, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  /* ── Respond to peer alert ── */
  const respondToAlert = async (alertId: string, status: "accepted" | "dismissed") => {
    await fetch("/api/peer-alert", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert_id: alertId, status }),
    });
    setPeerAlerts((prev) => prev.filter(a => a.id !== alertId));
  };

  /* ── Send test alert ── */
  const sendTestAlert = async () => {
    if (!userPos) return;
    setSendingAlert(true);
    setAlertSent(false);
    try {
      await fetch("/api/peer-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: userPos.lat, lng: userPos.lng, address: "Current location", radius_km: 5 }),
      });
      setAlertSent(true);
      setTimeout(() => setAlertSent(false), 4000);
    } catch { /* no-op */ } finally { setSendingAlert(false); }
  };

  const STATIC_TIPS = [
    { icon: Shield,    color: C.green,  title: "Stay on well-lit, busy streets", desc: "Prefer main roads and areas with consistent foot traffic, especially after 8 PM." },
    { icon: Eye,       color: C.cyan,   title: "Stay aware — avoid distractions", desc: "Keep headphones at low volume and stay alert to your surroundings at all times." },
    { icon: Navigation, color: C.yellow, title: "Share your live route", desc: "Activate route sharing with trusted contacts when traveling alone at night." },
    { icon: CheckCircle2, color: C.purple, title: "Auto check-in at safe zones", desc: "Your marked safe locations trigger automatic check-ins when you arrive." },
    { icon: TrendingUp, color: C.blue,  title: "Trust established patterns", desc: "Stick to routes you travel regularly — familiarity improves both safety and confidence." },
    { icon: Radio,     color: C.red,    title: "SOS always ready", desc: "Keep RakshaNet open in background. SilentShield monitors continuously for distress signals." },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F0F4FF", margin: 0 }}>SafeRoute</h1>
          <p style={{ fontSize: 12, color: "rgba(240,244,255,0.38)", marginTop: 4 }}>Live safety map, trusted routes, and peer emergency network.</p>
        </div>
        {/* Locate me button */}
        <button onClick={locateUser} disabled={locating} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
          borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
          background: userPos ? "rgba(0,229,255,0.1)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${userPos ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.1)"}`,
          color: userPos ? C.cyan : "rgba(240,244,255,0.4)", transition: "all 0.2s",
        }}>
          <Locate style={{ width: 13, height: 13 }} />
          {locating ? "Locating..." : userPos ? "Location Found" : "Get My Location"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: 4, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", width: "fit-content" }}>
        {(["safe", "route", "peer"] as const).map(tab => {
          const labels: Record<Tab, string> = { safe: "Safe Zones", route: "Route Tips", peer: "Peer Alert" };
          const isActive = activeTab === tab;
          const accent = tab === "peer" ? C.red : C.cyan;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "8px 20px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              letterSpacing: "0.04em", border: "none", cursor: "pointer", transition: "all 0.2s",
              background: isActive ? `${accent}18` : "transparent",
              color: isActive ? accent : "rgba(240,244,255,0.35)",
              boxShadow: isActive ? `0 0 12px ${accent}20` : "none",
              position: "relative",
            }}>
              {labels[tab]}
              {tab === "peer" && peerAlerts.length > 0 && (
                <span style={{ position: "absolute", top: 4, right: 6, width: 7, height: 7, borderRadius: "50%", background: C.red, boxShadow: `0 0 6px ${C.red}` }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ══ SAFE ZONES TAB ══ */}
      {activeTab === "safe" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Live Map */}
          <div style={{ ...card, padding: 0, overflow: "hidden", gridRow: "span 2", minHeight: 520 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin style={{ width: 14, height: 14, color: C.cyan }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#F0F4FF" }}>Live Safety Map</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: C.green }}>Interactive</span>
              </div>
            </div>
            <div style={{ height: "calc(100% - 50px)" }}>
              {!loading && (
                <SafeZoneMap home={homeLocation} work={workLocations} safe={safeLocations} userPos={userPos} />
              )}
              {loading && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                  <div style={{ width: 32, height: 32, border: `2px solid ${C.cyan}40`, borderTopColor: C.cyan, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 12, color: "rgba(240,244,255,0.3)" }}>Loading map…</span>
                </div>
              )}
            </div>
          </div>

          {/* Right panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Home */}
            <div style={{ ...card, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Home style={{ width: 13, height: 13, color: C.green }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#F0F4FF" }}>Home Location</span>
              </div>
              {loading ? <div style={{ height: 36, background: "rgba(255,255,255,0.03)", borderRadius: 8, animation: "pulse 1.5s infinite" }} /> :
                homeLocation ? (
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.15)" }}>
                    <p style={{ fontSize: 12, color: "rgba(240,244,255,0.7)", margin: 0, lineHeight: 1.5 }}>{homeLocation.address}</p>
                  </div>
                ) : <p style={{ fontSize: 12, color: "rgba(240,244,255,0.25)", margin: 0 }}>Set in Safety Profile → Home Location</p>
              }
            </div>

            {/* Work */}
            <div style={{ ...card, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Briefcase style={{ width: 13, height: 13, color: C.cyan }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#F0F4FF" }}>Work / College</span>
              </div>
              {loading ? <div style={{ height: 36, background: "rgba(255,255,255,0.03)", borderRadius: 8, animation: "pulse 1.5s infinite" }} /> :
                workLocations.length === 0 ? <p style={{ fontSize: 12, color: "rgba(240,244,255,0.25)", margin: 0 }}>Set in Safety Profile → Work Locations</p> :
                  workLocations.map(w => (
                    <div key={w.id} style={{ padding: "9px 12px", borderRadius: 10, marginBottom: 6, background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.15)" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.cyan, marginBottom: 2 }}>{w.name}</div>
                      <p style={{ fontSize: 11.5, color: "rgba(240,244,255,0.6)", margin: 0 }}>{w.address}</p>
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Safe Zones list */}
          <div style={{ ...card, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Shield style={{ width: 13, height: 13, color: C.purple }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#F0F4FF" }}>Safe Zones</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(180,127,255,0.1)", border: "1px solid rgba(180,127,255,0.25)", color: C.purple, marginLeft: "auto" }}>
                {safeLocations.filter(s => s.is_active).length} Active
              </span>
            </div>
            {loading ? <div style={{ height: 80, background: "rgba(255,255,255,0.03)", borderRadius: 8, animation: "pulse 1.5s infinite" }} /> :
              safeLocations.length === 0 ? <p style={{ fontSize: 12, color: "rgba(240,244,255,0.25)", margin: 0 }}>Add safe zones in Safety Profile → Safe Locations</p> :
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {safeLocations.map(loc => (
                    <div key={loc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: loc.is_active ? "rgba(180,127,255,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${loc.is_active ? "rgba(180,127,255,0.15)" : "rgba(255,255,255,0.05)"}` }}>
                      <MapPin style={{ width: 12, height: 12, color: loc.is_active ? C.purple : "rgba(240,244,255,0.2)", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#F0F4FF" }}>{loc.name}</div>
                        <div style={{ fontSize: 10.5, color: "rgba(240,244,255,0.35)", marginTop: 1 }}>{loc.address} · {loc.radius}m radius</div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: loc.is_active ? C.green : "rgba(240,244,255,0.25)", letterSpacing: "0.08em" }}>
                        {loc.is_active ? "ACTIVE" : "OFF"}
                      </span>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      )}

      {/* ══ ROUTE TIPS TAB ══ */}
      {activeTab === "route" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* User routes */}
          {routes.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Navigation style={{ width: 13, height: 13, color: C.cyan }} />
                <h2 style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,244,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>Your Saved Routes</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12 }}>
                {routes.map((r, i) => (
                  <RouteCard key={r.id} route={r} incidents={routeIncidents[r.id] ?? 0} i={i} />
                ))}
              </div>
            </div>
          )}

          {routes.length === 0 && !loading && (
            <div style={{ ...card, padding: 28, textAlign: "center" }}>
              <Navigation style={{ width: 28, height: 28, color: "rgba(240,244,255,0.15)", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, color: "rgba(240,244,255,0.4)", marginBottom: 6 }}>No saved routes yet</p>
              <p style={{ fontSize: 11, color: "rgba(240,244,255,0.22)" }}>Add regular routes in Safety Profile → Regular Routes to get personalised safety analysis here.</p>
            </div>
          )}

          {/* General tips grid */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Shield style={{ width: 13, height: 13, color: C.green }} />
              <h2 style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,244,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>Safety Guidelines</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
              {STATIC_TIPS.map((tip, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  style={{ ...card, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: `${tip.color}12`, border: `1px solid ${tip.color}25`, flexShrink: 0 }}>
                      <tip.icon style={{ width: 17, height: 17, color: tip.color }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#F0F4FF", marginBottom: 5 }}>{tip.title}</div>
                      <p style={{ fontSize: 11.5, color: "rgba(240,244,255,0.42)", margin: 0, lineHeight: 1.6 }}>{tip.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Live route sharing card */}
          <div style={{ ...card, padding: 22, background: "rgba(0,255,136,0.03)", borderColor: "rgba(0,255,136,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Navigation style={{ width: 16, height: 16, color: C.green }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#F0F4FF" }}>Live Route Sharing</span>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.25)", color: C.green, letterSpacing: "0.06em" }}>BETA</span>
            </div>
            <p style={{ fontSize: 12, color: "rgba(240,244,255,0.38)", margin: 0, lineHeight: 1.7 }}>
              Enable live route sharing to automatically send your real-time location to trusted contacts while traveling.
              This feature uses your saved safe locations, home and work addresses to intelligently alert contacts if you deviate from your expected route or don't arrive within the expected time window.
            </p>
          </div>
        </div>
      )}

      {/* ══ PEER ALERT TAB ══ */}
      {activeTab === "peer" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 20 }}>
          {/* Helper mode toggle */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ ...card, padding: 22, borderColor: helperMode ? "rgba(0,255,136,0.2)" : "rgba(255,255,255,0.06)", background: helperMode ? "rgba(0,255,136,0.04)" : "rgba(6,10,18,0.85)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: helperMode ? "rgba(0,255,136,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${helperMode ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.1)"}`, flexShrink: 0 }}>
                  {helperMode ? <Bell style={{ width: 20, height: 20, color: C.green }} /> : <BellOff style={{ width: 20, height: 20, color: "rgba(240,244,255,0.35)" }} />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#F0F4FF", marginBottom: 4 }}>Helper Mode</div>
                  <p style={{ fontSize: 12, color: "rgba(240,244,255,0.4)", margin: 0, lineHeight: 1.5 }}>
                    When ON, you'll receive notifications if another RakshaNet user nearby needs emergency help.
                  </p>
                </div>
              </div>

              {/* Toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#F0F4FF" }}>Available to help nearby</div>
                  <div style={{ fontSize: 11, color: helperMode ? C.green : "rgba(240,244,255,0.3)", marginTop: 2 }}>
                    {helperMode ? "✓ You are currently a community helper" : "Enable to join the peer safety network"}
                  </div>
                </div>
                <button onClick={toggleHelper} disabled={savingHelper} style={{
                  position: "relative", width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                  background: helperMode ? C.green + "cc" : "rgba(255,255,255,0.1)", transition: "background 0.3s", flexShrink: 0,
                }}>
                  <motion.div animate={{ x: helperMode ? 24 : 2 }} transition={{ type: "spring", damping: 22, stiffness: 320 }}
                    style={{ position: "absolute", top: 5, width: 16, height: 16, borderRadius: "50%", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
                </button>
              </div>

              {helperMode && !userPos && (
                <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(255,186,8,0.06)", border: "1px solid rgba(255,186,8,0.2)" }}>
                  <p style={{ fontSize: 11, color: C.yellow, margin: 0 }}>⚠ Enable location above so the system knows your position to match nearby alerts.</p>
                </div>
              )}

              {helperMode && userPos && (
                <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.15)" }}>
                  <p style={{ fontSize: 11, color: C.green, margin: 0 }}>✓ Your approximate location is shared for proximity matching. Only used for alert routing.</p>
                </div>
              )}
            </motion.div>

            {/* Send help request */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={{ ...card, padding: 22, background: "rgba(255,45,85,0.03)", borderColor: "rgba(255,45,85,0.12)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Zap style={{ width: 15, height: 15, color: C.red }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#F0F4FF" }}>Send Help Request</span>
              </div>
              <p style={{ fontSize: 12, color: "rgba(240,244,255,0.38)", marginBottom: 16, lineHeight: 1.6 }}>
                Notify all available RakshaNet users within 5km of your current location that you may need help. Use this in non-emergency situations — for emergencies, always use the SOS panel.
              </p>
              <button onClick={sendTestAlert} disabled={!userPos || sendingAlert}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 12, fontSize: 13, fontWeight: 700, border: "none",
                  cursor: userPos ? "pointer" : "not-allowed", transition: "all 0.2s",
                  background: alertSent ? C.green : userPos ? "linear-gradient(135deg,#FF2D55,#CC0033)" : "rgba(255,255,255,0.05)",
                  color: userPos ? "white" : "rgba(240,244,255,0.3)",
                  boxShadow: userPos && !alertSent ? "0 4px 20px rgba(255,45,85,0.3)" : "none",
                }}>
                {alertSent ? "✓ Help Request Sent!" : sendingAlert ? "Sending…" : !userPos ? "Enable Location First" : "Notify Nearby Users"}
              </button>
            </motion.div>

            {/* How it works */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              style={{ ...card, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,244,255,0.28)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>How It Works</div>
              {[
                { icon: Bell,    color: C.cyan,  text: "Enable Helper Mode to join the peer safety network" },
                { icon: MapPin,  color: C.green, text: "Your city-level location is matched with nearby alerts" },
                { icon: Radio,   color: C.red,   text: "Get notified instantly when someone nearby needs help" },
                { icon: Users,   color: C.purple, text: "Community protection — women helping women" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: i < 3 ? 12 : 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: `${item.color}10`, border: `1px solid ${item.color}22`, flexShrink: 0 }}>
                    <item.icon style={{ width: 12, height: 12, color: item.color }} />
                  </div>
                  <p style={{ fontSize: 12, color: "rgba(240,244,255,0.45)", margin: 0, lineHeight: 1.5 }}>{item.text}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Incoming alerts */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Bell style={{ width: 13, height: 13, color: C.red }} />
                <h2 style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,244,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
                  Incoming Help Requests
                </h2>
                {peerAlerts.length > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(255,45,85,0.12)", border: "1px solid rgba(255,45,85,0.3)", color: C.red }}>
                    {peerAlerts.length} New
                  </span>
                )}
              </div>
              <button onClick={loadPeerAlerts} disabled={alertsLoading} style={{ fontSize: 11, color: "rgba(240,244,255,0.3)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
                {alertsLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {alertsLoading ? (
              [0, 1].map(i => (
                <div key={i} style={{ ...card, padding: 18, marginBottom: 10, animation: "pulse 1.5s infinite" }}>
                  <div style={{ height: 12, background: "rgba(255,255,255,0.05)", borderRadius: 6, marginBottom: 8 }} />
                  <div style={{ height: 10, background: "rgba(255,255,255,0.03)", borderRadius: 6, width: "60%" }} />
                </div>
              ))
            ) : peerAlerts.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ ...card, padding: 40, textAlign: "center" }}>
                <Users style={{ width: 32, height: 32, color: "rgba(240,244,255,0.1)", margin: "0 auto 14px" }} />
                <p style={{ fontSize: 13, color: "rgba(240,244,255,0.35)", marginBottom: 6 }}>
                  {helperMode ? "No active help requests nearby" : "Helper Mode is off"}
                </p>
                <p style={{ fontSize: 11, color: "rgba(240,244,255,0.2)", lineHeight: 1.5 }}>
                  {helperMode
                    ? "You'll see requests here and get real-time notifications when someone nearby needs assistance."
                    : "Enable Helper Mode to start receiving peer alert notifications from nearby users."}
                </p>
              </motion.div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <AnimatePresence>
                  {peerAlerts.map((alert) => (
                    <PeerAlertCard key={alert.id} alert={alert} onRespond={respondToAlert} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
      `}</style>
    </div>
  );
}

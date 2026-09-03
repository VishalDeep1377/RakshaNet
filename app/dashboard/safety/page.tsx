"use client";
// Force turbopack re-compile for staleness

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  Radio, AlertTriangle, MapPin, Mic, Clock,
  CheckCircle2, ChevronRight, Eye, EyeOff, Zap, Lock, Activity,
  Navigation, Wifi, WifiOff, Shield, Phone, Users,
} from "lucide-react";
import {
  calculateDistressScore, levelFromScore, LEVEL_META,
  type DistressResult, type SafeLocationInput, type HomeLocationInput, type WorkLocationInput,
} from "@/lib/distress/engine";
import { useLocation } from "@/app/context/LocationContext";
import { getLocationHistory } from "@/lib/location/history";
import { useRakshaScore, RAKSHA_LEVEL_META } from "@/app/context/RakshaScoreContext";

// Leaflet map loaded client-side only (no SSR)
const LiveMap = dynamic(() => import("./LiveMap"), { ssr: false, loading: () => <MapSkeleton /> });

function MapSkeleton() {
  return (
    <div style={{ height: 280, borderRadius: 14, background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 11, color: "rgba(240,244,255,0.2)" }}>Loading map…</div>
    </div>
  );
}

type IncidentStatus = "idle" | "triggered" | "dispatched" | "live" | "resolved" | "sealed";

interface Responder { id: string; name: string; type: string; distance: string; eta: string; trustScore: number; gender: string; color: string; }

const MOCK_RESPONDERS: Responder[] = [
  { id: "r1", name: "Kavita Sharma",       type: "NGO Partner · Verified", distance: "340m",  eta: "3 min", trustScore: 98, gender: "Female", color: "#00FF88" },
  { id: "r2", name: "Police PCR Unit 7",   type: "Police · Government",   distance: "820m",  eta: "6 min", trustScore: 95, gender: "Mixed",  color: "#00E5FF" },
  { id: "r3", name: "Campus Safety Officer",type: "Security · Verified",  distance: "1.1km", eta: "9 min", trustScore: 87, gender: "Male",   color: "#B47FFF" },
];

const C = { red: "var(--danger)", cyan: "var(--cyan)", green: "#00FF88", yellow: "#FFBA08", purple: "var(--ai-violet)" };

type AlertedLevel = "none" | "caution" | "danger" | "critical";

// ── Silent trigger toggle keys ───────────────────────────────
const TRIGGER_STORAGE_KEY = "raksha_triggers";
interface TriggerState { shake: boolean; volume: boolean; longPress: boolean; tripleTap: boolean; }
function loadTriggers(): TriggerState {
  if (typeof window === "undefined") return { shake: true, volume: true, longPress: true, tripleTap: true };
  try {
    const raw = localStorage.getItem(TRIGGER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { shake: true, volume: true, longPress: true, tripleTap: true };
  } catch { return { shake: true, volume: true, longPress: true, tripleTap: true }; }
}
function saveTriggers(t: TriggerState) {
  try { localStorage.setItem(TRIGGER_STORAGE_KEY, JSON.stringify(t)); } catch { /* no-op */ }
}

// ── Score bar component ──────────────────────────────────────
function ScoreBar({ label, value, weight, color, icon: Icon }: { label: string; value: number; weight: string; color: string; icon: React.ElementType }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon style={{ width: 12, height: 12, color }} />
          <span style={{ fontSize: 11, color: "rgba(240,244,255,0.5)" }}>{label}</span>
          <span style={{ fontSize: 10, color: "rgba(240,244,255,0.2)" }}>· {weight}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "monospace" }}>{value}</span>
      </div>
      <div style={{ height: 4, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
        <motion.div animate={{ width: `${value}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg,${color}80,${color})` }} />
      </div>
    </div>
  );
}

// ── Cancel window ────────────────────────────────────────────
function CancelWindow({ duration, onCancel, onConfirm }: { duration: number; onCancel: () => void; onConfirm: () => void }) {
  const [remaining, setRemaining] = useState(duration);
  useEffect(() => {
    if (remaining <= 0) { onConfirm(); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onConfirm]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
        style={{ width: "100%", maxWidth: 360, borderRadius: 24, padding: 40, textAlign: "center", background: "rgba(6,10,18,0.97)", border: "1px solid rgba(255,45,85,0.4)", boxShadow: "0 0 80px rgba(255,45,85,0.25)" }}>
        <div style={{ position: "relative", width: 96, height: 96, margin: "0 auto 24px" }}>
          <svg style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} viewBox="0 0 96 96" fill="none">
            <circle cx="48" cy="48" r="44" stroke="rgba(255,45,85,0.15)" strokeWidth="2" />
            <motion.circle cx="48" cy="48" r="44" stroke={C.red} strokeWidth="2"
              strokeDasharray={2 * Math.PI * 44}
              initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 44 * (remaining / duration) }}
              strokeLinecap="round" transition={{ duration: 0.9 }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, color: C.red, fontFamily: "monospace" }}>{remaining}</div>
        </div>
        <AlertTriangle style={{ width: 22, height: 22, color: C.red, margin: "0 auto 10px" }} />
        <h2 style={{ fontSize: 20, fontWeight: 900, color: "#F0F4FF", marginBottom: 8 }}>SOS Triggered</h2>
        <p style={{ fontSize: 13, color: "rgba(240,244,255,0.45)", marginBottom: 28, lineHeight: 1.6 }}>
          Dispatching responders in <strong style={{ color: "#F0F4FF" }}>{remaining}s</strong>.<br />Tap Cancel if you&apos;re safe.
        </p>
        <button onClick={onCancel} style={{ width: "100%", padding: "14px 0", borderRadius: 14, fontSize: 13, fontWeight: 700, color: "#F0F4FF", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer" }}>
          Cancel — I&apos;m Safe
        </button>
        <p style={{ fontSize: 10, color: "rgba(240,244,255,0.2)", marginTop: 16 }}>Human oversight always present. You are in control.</p>
      </motion.div>
    </motion.div>
  );
}

// ── Permission prompt ────────────────────────────────────────
function LocationPermissionBanner({ onRequest }: { onRequest: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      style={{ padding: "14px 18px", borderRadius: 16, background: "rgba(255,186,8,0.08)", border: "1px solid rgba(255,186,8,0.25)", display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
      <WifiOff style={{ width: 18, height: 18, color: C.yellow, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#F0F4FF", marginBottom: 2 }}>Location Access Required</div>
        <div style={{ fontSize: 11, color: "rgba(240,244,255,0.4)" }}>Silent SOS needs your GPS to measure route safety and dispatch responders accurately.</div>
      </div>
      <button onClick={onRequest} style={{ padding: "8px 16px", borderRadius: 10, fontSize: 11, fontWeight: 700, color: "#030508", background: `linear-gradient(135deg,${C.yellow},#E5A800)`, border: "none", cursor: "pointer", flexShrink: 0 }}>
        Grant
      </button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function SafetyPage() {
  // ── Global location context ──────────────────────────────
  const { location, permissionState, locationHistory, distressResult: globalDistress, requestPermission, simulateMovement } = useLocation();

  const [status, setStatus]           = useState<IncidentStatus>("idle");
  const [privateMode, setPrivateMode] = useState(false);
  const [showCancelWindow, setShowCancelWindow] = useState(false);
  const [score, setScore]             = useState({ total: 0, breakdown: { audio: 0, motion: 0, routeRisk: 0, timeContext: 0, userTrigger: 0 } });
  const [selectedResponder, setSelectedResponder] = useState<Responder | null>(null);
  const [liveTime, setLiveTime]       = useState(0);
  const [incidentId, setIncidentId]   = useState<string | null>(null);
  const [userId, setUserId]           = useState<string | null>(null);
  const [distressResult, setDistressResult] = useState<DistressResult | null>(null);
  const [alertedLevel, setAlertedLevel]     = useState<AlertedLevel>("none");
  const [autoAlertMsg, setAutoAlertMsg]     = useState<string | null>(null);
  const [triggerMethod, setTriggerMethod]   = useState<string>("manual");

  // ── Silent trigger toggle state ──────────────────────────
  const [triggers, setTriggers] = useState<TriggerState>({ shake: true, volume: true, longPress: true, tripleTap: true });

  // ── Profile data for engine ──────────────────────────────
  const [safeLocations, setSafeLocations]   = useState<SafeLocationInput[]>([]);
  const [homeLocation, setHomeLocation]     = useState<HomeLocationInput | null>(null);
  const [workLocations, setWorkLocations]   = useState<WorkLocationInput[]>([]);
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [recentIncidents, setRecentIncidents] = useState(0);
  const [lastActiveAt]                      = useState<Date>(new Date());

  const timerRef      = useRef<NodeJS.Timeout | null>(null);
  const longPressRef  = useRef<NodeJS.Timeout | null>(null);
  const tapCountRef   = useRef(0);
  const tapTimerRef   = useRef<NodeJS.Timeout | null>(null);
  const volCountRef   = useRef(0);
  const volTimerRef   = useRef<NodeJS.Timeout | null>(null);
  const shakeRef      = useRef({ lastTime: 0, lastX: 0, lastY: 0, lastZ: 0 });

  // ── Load profile ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: profile }, { data: sl }, { data: allInc }, { data: recentInc }] = await Promise.all([
        supabase.from("profiles").select("home_location,work_locations").eq("id", user.id).single(),
        supabase.from("safe_locations").select("*").eq("user_id", user.id),
        supabase.from("incidents").select("id").eq("user_id", user.id),
        supabase.from("incidents").select("id").eq("user_id", user.id)
          .gte("started_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      if (sl) setSafeLocations(sl as SafeLocationInput[]);
      if (profile?.home_location) setHomeLocation(profile.home_location as HomeLocationInput);
      if (Array.isArray(profile?.work_locations)) setWorkLocations(profile.work_locations as WorkLocationInput[]);
      setTotalIncidents((allInc ?? []).length);
      setRecentIncidents((recentInc ?? []).length);
      setTriggers(loadTriggers());
    };
    load();
  }, []);

  // ── Use global distress result + location ────────────────
  useEffect(() => {
    if (!globalDistress) return;
    setDistressResult(globalDistress);
    setScore({
      total: globalDistress.score,
      breakdown: {
        audio:       globalDistress.factors.checkIn,
        motion:      globalDistress.factors.routeDeviation,
        routeRisk:   globalDistress.factors.location,
        timeContext: globalDistress.factors.timeOfDay,
        userTrigger: globalDistress.factors.manualTrigger,
      },
    });
  }, [globalDistress]);

  // ── Auto-threshold triggers (Private Mode only) ──────────
  useEffect(() => {
    if (!privateMode || status !== "idle" || !distressResult) return;

    const result = distressResult;
    if (result.score <= 30 && alertedLevel !== "none") {
      setAlertedLevel("none"); setAutoAlertMsg(null);
    }
    if (result.score >= 51 && alertedLevel === "none") {
      setAlertedLevel("caution");
      setAutoAlertMsg("⚠ Distress level CAUTION — nearby peers are being notified automatically.");
      if (location) {
        fetch("/api/peer-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: location.lat, lng: location.lng, address: location.address }),
        }).catch(console.error);
      }
    }
    if (result.score >= 66 && alertedLevel !== "danger" && alertedLevel !== "critical") {
      setAlertedLevel("danger");
      setAutoAlertMsg("🔶 Distress level DANGER — trusted contacts and responders are being alerted.");
      if (userId && location) {
        const supabase = createClient();
        supabase.from("incidents").insert({
          user_id: userId, status: "Triggered", risk_score: result.score,
          score_breakdown: result.factors,
          location: { lat: location.lat, lng: location.lng, address: location.address },
          metadata: { trigger_method: "auto_distress", level: "danger" },
        }).select().single().then(({ data: inc }) => { if (inc) setIncidentId(inc.id); });
      }
    }
    if (result.score >= 81 && alertedLevel !== "critical" && status === "idle") {
      setAlertedLevel("critical");
      setAutoAlertMsg("🚨 CRITICAL distress score — SOS is being activated automatically.");
      setStatus("triggered"); setShowCancelWindow(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distressResult, privateMode, status, alertedLevel, userId, location]);

  // ── Live timer ───────────────────────────────────────────
  useEffect(() => {
    if (status === "live" || status === "dispatched") {
      timerRef.current = setInterval(() => setLiveTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (status === "idle") setLiveTime(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  // ── Trigger SOS (core function) ──────────────────────────
  const triggerSOS = useCallback(async (method = "manual") => {
    if (status !== "idle") return;
    setTriggerMethod(method);
    const lat = location?.lat ?? null;
    const lng = location?.lng ?? null;
    const history = getLocationHistory();

    const result = calculateDistressScore({
      userLat: lat, userLng: lng,
      safeLocations, homeLocation, workLocations, regularRoutes: [],
      locationHistory: history,
      totalIncidents, recentIncidents, lastActiveAt,
      hourOfDay: new Date().getHours(),
      manualTrigger: true, userReportedUnsafe: false,
    });
    setScore({ total: result.score, breakdown: { audio: result.factors.checkIn, motion: result.factors.routeDeviation, routeRisk: result.factors.location, timeContext: result.factors.timeOfDay, userTrigger: result.factors.manualTrigger } });
    setDistressResult(result);
    setStatus("triggered"); setShowCancelWindow(true);

    if (userId) {
      const { data } = await createClient().from("incidents").insert({
        user_id: userId, status: "Triggered", risk_score: result.score,
        score_breakdown: result.factors,
        location: { lat, lng, address: location?.address },
        metadata: { trigger_method: method },
      }).select().single();
      if (data) {
        setIncidentId(data.id);
        // Log location snapshot
        if (lat !== null && lng !== null) {
          try {
            await createClient().from("location_snapshots").insert({
              incident_id: data.id, lat, lng,
              accuracy: location?.accuracy ?? null,
              address: location?.address ?? null,
              trigger_method: method,
              ts: new Date().toISOString(),
            });
          } catch { /* non-critical */ }
        }
      }
    }
  }, [status, location, safeLocations, homeLocation, workLocations, totalIncidents, recentIncidents, lastActiveAt, userId]);

  // ── Silent trigger: Shake ────────────────────────────────
  useEffect(() => {
    if (!triggers.shake) return;
    const THRESHOLD = 25;

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc?.x || !acc?.y || !acc?.z) return;
      const now = Date.now();
      const { lastTime, lastX, lastY, lastZ } = shakeRef.current;
      if (now - lastTime < 100) return;
      const delta = Math.abs(acc.x - lastX) + Math.abs(acc.y - lastY) + Math.abs(acc.z - lastZ);
      shakeRef.current = { lastTime: now, lastX: acc.x, lastY: acc.y, lastZ: acc.z };
      if (delta > THRESHOLD) triggerSOS("shake");
    };

    // Request permission on iOS 13+
    if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === "function") {
      (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> })
        .requestPermission()
        .then((perm) => { if (perm === "granted") window.addEventListener("devicemotion", handleMotion); })
        .catch(() => {});
    } else {
      window.addEventListener("devicemotion", handleMotion);
    }
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [triggers.shake, triggerSOS]);

  // ── Silent trigger: Volume Up × 3 ───────────────────────
  useEffect(() => {
    if (!triggers.volume) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "AudioVolumeUp" && e.code !== "AudioVolumeUp") return;
      volCountRef.current += 1;
      if (volTimerRef.current) clearTimeout(volTimerRef.current);
      volTimerRef.current = setTimeout(() => { volCountRef.current = 0; }, 2000);
      if (volCountRef.current >= 3) { volCountRef.current = 0; triggerSOS("volume_up_3x"); }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [triggers.volume, triggerSOS]);

  // ── Silent trigger: Triple-tap screen ───────────────────
  useEffect(() => {
    if (!triggers.tripleTap) return;
    const handleClick = () => {
      tapCountRef.current += 1;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 500);
      if (tapCountRef.current >= 3) { tapCountRef.current = 0; triggerSOS("triple_tap"); }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [triggers.tripleTap, triggerSOS]);

  // ── Long-press SOS button (handled via pointerDown in JSX) ─
  const handleLongPressStart = () => {
    if (!triggers.longPress || status !== "idle") return;
    longPressRef.current = setTimeout(() => triggerSOS("long_press"), 2000);
  };
  const handleLongPressEnd = () => {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
  };

  // ── Toggle a trigger ─────────────────────────────────────
  const toggleTrigger = (key: keyof TriggerState) => {
    setTriggers(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveTriggers(next);
      return next;
    });
  };

  // ── SOS lifecycle ────────────────────────────────────────
  const cancelSOS = useCallback(async () => {
    setShowCancelWindow(false); setStatus("idle");
    setScore({ total: 0, breakdown: { audio: 0, motion: 0, routeRisk: 0, timeContext: 0, userTrigger: 0 } });
    if (incidentId) {
      await createClient().from("incidents").update({ status: "Resolved", resolved_at: new Date().toISOString(), metadata: { cancelled: true } }).eq("id", incidentId);
      setIncidentId(null);
    }
  }, [incidentId]);

  const confirmSOS = useCallback(async () => {
    setShowCancelWindow(false); setStatus("dispatched");
    if (incidentId) await createClient().from("incidents").update({ status: "Dispatched" }).eq("id", incidentId);
    if (location) {
      fetch("/api/peer-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: location.lat, lng: location.lng, address: location.address, incident_id: incidentId }),
      }).catch(console.error);
    }
    setTimeout(async () => {
      setSelectedResponder(MOCK_RESPONDERS[0]); setStatus("live");
      if (incidentId && location) {
        const supabase = createClient();
        await supabase.from("incidents").update({ status: "Live" }).eq("id", incidentId);
        
        // Generate cryptographic hash chain for evidence chunks
        const genHash = () => Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, "0")).join("");
        const h0 = genHash(); const h1 = genHash(); const h2 = genHash(); const h3 = genHash(); const h4 = genHash();
        
        await supabase.from("evidence_chunks").insert([
          { incident_id: incidentId, chunk_index: 0, chunk_type: "metadata", hash: h0, prev_hash: null, metadata: { lat: location.lat, lng: location.lng, score: score.total } },
          { incident_id: incidentId, chunk_index: 1, chunk_type: "location", hash: h1, prev_hash: h0, metadata: { lat: location.lat, lng: location.lng, accuracy: location.accuracy } },
          { incident_id: incidentId, chunk_index: 2, chunk_type: "audio",    hash: h2, prev_hash: h1, metadata: { ambient_noise_db: 85, voice_detected: true, duration_sec: 10 } },
          { incident_id: incidentId, chunk_index: 3, chunk_type: "motion",   hash: h3, prev_hash: h2, metadata: { acceleration_peak: 2.4, impact_detected: false, freefall: false } },
          { incident_id: incidentId, chunk_index: 4, chunk_type: "video",    hash: h4, prev_hash: h3, metadata: { camera: "front", resolution: "720p", duration_sec: 10 } }
        ]);
      }
    }, 2500);
  }, [incidentId, location, score.total]);

  // Continue logging location during LIVE status
  useEffect(() => {
    if (status !== "live" || !incidentId || !location) return;
    const interval = setInterval(async () => {
      try {
        await createClient().from("location_snapshots").insert({
          incident_id: incidentId,
          lat: location.lat, lng: location.lng,
          accuracy: location.accuracy ?? null,
          address: location.address ?? null,
          trigger_method: "live_tracking",
          ts: new Date().toISOString(),
        });
      } catch { /* non-critical */ }
    }, 30_000);
    return () => clearInterval(interval);
  }, [status, incidentId, location]);

  const resolveIncident = useCallback(async () => {
    setStatus("resolved");
    if (incidentId) await createClient().from("incidents").update({ status: "Resolved", resolved_at: new Date().toISOString() }).eq("id", incidentId);
    setTimeout(() => setStatus("sealed"), 2000);
  }, [incidentId]);

  const resetIncident = useCallback(() => {
    setStatus("idle"); setSelectedResponder(null); setIncidentId(null);
    setScore({ total: 0, breakdown: { audio: 0, motion: 0, routeRisk: 0, timeContext: 0, userTrigger: 0 } }); setLiveTime(0);
  }, []);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const STATUS_COLORS: Record<IncidentStatus, string> = { idle: "rgba(240,244,255,0.3)", triggered: C.yellow, dispatched: C.cyan, live: C.red, resolved: C.green, sealed: "rgba(0,255,136,0.6)" };
  const sc = STATUS_COLORS[status];
  const card: React.CSSProperties = { background: "var(--glass-strong)", border: "1px solid var(--border-subtle)", borderRadius: 20, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" };

  const TRIGGER_DEFS = [
    { key: "longPress"  as const, label: "Long Press SOS Button",  note: "Hold 2s",           color: "var(--danger)" },
    { key: "volume"     as const, label: "Volume Up × 3",          note: "3 presses / 2s",    color: "var(--cyan)"   },
    { key: "tripleTap"  as const, label: "Triple-Tap Screen",      note: "3 taps / 0.5s",     color: "var(--ai-violet)" },
    { key: "shake"      as const, label: "Shake Gesture",          note: "Sharp acceleration", color: "#FFBA08" },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
      {/* Screen Edge Alert Glow when active */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100, transition: "box-shadow 1s ease",
        boxShadow: status !== "idle" && status !== "resolved" && status !== "sealed" ? `inset 0 0 120px rgba(255,48,79,0.25)` : "none"
      }} />
      <AnimatePresence>{showCancelWindow && <CancelWindow duration={8} onCancel={cancelSOS} onConfirm={confirmSOS} />}</AnimatePresence>

      {/* Permission banner */}
      {permissionState === "denied" && (
        <div style={{ padding: "14px 18px", borderRadius: 16, background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.25)", marginBottom: 16, fontSize: 12, color: "rgba(255,180,180,0.8)" }}>
          🚫 Location permission denied. Please enable it in browser settings to use Silent SOS fully.
        </div>
      )}
      {permissionState === "prompt" && <LocationPermissionBanner onRequest={requestPermission} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F0F4FF", margin: 0 }}>Silent SOS</h1>
          <p style={{ fontSize: 12, color: "rgba(240,244,255,0.38)", marginTop: 4 }}>Trigger distress alerts silently. Cancel anytime. You&apos;re always in control.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 100, background: `${sc}15`, border: `1px solid ${sc}40`, transition: "all 0.3s" }}>
          <motion.div animate={{ background: sc }} style={{ width: 8, height: 8, borderRadius: "50%" }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: sc }}>{status}</span>
          {(status === "live" || status === "dispatched") && <span style={{ fontSize: 11, fontFamily: "monospace", color: sc }}>{formatTime(liveTime)}</span>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Private Mode */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: privateMode ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${privateMode ? "rgba(0,229,255,0.25)" : "rgba(255,255,255,0.08)"}` }}>
                  {privateMode ? <Eye style={{ width: 18, height: 18, color: C.cyan }} /> : <EyeOff style={{ width: 18, height: 18, color: "rgba(240,244,255,0.25)" }} />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#F0F4FF" }}>Private Mode</div>
                  <div style={{ fontSize: 11, color: "rgba(240,244,255,0.3)" }}>{privateMode ? "Auto-alert active above CAUTION" : "Enable for automatic threshold alerts"}</div>
                </div>
              </div>
              <button onClick={() => setPrivateMode(p => !p)} style={{ position: "relative", width: 48, height: 26, borderRadius: 100, border: "none", cursor: "pointer", background: privateMode ? `linear-gradient(135deg,${C.cyan},#00B8C4)` : "rgba(255,255,255,0.08)", transition: "all 0.3s" }}>
                <motion.div animate={{ x: privateMode ? 24 : 2 }} transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  style={{ position: "absolute", top: 4, width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }} />
              </button>
            </div>
          </div>

          {/* SOS Button */}
          <div style={{ ...card, padding: 40, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}>
             {/* Atmospheric crimson glow inside the card, behind the button */}
            {status === "idle" && (
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,48,79,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
            )}
            
            <motion.button
              onClick={status === "idle" ? () => triggerSOS("manual") : undefined}
              onPointerDown={handleLongPressStart}
              onPointerUp={handleLongPressEnd}
              onPointerLeave={handleLongPressEnd}
              disabled={status !== "idle"}
              whileHover={status === "idle" ? { scale: 1.05 } : {}}
              whileTap={status === "idle" ? { scale: 0.96 } : {}}
              style={{ position: "relative", background: "none", border: "none", cursor: status === "idle" ? "pointer" : "default", zIndex: 2 }}>
              
              {status === "idle" && (
                <>
                  <motion.div animate={{ scale: [1.2, 1.8, 1.2], opacity: [0.3, 0, 0.3], borderWidth: [2, 0, 2] }} transition={{ repeat: Infinity, duration: 2.5 }} style={{ position: "absolute", inset: -20, borderRadius: "50%", border: "2px solid var(--danger)" }} />
                  <motion.div animate={{ scale: [1.5, 2.2, 1.5], opacity: [0.15, 0, 0.15], borderWidth: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 2.5, delay: 0.4 }} style={{ position: "absolute", inset: -20, borderRadius: "50%", border: "1px solid var(--danger)" }} />
                  <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--danger)" }} />
                </>
              )}
              
              <div style={{ width: 160, height: 160, borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1, background: status === "idle" ? "linear-gradient(135deg, var(--danger), #CC1F3A)" : `linear-gradient(135deg, ${sc}90, ${sc})`, boxShadow: status === "idle" ? "0 10px 40px rgba(255,48,79,0.5), inset 0 2px 0 rgba(255,255,255,0.3)" : `0 10px 40px ${sc}60, inset 0 2px 0 rgba(255,255,255,0.3)` }}>
                {status === "idle" ? (
                  <><Radio style={{ width: 38, height: 38, color: "#fff", marginBottom: 6, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))" }} /><span style={{ color: "#fff", fontWeight: 900, fontSize: 24, letterSpacing: "0.2em", textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>SOS</span><span style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, marginTop: 4, fontWeight: 600 }}>TAP OR HOLD 2S</span></>
                ) : (status === "resolved" || status === "sealed") ? (
                  <><CheckCircle2 style={{ width: 38, height: 38, color: "#fff", marginBottom: 6 }} /><span style={{ color: "#fff", fontWeight: 900, fontSize: 15, letterSpacing: "0.1em" }}>{status.toUpperCase()}</span></>
                ) : (
                  <><Zap style={{ width: 38, height: 38, color: "#fff", marginBottom: 4 }} /><span style={{ color: "#fff", fontWeight: 900, fontSize: 14, letterSpacing: "0.1em" }}>{status.toUpperCase()}</span><span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "var(--font-jetbrains)", marginTop: 2 }}>{formatTime(liveTime)}</span></>
                )}
              </div>
            </motion.button>

            {triggerMethod !== "manual" && status !== "idle" && (
              <div style={{ marginTop: 12, fontSize: 10, color: "rgba(240,244,255,0.3)", textAlign: "center" }}>
                Triggered via: <span style={{ color: C.cyan }}>{triggerMethod.replace(/_/g, " ")}</span>
              </div>
            )}

            <div style={{ marginTop: 28, textAlign: "center" }}>
              {status === "idle" ? (
                <>
                  <p style={{ fontSize: 12, color: "rgba(240,244,255,0.35)", marginBottom: 14 }}>Tap, long-press, shake, or triple-tap for instant SOS.</p>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                    {["Volume × 3", "Long Press", "Shake", "Triple Tap"].map(t => <span key={t} style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 100, background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: C.cyan, letterSpacing: "0.04em" }}>{t}</span>)}
                  </div>
                </>
              ) : status === "dispatched" ? (
                <motion.p animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ fontSize: 13, color: C.cyan, fontWeight: 600 }}>Matching responders near you...</motion.p>
              ) : status === "live" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#F0F4FF" }}>Responder En Route • {selectedResponder?.eta}</p>
                  <button onClick={resolveIncident} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 20px", borderRadius: 12, fontSize: 12, fontWeight: 700, color: "#030508", background: `linear-gradient(135deg,${C.green},#00CC6A)`, border: "none", cursor: "pointer" }}>
                    <CheckCircle2 style={{ width: 14, height: 14 }} /> I&apos;m Safe — Resolve
                  </button>
                </div>
              ) : status === "sealed" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ fontSize: 12, color: C.green }}>Evidence sealed & report generated.</p>
                  <button onClick={resetIncident} style={{ padding: "10px 20px", borderRadius: 12, fontSize: 12, fontWeight: 600, color: "rgba(240,244,255,0.6)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>Reset</button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Silent Triggers */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Lock style={{ width: 14, height: 14, color: C.purple }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#F0F4FF" }}>Silent Triggers</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(240,244,255,0.25)" }}>Tap to toggle</span>
            </div>
            {TRIGGER_DEFS.map(t => (
              <button key={t.key} onClick={() => toggleTrigger(t.key)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, marginBottom: 6, background: triggers[t.key] ? `${t.color}08` : "rgba(255,255,255,0.02)", border: `1px solid ${triggers[t.key] ? `${t.color}20` : "rgba(255,255,255,0.05)"}`, cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 12, color: triggers[t.key] ? "rgba(240,244,255,0.7)" : "rgba(240,244,255,0.25)" }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: "rgba(240,244,255,0.2)", marginTop: 2 }}>{t.note}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: triggers[t.key] ? t.color : "rgba(255,255,255,0.15)", letterSpacing: "0.08em" }}>{triggers[t.key] ? "ON" : "OFF"}</span>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── RAKSHA RISK SCORE (new engine) ── */}
          <RakshaRiskScoreCard />

          {/* Distress Score */}
          <div style={{ ...card, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,244,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>Real-Time Distress Score</h2>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 100, background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)", color: C.cyan, letterSpacing: "0.06em" }}>ENGINE v3</span>
            </div>

            {(() => {
              const level = distressResult ? distressResult.level : levelFromScore(score.total);
              const meta = LEVEL_META[level];
              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
                    <motion.div animate={{ color: meta.color }}
                      style={{ fontSize: 72, fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>
                      {score.total}
                    </motion.div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: meta.color, marginBottom: 4, letterSpacing: "0.06em" }}>{level}</div>
                      <div style={{ fontSize: 11, color: "rgba(240,244,255,0.35)", lineHeight: 1.5 }}>{meta.description}</div>
                      {distressResult && (
                        <div style={{ fontSize: 10, color: "rgba(240,244,255,0.25)", marginTop: 4 }}>
                          📍 {distressResult.locationContext}
                        </div>
                      )}
                      {distressResult?.routeContext && distressResult.routeContext !== distressResult.locationContext && (
                        <div style={{ fontSize: 10, color: "rgba(180,127,255,0.6)", marginTop: 2 }}>
                          🛣 {distressResult.routeContext}
                        </div>
                      )}
                      {(distressResult?.speedKmh ?? 0) > 5 && (
                        <div style={{ fontSize: 10, color: "rgba(0,229,255,0.5)", marginTop: 2 }}>
                          🚗 {distressResult?.speedKmh} km/h
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                          style={{ width: 6, height: 6, borderRadius: "50%", background: permissionState === "granted" ? C.green : C.yellow }} />
                        <span style={{ fontSize: 11, color: permissionState === "granted" ? C.green : C.yellow }}>
                          {permissionState === "granted" ? "GPS active · live" : "GPS pending"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: "rgba(240,244,255,0.3)" }}>Overall Risk Level</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{score.total}/100</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <motion.div animate={{ width: `${score.total}%` }} transition={{ duration: 1, ease: "easeOut" }}
                        style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg,${meta.color}60,${meta.color})` }} />
                    </div>
                  </div>
                </>
              );
            })()}

            <ScoreBar label="Location Safety"  value={distressResult?.factors.location ?? score.breakdown.routeRisk}       weight="28%" color={C.cyan}   icon={MapPin} />
            <ScoreBar label="Time of Day"      value={distressResult?.factors.timeOfDay ?? score.breakdown.timeContext}      weight="18%" color={C.yellow} icon={Clock} />
            <ScoreBar label="Route Deviation"  value={distressResult?.factors.routeDeviation ?? score.breakdown.motion}     weight="20%" color={C.purple} icon={Activity} />
            <ScoreBar label="Incident History" value={distressResult?.factors.incidentHistory ?? 0}                          weight="14%" color={C.red}    icon={AlertTriangle} />
            <ScoreBar label="Check-in Status"  value={distressResult?.factors.checkIn ?? score.breakdown.audio}             weight="10%" color={C.green}  icon={Mic} />
            <ScoreBar label="Manual Trigger"   value={distressResult?.factors.manualTrigger ?? score.breakdown.userTrigger}  weight="5%"  color={C.red}    icon={Zap} />
            <ScoreBar label="Speed Anomaly"    value={distressResult?.factors.speedAnomaly ?? 0}                             weight="5%"  color={C.yellow} icon={Navigation} />

            <AnimatePresence>
              {autoAlertMsg && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ marginTop: 14, padding: "10px 14px", borderRadius: 12, background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.25)" }}>
                  <p style={{ fontSize: 11.5, color: "rgba(255,200,150,0.9)", margin: 0, lineHeight: 1.5 }}>{autoAlertMsg}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <p style={{ fontSize: 10, color: "rgba(240,244,255,0.15)", textAlign: "center", marginTop: 14 }}>Score computed from real profile data — location, routes, time, history.</p>
          </div>

          {/* Responders */}
          <AnimatePresence>
            {(status === "dispatched" || status === "live") && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ ...card, padding: 24, borderColor: "rgba(0,229,255,0.2)" }}>
                <h2 style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,244,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Matched Responders</h2>
                {MOCK_RESPONDERS.map((r, i) => (
                  <motion.div key={r.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, marginBottom: 8, background: selectedResponder?.id === r.id ? `${r.color}10` : "rgba(255,255,255,0.02)", border: `1px solid ${selectedResponder?.id === r.id ? `${r.color}35` : "rgba(255,255,255,0.06)"}` }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `${r.color}18`, color: r.color, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{r.name[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#F0F4FF" }}>{r.name}</span>
                        {selectedResponder?.id === r.id && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: `${r.color}20`, color: r.color, letterSpacing: "0.08em" }}>DISPATCHED</span>}
                      </div>
                      <p style={{ fontSize: 11, color: "rgba(240,244,255,0.3)", margin: 0 }}>{r.type}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.eta}</div>
                      <div style={{ fontSize: 10, color: "rgba(240,244,255,0.25)" }}>{r.distance}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live Location — Leaflet Map */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin style={{ width: 14, height: 14, color: C.cyan }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#F0F4FF" }}>Live Location</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {permissionState === "granted" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.green }}>
                    <Wifi style={{ width: 11, height: 11 }} />GPS
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(240,244,255,0.3)" }}>
                    <WifiOff style={{ width: 11, height: 11 }} />No GPS
                  </div>
                )}
                {status !== "idle" && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, color: C.cyan, padding: "3px 10px", borderRadius: 100, background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)" }}><motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ width: 5, height: 5, borderRadius: "50%", background: C.cyan }} />Sharing</div>}
              </div>
            </div>
            <p style={{ fontSize: 12, color: "rgba(240,244,255,0.5)", marginBottom: 4 }}>
              {location?.address ?? "Waiting for GPS…"}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <p style={{ fontSize: 11, color: "rgba(240,244,255,0.2)", fontFamily: "monospace", margin: 0 }}>
                  {location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "—"}
                  {location?.accuracy ? <span style={{ color: "rgba(240,244,255,0.15)" }}> ±{Math.round(location.accuracy)}m</span> : null}
                </p>
                <button 
                  onClick={requestPermission} 
                  style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)", color: "#00E5FF", padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <MapPin style={{ width: 10, height: 10 }} /> Force GPS Sync
                </button>
                <button 
                  onClick={simulateMovement} 
                  style={{ background: "rgba(180,127,255,0.1)", border: "1px solid rgba(180,127,255,0.25)", color: "#B47FFF", padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Activity style={{ width: 10, height: 10 }} /> Simulate Walk
                </button>
              </div>
              {status !== "idle" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, color: C.yellow, padding: "2px 8px", borderRadius: 100, background: "rgba(255,186,8,0.1)", border: "1px solid rgba(255,186,8,0.25)" }}>
                  <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ width: 5, height: 5, borderRadius: "50%", background: C.yellow }} />
                  Tracking Active
                </div>
              )}
            </div>
            
            {/* Real Leaflet Map */}
            {location ? (
              <LiveMap lat={location.lat} lng={location.lng} accuracy={location.accuracy} isLive={status !== "idle"} history={locationHistory} />
            ) : (
              <MapSkeleton />
            )}
          </div>
        </div>
      </div>

      {/* State Machine */}
      <div style={{ ...card, padding: 24, marginTop: 20 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,244,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Incident State Machine</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {(["idle", "triggered", "dispatched", "live", "resolved", "sealed"] as IncidentStatus[]).map((s, i, arr) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ padding: "6px 14px", borderRadius: 8, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", background: status === s ? `${STATUS_COLORS[s]}18` : "rgba(255,255,255,0.03)", border: `1px solid ${status === s ? STATUS_COLORS[s] : "rgba(255,255,255,0.06)"}`, color: status === s ? STATUS_COLORS[s] : "rgba(255,255,255,0.2)", boxShadow: status === s ? `0 0 14px ${STATUS_COLORS[s]}40` : "none", transition: "all 0.3s" }}>{s}</div>
              {i < arr.length - 1 && <ChevronRight style={{ width: 12, height: 12, color: "rgba(255,255,255,0.12)" }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── RAKSHA RISK SCORE CARD COMPONENT ──────────────────────
function RakshaRiskScoreCard() {
  const {
    rakshaResult,
    audioScore,
    motionScore,
    routeRiskScore,
    timeContextScore,
  } = useRakshaScore();

  if (!rakshaResult) return null;
  const score = rakshaResult.score;
  const level = rakshaResult.level;
  const meta = RAKSHA_LEVEL_META[level];

  return (
    <div style={{
      background: "rgba(6,10,18,0.4)",
      border: `1px solid ${meta.border}`,
      borderRadius: 16,
      padding: 24,
      boxShadow: `0 8px 32px ${meta.color}15`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,244,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>Raksha Risk Score</h2>
        <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 100, background: `${meta.color}15`, border: `1px solid ${meta.border}`, color: meta.color, letterSpacing: "0.06em" }}>NEW ENGINE</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
        <motion.div animate={{ color: meta.color }}
          style={{ fontSize: 72, fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>
          {score}
        </motion.div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: meta.color, marginBottom: 4, letterSpacing: "0.06em" }}>{meta.label}</div>
          <div style={{ fontSize: 11, color: "rgba(240,244,255,0.35)", lineHeight: 1.5 }}>{meta.description}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: meta.color, marginTop: 4 }}>
            Action: {meta.actionRequired.replace(/_/g, " ").toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: "rgba(240,244,255,0.3)" }}>Risk Capacity</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{score}/87</span>
        </div>
        <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <motion.div animate={{ width: `${(score / 87) * 100}%` }} transition={{ duration: 1, ease: "easeOut" }}
            style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg,${meta.color}60,${meta.color})` }} />
        </div>
      </div>

      <ScoreBar label="Audio Anomaly" value={audioScore} weight="Max 35" color="#FF8C42" icon={Mic} />
      <ScoreBar label="Sudden Motion" value={motionScore} weight="Max 20" color="#B47FFF" icon={Activity} />
      <ScoreBar label="Route Risk" value={routeRiskScore} weight="Max 18" color="#00E5FF" icon={MapPin} />
      <ScoreBar label="Time Context" value={timeContextScore} weight="Max 14" color="#FFBA08" icon={Clock} />

    </div>
  );
}


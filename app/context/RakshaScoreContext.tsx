"use client";

// =============================================================
// RAKSHANET — Raksha Risk Score Context
// Global context that:
//   1. Runs AudioAnomalyAnalyzer + MotionAnomalyAnalyzer
//   2. Reads route/time signals from LocationContext
//   3. Computes Raksha Risk Score every 2 seconds
//   4. Detects level transitions and fires actions:
//      L2 → show check-in modal
//      L3 → auto-SOS + notify trusted contact
//      L4 → police alert + peer broadcast
// =============================================================

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  computeRakshaRiskScore,
  computeRouteRiskScore,
  computeTimeContextScore,
  RAKSHA_LEVEL_META,
  type RakshaRiskResult,
  type RakshaRiskLevel,
} from "@/lib/distress/rakshaRiskScore";
import { AudioAnomalyAnalyzer } from "@/lib/distress/audioAnalyzer";
import { MotionAnomalyAnalyzer } from "@/lib/distress/motionAnalyzer";
import { useLocation } from "@/app/context/LocationContext";
import { createClient } from "@/lib/supabase/client";

// ── Context value shape ───────────────────────────────────────
export interface RakshaScoreContextValue {
  // Current score + level
  rakshaResult: RakshaRiskResult | null;

  // Individual signal states (for UI)
  audioScore: number;         // 0 or 35
  motionScore: number;        // 0 or 20
  routeRiskScore: number;     // 0–18
  timeContextScore: number;   // 0, 7, or 14
  audioDb: number;            // 0–100 visualizer
  accelMagnitude: number;     // 0–100 visualizer

  // Permission states
  audioPermission: string;
  motionPermission: string;

  // Sensor control
  startAudioMonitor: () => void;
  stopAudioMonitor: () => void;
  startMotionMonitor: () => void;
  stopMotionMonitor: () => void;
  simulateAudioAnomaly: () => void;
  simulateMotionAnomaly: () => void;

  // Level 2 check-in
  showCheckIn: boolean;
  respondCheckIn: (isSafe: boolean) => void;

  // Level 3/4 action results (for UI feedback)
  l3ActionStatus: "idle" | "sending" | "sent" | "error";
  l4ActionStatus: "idle" | "sending" | "sent" | "error";
  trustedContactName: string | null;
  trustedContactPhone: string | null;
  trustedContactWhatsApp: string | null;
  pcrReference: string | null;

  // User trigger (manual SOS → level 4 instantly)
  triggerManualSOS: () => void;

  // Reset all anomaly flags ("I'm safe")
  clearAllAnomalies: () => void;
}

const RakshaScoreContext = createContext<RakshaScoreContextValue>({
  rakshaResult: null,
  audioScore: 0, motionScore: 0, routeRiskScore: 0, timeContextScore: 0,
  audioDb: 0, accelMagnitude: 0,
  audioPermission: "idle", motionPermission: "idle",
  startAudioMonitor: () => {},
  stopAudioMonitor: () => {},
  startMotionMonitor: () => {},
  stopMotionMonitor: () => {},
  simulateAudioAnomaly: () => {},
  simulateMotionAnomaly: () => {},
  showCheckIn: false,
  respondCheckIn: () => {},
  l3ActionStatus: "idle", l4ActionStatus: "idle",
  trustedContactName: null, trustedContactPhone: null, trustedContactWhatsApp: null,
  pcrReference: null,
  triggerManualSOS: () => {},
  clearAllAnomalies: () => {},
});

export function useRakshaScore() {
  return useContext(RakshaScoreContext);
}

// ── Provider ──────────────────────────────────────────────────
export function RakshaScoreProvider({ children }: { children: ReactNode }) {
  const { location, distressResult } = useLocation();

  // ── Signal states ────────────────────────────────────────────
  const [audioScore, setAudioScore]           = useState(0);
  const [motionScore, setMotionScore]         = useState(0);
  const [audioDb, setAudioDb]                 = useState(0);
  const [accelMag, setAccelMag]               = useState(0);
  const [audioPermission, setAudioPermission] = useState("idle");
  const [motionPermission, setMotionPermission] = useState("idle");
  const [userTrigger, setUserTrigger]         = useState(false);

  // ── Computed signals ─────────────────────────────────────────
  const routeRiskScore   = distressResult
    ? computeRouteRiskScore(distressResult.factors.location, distressResult.factors.routeDeviation)
    : 0;
  const timeContextScore = computeTimeContextScore(new Date().getHours());

  // ── Result state ─────────────────────────────────────────────
  const [rakshaResult, setRakshaResult] = useState<RakshaRiskResult | null>(null);

  // ── Level action states ───────────────────────────────────────
  const [showCheckIn, setShowCheckIn]         = useState(false);
  const [l3ActionStatus, setL3ActionStatus]   = useState<"idle"|"sending"|"sent"|"error">("idle");
  const [l4ActionStatus, setL4ActionStatus]   = useState<"idle"|"sending"|"sent"|"error">("idle");
  const [trustedContactName, setTrustedContactName] = useState<string | null>(null);
  const [trustedContactPhone, setTrustedContactPhone] = useState<string | null>(null);
  const [trustedContactWhatsApp, setTrustedContactWhatsApp] = useState<string | null>(null);
  const [pcrReference, setPcrReference]       = useState<string | null>(null);

  // ── Track which levels we've already actioned ─────────────────
  const actionedLevels = useRef<Set<RakshaRiskLevel>>(new Set());
  const checkInTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incidentIdRef = useRef<string | null>(null);

  // ── Analyzers ─────────────────────────────────────────────────
  const audioAnalyzerRef  = useRef<AudioAnomalyAnalyzer | null>(null);
  const motionAnalyzerRef = useRef<MotionAnomalyAnalyzer | null>(null);

  // ── Level 3 action: auto-SOS + trusted contact notification ──
  const fireLevel3Action = useCallback(async () => {
    if (l3ActionStatus !== "idle") return;
    setL3ActionStatus("sending");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create incident record
      const score = rakshaResult?.score ?? 55;
      const { data: incident } = await supabase
        .from("incidents")
        .insert({
          user_id: user.id,
          status: "Triggered",
          risk_score: score,
          location: location
            ? { lat: location.lat, lng: location.lng, address: location.address }
            : null,
          metadata: { trigger_method: "auto_raksha_level3", raksha_level: "CONFIRMED" },
        })
        .select()
        .single();

      if (incident) incidentIdRef.current = incident.id;

      // Call trusted-alert API — returns whatsapp_link + contact_phone
      const res = await fetch("/api/trusted-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raksha_score: score,
          raksha_level: "CONFIRMED",
          location_address: location?.address || null,
          location_lat: location?.lat || null,
          location_lng: location?.lng || null,
          incident_id: incident?.id || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const contactName = data.contact_name || "Trusted Contact";
        const contactPhone = data.contact_phone || null;
        const whatsappLink = data.whatsapp_link || null;

        setTrustedContactName(contactName);
        setTrustedContactPhone(contactPhone);
        setTrustedContactWhatsApp(whatsappLink);
        setL3ActionStatus("sent");

        // Auto-open WhatsApp with pre-filled emergency message
        if (whatsappLink) {
          window.open(whatsappLink, "_blank", "noopener,noreferrer");
        }
      } else {
        throw new Error("Alert API failed");
      }
    } catch (err) {
      console.error("[RakshaScore] Level 3 action failed:", err);
      setL3ActionStatus("error");
    }
  }, [l3ActionStatus, location, rakshaResult]);

  // ── Level 4 action: police alert + peer broadcast + all contact WhatsApp ──
  const fireLevel4Action = useCallback(async () => {
    if (l4ActionStatus !== "idle") return;
    setL4ActionStatus("sending");
    try {
      const score = rakshaResult?.score ?? 75;

      // 1. Police alert + get all contact WhatsApp links
      const policeRes = await fetch("/api/trusted-alert", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raksha_score: score,
          location_address: location?.address || null,
          location_lat: location?.lat || null,
          location_lng: location?.lng || null,
          incident_id: incidentIdRef.current,
        }),
      });
      if (policeRes.ok) {
        const pData = await policeRes.json();
        setPcrReference(pData.pcr_reference || null);

        // Open WhatsApp for ALL contacts at Level 4 (critical escalation)
        const contactLinks: Array<{ name: string; phone: string; whatsapp_link: string | null }> =
          pData.contact_links ?? [];
        contactLinks.forEach((c, idx) => {
          if (c.whatsapp_link) {
            // Stagger opens to prevent browser popup blocking
            setTimeout(() => {
              window.open(c.whatsapp_link!, "_blank", "noopener,noreferrer");
            }, idx * 800);
          }
        });
      }

      // 2. Peer broadcast (all nearby users)
      if (location) {
        await fetch("/api/peer-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: location.lat,
            lng: location.lng,
            address: location.address,
            incident_id: incidentIdRef.current,
            radius_km: 3,
          }),
        }).catch(() => {});
      }

      setL4ActionStatus("sent");
    } catch (err) {
      console.error("[RakshaScore] Level 4 action failed:", err);
      setL4ActionStatus("error");
    }
  }, [l4ActionStatus, location, rakshaResult]);

  // ── Score computation loop (every 2 seconds) ─────────────────
  useEffect(() => {
    const compute = () => {
      const result = computeRakshaRiskScore({
        audioAnomalyScore: audioScore,
        motionScore,
        routeRiskScore,
        timeContextScore,
        userTrigger,
      });
      setRakshaResult(result);

      // ── Level transition handler ──────────────────────────────
      const level = result.level;

      if (level === "SUSPICIOUS" || level === "SAFE") {
        // Nothing to do for Level 1 / Safe
        return;
      }

      if (level === "HIGH_RISK" && !actionedLevels.current.has("HIGH_RISK")) {
        // Level 2: show silent check-in
        actionedLevels.current.add("HIGH_RISK");
        setShowCheckIn(true);

        // Auto-escalate after 60 seconds if no response
        if (checkInTimeoutRef.current) clearTimeout(checkInTimeoutRef.current);
        checkInTimeoutRef.current = setTimeout(() => {
          setShowCheckIn(false);
          // Treat as "no response" → escalate to L3 actions
          if (!actionedLevels.current.has("CONFIRMED")) {
            actionedLevels.current.add("CONFIRMED");
            fireLevel3Action();
          }
        }, 60_000);
      }

      if (level === "CONFIRMED" && !actionedLevels.current.has("CONFIRMED")) {
        // Level 3: auto-SOS + trusted contact
        actionedLevels.current.add("CONFIRMED");
        setShowCheckIn(false);
        if (checkInTimeoutRef.current) clearTimeout(checkInTimeoutRef.current);
        fireLevel3Action();
      }

      if (level === "CRITICAL" && !actionedLevels.current.has("CRITICAL")) {
        // Level 4: police + peer broadcast
        actionedLevels.current.add("CRITICAL");
        setShowCheckIn(false);
        if (checkInTimeoutRef.current) clearTimeout(checkInTimeoutRef.current);
        // Fire L3 first if not already done
        if (!actionedLevels.current.has("CONFIRMED")) {
          actionedLevels.current.add("CONFIRMED");
          fireLevel3Action();
        }
        fireLevel4Action();
      }
    };

    const interval = setInterval(compute, 2000);
    compute(); // immediate first run
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioScore, motionScore, routeRiskScore, timeContextScore, userTrigger]);

  // ── Check-in response ─────────────────────────────────────────
  const respondCheckIn = useCallback((isSafe: boolean) => {
    setShowCheckIn(false);
    if (checkInTimeoutRef.current) clearTimeout(checkInTimeoutRef.current);

    if (isSafe) {
      // User confirmed safe → clear anomaly flags and reset actioned levels
      audioAnalyzerRef.current?.clearAnomaly();
      motionAnalyzerRef.current?.clearAnomaly();
      setAudioScore(0);
      setMotionScore(0);
      setUserTrigger(false);
      actionedLevels.current.clear();
      setL3ActionStatus("idle");
      setL4ActionStatus("idle");
      setTrustedContactName(null);
      setTrustedContactPhone(null);
      setTrustedContactWhatsApp(null);
      setPcrReference(null);
    } else {
      // User said NOT safe → immediately escalate to Level 3
      if (!actionedLevels.current.has("CONFIRMED")) {
        actionedLevels.current.add("CONFIRMED");
        fireLevel3Action();
      }
    }
  }, [fireLevel3Action]);

  // ── Public controls ───────────────────────────────────────────
  const startAudioMonitor = useCallback(() => {
    if (audioAnalyzerRef.current?.isRunning) return;
    const analyzer = new AudioAnomalyAnalyzer({
      onAnomalyDetected: () => setAudioScore(35),
      onAnomalyCleared:  () => setAudioScore(0),
      onPermissionChange: (s) => setAudioPermission(s),
      onLevelUpdate: (db) => setAudioDb(db),
    });
    audioAnalyzerRef.current = analyzer;
    analyzer.start().catch(() => {});
  }, []);

  const stopAudioMonitor = useCallback(() => {
    audioAnalyzerRef.current?.stop();
    audioAnalyzerRef.current = null;
    setAudioScore(0);
    setAudioDb(0);
    setAudioPermission("idle");
  }, []);

  const startMotionMonitor = useCallback(() => {
    if (motionAnalyzerRef.current?.isRunning) return;
    const analyzer = new MotionAnomalyAnalyzer({
      onAnomalyDetected: () => setMotionScore(20),
      onAnomalyCleared:  () => setMotionScore(0),
      onPermissionChange: (s) => setMotionPermission(s),
      onAccelerationUpdate: (mag) => setAccelMag(mag),
    });
    motionAnalyzerRef.current = analyzer;
    analyzer.start().catch(() => {});
  }, []);

  const stopMotionMonitor = useCallback(() => {
    motionAnalyzerRef.current?.stop();
    motionAnalyzerRef.current = null;
    setMotionScore(0);
    setAccelMag(0);
    setMotionPermission("idle");
  }, []);

  const simulateAudioAnomaly = useCallback(() => {
    setAudioScore(35);
    setTimeout(() => setAudioScore(0), 12_000);
  }, []);

  const simulateMotionAnomaly = useCallback(() => {
    setMotionScore(20);
    setTimeout(() => setMotionScore(0), 10_000);
  }, []);

  const triggerManualSOS = useCallback(() => {
    setUserTrigger(true);
  }, []);

  const clearAllAnomalies = useCallback(() => {
    audioAnalyzerRef.current?.clearAnomaly();
    motionAnalyzerRef.current?.clearAnomaly();
    setAudioScore(0);
    setMotionScore(0);
    setUserTrigger(false);
    setShowCheckIn(false);
    if (checkInTimeoutRef.current) clearTimeout(checkInTimeoutRef.current);
    actionedLevels.current.clear();
    setL3ActionStatus("idle");
    setL4ActionStatus("idle");
    setTrustedContactName(null);
    setTrustedContactPhone(null);
    setTrustedContactWhatsApp(null);
    setPcrReference(null);
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────
  useEffect(() => {
    return () => {
      audioAnalyzerRef.current?.stop();
      motionAnalyzerRef.current?.stop();
      if (checkInTimeoutRef.current) clearTimeout(checkInTimeoutRef.current);
    };
  }, []);

  return (
    <RakshaScoreContext.Provider
      value={{
        rakshaResult,
        audioScore,
        motionScore,
        routeRiskScore,
        timeContextScore,
        audioDb,
        accelMagnitude: accelMag,
        audioPermission,
        motionPermission,
        startAudioMonitor,
        stopAudioMonitor,
        startMotionMonitor,
        stopMotionMonitor,
        simulateAudioAnomaly,
        simulateMotionAnomaly,
        showCheckIn,
        respondCheckIn,
        l3ActionStatus,
        l4ActionStatus,
        trustedContactName,
        trustedContactPhone,
        trustedContactWhatsApp,
        pcrReference,
        triggerManualSOS,
        clearAllAnomalies,
      }}
    >
      {children}
    </RakshaScoreContext.Provider>
  );
}

// Re-export for convenience
export { RAKSHA_LEVEL_META };

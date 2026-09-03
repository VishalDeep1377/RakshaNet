"use client";

// =============================================================
// RAKSHANET — Raksha Risk Score Widget
// Floating panel visible across all dashboard pages.
// Shows live Raksha Risk Score (0–87) with 4-factor breakdown,
// level badge, sensor status, and action controls.
// =============================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Mic, MicOff, Activity, MapPin, Clock,
  ChevronUp, ChevronDown, AlertTriangle, Zap,
  CheckCircle, Phone, Users, X,
} from "lucide-react";
import { useRakshaScore, RAKSHA_LEVEL_META } from "@/app/context/RakshaScoreContext";

// ── Mini score bar ─────────────────────────────────────────────
function MiniBar({
  label, value, max, color, icon: Icon,
}: {
  label: string; value: number; max: number; color: string; icon: React.ElementType;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Icon style={{ width: 10, height: 10, color }} />
          <span style={{ fontSize: 10, color: "rgba(240,244,255,0.45)" }}>{label}</span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: "monospace" }}>
          {value}/{max}
        </span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${color}70, ${color})` }}
        />
      </div>
    </div>
  );
}

// ── Level 3 Alert Banner — SMS Sent ──────────────────────────
function L3Banner({
  contactName, onDismiss,
}: {
  contactName: string;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      style={{
        borderRadius: 14, marginBottom: 10, overflow: "hidden",
        background: "rgba(255,45,85,0.07)",
        border: "1px solid rgba(255,45,85,0.28)",
        position: "relative",
      }}
    >
      {/* Top accent */}
      <div style={{ height: 2, background: "linear-gradient(90deg, #FF2D55, #FF0055)", width: "100%" }} />
      <div style={{ padding: "10px 12px 12px" }}>
        <button onClick={onDismiss} style={{
          position: "absolute", top: 10, right: 10, background: "none",
          border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", padding: 2,
        }}>
          <X style={{ width: 12, height: 12 }} />
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, paddingRight: 20 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,45,85,0.15)", border: "1px solid rgba(255,45,85,0.3)",
          }}>
            <Phone style={{ width: 12, height: 12, color: "#FF2D55" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#FF2D55", marginBottom: 3, letterSpacing: "0.02em" }}>
              Trusted Contact Alerted
            </div>
            <p style={{ fontSize: 10.5, color: "rgba(240,244,255,0.55)", margin: "0 0 8px", lineHeight: 1.5 }}>
              Emergency WhatsApp message sent to{" "}
              <strong style={{ color: "rgba(240,244,255,0.85)" }}>{contactName}</strong>{" "}
              with your name and live location.
            </p>
            {/* WhatsApp delivered badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <CheckCircle style={{ width: 10, height: 10, color: "#00D084" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#00D084" }}>WhatsApp Sent</span>
              <span style={{ fontSize: 9, color: "rgba(240,244,255,0.2)", marginLeft: 4 }}>just now</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Level 4 Alert Banner — Critical ──────────────────────────
function L4Banner({
  pcrRef, onDismiss,
}: {
  pcrRef: string; onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      style={{
        borderRadius: 14, marginBottom: 10, overflow: "hidden",
        background: "rgba(255,0,85,0.09)",
        border: "1px solid rgba(255,0,85,0.38)",
        position: "relative",
      }}
    >
      <div style={{ height: 2, background: "linear-gradient(90deg, #FF0055, #FF2D00)", width: "100%" }} />
      <div style={{ padding: "10px 12px 12px" }}>
        <button onClick={onDismiss} style={{
          position: "absolute", top: 10, right: 10, background: "none",
          border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", padding: 2,
        }}>
          <X style={{ width: 12, height: 12 }} />
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, paddingRight: 20 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,0,85,0.18)", border: "1px solid rgba(255,0,85,0.35)",
          }}>
            <Users style={{ width: 12, height: 12, color: "#FF0055" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#FF0055", marginBottom: 3, letterSpacing: "0.02em" }}>
              Critical Escalation Active
            </div>
            <p style={{ fontSize: 10.5, color: "rgba(240,244,255,0.55)", margin: "0 0 8px", lineHeight: 1.5 }}>
              WhatsApp sent to <strong style={{ color: "rgba(240,244,255,0.85)" }}>all trusted contacts</strong>.
              PCR Unit dispatched.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <CheckCircle style={{ width: 10, height: 10, color: "#00D084" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#00D084" }}>All contacts notified</span>
              <span style={{ fontSize: 9, color: "rgba(240,244,255,0.2)", marginLeft: 4, fontFamily: "monospace" }}>
                Ref: {pcrRef}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


// ── Main Widget ───────────────────────────────────────────────
export default function RakshaRiskWidget() {
  const {
    rakshaResult, audioScore, motionScore, routeRiskScore, timeContextScore,
    audioDb, accelMagnitude, audioPermission, motionPermission,
    startAudioMonitor, stopAudioMonitor, startMotionMonitor, stopMotionMonitor,
    simulateAudioAnomaly, simulateMotionAnomaly,
    l3ActionStatus, l4ActionStatus,
    trustedContactName,
    pcrReference,
    clearAllAnomalies,
  } = useRakshaScore();

  const [expanded, setExpanded]     = useState(false);
  const [l3Dismissed, setL3Dismissed] = useState(false);
  const [l4Dismissed, setL4Dismissed] = useState(false);

  // Reset dismiss when new alerts come in
  const showL3 = l3ActionStatus === "sent" && trustedContactName && !l3Dismissed;
  const showL4 = l4ActionStatus === "sent" && pcrReference && !l4Dismissed;

  const score  = rakshaResult?.score ?? 0;
  const level  = rakshaResult?.level ?? "SAFE";
  const meta   = RAKSHA_LEVEL_META[level];
  const levelN = meta.levelNumber;

  const isAudioOn = audioPermission === "granted";
  const isMotionOn = motionPermission === "granted";

  // Pulsing for elevated states
  const shouldPulse = levelN >= 2;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 100,
        right: 24,
        zIndex: 8500,
        width: expanded ? 320 : "auto",
      }}
    >
      {/* ── Banners (above widget) ── */}
      <AnimatePresence>
        {showL3 && (
          <L3Banner
            key="l3banner"
            contactName={trustedContactName!}
            onDismiss={() => setL3Dismissed(true)}
          />
        )}
        {showL4 && (
          <L4Banner
            key="l4banner"
            pcrRef={pcrReference!}
            onDismiss={() => setL4Dismissed(true)}
          />
        )}
      </AnimatePresence>

      {/* ── Main Panel ── */}
      <motion.div
        layout
        style={{
          background: "rgba(6,10,18,0.97)",
          border: `1px solid ${meta.border}`,
          borderRadius: 20,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: shouldPulse
            ? `0 16px 60px rgba(0,0,0,0.7), 0 0 40px ${meta.color}20`
            : "0 16px 60px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        {/* Top accent bar */}
        <motion.div
          animate={{ background: meta.color }}
          style={{ height: 2, width: "100%" }}
        />

        {/* ── Collapsed header (always visible) ── */}
        <div
          style={{
            padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12,
            cursor: "pointer",
          }}
          onClick={() => setExpanded((e) => !e)}
        >
          {/* Score circle */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            {shouldPulse && (
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{
                  position: "absolute", inset: -4, borderRadius: "50%",
                  background: meta.color,
                }}
              />
            )}
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              background: meta.bg, border: `2px solid ${meta.color}`,
              position: "relative", zIndex: 1,
            }}>
              <span style={{
                fontSize: 14, fontWeight: 900, color: meta.color,
                fontFamily: "monospace", lineHeight: 1,
              }}>
                {score}
              </span>
              <span style={{ fontSize: 7, color: `${meta.color}80`, lineHeight: 1 }}>
                /87
              </span>
            </div>
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "rgba(240,244,255,0.3)", marginBottom: 1,
            }}>
              Raksha Risk Score
            </div>
            <div style={{
              fontSize: 12, fontWeight: 800, color: meta.color,
              letterSpacing: "0.03em",
            }}>
              {levelN > 0 ? `Level ${levelN} — ` : ""}{meta.label}
            </div>
          </div>

          {/* Chevron */}
          <div style={{ color: "rgba(240,244,255,0.25)", flexShrink: 0 }}>
            {expanded
              ? <ChevronDown style={{ width: 14, height: 14 }} />
              : <ChevronUp style={{ width: 14, height: 14 }} />
            }
          </div>
        </div>

        {/* ── Expanded details ── */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ padding: "0 16px 16px" }}>

                {/* Level description */}
                <div style={{
                  padding: "8px 12px", borderRadius: 10, marginBottom: 14,
                  background: meta.bg, border: `1px solid ${meta.border}`,
                  fontSize: 11, color: meta.color, lineHeight: 1.5,
                }}>
                  <AlertTriangle style={{ width: 11, height: 11, display: "inline", marginRight: 5 }} />
                  {meta.description}
                </div>

                {/* Score bars */}
                <MiniBar label="Audio Anomaly"    value={audioScore}       max={35} color="#FF8C42" icon={Mic} />
                <MiniBar label="Sudden Motion"    value={motionScore}      max={20} color="#B47FFF" icon={Activity} />
                <MiniBar label="Route Risk"       value={routeRiskScore}   max={18} color="#00E5FF" icon={MapPin} />
                <MiniBar label="Time & Context"   value={timeContextScore} max={14} color="#FFBA08" icon={Clock} />

                {/* Sensor visualizers */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14, marginTop: 12,
                }}>
                  {/* Audio visualizer */}
                  <div style={{
                    padding: "8px 10px", borderRadius: 10,
                    background: isAudioOn ? "rgba(255,140,66,0.06)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isAudioOn ? "rgba(255,140,66,0.2)" : "rgba(255,255,255,0.05)"}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                      {isAudioOn
                        ? <Mic style={{ width: 10, height: 10, color: "#FF8C42" }} />
                        : <MicOff style={{ width: 10, height: 10, color: "rgba(240,244,255,0.2)" }} />
                      }
                      <span style={{ fontSize: 9, color: "rgba(240,244,255,0.3)" }}>
                        {isAudioOn ? "Mic active" : "Mic off"}
                      </span>
                    </div>
                    {/* Audio level bars */}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 16 }}>
                      {Array.from({ length: 8 }).map((_, i) => {
                        const threshold = (i + 1) / 8;
                        const active = isAudioOn && (audioDb / 100) >= threshold;
                        return (
                          <motion.div
                            key={i}
                            animate={{ height: active ? `${50 + i * 6}%` : "20%" }}
                            style={{
                              flex: 1, borderRadius: 1,
                              background: active ? "#FF8C42" : "rgba(255,255,255,0.06)",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Motion visualizer */}
                  <div style={{
                    padding: "8px 10px", borderRadius: 10,
                    background: isMotionOn ? (motionScore > 0 ? "rgba(180,127,255,0.06)" : "rgba(180,127,255,0.03)") : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isMotionOn ? (motionScore > 0 ? "rgba(180,127,255,0.2)" : "rgba(180,127,255,0.1)") : "rgba(255,255,255,0.05)"}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                      <Activity style={{ width: 10, height: 10, color: isMotionOn ? (motionScore > 0 ? "#B47FFF" : "#B47FFF80") : "rgba(240,244,255,0.2)" }} />
                      <span style={{ fontSize: 9, color: "rgba(240,244,255,0.3)" }}>
                        {isMotionOn ? "Motion active" : "Motion off"}
                      </span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                      <motion.div
                        animate={{ width: isMotionOn ? `${accelMagnitude}%` : '0%' }}
                        style={{ height: "100%", background: "#B47FFF", borderRadius: 2 }}
                      />
                    </div>
                    <div style={{ fontSize: 9, color: motionScore > 0 ? "#B47FFF" : "rgba(240,244,255,0.2)", marginTop: 4 }}>
                      {motionScore > 0 ? "⚡ Anomaly detected" : (isMotionOn ? "Normal" : "Inactive")}
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {/* Audio toggle */}
                    <button
                      id="raksha-audio-toggle"
                      onClick={() => isAudioOn ? stopAudioMonitor() : startAudioMonitor()}
                      style={{
                        padding: "8px 0", borderRadius: 10,
                        fontSize: 10, fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        background: isAudioOn ? "rgba(255,140,66,0.12)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${isAudioOn ? "rgba(255,140,66,0.3)" : "rgba(255,255,255,0.08)"}`,
                        color: isAudioOn ? "#FF8C42" : "rgba(240,244,255,0.4)",
                      }}
                    >
                      {isAudioOn
                        ? <><MicOff style={{ width: 11, height: 11 }} /> Stop Audio</>
                        : <><Mic style={{ width: 11, height: 11 }} /> Start Audio</>
                      }
                    </button>
                    {/* Motion toggle */}
                    <button
                      id="raksha-motion-toggle"
                      onClick={() => isMotionOn ? stopMotionMonitor() : startMotionMonitor()}
                      style={{
                        padding: "8px 0", borderRadius: 10,
                        fontSize: 10, fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        background: isMotionOn ? "rgba(180,127,255,0.12)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${isMotionOn ? "rgba(180,127,255,0.3)" : "rgba(255,255,255,0.08)"}`,
                        color: isMotionOn ? "#B47FFF" : "rgba(240,244,255,0.4)",
                      }}
                    >
                      <Activity style={{ width: 11, height: 11 }} />
                      {isMotionOn ? "Stop Motion" : "Start Motion"}
                    </button>
                  </div>

                  {/* Test buttons (dev/demo) */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <button
                      id="raksha-sim-audio"
                      onClick={simulateAudioAnomaly}
                      style={{
                        padding: "6px 0", borderRadius: 8, fontSize: 10, fontWeight: 700,
                        cursor: "pointer", background: "rgba(255,140,66,0.06)",
                        border: "1px solid rgba(255,140,66,0.15)", color: "rgba(255,140,66,0.6)",
                      }}
                    >
                      <Zap style={{ width: 9, height: 9, display: "inline", marginRight: 3 }} />
                      Test Audio
                    </button>
                    <button
                      id="raksha-sim-motion"
                      onClick={simulateMotionAnomaly}
                      style={{
                        padding: "6px 0", borderRadius: 8, fontSize: 10, fontWeight: 700,
                        cursor: "pointer", background: "rgba(180,127,255,0.06)",
                        border: "1px solid rgba(180,127,255,0.15)", color: "rgba(180,127,255,0.6)",
                      }}
                    >
                      <Activity style={{ width: 9, height: 9, display: "inline", marginRight: 3 }} />
                      Test Motion
                    </button>
                  </div>

                  {/* Clear all (if elevated) */}
                  {(audioScore > 0 || motionScore > 0 || levelN >= 2) && (
                    <button
                      id="raksha-clear-all"
                      onClick={() => {
                        clearAllAnomalies();
                        setL3Dismissed(false);
                        setL4Dismissed(false);
                      }}
                      style={{
                        width: "100%", padding: "8px 0", borderRadius: 10,
                        fontSize: 11, fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        background: "rgba(0,255,163,0.06)",
                        border: "1px solid rgba(0,255,163,0.2)",
                        color: "#00FFA3",
                      }}
                    >
                      <CheckCircle style={{ width: 11, height: 11 }} />
                      I&apos;m Safe — Reset Score
                    </button>
                  )}
                </div>

                {/* Level indicator dots */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 6, marginTop: 14,
                }}>
                  {[
                    { n: 0, label: "Safe",    color: "#00FFA3" },
                    { n: 1, label: "L1",      color: "#FFBA08" },
                    { n: 2, label: "L2",      color: "#FF8C42" },
                    { n: 3, label: "L3",      color: "#FF2D55" },
                    { n: 4, label: "L4",      color: "#FF0055" },
                  ].map((d) => (
                    <div key={d.n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <motion.div
                        animate={{
                          background: levelN === d.n ? d.color : "rgba(255,255,255,0.06)",
                          boxShadow: levelN === d.n ? `0 0 8px ${d.color}` : "none",
                        }}
                        style={{ width: levelN === d.n ? 10 : 6, height: levelN === d.n ? 10 : 6, borderRadius: "50%" }}
                      />
                      <span style={{
                        fontSize: 7, color: levelN === d.n ? d.color : "rgba(240,244,255,0.15)",
                        fontWeight: 700,
                      }}>{d.label}</span>
                    </div>
                  ))}
                </div>

                {/* Shield icon + branding */}
                <div style={{ textAlign: "center", marginTop: 10 }}>
                  <Shield style={{ width: 11, height: 11, color: "rgba(240,244,255,0.12)", display: "inline" }} />
                  <span style={{ fontSize: 9, color: "rgba(240,244,255,0.12)", marginLeft: 4 }}>
                    Raksha Risk Score · Engine v1
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

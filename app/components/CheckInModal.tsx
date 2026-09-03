"use client";

// =============================================================
// RAKSHANET — Level 2 Silent Check-In Modal
// Shown when Raksha Risk Score hits HIGH_RISK (30–54).
// "Are you safe?" — Yes/No with 60s auto-escalate timer.
// =============================================================

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";

interface CheckInModalProps {
  visible: boolean;
  onRespond: (isSafe: boolean) => void;
  rakshaScore: number;
  autoEscalateSeconds?: number;
}

export default function CheckInModal({
  visible,
  onRespond,
  rakshaScore,
  autoEscalateSeconds = 60,
}: CheckInModalProps) {
  const [remaining, setRemaining] = useState(autoEscalateSeconds);

  // Reset timer when modal becomes visible
  useEffect(() => {
    if (!visible) { setRemaining(autoEscalateSeconds); return; }
    setRemaining(autoEscalateSeconds);
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(interval); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, autoEscalateSeconds]);

  const progress = remaining / autoEscalateSeconds;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
            background: "rgba(0,0,0,0.82)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 24 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            style={{
              width: "100%", maxWidth: 400,
              background: "rgba(6,10,18,0.98)",
              border: "1px solid rgba(255,140,66,0.45)",
              borderRadius: 28,
              padding: "36px 32px",
              textAlign: "center",
              boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(255,140,66,0.12)",
              position: "relative", overflow: "hidden",
            }}
          >
            {/* Glow top border */}
            <div style={{
              position: "absolute", top: 0, left: "15%", right: "15%", height: 1,
              background: "linear-gradient(90deg, transparent, rgba(255,140,66,0.7), transparent)",
            }} />

            {/* Radial glow */}
            <div style={{
              position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
              width: 300, height: 300, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,140,66,0.07) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />

            {/* Countdown ring */}
            <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 24px" }}>
              <svg
                style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
                viewBox="0 0 100 100"
                fill="none"
              >
                {/* Track */}
                <circle cx="50" cy="50" r="44" stroke="rgba(255,140,66,0.1)" strokeWidth="3" />
                {/* Progress */}
                <motion.circle
                  cx="50" cy="50" r="44"
                  stroke="#FF8C42"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 44}
                  initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - progress) }}
                  transition={{ duration: 0.9 }}
                />
              </svg>

              {/* Shield icon in center */}
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 2,
              }}>
                <AlertTriangle style={{ width: 20, height: 20, color: "#FF8C42" }} />
                <span style={{
                  fontSize: 13, fontWeight: 900, color: "#FF8C42",
                  fontFamily: "monospace",
                }}>
                  {remaining}s
                </span>
              </div>
            </div>

            {/* Level badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 12px", borderRadius: 100,
              background: "rgba(255,140,66,0.1)", border: "1px solid rgba(255,140,66,0.3)",
              marginBottom: 16,
            }}>
              <Shield style={{ width: 11, height: 11, color: "#FF8C42" }} />
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "#FF8C42",
              }}>
                Level 2 — High Risk
              </span>
            </div>

            {/* Heading */}
            <h2 style={{
              fontSize: 24, fontWeight: 900, color: "#F0F4FF",
              marginBottom: 8, letterSpacing: "-0.02em",
              fontFamily: "var(--font-display,'Outfit',sans-serif)",
            }}>
              Are you safe?
            </h2>

            {/* Sub text */}
            <p style={{
              fontSize: 13, color: "rgba(240,244,255,0.45)",
              lineHeight: 1.6, marginBottom: 10,
            }}>
              RakshaNet detected elevated risk signals.
              <br />
              Raksha Risk Score: <span style={{ color: "#FF8C42", fontWeight: 700 }}>{rakshaScore}</span>
            </p>

            {/* Timer warning */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              marginBottom: 28, fontSize: 11, color: "rgba(240,244,255,0.3)",
            }}>
              <Clock style={{ width: 11, height: 11 }} />
              <span>Auto-escalating in <strong style={{ color: "rgba(255,140,66,0.7)" }}>{remaining}s</strong> if no response</span>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              {/* YES — I'm safe */}
              <motion.button
                id="checkin-safe-btn"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onRespond(true)}
                style={{
                  flex: 1, padding: "14px 0", borderRadius: 16,
                  fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: "linear-gradient(135deg, #00FFA3, #00CC6A)",
                  color: "#030508",
                  boxShadow: "0 4px 20px rgba(0,255,163,0.25)",
                }}
              >
                <CheckCircle style={{ width: 16, height: 16 }} />
                Yes, I'm Safe
              </motion.button>

              {/* NO — need help */}
              <motion.button
                id="checkin-unsafe-btn"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onRespond(false)}
                style={{
                  flex: 1, padding: "14px 0", borderRadius: 16,
                  fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: "linear-gradient(135deg, #FF2D55, #CC0033)",
                  color: "#fff",
                  boxShadow: "0 4px 20px rgba(255,45,85,0.3)",
                }}
              >
                <XCircle style={{ width: 16, height: 16 }} />
                No, Help Me
              </motion.button>
            </div>

            {/* Fine print */}
            <p style={{
              fontSize: 10, color: "rgba(240,244,255,0.18)",
              marginTop: 18, lineHeight: 1.5,
            }}>
              Selecting &quot;Help Me&quot; will immediately activate SOS and alert your trusted contact.
              No response in {autoEscalateSeconds}s will escalate automatically.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

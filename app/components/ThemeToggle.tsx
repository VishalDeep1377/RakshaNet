"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "@/app/context/ThemeContext";

const OPTIONS: { mode: ThemeMode; label: string; hint: string; icon: React.ElementType }[] = [
  { mode: "dark",   label: "Dark",   hint: "Always dark",          icon: Moon },
  { mode: "light",  label: "Light",  hint: "Always light",         icon: Sun },
  { mode: "system", label: "System", hint: "Follows your device",  icon: Monitor },
];

export default function ThemeToggle() {
  const { mode, resolvedTheme, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Show sun in light, moon in dark, monitor in system
  const ButtonIcon = !mounted ? Moon : mode === "system" ? Monitor : resolvedTheme === "light" ? Sun : Moon;
  const isLight = mounted && resolvedTheme === "light";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        id="theme-toggle-btn"
        onClick={() => setOpen(v => !v)}
        title="Switch theme"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 10,
          background: open ? "rgba(123,97,255,0.12)" : "rgba(255,255,255,0.04)",
          border: open ? "1px solid rgba(123,97,255,0.35)" : "1px solid rgba(255,255,255,0.07)",
          color: open ? "#7B61FF" : isLight ? "rgba(14,18,32,0.5)" : "rgba(240,244,255,0.4)",
          cursor: "pointer", transition: "all 0.2s",
        }}
      >
        <ButtonIcon style={{ width: 15, height: 15 }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              background: isLight ? "rgba(245,247,255,0.98)" : "rgba(9,14,26,0.98)",
              border: isLight ? "1px solid rgba(100,120,200,0.15)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: 6,
              zIndex: 9600,
              minWidth: 200,
              boxShadow: isLight ? "0 16px 40px rgba(100,120,200,0.2)" : "0 16px 40px rgba(0,0,0,0.5)",
              backdropFilter: "blur(20px)",
            }}
          >
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 10px 8px", color: isLight ? "rgba(14,18,32,0.4)" : "rgba(240,244,255,0.3)" }}>
              Theme
            </p>
            {OPTIONS.map(({ mode: m, label, hint, icon: Icon }) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => { setMode(m); setOpen(false); }}
                  style={{
                    width: "100%",
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 10px", borderRadius: 9, border: "none", cursor: "pointer",
                    background: active ? "rgba(123,97,255,0.12)" : "transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: active ? "rgba(123,97,255,0.18)" : isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)",
                    flexShrink: 0,
                  }}>
                    <Icon style={{ width: 14, height: 14, color: active ? "#7B61FF" : isLight ? "rgba(14,18,32,0.45)" : "rgba(240,244,255,0.4)" }} />
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? "#7B61FF" : isLight ? "#0E1220" : "#F0F4FF" }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 10, color: isLight ? "rgba(14,18,32,0.35)" : "rgba(240,244,255,0.3)", marginTop: 1 }}>
                      {hint}
                    </div>
                  </div>
                  {active && (
                    <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: "#7B61FF", flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

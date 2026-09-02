"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Sun, Moon, Monitor, LogOut, Globe,
  Check, ChevronRight, Shield,
} from "lucide-react";
import { useTheme, type ThemeMode } from "@/app/context/ThemeContext";
import { useLanguage, LANGUAGE_OPTIONS, type SupportedLanguage } from "@/app/context/LanguageContext";
import Link from "next/link";

interface ProfileDropdownProps {
  userName: string | null;
  userAvatar: string | null;
  userEmail?: string | null;
  onLogout: () => void;
}

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: React.ElementType }[] = [
  { mode: "dark",   label: "Dark",   icon: Moon },
  { mode: "light",  label: "Light",  icon: Sun },
  { mode: "system", label: "System", icon: Monitor },
];

export default function ProfileDropdown({ userName, userAvatar, userEmail, onLogout }: ProfileDropdownProps) {
  const { mode: themeMode, resolvedTheme, setMode: setThemeMode } = useTheme();
  const { language, setLanguage, t } = useLanguage();
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

  const isLight = mounted && resolvedTheme === "light";
  const initials = userName?.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "";

  // Surface colours respond to theme
  const S = isLight
    ? {
        drop: "rgba(245,247,255,0.99)",
        border: "rgba(100,120,200,0.15)",
        shadow: "0 20px 60px rgba(100,120,200,0.22), 0 8px 24px rgba(100,120,200,0.12)",
        divider: "rgba(100,120,200,0.1)",
        label: "rgba(14,18,32,0.38)",
        text: "#0E1220",
        text2: "rgba(14,18,32,0.55)",
        text3: "rgba(14,18,32,0.32)",
        btn: "rgba(0,0,0,0.04)",
        btnHover: "rgba(0,0,0,0.07)",
        avatarBg: "linear-gradient(135deg, rgba(0,229,255,0.18), rgba(123,97,255,0.14))",
      }
    : {
        drop: "rgba(8,12,22,0.99)",
        border: "rgba(255,255,255,0.08)",
        shadow: "0 20px 60px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)",
        divider: "rgba(255,255,255,0.06)",
        label: "rgba(240,244,255,0.28)",
        text: "#F0F4FF",
        text2: "rgba(240,244,255,0.55)",
        text3: "rgba(240,244,255,0.28)",
        btn: "rgba(255,255,255,0.04)",
        btnHover: "rgba(255,255,255,0.08)",
        avatarBg: "linear-gradient(135deg, rgba(0,229,255,0.14), rgba(123,97,255,0.10))",
      };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* ── Avatar trigger button ── */}
      <button
        id="profile-avatar-btn"
        onClick={() => setOpen(v => !v)}
        title="Account & Settings"
        style={{
          width: 36, height: 36, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: userAvatar ? "transparent" : "linear-gradient(135deg, rgba(0,229,255,0.14), rgba(123,97,255,0.10))",
          border: open ? "2px solid #7B61FF" : "1px solid rgba(0,229,255,0.22)",
          overflow: "hidden", cursor: "pointer",
          transition: "all 0.2s",
          boxShadow: open ? "0 0 0 3px rgba(123,97,255,0.18)" : "none",
          padding: 0,
        }}
      >
        {userAvatar ? (
          <img src={userAvatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : initials ? (
          <span style={{ fontSize: 13, fontWeight: 800, color: "#00E5FF", letterSpacing: "-0.02em", fontFamily: "inherit" }}>
            {initials}
          </span>
        ) : (
          <User style={{ width: 15, height: 15, color: "#00E5FF" }} />
        )}
      </button>

      {/* ── Dropdown panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute",
              top: "calc(100% + 10px)",
              right: 0,
              width: 300,
              borderRadius: 18,
              background: S.drop,
              border: `1px solid ${S.border}`,
              boxShadow: S.shadow,
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              overflow: "hidden",
              zIndex: 9700,
            }}
          >
            {/* ── User Info Header ── */}
            <div style={{ padding: "16px 16px 14px", borderBottom: `1px solid ${S.divider}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: userAvatar ? "transparent" : S.avatarBg,
                  border: "1px solid rgba(0,229,255,0.22)", overflow: "hidden",
                }}>
                  {userAvatar ? (
                    <img src={userAvatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : initials ? (
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#00E5FF", letterSpacing: "-0.02em" }}>{initials}</span>
                  ) : (
                    <User style={{ width: 18, height: 18, color: "#00E5FF" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: S.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {userName || "User"}
                  </div>
                  {userEmail && (
                    <div style={{ fontSize: 11, color: S.text3, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {userEmail}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Shield style={{ width: 9, height: 9, color: "#00FFA3" }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#00FFA3", letterSpacing: "0.06em" }}>PROTECTED</span>
                  </div>
                </div>
                <Link
                  href="/dashboard/profile"
                  onClick={() => setOpen(false)}
                  style={{
                    fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 7,
                    background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)",
                    color: "#00E5FF", textDecoration: "none", whiteSpace: "nowrap",
                  }}
                >
                  Edit →
                </Link>
              </div>
            </div>

            {/* ── Language Section ── */}
            <div style={{ padding: "12px 16px 8px", borderBottom: `1px solid ${S.divider}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Globe style={{ width: 12, height: 12, color: S.label }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: S.label }}>
                  Language
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {LANGUAGE_OPTIONS.map(opt => {
                  const active = language === opt.code;
                  return (
                    <button
                      key={opt.code}
                      onClick={() => setLanguage(opt.code as SupportedLanguage)}
                      style={{
                        padding: "8px 10px", borderRadius: 10, cursor: "pointer",
                        background: active ? "rgba(0,229,255,0.1)" : S.btn,
                        border: `1px solid ${active ? "rgba(0,229,255,0.3)" : S.border}`,
                        transition: "all 0.15s",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}
                    >
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "#00E5FF" : S.text, lineHeight: 1 }}>
                          {opt.nativeLabel}
                        </div>
                        <div style={{ fontSize: 9, color: S.text3, marginTop: 2 }}>
                          {opt.label}
                        </div>
                      </div>
                      {active && <Check style={{ width: 11, height: 11, color: "#00E5FF", flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Theme Section ── */}
            <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${S.divider}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Moon style={{ width: 12, height: 12, color: S.label }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: S.label }}>
                  Appearance
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {THEME_OPTIONS.map(({ mode: m, label, icon: Icon }) => {
                  const active = themeMode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setThemeMode(m)}
                      style={{
                        flex: 1, padding: "8px 6px",
                        borderRadius: 10, cursor: "pointer",
                        background: active ? "rgba(123,97,255,0.14)" : S.btn,
                        border: `1px solid ${active ? "rgba(123,97,255,0.35)" : S.border}`,
                        transition: "all 0.15s",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                      }}
                    >
                      <Icon style={{ width: 14, height: 14, color: active ? "#7B61FF" : S.text2 }} />
                      <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? "#7B61FF" : S.text2 }}>
                        {label}
                      </span>
                      {active && (
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#7B61FF" }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Sign Out ── */}
            <div style={{ padding: "8px 10px 10px" }}>
              <button
                onClick={() => { setOpen(false); onLogout(); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 10px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: "transparent", color: "rgba(255,45,107,0.7)",
                  fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                  transition: "all 0.15s", textAlign: "left",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(255,45,107,0.08)";
                  e.currentTarget.style.color = "#FF2D6B";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "rgba(255,45,107,0.7)";
                }}
              >
                <LogOut style={{ width: 14, height: 14 }} />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  User, Home, Briefcase, Route, Users, Shield, Bell,
  Fingerprint, MapPin, Plus, Trash2, ChevronDown,
  CheckCircle2, Heart, AlertTriangle, Save,
  Camera, Lock, X, Navigation, Globe, Sun, Moon, Monitor,
} from "lucide-react";
import MapPicker from "@/app/components/MapPicker";
import { useLanguage, LANGUAGE_OPTIONS, type SupportedLanguage } from "@/app/context/LanguageContext";
import { useTheme, type ThemeMode } from "@/app/context/ThemeContext";


interface TrustedContact {
  id: string; name: string; phone: string; relationship: string;
  priority: "Primary" | "Secondary"; canViewLocation: boolean;
  canReceiveEvidence: boolean; notificationPref: string;
}
interface WorkLocation {
  id: string; name: string; address: string; startTime: string; endTime: string;
}
interface SafeLocation {
  id: string; name: string; address: string; radius: string; isActive: boolean;
}
interface RouteEntry {
  id: string; from: string; to: string; time: string; isPrimary: boolean;
}
const C = { cyan: "var(--cyan)", violet: "var(--ai-violet)", magenta: "var(--danger)", amber: "#F5A623", green: "var(--green, #00FFA3)", purple: "#B47FFF" };

/* ─────────────────────────────────────────────────────────
   AMBIENT BACKGROUND — Obsidian Holoshield atmosphere layer
   Purely decorative (aria-hidden, pointer-events: none).
───────────────────────────────────────────────────────── */
function AmbientBackground() {
  const reduceMotion = useReducedMotion();
  const particles = Array.from({ length: 12 });
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* Base violet/AI wash — sits under everything else */}
      <div style={{
        position: "absolute", inset: 0,
        background:
          "radial-gradient(ellipse 70% 55% at 50% -8%, rgba(124,92,255,0.10), transparent 60%)," +
          "radial-gradient(ellipse 60% 50% at 90% 40%, rgba(124,92,255,0.07), transparent 65%)," +
          "radial-gradient(ellipse 55% 45% at 8% 75%, rgba(0,229,255,0.035), transparent 60%)",
      }} />
      <div
        className="bg-grid"
        style={{
          position: "absolute", inset: "-5%", opacity: 0.5,
          backgroundImage:
            "linear-gradient(rgba(124,92,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,255,0.035) 1px, transparent 1px)",
          animationPlayState: reduceMotion ? "paused" : "running",
        }}
      />
      {/* Dominant AI-violet glow, front and center */}
      <div
        className="ambient-blob"
        style={{
          width: 640, height: 640, top: "-16%", left: "50%", transform: "translateX(-50%)",
          background: "rgba(124,92,255,0.06)",
          animationPlayState: reduceMotion ? "paused" : "running",
        }}
      />
      <div
        className="ambient-blob"
        style={{
          width: 460, height: 460, top: "35%", right: "-8%",
          background: "rgba(124,92,255,0.045)",
          animationDelay: "3s",
          animationPlayState: reduceMotion ? "paused" : "running",
        }}
      />
      {/* Cyan kept as a small secondary accent, not dominant */}
      <div
        className="ambient-blob ambient-blob-cyan"
        style={{ width: 340, height: 340, bottom: "8%", left: "4%", opacity: 0.6, animationPlayState: reduceMotion ? "paused" : "running" }}
      />
      {/* Danger glow reduced to a faint hint, no longer competing for attention */}
      <div
        className="ambient-blob ambient-blob-danger"
        style={{ width: 260, height: 260, bottom: "-14%", left: "40%", opacity: 0.4, animationPlayState: reduceMotion ? "paused" : "running" }}
      />
      <div className="scanlines" style={{ position: "absolute", inset: 0 }} />
      {!reduceMotion && particles.map((_, i) => {
        // Violet-weighted palette: mostly violet, cyan and white as accents, red rare
        const palette = ["var(--ai-violet)", "var(--ai-violet)", "var(--cyan)", "rgba(255,255,255,0.55)", "var(--ai-violet)", "var(--danger)"];
        const color = palette[i % palette.length];
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${(i * 31 + 6) % 96}%`,
              top: `${(i * 47 + 10) % 96}%`,
              width: i % 3 === 0 ? 3 : 2,
              height: i % 3 === 0 ? 3 : 2,
              borderRadius: "50%",
              background: color,
              boxShadow: `0 0 7px ${color}`,
              opacity: 0.45,
              animation: `particle-float ${14 + (i % 6) * 2}s ease-in-out ${i * 1.2}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

function Toggle({ label, hint, value, onChange, color = C.cyan }: {
  label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; color?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, color: "rgba(240,244,255,0.75)", fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "rgba(240,244,255,0.3)", marginTop: 2 }}>{hint}</div>}
      </div>
      <button onClick={() => onChange(!value)} style={{
        position: "relative", width: 44, height: 24, borderRadius: 12, flexShrink: 0,
        cursor: "pointer", transition: "all 0.3s cubic-bezier(0.2,0.8,0.2,1)",
        background: value ? color : "rgba(0,0,0,0.4)",
        boxShadow: value ? `0 0 14px ${color}80, inset 0 2px 5px rgba(0,0,0,0.5)` : "inset 0 2px 5px rgba(0,0,0,0.5)",
        border: `1px solid ${value ? color : "var(--border-subtle)"}`,
      }}>
        {value && (
          <motion.span
            key="toggle-pulse"
            initial={{ opacity: 0.5, scale: 1 }}
            animate={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ position: "absolute", inset: 0, borderRadius: 12, border: `1px solid ${color}`, pointerEvents: "none" }}
          />
        )}
        <motion.div animate={{ x: value ? 21 : 3 }} transition={{ type: "spring", damping: 22, stiffness: 320 }}
          style={{ position: "absolute", top: 2, width: 18, height: 18, borderRadius: "50%", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
      </button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", hint, span2 }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string; span2?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={span2 ? { gridColumn: "1/-1" } : {}}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,244,255,0.3)", marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: "12px 16px", borderRadius: 12, fontSize: 13, color: "#F0F4FF",
          background: "var(--bg-card)", outline: "none", fontFamily: "inherit",
          border: focused ? "1px solid rgba(0,229,255,0.4)" : "1px solid var(--border-subtle)",
          transition: "all 0.3s cubic-bezier(0.2,0.8,0.2,1)",
          boxShadow: focused ? "0 0 20px rgba(0,229,255,0.12) inset, 0 0 16px rgba(0,229,255,0.08)" : "none"
        }} />
      {hint && <p style={{ fontSize: 10, color: "rgba(240,244,255,0.25)", marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

function TArea({ label, value, onChange, placeholder, color = "rgba(0,229,255,0.4)", span2 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; color?: string; span2?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={span2 ? { gridColumn: "1/-1" } : {}}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,244,255,0.3)", marginBottom: 6 }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: "12px 16px", borderRadius: 12, fontSize: 13, color: "#F0F4FF",
          background: "var(--bg-card)", outline: "none", resize: "vertical", fontFamily: "inherit",
          border: focused ? "1px solid " + color : "1px solid var(--border-subtle)",
          transition: "all 0.3s cubic-bezier(0.2,0.8,0.2,1)",
          boxShadow: focused ? `0 0 20px ${color}20 inset` : "none"
        }} />
    </div>
  );
}

function Sel({ label, value, onChange, options, span2 }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; span2?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={span2 ? { gridColumn: "1/-1" } : {}}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,244,255,0.3)", marginBottom: 6 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: "12px 16px", borderRadius: 12, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
          color: value ? "#F0F4FF" : "rgba(240,244,255,0.3)", background: "var(--bg-card)", outline: "none", appearance: "none",
          border: focused ? "1px solid rgba(0,229,255,0.4)" : "1px solid var(--border-subtle)",
          transition: "all 0.3s cubic-bezier(0.2,0.8,0.2,1)",
          boxShadow: focused ? "0 0 20px rgba(0,229,255,0.1) inset" : "none"
        }}>
        <option value="" style={{ background: "#0C1220" }}>Select…</option>
        {options.map(o => <option key={o} value={o} style={{ background: "#0C1220" }}>{o}</option>)}
      </select>
    </div>
  );
}

function SectionCard({ icon: Icon, title, subtitle, color, children, defaultOpen = false, index = 0 }: {
  icon: React.ElementType; title: string; subtitle: string; color: string; children: React.ReactNode; defaultOpen?: boolean; index?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }}
      style={{
        borderRadius: 20, overflow: "hidden", position: "relative",
        background: open
          ? "linear-gradient(135deg, rgba(14,24,36,0.6), rgba(6,10,18,0.78))"
          : "linear-gradient(135deg, rgba(12,24,38,0.62), rgba(6,12,20,0.76))",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid " + (open ? color + "35" : "var(--border-subtle)"),
        transition: "border-color 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1), background 0.4s ease",
        boxShadow: open ? `0 10px 40px rgba(0,0,0,0.5), 0 0 32px ${color}14, inset 0 1px 0 ${color}14` : "0 4px 20px rgba(0,0,0,0.2)"
      }}
    >
      {/* animated accent line along the top edge, active only when open */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1.5, pointerEvents: "none",
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity: open ? 1 : 0, transition: "opacity 0.4s ease",
      }} />
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 14,
        padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left"
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: color + "14", border: "1px solid " + color + "28", position: "relative",
          boxShadow: open ? `0 0 18px ${color}45` : "none", transition: "box-shadow 0.4s ease"
        }}>
          {open && (
            <motion.span
              aria-hidden="true"
              animate={{ scale: [1, 1.4, 1], opacity: [0.55, 0, 0.55] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              style={{ position: "absolute", inset: -2, borderRadius: 12, border: `1px solid ${color}`, pointerEvents: "none" }}
            />
          )}
          <Icon style={{ width: 18, height: 18, color, position: "relative", zIndex: 1 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#F0F4FF" }}>{title}</div>
          <div style={{ fontSize: 11, color: "rgba(240,244,255,0.35)", marginTop: 2 }}>{subtitle}</div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} style={{ flexShrink: 0, color: "rgba(240,244,255,0.25)" }}>
          <ChevronDown style={{ width: 16, height: 16 }} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: "hidden" }}>
            <div style={{ padding: "0 20px 22px", borderTop: "1px solid " + color + "14" }}>
              <div style={{ paddingTop: 18 }}>{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StrengthMeter({ sections }: { sections: Record<string, boolean> }) {
  const done = Object.values(sections).filter(Boolean).length;
  const total = Object.values(sections).length;
  const pct = Math.round((done / total) * 100);
  const color = pct >= 80 ? C.green : pct >= 50 ? C.amber : C.magenta;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  return (
    <div style={{
      borderRadius: 20, padding: 24, position: "sticky", top: 24, overflow: "hidden",
      background: "linear-gradient(135deg, rgba(12,24,38,0.82), rgba(6,12,20,0.92))",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      border: "1px solid var(--border-subtle)",
      boxShadow: "0 10px 40px rgba(0,0,0,0.35)"
    }}>
      <div style={{ position: "absolute", top: -20, left: -20, width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(240,244,255,0.6)", letterSpacing: "0.04em" }}>Profile Strength</span>
      </div>

      <div style={{ display: "flex", justifyContent: "center", position: "relative", margin: "12px 0 8px" }}>
        <svg width={110} height={110} viewBox="0 0 110 110" style={{ transform: "rotate(-90deg)" }}>
          <circle cx={55} cy={55} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7} />
          <motion.circle
            cx={55} cy={55} r={radius} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - (pct / 100) * circumference }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: `drop-shadow(0 0 6px ${color}90)` }}
          />
        </svg>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 900, color, fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>{pct}%</div>
          <div style={{ fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(240,244,255,0.3)", marginTop: 1 }}>Complete</div>
        </div>
      </div>

      <p style={{ fontSize: 11, color: "rgba(240,244,255,0.35)", marginBottom: 16, lineHeight: 1.5, textAlign: "center" }}>
        {pct >= 80 ? "Excellent! Your profile is comprehensive." : pct >= 50 ? "Good progress. Complete more sections." : "Complete your profile to maximize protection."}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.entries(sections).map(([label, isDone]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 16, height: 16, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: isDone ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.04)",
              border: "1px solid " + (isDone ? "rgba(0,255,136,0.4)" : "rgba(255,255,255,0.1)"), transition: "all 0.3s"
            }}>
              {isDone && <CheckCircle2 style={{ width: 10, height: 10, color: C.green }} />}
            </div>
            <span style={{ fontSize: 11, color: isDone ? "rgba(240,244,255,0.55)" : "rgba(240,244,255,0.22)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SafetyProfilePage() {
  const { language: appLanguage, setLanguage: setAppLanguage } = useLanguage();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [language, setLanguage] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [homeAddress, setHomeAddress] = useState("");
  const [homeRadius, setHomeRadius] = useState("200m");
  const [homeNotify, setHomeNotify] = useState(true);
  // Map picker: tracks which field is being edited ("home" | workLocation id | safeLocation id | null)
  const [mapTarget, setMapTarget] = useState<string | null>(null);
  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([
    { id: "w1", name: "College", address: "", startTime: "09:00", endTime: "17:00" },
  ]);
  const [routes, setRoutes] = useState<RouteEntry[]>([
    { id: "rt1", from: "", to: "", time: "", isPrimary: true },
  ]);
  const [contacts, setContacts] = useState<TrustedContact[]>([{
    id: "tc1", name: "", phone: "", relationship: "", priority: "Primary",
    canViewLocation: true, canReceiveEvidence: false, notificationPref: "SMS + App",
  }]);
  const [responderGender, setResponderGender] = useState("Female preferred");
  const [responderLanguage, setResponderLanguage] = useState("Hindi");
  const [responderInstructions, setResponderInstructions] = useState("");
  const [autoEscalate, setAutoEscalate] = useState(true);
  const [escalateAfter, setEscalateAfter] = useState("60 seconds");
  const [shareLocationContacts, setShareLocationContacts] = useState(true);
  const [shareLocationResponder, setShareLocationResponder] = useState(true);
  const [autoEvidence, setAutoEvidence] = useState(true);
  const [confirmSafe, setConfirmSafe] = useState(true);
  const [triggerLongPress, setTriggerLongPress] = useState(true);
  const [triggerVolume, setTriggerVolume] = useState(true);
  const [triggerShake, setTriggerShake] = useState(false);
  const [triggerDoublePower, setTriggerDoublePower] = useState(true);
  const [cancelWindow, setCancelWindow] = useState("8 seconds");
  const [sensitivity, setSensitivity] = useState("Medium");
  const [safeLocations, setSafeLocations] = useState<SafeLocation[]>([
    { id: "sl1", name: "Home", address: "", radius: "150m", isActive: true },
    { id: "sl2", name: "College", address: "", radius: "200m", isActive: true },
  ]);
  const [saved, setSaved] = useState(false);
  const [loadingDb, setLoadingDb] = useState(true);
  const [savingDb, setSavingDb] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);


  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoadingDb(false);

      setUserId(user.id);

      // Load Profile
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (p) {
        setFullName(p.full_name || "");
        setPhone(p.phone || "");
        setGender(p.gender || "");
        setAgeRange(p.age_range || "");
        setBloodGroup(p.blood_group || "");
        setMedicalNotes(p.medical_notes || "");
        setLanguage(p.preferred_language || "");

        if (p.home_location?.address) {
          setHomeAddress(p.home_location.address);
          setHomeRadius(p.home_location.radius || "200m");
          setHomeNotify(p.home_location.notify ?? true);
        }

        if (Array.isArray(p.work_locations) && p.work_locations.length > 0) setWorkLocations(p.work_locations);
        if (Array.isArray(p.regular_routes) && p.regular_routes.length > 0) setRoutes(p.regular_routes);

        if (p.emergency_preferences) {
          setAutoEscalate(p.emergency_preferences.autoEscalate ?? true);
          setEscalateAfter(p.emergency_preferences.escalateAfter || "60 seconds");
          setShareLocationContacts(p.emergency_preferences.shareLocationContacts ?? true);
          setShareLocationResponder(p.emergency_preferences.shareLocationResponder ?? true);
          setAutoEvidence(p.emergency_preferences.autoEvidence ?? true);
          setConfirmSafe(p.emergency_preferences.confirmSafe ?? true);
        }

        if (p.silent_trigger_settings) {
          setTriggerLongPress(p.silent_trigger_settings.longPress ?? true);
          setTriggerVolume(p.silent_trigger_settings.volume ?? true);
          setTriggerShake(p.silent_trigger_settings.shake ?? false);
          setTriggerDoublePower(p.silent_trigger_settings.doublePower ?? true);
          setCancelWindow(p.silent_trigger_settings.cancelWindow || "8 seconds");
          setSensitivity(p.silent_trigger_settings.sensitivity || "Medium");
        }

        if (p.preferred_responder) {
          setResponderGender(p.preferred_responder.gender || "Female preferred");
          setResponderLanguage(p.preferred_responder.language || "Hindi");
          setResponderInstructions(p.preferred_responder.instructions || "");
        }
      }

      // Load Trusted Contacts
      const { data: tc } = await supabase.from("trusted_contacts").select("*").eq("user_id", user.id);
      if (tc && tc.length > 0) {
        setContacts(tc.map(c => ({
          id: c.id, name: c.name, phone: c.phone, relationship: c.relationship,
          priority: c.priority, canViewLocation: c.can_view_location,
          canReceiveEvidence: c.can_receive_evidence, notificationPref: c.notification_preference
        })));
      } else {
        setContacts([{ id: "tc1", name: "", phone: "", relationship: "", priority: "Primary", canViewLocation: true, canReceiveEvidence: false, notificationPref: "SMS + App" }]);
      }

      // Load Safe Locations
      const { data: sl } = await supabase.from("safe_locations").select("*").eq("user_id", user.id);
      if (sl && sl.length > 0) {
        setSafeLocations(sl.map(s => ({
          id: s.id, name: s.name, address: s.address, radius: `${s.radius}m`, isActive: s.is_active
        })));
      } else {
        setSafeLocations([
          { id: "sl1", name: "Home", address: "", radius: "150m", isActive: true },
          { id: "sl2", name: "College", address: "", radius: "200m", isActive: true }
        ]);
      }

      setLoadingDb(false);
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setSavingDb(true);
    const supabase = createClient();

    // ── Geocode helper: calls our secure server-side API which uses Google Maps ──
    const geocodeAddress = async (addr: string): Promise<{ lat: number; lng: number } | null> => {
      if (!addr.trim()) return null;
      try {
        const res = await fetch(`/api/geocode?address=${encodeURIComponent(addr)}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.lat && data.lng) return { lat: data.lat, lng: data.lng };
      } catch (e) {
        console.error("Geocoding failed:", e);
      }
      return null;
    };

    // Geocode Home
    const homeCoords = await geocodeAddress(homeAddress);

    // Geocode Work
    const geocodedWork = await Promise.all(workLocations.map(async (w) => {
      if (!w.address) return w;
      const coords = await geocodeAddress(w.address);
      return coords ? { ...w, latitude: coords.lat, longitude: coords.lng } : w;
    }));

    // 1. UPDATE Profile (not upsert — profile row already created by auth trigger)
    const { error: profileErr } = await supabase.from("profiles").update({
      full_name: fullName,
      phone, gender, age_range: ageRange, blood_group: bloodGroup,
      medical_notes: medicalNotes, preferred_language: language,
      home_location: {
        address: homeAddress,
        radius: homeRadius,
        notify: homeNotify,
        ...(homeCoords ? { latitude: homeCoords.lat, longitude: homeCoords.lng } : {})
      },
      work_locations: geocodedWork,
      regular_routes: routes,
      emergency_preferences: { autoEscalate, escalateAfter, shareLocationContacts, shareLocationResponder, autoEvidence, confirmSafe },
      silent_trigger_settings: { longPress: triggerLongPress, volume: triggerVolume, shake: triggerShake, doublePower: triggerDoublePower, cancelWindow, sensitivity },
      preferred_responder: { gender: responderGender, language: responderLanguage, instructions: responderInstructions },
      updated_at: new Date().toISOString()
    }).eq("id", userId);

    if (profileErr) {
      console.error("[Profile Save] profiles update failed:", profileErr.message, profileErr.details);
    }

    // 2. Save Trusted Contacts — delete existing then insert fresh
    const { error: delContactsErr } = await supabase.from("trusted_contacts").delete().eq("user_id", userId);
    if (delContactsErr) console.error("[Profile Save] trusted_contacts delete failed:", delContactsErr.message);

    const validContacts = contacts.filter(c => c.name && c.phone).map(c => ({
      user_id: userId, name: c.name, phone: c.phone, relationship: c.relationship,
      priority: c.priority, can_view_location: c.canViewLocation,
      can_receive_evidence: c.canReceiveEvidence, notification_preference: c.notificationPref
    }));
    if (validContacts.length > 0) {
      const { error: insContactsErr } = await supabase.from("trusted_contacts").insert(validContacts);
      if (insContactsErr) console.error("[Profile Save] trusted_contacts insert failed:", insContactsErr.message);
    }

    // 3. Save Safe Locations — delete existing then insert fresh
    const { error: delSafeErr } = await supabase.from("safe_locations").delete().eq("user_id", userId);
    if (delSafeErr) console.error("[Profile Save] safe_locations delete failed:", delSafeErr.message);

    const validSafeLocs = await Promise.all(safeLocations.filter(s => s.address).map(async (s) => {
      const coords = await geocodeAddress(s.address);
      return {
        user_id: userId, name: s.name, address: s.address,
        radius: parseInt(s.radius) || 200, is_active: s.isActive,
        ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {})
      };
    }));
    if (validSafeLocs.length > 0) {
      const { error: insSafeErr } = await supabase.from("safe_locations").insert(validSafeLocs);
      if (insSafeErr) console.error("[Profile Save] safe_locations insert failed:", insSafeErr.message);
    }

    setSavingDb(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setPhotoUrl(URL.createObjectURL(file));
  };
  const addContact = () => setContacts(p => [...p, {
    id: "tc" + Date.now(), name: "", phone: "", relationship: "", priority: "Secondary",
    canViewLocation: true, canReceiveEvidence: false, notificationPref: "SMS + App",
  }]);
  const removeContact = (id: string) => setContacts(p => p.filter(c => c.id !== id));
  const updateContact = (id: string, field: keyof TrustedContact, value: unknown) =>
    setContacts(p => p.map(c => c.id === id ? { ...c, [field]: value } : c));

  const sectionCompletion = {
    "Personal Info": !!(fullName && phone),
    "Home Location": !!homeAddress,
    "Work / College": workLocations.some(w => !!w.address),
    "Regular Routes": routes.some(r => !!(r.from && r.to)),
    "Trusted Contacts": contacts.some(c => !!(c.name && c.phone)),
    "Preferred Responder": !!responderGender,
    "Emergency Prefs": true,
    "Silent Triggers": true,
    "Safe Locations": safeLocations.some(s => !!s.address),
  };

  const divLine = (color: string) => (
    <div style={{ height: 1, background: "linear-gradient(90deg," + color + "20,transparent)", margin: "14px 0" }} />
  );
  const addBtn = (label: string, color: string, onClick: () => void) => (
    <button onClick={onClick} style={{
      width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 12, fontWeight: 600,
      color: "rgba(240,244,255,0.4)", background: "transparent", cursor: "pointer", border: "1px dashed " + color + "35",
      transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
    }}
      onMouseEnter={e => { const b = e.currentTarget; b.style.color = color; b.style.borderColor = color + "65"; }}
      onMouseLeave={e => { const b = e.currentTarget; b.style.color = "rgba(240,244,255,0.4)"; b.style.borderColor = color + "35"; }}
    ><Plus style={{ width: 13, height: 13 }} />{label}</button>
  );
  const trashBtn = (onClick: () => void) => (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,244,255,0.2)", transition: "color 0.2s", padding: 2 }}
      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = C.magenta}
      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "rgba(240,244,255,0.2)"}
    ><Trash2 style={{ width: 14, height: 14 }} /></button>
  );
  const g2: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 };
  const g3: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 };

  if (loadingDb) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, position: "relative" }}>
        <AmbientBackground />
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(0,229,255,0.2)", borderTopColor: "#00E5FF", position: "relative", zIndex: 1 }} />
        <div style={{ fontSize: 13, color: "rgba(240,244,255,0.5)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", position: "relative", zIndex: 1 }}>Loading Profile...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
      <AmbientBackground />

      {/* Animated top edge sweep for futuristic profile look */}
      <div style={{ position: "absolute", top: -20, left: 0, right: 0, height: 1, overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
        <div style={{ width: "30%", height: "100%", background: "linear-gradient(90deg, transparent, var(--cyan), transparent)", position: "absolute", animation: "top-glow-sweep 8s ease-in-out infinite" }} />
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <motion.div
            animate={{ boxShadow: ["0 0 8px var(--cyan)", "0 0 18px var(--cyan)", "0 0 8px var(--cyan)"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 4, height: 32, background: "var(--cyan)", borderRadius: 2 }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{
                fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: "-0.03em", fontFamily: "var(--font-display)",
                backgroundImage: "linear-gradient(135deg, #F4F7FB 0%, #00E5FF 55%, #7C5CFF 100%)",
                WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
              }}>Safety Profile</h1>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)" }}>
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--cyan)", boxShadow: "0 0 6px var(--cyan)" }}
                />
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--cyan)" }}>Live</span>
              </span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(240,244,255,0.4)", marginTop: 6, maxWidth: 500 }}>Your personal intelligence layer. The more you share, the smarter your protection.</p>
          </div>
        </div>
        <motion.button onClick={handleSave} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 12, fontSize: 12,
          fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", border: "none", cursor: "pointer",
          background: saved ? "linear-gradient(135deg,#00FF88,#00B86B)" : "linear-gradient(135deg,#00E5FF,#7B61FF)",
          color: "#030508", boxShadow: saved ? "0 4px 20px rgba(0,255,136,0.35)" : "0 4px 20px rgba(0,229,255,0.28)", transition: "box-shadow 0.3s"
        }}>
          {saved ? <CheckCircle2 style={{ width: 15, height: 15 }} /> : savingDb ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ width: 15, height: 15, borderRadius: "50%", border: "2px solid rgba(3,5,8,0.2)", borderTopColor: "#030508" }} /> : <Save style={{ width: 15, height: 15 }} />}
          {saved ? "Saved!" : savingDb ? "Saving..." : "Save All Changes"}
        </motion.button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start", position: "relative", zIndex: 2 }}>
        <div><StrengthMeter sections={sectionCompletion} /></div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* A - Personal Info */}
          <SectionCard icon={User} title="Personal Safety Profile" subtitle="Your identity & medical info for emergency responders" color={C.cyan} defaultOpen index={0}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <button onClick={() => fileRef.current?.click()} style={{
                width: 64, height: 64, borderRadius: 16, flexShrink: 0, cursor: "pointer",
                background: photoUrl ? "transparent" : "rgba(0,229,255,0.08)", border: "1.5px dashed rgba(0,229,255,0.35)", overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {photoUrl ? <img src={photoUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <Camera style={{ width: 22, height: 22, color: C.cyan }} />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
              <div>
                <p style={{ fontSize: 13, color: "rgba(240,244,255,0.65)", fontWeight: 500 }}>{photoUrl ? "Photo uploaded" : "Profile Photo (Optional)"}</p>
                <p style={{ fontSize: 11, color: "rgba(240,244,255,0.25)", marginTop: 2 }}>Only shared with responders during active incidents</p>
                {photoUrl && <button onClick={() => setPhotoUrl(null)} style={{ fontSize: 10, color: C.magenta, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <X style={{ width: 10, height: 10 }} /> Remove photo
                </button>}
              </div>
            </div>
            <div style={g2}>
              <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="Your full name" />
              <Field label="Phone Number" value={phone} onChange={setPhone} placeholder="+91 98765 43210" type="tel" />
              <Sel label="Gender (Optional)" value={gender} onChange={setGender} options={["Female", "Male", "Non-binary", "Prefer not to say"]} />
              <Sel label="Age Range (Optional)" value={ageRange} onChange={setAgeRange} options={["Under 18", "18-25", "26-35", "36-45", "46+"]} />
              <Sel label="Blood Group (Optional)" value={bloodGroup} onChange={setBloodGroup} options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]} />
              <Sel label="Preferred Language" value={language} onChange={setLanguage} options={["Hindi", "English", "Tamil", "Telugu", "Bengali", "Marathi", "Kannada", "Malayalam"]} />
              <TArea label="Medical Notes / Allergies (Optional)" value={medicalNotes} onChange={setMedicalNotes} placeholder="Any conditions, allergies, or medications responders should know..." span2 />
            </div>
          </SectionCard>

          {/* B - Home Location */}
          <SectionCard icon={Home} title="Home Location" subtitle="Used to detect route deviations and notify you when you arrive safely" color={C.purple} index={1}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Home Address" value={homeAddress} onChange={setHomeAddress} placeholder="Start typing your address..." hint="This is kept private and never shown to responders unless needed" />
              {/* Map picker trigger */}
              <button
                onClick={() => setMapTarget("home")}
                style={{
                  borderRadius: 12, height: 110, display: "flex", alignItems: "center", justifyContent: "center",
                  background: homeAddress ? "rgba(180,127,255,0.06)" : "rgba(255,255,255,0.02)",
                  border: "1px dashed " + (homeAddress ? C.purple + "60" : C.purple + "30"),
                  cursor: "pointer", width: "100%", transition: "all 0.2s", flexDirection: "column", gap: 6,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(180,127,255,0.08)"; e.currentTarget.style.borderColor = C.purple + "80"; }}
                onMouseLeave={e => { e.currentTarget.style.background = homeAddress ? "rgba(180,127,255,0.06)" : "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = homeAddress ? C.purple + "60" : C.purple + "30"; }}
              >
                <Navigation style={{ width: 20, height: 20, color: C.purple }} />
                <p style={{ fontSize: 11, color: "rgba(240,244,255,0.45)", margin: 0 }}>
                  {homeAddress ? "📍 Location pinned — click to update" : "Tap to open interactive map picker"}
                </p>
                {homeAddress && (
                  <p style={{ fontSize: 10, color: "rgba(240,244,255,0.25)", margin: 0, maxWidth: 360, textAlign: "center", lineHeight: 1.4 }}>
                    {homeAddress.length > 70 ? homeAddress.slice(0, 70) + "…" : homeAddress}
                  </p>
                )}
              </button>
              <Sel label="Safe Radius" value={homeRadius} onChange={setHomeRadius} options={["50m", "100m", "150m", "200m", "300m", "500m"]} />
              {divLine(C.purple)}
              <Toggle label="Notify trusted contacts when I reach home" hint="Sends a silent arrived safely notification" value={homeNotify} onChange={setHomeNotify} color={C.purple} />
            </div>
          </SectionCard>

          {/* C - Work/College */}
          <SectionCard icon={Briefcase} title="College / Work Locations" subtitle="Helps detect if you are delayed or have not arrived as expected" color={C.amber} index={2}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {workLocations.map((loc, i) => (
                <div key={loc.id} style={{ borderRadius: 12, padding: 16, background: "rgba(255,184,0,0.04)", border: "1px solid rgba(255,184,0,0.14)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: C.amber }}>Location {i + 1}</span>
                    {workLocations.length > 1 && trashBtn(() => setWorkLocations(p => p.filter(w => w.id !== loc.id)))}
                  </div>
                  <div style={g2}>
                    <Field label="Label" value={loc.name} onChange={v => setWorkLocations(p => p.map(w => w.id === loc.id ? { ...w, name: v } : w))} placeholder="College / Office..." />
                    <div>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,244,255,0.3)", marginBottom: 6 }}>Address</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={loc.address}
                          onChange={e => setWorkLocations(p => p.map(w => w.id === loc.id ? { ...w, address: e.target.value } : w))}
                          placeholder="Full address"
                          style={{
                            flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 13, color: "#F0F4FF",
                            background: "rgba(255,255,255,0.04)", outline: "none", fontFamily: "inherit",
                            border: "1px solid rgba(255,255,255,0.08)"
                          }}
                          onFocus={e => e.target.style.borderColor = "rgba(255,184,0,0.4)"}
                          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                        />
                        <button onClick={() => setMapTarget(loc.id)}
                          title="Pick on map"
                          style={{
                            width: 38, height: 38, borderRadius: 10, flexShrink: 0, border: "1px solid rgba(255,184,0,0.3)",
                            background: "rgba(255,184,0,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,184,0,0.18)"; e.currentTarget.style.borderColor = "rgba(255,184,0,0.6)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,184,0,0.08)"; e.currentTarget.style.borderColor = "rgba(255,184,0,0.3)"; }}
                        ><Navigation style={{ width: 15, height: 15, color: C.amber }} /></button>
                      </div>
                    </div>
                    <Field label="Start Time" value={loc.startTime} type="time" onChange={v => setWorkLocations(p => p.map(w => w.id === loc.id ? { ...w, startTime: v } : w))} />
                    <Field label="End Time" value={loc.endTime} type="time" onChange={v => setWorkLocations(p => p.map(w => w.id === loc.id ? { ...w, endTime: v } : w))} />
                  </div>
                </div>
              ))}
              {addBtn("Add Another Location", C.amber, () => setWorkLocations(p => [...p, { id: "w" + Date.now(), name: "", address: "", startTime: "09:00", endTime: "17:00" }]))}
            </div>
          </SectionCard>

          {/* D - Regular Routes */}
          <SectionCard icon={Route} title="Regular Routes" subtitle="Your frequent travel paths for proactive risk scoring" color={C.cyan} index={3}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {routes.map((route, i) => (
                <div key={route.id} style={{ borderRadius: 12, padding: 16, background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.12)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: C.cyan }}>Route {i + 1}</span>
                      {route.isPrimary && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 5, background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.25)", color: C.cyan }}>Primary</span>}
                    </div>
                    {routes.length > 1 && trashBtn(() => setRoutes(p => p.filter(r => r.id !== route.id)))}
                  </div>
                  <div style={g3}>
                    <Field label="From" value={route.from} onChange={v => setRoutes(p => p.map(r => r.id === route.id ? { ...r, from: v } : r))} placeholder="Start point" />
                    <Field label="To" value={route.to} onChange={v => setRoutes(p => p.map(r => r.id === route.id ? { ...r, to: v } : r))} placeholder="End point" />
                    <Field label="Usual Time" value={route.time} onChange={v => setRoutes(p => p.map(r => r.id === route.id ? { ...r, time: v } : r))} placeholder="e.g. 08:30 AM" />
                  </div>
                </div>
              ))}
              {addBtn("Add Route", C.cyan, () => setRoutes(p => [...p, { id: "rt" + Date.now(), from: "", to: "", time: "", isPrimary: false }]))}
            </div>
          </SectionCard>

          {/* E - Trusted Contacts */}
          <SectionCard icon={Users} title="Trusted Contacts" subtitle="People notified when you trigger an alert - minimum 1 recommended" color={C.magenta} index={4}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {contacts.map((contact, i) => (
                <div key={contact.id} style={{ borderRadius: 12, padding: 18, background: "rgba(255,45,85,0.04)", border: "1px solid rgba(255,45,85,0.14)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Heart style={{ width: 13, height: 13, color: C.magenta }} />
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: C.magenta }}>Contact {i + 1}</span>
                    </div>
                    {contacts.length > 1 && trashBtn(() => removeContact(contact.id))}
                  </div>
                  <div style={g2}>
                    <Field label="Name" value={contact.name} onChange={v => updateContact(contact.id, "name", v)} placeholder="Full name" />
                    <Field label="Phone" value={contact.phone} onChange={v => updateContact(contact.id, "phone", v)} placeholder="+91 98765 43210" type="tel" />
                    <Sel label="Relationship" value={contact.relationship} onChange={v => updateContact(contact.id, "relationship", v)} options={["Father", "Mother", "Sister", "Brother", "Partner", "Friend", "Colleague", "Other"]} />
                    <Sel label="Priority" value={contact.priority} onChange={v => updateContact(contact.id, "priority", v as "Primary" | "Secondary")} options={["Primary", "Secondary"]} />
                    <Sel label="Notification Preference" value={contact.notificationPref} onChange={v => updateContact(contact.id, "notificationPref", v)} options={["SMS + App", "App Only", "Call + SMS", "Call Only"]} span2 />
                  </div>
                  {divLine(C.magenta)}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Toggle label="Can view live location during incident" value={contact.canViewLocation} onChange={v => updateContact(contact.id, "canViewLocation", v)} color={C.magenta} />
                    <Toggle label="Can receive evidence from vault" hint="Only if you explicitly consent during/after incident" value={contact.canReceiveEvidence} onChange={v => updateContact(contact.id, "canReceiveEvidence", v)} color={C.magenta} />
                  </div>
                </div>
              ))}
              {addBtn("Add Trusted Contact", C.magenta, addContact)}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 10, background: "rgba(255,45,85,0.05)", border: "1px solid rgba(255,45,85,0.14)" }}>
                <Lock style={{ width: 12, height: 12, marginTop: 1, color: C.magenta, flexShrink: 0 }} />
                <p style={{ fontSize: 11, color: "rgba(240,244,255,0.38)", lineHeight: 1.55 }}>Contact information is end-to-end encrypted. Only notified during active incidents unless you enable continuous sharing.</p>
              </div>
            </div>
          </SectionCard>

          {/* F - Preferred Responder */}
          <SectionCard icon={Shield} title="Preferred Responder" subtitle="Help us match you with the most appropriate responder" color={C.green} index={5}>
            <div style={g2}>
              <Sel label="Gender Preference" value={responderGender} onChange={setResponderGender} options={["Female preferred", "Any verified", "Campus security", "NGO partner", "Police only"]} />
              <Sel label="Preferred Language" value={responderLanguage} onChange={setResponderLanguage} options={["Hindi", "English", "Tamil", "Telugu", "Bengali", "Marathi", "Kannada", "Malayalam"]} />
              <TArea label="Special Instructions for Responders" value={responderInstructions} onChange={setResponderInstructions} color="rgba(0,255,136,0.4)" placeholder="Any specific needs or context for responding to your alerts..." span2 />
            </div>
          </SectionCard>

          {/* G - Emergency Preferences */}
          <SectionCard icon={Bell} title="Emergency Preferences" subtitle="Control exactly what happens when an incident is triggered" color={C.amber} index={6}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Toggle label="Auto-escalate to 112 if no responder accepts" value={autoEscalate} onChange={setAutoEscalate} color={C.amber} />
              <AnimatePresence>
                {autoEscalate && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                    <Sel label="Escalate after" value={escalateAfter} onChange={setEscalateAfter} options={["30 seconds", "60 seconds", "90 seconds", "120 seconds"]} />
                  </motion.div>
                )}
              </AnimatePresence>
              {divLine(C.amber)}
              <Toggle label="Share live location with trusted contacts automatically" value={shareLocationContacts} onChange={setShareLocationContacts} color={C.amber} />
              <Toggle label="Share live location with dispatched responders" value={shareLocationResponder} onChange={setShareLocationResponder} color={C.amber} />
              <Toggle label="Start audio/location evidence capture automatically" hint="No raw audio stored. Only heuristic metadata is captured." value={autoEvidence} onChange={setAutoEvidence} color={C.amber} />
              <Toggle label="Require I am Safe confirmation to close incident" hint="Prevents accidental resolution" value={confirmSafe} onChange={setConfirmSafe} color={C.amber} />
            </div>
          </SectionCard>

          {/* H - Silent Triggers */}
          <SectionCard icon={Fingerprint} title="Silent Trigger Settings" subtitle="Configure how you activate SilentShield without being noticed" color={C.purple} index={7}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 10, background: "rgba(179,127,255,0.06)", border: "1px solid rgba(179,127,255,0.15)" }}>
                <AlertTriangle style={{ width: 13, height: 13, marginTop: 1, color: C.amber, flexShrink: 0 }} />
                <p style={{ fontSize: 11, color: "rgba(240,244,255,0.45)", lineHeight: 1.55 }}>Only enable triggers you are comfortable with. Each trigger starts a cancel window before dispatching.</p>
              </div>
              <Toggle label="Long press SOS button" value={triggerLongPress} onChange={setTriggerLongPress} color={C.purple} />
              <Toggle label="Volume Up x3 (rapid)" value={triggerVolume} onChange={setTriggerVolume} color={C.purple} />
              <Toggle label="Double-tap power button (simulated)" value={triggerDoublePower} onChange={setTriggerDoublePower} color={C.purple} />
              <Toggle label="Shake gesture" hint="May trigger accidentally during exercise" value={triggerShake} onChange={setTriggerShake} color={C.purple} />
              {divLine(C.purple)}
              <div style={g2}>
                <Sel label="Sensitivity Level" value={sensitivity} onChange={setSensitivity} options={["Low", "Medium", "High"]} />
                <Sel label="Cancel Window" value={cancelWindow} onChange={setCancelWindow} options={["5 seconds", "8 seconds", "10 seconds", "15 seconds"]} />
              </div>
            </div>
          </SectionCard>

          {/* I - Safe Locations */}
          <SectionCard icon={MapPin} title="Safe Locations" subtitle="Places where you are automatically considered safe when you arrive" color={C.green} index={8}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {safeLocations.map((loc, i) => (
                <div key={loc.id} style={{ borderRadius: 12, padding: 16, background: "rgba(0,255,136,0.03)", border: "1px solid rgba(0,255,136,0.12)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: loc.isActive ? C.green : "rgba(255,255,255,0.15)", boxShadow: loc.isActive ? "0 0 6px " + C.green : "none", transition: "all 0.3s" }} />
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: C.green }}>Safe Location {i + 1}</span>
                    </div>
                    {safeLocations.length > 1 && trashBtn(() => setSafeLocations(p => p.filter(s => s.id !== loc.id)))}
                  </div>
                  <div style={g3}>
                    <Field label="Name" value={loc.name} onChange={v => setSafeLocations(p => p.map(s => s.id === loc.id ? { ...s, name: v } : s))} placeholder="Home / College..." />
                    <div>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,244,255,0.3)", marginBottom: 6 }}>Address</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={loc.address}
                          onChange={e => setSafeLocations(p => p.map(s => s.id === loc.id ? { ...s, address: e.target.value } : s))}
                          placeholder="Full address"
                          style={{
                            flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 13, color: "#F0F4FF",
                            background: "rgba(255,255,255,0.04)", outline: "none", fontFamily: "inherit",
                            border: "1px solid rgba(255,255,255,0.08)"
                          }}
                          onFocus={e => e.target.style.borderColor = "rgba(0,255,136,0.4)"}
                          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                        />
                        <button onClick={() => setMapTarget(loc.id)}
                          title="Pick on map"
                          style={{
                            width: 38, height: 38, borderRadius: 10, flexShrink: 0, border: "1px solid rgba(0,255,136,0.3)",
                            background: "rgba(0,255,136,0.07)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,255,136,0.16)"; e.currentTarget.style.borderColor = "rgba(0,255,136,0.6)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,255,136,0.07)"; e.currentTarget.style.borderColor = "rgba(0,255,136,0.3)"; }}
                        ><Navigation style={{ width: 15, height: 15, color: C.green }} /></button>
                      </div>
                    </div>
                    <Sel label="Safe Radius" value={loc.radius} onChange={v => setSafeLocations(p => p.map(s => s.id === loc.id ? { ...s, radius: v } : s))} options={["50m", "100m", "150m", "200m", "300m", "500m"]} />
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <Toggle label="Consider me safe when I enter this area" value={loc.isActive} onChange={v => setSafeLocations(p => p.map(s => s.id === loc.id ? { ...s, isActive: v } : s))} color={C.green} />
                  </div>
                </div>
              ))}
              {addBtn("Add Safe Location", C.green, () => setSafeLocations(p => [...p, { id: "sl" + Date.now(), name: "", address: "", radius: "200m", isActive: true }]))}
            </div>
          </SectionCard>



          {/* Save button */}

          <motion.button onClick={handleSave} whileHover={{ scale: 1.01, y: -2 }} whileTap={{ scale: 0.99 }} style={{
            width: "100%", padding: "15px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            borderRadius: 14, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
            border: "none", cursor: "pointer", position: "relative", overflow: "hidden",
            background: saved ? "linear-gradient(135deg,#00FF88,#00B86B)" : "linear-gradient(135deg,#00E5FF,#7B61FF)",
            color: "#030508", boxShadow: saved ? "0 6px 28px rgba(0,255,136,0.3)" : "0 6px 28px rgba(0,229,255,0.22)", transition: "box-shadow 0.3s"
          }}>
            {saved ? <CheckCircle2 style={{ width: 18, height: 18 }} /> : savingDb ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(3,5,8,0.2)", borderTopColor: "#030508" }} /> : <Save style={{ width: 18, height: 18 }} />}
            {saved ? "Profile Saved Successfully!" : savingDb ? "Saving Profile..." : "Save All Changes"}
          </motion.button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, paddingBottom: 8 }}>
            <Lock style={{ width: 11, height: 11, color: "rgba(240,244,255,0.2)" }} />
            <p style={{ fontSize: 11, color: "rgba(240,244,255,0.2)", textAlign: "center" }}>Your profile data is private. Shared only with your consent during active incidents.</p>
          </div>
        </div>
      </div>

      {/* ── Interactive Map Picker Modal ── */}
      <MapPicker
        open={mapTarget !== null}
        onClose={() => setMapTarget(null)}
        title={
          mapTarget === "home"
            ? "Pick Home Location"
            : mapTarget?.startsWith("w")
              ? "Pick Work / College Location"
              : "Pick Safe Location"
        }
        onSelect={(address) => {
          if (mapTarget === "home") {
            setHomeAddress(address);
          } else if (mapTarget?.startsWith("w")) {
            setWorkLocations(p => p.map(w => w.id === mapTarget ? { ...w, address } : w));
          } else if (mapTarget?.startsWith("sl")) {
            setSafeLocations(p => p.map(s => s.id === mapTarget ? { ...s, address } : s));
          }
          setMapTarget(null);
        }}
      />
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Shield,
  Radio,
  MapPin,
  Lock,
  Monitor,
  BarChart3,
  User,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  ArrowUpRight,
  Activity,
} from "lucide-react";

/* ── Types ──────────────────────────────────────── */
interface ProfileData {
  fullName: string;
  avatarUrl: string | null;
  phone: string;
  gender: string;
  ageRange: string;
  bloodGroup: string;
  medicalNotes: string;
  language: string;
  homeLocation: Record<string, unknown>;
  workLocations: unknown[];
  regularRoutes: unknown[];
  emergencyPreferences: Record<string, unknown>;
  silentTriggerSettings: Record<string, unknown>;
  preferredResponder: Record<string, unknown>;
  trustedContactsCount: number;
  incidentsThisMonth: number;
}

/* ── Profile Strength Calculator ─────────────────── */
function calcProfileStrength(p: ProfileData): number {
  const checks = [
    !!p.fullName,
    !!p.phone,
    !!p.gender,
    !!p.ageRange,
    !!p.bloodGroup,
    !!p.language,
    Object.keys(p.homeLocation || {}).length > 0,
    (p.workLocations || []).length > 0,
    (p.regularRoutes || []).length > 0,
    p.trustedContactsCount > 0,
    Object.keys(p.emergencyPreferences || {}).length > 0,
    Object.keys(p.silentTriggerSettings || {}).length > 0,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

/* ── Quick Actions ───────────────────────────────── */
const QUICK_ACTIONS = [
  { href: "/dashboard/safety",    icon: Radio,     label: "Silent SOS",     desc: "Trigger distress alert silently",        color: "#FF2D6B", urgent: true },
  { href: "/dashboard/profile",   icon: User,      label: "Safety Profile", desc: "Set up your protection preferences",     color: "#7B61FF" },
  { href: "/dashboard/command",   icon: Monitor,   label: "Command Center", desc: "View & manage active incidents",          color: "#FFBA08" },
  { href: "/dashboard/vault",     icon: Lock,      label: "Evidence Vault", desc: "View sealed incident evidence",           color: "#00FFA3" },
  { href: "/dashboard/saferoute", icon: MapPin,    label: "SafeRoute",      desc: "Check route safety before you travel",    color: "#00E5FF" },
  { href: "/dashboard/metrics",   icon: BarChart3, label: "Impact Metrics", desc: "See how RakshaNet is making a difference", color: "#7B61FF" },
];

const SYSTEM = [
  { name: "SilentShield Engine", status: "Operational",    color: "#00FFA3" },
  { name: "Responder Network",   status: "480 Active",     color: "#00FFA3" },
  { name: "Evidence Vault",      status: "Encrypted",      color: "#00FFA3" },
  { name: "112 Mock Adapter",    status: "Ready",          color: "#FFBA08" },
  { name: "SafeRoute AI",        status: "Online",         color: "#00FFA3" },
  { name: "Supabase Realtime",   status: "Pending Config", color: "#FFBA08" },
];

/* ── Skeleton ─────────────────────────────────────── */
function Skeleton({ w = "100%", h = 18, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "rgba(255,255,255,0.07)",
      animation: "pulse 1.6s ease-in-out infinite",
    }} />
  );
}

/* ── Stat Card ──────────────────────────────────── */
interface StatItem {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: React.ElementType;
  trend: string;
}

function StatCard({ stat, i, loading }: { stat: StatItem; i: number; loading: boolean }) {
  const Icon = stat.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
      style={{
        padding: "22px 20px",
        background: "var(--bg-card)",
        border: `1px solid var(--border-subtle)`,
        borderRadius: 18,
        backdropFilter: "blur(16px)",
        position: "relative", overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
      }}
      whileHover={{ y: -4, boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 24px ${stat.color}15`, borderColor: `${stat.color}30`, background: "var(--bg-card-hover)" }}
    >
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: "20%", right: "20%", height: 1,
        background: `linear-gradient(90deg, transparent, ${stat.color}50, transparent)`,
      }} />
      {/* Corner glow */}
      <div style={{
        position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%",
        background: `radial-gradient(circle, ${stat.color}10 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${stat.color}10`, border: `1px solid ${stat.color}25`,
        }}>
          <Icon style={{ width: 16, height: 16, color: stat.color }} />
        </div>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
          color: stat.color, padding: "3px 8px", borderRadius: 100,
          background: `${stat.color}10`, border: `1px solid ${stat.color}22`,
        }}>
          {stat.trend}
        </span>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton h={28} w="60%" />
          <Skeleton h={12} w="80%" />
          <Skeleton h={10} w="50%" />
        </div>
      ) : (
        <>
          <div style={{
            fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
            fontSize: "1.8rem", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em",
            color: stat.color, marginBottom: 6,
          }}>
            {stat.value}
          </div>
          <div style={{ fontSize: 12, color: "rgba(240,244,255,0.45)", marginBottom: 3 }}>{stat.label}</div>
          <div style={{ fontSize: 11, color: `${stat.color}70` }}>{stat.sub}</div>
        </>
      )}
    </motion.div>
  );
}

/* ── Quick Action Card ─────────────────────── */
function ActionCard({ action, i }: { action: typeof QUICK_ACTIONS[0]; i: number }) {
  const Icon = action.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: i * 0.055, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={action.href}
        style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "14px 16px", borderRadius: 14, textDecoration: "none",
          background: "var(--bg-card)",
          border: `1px solid ${action.urgent ? `${action.color}30` : "var(--border-subtle)"}`,
          backdropFilter: "blur(12px)",
          transition: "all 0.28s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: action.urgent ? `0 0 20px ${action.color}16` : "none",
          position: "relative", overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.background = `calc(${action.color}05 + var(--bg-card-hover))`;
          el.style.borderColor = `${action.color}30`;
          el.style.transform = "translateY(-2px)";
          el.style.boxShadow = `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${action.color}14`;
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.background = "var(--bg-card)";
          el.style.borderColor = action.urgent ? `${action.color}30` : "var(--border-subtle)";
          el.style.transform = "translateY(0)";
          el.style.boxShadow = action.urgent ? `0 0 20px ${action.color}16` : "none";
        }}
      >
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${action.color}14`,
          border: `1px solid ${action.color}28`,
          boxShadow: action.urgent ? `0 0 16px ${action.color}25` : "none",
        }}>
          <Icon
            style={{ width: 18, height: 18, color: action.color }}
            className={action.urgent ? "animate-pulse" : undefined}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#F0F4FF" }}>{action.label}</span>
            {action.urgent && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 100,
                background: "rgba(255,45,107,0.12)", border: "1px solid rgba(255,45,107,0.28)",
                color: "#FF2D6B", letterSpacing: "0.08em", textTransform: "uppercase",
              }}>Active</span>
            )}
          </div>
          <p style={{ fontSize: 11.5, color: "rgba(240,244,255,0.32)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {action.desc}
          </p>
        </div>
        <ArrowUpRight style={{ width: 14, height: 14, color: "rgba(240,244,255,0.2)", flexShrink: 0 }} />
      </Link>
    </motion.div>
  );
}

/* ── Dashboard Page ─────────────────────────── */
export default function DashboardHome() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Parallel fetches
        const [profileRes, contactsRes, incidentsRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("trusted_contacts").select("id").eq("user_id", user.id),
          supabase.from("incidents").select("id").eq("user_id", user.id)
            .gte("started_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        ]);

        const p = profileRes.data;
        const trustedContactsCount = contactsRes.data?.length ?? 0;
        const incidentsThisMonth = incidentsRes.data?.length ?? 0;

        setProfile({
          fullName: p?.full_name || "",
          avatarUrl: p?.avatar_url || null,
          phone: p?.phone || "",
          gender: p?.gender || "",
          ageRange: p?.age_range || "",
          bloodGroup: p?.blood_group || "",
          medicalNotes: p?.medical_notes || "",
          language: p?.preferred_language || "",
          homeLocation: p?.home_location || {},
          workLocations: p?.work_locations || [],
          regularRoutes: p?.regular_routes || [],
          emergencyPreferences: p?.emergency_preferences || {},
          silentTriggerSettings: p?.silent_trigger_settings || {},
          preferredResponder: p?.preferred_responder || {},
          trustedContactsCount,
          incidentsThisMonth,
        });
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const strength = profile ? calcProfileStrength(profile) : 0;
  const strengthColor = strength >= 80 ? "#00FFA3" : strength >= 50 ? "#FFBA08" : "#FF2D6B";
  const strengthLabel = strength >= 80 ? "Excellent" : strength >= 50 ? "Good progress" : "Needs work";

  const firstName = profile?.fullName?.split(" ")[0] || "";

  const STATS: StatItem[] = [
    {
      label: "Incidents This Month",
      value: String(profile?.incidentsThisMonth ?? 0),
      sub: profile?.incidentsThisMonth === 0 ? "All Clear" : "Stay vigilant",
      color: "#00FFA3", icon: Shield,
      trend: profile?.incidentsThisMonth === 0 ? "Safe" : "Active",
    },
    {
      label: "Avg Response Time",
      value: "3.2m",
      sub: "Target: <5min",
      color: "#00E5FF", icon: Clock,
      trend: "−12%",
    },
    {
      label: "Profile Strength",
      value: `${strength}%`,
      sub: strengthLabel,
      color: strengthColor, icon: User,
      trend: strength >= 80 ? "Complete" : "Improve",
    },
    {
      label: "Trusted Contacts",
      value: String(profile?.trustedContactsCount ?? 0),
      sub: (profile?.trustedContactsCount ?? 0) === 0 ? "Add at least 1" : "Network ready",
      color: (profile?.trustedContactsCount ?? 0) === 0 ? "#FF2D6B" : "#00FFA3",
      icon: (profile?.trustedContactsCount ?? 0) === 0 ? AlertTriangle : CheckCircle2,
      trend: (profile?.trustedContactsCount ?? 0) === 0 ? "Action needed" : "Ready",
    },
  ];

  const ACTIVITY = [
    { time: "Just now",               event: "Dashboard accessed",                                     icon: CheckCircle2, color: "#00FFA3" },
    ...(strength < 80
      ? [{ time: "Pending", event: "Complete your Safety Profile to improve protection", icon: AlertTriangle, color: "#FFBA08" }]
      : [{ time: "Profile",  event: "Your Safety Profile is comprehensive — great work!", icon: CheckCircle2, color: "#00FFA3" }]
    ),
    { time: "System ready",           event: "RakshaNet SilentShield is active and monitoring",        icon: Shield,       color: "#00E5FF" },
  ];

  /* ── Avatar initials ── */
  const initials = profile?.fullName
    ? profile.fullName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

      {/* ── Welcome Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "relative", borderRadius: 22, overflow: "hidden",
          padding: "32px 36px", marginBottom: 28,
          background: "var(--glass-2)",
          border: "1px solid var(--border-cyan)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(0,229,255,0.1)",
        }}
      >
        {/* Top cyan sweep line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, overflow: "hidden" }}>
          <div style={{ width: "30%", height: "100%", background: "linear-gradient(90deg, transparent, var(--cyan), transparent)", position: "absolute", animation: "top-glow-sweep 6s ease-in-out infinite" }} />
        </div>
        
        {/* Subtle grid background mask inside banner */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px)", backgroundSize: "32px 32px", opacity: 0.6, maskImage: "radial-gradient(ellipse 60% 80% at 20% 50%, black 20%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 60% 80% at 20% 50%, black 20%, transparent 100%)", pointerEvents: "none" }} />
        
        {/* Corner orb cyan glow */}
        <div style={{
          position: "absolute", right: -60, top: -60, width: 240, height: 240,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Avatar */}
              <div style={{
                width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: loading
                  ? "rgba(255,255,255,0.06)"
                  : profile?.avatarUrl
                    ? "transparent"
                    : "linear-gradient(135deg, rgba(0,229,255,0.2), rgba(123,97,255,0.15))",
                border: "1px solid rgba(0,229,255,0.22)",
                overflow: "hidden",
              }}>
                {loading ? (
                  <Skeleton w={56} h={56} r={16} />
                ) : profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{
                    fontSize: 18, fontWeight: 800, color: "#00E5FF",
                    fontFamily: "var(--font-display,'Outfit',sans-serif)", letterSpacing: "-0.02em",
                  }}>{initials}</span>
                )}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00FFA3", boxShadow: "0 0 8px #00FFA3", animation: "pulse-magenta 2.5s infinite" }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "#00FFA3", textTransform: "uppercase" }}>
                    System Active
                  </span>
                </div>
                <h1 style={{
                  fontFamily: "var(--font-display,'Outfit',sans-serif)",
                  fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 900, color: "#F0F4FF",
                  letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 6,
                }}>
                  {loading ? (
                    <Skeleton w={260} h={32} />
                  ) : firstName ? (
                    <>
                      Welcome back,{" "}
                      <span style={{ background: "linear-gradient(135deg,#00E5FF,#7B61FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        {firstName}
                      </span>
                    </>
                  ) : (
                    <>
                      Welcome to{" "}
                      <span style={{ background: "linear-gradient(135deg,#00E5FF,#7B61FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        SilentShield
                      </span>
                    </>
                  )}
                </h1>
                <div style={{ fontSize: 13, color: "rgba(240,244,255,0.45)", maxWidth: 480, lineHeight: 1.6 }}>
                  {loading ? (
                    <Skeleton w={340} h={14} />
                  ) : strength < 80 ? (
                    "Your privacy-first AI safety network is active. Complete your profile to maximize your protection coverage."
                  ) : (
                    "Your privacy-first AI safety network is fully configured and monitoring for your protection."
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/dashboard/safety" className="btn-danger" style={{ fontSize: 12, padding: "10px 20px" }}>
                <Radio style={{ width: 14, height: 14 }} />
                Open SOS Panel
              </Link>
              {!loading && strength < 80 && (
                <Link href="/dashboard/profile" className="btn-secondary" style={{ fontSize: 12, padding: "9px 20px" }}>
                  <User style={{ width: 14, height: 14 }} />
                  Complete Profile
                </Link>
              )}
            </div>
          </div>

          {/* Profile strength bar in banner */}
          {!loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, color: "rgba(240,244,255,0.35)", whiteSpace: "nowrap" }}>Profile strength</span>
              <div style={{ flex: 1, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.06)", maxWidth: 220 }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${strength}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                  style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${strengthColor}80, ${strengthColor})` }}
                />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: strengthColor, fontFamily: "monospace" }}>{strength}%</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Stats Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        {STATS.map((stat, i) => <StatCard key={stat.label} stat={stat} i={i} loading={loading} />)}
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,244,255,0.28)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Quick Actions
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
          {QUICK_ACTIONS.map((action, i) => <ActionCard key={action.href} action={action} i={i} />)}
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            padding: "22px 24px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 20, backdropFilter: "blur(16px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          <h2 style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,244,255,0.28)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 18 }}>
            Recent Activity
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {loading ? (
              [0, 1, 2].map((i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: "rgba(255,255,255,0.05)" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <Skeleton h={12} w="80%" />
                    <Skeleton h={10} w="40%" />
                  </div>
                </div>
              ))
            ) : (
              ACTIVITY.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: `${item.color}12`, border: `1px solid ${item.color}25`,
                    }}>
                      <Icon style={{ width: 13, height: 13, color: item.color }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 12.5, color: "rgba(240,244,255,0.62)", lineHeight: 1.4 }}>{item.event}</p>
                      <p style={{ fontSize: 11, color: "rgba(240,244,255,0.22)", marginTop: 3 }}>{item.time}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{
            padding: "22px 24px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 20, backdropFilter: "blur(16px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,244,255,0.28)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              System Status
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Activity style={{ width: 10, height: 10, color: "#00FFA3" }} />
              <span style={{ fontSize: 10, color: "#00FFA3", fontWeight: 600 }}>Live</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {SYSTEM.map((sys) => (
              <div key={sys.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "rgba(240,244,255,0.42)" }}>{sys.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: sys.color,
                    boxShadow: `0 0 5px ${sys.color}`,
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: sys.color }}>{sys.status}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Thesis box */}
          <div style={{
            marginTop: 18, padding: "12px 14px", borderRadius: 12,
            background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.1)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <Zap style={{ width: 12, height: 12, color: "#00E5FF", flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 11.5, color: "rgba(240,244,255,0.35)", lineHeight: 1.6 }}>
                <span style={{ background: "linear-gradient(135deg,#00E5FF,#7B61FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}>
                  112 gets the signal.{" "}
                </span>
                RakshaNet makes it smarter, quieter, safer and more actionable.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pulse keyframe for skeleton */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

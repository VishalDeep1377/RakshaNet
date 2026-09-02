"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  LayoutDashboard,
  User,
  Radio,
  Monitor,
  Lock,
  MapPin,
  BarChart3,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  Activity,
} from "lucide-react";
import ChatWidget from "@/app/components/ChatWidget";
import RakshaRiskWidget from "@/app/components/RakshaRiskWidget";
import CheckInModal from "@/app/components/CheckInModal";
import NotificationDropdown from "@/app/components/NotificationDropdown";
import ProfileDropdown from "@/app/components/ProfileDropdown";
import AmbientLayer from "@/app/components/AmbientLayer";
import { LocationProvider, useLocation } from "@/app/context/LocationContext";
import { RakshaScoreProvider, useRakshaScore } from "@/app/context/RakshaScoreContext";
import { NotificationProvider, useNotifications } from "@/app/context/NotificationContext";
import { useLanguage } from "@/app/context/LanguageContext";

// labelKey maps to messages/<lang>.json nav section
const NAV_ITEMS = [
  { href: "/dashboard",           icon: LayoutDashboard, labelKey: "dashboard",      color: "#00E5FF" },
  { href: "/dashboard/safety",    icon: Radio,           labelKey: "silent_sos",     color: "#FF2D6B" },
  { href: "/dashboard/profile",   icon: User,            labelKey: "safety_profile", color: "#7B61FF" },
  { href: "/dashboard/command",   icon: Monitor,         labelKey: "command_center", color: "#FFBA08" },
  { href: "/dashboard/vault",     icon: Lock,            labelKey: "evidence_vault", color: "#00FFA3" },
  { href: "/dashboard/saferoute", icon: MapPin,          labelKey: "safe_route",     color: "#00E5FF" },
  { href: "/dashboard/metrics",   icon: BarChart3,       labelKey: "impact_metrics", color: "#7B61FF" },
];

/* â”€â”€ Shared Sidebar UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function SidebarContent({
  pathname,
  onNavClick,
  onLogout,
}: {
  pathname: string;
  onNavClick?: () => void;
  onLogout: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div
      className="rn-sidebar"
      suppressHydrationWarning
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRight: "1px solid rgba(0,229,255,0.06)",
        background: "rgba(3,8,14,0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      {/* ── Logo ── */}
      <div style={{ padding: "20px 20px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Link
          href="/"
          suppressHydrationWarning
          style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}
        >
          <img
            src="/logo.png"
            alt="Safety for Women - RakshaNet"
            suppressHydrationWarning
            style={{ height: 44, width: "auto", objectFit: "contain", flexShrink: 0 }}
          />
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <span style={{ 
              fontSize: 10, 
              fontWeight: 900, 
              letterSpacing: "0.15em", 
              background: "linear-gradient(135deg, #FF2D6B, #FF5E5E)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textTransform: "uppercase",
              lineHeight: 1.2
            }}>
              PROTECTION.
            </span>
            <span style={{ 
              fontSize: 8.5, 
              fontWeight: 600, 
              letterSpacing: "0.08em", 
              color: "rgba(240,244,255,0.35)",
              textTransform: "uppercase",
              lineHeight: 1.2,
              marginTop: 2
            }}>
              NOT SURVEILLANCE.
            </span>
          </div>
        </Link>
      </div>

      {/* ── Nav label ── */}
      <div style={{ padding: "18px 20px 8px" }}>
        <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(240,244,255,0.2)" }}>
          Navigation
        </p>
      </div>

      {/* â”€â”€ Nav items â”€â”€ */}
      <nav style={{ flex: 1, padding: "0 10px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              suppressHydrationWarning
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 12, textDecoration: "none",
                position: "relative", overflow: "hidden",
                background: isActive ? `${item.color}12` : "transparent",
                border: `1px solid ${isActive ? `${item.color}28` : "transparent"}`,
                boxShadow: isActive ? `0 0 16px ${item.color}26` : "none",
                transition: "all 0.25s",
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <div style={{
                  position: "absolute", left: 0, top: "22%", bottom: "22%",
                  width: 3, borderRadius: 2,
                  background: item.color, boxShadow: `0 0 8px ${item.color}`,
                }} />
              )}

              {/* Icon box */}
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isActive ? `${item.color}18` : "rgba(255,255,255,0.04)",
                border: `1px solid ${isActive ? `${item.color}30` : "transparent"}`,
              }}>
                <Icon style={{ width: 13, height: 13, color: isActive ? item.color : "rgba(240,244,255,0.3)" }} />
              </div>

              <span style={{
                fontSize: 13, flex: 1,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#F0F4FF" : "rgba(240,244,255,0.35)",
              }}>
                {t("nav", item.labelKey)}
              </span>

              {isActive && (
                <ChevronRight style={{ width: 12, height: 12, color: item.color, flexShrink: 0 }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* â”€â”€ Bottom status + logout â”€â”€ */}
      <div style={{ padding: "10px 10px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{
          padding: "10px 12px", borderRadius: 12, marginBottom: 6,
          background: "rgba(0,255,163,0.06)", border: "1px solid rgba(0,255,163,0.14)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00FFA3", boxShadow: "0 0 8px #00FFA3", flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#00FFA3", letterSpacing: "0.03em" }}>
              Protected • Private Mode
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 10, color: "rgba(240,244,255,0.2)", marginTop: 3 }}>System monitoring active</p>
        </div>

        <button
          onClick={onLogout}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "9px 12px", borderRadius: 10,
            background: "transparent", border: "none", cursor: "pointer",
            color: "rgba(240,244,255,0.28)", fontSize: 13, fontWeight: 500,
            fontFamily: "inherit", transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.color = "rgba(240,244,255,0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(240,244,255,0.28)";
          }}
        >
          <LogOut style={{ width: 14, height: 14 }} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

/* ── Layout ────────────────────────────────────────────────── */
// Inner layout component that can access LocationContext
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { distressResult, location } = useLocation();
  const {
    showCheckIn, respondCheckIn, rakshaResult,
    l3ActionStatus, l4ActionStatus,
    trustedContactName, trustedContactPhone, pcrReference,
  } = useRakshaScore();
  const pathname = usePathname();

  const { addNotification } = useNotifications();
  const { t, setLanguage } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  // Peer alerts
  const [peerAlertCount, setPeerAlertCount] = useState(0);
  const [peerToast, setPeerToast] = useState<{ id: string; message: string; dist: string } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");

    // Apply correct values after mount – after SSR
    setIsDesktop(mq.matches);
    setSidebarOpen(mq.matches); // open on desktop, closed on mobile
    setMounted(true);

    const onChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      setSidebarOpen(e.matches);
    };
    mq.addEventListener("change", onChange);

    const tick = () =>
      setTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }));
    tick();
    const id = setInterval(tick, 10_000);

    // Fetch user profile for top bar
    const loadUser = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserEmail(user.email ?? null);
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, preferred_language")
          .eq("id", user.id)
          .single();
        if (p) {
          setUserName(p.full_name || null);
          setUserAvatar(p.avatar_url || null);
          // Sync saved language preference if different from localStorage
          if (p.preferred_language) {
            const ls = localStorage.getItem("rakshanet_language");
            if (!ls) setLanguage(p.preferred_language);
          }
        }
        // Store userId for realtime sub
        setUserId(user.id);
      } catch { /* no-op */ }
    };
    loadUser();

    return () => {
      mq.removeEventListener("change", onChange);
      clearInterval(id);
    };
  }, []);

  // ── Realtime peer alert subscription ──
  useEffect(() => {
    if (!userId) return;
    let channel: ReturnType<ReturnType<typeof import("@/lib/supabase/client")["createClient"]>["channel"]> | null = null;
    const setup = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      channel = supabase
        .channel("layout_peer_alerts")
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "peer_alerts",
          filter: `helper_id=eq.${userId}`,
        }, (payload) => {
          const alert = payload.new as { id: string; message: string; distance_km: number };
          const dist = alert.distance_km < 1
            ? `${Math.round(alert.distance_km * 1000)}m away`
            : `${alert.distance_km.toFixed(1)}km away`;
          setPeerAlertCount((n) => n + 1);
          setPeerToast({ id: alert.id, message: alert.message, dist });
          addNotification({
            type: "peer_alert",
            title: "Help Request Nearby",
            message: `${alert.message} — ${dist}`,
            icon: "🆘",
            actionLabel: "Respond",
            actionHref: "/dashboard/saferoute",
          });
        })
        .subscribe();
    };
    setup();
    return () => { channel && import("@/lib/supabase/client").then(({ createClient }) => createClient().removeChannel(channel!)); };
  }, [userId]);

  // ── Push in-app notification when SMS is sent to trusted contact (L3) ──
  useEffect(() => {
    if (l3ActionStatus !== "sent") return;
    addNotification({
      type: "trusted_alert",
      title: "Emergency SMS Sent",
      message: `Your trusted contact has been alerted with your name and live location.`,
      icon: "📱",
      sms_sent: true,
      contact_name: trustedContactName ?? undefined,
      contact_phone: trustedContactPhone ?? undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l3ActionStatus]);

  // ── Push in-app notification when all contacts are SMS'd (L4 Critical) ──
  useEffect(() => {
    if (l4ActionStatus !== "sent") return;
    addNotification({
      type: "trusted_alert",
      title: "CRITICAL — All Contacts Notified",
      message: `Emergency SMS sent to all your trusted contacts. PCR Unit dispatched. Ref: ${pcrReference ?? "—"}`,
      icon: "🆘",
      sms_sent: true,
      contact_name: "All Trusted Contacts",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l4ActionStatus]);

  const handleLogout = async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      await createClient().auth.signOut();
    } catch { /* no-op */ }
    window.location.href = "/";
  };

  const activeItem = NAV_ITEMS.find(
    (n) => pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href))
  );

  const SIDEBAR_W = 240;

  return (
    <div
      suppressHydrationWarning
      className="rn-page"
      style={{ minHeight: "100vh", display: "flex", overflow: "hidden" }}
    >
      {/* ── Ambient Layer ── */}
      <AmbientLayer />

      {/* ── Mobile overlay ── */}
      <AnimatePresence>
        {mounted && sidebarOpen && !isDesktop && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed", inset: 0, zIndex: 40,
              background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)",
            }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <motion.div
        suppressHydrationWarning
        animate={{ x: mounted ? (sidebarOpen ? 0 : -SIDEBAR_W) : -SIDEBAR_W }}
        initial={false}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        style={{
          position: "fixed", left: 0, top: 0, bottom: 0,
          width: SIDEBAR_W, zIndex: 50,
          willChange: "transform",
        }}
      >
        <SidebarContent
          pathname={pathname}
          onNavClick={isDesktop ? undefined : () => setSidebarOpen(false)}
          onLogout={handleLogout}
        />
      </motion.div>

      {/* ── Main content area ── */}
      <motion.div
        suppressHydrationWarning
        animate={{ marginLeft: mounted && sidebarOpen && isDesktop ? SIDEBAR_W : 0 }}
        initial={false}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", minWidth: 0 }}
      >
        {/* Top bar */}
        <header
          className="rn-topbar"
          style={{
            position: "sticky", top: 0, zIndex: 30,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 24px", height: 60,
            background: "rgba(5,9,15,0.92)",
            backdropFilter: "blur(24px) saturate(140%)",
            WebkitBackdropFilter: "blur(24px) saturate(140%)",
            borderBottom: "1px solid rgba(0,229,255,0.06)",
          }}
        >
          {/* Left */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Hamburger ── always visible */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.08)",
                background: sidebarOpen ? "rgba(0,229,255,0.08)" : "rgba(255,255,255,0.04)",
                color: sidebarOpen ? "#00E5FF" : "rgba(240,244,255,0.5)",
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,229,255,0.12)";
                e.currentTarget.style.color = "#00E5FF";
                e.currentTarget.style.borderColor = "rgba(0,229,255,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = sidebarOpen ? "rgba(0,229,255,0.08)" : "rgba(255,255,255,0.04)";
                e.currentTarget.style.color = sidebarOpen ? "#00E5FF" : "rgba(240,244,255,0.5)";
                e.currentTarget.style.borderColor = sidebarOpen ? "rgba(0,229,255,0.2)" : "rgba(255,255,255,0.08)";
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {sidebarOpen ? (
                  <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
                    <X style={{ width: 15, height: 15 }} />
                  </motion.span>
                ) : (
                  <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
                    <Menu style={{ width: 15, height: 15 }} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {activeItem && (
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                    background: activeItem.color, boxShadow: `0 0 8px ${activeItem.color}`,
                  }} />
                )}
                <h1 className="rn-text-1" style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>
                  {activeItem ? t("nav", activeItem.labelKey) : "Dashboard"}
                </h1>
              </div>
              <p className="rn-text-4" style={{ margin: 0, fontSize: 11, marginTop: 1 }}>
                RakshaNet SilentShield
              </p>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Clock ── only after mount to avoid hydration mismatch */}
            {mounted && time !== null && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 11px", borderRadius: 8,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, fontWeight: 600, color: "rgba(240,244,255,0.35)",
                letterSpacing: "0.05em",
              }}>
                <Activity style={{ width: 10, height: 10, color: "#00FFA3" }} />
                {time}
              </div>
            )}

            {/* Bell — Notification Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                id="notif-bell-btn"
                onClick={() => { setNotifOpen(v => !v); setPeerAlertCount(0); }}
                style={{
                  position: "relative", width: 36, height: 36, borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: peerAlertCount > 0 || notifOpen ? "1px solid rgba(255,45,107,0.35)" : "1px solid rgba(255,255,255,0.07)",
                  background: peerAlertCount > 0 || notifOpen ? "rgba(255,45,107,0.08)" : "rgba(255,255,255,0.04)",
                  color: peerAlertCount > 0 || notifOpen ? "#FF2D6B" : "rgba(240,244,255,0.4)", cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <Bell style={{ width: 15, height: 15 }} />
                {peerAlertCount > 0 ? (
                  <span style={{
                    position: "absolute", top: -4, right: -4,
                    minWidth: 16, height: 16, borderRadius: 8,
                    background: "#FF2D6B", border: "2px solid #030508",
                    fontSize: 9, fontWeight: 800, color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 3px",
                  }}>{peerAlertCount}</span>
                ) : (
                  <span style={{
                    position: "absolute", top: 9, right: 9, width: 6, height: 6,
                    borderRadius: "50%", background: "#FF2D6B", boxShadow: "0 0 6px #FF2D6B",
                  }} />
                )}
              </button>
              <NotificationDropdown open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>

            {/* Profile Avatar → opens Language + Theme + Sign Out dropdown */}
            <ProfileDropdown
              userName={userName}
              userAvatar={userAvatar}
              userEmail={userEmail}
              onLogout={handleLogout}
            />
          </div>
        </header>


        {/* Page */}
        <main className="rn-page" style={{ flex: 1, padding: "28px 24px" }}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </motion.div>

      {/* ── Global Chat Widget ── visible on all dashboard pages ── */}
      <ChatWidget
        distressScore={distressResult?.score ?? null}
        distressLevel={distressResult?.level ?? null}
        locationContext={distressResult?.locationContext ?? null}
        userLat={location?.lat ?? null}
        userLng={location?.lng ?? null}
        locationAddress={location?.address ?? null}
        routeDeviationScore={distressResult?.factors.routeDeviation ?? null}
        locationSafetyScore={distressResult?.factors.location ?? null}
        speedKmh={distressResult?.speedKmh ?? null}
        routeContext={distressResult?.routeContext ?? null}
      />

      {/* ── Raksha Risk Score Widget ── floating bottom-right ── */}
      <RakshaRiskWidget />

      {/* ── Level 2 Silent Check-In Modal ── */}
      <CheckInModal
        visible={showCheckIn}
        onRespond={respondCheckIn}
        rakshaScore={rakshaResult?.score ?? 0}
        autoEscalateSeconds={60}
      />

      {/* ── Peer Alert Toast ── */}
      <AnimatePresence>
        {peerToast && (
          <motion.div
            key={peerToast.id}
            initial={{ opacity: 0, y: -60, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -40, x: "-50%" }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            style={{
              position: "fixed", top: 76, left: "50%",
              zIndex: 8000, width: "min(440px, calc(100vw - 32px))",
              background: "rgba(6,3,3,0.97)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,45,107,0.4)",
              borderRadius: 16,
              boxShadow: "0 16px 60px rgba(0,0,0,0.7), 0 0 40px rgba(255,45,107,0.15)",
              padding: "14px 18px",
              display: "flex", alignItems: "flex-start", gap: 14,
            }}
          >
            {/* Pulsing alert icon */}
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,45,107,0.12)", border: "1px solid rgba(255,45,107,0.3)",
            }}>
              <Bell style={{ width: 16, height: 16, color: "#FF2D6B" }} className="animate-pulse" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#FF2D6B", marginBottom: 2 }}>
                🚨 Help Request Nearby — {peerToast.dist}
              </div>
              <p style={{ fontSize: 11.5, color: "rgba(240,244,255,0.55)", margin: 0, lineHeight: 1.4, marginBottom: 10 }}>
                {peerToast.message}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <a
                  href="/dashboard/saferoute"
                  onClick={() => setPeerToast(null)}
                  style={{
                    flex: 1, textAlign: "center", padding: "7px 0", borderRadius: 9,
                    fontSize: 11, fontWeight: 700, textDecoration: "none",
                    background: "linear-gradient(135deg,#FF2D55,#CC0033)", color: "white",
                  }}
                >View & Respond</a>
                <button
                  onClick={() => setPeerToast(null)}
                  style={{
                    flex: 1, padding: "7px 0", borderRadius: 9,
                    fontSize: 11, fontWeight: 600, border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)", color: "rgba(240,244,255,0.4)", cursor: "pointer",
                  }}
                >Dismiss</button>
              </div>
            </div>
            <button onClick={() => setPeerToast(null)} style={{ background: "none", border: "none", color: "rgba(240,244,255,0.3)", cursor: "pointer", padding: 4, flexShrink: 0 }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Outer Layout — provides LocationContext + RakshaScore to the whole dashboard ── */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocationProvider>
      <RakshaScoreProvider>
        <NotificationProvider>
          <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </NotificationProvider>
      </RakshaScoreProvider>
    </LocationProvider>
  );
}



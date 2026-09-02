"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, X, CheckCheck, Trash2, AlertTriangle, Shield,
  Navigation, Clock, Info, MessageSquare, Phone, CheckCircle2, XCircle,
} from "lucide-react";
import Link from "next/link";
import { useNotifications, type Notification, type NotifType } from "@/app/context/NotificationContext";

// ── Type metadata ─────────────────────────────────────────────
const TYPE_META: Record<NotifType, { color: string; label: string }> = {
  peer_alert:    { color: "#FF2D6B",  label: "Peer Alert" },
  sos:           { color: "#FF4444",  label: "SOS" },
  check_in:      { color: "#FFBA08",  label: "Check-In" },
  system:        { color: "#7B61FF",  label: "System" },
  safety_tip:    { color: "#00E5FF",  label: "Safety Tip" },
  trusted_alert: { color: "#FF2D55",  label: "SMS Alert" },
};

function typeIcon(type: NotifType, size = 13) {
  const color = TYPE_META[type].color;
  switch (type) {
    case "peer_alert":    return <AlertTriangle style={{ width: size, height: size, color }} />;
    case "sos":           return <Shield style={{ width: size, height: size, color }} />;
    case "check_in":      return <Clock style={{ width: size, height: size, color }} />;
    case "system":        return <Info style={{ width: size, height: size, color }} />;
    case "safety_tip":    return <Navigation style={{ width: size, height: size, color }} />;
    case "trusted_alert": return <MessageSquare style={{ width: size, height: size, color }} />;
  }
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── SMS Alert Card (special rich card for trusted_alert) ──────
function SMSAlertCard({
  n, onDismiss, onRead,
}: { n: Notification; onDismiss: () => void; onRead: () => void }) {
  const color = TYPE_META.trusted_alert.color;
  const smsSent = n.sms_sent !== false; // default true unless explicitly false

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -18 }}
      onClick={onRead}
      style={{
        position: "relative",
        borderRadius: 14,
        marginBottom: 8,
        overflow: "hidden",
        border: `1px solid ${n.read ? "rgba(255,45,85,0.12)" : "rgba(255,45,85,0.3)"}`,
        background: n.read
          ? "rgba(255,45,85,0.04)"
          : "linear-gradient(135deg, rgba(255,45,85,0.1) 0%, rgba(255,0,85,0.06) 100%)",
        cursor: "default",
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${color}, #FF0055)`, width: "100%" }} />

      {/* Unread dot */}
      {!n.read && (
        <span style={{
          position: "absolute", top: 14, left: 12,
          width: 6, height: 6, borderRadius: "50%",
          background: color, boxShadow: `0 0 8px ${color}`,
        }} />
      )}

      <div style={{ padding: "10px 12px 12px", paddingLeft: n.read ? 12 : 26 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 7, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,45,85,0.15)", border: "1px solid rgba(255,45,85,0.25)",
            }}>
              <MessageSquare style={{ width: 11, height: 11, color }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#F0F4FF" }}>{n.title}</span>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 100,
              background: "rgba(255,45,85,0.2)", color, letterSpacing: "0.06em",
            }}>
              SMS SENT
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "rgba(240,244,255,0.2)" }}
          >
            <X style={{ width: 11, height: 11 }} />
          </button>
        </div>

        {/* Contact info */}
        {n.contact_name && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 10px", borderRadius: 8, marginBottom: 8,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <Phone style={{ width: 10, height: 10, color: "rgba(240,244,255,0.4)", flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(240,244,255,0.7)" }}>
              {n.contact_name}
            </span>
            {n.contact_phone && (
              <span style={{ fontSize: 10, color: "rgba(240,244,255,0.3)", fontFamily: "monospace" }}>
                · {n.contact_phone}
              </span>
            )}
          </div>
        )}

        {/* Message preview */}
        <p style={{ fontSize: 11, color: "rgba(240,244,255,0.4)", margin: "0 0 8px", lineHeight: 1.5 }}>
          {n.message}
        </p>

        {/* Footer: SMS status + time */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {smsSent
              ? <CheckCircle2 style={{ width: 11, height: 11, color: "#00D084" }} />
              : <XCircle style={{ width: 11, height: 11, color: "#FF4444" }} />
            }
            <span style={{ fontSize: 10, fontWeight: 700, color: smsSent ? "#00D084" : "#FF4444" }}>
              {smsSent ? "SMS Delivered" : "SMS Failed — retry via WhatsApp"}
            </span>
          </div>
          <span style={{ fontSize: 10, color: "rgba(240,244,255,0.2)" }}>
            {timeAgo(n.createdAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Generic notification item ─────────────────────────────────
function NotifItem({ n, onDismiss, onRead }: { n: Notification; onDismiss: () => void; onRead: () => void }) {
  // Route trusted_alert to dedicated card
  if (n.type === "trusted_alert") {
    return <SMSAlertCard n={n} onDismiss={onDismiss} onRead={onRead} />;
  }

  const meta = TYPE_META[n.type];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -18 }}
      onClick={onRead}
      style={{
        position: "relative",
        padding: "12px 14px",
        borderRadius: 12,
        marginBottom: 6,
        background: n.read ? "rgba(255,255,255,0.02)" : `${meta.color}09`,
        border: `1px solid ${n.read ? "rgba(255,255,255,0.05)" : `${meta.color}22`}`,
        cursor: "default",
        transition: "all 0.2s",
      }}
    >
      {/* Unread indicator */}
      {!n.read && (
        <span style={{
          position: "absolute", top: 14, left: 14,
          width: 6, height: 6, borderRadius: "50%",
          background: meta.color, boxShadow: `0 0 6px ${meta.color}`,
        }} />
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingLeft: n.read ? 0 : 14 }}>
        {/* Icon */}
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${meta.color}14`, border: `1px solid ${meta.color}22`,
        }}>
          {n.icon
            ? <span style={{ fontSize: 14 }}>{n.icon}</span>
            : typeIcon(n.type)
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#F0F4FF" }}>{n.title}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 100,
              background: `${meta.color}18`, color: meta.color,
              letterSpacing: "0.06em", flexShrink: 0,
            }}>
              {meta.label}
            </span>
          </div>
          <p style={{ fontSize: 11, color: "rgba(240,244,255,0.45)", margin: 0, lineHeight: 1.5, marginBottom: 6 }}>
            {n.message}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 10, color: "rgba(240,244,255,0.25)" }}>
              {timeAgo(n.createdAt)}
            </span>
            {n.actionLabel && n.actionHref && (
              <Link href={n.actionHref} style={{
                fontSize: 10, fontWeight: 700, color: meta.color, textDecoration: "none",
                padding: "2px 8px", borderRadius: 6,
                background: `${meta.color}14`, border: `1px solid ${meta.color}22`,
              }}>
                {n.actionLabel} →
              </Link>
            )}
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: 2, flexShrink: 0, color: "rgba(240,244,255,0.2)", marginTop: -2,
          }}
        >
          <X style={{ width: 12, height: 12 }} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Dropdown ─────────────────────────────────────────────
interface NotificationDropdownProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({ open, onClose }: NotificationDropdownProps) {
  const { notifications, unreadCount, markAllRead, markRead, dismiss, clearAll } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Separate SMS alerts from regular ones for display order
  const smsAlerts = notifications.filter(n => n.type === "trusted_alert");
  const others = notifications.filter(n => n.type !== "trusted_alert");
  const ordered = [...smsAlerts, ...others];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: 380,
            maxHeight: 560,
            borderRadius: 18,
            background: "rgba(7,12,24,0.98)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 28px 72px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9500,
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bell style={{ width: 14, height: 14, color: "#7B61FF" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#F0F4FF" }}>Notifications</span>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  style={{
                    fontSize: 10, fontWeight: 800, padding: "1px 7px",
                    borderRadius: 100, background: "#FF2D6B", color: "white",
                  }}
                >
                  {unreadCount}
                </motion.span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  title="Mark all read"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(240,244,255,0.35)", display: "flex", alignItems: "center",
                    gap: 4, fontSize: 11, fontWeight: 600,
                  }}
                >
                  <CheckCheck style={{ width: 13, height: 13 }} /> Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  title="Clear all"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(240,244,255,0.2)", display: "flex", alignItems: "center",
                  }}
                >
                  <Trash2 style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>
          </div>

          {/* SMS alerts section header (if any) */}
          {smsAlerts.length > 0 && (
            <div style={{
              padding: "8px 14px 4px",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <div style={{ height: 1, flex: 1, background: "rgba(255,45,85,0.2)" }} />
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "rgba(255,45,85,0.6)",
              }}>
                🆘 Emergency Alerts
              </span>
              <div style={{ height: 1, flex: 1, background: "rgba(255,45,85,0.2)" }} />
            </div>
          )}

          {/* Notifications list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px 6px" }}>
            <AnimatePresence mode="popLayout">
              {ordered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ textAlign: "center", padding: "40px 20px" }}
                >
                  <Bell style={{ width: 28, height: 28, color: "rgba(240,244,255,0.1)", margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 13, color: "rgba(240,244,255,0.3)", margin: 0 }}>No notifications yet</p>
                  <p style={{ fontSize: 11, color: "rgba(240,244,255,0.18)", marginTop: 4 }}>
                    Alerts from your safety network will appear here.
                  </p>
                </motion.div>
              ) : (
                ordered.map(n => (
                  <NotifItem
                    key={n.id}
                    n={n}
                    onDismiss={() => dismiss(n.id)}
                    onRead={() => markRead(n.id)}
                  />
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: "8px 16px 12px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 10, color: "rgba(240,244,255,0.2)" }}>
                {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
              </span>
              <span style={{ fontSize: 10, color: "rgba(240,244,255,0.15)" }}>
                Auto-cleared after 7 days
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

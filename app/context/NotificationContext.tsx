"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

export type NotifType = "peer_alert" | "sos" | "check_in" | "system" | "safety_tip" | "trusted_alert";

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  actionLabel?: string;
  actionHref?: string;
  icon?: string;         // emoji
  sms_sent?: boolean;   // true = SMS delivered, false = failed
  contact_phone?: string; // phone number shown in card
  contact_name?: string;  // contact name
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "createdAt" | "read">) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationProvider");
  return ctx;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const STORAGE_KEY = "rakshanet_notifs";

function loadStored(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Notification & { createdAt: string }>;
    return parsed.map(n => ({ ...n, createdAt: new Date(n.createdAt) }));
  } catch {
    return [];
  }
}

function saveStored(notifs: Notification[]) {
  try {
    // Keep only last 50
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, 50)));
  } catch { /* no-op */ }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const bootstrapped = useRef(false);

  // Load persisted on mount
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    const stored = loadStored();
    setNotifications(stored);

    // Seed a welcome notification if first time
    if (stored.length === 0) {
      const welcome: Notification = {
        id: genId(),
        type: "system",
        title: "Welcome to RakshaNet",
        message: "Your safety dashboard is active. Complete your profile to enable all features.",
        createdAt: new Date(),
        read: false,
        actionLabel: "Complete Profile",
        actionHref: "/dashboard/profile",
        icon: "🛡️",
      };
      setNotifications([welcome]);
      saveStored([welcome]);
    }
  }, []);

  const addNotification = useCallback((n: Omit<Notification, "id" | "createdAt" | "read">) => {
    const newN: Notification = { ...n, id: genId(), createdAt: new Date(), read: false };
    setNotifications(prev => {
      const updated = [newN, ...prev].slice(0, 50);
      saveStored(updated);
      return updated;
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      saveStored(updated);
      return updated;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveStored(updated);
      return updated;
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      saveStored(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    saveStored([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead, markRead, dismiss, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

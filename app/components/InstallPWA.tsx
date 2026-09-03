"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X, CheckCircle } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallState = "idle" | "available" | "installing" | "installed";

export default function InstallPWA() {
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[RakshaNet PWA] Service worker registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("[RakshaNet PWA] SW registration failed:", err);
        });
    }

    // Detect iOS (Safari doesn't support beforeinstallprompt)
    const ua = navigator.userAgent;
    const isiOS =
      /iPad|iPhone|iPod/.test(ua) && !(window as unknown as {MSStream?: unknown}).MSStream;
    setIsIOS(isiOS);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstallState("installed");
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallState("available");
      // Show subtle banner after 3 seconds
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSHint(true);
      return;
    }

    if (!deferredPrompt) return;
    setInstallState("installing");
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallState("installed");
      setShowBanner(false);
    } else {
      setInstallState("available");
    }
    setDeferredPrompt(null);
  };

  // ─── Dismiss banner ───────────────────────────────────────────────────────
  const dismissBanner = () => setShowBanner(false);

  /* ─── Nothing to show ───────────────────────────────────────────────────── */
  if (installState === "idle" && !isIOS) return null;

  return (
    <>
      {/* ─── Floating install banner (bottom) ─────────────────────────────── */}
      {showBanner && installState === "available" && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            gap: 16,
            background:
              "linear-gradient(135deg, rgba(15,0,5,0.97), rgba(30,0,10,0.97))",
            border: "1px solid rgba(255,0,51,0.35)",
            borderRadius: 18,
            padding: "14px 20px",
            boxShadow:
              "0 8px 40px rgba(255,0,51,0.25), 0 2px 10px rgba(0,0,0,0.8)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            animation: "slideUpFade 0.5s ease both",
            maxWidth: "calc(100vw - 48px)",
            width: "max-content",
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "linear-gradient(135deg, #FF0033, #CC0022)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Smartphone size={20} color="white" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                color: "white",
                whiteSpace: "nowrap",
              }}
            >
              Install RakshaNet
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "rgba(255,210,215,0.65)",
                whiteSpace: "nowrap",
              }}
            >
              Add to home screen for instant access
            </p>
          </div>

          <button
            onClick={handleInstallClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "linear-gradient(135deg, #FF0033, #CC0022)",
              border: "none",
              borderRadius: 10,
              padding: "9px 16px",
              color: "white",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
              cursor: "pointer",
              flexShrink: 0,
              transition: "opacity 0.2s",
            }}
          >
            <Download size={14} />
            Install
          </button>

          <button
            onClick={dismissBanner}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.4)",
              display: "flex",
              alignItems: "center",
              padding: 4,
              flexShrink: 0,
              transition: "color 0.2s",
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ─── iOS Share Hint Modal ──────────────────────────────────────────── */}
      {showIOSHint && (
        <div
          onClick={() => setShowIOSHint(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 20000,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "0 16px 40px",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(135deg, rgba(20,0,8,0.98), rgba(40,0,15,0.98))",
              border: "1px solid rgba(255,0,51,0.3)",
              borderRadius: 24,
              padding: "32px 28px",
              maxWidth: 380,
              width: "100%",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>📱</div>
            <h3
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                fontSize: 22,
                color: "white",
                margin: "0 0 12px",
              }}
            >
              Add to Home Screen
            </h3>
            <p style={{ fontSize: 14, color: "rgba(255,210,215,0.7)", lineHeight: 1.6, marginBottom: 24 }}>
              To install RakshaNet on iOS, tap the{" "}
              <strong style={{ color: "#FF0033" }}>Share</strong> button (
              <span style={{ fontSize: 18 }}>⎋</span>) in Safari, then select{" "}
              <strong style={{ color: "#FF0033" }}>Add to Home Screen</strong>.
            </p>
            <button
              onClick={() => setShowIOSHint(false)}
              style={{
                background: "linear-gradient(135deg, #FF0033, #CC0022)",
                border: "none",
                borderRadius: 12,
                padding: "12px 32px",
                color: "white",
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "'Outfit', sans-serif",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ─── Installed badge (subtle) ──────────────────────────────────────── */}
      {installState === "installed" && !showBanner && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9000,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(15,0,5,0.92)",
            border: "1px solid rgba(50,200,100,0.3)",
            borderRadius: 100,
            padding: "8px 16px",
            fontSize: 12,
            color: "rgba(80,220,120,0.9)",
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 600,
            animation: "fadeOut 1s ease 3s both",
          }}
        >
          <CheckCircle size={14} />
          App Installed!
        </div>
      )}

      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0);    }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>
    </>
  );
}

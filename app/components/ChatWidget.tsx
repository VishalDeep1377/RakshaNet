"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles, Shield, AlertTriangle, ChevronRight } from "lucide-react";
import type { DistressLevel } from "@/lib/distress/engine";
import { LEVEL_META } from "@/lib/distress/engine";

/* ── Types ─────────────────────────────────── */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface UserContext {
  authenticated: boolean;
  firstName: string | null;
  activeSafeZones: number;
  trustedContactCount: number;
  recentIncidentCount: number;
  baseScore: number;
  baseLevel: DistressLevel;
  levelMeta: typeof LEVEL_META[DistressLevel];
}

interface ChatWidgetProps {
  /** Live distress score from the safety monitor (passed in by parent) */
  distressScore?: number | null;
  distressLevel?: DistressLevel | null;
  locationContext?: string | null;
  // Live GPS context
  userLat?: number | null;
  userLng?: number | null;
  locationAddress?: string | null;
  routeDeviationScore?: number | null;
  locationSafetyScore?: number | null;
  speedKmh?: number | null;
  routeContext?: string | null;
}

/* ── Quick chips per context ───────────────── */
const PUBLIC_CHIPS = [
  "What is RakshaNet?",
  "How does SilentShield work?",
  "How can I get involved?",
  "Emergency: Call 112",
];

function getContextChips(ctx: UserContext): string[] {
  const chips: string[] = [];
  if (ctx.trustedContactCount === 0) chips.push("How do I add trusted contacts?");
  if (ctx.activeSafeZones === 0)     chips.push("How do I add a safe zone?");
  if (ctx.recentIncidentCount > 0)   chips.push("Review my recent incidents");
  chips.push("What's my distress score?");
  chips.push("How do I share my route?");
  chips.push("Explain helper mode");
  return chips.slice(0, 4);
}

/* ── Distress level badge ──────────────────── */
function ScoreBadge({ level, score }: { level: DistressLevel; score: number }) {
  const meta = LEVEL_META[level];
  const isAlert = level === "CAUTION" || level === "DANGER" || level === "CRITICAL";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "5px 10px", borderRadius: 8,
      background: meta.bg, border: `1px solid ${meta.border}`,
    }}>
      {isAlert
        ? <AlertTriangle style={{ width: 11, height: 11, color: meta.color, flexShrink: 0 }} />
        : <Shield style={{ width: 11, height: 11, color: meta.color, flexShrink: 0 }} />
      }
      <span style={{ fontSize: 10.5, fontWeight: 700, color: meta.color, letterSpacing: "0.05em" }}>
        {level} · {score}
      </span>
    </div>
  );
}

/* ── Main Widget ─────────────────────────────── */
export default function ChatWidget({
  distressScore, distressLevel, locationContext,
  userLat, userLng, locationAddress,
  routeDeviationScore, locationSafetyScore, speedKmh, routeContext,
}: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ctx, setCtx] = useState<UserContext | null>(null);
  const [ctxLoading, setCtxLoading] = useState(true);
  const [showChips, setShowChips] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Load user context on mount ── */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/chat/context");
        const data: UserContext = await res.json();
        setCtx(data);

        // Build personalised welcome message
        if (data.authenticated && data.firstName) {
          const meta = LEVEL_META[data.baseLevel];
          const welcome = `Hi ${data.firstName}! 👋 I'm your personal Safety Companion.

Your current safety level is **${data.baseLevel}** (score: ${data.baseScore}/100). ${meta.description}

You have **${data.activeSafeZones}** active safe zone${data.activeSafeZones !== 1 ? "s" : ""} and **${data.trustedContactCount}** trusted contact${data.trustedContactCount !== 1 ? "s" : ""} set up.

How can I help you stay safe today?`;
          setMessages([{ id: "welcome", role: "assistant", content: welcome }]);
        } else {
          setMessages([{
            id: "welcome",
            role: "assistant",
            content: "Hi! I'm your Safety Assistant powered by AI. Ask me anything about RakshaNet, our initiatives, women's safety resources, or how to get involved.\n\nFor emergencies, always call **112** immediately.",
          }]);
        }
      } catch {
        setMessages([{
          id: "welcome",
          role: "assistant",
          content: "Hi! I'm your Safety Assistant. For emergencies, call **112** immediately.",
        }]);
        setCtx(null);
      } finally {
        setCtxLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* ── Send message ── */
  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    // Hide chips once user starts talking
    setShowChips(false);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].slice(-12).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          distressScore: distressScore ?? null,
          distressLevel: distressLevel ?? null,
          locationContext: locationContext ?? null,
          userLat: userLat ?? null,
          userLng: userLng ?? null,
          locationAddress: locationAddress ?? null,
          routeDeviationScore: routeDeviationScore ?? null,
          locationSafetyScore: locationSafetyScore ?? null,
          speedKmh: speedKmh ?? null,
          routeContext: routeContext ?? null,
        }),
      });

      const data = await res.json();
      const reply = data.reply || data.error || "I'm having trouble responding. Please try again.";

      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + "_a", role: "assistant", content: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "_err",
          role: "assistant",
          content: "Network error. Please check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, distressScore, distressLevel, locationContext,
      userLat, userLng, locationAddress, routeDeviationScore, locationSafetyScore, speedKmh, routeContext]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const chips = ctx?.authenticated ? getContextChips(ctx) : PUBLIC_CHIPS;
  const liveScore = distressScore ?? ctx?.baseScore ?? 0;
  const liveLevel = distressLevel ?? ctx?.baseLevel ?? "SAFE";

  /* ── Render markdown-lite (bold **text**, newlines) ── */
  function renderContent(text: string) {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} style={{ margin: i === 0 ? 0 : "6px 0 0" }}>
          {parts.map((part, j) =>
            j % 2 === 1
              ? <strong key={j} style={{ color: "white", fontWeight: 700 }}>{part}</strong>
              : part
          )}
        </p>
      );
    });
  }

  return (
    <>
      {/* ── Chat Window ───────────────────────── */}
      {open && (
        <div style={{
          position: "fixed", bottom: 90, right: 24,
          width: 390, maxWidth: "calc(100vw - 48px)",
          height: 580, maxHeight: "calc(100vh - 120px)",
          background: "rgba(5, 2, 8, 0.97)",
          backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(255,0,51,0.18)",
          borderRadius: 22,
          boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(255,0,51,0.06)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          zIndex: 9000,
          animation: "chatSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 18px",
            background: "linear-gradient(135deg, rgba(255,0,51,0.12), rgba(120,0,25,0.06))",
            borderBottom: "1px solid rgba(255,0,51,0.12)",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "linear-gradient(135deg, #FF0033, #8B0020)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 18px rgba(255,0,51,0.35)", flexShrink: 0,
            }}>
              <Sparkles size={16} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>
                {ctx?.firstName ? `${ctx.firstName}'s Safety AI` : "Safety Assistant"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Online · Powered by Gemini AI
                </span>
              </div>
            </div>
            {/* Live score badge */}
            {ctx?.authenticated && (
              <ScoreBadge level={liveLevel} score={liveScore} />
            )}
            <button onClick={() => setOpen(false)} style={{
              background: "rgba(255,255,255,0.06)", border: "none",
              color: "rgba(255,255,255,0.5)", cursor: "pointer",
              borderRadius: 8, padding: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "14px 16px",
            display: "flex", flexDirection: "column", gap: 10,
            scrollbarWidth: "thin", scrollbarColor: "rgba(255,0,51,0.15) transparent",
          }}>
            {/* Loading skeleton for first load */}
            {ctxLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 4 }}>
                {[100, 80, 60].map((w, i) => (
                  <div key={i} style={{ height: 12, width: `${w}%`, borderRadius: 6, background: "rgba(255,255,255,0.06)", animation: "pulse 1.5s infinite" }} />
                ))}
              </div>
            ) : messages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "84%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, #FF0033, #CC0022)"
                    : "rgba(255,255,255,0.055)",
                  border: msg.role === "user" ? "none" : "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.88)",
                  fontSize: 13, lineHeight: 1.55,
                  boxShadow: msg.role === "user" ? "0 4px 16px rgba(255,0,51,0.22)" : "none",
                }}>
                  {renderContent(msg.content)}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  padding: "10px 14px", borderRadius: "18px 18px 18px 4px",
                  background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", gap: 3,
                }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{
                      width: 5, height: 5, borderRadius: "50%", background: "#FF0033",
                      animation: `dotBounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Quick chips */}
            {showChips && !loading && messages.length <= 2 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 6 }}>
                {chips.map((chip) => (
                  <button key={chip} onClick={() => sendMessage(chip)} style={{
                    padding: "6px 12px", borderRadius: 20, fontSize: 11.5, fontWeight: 600,
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.6)", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}>
                    <ChevronRight size={10} />
                    {chip}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.25)" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,0,51,0.22)",
              borderRadius: 14, padding: "7px 7px 7px 14px",
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={ctx?.firstName ? `Ask me anything, ${ctx.firstName}…` : "Ask anything…"}
                disabled={loading}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: "white", fontSize: 13, fontFamily: "inherit",
                }}
              />
              <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{
                width: 34, height: 34, borderRadius: 9, border: "none",
                background: input.trim() && !loading ? "linear-gradient(135deg,#FF0033,#CC0022)" : "rgba(255,255,255,0.07)",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                boxShadow: input.trim() && !loading ? "0 4px 14px rgba(255,0,51,0.28)" : "none",
                transition: "all 0.2s",
              }}>
                {loading
                  ? <Loader2 size={13} color="rgba(255,255,255,0.4)" style={{ animation: "spin 1s linear infinite" }} />
                  : <Send size={13} color={input.trim() ? "white" : "rgba(255,255,255,0.25)"} />
                }
              </button>
            </div>
            <p style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.15)", marginTop: 6 }}>
              {ctx?.authenticated ? "Responses based on your real RakshaNet profile" : "For emergencies, always call 112"}
            </p>
          </div>
        </div>
      )}

      {/* ── Toggle Button ────────────────────── */}
      <button
        id="chat-toggle-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open safety AI"}
        style={{
          position: "fixed", bottom: 28, right: 28,
          width: 54, height: 54, borderRadius: "50%",
          background: open ? "rgba(60,0,10,0.9)" : "linear-gradient(135deg,#FF0033,#8B0020)",
          border: open ? "2px solid rgba(255,0,51,0.3)" : "none",
          boxShadow: open
            ? "0 4px 24px rgba(0,0,0,0.5)"
            : "0 8px 32px rgba(255,0,51,0.5), 0 0 60px rgba(255,0,51,0.15)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9001, transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          transform: open ? "scale(0.95)" : "scale(1)",
        }}
      >
        {open ? <X size={20} color="rgba(255,100,80,0.9)" /> : <MessageCircle size={20} color="white" />}
        {/* Score ring on button */}
        {!open && ctx?.authenticated && (
          <div style={{
            position: "absolute", inset: -3, borderRadius: "50%",
            border: `2px solid ${LEVEL_META[liveLevel].color}60`,
            animation: liveLevel !== "SAFE" ? "ringPulse 2s ease-in-out infinite" : "none",
          }} />
        )}
        {!open && (
          <span style={{
            position: "absolute", top: 0, right: 0,
            width: 14, height: 14, borderRadius: "50%",
            background: LEVEL_META[liveLevel].color,
            border: "2px solid #050208",
            boxShadow: `0 0 6px ${LEVEL_META[liveLevel].color}`,
          }} />
        )}
      </button>

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dotBounce {
          0%,80%,100% { transform: translateY(0); opacity: 0.5; }
          40%          { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes ringPulse {
          0%,100% { transform: scale(1); opacity: 0.6; }
          50%      { transform: scale(1.15); opacity: 0.2; }
        }
      `}</style>
    </>
  );
}

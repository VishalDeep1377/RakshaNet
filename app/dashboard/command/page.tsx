"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Monitor, Shield, CheckCircle2, Zap, Radio, RefreshCw, Send, Crosshair } from "lucide-react";
import CommandMap, { CommandResponder } from "./CommandMap";

type IncidentStatus = "Triggered" | "Dispatched" | "Live" | "Resolved" | "Sealed";

interface Incident {
  id: string; user_id: string; status: IncidentStatus; risk_score: number;
  location: { address: string; lat: number; lng: number };
  started_at: string; resolved_at: string | null;
  metadata: { trigger_method?: string };
}

const C = { red: "#FF2D55", cyan: "#00E5FF", green: "#00FF88", yellow: "#FFBA08", purple: "#B47FFF" };
const card: React.CSSProperties = { background: "rgba(6,10,18,0.85)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" };

const STATUS_META: Record<IncidentStatus, { color: string; label: string }> = {
  Triggered: { color: C.yellow, label: "Triggered" },
  Dispatched: { color: C.cyan, label: "Dispatched" },
  Live: { color: C.red, label: "Live" },
  Resolved: { color: C.green, label: "Resolved" },
  Sealed: { color: "rgba(0,255,136,0.5)", label: "Sealed" },
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ── AI Engine: Dynamic Responder Generation ──────────────────
// In a real app, this would hit an AI backend or spatial database.
// Here we simulate an advanced spatial query that finds units nearby.
function generateAIResponders(lat: number, lng: number): CommandResponder[] {
  // Generate slightly randomized positions around the user's lat/lng
  const randomize = (val: number, offset: number) => val + (Math.random() - 0.5) * offset;
  
  return [
    {
      id: "r-pol-1", name: "PCR Unit (Rapid)", type: "Police", status: "Available" as const,
      lat: randomize(lat, 0.015), lng: randomize(lng, 0.015),
      color: C.cyan, distanceKm: 1.2, etaMins: 3
    },
    {
      id: "r-ngo-1", name: "RakshaNet NGO Partner", type: "NGO Partner", status: "Available" as const,
      lat: randomize(lat, 0.008), lng: randomize(lng, 0.008),
      color: C.green, distanceKm: 0.8, etaMins: 2
    },
    {
      id: "r-sec-1", name: "Campus/Mall Security", type: "Security", status: "Available" as const,
      lat: randomize(lat, 0.025), lng: randomize(lng, 0.025),
      color: C.purple, distanceKm: 2.5, etaMins: 7
    }
  ].sort((a, b) => a.etaMins - b.etaMins);
}

// =========================================================================

export default function CommandCenterPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Dynamic Responders for the currently selected incident
  const [responders, setResponders] = useState<CommandResponder[]>([]);
  const [isDispatching, setIsDispatching] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);
    setUserId(user.id);
    const { data } = await supabase.from("incidents").select("*").eq("user_id", user.id).order("started_at", { ascending: false }).limit(20);
    if (data) setIncidents(data as Incident[]);
    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Supabase realtime listener
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase.channel("incidents-rt").on("postgres_changes", { event: "*", schema: "public", table: "incidents", filter: `user_id=eq.${userId}` }, (payload) => {
      if (payload.eventType === "INSERT") setIncidents(p => [payload.new as Incident, ...p]);
      if (payload.eventType === "UPDATE") {
        setIncidents(p => p.map(i => i.id === payload.new.id ? payload.new as Incident : i));
        if (selected?.id === payload.new.id) setSelected(payload.new as Incident);
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, selected]);

  // When an incident is selected, generate the local responders
  useEffect(() => {
    if (selected && selected.location) {
      setResponders(generateAIResponders(selected.location.lat, selected.location.lng));
    } else {
      setResponders([]);
    }
  }, [selected]);

  // AI Dispatch Action
  const handleDispatchAI = useCallback(() => {
    if (!selected) return;
    setIsDispatching(true);
    
    // Simulate AI dispatch sequence
    setTimeout(() => {
      // Update local responder states
      setResponders(prev => prev.map(r => ({ ...r, status: "Dispatched" })));
      
      // Update incident status in DB
      const supabase = createClient();
      supabase.from("incidents").update({ status: "Dispatched" }).eq("id", selected.id).then();
      
      setIsDispatching(false);
    }, 1500);
  }, [selected]);

  const active = incidents.filter(i => ["Triggered", "Dispatched", "Live"].includes(i.status));
  const history = incidents.filter(i => ["Resolved", "Sealed"].includes(i.status));

  return (
    <div style={{ width: "100%", height: "calc(100vh - 120px)", minHeight: 700, display: "flex", flexDirection: "column" }}>
      
      {/* Header Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F0F4FF", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Crosshair style={{ width: 22, height: 22, color: C.cyan }} /> AI Tactical Command
          </h1>
          <p style={{ fontSize: 12, color: "rgba(240,244,255,0.4)", marginTop: 4 }}>Real-time spatial analysis & AI responder deployment.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Status Indicators */}
          <div style={{ display: "flex", gap: 12, marginRight: 20 }}>
            {[{ label: "AI Engine", on: true }, { label: "Spatial Mapping", on: true }].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.on ? C.green : C.red, boxShadow: `0 0 10px ${s.on ? C.green : C.red}` }} />
                <span style={{ fontSize: 10, color: "rgba(240,244,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
              </div>
            ))}
          </div>
          {lastRefresh && <span style={{ fontSize: 10, color: "rgba(240,244,255,0.25)", fontFamily: "monospace" }}>Last sync: {lastRefresh.toLocaleTimeString()}</span>}
          <button onClick={loadData} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600, color: "rgba(240,244,255,0.6)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Refresh
          </button>
        </div>
      </div>

      {/* Main Immersive Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 340px", gap: 20, flex: 1, minHeight: 0 }}>
        
        {/* Left Column: Incident Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", paddingRight: 4 }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, color: "rgba(240,244,255,0.4)", textTransform: "uppercase" }}>Active</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.red, lineHeight: 1, fontFamily: "monospace" }}>{loading ? "-" : active.length}</div>
            </div>
            <div style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, color: "rgba(240,244,255,0.4)", textTransform: "uppercase" }}>Resolved</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.purple, lineHeight: 1, fontFamily: "monospace" }}>{loading ? "-" : history.length}</div>
            </div>
          </div>

          <div style={{ ...card, padding: 20, flex: 1, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ width: 8, height: 8, borderRadius: "50%", background: C.red }} />
              <h2 style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,244,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>Active Incidents</h2>
            </div>
            
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Monitor style={{ color: "rgba(255,255,255,0.1)", width: 24, height: 24 }} /></div>
            ) : active.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <CheckCircle2 style={{ width: 28, height: 28, color: C.green, margin: "0 auto 10px" }} />
                <p style={{ fontSize: 12, color: "rgba(240,244,255,0.35)" }}>No active incidents</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {active.map(inc => {
                  const meta = STATUS_META[inc.status];
                  const isSel = selected?.id === inc.id;
                  return (
                    <motion.div key={inc.id} onClick={() => setSelected(isSel ? null : inc)}
                      style={{ padding: 14, borderRadius: 14, cursor: "pointer", background: isSel ? `${meta.color}15` : "rgba(255,255,255,0.02)", border: `1px solid ${isSel ? `${meta.color}50` : "rgba(255,255,255,0.06)"}`, transition: "all 0.2s" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{meta.label.toUpperCase()}</span>
                        <span style={{ fontSize: 10, color: "rgba(240,244,255,0.3)", fontFamily: "monospace" }}>{timeAgo(inc.started_at)}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "#F0F4FF", margin: "0 0 6px 0", fontWeight: 600 }}>{inc.location?.address || "Unknown Location"}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                         <span style={{ fontSize: 10, color: "rgba(240,244,255,0.4)" }}>Risk: {inc.risk_score}</span>
                         <span style={{ fontSize: 9, color: "rgba(240,244,255,0.2)", fontFamily: "monospace" }}>ID: {inc.id.slice(0,6)}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Center: Tactical Map */}
        <div style={{ position: "relative", ...card, padding: 8, display: "flex", flexDirection: "column" }}>
          {selected && selected.location ? (
            <CommandMap incidentLat={selected.location.lat} incidentLng={selected.location.lng} responders={responders} />
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#060A12", borderRadius: 14 }}>
              <Crosshair style={{ width: 48, height: 48, color: "rgba(240,244,255,0.05)", marginBottom: 16 }} />
              <p style={{ fontSize: 14, color: "rgba(240,244,255,0.4)", fontWeight: 600 }}>Select an incident to view tactical map</p>
              <p style={{ fontSize: 12, color: "rgba(240,244,255,0.2)" }}>AI spatial analysis requires a target location.</p>
            </div>
          )}
          
          {/* Map Overlay: Selected Incident Summary */}
          {selected && (
            <div style={{ position: "absolute", top: 20, left: 20, background: "rgba(6,10,18,0.85)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px", zIndex: 10 }}>
              <div style={{ fontSize: 10, color: "rgba(240,244,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Target Lock</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#F0F4FF" }}>{selected.location.address}</div>
              <div style={{ fontSize: 11, color: C.cyan, fontFamily: "monospace", marginTop: 4 }}>{selected.location.lat.toFixed(5)}, {selected.location.lng.toFixed(5)}</div>
            </div>
          )}
        </div>

        {/* Right Column: AI Dispatch Action Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", paddingRight: 4 }}>
          
          <div style={{ ...card, padding: 20, flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <Zap style={{ width: 14, height: 14, color: C.yellow }} />
              <h2 style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,244,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>AI Dispatch Recommendation</h2>
            </div>

            {!selected ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)", fontSize: 12, textAlign: "center" }}>Waiting for target...</div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  <p style={{ fontSize: 12, color: "rgba(240,244,255,0.6)", lineHeight: 1.5, marginBottom: 20 }}>
                    AI Engine has identified <strong>{responders.length}</strong> available responder units within a 3km radius of the target location.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {responders.map(r => (
                      <div key={r.id} style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: `1px solid ${r.status === 'Dispatched' ? r.color : 'rgba(255,255,255,0.06)'}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#F0F4FF" }}>{r.name}</div>
                            <div style={{ fontSize: 10, color: "rgba(240,244,255,0.4)" }}>{r.type}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 14, fontWeight: 900, color: r.color }}>{r.etaMins} min</div>
                            <div style={{ fontSize: 10, color: "rgba(240,244,255,0.3)" }}>{r.distanceKm.toFixed(1)} km away</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: r.status === "Available" ? "rgba(255,255,255,0.1)" : `${r.color}20`, color: r.status === "Available" ? "rgba(255,255,255,0.6)" : r.color }}>
                            {r.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dispatch Button */}
                {selected.status === "Triggered" && (
                  <button 
                    onClick={handleDispatchAI}
                    disabled={isDispatching}
                    style={{ 
                      marginTop: 20, width: "100%", padding: "16px", borderRadius: 14, border: "none", 
                      background: isDispatching ? "rgba(255,255,255,0.1)" : C.red, color: "#fff", 
                      fontSize: 14, fontWeight: 800, cursor: isDispatching ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      boxShadow: isDispatching ? "none" : `0 4px 20px ${C.red}50`, transition: "all 0.2s"
                    }}
                  >
                    {isDispatching ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
                    ) : (
                      <><Send style={{ width: 16, height: 16 }} /> DISPATCH ALL UNITS</>
                    )}
                  </button>
                )}
                
                {selected.status !== "Triggered" && (
                  <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)", color: C.cyan, textAlign: "center", fontSize: 13, fontWeight: 700 }}>
                    Units Dispatched Successfully
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

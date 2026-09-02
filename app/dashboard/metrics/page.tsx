"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { BarChart3, TrendingUp, Shield, Users, Clock, CheckCircle2, Zap, AlertTriangle } from "lucide-react";

interface Incident { id: string; status: string; risk_score: number; started_at: string; resolved_at: string | null; }

const C = { red: "#FF2D55", cyan: "#00E5FF", green: "#00FF88", yellow: "#FFBA08", purple: "#B47FFF" };
const card: React.CSSProperties = { background: "rgba(6,10,18,0.85)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" };

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: "easeOut" }}
          style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg,${color}80,${color})` }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "monospace", minWidth: 24, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon: Icon, trend }: { label: string; value: string | number; sub?: string; color: string; icon: React.ElementType; trend?: string }) {
  return (
    <div style={{ ...card, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: `${color}12`, border: `1px solid ${color}25` }}>
          <Icon style={{ width: 16, height: 16, color }} />
        </div>
        {trend && <span style={{ fontSize: 10, fontWeight: 700, color: C.green, padding: "2px 8px", borderRadius: 100, background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.2)" }}>{trend}</span>}
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, color, fontFamily: "monospace", lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#F0F4FF", marginBottom: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(240,244,255,0.3)" }}>{sub}</div>}
    </div>
  );
}

export default function MetricsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      const { data } = await supabase.from("incidents").select("id,status,risk_score,started_at,resolved_at").eq("user_id", user.id).order("started_at", { ascending: true });
      if (data) setIncidents(data as Incident[]);
      setLoading(false);
    };
    load();
  }, []);

  // Computed metrics
  const total = incidents.length;
  const resolved = incidents.filter(i => ["Resolved", "Sealed"].includes(i.status)).length;
  const active = incidents.filter(i => ["Triggered", "Dispatched", "Live"].includes(i.status)).length;
  const avgRisk = total > 0 ? Math.round(incidents.reduce((a, i) => a + i.risk_score, 0) / total) : 0;
  const resolvedWithTime = incidents.filter(i => i.resolved_at && i.started_at);
  const avgResponseMin = resolvedWithTime.length > 0
    ? Math.round(resolvedWithTime.reduce((a, i) => a + (new Date(i.resolved_at!).getTime() - new Date(i.started_at).getTime()) / 60000, 0) / resolvedWithTime.length)
    : 0;

  // Monthly breakdown (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const m = d.getMonth(); const y = d.getFullYear();
    const count = incidents.filter(inc => { const dd = new Date(inc.started_at); return dd.getMonth() === m && dd.getFullYear() === y; }).length;
    return { label: d.toLocaleString("default", { month: "short" }), count };
  });
  const maxMonthly = Math.max(...monthlyData.map(m => m.count), 1);

  // Risk distribution
  const riskBuckets = [
    { label: "Critical (75-100)", count: incidents.filter(i => i.risk_score >= 75).length, color: C.red },
    { label: "High (50-74)", count: incidents.filter(i => i.risk_score >= 50 && i.risk_score < 75).length, color: C.yellow },
    { label: "Moderate (25-49)", count: incidents.filter(i => i.risk_score >= 25 && i.risk_score < 50).length, color: C.cyan },
    { label: "Low (0-24)", count: incidents.filter(i => i.risk_score < 25).length, color: C.green },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F0F4FF", margin: 0 }}>Impact Metrics</h1>
        <p style={{ fontSize: 12, color: "rgba(240,244,255,0.38)", marginTop: 4 }}>Live analytics from your incident history and safety activity.</p>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(0,229,255,0.15)", borderTopColor: C.cyan }} />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
            <StatCard label="Total Incidents" value={total} sub="All time" color={C.cyan} icon={BarChart3} />
            <StatCard label="Resolved" value={resolved} sub={total > 0 ? `${Math.round(resolved / total * 100)}% rate` : "0%"} color={C.green} icon={CheckCircle2} trend={resolved > 0 ? "+100%" : undefined} />
            <StatCard label="Avg Risk Score" value={avgRisk} sub="Per incident" color={avgRisk >= 75 ? C.red : avgRisk >= 50 ? C.yellow : C.cyan} icon={AlertTriangle} />
            <StatCard label="Avg Response" value={avgResponseMin > 0 ? `${avgResponseMin}m` : "—"} sub="Time to resolve" color={C.purple} icon={Clock} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* Monthly Activity Chart */}
            <div style={{ ...card, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                <TrendingUp style={{ width: 14, height: 14, color: C.cyan }} />
                <h2 style={{ fontSize: 12, fontWeight: 700, color: "#F0F4FF", margin: 0 }}>Monthly Incidents</h2>
              </div>
              {total === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160 }}>
                  <p style={{ fontSize: 12, color: "rgba(240,244,255,0.25)" }}>No data yet</p>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
                  {monthlyData.map((m, i) => {
                    const barH = maxMonthly > 0 ? Math.max(4, Math.round((m.count / maxMonthly) * 120)) : 4;
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <motion.div initial={{ height: 0 }} animate={{ height: barH }} transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                          style={{ width: "100%", borderRadius: 6, background: m.count > 0 ? `linear-gradient(180deg,${C.cyan},${C.cyan}60)` : "rgba(255,255,255,0.04)", boxShadow: m.count > 0 ? `0 0 12px ${C.cyan}30` : "none" }} />
                        <span style={{ fontSize: 9, color: "rgba(240,244,255,0.3)", fontWeight: 600 }}>{m.label}</span>
                        {m.count > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: C.cyan, fontFamily: "monospace" }}>{m.count}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Risk Distribution */}
            <div style={{ ...card, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <AlertTriangle style={{ width: 14, height: 14, color: C.yellow }} />
                <h2 style={{ fontSize: 12, fontWeight: 700, color: "#F0F4FF", margin: 0 }}>Risk Distribution</h2>
              </div>
              {total === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120 }}>
                  <p style={{ fontSize: 12, color: "rgba(240,244,255,0.25)" }}>No data yet</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {riskBuckets.map(b => (
                    <div key={b.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: "rgba(240,244,255,0.45)" }}>{b.label}</span>
                      </div>
                      <MiniBar value={b.count} max={total} color={b.color} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>


          {/* Incident Timeline */}
          {incidents.length > 0 && (
            <div style={{ ...card, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <Clock style={{ width: 14, height: 14, color: C.cyan }} />
                <h2 style={{ fontSize: 12, fontWeight: 700, color: "#F0F4FF", margin: 0 }}>Incident Timeline</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...incidents].reverse().slice(0, 5).map((inc, i) => {
                  const statusColor = inc.status === "Sealed" || inc.status === "Resolved" ? C.green : inc.status === "Live" ? C.red : C.yellow;
                  return (
                    <div key={inc.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "rgba(240,244,255,0.25)", fontFamily: "monospace", flexShrink: 0 }}>{new Date(inc.started_at).toLocaleDateString()}</span>
                      <span style={{ fontSize: 11, color: "rgba(240,244,255,0.5)", flex: 1 }}>Incident #{inc.id.slice(0, 8)}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: statusColor }}>{inc.status}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,244,255,0.4)", fontFamily: "monospace" }}>Risk {inc.risk_score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

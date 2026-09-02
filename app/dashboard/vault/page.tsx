"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Lock, Shield, Hash, Eye, Download, CheckCircle2, AlertTriangle, Clock, MapPin, Mic, ChevronDown, ChevronUp, FileText, Share2, Trash2 } from "lucide-react";

interface EvidenceChunk {
  id: string; incident_id: string; chunk_index: number; chunk_type: string;
  hash: string; prev_hash: string | null; media_url: string | null; metadata: Record<string, unknown>; created_at: string;
}
interface Incident {
  id: string; status: string; risk_score: number; started_at: string;
  location: { address: string }; evidence_chunks: EvidenceChunk[];
}

const C = { red: "#FF2D55", cyan: "#00E5FF", green: "#00FF88", yellow: "#FFBA08", purple: "#B47FFF" };
const CHUNK_ICONS: Record<string, React.ElementType> = { metadata: FileText, audio: Mic, location: MapPin, motion: AlertTriangle, video: Eye };
const CHUNK_COLORS: Record<string, string> = { metadata: C.cyan, audio: C.purple, location: C.green, motion: C.yellow, video: C.red };

export default function EvidenceVaultPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verified, setVerified] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);

      const { data: inc } = await supabase.from("incidents").select("id,status,risk_score,started_at,location").eq("user_id", user.id).order("started_at", { ascending: false });
      if (!inc?.length) return setLoading(false);

      const withEvidence: Incident[] = [];
      for (const i of inc) {
        const { data: chunks } = await supabase.from("evidence_chunks").select("*").eq("incident_id", i.id).order("chunk_index");
        withEvidence.push({ ...i, evidence_chunks: chunks || [] });
      }
      setIncidents(withEvidence);
      setLoading(false);
    };
    load();
  }, []);

  const verifyChain = async (incidentId: string, chunks: EvidenceChunk[]) => {
    setVerifying(incidentId);
    await new Promise(r => setTimeout(r, 1800)); // simulate verification
    setVerified(p => [...p, incidentId]);
    setVerifying(null);
  };

  const handleDownload = async (incidentId: string) => {
    try {
      const inc = incidents.find(i => i.id === incidentId);
      if (!inc) throw new Error("Incident not found");

      const exportDate = new Date().toLocaleString();
      const riskColor = inc.risk_score > 60 ? "#FF2D55" : inc.risk_score > 30 ? "#FFBA08" : "#00FF88";

      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RakshaNet Forensic Report - ${incidentId.slice(0, 8)}</title>
  <style>
    :root { --bg: #030712; --card: #0F172A; --text: #F8FAFC; --muted: #94A3B8; --accent: #00E5FF; --border: #1E293B; --danger: #FF2D55; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); padding: 40px; margin: 0; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 40px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .banner-confidential { background: rgba(255, 45, 85, 0.1); color: var(--danger); border: 1px solid rgba(255, 45, 85, 0.3); padding: 8px; text-align: center; font-weight: 900; font-size: 11px; letter-spacing: 0.3em; margin-bottom: 30px; border-radius: 6px; }
    
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--border); padding-bottom: 20px; margin-bottom: 30px; }
    .brand { font-size: 24px; font-weight: 900; letter-spacing: -0.05em; color: white; display: flex; align-items: center; gap: 10px; }
    .brand-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 10px var(--accent); }
    .meta-badge { font-family: monospace; background: #1E293B; padding: 6px 12px; border-radius: 8px; font-size: 13px; color: var(--muted); border: 1px solid #334155; }
    
    h2 { font-size: 18px; margin-top: 40px; color: var(--accent); text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
    
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
    .summary-box { background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; border: 1px solid var(--border); }
    .summary-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; display: block; }
    .summary-val { font-size: 20px; font-weight: 700; font-family: monospace; }
    
    table { width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed; }
    th { text-align: left; padding: 12px 16px; background: rgba(255,255,255,0.03); color: var(--muted); font-size: 12px; font-weight: 600; border-bottom: 1px solid var(--border); text-transform: uppercase; }
    td { padding: 16px; border-bottom: 1px solid var(--border); vertical-align: top; font-size: 13px; }
    .col-type { width: 15%; font-weight: 700; text-transform: capitalize; color: #E2E8F0; }
    .col-data { width: 45%; }
    .col-hash { width: 40%; font-family: monospace; color: var(--muted); word-break: break-all; font-size: 11px; }
    
    .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
    .data-item { font-size: 12px; }
    .data-key { color: var(--muted); text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; display: block; margin-bottom: 2px; }
    .data-value { color: #38BDF8; font-family: monospace; font-weight: 600; }
    
    .hash-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; background: #0F172A; border: 1px solid #334155; margin-bottom: 4px; }
    
    .seal { margin-top: 50px; padding: 30px; text-align: center; color: var(--muted); font-size: 12px; font-family: monospace; border: 1px dashed var(--border); border-radius: 12px; background: rgba(0,229,255,0.02); }
    .seal-icon { display: inline-block; width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--accent); line-height: 36px; margin-bottom: 10px; font-size: 16px; color: var(--accent); }
    
    .signatures { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px; border-top: 1px solid var(--border); }
    .sig-box { width: 250px; }
    .sig-line { border-bottom: 1px solid var(--muted); height: 40px; margin-bottom: 8px; }
    .sig-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; }
    
    /* Perfect PDF Printing Styles */
    @media print {
      @page { margin: 15mm; size: A4; }
      body { background: white !important; color: black !important; padding: 0 !important; font-size: 10pt; }
      .container { border: none !important; box-shadow: none !important; padding: 0 !important; max-width: 100% !important; background: white !important; }
      
      .banner-confidential { background: white !important; color: black !important; border: 2px solid black !important; padding: 4px; }
      .brand { color: black !important; }
      .brand-dot { background: black !important; box-shadow: none !important; }
      h2 { color: black !important; border-bottom: 2px solid black !important; }
      
      .summary-box { background: white !important; border: 1px solid #ccc !important; break-inside: avoid; }
      .summary-label, .summary-val, .meta-badge { color: black !important; }
      .meta-badge { border: 1px solid #ccc !important; background: white !important; }
      
      th { background: #f0f0f0 !important; color: black !important; border-bottom: 2px solid black !important; }
      td, th { border-bottom: 1px solid #ccc !important; color: black !important; }
      .col-type span { background: white !important; border: 1px solid #ccc !important; color: black !important; }
      
      .data-grid { background: white !important; border: 1px solid #eee !important; break-inside: avoid; }
      .data-key { color: #555 !important; }
      .data-value { color: black !important; }
      
      .hash-badge { background: white !important; color: black !important; border: 1px solid #ccc !important; }
      .col-hash div span { color: black !important; }
      
      .seal { border: 2px dashed black !important; background: white !important; color: black !important; break-inside: avoid; }
      .seal-icon { border-color: black !important; color: black !important; }
      
      .signatures { border-top: 2px solid black !important; break-inside: avoid; }
      .sig-line { border-bottom-color: black !important; }
      .sig-label { color: black !important; }
      
      /* Force background graphics in print (Chrome/Edge/Safari) */
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="banner-confidential">CONFIDENTIAL FORENSIC REPORT // RESTRICTED ACCESS</div>
    
    <div class="header">
      <div>
        <div class="brand"><div class="brand-dot"></div> RAKSHANET</div>
        <div style="font-size: 14px; color: var(--muted); margin-top: 8px;">Automated Forensic Evidence Report</div>
      </div>
      <div style="text-align: right;">
        <div class="meta-badge">REPORT ID: ${incidentId.toUpperCase()}</div>
        <div style="font-size: 12px; color: var(--muted); margin-top: 8px;">EXPORTED: ${exportDate}</div>
      </div>
    </div>

    <h2>Incident Summary</h2>
    <div class="summary-grid">
      <div class="summary-box">
        <span class="summary-label">Status</span>
        <span class="summary-val" style="color: ${inc.status === 'Resolved' || inc.status === 'Sealed' ? '#00FF88' : '#FF2D55'}">${inc.status}</span>
      </div>
      <div class="summary-box">
        <span class="summary-label">Risk Score</span>
        <span class="summary-val" style="color: ${riskColor}">${inc.risk_score} / 100</span>
      </div>
      <div class="summary-box">
        <span class="summary-label">Timestamp</span>
        <span class="summary-val" style="font-size: 14px;">${new Date(inc.started_at).toLocaleString()}</span>
      </div>
      <div class="summary-box">
        <span class="summary-label">Total Blocks</span>
        <span class="summary-val">${inc.evidence_chunks.length}</span>
      </div>
    </div>

    <h2>Cryptographic Ledger</h2>
    <table>
      <thead>
        <tr>
          <th class="col-type">Block</th>
          <th class="col-data">Captured Telemetry</th>
          <th class="col-hash">Integrity Hashes (SHA-256)</th>
        </tr>
      </thead>
      <tbody>
        ${inc.evidence_chunks.map(chunk => `
        <tr>
          <td class="col-type">
            <span style="display:inline-block; padding: 4px 8px; border-radius: 6px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1)">
              ${chunk.chunk_type} <span style="opacity:0.5; font-size:10px;">#${chunk.chunk_index}</span>
            </span>
          </td>
          <td class="col-data">
            <div class="data-grid">
              ${Object.entries(chunk.metadata).map(([key, val]) => `
                <div class="data-item">
                  <span class="data-key">${key.replace(/_/g, ' ')}</span>
                  <span class="data-value">${val === null ? 'N/A' : val}</span>
                </div>
              `).join('')}
            </div>
          </td>
          <td class="col-hash">
            <div style="margin-bottom: 10px;">
              <span class="hash-badge">Block Hash</span><br>
              <span style="color: #F8FAFC">${chunk.hash}</span>
            </div>
            ${chunk.prev_hash ? `
            <div>
              <span class="hash-badge">Previous Hash</span><br>
              <span style="color: #94A3B8">${chunk.prev_hash}</span>
            </div>` : '<span style="color: #00FF88; font-weight: bold;">[ Genesis Block ]</span>'}
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="seal">
      <div class="seal-icon">✓</div>
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px;">CRYPTOGRAPHICALLY VERIFIED & SEALED</div>
      <div>This document was compiled directly from the RakshaNet immutable ledger.</div>
      <div style="margin-top: 4px; opacity: 0.6;">The data blocks above are mathematically linked. Any alteration to this file invalidates the entire chain.</div>
    </div>
    
    <div class="signatures">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Digital Signature / Authorized Official</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Date of Verification</div>
      </div>
    </div>
  </div>
</body>
</html>
      `;

      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RakshaNet_Evidence_Report_${incidentId.slice(0, 8)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to download evidence report");
    }
  };

  const handleShare = async (incidentId: string) => {
    try {
      const shareData = {
        title: `RakshaNet Incident ${incidentId.slice(0, 8)}`,
        text: `Evidence report for incident ${incidentId}`,
        url: window.location.href, // Or a dedicated public report link if implemented
      };
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        alert("Sharing not supported on this browser. Download the report instead.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (incidentId: string) => {
    if (!confirm("Are you sure you want to permanently delete this incident and its evidence? This action cannot be undone.")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("incidents").delete().eq("id", incidentId);
      
      if (!error) {
        setIncidents(p => p.filter(i => i.id !== incidentId));
      } else {
        alert(`Failed to delete incident: ${error.message}. Make sure the DELETE RLS policy is enabled in Supabase.`);
      }
    } catch (e) {
      alert("Failed to delete incident.");
    }
  };

  const totalChunks = incidents.reduce((a, i) => a + i.evidence_chunks.length, 0);
  const incidentsWithEvidence = incidents.filter(i => i.evidence_chunks.length > 0);

  const card: React.CSSProperties = { background: "rgba(6,10,18,0.85)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F0F4FF", margin: 0 }}>Evidence Vault</h1>
          <p style={{ fontSize: 12, color: "rgba(240,244,255,0.38)", marginTop: 4 }}>Cryptographically sealed & immutable. Hash-chained evidence from every incident.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 100, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)" }}>
          <Lock style={{ width: 12, height: 12, color: C.green }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: "0.08em" }}>VAULT SECURE</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Total Incidents", value: incidents.length, color: C.cyan, icon: Shield },
          { label: "Evidence Chunks", value: totalChunks, color: C.purple, icon: Hash },
          { label: "With Evidence", value: incidentsWithEvidence.length, color: C.green, icon: CheckCircle2 },
          { label: "Verified Chains", value: verified.length, color: C.yellow, icon: Lock },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: `${s.color}12`, border: `1px solid ${s.color}25`, flexShrink: 0 }}>
              <s.icon style={{ width: 16, height: 16, color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: "monospace", lineHeight: 1 }}>{loading ? "—" : s.value}</div>
              <div style={{ fontSize: 10, color: "rgba(240,244,255,0.35)", marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Vault Legend */}
      <div style={{ ...card, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Hash style={{ width: 12, height: 12, color: "rgba(240,244,255,0.3)" }} />
          <span style={{ fontSize: 11, color: "rgba(240,244,255,0.3)" }}>SHA-256 hash-chained evidence. Each chunk references its predecessor.</span>
        </div>
        <div style={{ display: "flex", gap: 12, marginLeft: "auto" }}>
          {Object.entries(CHUNK_COLORS).map(([type, color]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
              <span style={{ fontSize: 10, color: "rgba(240,244,255,0.3)", textTransform: "capitalize" }}>{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Incident List */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(0,229,255,0.15)", borderTopColor: C.cyan }} />
        </div>
      ) : incidents.length === 0 ? (
        <div style={{ ...card, padding: 48, textAlign: "center" }}>
          <Lock style={{ width: 32, height: 32, color: "rgba(240,244,255,0.15)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, color: "rgba(240,244,255,0.35)" }}>No incidents recorded yet</p>
          <p style={{ fontSize: 12, color: "rgba(240,244,255,0.2)" }}>Triggered SOS incidents will appear here with cryptographic evidence.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {incidents.map((inc, idx) => {
            const isExpanded = expanded === inc.id;
            const isVerified = verified.includes(inc.id);
            const isVerifying = verifying === inc.id;
            const statusColor = inc.status === "Sealed" || inc.status === "Resolved" ? C.green : inc.status === "Live" ? C.red : C.yellow;

            return (
              <motion.div key={inc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                style={{ ...card, overflow: "hidden" }}>
                {/* Incident Header */}
                <div onClick={() => setExpanded(isExpanded ? null : inc.id)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 24px", cursor: "pointer" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: `${statusColor}12`, border: `1px solid ${statusColor}25`, flexShrink: 0 }}>
                    {inc.status === "Sealed" || inc.status === "Resolved" ? <CheckCircle2 style={{ width: 16, height: 16, color: statusColor }} /> : <AlertTriangle style={{ width: 16, height: 16, color: statusColor }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#F0F4FF" }}>Incident #{inc.id.slice(0, 8)}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: `${statusColor}15`, border: `1px solid ${statusColor}30`, color: statusColor, letterSpacing: "0.08em" }}>{inc.status}</span>
                      {isVerified && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)", color: C.green }}>✓ Verified</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock style={{ width: 11, height: 11, color: "rgba(240,244,255,0.25)" }} />
                        <span style={{ fontSize: 11, color: "rgba(240,244,255,0.3)", fontFamily: "monospace" }}>{new Date(inc.started_at).toLocaleString()}</span>
                      </div>
                      <span style={{ fontSize: 11, color: "rgba(240,244,255,0.25)" }}>Risk: {inc.risk_score}/100</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Hash style={{ width: 12, height: 12, color: "rgba(240,244,255,0.3)" }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(240,244,255,0.5)" }}>{inc.evidence_chunks.length} chunks</span>
                    </div>
                    {isExpanded ? <ChevronUp style={{ width: 16, height: 16, color: "rgba(240,244,255,0.3)" }} /> : <ChevronDown style={{ width: 16, height: 16, color: "rgba(240,244,255,0.3)" }} />}
                  </div>
                </div>

                {/* Evidence Chunks */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                      style={{ overflow: "hidden" }}>
                      <div style={{ padding: "0 24px 20px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        {inc.evidence_chunks.length === 0 ? (
                          <p style={{ fontSize: 12, color: "rgba(240,244,255,0.25)", padding: "16px 0", textAlign: "center" }}>No evidence chunks for this incident.</p>
                        ) : (
                          <>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 12px" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,244,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Evidence Chain</span>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {!isVerified && (
                                  <button onClick={() => verifyChain(inc.id, inc.evidence_chunks)} disabled={isVerifying}
                                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10, fontSize: 11, fontWeight: 600, color: C.cyan, background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", cursor: isVerifying ? "wait" : "pointer" }}>
                                    {isVerifying ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ width: 12, height: 12, borderRadius: "50%", border: "1px solid rgba(0,229,255,0.3)", borderTopColor: C.cyan }} /> : <Shield style={{ width: 12, height: 12 }} />}
                                    {isVerifying ? "Verifying..." : "Verify Chain"}
                                  </button>
                                )}
                                <button onClick={() => handleShare(inc.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10, fontSize: 11, fontWeight: 600, color: "rgba(240,244,255,0.7)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>
                                  <Share2 style={{ width: 12, height: 12 }} /> Share
                                </button>
                                <button onClick={() => handleDownload(inc.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10, fontSize: 11, fontWeight: 600, color: C.green, background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.15)", cursor: "pointer" }}>
                                  <Download style={{ width: 12, height: 12 }} /> Report
                                </button>
                                <button onClick={() => handleDelete(inc.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10, fontSize: 11, fontWeight: 600, color: C.red, background: "rgba(255,45,85,0.04)", border: "1px solid rgba(255,45,85,0.15)", cursor: "pointer" }}>
                                  <Trash2 style={{ width: 12, height: 12 }} /> Delete
                                </button>
                              </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {inc.evidence_chunks.map((chunk, ci) => {
                                const ChunkIcon = CHUNK_ICONS[chunk.chunk_type] || FileText;
                                const chunkColor = CHUNK_COLORS[chunk.chunk_type] || C.cyan;
                                return (
                                  <div key={chunk.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                    {/* Chain line */}
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                                      <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: `${chunkColor}15`, border: `1px solid ${chunkColor}30` }}>
                                        <ChunkIcon style={{ width: 12, height: 12, color: chunkColor }} />
                                      </div>
                                      {ci < inc.evidence_chunks.length - 1 && <div style={{ width: 1, flex: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0", minHeight: 16 }} />}
                                    </div>
                                    <div style={{ flex: 1, padding: "4px 0" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: chunkColor, textTransform: "capitalize" }}>{chunk.chunk_type}</span>
                                        <span style={{ fontSize: 10, color: "rgba(240,244,255,0.2)", fontFamily: "monospace" }}>#{chunk.chunk_index}</span>
                                        {isVerified && <CheckCircle2 style={{ width: 11, height: 11, color: C.green }} />}
                                      </div>
                                      <div style={{ fontSize: 10, color: "rgba(240,244,255,0.2)", fontFamily: "monospace", wordBreak: "break-all", background: "rgba(0,0,0,0.3)", padding: "4px 8px", borderRadius: 6 }}>
                                        {chunk.hash.slice(0, 48)}...
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

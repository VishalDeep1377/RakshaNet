// =============================================================
// RAKSHANET — Raksha Risk Score Engine
// Rule-based additive scoring: Audio + Motion + Route + Time
// Total max = 87 points → maps to 4 action levels
// =============================================================

// ── Score Factors ────────────────────────────────────────────
export interface RakshaScoreInput {
  /** Audio anomaly detected by microphone (0 or 35) */
  audioAnomalyScore: number; // max 35
  /** Sudden motion/jerk detected by accelerometer (0 or 20) */
  motionScore: number; // max 20
  /** Route risk — off-route / unknown area (0-18 based on location) */
  routeRiskScore: number; // max 18
  /** Time of day + context risk (0, 7, or 14) */
  timeContextScore: number; // max 14
  /** Manual user SOS press — immediately elevates to critical */
  userTrigger: boolean;
}

export interface RakshaScoreBreakdown {
  audio: number;       // 0–35
  motion: number;      // 0–20
  routeRisk: number;   // 0–18
  timeContext: number; // 0–14
  total: number;       // 0–87 (or 87 if user trigger)
}

// ── Risk Levels ───────────────────────────────────────────────
export type RakshaRiskLevel =
  | "SAFE"         // 0
  | "SUSPICIOUS"   // 1–29   (Level 1)
  | "HIGH_RISK"    // 30–54  (Level 2)
  | "CONFIRMED"    // 55–74  (Level 3)
  | "CRITICAL";    // 75–87  (Level 4)

export interface RakshaRiskResult {
  score: number;                 // 0–87
  level: RakshaRiskLevel;
  levelNumber: 0 | 1 | 2 | 3 | 4;
  breakdown: RakshaScoreBreakdown;
  description: string;
  actionRequired: string;
}

// ── Level metadata for UI ─────────────────────────────────────
export const RAKSHA_LEVEL_META: Record<
  RakshaRiskLevel,
  {
    levelNumber: 0 | 1 | 2 | 3 | 4;
    label: string;
    color: string;
    bg: string;
    border: string;
    description: string;
    actionRequired: string;
  }
> = {
  SAFE: {
    levelNumber: 0,
    label: "Safe",
    color: "#00FFA3",
    bg: "rgba(0,255,163,0.06)",
    border: "rgba(0,255,163,0.2)",
    description: "All signals normal.",
    actionRequired: "none",
  },
  SUSPICIOUS: {
    levelNumber: 1,
    label: "Suspicious",
    color: "#FFBA08",
    bg: "rgba(255,186,8,0.06)",
    border: "rgba(255,186,8,0.22)",
    description: "Mild anomaly detected. Monitoring elevated.",
    actionRequired: "display_only",
  },
  HIGH_RISK: {
    levelNumber: 2,
    label: "High Risk",
    color: "#FF8C42",
    bg: "rgba(255,140,66,0.06)",
    border: "rgba(255,140,66,0.25)",
    description: "Multiple risk signals active. Safety check initiated.",
    actionRequired: "silent_checkin",
  },
  CONFIRMED: {
    levelNumber: 3,
    label: "Confirmed Risk",
    color: "#FF2D55",
    bg: "rgba(255,45,85,0.08)",
    border: "rgba(255,45,85,0.35)",
    description: "High confidence distress detected. SOS activated.",
    actionRequired: "auto_sos",
  },
  CRITICAL: {
    levelNumber: 4,
    label: "Critical Emergency",
    color: "#FF0055",
    bg: "rgba(255,0,85,0.12)",
    border: "rgba(255,0,85,0.5)",
    description: "CRITICAL — Emergency escalation in progress.",
    actionRequired: "emergency_escalation",
  },
};

// ── RULE: Audio Anomaly (0 or 35) ────────────────────────────
/**
 * Returns 35 if audio anomaly is confirmed, 0 otherwise.
 * The actual detection happens in audioAnalyzer.ts (Web Audio API).
 * This function just clamps to valid range.
 */
export function computeAudioScore(rawScore: number): number {
  return rawScore >= 35 ? 35 : 0;
}

// ── RULE: Motion Anomaly (0 or 20) ───────────────────────────
/**
 * Returns 20 if sudden motion/jerk is confirmed, 0 otherwise.
 * Detection happens in motionAnalyzer.ts (DeviceMotion events).
 */
export function computeMotionScore(rawScore: number): number {
  return rawScore >= 20 ? 20 : 0;
}

// ── RULE: Route Risk (0–18) ───────────────────────────────────
/**
 * Maps the existing distress engine's location + route deviation
 * factors onto a 0–18 scale.
 *
 * locationScore: 0–100 from existing engine (0=safe, 100=unknown)
 * routeDeviationScore: 0–100 from existing engine
 */
export function computeRouteRiskScore(
  locationScore: number,
  routeDeviationScore: number
): number {
  // Average of location and route signals, scaled to 0–18
  const combined = (locationScore + routeDeviationScore) / 2;
  const scaled = Math.round((combined / 100) * 18);
  return Math.min(18, Math.max(0, scaled));
}

// ── RULE: Time & Context (0, 7, or 14) ───────────────────────
/**
 * Night hours add maximum points; evening adds half.
 * hour is 0–23 (local time).
 */
export function computeTimeContextScore(hour: number): number {
  if (hour >= 22 || hour <= 4) return 14; // Night (10pm–4am): full points
  if (hour >= 20 || hour <= 6) return 7;  // Evening / early morning: half
  return 0;                               // Daytime: zero
}

// ── LEVEL from score ──────────────────────────────────────────
export function rakshaLevelFromScore(score: number): RakshaRiskLevel {
  if (score === 0) return "SAFE";
  if (score <= 29)  return "SUSPICIOUS"; // Level 1
  if (score <= 54)  return "HIGH_RISK";  // Level 2
  if (score <= 74)  return "CONFIRMED";  // Level 3
  return "CRITICAL";                     // Level 4 (75–87)
}

// ── MAIN EXPORT ───────────────────────────────────────────────
export function computeRakshaRiskScore(input: RakshaScoreInput): RakshaRiskResult {
  // User manually triggered SOS → immediately CRITICAL
  if (input.userTrigger) {
    const breakdown: RakshaScoreBreakdown = {
      audio: input.audioAnomalyScore,
      motion: input.motionScore,
      routeRisk: input.routeRiskScore,
      timeContext: input.timeContextScore,
      total: 87,
    };
    const meta = RAKSHA_LEVEL_META["CRITICAL"];
    return {
      score: 87,
      level: "CRITICAL",
      levelNumber: 4,
      breakdown,
      description: meta.description,
      actionRequired: meta.actionRequired,
    };
  }

  // Rule-based additive computation
  const audio       = computeAudioScore(input.audioAnomalyScore);
  const motion      = computeMotionScore(input.motionScore);
  const routeRisk   = Math.min(18, Math.max(0, input.routeRiskScore));
  const timeContext = Math.min(14, Math.max(0, input.timeContextScore));

  const total = Math.min(87, audio + motion + routeRisk + timeContext);

  const breakdown: RakshaScoreBreakdown = {
    audio,
    motion,
    routeRisk,
    timeContext,
    total,
  };

  const level = rakshaLevelFromScore(total);
  const meta = RAKSHA_LEVEL_META[level];

  return {
    score: total,
    level,
    levelNumber: meta.levelNumber,
    breakdown,
    description: meta.description,
    actionRequired: meta.actionRequired,
  };
}

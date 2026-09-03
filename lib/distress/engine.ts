// =============================================================
// RAKSHANET — Distress Score Engine
// Pure calculation module — no side effects, fully deterministic
//
// ML Blend (v2): A trained Logistic Regression model (trained on
// 2001 controlled simulations) contributes 15% to the final score.
// The 6 rule-based factors retain their 85% weight.
// =============================================================
import type { LocationPoint } from "@/lib/location/history";
import { computePathDeviation, detectSpeedAnomaly, haversineMetres as hMetres } from "@/lib/location/history";
import { computeMLDistressScore, buildMLFeatures, type MLFeatureInput } from "./mlDistressScorer";

export type DistressLevel = "SAFE" | "AWARE" | "CAUTION" | "DANGER" | "CRITICAL";

export interface SafeLocationInput {
  latitude: number | null;
  longitude: number | null;
  radius: number; // metres
  is_active: boolean;
  name: string;
}

export interface WorkLocationInput {
  latitude?: number;
  longitude?: number;
  address?: string;
  name: string;
}

export interface HomeLocationInput {
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface RegularRouteInput {
  id: string;
  from: string;
  to: string;
  time?: string;
}

export interface DistressInput {
  // Current GPS — null if unavailable
  userLat: number | null;
  userLng: number | null;

  // Profile data from DB
  safeLocations: SafeLocationInput[];
  homeLocation: HomeLocationInput | null;
  workLocations: WorkLocationInput[];
  regularRoutes: RegularRouteInput[];

  // GPS path history for route deviation + speed anomaly
  locationHistory?: LocationPoint[];

  // Incident history
  totalIncidents: number;
  recentIncidents: number; // last 30 days

  // Timing
  lastActiveAt: Date | null; // last known user interaction with app
  hourOfDay: number; // 0–23

  // User actions
  manualTrigger: boolean; // user pressed SOS / panic
  userReportedUnsafe: boolean; // user told assistant they feel unsafe

  // ── ML Feature Inputs (optional — enables ML blend when provided) ──
  // These are raw sensor values consumed by the Logistic Regression model.
  // If not provided the ML contribution defaults to 0 (pure rule-based).
  mlFeatures?: Partial<MLFeatureInput>;
}

export interface FactorBreakdown {
  location: number;    // 0–100, contribution to total (before weighting)
  timeOfDay: number;
  routeDeviation: number;
  incidentHistory: number;
  checkIn: number;
  manualTrigger: number;
  speedAnomaly: number; // 0 or 100 — suspicious vehicle speed
  mlScore: number;     // 0–100, ML model distress probability × 100
}

export interface DistressResult {
  score: number;          // 0–100, final weighted score
  level: DistressLevel;
  factors: FactorBreakdown;
  locationContext: string; // human-readable "At home", "In safe zone: Market", "Unknown area"
  routeContext: string;    // human-readable route deviation context
  speedKmh: number;       // last known speed in km/h
  /** ML model probability (0.0–1.0). undefined if mlFeatures not provided. */
  mlProbability?: number;
  /** ML label (0 = safe, 1 = distress). undefined if mlFeatures not provided. */
  mlLabel?: 0 | 1;
}

// ── Haversine (local alias, delegates to shared util) ────────
function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return hMetres(lat1, lng1, lat2, lng2);
}

// ── FACTOR 1: Location Safety (weight 30%) ────────────────────
function scoreLocation(input: DistressInput): { score: number; context: string } {
  const { userLat, userLng, safeLocations, homeLocation, workLocations } = input;

  // No GPS → worst case — can't confirm safety
  if (userLat === null || userLng === null) {
    return { score: 75, context: "Location unavailable" };
  }

  // Check active safe zones first (most authoritative)
  for (const sl of safeLocations) {
    if (!sl.is_active || sl.latitude === null || sl.longitude === null) continue;
    const dist = haversineMetres(userLat, userLng, sl.latitude, sl.longitude);
    if (dist <= sl.radius) {
      return { score: 0, context: `Inside safe zone: ${sl.name}` };
    }
    if (dist <= sl.radius * 2) {
      return { score: 10, context: `Near safe zone: ${sl.name}` };
    }
  }

  // Check home
  if (homeLocation?.latitude && homeLocation?.longitude) {
    const dist = haversineMetres(userLat, userLng, homeLocation.latitude, homeLocation.longitude);
    if (dist <= 200) return { score: 5, context: "At home" };
    if (dist <= 800) return { score: 18, context: "Near home" };
  }

  // Check work locations
  for (const wl of workLocations) {
    if (!wl.latitude || !wl.longitude) continue;
    const dist = haversineMetres(userLat, userLng, wl.latitude, wl.longitude);
    if (dist <= 300) return { score: 10, context: `At ${wl.name}` };
    if (dist <= 1000) return { score: 22, context: `Near ${wl.name}` };
  }

  // Not near any known location
  return { score: 70, context: "Unknown area" };
}

// ── FACTOR 2: Time of Day (weight 20%) ───────────────────────
function scoreTimeOfDay(hour: number): number {
  if (hour >= 22 || hour <= 4) return 90; // Night: very high risk window
  if (hour >= 20 || hour <= 6) return 55; // Late evening / early morning
  if (hour >= 18 || hour <= 8) return 30; // Evening / morning
  return 10;                               // Daytime: low risk
}

// ── FACTOR 3: Route Deviation (weight 20%) ───────────────────
// Uses GPS path history for corridor deviation when available,
// falls back to anchor-point proximity.
function scoreRouteDeviation(input: DistressInput): { score: number; routeContext: string } {
  const { userLat, userLng, homeLocation, workLocations, locationHistory } = input;

  if (userLat === null || userLng === null) {
    return { score: 60, routeContext: "Location unavailable" };
  }

  // Build anchor points from home + work
  const anchors: Array<{ lat: number; lng: number; label: string }> = [];
  if (homeLocation?.latitude && homeLocation?.longitude) {
    anchors.push({ lat: homeLocation.latitude, lng: homeLocation.longitude, label: "Home" });
  }
  for (const wl of workLocations) {
    if (wl.latitude && wl.longitude) {
      anchors.push({ lat: wl.latitude, lng: wl.longitude, label: wl.name });
    }
  }

  // If we have GPS history + at least 2 anchors → use path corridor deviation
  if (locationHistory && locationHistory.length >= 3 && anchors.length >= 2) {
    const result = computePathDeviation(locationHistory, anchors);
    return { score: result.score, routeContext: result.context };
  }

  // Fallback: anchor-point proximity check
  if (anchors.length === 0) {
    return { score: 35, routeContext: "Roaming mode active" };
  }

  const minDist = Math.min(
    ...anchors.map((a) => haversineMetres(userLat, userLng, a.lat, a.lng))
  );

  if (minDist <= 500)  return { score: 5,  routeContext: "Near a known location" };
  if (minDist <= 2000) return { score: 20, routeContext: "Close to known area" };
  if (minDist <= 5000) return { score: 45, routeContext: "Moderate distance from known areas" };
  return { score: 72, routeContext: "Far from all known locations" };
}

// ── FACTOR 4: Incident History (weight 15%) ──────────────────
function scoreIncidentHistory(total: number, recent: number): number {
  // Recent incidents are weighted more heavily
  const recentScore = Math.min(80, recent * 22);
  const totalScore = Math.min(40, total * 8);
  return Math.round((recentScore + totalScore) / 2);
}

// ── FACTOR 5: Check-In Status (weight 10%) ───────────────────
function scoreCheckIn(lastActiveAt: Date | null): number {
  if (!lastActiveAt) return 60; // Never checked in = unknown
  const minutesSince = (Date.now() - lastActiveAt.getTime()) / 60_000;
  if (minutesSince <= 5)  return 0;
  if (minutesSince <= 15) return 10;
  if (minutesSince <= 30) return 30;
  if (minutesSince <= 60) return 55;
  return 80;
}

// ── FACTOR 6: Manual Trigger (weight 5%) ────────────────────
function scoreManualTrigger(triggered: boolean, reportedUnsafe: boolean): number {
  if (triggered) return 100;
  if (reportedUnsafe) return 80;
  return 0;
}

// ── LEVEL from score ─────────────────────────────────────────
export function levelFromScore(score: number): DistressLevel {
  if (score <= 30) return "SAFE";
  if (score <= 50) return "AWARE";
  if (score <= 65) return "CAUTION";
  if (score <= 80) return "DANGER";
  return "CRITICAL";
}

export const LEVEL_META: Record<DistressLevel, { color: string; bg: string; border: string; description: string }> = {
  SAFE:     { color: "#00FF88", bg: "rgba(0,255,136,0.08)",  border: "rgba(0,255,136,0.25)",  description: "All signals normal. Stay aware." },
  AWARE:    { color: "#00E5FF", bg: "rgba(0,229,255,0.08)",  border: "rgba(0,229,255,0.25)",  description: "Mild elevation. Check surroundings." },
  CAUTION:  { color: "#FFBA08", bg: "rgba(255,186,8,0.08)",  border: "rgba(255,186,8,0.25)",  description: "Elevated risk. Peers being notified." },
  DANGER:   { color: "#FF6B35", bg: "rgba(255,107,53,0.08)", border: "rgba(255,107,53,0.25)", description: "High risk. Responders alerted." },
  CRITICAL: { color: "#FF2D55", bg: "rgba(255,45,85,0.12)",  border: "rgba(255,45,85,0.4)",   description: "CRITICAL. SOS activated." },
};

// ── WEIGHTS ──────────────────────────────────────────────────
// ML blend: 15% ML + 85% rules (existing factors re-normalised).
// Rule weights sum to 0.85; mlScore fills the remaining 0.15.
const WEIGHTS = {
  location:        0.238,  // was 0.28  → ×0.85
  timeOfDay:       0.153,  // was 0.18  → ×0.85
  routeDeviation:  0.170,  // was 0.20  → ×0.85
  incidentHistory: 0.119,  // was 0.14  → ×0.85
  checkIn:         0.085,  // was 0.10  → ×0.85
  manualTrigger:   0.043,  // was 0.05  → ×0.85
  speedAnomaly:    0.043,  // was 0.05  → ×0.85
  mlScore:         0.150,  // NEW — trained ML model contribution
};

// ── MAIN EXPORT ──────────────────────────────────────────────
export function calculateDistressScore(input: DistressInput): DistressResult {
  const locationResult  = scoreLocation(input);
  const timeScore       = scoreTimeOfDay(input.hourOfDay);
  const routeResult     = scoreRouteDeviation(input);
  const historyScore    = scoreIncidentHistory(input.totalIncidents, input.recentIncidents);
  const checkInScore    = scoreCheckIn(input.lastActiveAt);
  const triggerScore    = scoreManualTrigger(input.manualTrigger, input.userReportedUnsafe);

  // Speed anomaly — uses GPS path history
  const speedAnomaly = input.locationHistory
    ? detectSpeedAnomaly(input.locationHistory)
    : { anomaly: false, maxSpeedKmh: 0 };
  const speedScore = speedAnomaly.anomaly ? 100 : 0;

  // ── ML Score (15% contribution) ─────────────────────────────
  // Runs the trained Logistic Regression model if sensor features
  // are provided. Falls back to pure rule-based if not.
  let mlScoreValue = 0;
  let mlProbability: number | undefined;
  let mlLabel: 0 | 1 | undefined;

  if (input.mlFeatures) {
    try {
      // Build a complete MLFeatureInput, filling in defaults for any
      // missing real-time sensor values from the rule-based engine context.
      const minutesSince = input.lastActiveAt
        ? (Date.now() - input.lastActiveAt.getTime()) / 60_000
        : 0;

      const fullFeatures = buildMLFeatures({
        audioRms:               input.mlFeatures.audio_rms               ?? 0,
        audioPeak:              input.mlFeatures.audio_peak              ?? 0,
        audioZcr:               input.mlFeatures.audio_zcr               ?? 0,
        audioSpectralCentroid:  input.mlFeatures.audio_spectral_centroid_hz ?? 1500,
        audioMfccMean:          input.mlFeatures.audio_mfcc_mean         ?? -15,
        audioAnomalyDetected:   (input.mlFeatures.audio_anomaly ?? 0) === 1,
        accelMagnitudeMean:     input.mlFeatures.accel_magnitude_mean    ?? 3,
        accelStd:               input.mlFeatures.accel_std               ?? 1,
        accelMax:               input.mlFeatures.accel_max               ?? 8,
        jerkMean:               input.mlFeatures.jerk_mean               ?? 3,
        motionAnomalyDetected:  (input.mlFeatures.motion_anomaly ?? 0) === 1,
        speedKmh:               input.mlFeatures.speed_kmh               ?? 5,
        routeDeviationM:        input.mlFeatures.route_deviation_m       ?? 0,
        distanceFromSafeZoneM:  input.mlFeatures.distance_from_safe_zone_m ?? 200,
        hourOfDay:              input.hourOfDay,
        minutesSinceCheckin:    minutesSince,
        incidentHistory:        input.totalIncidents,
        userTrigger:            input.manualTrigger,
        userReportedUnsafe:     input.userReportedUnsafe,
      });

      const mlResult = computeMLDistressScore(fullFeatures);
      mlProbability = mlResult.probability;
      mlLabel = mlResult.label;
      // Map 0–1 probability to 0–100 score
      mlScoreValue = Math.round(mlResult.probability * 100);
    } catch {
      // If ML inference fails for any reason, silently fall back to 0
      mlScoreValue = 0;
    }
  }

  const factors: FactorBreakdown = {
    location:        locationResult.score,
    timeOfDay:       timeScore,
    routeDeviation:  routeResult.score,
    incidentHistory: historyScore,
    checkIn:         checkInScore,
    manualTrigger:   triggerScore,
    speedAnomaly:    speedScore,
    mlScore:         mlScoreValue,
  };

  const score = Math.min(
    100,
    Math.round(
      factors.location        * WEIGHTS.location +
      factors.timeOfDay       * WEIGHTS.timeOfDay +
      factors.routeDeviation  * WEIGHTS.routeDeviation +
      factors.incidentHistory * WEIGHTS.incidentHistory +
      factors.checkIn         * WEIGHTS.checkIn +
      factors.manualTrigger   * WEIGHTS.manualTrigger +
      factors.speedAnomaly    * WEIGHTS.speedAnomaly +
      factors.mlScore         * WEIGHTS.mlScore
    )
  );

  return {
    score,
    level: levelFromScore(score),
    factors,
    locationContext: locationResult.context,
    routeContext: routeResult.routeContext,
    speedKmh: speedAnomaly.maxSpeedKmh,
    mlProbability,
    mlLabel,
  };
}

// =============================================================
// RAKSHANET — ML Distress Score Inference Engine
// Loads the trained Logistic Regression model from mlModel.json
// and runs inference entirely in TypeScript (no ML library needed).
//
// Usage:
//   import { computeMLDistressScore, MLFeatureInput } from "./mlDistressScorer";
//   const result = computeMLDistressScore(features);
//   // result.probability  → 0.0 – 1.0
//   // result.label        → 0 (safe) | 1 (distress)
//   // result.confidence   → 0.0 – 1.0
//   // result.rakshaScore  → 0 – 35 (contribution to rule-based blend)
// =============================================================

import modelData from "./mlModel.json";

// ── Model type (matches the JSON export shape) ────────────────────
interface MLModelJSON {
  metadata: {
    version: string;
    blend_weight: number;
    performance: {
      rf_f1: number;
      lr_f1: number;
      lr_auc: number;
      cv_f1_mean: number;
    };
  };
  features: string[];
  scaler: {
    mean: number[];
    std: number[];
  };
  logistic_regression: {
    intercept: number;
    coef: number[];
    threshold: number;
  };
}

const model = modelData as MLModelJSON;

// ── Input interface — mirrors the 20 raw CSV features ─────────────
export interface MLFeatureInput {
  // Audio
  audio_rms: number;
  audio_peak: number;
  audio_zcr: number;
  audio_spectral_centroid_hz: number;
  audio_mfcc_mean: number;
  audio_anomaly: 0 | 1;
  // Motion
  accel_magnitude_mean: number;
  accel_std: number;
  accel_max: number;
  jerk_mean: number;
  motion_anomaly: 0 | 1;
  // Location
  speed_kmh: number;
  route_deviation_m: number;
  distance_from_safe_zone_m: number;
  // Temporal context
  hour_of_day: number;            // 0–23
  night: 0 | 1;                   // 1 if hour is 22–4
  minutes_since_checkin: number;
  // Behavioural
  incident_history: number;       // 0–3+
  // User-initiated
  user_trigger: 0 | 1;
  user_reported_unsafe: 0 | 1;
}

export interface MLDistressResult {
  /** Raw logistic regression probability 0.0 – 1.0 */
  probability: number;
  /** Binary label (0 = safe, 1 = distress) */
  label: 0 | 1;
  /** Confidence 0.0 – 1.0 (distance from decision boundary) */
  confidence: number;
  /**
   * ML contribution to the blend score (0–35).
   * Designed to replace the audioAnomalyScore slot in the rule engine
   * when ML confidence is high.
   */
  rakshaContribution: number;
  /** Feature vector that was fed into the model (for debug) */
  featureVector: number[];
}

// ── Sigmoid function ──────────────────────────────────────────────
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// ── Build the full 25-feature vector (20 raw + 5 interactions) ────
function buildFeatureVector(input: MLFeatureInput): number[] {
  return [
    // Raw features (must match FINAL_FEATURES order in training script)
    input.audio_rms,
    input.audio_peak,
    input.audio_zcr,
    input.audio_spectral_centroid_hz,
    input.audio_mfcc_mean,
    input.audio_anomaly,
    input.accel_magnitude_mean,
    input.accel_std,
    input.accel_max,
    input.jerk_mean,
    input.motion_anomaly,
    input.speed_kmh,
    input.route_deviation_m,
    input.distance_from_safe_zone_m,
    input.hour_of_day,
    input.night,
    input.minutes_since_checkin,
    input.incident_history,
    input.user_trigger,
    input.user_reported_unsafe,
    // Interaction features (must match exact order from training)
    input.audio_anomaly * input.motion_anomaly,                             // audio_motion_combined
    input.audio_rms * input.audio_peak,                                     // rms_x_peak
    input.jerk_mean * input.accel_magnitude_mean,                           // jerk_x_accel
    input.night * input.route_deviation_m,                                  // night_x_deviation
    input.minutes_since_checkin > 90 ? 1 : 0,                              // checkin_late
  ];
}

// ── Standardize using stored scaler params ────────────────────────
function standardize(raw: number[]): number[] {
  const { mean, std } = model.scaler;
  return raw.map((val, i) => {
    const s = std[i] === 0 ? 1 : std[i]; // Guard against zero std
    return (val - mean[i]) / s;
  });
}

// ── Main inference function ───────────────────────────────────────
export function computeMLDistressScore(input: MLFeatureInput): MLDistressResult {
  // Build and standardize feature vector
  const raw    = buildFeatureVector(input);
  const scaled = standardize(raw);

  // Logistic regression: z = intercept + dot(coef, x)
  const { intercept, coef, threshold } = model.logistic_regression;
  let z = intercept;
  for (let i = 0; i < coef.length; i++) {
    z += coef[i] * scaled[i];
  }

  const probability = sigmoid(z);
  const label: 0 | 1 = probability >= threshold ? 1 : 0;

  // Confidence: how far from the decision boundary (0.5 mapped to 0–1)
  const distFromBoundary = Math.abs(probability - 0.5);
  const confidence = Math.min(1, distFromBoundary * 2);

  // ML contribution to Raksha blend:
  // Scale probability → 0–35 (same max as audio anomaly score)
  // Only contributes meaningfully when confidence is high (> 0.6)
  const rakshaContribution = confidence > 0.6
    ? Math.round(probability * 35)
    : Math.round(probability * 35 * (confidence / 0.6));

  return {
    probability,
    label,
    confidence,
    rakshaContribution,
    featureVector: raw,
  };
}

// ── Convenience: build features from existing RakshaNet engine data ─
/**
 * Helper to construct MLFeatureInput from the data already available
 * in the RakshaNet engine (audioDb, motionScore, etc.)
 * This bridges the gap between real-time sensor data and the ML model.
 */
export function buildMLFeatures(params: {
  audioRms: number;
  audioPeak: number;
  audioZcr: number;
  audioSpectralCentroid: number;
  audioMfccMean: number;
  audioAnomalyDetected: boolean;
  accelMagnitudeMean: number;
  accelStd: number;
  accelMax: number;
  jerkMean: number;
  motionAnomalyDetected: boolean;
  speedKmh: number;
  routeDeviationM: number;
  distanceFromSafeZoneM: number;
  hourOfDay: number;
  minutesSinceCheckin: number;
  incidentHistory: number;
  userTrigger: boolean;
  userReportedUnsafe: boolean;
}): MLFeatureInput {
  const hour = params.hourOfDay;
  const isNight = (hour >= 22 || hour <= 4) ? 1 : 0;

  return {
    audio_rms:                    params.audioRms,
    audio_peak:                   params.audioPeak,
    audio_zcr:                    params.audioZcr,
    audio_spectral_centroid_hz:   params.audioSpectralCentroid,
    audio_mfcc_mean:              params.audioMfccMean,
    audio_anomaly:                params.audioAnomalyDetected ? 1 : 0,
    accel_magnitude_mean:         params.accelMagnitudeMean,
    accel_std:                    params.accelStd,
    accel_max:                    params.accelMax,
    jerk_mean:                    params.jerkMean,
    motion_anomaly:               params.motionAnomalyDetected ? 1 : 0,
    speed_kmh:                    params.speedKmh,
    route_deviation_m:            params.routeDeviationM,
    distance_from_safe_zone_m:    params.distanceFromSafeZoneM,
    hour_of_day:                  hour,
    night:                        isNight as 0 | 1,
    minutes_since_checkin:        params.minutesSinceCheckin,
    incident_history:             params.incidentHistory,
    user_trigger:                 params.userTrigger ? 1 : 0,
    user_reported_unsafe:         params.userReportedUnsafe ? 1 : 0,
  };
}

// ── Export model metadata for UI display ──────────────────────────
export const ML_MODEL_META = {
  version:    model.metadata.version,
  blendWeight: model.metadata.blend_weight,
  performance: model.metadata.performance,
} as const;

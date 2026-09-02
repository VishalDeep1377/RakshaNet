// =============================================================
// RAKSHANET — GPS Location History
// Stores last 20 GPS positions in localStorage for route
// deviation, speed anomaly, and path corridor detection.
// =============================================================

const STORAGE_KEY = "raksha_location_history";
const MAX_HISTORY = 20;
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export interface LocationPoint {
  lat: number;
  lng: number;
  accuracy: number; // metres
  timestamp: number; // unix ms
}

// ── Haversine distance in metres ──────────────────────────────
export function haversineMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Speed in km/h between two points ─────────────────────────
export function computeSpeedKmh(a: LocationPoint, b: LocationPoint): number {
  // Ignore jumps between highly inaccurate points (e.g., jumping from IP location to IP location)
  if (a.accuracy > 100 || b.accuracy > 100) return 0;
  
  const distM = haversineMetres(a.lat, a.lng, b.lat, b.lng);
  // Cap to a minimum of 2 seconds to avoid divide-by-micro-duration explosion during GPS jitter
  const durationMs = Math.max(Math.abs(b.timestamp - a.timestamp), 2000);
  const durationH = durationMs / 3_600_000;
  
  const speed = distM / 1000 / durationH;
  // Hard cap at realistic speed (e.g. 250 km/h) to filter out GPS jumping glitches
  return speed > 250 ? 0 : speed;
}

// ── Read history from localStorage ───────────────────────────
export function getLocationHistory(): LocationPoint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: LocationPoint[] = JSON.parse(raw);
    const cutoff = Date.now() - MAX_AGE_MS;
    return parsed.filter((p) => p.timestamp > cutoff);
  } catch {
    return [];
  }
}

// ── Add a new point and prune old ones ───────────────────────
export function addLocationToHistory(
  lat: number,
  lng: number,
  accuracy: number
): LocationPoint[] {
  if (typeof window === "undefined") return [];
  const history = getLocationHistory();
  const newPoint: LocationPoint = { lat, lng, accuracy, timestamp: Date.now() };
  const updated = [...history, newPoint].slice(-MAX_HISTORY);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    /* storage full — ignore */
  }
  return updated;
}

// ── Clear history ─────────────────────────────────────────────
export function clearLocationHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// ── Speed anomaly detection ───────────────────────────────────
export function detectSpeedAnomaly(history: LocationPoint[]): {
  anomaly: boolean;
  maxSpeedKmh: number;
} {
  if (history.length < 2) return { anomaly: false, maxSpeedKmh: 0 };
  let maxSpeed = 0;
  for (let i = 1; i < history.length; i++) {
    const speed = computeSpeedKmh(history[i - 1], history[i]);
    if (speed > maxSpeed) maxSpeed = speed;
  }
  return { anomaly: maxSpeed > 100, maxSpeedKmh: Math.round(maxSpeed) };
}

// ── Path corridor deviation ───────────────────────────────────
export function computePathDeviation(
  history: LocationPoint[],
  anchors: Array<{ lat: number; lng: number; label: string }>
): { score: number; context: string } {
  if (history.length < 3) return { score: 35, context: "Insufficient location history" };
  if (anchors.length < 2) return { score: 35, context: "Insufficient anchor points" };

  const recent = history.slice(-5);
  let minDeviationM = Infinity;
  let corridorLabel = "";

  for (let a = 0; a < anchors.length; a++) {
    for (let b = a + 1; b < anchors.length; b++) {
      const p1 = anchors[a];
      const p2 = anchors[b];
      const avgDeviation =
        recent.reduce((sum, pt) => {
          return sum + distanceToSegmentMetres(pt.lat, pt.lng, p1.lat, p1.lng, p2.lat, p2.lng);
        }, 0) / recent.length;

      if (avgDeviation < minDeviationM) {
        minDeviationM = avgDeviation;
        corridorLabel = `${anchors[a].label} → ${anchors[b].label}`;
      }
    }
  }

  if (minDeviationM <= 300)  return { score: 5,  context: `On route: ${corridorLabel}` };
  if (minDeviationM <= 800)  return { score: 20, context: `Near route: ${corridorLabel}` };
  if (minDeviationM <= 2000) return { score: 45, context: `Slight deviation from ${corridorLabel}` };
  if (minDeviationM <= 5000) return { score: 65, context: `Off route from ${corridorLabel}` };
  return { score: 85, context: "Significant route deviation detected" };
}

// ── Point-to-line-segment distance in metres ─────────────────
function distanceToSegmentMetres(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number {
  const abLat = bx - ax;
  const abLng = by - ay;
  const abSq = abLat * abLat + abLng * abLng;
  if (abSq === 0) return haversineMetres(px, py, ax, ay);
  const t = Math.max(0, Math.min(1,
    ((px - ax) * abLat + (py - ay) * abLng) / abSq
  ));
  return haversineMetres(px, py, ax + t * abLat, ay + t * abLng);
}

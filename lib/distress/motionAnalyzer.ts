// =============================================================
// RAKSHANET — Motion Anomaly Analyzer
// Uses DeviceMotion events to detect sudden jerk, fall, or shake.
// Returns: 20 points if anomaly confirmed, 0 otherwise.
// =============================================================

// ── Thresholds ─────────────────────────────────────────────────
const JERK_THRESHOLD   = 22;     // m/s² delta to flag as sudden motion
const FALL_THRESHOLD   = 30;     // High delta = possible fall
const ANOMALY_RESET_MS = 10_000; // Auto-reset motion anomaly after 10s

export type MotionPermissionState = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export interface MotionCallbacks {
  onAnomalyDetected: (score: 20) => void;
  onAnomalyCleared: () => void;
  onPermissionChange: (state: MotionPermissionState) => void;
  onAccelerationUpdate: (magnitude: number) => void;
}

export class MotionAnomalyAnalyzer {
  private lastX = 0;
  private lastY = 0;
  private lastZ = 9.81; // approximate gravity
  private lastTime = 0;
  private callbacks: MotionCallbacks;
  private _anomalyActive = false;
  private lastAnomalyAt: number | null = null;
  private _handler: ((e: DeviceMotionEvent) => void) | null = null;
  private _resetTimer: ReturnType<typeof setInterval> | null = null;

  constructor(callbacks: MotionCallbacks) {
    this.callbacks = callbacks;
  }

  // ── Start listening for device motion ─────────────────────────
  async start(): Promise<void> {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
      this.callbacks.onPermissionChange("unavailable");
      return;
    }

    // iOS 13+ requires explicit permission request
    const DeviceMotionEventTyped = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };

    if (typeof DeviceMotionEventTyped.requestPermission === "function") {
      this.callbacks.onPermissionChange("requesting");
      try {
        const perm = await DeviceMotionEventTyped.requestPermission();
        if (perm !== "granted") {
          this.callbacks.onPermissionChange("denied");
          return;
        }
        this.callbacks.onPermissionChange("granted");
      } catch {
        this.callbacks.onPermissionChange("denied");
        return;
      }
    } else {
      // Android / desktop — permission implicit
      this.callbacks.onPermissionChange("granted");
    }

    this._handler = (e: DeviceMotionEvent) => this._handleMotion(e);
    window.addEventListener("devicemotion", this._handler);

    // Periodic reset check
    this._resetTimer = setInterval(() => this._checkReset(), 1000);
  }

  // ── Handle motion event ───────────────────────────────────────
  private _handleMotion(e: DeviceMotionEvent): void {
    const acc = e.accelerationIncludingGravity;
    if (!acc?.x || !acc?.y || !acc?.z) return;

    const now = Date.now();
    if (now - this.lastTime < 80) return; // debounce — max ~12fps

    const dx = acc.x - this.lastX;
    const dy = acc.y - this.lastY;
    const dz = acc.z - this.lastZ;
    const delta = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Report magnitude for UI visualization
    const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    this.callbacks.onAccelerationUpdate(Math.min(100, Math.round((magnitude / 25) * 100)));

    this.lastX = acc.x;
    this.lastY = acc.y;
    this.lastZ = acc.z;
    this.lastTime = now;

    const isAnomaly = delta >= JERK_THRESHOLD || delta >= FALL_THRESHOLD;

    if (isAnomaly && !this._anomalyActive) {
      this._anomalyActive = true;
      this.lastAnomalyAt = now;
      this.callbacks.onAnomalyDetected(20);
    } else if (isAnomaly && this._anomalyActive) {
      // Refresh anomaly timestamp so it stays active
      this.lastAnomalyAt = now;
    }
  }

  // ── Periodic reset check ──────────────────────────────────────
  private _checkReset(): void {
    if (!this._anomalyActive || !this.lastAnomalyAt) return;
    if (Date.now() - this.lastAnomalyAt > ANOMALY_RESET_MS) {
      this._anomalyActive = false;
      this.lastAnomalyAt = null;
      this.callbacks.onAnomalyCleared();
    }
  }

  // ── Force-clear anomaly (called on "I'm safe") ────────────────
  clearAnomaly(): void {
    this._anomalyActive = false;
    this.lastAnomalyAt = null;
    this.callbacks.onAnomalyCleared();
  }

  // ── Stop ──────────────────────────────────────────────────────
  stop(): void {
    if (this._handler) {
      window.removeEventListener("devicemotion", this._handler);
      this._handler = null;
    }
    if (this._resetTimer !== null) {
      clearInterval(this._resetTimer);
      this._resetTimer = null;
    }
    this._anomalyActive = false;
  }

  get isRunning(): boolean {
    return this._handler !== null;
  }
}

// =============================================================
// RAKSHANET — Audio Anomaly Analyzer
// Uses Web Audio API to monitor microphone amplitude in real-time.
// Detects sudden loud sounds (screaming, glass breaking, shouting).
// Returns: 35 points if anomaly confirmed, 0 otherwise.
// =============================================================

export type AudioPermissionState = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export interface AudioAnalyzerState {
  permission: AudioPermissionState;
  isAnalyzing: boolean;
  currentDb: number;       // Current estimated dB level (0–100)
  anomalyDetected: boolean;
  anomalyScore: number;    // 0 or 35
  anomalyTimestamp: number | null;
}

export interface AudioAnalyzerCallbacks {
  onAnomalyDetected: (score: 35) => void;
  onAnomalyCleared: () => void;
  onPermissionChange: (state: AudioPermissionState) => void;
  onLevelUpdate: (db: number) => void;
}

// ── Thresholds ─────────────────────────────────────────────────
const ANOMALY_THRESHOLD_RMS = 0.18;   // RMS amplitude (0–1) to flag as anomaly
const ANOMALY_SUSTAIN_MS    = 1200;   // Must be above threshold for 1.2s to confirm
const ANOMALY_RESET_MS      = 8_000;  // Auto-reset after 8s of quiet
const FFT_SIZE              = 256;
const SAMPLE_INTERVAL_MS    = 150;    // How often we sample audio

export class AudioAnomalyAnalyzer {
  private audioCtx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private aboveThresholdSince: number | null = null;
  private lastAnomalyAt: number | null = null;
  private callbacks: AudioAnalyzerCallbacks;
  private _anomalyActive = false;

  constructor(callbacks: AudioAnalyzerCallbacks) {
    this.callbacks = callbacks;
  }

  // ── Request mic permission and start ─────────────────────────
  async start(): Promise<void> {
    if (typeof window === "undefined" || !navigator.mediaDevices) {
      this.callbacks.onPermissionChange("unavailable");
      return;
    }

    this.callbacks.onPermissionChange("requesting");

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      this.callbacks.onPermissionChange("granted");
    } catch {
      this.callbacks.onPermissionChange("denied");
      return;
    }

    // Build audio graph
    this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = FFT_SIZE;
    this.analyserNode.smoothingTimeConstant = 0.4;

    this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);
    this.sourceNode.connect(this.analyserNode);

    // Start polling
    this.intervalId = setInterval(() => this._tick(), SAMPLE_INTERVAL_MS);
  }

  // ── Sample loop ───────────────────────────────────────────────
  private _tick(): void {
    if (!this.analyserNode) return;

    const buf = new Float32Array(this.analyserNode.fftSize);
    this.analyserNode.getFloatTimeDomainData(buf);

    // Compute RMS (root mean square) amplitude
    let sumSq = 0;
    for (const v of buf) sumSq += v * v;
    const rms = Math.sqrt(sumSq / buf.length);

    // Map RMS 0–0.5 → dB 0–100 for display
    const displayDb = Math.min(100, Math.round((rms / 0.5) * 100));
    this.callbacks.onLevelUpdate(displayDb);

    const now = Date.now();

    if (rms >= ANOMALY_THRESHOLD_RMS) {
      if (!this.aboveThresholdSince) {
        this.aboveThresholdSince = now;
      }
      const sustainedMs = now - this.aboveThresholdSince;

      if (sustainedMs >= ANOMALY_SUSTAIN_MS && !this._anomalyActive) {
        // Anomaly confirmed!
        this._anomalyActive = true;
        this.lastAnomalyAt = now;
        this.callbacks.onAnomalyDetected(35);
      }
    } else {
      this.aboveThresholdSince = null;

      // Auto-reset anomaly after quiet period
      if (this._anomalyActive && this.lastAnomalyAt) {
        if (now - this.lastAnomalyAt > ANOMALY_RESET_MS) {
          this._anomalyActive = false;
          this.lastAnomalyAt = null;
          this.callbacks.onAnomalyCleared();
        }
      }
    }
  }

  // ── Force-clear anomaly flag (called on "I'm safe") ──────────
  clearAnomaly(): void {
    this._anomalyActive = false;
    this.lastAnomalyAt = null;
    this.aboveThresholdSince = null;
    this.callbacks.onAnomalyCleared();
  }

  // ── Stop and cleanup ──────────────────────────────────────────
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.sourceNode?.disconnect();
    this.analyserNode?.disconnect();
    try { this.audioCtx?.close(); } catch { /* no-op */ }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.audioCtx = null;
    this.analyserNode = null;
    this.sourceNode = null;
    this.stream = null;
    this._anomalyActive = false;
    this.aboveThresholdSince = null;
  }

  get isRunning(): boolean {
    return this.intervalId !== null;
  }
}

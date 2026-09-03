// =============================================================
// RAKSHANET — Audio Anomaly Analyzer
// Uses Web Audio API to monitor microphone amplitude in real-time.
// Detects sudden loud sounds (screaming, glass breaking, shouting).
// Returns: 35 points if anomaly confirmed, 0 otherwise.
// =============================================================

export type AudioPermissionState = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export const DISTRESS_KEYWORDS = ["help", "stop", "police", "emergency", "leave me", "bachao"];

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
const FFT_ANOMALY_THRESHOLD = 60;     // Average FFT frequency amplitude (0-255)
const ANOMALY_SUSTAIN_MS    = 1200;   // Must be above threshold for 1.2s to confirm
const ANOMALY_RESET_MS      = 8_000;  // Auto-reset after 8s of quiet
const FFT_SIZE              = 512;
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
  // @ts-ignore - Web Speech API typing
  private recognition: any = null;

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

    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    // Start FFT polling
    this.intervalId = setInterval(() => this._tick(), SAMPLE_INTERVAL_MS);

    // Start Speech Recognition for keyword detection
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      
      this.recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        transcript = transcript.toLowerCase();
        
        const hasDistressWord = DISTRESS_KEYWORDS.some((word) => transcript.includes(word));
        if (hasDistressWord) {
          const now = Date.now();
          if (!this._anomalyActive) {
            this._anomalyActive = true;
            this.lastAnomalyAt = now;
            this.callbacks.onAnomalyDetected(35);
          } else {
            // Keep it active
            this.lastAnomalyAt = now;
          }
        }
      };

      this.recognition.onend = () => {
        // Auto-restart if we are still actively monitoring
        if (this.intervalId !== null && this.recognition) {
          try { this.recognition.start(); } catch (e) { /* ignore */ }
        }
      };

      try {
        this.recognition.start();
      } catch (e) {
        console.warn("Speech recognition failed to start:", e);
      }
    }
  }

  // ── Sample loop ───────────────────────────────────────────────
  private _tick(): void {
    if (!this.analyserNode) return;

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    // FFT Frequency Analysis
    this.analyserNode.getByteFrequencyData(dataArray);

    // Compute average frequency amplitude across the spectrum
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
       sum += dataArray[i];
    }
    const averageFreq = sum / bufferLength;

    // Map Frequency 0–255 → dB 0–100 for display, make it sensitive
    const displayDb = Math.min(100, Math.round((averageFreq / 100) * 100));
    this.callbacks.onLevelUpdate(displayDb);

    const now = Date.now();

    // Check if average frequency amplitude exceeds anomaly threshold
    if (averageFreq >= FFT_ANOMALY_THRESHOLD) {
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
    
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
      this.recognition = null;
    }
  }

  get isRunning(): boolean {
    return this.intervalId !== null;
  }
}

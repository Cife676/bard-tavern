/**
 * Bard's Tavern - Real-Time Server-Timestamp Audio Synchronization Engine
 */

export function computeServerPosition(
  playbackPosition: number,
  playbackUpdatedAt: string,
  isPlaying: boolean,
  playbackRate: number = 1.0
): number {
  if (!isPlaying) {
    return Math.max(0, playbackPosition);
  }

  const updatedTime = new Date(playbackUpdatedAt).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.max(0, (now - updatedTime) / 1000);
  return Math.max(0, playbackPosition + (elapsedSeconds * playbackRate));
}

export class TavernAudioManager {
  private audio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private isAudioContextInitialized = false;

  private currentTrackUrl: string | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;
  private onTimeUpdateCallback: ((time: number, duration: number) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;
  private onAutoplayBlockedCallback: ((blocked: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedVol = localStorage.getItem('bards_tavern_volume');
      if (savedVol !== null) {
        this.volume = parseFloat(savedVol);
      }
      const savedMute = localStorage.getItem('bards_tavern_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      this.initAudioElement();
    }
  }

  private initAudioElement() {
    if (this.audio) return;
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';
    this.audio.volume = this.isMuted ? 0 : this.volume;

    this.audio.addEventListener('timeupdate', () => {
      if (this.audio && this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.audio.currentTime, this.audio.duration || 0);
      }
    });

    this.audio.addEventListener('ended', () => {
      if (this.onEndedCallback) {
        this.onEndedCallback();
      }
    });
  }

  public initWebAudioContext(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.isAudioContextInitialized && this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      return true;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx || !this.audio) return false;

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(new ArrayBuffer(bufferLength));

      this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.isAudioContextInitialized = true;
      return true;
    } catch {
      // Cross-origin audio or browser restriction fallback: still plays directly
      return false;
    }
  }

  public getVisualizerData(): number[] {
    if (!this.analyser || !this.dataArray) {
      return Array(16).fill(0);
    }
    this.analyser.getByteFrequencyData(this.dataArray as unknown as Uint8Array<ArrayBuffer>);
    const result: number[] = [];
    const step = Math.max(1, Math.floor(this.dataArray.length / 16));
    for (let i = 0; i < 16; i++) {
      result.push(this.dataArray[i * step] || 0);
    }
    return result;
  }

  public syncPlayback(
    trackUrl: string | null,
    targetPosition: number,
    isPlaying: boolean,
    playbackRate: number = 1.0
  ) {
    if (!this.audio) {
      this.initAudioElement();
    }
    if (!this.audio) return;

    // Track changed
    if (trackUrl && trackUrl !== this.currentTrackUrl) {
      this.currentTrackUrl = trackUrl;
      this.audio.src = trackUrl;
      this.audio.playbackRate = playbackRate;

      const setInitialPos = () => {
        if (this.audio && targetPosition > 0) {
          this.audio.currentTime = targetPosition;
        }
      };

      if (this.audio.readyState >= 1) {
        setInitialPos();
      } else {
        this.audio.addEventListener('loadedmetadata', setInitialPos, { once: true });
      }

      if (isPlaying) {
        this.playAudio();
      } else {
        this.audio.pause();
      }
      return;
    }

    if (!trackUrl) {
      this.currentTrackUrl = null;
      this.audio.pause();
      this.audio.removeAttribute('src');
      return;
    }

    // Same track: verify drift
    const currentAudioTime = this.audio.currentTime;
    const drift = Math.abs(currentAudioTime - targetPosition);

    // If drift exceeds 0.8s, tightly re-align audience to host
    if (drift > 0.8) {
      this.audio.currentTime = targetPosition;
    }

    if (this.audio.playbackRate !== playbackRate) {
      this.audio.playbackRate = playbackRate;
    }

    if (isPlaying && this.audio.paused) {
      this.playAudio();
    } else if (!isPlaying && !this.audio.paused) {
      this.audio.pause();
    }
  }

  public playAudio(): Promise<void> {
    if (!this.audio || !this.currentTrackUrl) return Promise.resolve();

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    return this.audio.play()
      .then(() => {
        if (this.onAutoplayBlockedCallback) {
          this.onAutoplayBlockedCallback(false);
        }
      })
      .catch((err) => {
        if (err.name === 'NotAllowedError') {
          if (this.onAutoplayBlockedCallback) {
            this.onAutoplayBlockedCallback(true);
          }
        }
      });
  }

  public pauseAudio() {
    if (this.audio) {
      this.audio.pause();
    }
  }

  public seek(position: number) {
    if (this.audio) {
      this.audio.currentTime = Math.max(0, position);
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (typeof window !== 'undefined') {
      localStorage.setItem('bards_tavern_volume', this.volume.toString());
    }
    if (this.audio) {
      this.audio.volume = this.isMuted ? 0 : this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('bards_tavern_muted', this.isMuted.toString());
    }
    if (this.audio) {
      this.audio.volume = this.isMuted ? 0 : this.volume;
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getCurrentTime(): number {
    return this.audio ? this.audio.currentTime : 0;
  }

  public getDuration(): number {
    return this.audio ? (this.audio.duration || 0) : 0;
  }

  public setOnTimeUpdate(cb: (time: number, duration: number) => void) {
    this.onTimeUpdateCallback = cb;
  }

  public setOnEnded(cb: () => void) {
    this.onEndedCallback = cb;
  }

  public setOnAutoplayBlocked(cb: (blocked: boolean) => void) {
    this.onAutoplayBlockedCallback = cb;
  }

  public cleanup() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
    }
  }
}

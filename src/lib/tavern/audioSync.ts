/**
 * Bard's Tavern - Real-Time 3-Channel Layered Audio Synchronization Engine
 * Supports simultaneous playback of Music, Ambience, and Atmosphere!
 */

import { AudioChannelType } from '@/types/tavern';

export function computeServerPosition(
  playbackPosition: number,
  playbackUpdatedAt: string,
  isPlaying: boolean,
  playbackRate: number = 1.0,
  maxDuration?: number
): number {
  if (!isPlaying) {
    return Math.max(0, playbackPosition);
  }

  const updatedTime = new Date(playbackUpdatedAt).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.max(0, (now - updatedTime) / 1000);
  const target = Math.max(0, playbackPosition + (elapsedSeconds * playbackRate));

  if (maxDuration && maxDuration > 0 && target >= maxDuration) {
    return target % maxDuration;
  }
  return target;
}

interface ChannelSlot {
  audio: HTMLAudioElement;
  currentUrl: string | null;
  volume: number;
  isMuted: boolean;
  onTimeUpdate: ((time: number, duration: number) => void) | null;
  onEnded: (() => void) | null;
}

export class TavernAudioManager {
  private channels: Record<AudioChannelType, ChannelSlot>;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private isAudioContextInitialized = false;

  private onAutoplayBlockedCallback: ((blocked: boolean) => void) | null = null;

  constructor() {
    this.channels = {
      music: this.createChannelSlot('music', 0.8),
      ambience: this.createChannelSlot('ambience', 0.7),
      atmosphere: this.createChannelSlot('atmosphere', 0.6),
    };

    if (typeof window !== 'undefined') {
      this.initChannels();
    }
  }

  private createChannelSlot(type: AudioChannelType, defaultVol: number): ChannelSlot {
    let vol = defaultVol;
    let muted = false;

    if (typeof window !== 'undefined') {
      const savedVol = localStorage.getItem(`bards_tavern_volume_${type}`);
      if (savedVol !== null) vol = parseFloat(savedVol);
      const savedMute = localStorage.getItem(`bards_tavern_muted_${type}`);
      if (savedMute !== null) muted = savedMute === 'true';
    }

    const audio = typeof window !== 'undefined' ? new Audio() : (null as unknown as HTMLAudioElement);

    return {
      audio,
      currentUrl: null,
      volume: vol,
      isMuted: muted,
      onTimeUpdate: null,
      onEnded: null,
    };
  }

  private initChannels() {
    const types: AudioChannelType[] = ['music', 'ambience', 'atmosphere'];
    types.forEach((type) => {
      const slot = this.channels[type];
      if (!slot.audio) {
        slot.audio = new Audio();
      }
      slot.audio.crossOrigin = 'anonymous';
      slot.audio.preload = 'auto';
      slot.audio.volume = slot.isMuted ? 0 : slot.volume;

      slot.audio.addEventListener('timeupdate', () => {
        if (slot.onTimeUpdate) {
          slot.onTimeUpdate(slot.audio.currentTime, slot.audio.duration || 0);
        }
      });

      slot.audio.addEventListener('ended', () => {
        if (slot.onEnded) {
          slot.onEnded();
        }
      });
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
      const musicAudio = this.channels.music.audio;
      if (!AudioCtx || !musicAudio) return false;

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(new ArrayBuffer(bufferLength));

      this.sourceNode = this.audioContext.createMediaElementSource(musicAudio);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.isAudioContextInitialized = true;
      return true;
    } catch {
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

  /**
   * Universal Synchronizer for any channel (Music, Ambience, Atmosphere)
   */
  public syncChannel(
    type: AudioChannelType,
    url: string | null,
    targetPosition: number,
    isPlaying: boolean,
    loop: boolean = false
  ) {
    const slot = this.channels[type];
    if (!slot || !slot.audio) return;

    slot.audio.loop = loop;

    // Track changed or assigned
    if (url && url !== slot.currentUrl) {
      slot.currentUrl = url;
      slot.audio.src = url;

      const setInitialPos = () => {
        if (slot.audio && targetPosition > 0) {
          const maxDur = slot.audio.duration;
          const safePos = (maxDur && maxDur > 0 && targetPosition >= maxDur)
            ? Math.max(0, maxDur - 0.5)
            : targetPosition;
          slot.audio.currentTime = safePos;
        }
      };

      if (slot.audio.readyState >= 1) {
        setInitialPos();
      } else {
        slot.audio.addEventListener('loadedmetadata', setInitialPos, { once: true });
      }

      if (isPlaying) {
        this.playChannel(type);
      } else {
        slot.audio.pause();
      }
      return;
    }

    if (!url) {
      slot.currentUrl = null;
      slot.audio.pause();
      slot.audio.removeAttribute('src');
      return;
    }

    // Same track: verify drift
    const currentAudioTime = slot.audio.currentTime;
    const maxDur = slot.audio.duration;
    const safeTarget = (maxDur && maxDur > 0 && targetPosition >= maxDur)
      ? Math.max(0, maxDur - 0.5)
      : targetPosition;

    const drift = Math.abs(currentAudioTime - safeTarget);

    if (drift > 1.2) {
      slot.audio.currentTime = safeTarget;
    }

    if (isPlaying && slot.audio.paused) {
      this.playChannel(type);
    } else if (!isPlaying && !slot.audio.paused) {
      slot.audio.pause();
    }
  }

  public playChannel(type: AudioChannelType): Promise<void> {
    const slot = this.channels[type];
    if (!slot || !slot.audio || !slot.currentUrl) return Promise.resolve();

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    return slot.audio.play()
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

  public pauseChannel(type: AudioChannelType) {
    const slot = this.channels[type];
    if (slot && slot.audio) {
      slot.audio.pause();
    }
  }

  public seekChannel(type: AudioChannelType, position: number) {
    const slot = this.channels[type];
    if (slot && slot.audio) {
      const maxDur = slot.audio.duration;
      const safePos = (maxDur && maxDur > 0 && position >= maxDur)
        ? Math.max(0, maxDur - 0.5)
        : position;
      slot.audio.currentTime = Math.max(0, safePos);
    }
  }

  public setChannelVolume(type: AudioChannelType, val: number) {
    const slot = this.channels[type];
    if (!slot) return;
    slot.volume = Math.max(0, Math.min(1, val));
    if (typeof window !== 'undefined') {
      localStorage.setItem(`bards_tavern_volume_${type}`, slot.volume.toString());
    }
    if (slot.audio) {
      slot.audio.volume = slot.isMuted ? 0 : slot.volume;
    }
  }

  public toggleChannelMute(type: AudioChannelType): boolean {
    const slot = this.channels[type];
    if (!slot) return false;
    slot.isMuted = !slot.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem(`bards_tavern_muted_${type}`, slot.isMuted.toString());
    }
    if (slot.audio) {
      slot.audio.volume = slot.isMuted ? 0 : slot.volume;
    }
    return slot.isMuted;
  }

  public getChannelVolume(type: AudioChannelType): number {
    return this.channels[type]?.volume ?? 0.8;
  }

  public getChannelMuted(type: AudioChannelType): boolean {
    return this.channels[type]?.isMuted ?? false;
  }

  public getChannelTime(type: AudioChannelType): number {
    return this.channels[type]?.audio ? this.channels[type].audio.currentTime : 0;
  }

  public getChannelDuration(type: AudioChannelType): number {
    return this.channels[type]?.audio ? (this.channels[type].audio.duration || 0) : 0;
  }

  public setOnChannelTimeUpdate(type: AudioChannelType, cb: (time: number, duration: number) => void) {
    this.channels[type].onTimeUpdate = cb;
  }

  public setOnChannelEnded(type: AudioChannelType, cb: () => void) {
    this.channels[type].onEnded = cb;
  }

  // Backwards compatibility methods for default Music channel
  public syncPlayback(trackUrl: string | null, targetPosition: number, isPlaying: boolean, playbackRate: number = 1.0) {
    this.syncChannel('music', trackUrl, targetPosition, isPlaying, false);
  }

  public playAudio(): Promise<void> {
    return this.playChannel('music');
  }

  public pauseAudio() {
    this.pauseChannel('music');
  }

  public seek(position: number) {
    this.seekChannel('music', position);
  }

  public setVolume(val: number) {
    this.setChannelVolume('music', val);
  }

  public getVolume(): number {
    return this.getChannelVolume('music');
  }

  public toggleMute(): boolean {
    return this.toggleChannelMute('music');
  }

  public getIsMuted(): boolean {
    return this.getChannelMuted('music');
  }

  public getCurrentTime(): number {
    return this.getChannelTime('music');
  }

  public getDuration(): number {
    return this.getChannelDuration('music');
  }

  public setOnTimeUpdate(cb: (time: number, duration: number) => void) {
    this.setOnChannelTimeUpdate('music', cb);
  }

  public setOnEnded(cb: () => void) {
    this.setOnChannelEnded('music', cb);
  }

  public setOnAutoplayBlocked(cb: (blocked: boolean) => void) {
    this.onAutoplayBlockedCallback = cb;
  }

  public cleanup() {
    const types: AudioChannelType[] = ['music', 'ambience', 'atmosphere'];
    types.forEach((type) => {
      const slot = this.channels[type];
      if (slot.audio) {
        slot.audio.pause();
        slot.audio.src = '';
      }
    });

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
    }
  }
}

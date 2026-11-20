'use client';

import React, { useState, useRef } from 'react';
import { useTavern } from '@/context/TavernContext';
import { Track } from '@/types/tavern';
import { AMBIENCE_PRESETS, ATMOSPHERE_PRESETS } from '@/lib/tavern/soundscapes';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Upload,
  Trash2,
  Share2,
  LogOut,
  Crown,
  Users,
  Dices,
  Sparkles,
  Lock,
  Music,
  Check,
  Disc,
  Flame,
  Send,
  ShieldAlert,
  FlameKindling,
  Pencil,
  Repeat,
  Repeat1,
  Layers,
  CloudRain,
} from 'lucide-react';

export const LobbyRoom: React.FC = () => {
  const {
    userSession,
    activeLobby,
    tracks,
    activeTrack,
    isHost,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    isAutoplayBlocked,
    unlockAutoplay,
    members,
    activities,
    visualizerData,
    loopMode,
    toggleLoopMode,
    channels,
    setChannelTrack,
    toggleChannelPlay,
    seekChannel,
    setChannelVolume,
    toggleChannelMute,
    leaveLobby,
    hostPlay,
    hostPause,
    hostSeek,
    hostSelectTrack,
    hostNextTrack,
    hostPrevTrack,
    hostUploadTrack,
    hostDeleteTrack,
    hostTransfer,
    hostRenameLobby,
    hostCloseLobby,
    rollDualityDice,
    sendTavernToast,
    hearthSoundActive,
    toggleHearthSound,
  } = useTavern();

  // Local state
  const [copiedLink, setCopiedLink] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadArtist, setUploadArtist] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [toastInput, setToastInput] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamedTitle, setRenamedTitle] = useState(activeLobby?.name || '');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!activeLobby) return null;

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/?lobby=${activeLobby.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Select an MP3 or WAV audio scroll first.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      await hostUploadTrack(selectedFile, uploadTitle.trim(), uploadArtist.trim() || 'Bard');
      setSelectedFile(null);
      setUploadTitle('');
      setUploadArtist('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (renamedTitle.trim() && isHost) {
      await hostRenameLobby(renamedTitle.trim());
      setIsRenaming(false);
    }
  };

  const handleToastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (toastInput.trim()) {
      sendTavernToast(toastInput.trim());
      setToastInput('');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Autoplay Unlock Notice (Browser Policy Protection) */}
      {isAutoplayBlocked && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#801b31] via-[#591423] to-[#b37e20] text-white flex flex-wrap items-center justify-between gap-4 shadow-xl border border-[#e6c875]/50 animate-bounce">
          <div className="flex items-center gap-3">
            <Flame className="w-6 h-6 text-[#fce8a6]" />
            <div>
              <h4 className="font-serif font-bold text-sm">The Bard&apos;s Song is in Motion!</h4>
              <p className="text-xs text-neutral-200">
                Your browser paused audio playback until you pull up your seat.
              </p>
            </div>
          </div>
          <button
            onClick={unlockAutoplay}
            className="px-5 py-2 rounded-xl bg-white text-[#801b31] font-black text-xs uppercase tracking-wider shadow-lg hover:bg-[#fae5b5] transition cursor-pointer"
          >
            Tune In &amp; Listen
          </button>
        </div>
      )}

      {/* Lobby Hall Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#211016] via-[#1a0c12] to-[#12080c] border border-[#521c27] shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            {isRenaming && isHost ? (
              <form onSubmit={handleRenameSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={renamedTitle}
                  onChange={(e) => setRenamedTitle(e.target.value)}
                  className="bg-[#0f0709] border border-[#d4af37] text-[#fae5b5] font-serif text-lg font-bold px-3 py-1 rounded-lg outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#801b31] text-xs font-bold text-white rounded-lg hover:bg-[#9e2540]"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsRenaming(false)}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl md:text-2xl font-black text-[#fae5b5]">
                  {activeLobby.name}
                </h2>
                {isHost && (
                  <button
                    onClick={() => {
                      setRenamedTitle(activeLobby.name);
                      setIsRenaming(true);
                    }}
                    title="Rename Tavern Hall"
                    className="p-1 text-neutral-400 hover:text-[#d4af37] transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <button
              onClick={handleCopyLink}
              title="Copy shareable campaign link"
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#2e1019] hover:bg-[#471624] text-[#e6c875] border border-[#571e2c] text-xs font-mono transition cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{activeLobby.code}</span>
              <span className="text-[10px] text-neutral-400">{copiedLink ? 'Copied!' : 'Share'}</span>
            </button>

            {isHost ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#541624] text-[#fce8a6] border border-[#801b31] flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Tavern Host</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#1a0e13] text-neutral-400 border border-[#38161f]">
                Listening as Adventurer
              </span>
            )}
          </div>

          {activeLobby.description && (
            <p className="text-xs text-neutral-400 max-w-2xl">{activeLobby.description}</p>
          )}
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={() => {
                if (confirm('Close this tavern hall for all adventurers?')) {
                  hostCloseLobby();
                }
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-300 hover:text-red-100 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 transition cursor-pointer"
            >
              Close Hall
            </button>
          )}

          <button
            onClick={leaveLobby}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-[#1a0f14] hover:bg-[#2e1019] border border-[#38161f] transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave Table</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Player Console & Repertoire (Col 1-2) | Adventurers & Activity (Col 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Turntable & Playlist */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bardic Turntable / Master Player Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#241219] via-[#1a0c12] to-[#12080c] border border-[#5c1c28] p-6 shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#801b31]/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              {/* Rotating Bardic Vinyl / Medallion */}
              <div className="relative shrink-0">
                <div
                  className={`w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-tr from-[#12070a] via-[#260f17] to-[#3d1520] border-4 border-[#d4af37]/70 shadow-2xl flex items-center justify-center transition-transform ${
                    isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
                  }`}
                >
                  <div className="w-20 h-20 rounded-full bg-[#170a0f] border-2 border-[#e6c875]/40 flex items-center justify-center">
                    <Disc className="w-10 h-10 text-[#d4af37]" />
                  </div>
                </div>
                {/* Center glowing crystal */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className={`w-4 h-4 rounded-full ${
                      isPlaying
                        ? 'bg-amber-400 shadow-[0_0_12px_#d4af37] animate-pulse'
                        : 'bg-[#521724]'
                    }`}
                  />
                </div>
              </div>

              {/* Track Metadata & Visualizer Wave */}
              <div className="flex-1 w-full text-center md:text-left space-y-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-[#38121c] text-[#fce8a6] border border-[#6b1e2e]">
                    <Sparkles className="w-3 h-3 text-[#d4af37]" />
                    <span>Real-Time Sync • Supabase Engine</span>
                  </div>
                  <h3 className="font-serif text-xl md:text-2xl font-black text-[#fae5b5] truncate">
                    {activeTrack ? activeTrack.title : 'Chamber Silence'}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {activeTrack ? `By ${activeTrack.artist}` : 'The tavern awaits the bard’s first note'}
                  </p>
                </div>

                {/* Animated Candlelight Waveform Visualizer */}
                <div className="flex items-end justify-center md:justify-start gap-1 h-10 py-1">
                  {visualizerData.map((val, idx) => {
                    const heightPercent = isPlaying ? Math.max(12, Math.min(100, (val / 255) * 100)) : 10;
                    return (
                      <div
                        key={idx}
                        style={{ height: `${heightPercent}%` }}
                        className={`w-1.5 rounded-full transition-all duration-75 ${
                          isPlaying
                            ? 'bg-gradient-to-t from-[#801b31] via-[#d4af37] to-[#ffea9f]'
                            : 'bg-[#3d1520]'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Scrubber Progress Bar */}
            <div className="mt-6 space-y-1.5">
              <div className="relative flex items-center group">
                <input
                  type="range"
                  min="0"
                  max={duration > 0 ? duration : 100}
                  step="0.5"
                  value={Math.min(currentTime, duration > 0 ? duration : 100)}
                  disabled={!isHost}
                  onChange={(e) => {
                    if (isHost) {
                      hostSeek(parseFloat(e.target.value));
                    }
                  }}
                  className={`w-full h-2 rounded-lg appearance-none bg-[#12080c] border border-[#38141e] accent-[#d4af37] outline-none ${
                    isHost ? 'cursor-pointer' : 'cursor-default'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span>{formatTime(Math.min(currentTime, duration > 0 ? duration : currentTime))}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls & Local Volume */}
            <div className="mt-4 pt-4 border-t border-[#421520] flex flex-wrap items-center justify-between gap-4">
              {/* Host Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={hostPrevTrack}
                  disabled={!isHost || tracks.length === 0}
                  className="p-2.5 rounded-xl bg-[#1f0e15] hover:bg-[#331420] text-neutral-300 hover:text-white border border-[#421723] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Previous Track (Host only)"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                {isPlaying ? (
                  <button
                    onClick={hostPause}
                    disabled={!isHost}
                    className="p-3.5 rounded-2xl bg-gradient-to-br from-[#801b31] to-[#a82540] hover:brightness-110 text-white shadow-xl shadow-[#801b31]/40 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer transform active:scale-95"
                    title="Pause Shared Melodies"
                  >
                    <Pause className="w-6 h-6 fill-white" />
                  </button>
                ) : (
                  <button
                    onClick={hostPlay}
                    disabled={!isHost || tracks.length === 0}
                    className="p-3.5 rounded-2xl bg-gradient-to-br from-[#ba8623] via-[#d4af37] to-[#801b31] hover:brightness-110 text-white shadow-xl shadow-[#ba8623]/40 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer transform active:scale-95"
                    title="Play Shared Melodies"
                  >
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  </button>
                )}

                <button
                  onClick={hostNextTrack}
                  disabled={!isHost || tracks.length === 0}
                  className="p-2.5 rounded-xl bg-[#1f0e15] hover:bg-[#331420] text-neutral-300 hover:text-white border border-[#421723] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Next Track (Host only)"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                {/* Loop Option Button */}
                <button
                  onClick={() => {
                    if (isHost) toggleLoopMode();
                  }}
                  disabled={!isHost}
                  className={`p-2.5 rounded-xl border transition cursor-pointer relative ${
                    loopMode !== 'off'
                      ? 'bg-[#471822] text-[#fce8a6] border-[#8a2438] shadow-md shadow-red-950/60'
                      : 'bg-[#1f0e15] hover:bg-[#331420] text-neutral-400 hover:text-white border-[#421723]'
                  } ${!isHost ? 'cursor-default opacity-80' : ''}`}
                  title={
                    isHost
                      ? loopMode === 'track'
                        ? 'Loop Mode: Repeating Current Track (Click to switch)'
                        : loopMode === 'all'
                        ? 'Loop Mode: Repeating Entire Playlist (Click to switch)'
                        : 'Loop Mode: Off (Click to enable)'
                      : loopMode === 'track'
                      ? 'Host set: Repeating Current Track'
                      : loopMode === 'all'
                      ? 'Host set: Repeating Playlist'
                      : 'Loop: Off'
                  }
                >
                  {loopMode === 'track' ? (
                    <Repeat1 className="w-4 h-4 text-[#d4af37]" />
                  ) : (
                    <Repeat className={`w-4 h-4 ${loopMode === 'all' ? 'text-[#d4af37]' : ''}`} />
                  )}
                  {loopMode === 'track' && (
                    <span className="absolute -top-1 -right-1 text-[9px] font-black bg-[#d4af37] text-black rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                      1
                    </span>
                  )}
                </button>

                {!isHost && (
                  <span className="text-xs text-neutral-400 italic">
                    (Host commands playback)
                  </span>
                )}
              </div>

              {/* Local Individual Volume & Hearth Ambiance */}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleHearthSound}
                  title="Toggle cozy background hearth crackle"
                  className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition cursor-pointer ${
                    hearthSoundActive
                      ? 'bg-[#471822] text-[#fce8a6] border-[#8a2438]'
                      : 'bg-[#170c11] text-neutral-400 border-[#38161e]'
                  }`}
                >
                  <FlameKindling className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Hearthfire</span>
                </button>

                <div className="flex items-center gap-2 bg-[#170c11] px-3 py-1.5 rounded-xl border border-[#38161e]">
                  <button onClick={toggleMute} className="text-neutral-300 hover:text-white">
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-[#d4af37]" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-20 md:w-24 accent-[#d4af37] bg-neutral-900 cursor-pointer h-1.5 rounded-lg"
                    title="Your local volume only"
                  />
                  <span className="text-[10px] font-mono text-neutral-400 w-8">
                    {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3-Channel Layered Multi-Track Soundscape Mixer */}
          <div className="rounded-2xl bg-gradient-to-b from-[#211017] via-[#190c12] to-[#12070b] border border-[#5c1c28] p-5 shadow-2xl space-y-5">
            {/* Mixer Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#3d1520]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#3d1420] text-[#fce8a6] border border-[#6b1e2e]">
                  <Layers className="w-5 h-5 text-[#d4af37]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif text-base font-bold text-[#fae5b5]">
                      3-Channel Layered Soundscape Mixer
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-950/70 text-[#fce8a6] border border-[#d4af37]/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Simultaneous Playback
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Play Music, Environmental Ambience, and Hearth Atmosphere all at the same time
                  </p>
                </div>
              </div>

              {/* Master Play / Pause All 3 Channels (Host Only) */}
              {isHost && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!channels.music.isPlaying) toggleChannelPlay('music');
                      if (!channels.ambience.isPlaying) toggleChannelPlay('ambience');
                      if (!channels.atmosphere.isPlaying) toggleChannelPlay('atmosphere');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#801b31] to-[#ba8623] hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer transition transform active:scale-95"
                    title="Play all 3 channels in harmony"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Play All 3</span>
                  </button>
                  <button
                    onClick={() => {
                      if (channels.music.isPlaying) toggleChannelPlay('music');
                      if (channels.ambience.isPlaying) toggleChannelPlay('ambience');
                      if (channels.atmosphere.isPlaying) toggleChannelPlay('atmosphere');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#260f17] hover:bg-[#381522] border border-[#521c27] text-neutral-300 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition transform active:scale-95"
                    title="Pause all 3 channels"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause All</span>
                  </button>
                </div>
              )}
            </div>

            {/* Channels Grid / Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Channel 1: Music */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  channels.music.isPlaying
                    ? 'bg-gradient-to-b from-[#2e121c] to-[#1c0a11] border-[#8a2438] shadow-lg shadow-red-950/40'
                    : 'bg-[#150a0e] border-[#2e1017]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5" />
                    <span>Ch 1 • Main Score</span>
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      channels.music.isPlaying
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {channels.music.isPlaying ? 'Playing' : 'Paused'}
                  </span>
                </div>

                <p className="text-xs font-bold text-[#fae5b5] truncate mb-1" title={channels.music.trackTitle}>
                  {channels.music.trackTitle}
                </p>
                <p className="text-[10px] text-neutral-400 truncate mb-3">
                  {activeTrack?.artist ? `By ${activeTrack.artist}` : 'Repertoire Selection'}
                </p>

                {/* Ch 1 Controls */}
                <div className="space-y-3 pt-2 border-t border-[#3b141e]">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleChannelPlay('music')}
                      disabled={!isHost}
                      className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                        channels.music.isPlaying
                          ? 'bg-[#801b31] text-white hover:bg-[#9c233e]'
                          : 'bg-[#d4af37] text-neutral-900 hover:bg-[#e6c875]'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {channels.music.isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-white" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                      <span>{channels.music.isPlaying ? 'Pause' : 'Play'}</span>
                    </button>

                    <span className="text-[10px] font-mono text-neutral-400">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-2 bg-[#0e0608] px-2.5 py-1.5 rounded-lg border border-[#2b0f16]">
                    <button
                      onClick={() => toggleChannelMute('music')}
                      className="text-neutral-400 hover:text-white"
                      title={channels.music.isMuted ? 'Unmute' : 'Mute'}
                    >
                      {channels.music.isMuted || channels.music.volume === 0 ? (
                        <VolumeX className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-[#d4af37]" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={channels.music.isMuted ? 0 : channels.music.volume}
                      onChange={(e) => setChannelVolume('music', parseFloat(e.target.value))}
                      className="w-full accent-[#d4af37] bg-neutral-900 cursor-pointer h-1 rounded-lg"
                      title="Music local volume"
                    />
                    <span className="text-[9px] font-mono text-neutral-400 w-6 text-right">
                      {channels.music.isMuted ? '0%' : `${Math.round(channels.music.volume * 100)}%`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Channel 2: Ambience */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  channels.ambience.isPlaying
                    ? 'bg-gradient-to-b from-[#2e121c] to-[#1c0a11] border-[#8a2438] shadow-lg shadow-red-950/40'
                    : 'bg-[#150a0e] border-[#2e1017]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                    <CloudRain className="w-3.5 h-3.5" />
                    <span>Ch 2 • Ambience</span>
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      channels.ambience.isPlaying
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {channels.ambience.isPlaying ? 'Playing' : 'Paused'}
                  </span>
                </div>

                <p className="text-xs font-bold text-[#fae5b5] truncate mb-1" title={channels.ambience.trackTitle}>
                  {channels.ambience.trackTitle}
                </p>
                <p className="text-[10px] text-neutral-400 truncate mb-2">
                  Looping Environmental Soundscape
                </p>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {AMBIENCE_PRESETS.map((preset) => {
                    const isSelected = channels.ambience.trackId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        disabled={!isHost}
                        onClick={() => {
                          setChannelTrack('ambience', {
                            id: preset.id,
                            title: preset.title,
                            url: preset.audio_url,
                          });
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 transition ${
                          isSelected
                            ? 'bg-[#801b31] text-[#fce8a6] border border-[#d4af37] font-bold shadow-sm'
                            : 'bg-[#1e0c13] hover:bg-[#2b101a] text-neutral-300 border border-[#3d1420]'
                        } disabled:cursor-default`}
                        title={isHost ? `Set ambience to ${preset.title}` : preset.title}
                      >
                        <span>{preset.icon}</span>
                        <span className="truncate max-w-[65px]">{preset.title.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Ch 2 Controls */}
                <div className="space-y-3 pt-2 border-t border-[#3b141e]">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleChannelPlay('ambience')}
                      disabled={!isHost}
                      className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                        channels.ambience.isPlaying
                          ? 'bg-[#801b31] text-white hover:bg-[#9c233e]'
                          : 'bg-[#d4af37] text-neutral-900 hover:bg-[#e6c875]'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {channels.ambience.isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-white" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                      <span>{channels.ambience.isPlaying ? 'Pause' : 'Play'}</span>
                    </button>

                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300/80">
                      Infinite Loop
                    </span>
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-2 bg-[#0e0608] px-2.5 py-1.5 rounded-lg border border-[#2b0f16]">
                    <button
                      onClick={() => toggleChannelMute('ambience')}
                      className="text-neutral-400 hover:text-white"
                      title={channels.ambience.isMuted ? 'Unmute' : 'Mute'}
                    >
                      {channels.ambience.isMuted || channels.ambience.volume === 0 ? (
                        <VolumeX className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-[#d4af37]" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={channels.ambience.isMuted ? 0 : channels.ambience.volume}
                      onChange={(e) => setChannelVolume('ambience', parseFloat(e.target.value))}
                      className="w-full accent-[#d4af37] bg-neutral-900 cursor-pointer h-1 rounded-lg"
                      title="Ambience local volume"
                    />
                    <span className="text-[9px] font-mono text-neutral-400 w-6 text-right">
                      {channels.ambience.isMuted ? '0%' : `${Math.round(channels.ambience.volume * 100)}%`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Channel 3: Atmosphere */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  channels.atmosphere.isPlaying
                    ? 'bg-gradient-to-b from-[#2e121c] to-[#1c0a11] border-[#8a2438] shadow-lg shadow-red-950/40'
                    : 'bg-[#150a0e] border-[#2e1017]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ch 3 • Atmosphere</span>
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      channels.atmosphere.isPlaying
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {channels.atmosphere.isPlaying ? 'Playing' : 'Paused'}
                  </span>
                </div>

                <p className="text-xs font-bold text-[#fae5b5] truncate mb-1" title={channels.atmosphere.trackTitle}>
                  {channels.atmosphere.trackTitle}
                </p>
                <p className="text-[10px] text-neutral-400 truncate mb-2">
                  Warm Hearth &amp; Torchlight Drone
                </p>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {ATMOSPHERE_PRESETS.map((preset) => {
                    const isSelected = channels.atmosphere.trackId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        disabled={!isHost}
                        onClick={() => {
                          setChannelTrack('atmosphere', {
                            id: preset.id,
                            title: preset.title,
                            url: preset.audio_url,
                          });
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 transition ${
                          isSelected
                            ? 'bg-[#801b31] text-[#fce8a6] border border-[#d4af37] font-bold shadow-sm'
                            : 'bg-[#1e0c13] hover:bg-[#2b101a] text-neutral-300 border border-[#3d1420]'
                        } disabled:cursor-default`}
                        title={isHost ? `Set atmosphere to ${preset.title}` : preset.title}
                      >
                        <span>{preset.icon}</span>
                        <span className="truncate max-w-[65px]">{preset.title.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Ch 3 Controls */}
                <div className="space-y-3 pt-2 border-t border-[#3b141e]">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleChannelPlay('atmosphere')}
                      disabled={!isHost}
                      className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                        channels.atmosphere.isPlaying
                          ? 'bg-[#801b31] text-white hover:bg-[#9c233e]'
                          : 'bg-[#d4af37] text-neutral-900 hover:bg-[#e6c875]'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {channels.atmosphere.isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-white" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                      <span>{channels.atmosphere.isPlaying ? 'Pause' : 'Play'}</span>
                    </button>

                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300/80">
                      Infinite Loop
                    </span>
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-2 bg-[#0e0608] px-2.5 py-1.5 rounded-lg border border-[#2b0f16]">
                    <button
                      onClick={() => toggleChannelMute('atmosphere')}
                      className="text-neutral-400 hover:text-white"
                      title={channels.atmosphere.isMuted ? 'Unmute' : 'Mute'}
                    >
                      {channels.atmosphere.isMuted || channels.atmosphere.volume === 0 ? (
                        <VolumeX className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-[#d4af37]" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={channels.atmosphere.isMuted ? 0 : channels.atmosphere.volume}
                      onChange={(e) => setChannelVolume('atmosphere', parseFloat(e.target.value))}
                      className="w-full accent-[#d4af37] bg-neutral-900 cursor-pointer h-1 rounded-lg"
                      title="Atmosphere local volume"
                    />
                    <span className="text-[9px] font-mono text-neutral-400 w-6 text-right">
                      {channels.atmosphere.isMuted ? '0%' : `${Math.round(channels.atmosphere.volume * 100)}%`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tavern Repertoire & Host Audio Upload */}
          <div className="rounded-2xl bg-gradient-to-b from-[#1a0e13] via-[#140a0e] to-[#0f070a] border border-[#471822] p-5 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-[#d4af37]" />
                <h3 className="font-serif text-base font-bold text-[#fae5b5]">
                  Tavern Repertoire ({tracks.length} Scrolls)
                </h3>
              </div>
              <span className="text-xs text-neutral-400">
                MP3 / WAV Shared Playlist
              </span>
            </div>

            {/* Host Audio Upload Dropzone */}
            {isHost && (
              <form
                onSubmit={handleUploadSubmit}
                className="p-4 rounded-xl bg-[#211117] border border-[#5c1c28] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#fce8a6] flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload New Audio Scroll (Host Only)</span>
                  </h4>
                  <span className="text-[11px] text-neutral-400">MP3 / WAV up to 50MB</span>
                </div>

                {uploadError && (
                  <p className="text-xs text-red-300 bg-red-950/70 p-2 rounded-lg border border-red-800">
                    {uploadError}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Track Title (e.g. Battle of Gloom Hollow)"
                    className="bg-[#12080c] border border-[#421723] rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-[#d4af37]"
                  />
                  <input
                    type="text"
                    value={uploadArtist}
                    onChange={(e) => setUploadArtist(e.target.value)}
                    placeholder="Composer / Tag (e.g. Combat, Tavern, Forest)"
                    className="bg-[#12080c] border border-[#421723] rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg,audio/*"
                    className="text-xs text-neutral-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#3d1520] file:text-[#fce8a6] hover:file:bg-[#521b2b] file:cursor-pointer"
                  />

                  <button
                    type="submit"
                    disabled={!selectedFile || isUploading}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#801b31] to-[#ba8623] hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-40 flex items-center gap-1.5 cursor-pointer transition shadow-md"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Uploading...' : 'Add to Repertoire'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tracklist Table */}
            {tracks.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#12070a] border border-[#2b1016]">
                <p className="text-xs text-neutral-400">
                  No musical scrolls in the repertoire yet.{' '}
                  {isHost ? 'Upload an MP3 or WAV above to begin.' : 'Wait for the host to provide music.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                {tracks.map((track, index) => {
                  const isActive = track.id === activeLobby.current_track_id;
                  return (
                    <div
                      key={track.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition ${
                        isActive
                          ? 'bg-[#3b1420] border-[#8a2438] text-white shadow-md'
                          : 'bg-[#140a0e] border-[#2b1016] text-neutral-300 hover:bg-[#210f16]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-5 text-center font-mono text-xs text-neutral-500">
                          {isActive && isPlaying ? (
                            <Flame className="w-4 h-4 text-amber-400 animate-pulse mx-auto" />
                          ) : (
                            index + 1
                          )}
                        </span>

                        <div className="min-w-0">
                          <p
                            onClick={() => {
                              if (isHost) hostSelectTrack(track.id);
                            }}
                            className={`text-xs md:text-sm font-semibold truncate ${
                              isHost ? 'cursor-pointer hover:text-[#fae5b5]' : ''
                            } ${isActive ? 'text-[#fae5b5]' : 'text-neutral-200'}`}
                            title={isHost ? 'Click to play this track' : undefined}
                          >
                            {track.title}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {track.artist} • Added by {track.added_by}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-xs text-neutral-400">
                          {formatTime(track.duration)}
                        </span>

                        {isHost && (
                          <div className="flex items-center gap-1">
                            {!isActive && (
                              <button
                                onClick={() => hostSelectTrack(track.id)}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition"
                                title="Play track"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                if (confirm(`Remove "${track.title}" from repertoire?`)) {
                                  hostDeleteTrack(track.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-white/5 transition"
                              title="Delete track"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Adventurers Roster & Daggerheart Interactive Table */}
        <div className="space-y-6">
          {/* Adventurers at the Hearth (Realtime Presence) */}
          <div className="rounded-2xl bg-gradient-to-b from-[#1a0e13] via-[#140a0e] to-[#0f070a] border border-[#471822] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#38141e]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#d4af37]" />
                <h3 className="font-serif text-sm font-bold text-[#fae5b5]">
                  Adventurers at Table ({members.length})
                </h3>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {members.map((member) => {
                const isMemberHost = member.session_id === activeLobby.host_session_id;
                const isSelf = member.session_id === userSession.sessionId;

                return (
                  <div
                    key={member.session_id}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#140a0e] border border-[#260e15]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          isMemberHost
                            ? 'bg-[#5c1727] text-[#fce8a6] border border-[#d4af37]'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {isMemberHost ? <Crown className="w-3.5 h-3.5 text-[#d4af37]" /> : member.display_name.charAt(0)}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-neutral-200 truncate flex items-center gap-1.5">
                          <span>{member.display_name}</span>
                          {isSelf && (
                            <span className="text-[10px] text-neutral-400 font-normal">
                              (You)
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          {isMemberHost ? 'Tavern Host' : 'Listener'}
                        </p>
                      </div>
                    </div>

                    {/* Transfer Host Option (Only current host can transfer to another player) */}
                    {isHost && !isMemberHost && (
                      <button
                        onClick={() => {
                          if (confirm(`Pass the Tavern Host mantle to ${member.display_name}?`)) {
                            hostTransfer(member.session_id, member.display_name);
                          }
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#3d1520] hover:bg-[#591b29] text-[#fce8a6] border border-[#692130] transition cursor-pointer"
                        title="Pass Host mantle"
                      >
                        Pass Host
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daggerheart Duality Dice Roller */}
          <div className="rounded-2xl bg-gradient-to-b from-[#211016] via-[#170c11] to-[#12080c] border border-[#521c27] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dices className="w-4 h-4 text-[#d4af37]" />
                <h3 className="font-serif text-sm font-bold text-[#fae5b5]">
                  Daggerheart Duality Dice
                </h3>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono">
                d12 Hope &amp; Fear
              </span>
            </div>

            <p className="text-xs text-neutral-300">
              Roll the golden Hope die and crimson Fear die to test your fate during the music!
            </p>

            <button
              onClick={rollDualityDice}
              className="w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-[#801b31] via-[#aa2741] to-[#ba8623] hover:brightness-110 text-white shadow-lg shadow-[#801b31]/30 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-95"
            >
              <Dices className="w-4 h-4" />
              <span>Roll Hope &amp; Fear</span>
            </button>
          </div>

          {/* Tavern Hearth Activity & Toasts */}
          <div className="rounded-2xl bg-gradient-to-b from-[#1a0e13] via-[#140a0e] to-[#0f070a] border border-[#471822] p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#38141e]">
              <h3 className="font-serif text-sm font-bold text-[#fae5b5]">
                Tavern Chronicles &amp; Toasts
              </h3>
              <span className="text-[10px] text-neutral-500">Live Feed</span>
            </div>

            <div className="space-y-2 h-44 overflow-y-auto pr-1 text-xs">
              {activities.length === 0 ? (
                <p className="text-neutral-500 italic text-[11px] py-4 text-center">
                  The chronicle parchment is fresh...
                </p>
              ) : (
                activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-2 rounded-lg bg-[#140a0e] border border-[#2b1016] text-neutral-300"
                  >
                    <p className="leading-snug">
                      <strong className="text-[#fce8a6]">{act.author}</strong>{' '}
                      <span className="text-neutral-300">{act.text}</span>
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Quick Toast input */}
            <form onSubmit={handleToastSubmit} className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={toastInput}
                onChange={(e) => setToastInput(e.target.value)}
                placeholder="Raise a toast or whisper a note..."
                maxLength={100}
                className="flex-1 bg-[#0f070a] border border-[#3b141e] rounded-xl px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-[#d4af37]"
              />
              <button
                type="submit"
                disabled={!toastInput.trim()}
                className="p-2 bg-[#4a1622] hover:bg-[#631e2e] text-[#fce8a6] rounded-xl disabled:opacity-30 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

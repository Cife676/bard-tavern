'use client';

import React, { useState } from 'react';
import { useTavern } from '@/context/TavernContext';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { UserIdentityModal } from './UserIdentityModal';
import { Flame, FlameKindling, Volume2, VolumeX, Shield, User, Radio, Sparkles } from 'lucide-react';

interface Props {
  onToggleGMCockpit?: () => void;
  showGMCockpitToggle?: boolean;
}

export const TavernNavbar: React.FC<Props> = ({
  onToggleGMCockpit,
  showGMCockpitToggle = true,
}) => {
  const {
    userSession,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    hearthSoundActive,
    toggleHearthSound,
    activeLobby,
  } = useTavern();

  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [showVolumePopup, setShowVolumePopup] = useState(false);
  const isLiveSupabase = isSupabaseConfigured();

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#140b0f]/95 backdrop-blur-md border-b border-[#4d1f27]/80 px-4 py-3 text-neutral-100 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Campaign Subtitle */}
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#801b31] via-[#5c1322] to-[#b37e20] flex items-center justify-center shadow-lg border border-[#e6c875]/40 transition group-hover:scale-105">
                <Flame className="w-5 h-5 text-[#fce8a6] animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-[#140b0f]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-lg md:text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#fae5b5] via-[#f3c875] to-[#c78b27]">
                  Bard&apos;s Tavern
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-[#3d151e] text-[#fce8a6] border border-[#782836]">
                  Daggerheart TTRPG
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-sans">
                Real-Time Synchronized Campaign Audio
              </p>
            </div>
          </div>

          {/* Controls & User Profile Badge */}
          <div className="flex items-center flex-wrap gap-2 md:gap-3">
            {/* Supabase status indicator */}
            <div
              title={
                isLiveSupabase
                  ? 'Connected to Supabase Realtime & Storage'
                  : 'Running in Local Hearth Mode. Configure NEXT_PUBLIC_SUPABASE_URL for public internet multiplayer.'
              }
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border bg-[#1c0f14] border-[#4d1f27]"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isLiveSupabase ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-neutral-300">
                {isLiveSupabase ? 'Supabase Live' : 'Hearth Mesh'}
              </span>
            </div>

            {/* Cozy Hearth Crackle toggle */}
            <button
              onClick={toggleHearthSound}
              title={hearthSoundActive ? 'Extinguish hearth fire ambience' : 'Kindle crackling tavern hearthfire ambience'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                hearthSoundActive
                  ? 'bg-[#471822] text-[#fce8a6] border-[#8a2438] shadow-md shadow-red-950/60'
                  : 'bg-[#1c0f14] text-neutral-400 border-[#38161e] hover:text-neutral-200'
              }`}
            >
              <FlameKindling className={`w-4 h-4 ${hearthSoundActive ? 'text-amber-400 animate-bounce' : ''}`} />
              <span className="hidden sm:inline">Hearth</span>
            </button>

            {/* Local Volume Master Popover */}
            <div className="relative">
              <button
                onClick={() => setShowVolumePopup(!showVolumePopup)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c0f14] border border-[#38161e] text-neutral-300 hover:text-white transition cursor-pointer text-xs font-semibold"
                title="Adjust your local listening volume"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#e6c875]" />
                )}
                <span className="hidden sm:inline">{isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}</span>
              </button>

              {showVolumePopup && (
                <div className="absolute right-0 mt-2 p-3 w-48 bg-[#211218] border border-[#5c1c28] rounded-xl shadow-2xl z-50 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs text-neutral-300 mb-2">
                    <span>Local Volume</span>
                    <button
                      onClick={toggleMute}
                      className="text-[#fce8a6] hover:underline text-[11px]"
                    >
                      {isMuted ? 'Unmute' : 'Mute'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full accent-[#d4af37] bg-neutral-900 cursor-pointer h-1.5 rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* User Profile Moniker Button */}
            <button
              onClick={() => setIsNameModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#2c121b] to-[#1c0f14] border border-[#521f2b] hover:border-[#d4af37] text-neutral-200 hover:text-[#fae5b5] transition cursor-pointer text-xs font-semibold group shadow-sm"
              title="Change your Adventurer Moniker"
            >
              <div className="w-5 h-5 rounded-full bg-[#521f2b] group-hover:bg-[#801b31] flex items-center justify-center text-[#fce8a6] transition">
                <User className="w-3 h-3" />
              </div>
              <span className="max-w-[130px] truncate">{userSession.displayName}</span>
            </button>

            {/* GM Soundboard switch button */}
            {showGMCockpitToggle && onToggleGMCockpit && !activeLobby && (
              <button
                onClick={onToggleGMCockpit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#261612] hover:bg-[#38201a] border border-[#693121] text-[#f0ba7f] text-xs font-bold transition cursor-pointer shadow-sm"
                title="Switch to GM Soundboard & Discord Voice Bot console"
              >
                <Radio className="w-3.5 h-3.5" />
                <span className="hidden md:inline">GM Soundboard</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <UserIdentityModal
        isOpen={isNameModalOpen}
        onClose={() => setIsNameModalOpen(false)}
      />
    </>
  );
};

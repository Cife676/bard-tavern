'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TavernProvider, useTavern } from '@/context/TavernContext';
import { TavernNavbar } from './TavernNavbar';
import { LobbyList } from './LobbyList';
import { LobbyRoom } from './LobbyRoom';

interface Props {
  onToggleGMCockpit?: () => void;
  showGMCockpitToggle?: boolean;
}

function TavernInnerDashboard({
  onToggleGMCockpit,
  showGMCockpitToggle,
}: Props) {
  const { activeLobby, joinLobby } = useTavern();
  const searchParams = useSearchParams();

  // Auto-join via URL query parameter: ?lobby=CODE
  useEffect(() => {
    const lobbyParam = searchParams.get('lobby');
    if (lobbyParam && !activeLobby) {
      joinLobby(lobbyParam);
    }
  }, [searchParams, activeLobby, joinLobby]);

  return (
    <div className="min-h-screen bg-[#0e070a] text-neutral-100 flex flex-col font-sans selection:bg-[#801b31] selection:text-[#fae5b5]">
      {/* Dark fantasy medieval background texture overlay */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2e1019]/25 via-transparent to-transparent" />

      {/* Medieval Tavern Header */}
      <TavernNavbar
        onToggleGMCockpit={onToggleGMCockpit}
        showGMCockpitToggle={showGMCockpitToggle}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-4 md:p-6">
        {activeLobby ? <LobbyRoom /> : <LobbyList />}
      </main>

      {/* Atmospheric Footer */}
      <footer className="relative z-10 py-6 border-t border-[#38161f] text-center text-xs text-neutral-500 bg-[#0c0608]/90">
        <p className="font-serif text-[#e6c875]/60">
          Bard&apos;s Tavern — Real-Time Shared Music for Daggerheart Campaigns
        </p>
        <p className="text-[11px] text-neutral-400 mt-1">
          Supabase Realtime &bull; Audio API &bull; No registration needed
        </p>
      </footer>
    </div>
  );
}

export const TavernDashboard: React.FC<Props> = (props) => {
  return (
    <TavernProvider>
      <Suspense fallback={<div className="min-h-screen bg-[#0e070a] flex items-center justify-center text-[#fae5b5] font-serif">Lighting the hearth...</div>}>
        <TavernInnerDashboard {...props} />
      </Suspense>
    </TavernProvider>
  );
};

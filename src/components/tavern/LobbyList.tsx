'use client';

import React, { useState, useEffect } from 'react';
import { useTavern } from '@/context/TavernContext';
import { TavernService } from '@/lib/tavern/tavernService';
import { Lobby } from '@/types/tavern';
import { CreateLobbyModal } from './CreateLobbyModal';
import { PasswordPromptModal } from './PasswordPromptModal';
import {
  Flame,
  Plus,
  Lock,
  Users,
  Music,
  ArrowRight,
  Search,
  RotateCw,
  Sparkles,
  Volume2,
  Crown,
  KeyRound,
} from 'lucide-react';

export const LobbyList: React.FC = () => {
  const { joinLobby, isConnecting } = useTavern();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [search, setSearch] = useState('');
  const [directCode, setDirectCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLockedLobby, setSelectedLockedLobby] = useState<Lobby | null>(null);

  const fetchLobbies = async () => {
    setIsLoading(true);
    try {
      const list = await TavernService.listActiveLobbies();
      setLobbies(list);
    } catch (err) {
      console.error('Failed to load lobbies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLobbies();
    const interval = setInterval(fetchLobbies, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleJoinClick = (lobby: Lobby) => {
    if (lobby.has_password) {
      setSelectedLockedLobby(lobby);
    } else {
      joinLobby(lobby.id);
    }
  };

  const handlePasswordConfirm = async (password: string) => {
    if (selectedLockedLobby) {
      const success = await joinLobby(selectedLockedLobby.id, password);
      if (success) {
        setSelectedLockedLobby(null);
      }
    }
  };

  const handleDirectCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (directCode.trim()) {
      joinLobby(directCode.trim().toUpperCase());
    }
  };

  const filteredLobbies = lobbies.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q) ||
      l.host_name.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Atmosphere Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2e0e18] via-[#210d14] to-[#140b0e] border border-[#6b1f2e] p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-[#801b31]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#471622] text-[#fce8a6] border border-[#782836] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Daggerheart Campaign Audio Haven</span>
            </div>
            <h2 className="font-serif text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#fae5b5] via-[#f7d692] to-[#c78b27]">
              Gather Round the Bard&apos;s Hearth
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Step into the tavern, take a seat at the heavy oak table, and listen to the
              bard&apos;s lute in perfect real-time harmony with your fellow adventurers.
              No sign-up required.
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="shrink-0 flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-[#801b31] via-[#a82540] to-[#c78b27] hover:brightness-110 text-white shadow-xl shadow-[#782836]/40 cursor-pointer transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Establish Tavern Hall</span>
          </button>
        </div>
      </div>

      {/* Action Bar: Search & Direct Code Join */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tavern halls, hosts, or campaign lore..."
            className="w-full bg-[#170e12] border border-[#421a22] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition"
          />
        </div>

        {/* Quick Join by Code */}
        <form onSubmit={handleDirectCodeSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <KeyRound className="w-4 h-4 text-[#d4af37] absolute left-3 top-3.5" />
            <input
              type="text"
              value={directCode}
              onChange={(e) => setDirectCode(e.target.value)}
              placeholder="Enter Code (e.g. TAV-4921)"
              className="w-full uppercase font-mono bg-[#170e12] border border-[#421a22] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xl pl-9 pr-3 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 outline-none transition"
            />
          </div>
          <button
            type="submit"
            disabled={!directCode.trim() || isConnecting}
            className="px-4 py-2.5 bg-[#3b151f] hover:bg-[#521f2b] text-[#fce8a6] border border-[#692332] rounded-xl text-xs font-bold transition disabled:opacity-40 cursor-pointer shrink-0"
          >
            Enter
          </button>
        </form>
      </div>

      {/* Lobbies Header & Refresh */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-[#d4af37]" />
          <h3 className="font-serif text-lg font-bold text-[#fae5b5]">
            Active Tavern Tables
          </h3>
          <span className="px-2 py-0.5 rounded-full text-xs bg-[#241017] text-neutral-400 border border-[#421924]">
            {filteredLobbies.length}
          </span>
        </div>

        <button
          onClick={fetchLobbies}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white bg-[#1a0f14] border border-[#38161e] transition cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Lobbies Grid */}
      {isLoading && lobbies.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#170e12] border border-[#38161e]">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#3d1520] flex items-center justify-center animate-pulse mb-3">
            <Flame className="w-5 h-5 text-[#fce8a6]" />
          </div>
          <p className="text-sm font-serif text-[#fce8a6]">Listening for the tavern hearths...</p>
        </div>
      ) : filteredLobbies.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#170e12] border border-[#38161e] space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#2e1018] border border-[#521c27] flex items-center justify-center text-[#d4af37]">
            <Music className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-serif text-base font-bold text-neutral-200">
              No tavern tables matching your call
            </h4>
            <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
              Be the first skald to build a hearthfire and summon your party to listen!
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#801b31] to-[#ba8623] hover:brightness-110 text-white shadow-lg shadow-[#782836]/40 inline-flex items-center gap-2 cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            <span>Establish First Tavern</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLobbies.map((lobby) => (
            <div
              key={lobby.id}
              className="group relative flex flex-col justify-between bg-gradient-to-b from-[#1f1116] via-[#170c11] to-[#12090d] border border-[#471a24] hover:border-[#a83248] rounded-2xl p-5 shadow-lg hover:shadow-2xl hover:shadow-[#801b31]/20 transition duration-200"
            >
              {/* Header: Title & Code */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="font-serif text-base font-bold text-[#fae5b5] group-hover:text-[#fff0cc] transition line-clamp-1">
                    {lobby.name}
                  </h4>
                  <span className="shrink-0 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#2e1019] text-[#e6c875] border border-[#571e2c]">
                    {lobby.code}
                  </span>
                </div>

                {lobby.description && (
                  <p className="text-xs text-neutral-400 line-clamp-2 mb-4">
                    {lobby.description}
                  </p>
                )}

                {/* Host badge */}
                <div className="flex items-center gap-1.5 text-xs text-neutral-300 mb-3">
                  <Crown className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Host:</span>
                  <span className="font-semibold text-[#fce8a6]">{lobby.host_name}</span>
                </div>

                {/* Music Status */}
                <div className="p-2.5 rounded-xl bg-[#12080c] border border-[#33131b] mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-lg ${
                        lobby.is_playing
                          ? 'bg-[#521724] text-[#fce8a6] animate-pulse'
                          : 'bg-neutral-900 text-neutral-500'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
                        {lobby.is_playing ? 'Now Playing' : 'Chamber Melodies'}
                      </p>
                      <p className="text-xs font-serif text-neutral-200 truncate">
                        {lobby.current_track?.title || 'Waiting for the Bard...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer: Lock, Members, Join Button */}
              <div className="pt-3 border-t border-[#38161f] flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-xs text-neutral-400">
                  {lobby.has_password && (
                    <span
                      title="Passphrase guarded"
                      className="flex items-center gap-1 text-amber-400 font-medium"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Guarded</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-[11px]">
                      {lobby.member_count ? `${lobby.member_count} at Table` : 'Open Table'}
                    </span>
                  </span>
                </div>

                <button
                  onClick={() => handleJoinClick(lobby)}
                  disabled={isConnecting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#4d1623] to-[#801b31] group-hover:from-[#801b31] group-hover:to-[#ba8623] text-white shadow-md hover:shadow-lg transition cursor-pointer transform active:scale-95"
                >
                  <span>Pull up a Chair</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateLobbyModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          fetchLobbies();
        }}
      />

      <PasswordPromptModal
        isOpen={Boolean(selectedLockedLobby)}
        lobbyName={selectedLockedLobby?.name || 'Guarded Tavern'}
        onConfirm={handlePasswordConfirm}
        onClose={() => setSelectedLockedLobby(null)}
      />
    </div>
  );
};

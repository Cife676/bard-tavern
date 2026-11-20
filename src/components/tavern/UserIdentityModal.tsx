'use client';

import React, { useState } from 'react';
import { useTavern } from '@/context/TavernContext';
import { generateFantasyName } from '@/lib/tavern/userSession';
import { Dices, UserCheck, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const UserIdentityModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { userSession, updateDisplayName } = useTavern();
  const [name, setName] = useState(userSession.displayName);

  if (!isOpen) return null;

  const handleRandomize = () => {
    const generated = generateFantasyName();
    setName(generated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      updateDisplayName(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#211718] via-[#1a1213] to-[#120d0e] border border-[#782836]/60 rounded-2xl shadow-2xl overflow-hidden p-6 text-neutral-100">
        {/* Decorative corner glows */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#a82038]/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#d4af37]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-[#4d1f27]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📜</span>
            <h3 className="font-serif text-lg font-bold tracking-wide text-[#f5d78e]">
              Adventurer Moniker
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-300 mb-2">
              Display Name in the Tavern
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="e.g. Lyra the Moon-Harper"
                className="w-full bg-[#0d090a] border border-[#52232c] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition"
                autoFocus
              />
              <button
                type="button"
                onClick={handleRandomize}
                title="Roll a random Daggerheart fantasy name"
                className="absolute right-2 px-2.5 py-1.5 bg-[#3a151e] hover:bg-[#521f2b] text-[#f5d78e] rounded-lg text-xs flex items-center gap-1.5 border border-[#782836] transition cursor-pointer"
              >
                <Dices className="w-3.5 h-3.5" />
                <span>Roll</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 mt-2">
              Saved automatically to this browser. No email or password needed.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#911f35] to-[#c78b27] hover:from-[#aa253f] hover:to-[#df9d2f] text-white shadow-lg shadow-[#782836]/40 flex items-center gap-2 cursor-pointer transition active:scale-95"
            >
              <UserCheck className="w-4 h-4" />
              <span>Confirm Moniker</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

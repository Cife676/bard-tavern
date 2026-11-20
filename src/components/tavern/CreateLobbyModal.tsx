'use client';

import React, { useState } from 'react';
import { useTavern } from '@/context/TavernContext';
import { Shield, Sparkles, X, Lock } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateLobbyModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { createLobby } = useTavern();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for your tavern hall.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await createLobby(name.trim(), description.trim(), password.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to establish tavern hall.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#24151a] via-[#1c1115] to-[#120a0d] border border-[#782836] rounded-2xl shadow-2xl overflow-hidden p-6 text-neutral-100">
        {/* Subtle tavern ambient glow */}
        <div className="absolute top-0 right-1/4 w-48 h-32 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-[#4d1f27]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#801b31] to-[#ba8623] flex items-center justify-center shadow-lg border border-[#e6c875]/30">
              <Sparkles className="w-5 h-5 text-[#fce8a6]" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold tracking-wide text-[#f5d78e]">
                Establish a Tavern Hall
              </h3>
              <p className="text-xs text-neutral-400">
                Found a new shared listening hearth for your Daggerheart campaign
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-300 mb-1.5">
              Tavern Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Drunken Griffin, Whispering Wood Camp"
              maxLength={60}
              className="w-full bg-[#0d070a] border border-[#52232c] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-300 mb-1.5">
              Campaign Atmosphere / Lore Note (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Daggerheart Act III: The party enters the Sunken Spire while rain drums on the roof."
              maxLength={200}
              rows={2}
              className="w-full bg-[#0d070a] border border-[#52232c] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Passphrase / Gate Key (Optional)</span>
              </span>
              <span className="text-[11px] text-neutral-400 font-normal">Leave blank for public</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Private password for your tabletop party only"
              className="w-full bg-[#0d070a] border border-[#52232c] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <div className="flex items-center gap-2 text-[11px] text-[#e6c875]/80">
              <Shield className="w-4 h-4 text-[#d4af37] shrink-0" />
              <span>You will become the Tavern Host with audio upload &amp; playback authority.</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#4d1f27]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-[#801b31] via-[#9e2740] to-[#c78b27] hover:brightness-110 text-white shadow-xl shadow-[#782836]/40 flex items-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[#fce8a6]" />
              <span>{isSubmitting ? 'Founding Hall...' : 'Kindle the Hearth'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

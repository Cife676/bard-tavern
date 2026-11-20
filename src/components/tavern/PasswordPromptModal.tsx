'use client';

import React, { useState } from 'react';
import { KeyRound, Lock, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  lobbyName: string;
  onConfirm: (password: string) => void;
  onClose: () => void;
}

export const PasswordPromptModal: React.FC<Props> = ({
  isOpen,
  lobbyName,
  onConfirm,
  onClose,
}) => {
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      onConfirm(password);
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-[#24151a] via-[#1c1115] to-[#120a0d] border border-[#782836] rounded-2xl shadow-2xl p-6 text-neutral-100">
        <div className="flex items-center justify-between pb-3 border-b border-[#4d1f27]">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#d4af37]" />
            <h3 className="font-serif text-base font-bold text-[#f5d78e]">
              Guarded Hearth
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-neutral-300 mt-3">
          <strong className="text-[#f5d78e]">{lobbyName}</strong> requires a tavern passphrase to enter.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter passphrase"
            className="w-full bg-[#0d070a] border border-[#52232c] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition"
            autoFocus
            required
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#801b31] to-[#ba8623] hover:brightness-110 text-white shadow-lg shadow-[#782836]/40 flex items-center gap-1.5 cursor-pointer transition active:scale-95"
            >
              <KeyRound className="w-4 h-4" />
              <span>Unlock Tavern</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

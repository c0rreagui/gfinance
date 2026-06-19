'use client';

import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { AiChatHub } from '@/app/components/AiChatHub';
import { usePathname } from 'next/navigation';

export function GeminiFab() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Esconder em páginas públicas
  if (pathname === '/auth') return null;

  // Detectar módulo pelo pathname
  const isWork = pathname?.startsWith('/tasks');
  const isHub = pathname === '/';
  const module = isWork ? 'work' : isHub ? 'hub' : 'finance';

  // Configuração visual por módulo
  const cfg = {
    label: module === 'work' ? 'CPO Assistant' : module === 'hub' ? 'CoS Assistant' : 'CFO Assistant',
    // FAB button colors
    fabBorder: module === 'work' ? 'border-blue-500/30' : module === 'hub' ? 'border-indigo-500/30' : 'border-emerald-500/30',
    fabText: module === 'work' ? 'text-blue-400' : module === 'hub' ? 'text-indigo-400' : 'text-emerald-400',
    fabGlow: module === 'work'
      ? 'shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]'
      : module === 'hub'
      ? 'shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]'
      : 'shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]',
    fabPulse: module === 'work'
      ? 'from-blue-500 to-indigo-500'
      : module === 'hub'
      ? 'from-indigo-500 to-purple-500'
      : 'from-emerald-500 to-teal-500',
    // Panel colors
    panelBorder: module === 'work' ? 'border-blue-500/20' : module === 'hub' ? 'border-indigo-500/20' : 'border-emerald-500/20',
    panelGlow: module === 'work' ? 'shadow-blue-500/5' : module === 'hub' ? 'shadow-indigo-500/5' : 'shadow-emerald-500/5',
    labelColor: module === 'work' ? 'text-blue-400' : module === 'hub' ? 'text-indigo-400' : 'text-emerald-400',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Chat Panel */}
      {isOpen && (
        <div className={`mb-4 w-96 rounded-[32px] border ${cfg.panelBorder} bg-slate-950/95 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] ${cfg.panelGlow} overflow-hidden flex flex-col h-[520px] animate-in slide-in-from-bottom-5 duration-300`}>
          <div className="bg-slate-900/40 border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${cfg.labelColor}`} />
              <span className="text-[10px] font-black text-white tracking-widest uppercase">{cfg.label}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <AiChatHub isFloating={true} forcedModule={module} />
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full bg-slate-950 hover:bg-slate-900 border ${cfg.fabBorder} ${cfg.fabText} hover:text-white flex items-center justify-center ${cfg.fabGlow} transition-all duration-300 hover:scale-105 active:scale-95 group relative cursor-pointer`}
        aria-label={`Abrir ${cfg.label}`}
      >
        {/* Pulsing glow behind the FAB */}
        <span className={`absolute -inset-0.5 rounded-full bg-gradient-to-tr ${cfg.fabPulse} blur opacity-30 group-hover:opacity-60 transition duration-300 animate-pulse`}></span>

        <span className="relative flex items-center justify-center">
          {isOpen ? (
            <X className="w-6 h-6 transition-transform duration-300 rotate-90" />
          ) : (
            <Sparkles className="w-6 h-6 animate-pulse group-hover:rotate-12 transition-transform duration-300" />
          )}
        </span>
      </button>
    </div>
  );
}

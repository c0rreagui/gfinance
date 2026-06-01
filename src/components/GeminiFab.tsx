'use client';

import React, { useState } from 'react';
import { Sparkles, X, Bot } from 'lucide-react';
import { AiChatHub } from '@/app/components/AiChatHub';
import { usePathname } from 'next/navigation';

export function GeminiFab() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Hide the FAB on public pages like Auth
  if (pathname === '/auth') return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Gemini Chat Panel */}
      {isOpen && (
        <div className="mb-4 w-96 rounded-[32px] border border-emerald-500/20 bg-slate-950/95 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] shadow-emerald-500/5 overflow-hidden flex flex-col h-[520px] animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900/40 border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-black text-white tracking-widest uppercase">CFO Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <AiChatHub isFloating={true} />
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-slate-950 hover:bg-slate-900 border border-emerald-500/30 text-emerald-400 hover:text-white flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-105 active:scale-95 group relative cursor-pointer"
        aria-label="Abrir assistente Gemini"
      >
        {/* Pulsing light behind the FAB */}
        <span className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 blur opacity-30 group-hover:opacity-60 transition duration-300 animate-pulse"></span>
        
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

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Wallet, 
  Sparkles, 
  ChevronRight,
  Briefcase,
  Layers,
  ArrowRight
} from 'lucide-react';
import { TiltCard } from '@/components/TiltCard';
import { supabase } from '@/lib/supabase';

export default function HubPortal() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Redirect to Auth page
        router.push('/auth');
        return;
      }
      setUser(user);
    } catch (err) {
      console.error('Error verifying auth state:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-screen flex flex-col items-center justify-center p-8 no-scrollbar relative overflow-hidden z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="max-w-5xl w-full space-y-12 text-center flex flex-col items-center animate-pulse">
          {/* Logo Skeleton */}
          <div className="space-y-4">
            <div className="w-16 h-16 bg-slate-300/10 dark:bg-white/5 rounded-3xl mx-auto border border-white/10"></div>
            <div className="h-8 w-48 bg-slate-300/10 dark:bg-white/5 rounded-2xl mx-auto mt-6 border border-white/10"></div>
            <div className="h-4 w-32 bg-slate-300/10 dark:bg-white/5 rounded-xl mx-auto mt-2 border border-white/10"></div>
          </div>

          {/* Cards Skeleton Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-4xl pt-4">
            {/* Card 1 Skeleton */}
            <div className="bg-white/10 dark:bg-slate-900/10 backdrop-blur-xl p-8 rounded-[48px] border border-white/20 dark:border-white/5 flex flex-col justify-between aspect-[1.1/1]">
              <div className="space-y-6">
                <div className="w-14 h-14 bg-slate-300/10 dark:bg-white/5 rounded-2xl border border-white/10"></div>
                <div className="space-y-3">
                  <div className="h-6 w-28 bg-slate-300/10 dark:bg-white/5 rounded-xl border border-white/10"></div>
                  <div className="h-4 w-full bg-slate-300/10 dark:bg-white/5 rounded-lg border border-white/10"></div>
                  <div className="h-4 w-2/3 bg-slate-300/10 dark:bg-white/5 rounded-lg border border-white/10"></div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-6 border-t border-slate-100/10 dark:border-white/5">
                <div className="h-3 w-20 bg-slate-300/10 dark:bg-white/5 rounded-md border border-white/10"></div>
                <div className="w-10 h-10 bg-slate-300/10 dark:bg-white/5 rounded-full border border-white/10"></div>
              </div>
            </div>

            {/* Card 2 Skeleton */}
            <div className="bg-white/10 dark:bg-slate-900/10 backdrop-blur-xl p-8 rounded-[48px] border border-white/20 dark:border-white/5 flex flex-col justify-between aspect-[1.1/1]">
              <div className="space-y-6">
                <div className="w-14 h-14 bg-slate-300/10 dark:bg-white/5 rounded-2xl border border-white/10"></div>
                <div className="space-y-3">
                  <div className="h-6 w-28 bg-slate-300/10 dark:bg-white/5 rounded-xl border border-white/10"></div>
                  <div className="h-4 w-full bg-slate-300/10 dark:bg-white/5 rounded-lg border border-white/10"></div>
                  <div className="h-4 w-2/3 bg-slate-300/10 dark:bg-white/5 rounded-lg border border-white/10"></div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-6 border-t border-slate-100/10 dark:border-white/5">
                <div className="h-3 w-20 bg-slate-300/10 dark:bg-white/5 rounded-md border border-white/10"></div>
                <div className="w-10 h-10 bg-slate-300/10 dark:bg-white/5 rounded-full border border-white/10"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 min-h-screen flex flex-col items-center justify-center p-8 no-scrollbar relative overflow-y-auto z-10">
      {/* Dynamic light bursts in background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-5xl w-full space-y-12 animate-in text-center flex flex-col items-center">
        {/* Logo and Greeting Header */}
        <div className="space-y-4">
          <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-blue-500 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-emerald-500/25 shadow-blue-500/25 mx-auto hover:scale-110 transition-transform duration-500">
            G
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-white mt-6">
            G-Hub <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">Command Center</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2 mt-2">
            Olá, {user?.user_metadata?.full_name || user?.email?.split('@')[0]} <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
          </p>
        </div>

        {/* Portal Module Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-4xl pt-4">
          {/* G-Finance App Card */}
          <Link href="/finance" className="group block text-left">
            <TiltCard className="h-full bg-slate-950/40 backdrop-blur-xl p-8 rounded-[48px] border border-slate-800/80 hover:border-emerald-500/30 transition-all duration-500 relative overflow-hidden flex flex-col justify-between aspect-[1.1/1] shadow-[0_0_50px_rgba(0,0,0,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.06)]">
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:scale-125 group-hover:bg-emerald-500/20 transition-all duration-700 pointer-events-none"></div>
              
              <div className="space-y-6 relative z-10">
                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                  <Wallet className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-[-0.03em] group-hover:text-emerald-400 transition-colors">
                    G-Finance
                  </h3>
                  <p className="text-slate-300 group-hover:text-slate-100 font-medium text-sm mt-3 leading-relaxed transition-colors duration-300">
                    Controle patrimonial de alta fidelidade. Acompanhe saldos, transações em tempo real, investimentos e faturas com o Gemini AI Brain.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-800/80 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-emerald-400 transition-colors">
                  Acessar Carteira
                </span>
                <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-400 transition-all duration-300">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </TiltCard>
          </Link>

          {/* G-Work Manager Card */}
          <Link href="/tasks" className="group block text-left">
            <TiltCard className="h-full bg-slate-950/40 backdrop-blur-xl p-8 rounded-[48px] border border-slate-800/80 hover:border-blue-500/30 transition-all duration-500 relative overflow-hidden flex flex-col justify-between aspect-[1.1/1] shadow-[0_0_50px_rgba(0,0,0,0.3)] hover:shadow-[0_0_50px_rgba(59,130,246,0.06)]">
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:scale-125 group-hover:bg-blue-500/20 transition-all duration-700 pointer-events-none"></div>

              <div className="space-y-6 relative z-10">
                <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
                  <Briefcase className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-[-0.03em] group-hover:text-blue-400 transition-colors">
                    G-Work
                  </h3>
                  <p className="text-slate-300 group-hover:text-slate-100 font-medium text-sm mt-3 leading-relaxed transition-colors duration-300">
                    Gerenciador operacional e hub de trabalho com IA. Organize projetos, quadro Kanban, controle reuniões com transcrição e gere planos de ação inteligentes.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-800/80 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-400 transition-colors">
                  Acessar Painel
                </span>
                <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-400 transition-all duration-300">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </TiltCard>
          </Link>
        </div>

        {/* Footer actions */}
        <div className="pt-8 flex gap-6 items-center">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
            G-Hub Central • Sessão Segura Supabase • {user?.email}
          </span>
          <div className="h-4 w-px bg-slate-800"></div>
          <button 
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-red-500 font-black uppercase tracking-widest transition-colors cursor-pointer"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    </main>
  );
}

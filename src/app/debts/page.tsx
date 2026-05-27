'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  Shield,
  CalendarClock,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Debt {
  id: string;
  title: string;
  due_date: string;
  amount: number;
  urgency: 'high' | 'medium' | 'low';
  paid: boolean;
  created_at?: string;
}

const urgencyConfig = {
  high: {
    label: 'Urgente',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    dot: 'bg-red-500',
    bar: 'bg-red-500',
  },
  medium: {
    label: 'Moderado',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
  },
  low: {
    label: 'Tranquilo',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    bar: 'bg-emerald-500',
  },
};

/** Calculate the elapsed-time progress (0–100) between created_at and due_date */
function getTimeProgress(createdAt: string | undefined, dueDate: string): number {
  const now = Date.now();
  const start = createdAt ? new Date(createdAt).getTime() : now - 30 * 86400_000; // fallback 30d ago
  const end = new Date(dueDate).getTime();
  if (end <= start) return 100;
  const elapsed = now - start;
  const total = end - start;
  return Math.min(Math.max(Math.round((elapsed / total) * 100), 0), 100);
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDebts = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('reminders')
          .select('*')
          .eq('user_id', user.id)
          .eq('paid', false)
          .order('due_date', { ascending: true });

        if (error) throw error;
        setDebts(data || []);
      } catch (err) {
        console.error('Error fetching debts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDebts();
  }, []);

  // ── Derived Stats ──
  const totalDebt = useMemo(
    () => debts.reduce((sum, d) => sum + Math.abs(d.amount), 0),
    [debts],
  );

  const installmentsThisMonth = useMemo(() => {
    const now = new Date();
    return debts.filter((d) => {
      const due = new Date(d.due_date);
      return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear();
    }).length;
  }, [debts]);

  const projectedClearDate = useMemo(() => {
    if (debts.length === 0) return '—';
    const latest = debts.reduce((max, d) =>
      new Date(d.due_date) > new Date(max.due_date) ? d : max,
    );
    return new Date(latest.due_date).toLocaleDateString('pt-BR', {
      month: 'short',
      year: 'numeric',
    });
  }, [debts]);

  // ── Upcoming timeline entries (next 6) ──
  const timeline = useMemo(() => {
    return debts
      .filter((d) => new Date(d.due_date) >= new Date())
      .slice(0, 6);
  }, [debts]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-full bg-slate-950">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-950 text-slate-100 h-full no-scrollbar relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(255,255,255,0))] pointer-events-none z-0"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 animate-in">
        {/* ───── Header ───── */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase">Controle de Dívidas</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Gestão de passivos e compromissos financeiros
            </p>
          </div>
        </div>

        {/* ───── Stat Cards ───── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total em Dívidas */}
          <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 space-y-3">
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total em Dívidas</p>
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <TrendingDown className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-200 tracking-tight">
              {totalDebt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-[10px] text-slate-500 font-bold">{debts.length} compromisso{debts.length !== 1 ? 's' : ''} ativo{debts.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Parcelas do Mês */}
          <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 space-y-3">
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parcelas do Mês</p>
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CalendarClock className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-200 tracking-tight">
              {installmentsThisMonth}
            </p>
            <p className="text-[10px] text-slate-500 font-bold">vencimento{installmentsThisMonth !== 1 ? 's' : ''} neste mês</p>
          </div>

          {/* Previsão de Quitação */}
          <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 space-y-3">
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previsão de Quitação</p>
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-200 tracking-tight capitalize">
              {projectedClearDate}
            </p>
            <p className="text-[10px] text-slate-500 font-bold">última parcela prevista</p>
          </div>
        </div>

        {/* ───── Main Content ───── */}
        {debts.length === 0 ? (
          /* Empty State */
          <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-16 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-emerald-400 stroke-[1.5]" />
            </div>
            <div className="space-y-2 max-w-sm">
              <p className="text-sm font-black uppercase tracking-widest text-slate-300">
                Nenhuma dívida registrada
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Sua saúde financeira está impecável! Quando houver compromissos pendentes, eles aparecerão aqui.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* ── Left: Debt List ── */}
            <div className="lg:col-span-7 space-y-4">
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-sm font-black uppercase tracking-wider">Dívidas Ativas</h2>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {debts.length} registro{debts.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-4 overflow-y-auto no-scrollbar max-h-[540px] pr-1">
                  {debts.map((debt) => {
                    const cfg = urgencyConfig[debt.urgency] || urgencyConfig.low;
                    const progress = getTimeProgress(debt.created_at, debt.due_date);
                    const dueDate = new Date(debt.due_date);
                    const isPastDue = dueDate < new Date();

                    return (
                      <div
                        key={debt.id}
                        className="p-5 bg-slate-950/40 border border-white/5 rounded-2xl hover:border-white/10 transition-colors space-y-4"
                      >
                        {/* Top row */}
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
                              {debt.urgency === 'high' ? (
                                <AlertTriangle className={`w-4 h-4 ${cfg.text}`} />
                              ) : debt.urgency === 'medium' ? (
                                <Clock className={`w-4 h-4 ${cfg.text}`} />
                              ) : (
                                <CheckCircle2 className={`w-4 h-4 ${cfg.text}`} />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-200">{debt.title}</p>
                              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                Vence: {dueDate.toLocaleDateString('pt-BR')}
                                {isPastDue && (
                                  <span className="text-red-400 ml-1.5">• Atrasado</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <span className={`px-2.5 py-1 ${cfg.bg} border ${cfg.border} ${cfg.text} text-[9px] font-black rounded-lg uppercase tracking-widest`}>
                              {cfg.label}
                            </span>
                            <p className="text-sm font-black text-slate-200">
                              {Math.abs(debt.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1.5">
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-white/5">
                            <div
                              className={`${cfg.bar} h-full rounded-full transition-all duration-500`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-600 font-bold">
                            <span>Tempo decorrido</span>
                            <span>{progress}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Right: Payment Timeline ── */}
            <div className="lg:col-span-5">
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-sm font-black uppercase tracking-wider">Próximos Pagamentos</h2>
                  <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black rounded-lg uppercase tracking-widest">
                    Timeline
                  </span>
                </div>

                {timeline.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 space-y-2">
                    <CalendarClock className="w-8 h-8 text-slate-600 mx-auto stroke-[1.5]" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum pagamento futuro</p>
                  </div>
                ) : (
                  <div className="relative pl-6">
                    {/* Vertical line */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/5"></div>

                    <div className="space-y-6">
                      {timeline.map((entry, idx) => {
                        const cfg = urgencyConfig[entry.urgency] || urgencyConfig.low;
                        const dueDate = new Date(entry.due_date);
                        const isFirst = idx === 0;

                        return (
                          <div key={entry.id} className="relative flex items-start gap-4">
                            {/* Dot */}
                            <div className="absolute -left-6 top-1 flex items-center justify-center">
                              <div className={`w-3.5 h-3.5 rounded-full ${cfg.dot} ${isFirst ? 'ring-4 ring-emerald-500/20' : ''} border-2 border-slate-950`}></div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 p-4 bg-slate-950/40 border border-white/5 rounded-2xl hover:border-white/10 transition-colors">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                                    {dueDate.toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </p>
                                  <p className="text-xs font-black text-slate-200 mt-1">{entry.title}</p>
                                </div>
                                <p className="text-xs font-black text-slate-200">
                                  {Math.abs(entry.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer summary */}
                <div className="border-t border-white/5 pt-6 mt-6 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Total Pendente</span>
                  <span className="text-slate-100 font-black text-sm">
                    {totalDebt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  TrendingUp,
  PiggyBank,
  Gem,
  ArrowUpRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  color: string;
}

/** Predefined palette fallback when goal.color is missing */
const PALETTE = [
  '#10b981', // emerald
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#3b82f6', // blue
];

function resolveColor(color: string | undefined, index: number): string {
  if (color && color.startsWith('#')) return color;
  // If color is a Tailwind name like "emerald" we map common ones
  const map: Record<string, string> = {
    emerald: '#10b981',
    blue: '#3b82f6',
    indigo: '#6366f1',
    amber: '#f59e0b',
    pink: '#ec4899',
    violet: '#8b5cf6',
    teal: '#14b8a6',
    rose: '#f43f5e',
    red: '#ef4444',
    green: '#22c55e',
    yellow: '#eab308',
    cyan: '#06b6d4',
    orange: '#f97316',
  };
  if (color && map[color.toLowerCase()]) return map[color.toLowerCase()];
  return PALETTE[index % PALETTE.length];
}

/** SVG Donut Ring chart – draws arcs for each segment */
function DonutChart({ goals }: { goals: Goal[] }) {
  const total = goals.reduce((s, g) => s + g.current_amount, 0);
  if (total === 0) return null;

  const cx = 100;
  const cy = 100;
  const r = 80;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * r;

  let cumulativeOffset = 0;

  return (
    <svg viewBox="0 0 200 200" className="w-48 h-48 md:w-56 md:h-56 drop-shadow-2xl">
      {/* Background track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.03)"
        strokeWidth={strokeWidth}
      />

      {goals.map((goal, idx) => {
        const fraction = goal.current_amount / total;
        const segmentLength = circumference * fraction;
        const gapSize = goals.length > 1 ? 4 : 0;
        const adjustedSegment = Math.max(segmentLength - gapSize, 1);
        const dashArray = `${adjustedSegment} ${circumference - adjustedSegment}`;
        const dashOffset = -(cumulativeOffset + gapSize / 2);
        const color = resolveColor(goal.color, idx);

        cumulativeOffset += segmentLength;

        return (
          <circle
            key={goal.id}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        );
      })}

      {/* Center label */}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        className="fill-slate-400 text-[8px] font-bold uppercase"
        style={{ letterSpacing: '0.12em' }}
      >
        Alocação
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        className="fill-slate-100 text-[18px] font-black"
      >
        {goals.length}
      </text>
      <text
        x={cx}
        y={cy + 28}
        textAnchor="middle"
        className="fill-slate-500 text-[7px] font-bold uppercase"
        style={{ letterSpacing: '0.1em' }}
      >
        {goals.length === 1 ? 'meta' : 'metas'}
      </text>
    </svg>
  );
}

export default function WealthPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;
        setGoals(data || []);
      } catch (err) {
        console.error('Error fetching goals:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGoals();
  }, []);

  // ── Derived Stats ──
  const totalInvested = useMemo(
    () => goals.reduce((s, g) => s + g.current_amount, 0),
    [goals],
  );

  const totalTarget = useMemo(
    () => goals.reduce((s, g) => s + g.target_amount, 0),
    [goals],
  );

  const remainingToGoal = useMemo(
    () => Math.max(totalTarget - totalInvested, 0),
    [totalTarget, totalInvested],
  );

  const averageProgress = useMemo(() => {
    if (goals.length === 0) return 0;
    const sum = goals.reduce(
      (s, g) => s + Math.min((g.current_amount / g.target_amount) * 100, 100),
      0,
    );
    return Math.round(sum / goals.length);
  }, [goals]);

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
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase">Investimentos & Patrimônio</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Acompanhamento de metas e crescimento patrimonial
            </p>
          </div>
        </div>

        {/* ───── Patrimônio Total + Donut ───── */}
        <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Left: big number */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Patrimônio Total Acumulado
              </p>
              <p className="text-4xl md:text-5xl font-black text-slate-100 tracking-tighter">
                {totalInvested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> {averageProgress}% da meta global
                </span>
              </div>

              {/* Legend chips */}
              {goals.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {goals.map((goal, idx) => {
                    const color = resolveColor(goal.color, idx);
                    return (
                      <span
                        key={goal.id}
                        className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        ></span>
                        {goal.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: donut chart */}
            {goals.length > 0 && (
              <div className="relative flex items-center justify-center">
                {/* Ambient glow */}
                <div className="absolute w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl"></div>
                <DonutChart goals={goals} />
              </div>
            )}
          </div>
        </div>

        {/* ───── Goal Cards or Empty State ───── */}
        {goals.length === 0 ? (
          <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-16 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <Target className="w-8 h-8 text-emerald-400 stroke-[1.5]" />
            </div>
            <div className="space-y-2 max-w-sm">
              <p className="text-sm font-black uppercase tracking-widest text-slate-300">
                Nenhuma meta de investimento ativa
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Defina seus objetivos de crescimento patrimonial nos Ajustes para começar a acompanhar seu progresso.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {goals.map((goal, idx) => {
                const percentage = Math.min(
                  Math.round((goal.current_amount / goal.target_amount) * 100),
                  100,
                );
                const color = resolveColor(goal.color, idx);
                const remaining = Math.max(goal.target_amount - goal.current_amount, 0);

                return (
                  <div
                    key={goal.id}
                    className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 space-y-6 hover:border-white/10 transition-colors"
                  >
                    {/* Card header */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <Gem className="w-4 h-4" style={{ color }} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-200">{goal.name}</p>
                          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                            Meta: {goal.target_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-sm font-black"
                        style={{ color }}
                      >
                        {percentage}%
                      </span>
                    </div>

                    {/* Values */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Investido</p>
                        <p className="text-lg font-black text-slate-200 mt-1">
                          {goal.current_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faltam</p>
                        <p className="text-lg font-black text-slate-200 mt-1">
                          {remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/5">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${percentage}%`, backgroundColor: color }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-600 font-bold">
                        <span>R$ 0</span>
                        <span>{goal.target_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ───── Summary Stats Row ───── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Investido */}
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 space-y-3">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Investido</p>
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <PiggyBank className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
                <p className="text-lg font-black text-slate-200">
                  {totalInvested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>

              {/* Faltam para Meta */}
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 space-y-3">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faltam para Meta</p>
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
                <p className="text-lg font-black text-slate-200">
                  {remainingToGoal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>

              {/* Progresso Médio */}
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 space-y-3">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso Médio</p>
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
                <p className="text-lg font-black text-emerald-400">
                  {averageProgress}%
                </p>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-white/5">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${averageProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  TrendingUp,
  PiggyBank,
  Gem,
  ArrowUpRight,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  AlertCircle
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

const COLORS = [
  { name: 'emerald', hex: '#10b981', label: 'Esmeralda' },
  { name: 'indigo', hex: '#6366f1', label: 'Índigo' },
  { name: 'rose', hex: '#f43f5e', label: 'Rose' },
  { name: 'amber', hex: '#f59e0b', label: 'Âmbar' },
  { name: 'violet', hex: '#8b5cf6', label: 'Violeta' },
  { name: 'teal', hex: '#14b8a6', label: 'Teal' },
  { name: 'blue', hex: '#3b82f6', label: 'Azul' },
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

  // Drawer / Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  
  // Form states
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalColor, setGoalColor] = useState('emerald');
  const [drawerError, setDrawerError] = useState('');
  const [drawerSuccess, setDrawerSuccess] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

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

  useEffect(() => {
    fetchGoals();

    // Check for ?open=true in URL parameter
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('open') === 'true') {
        setIsCreateOpen(true);
      }
    }
  }, []);

  const handleOpenEdit = (goal: Goal) => {
    setEditGoalId(goal.id);
    setGoalName(goal.name);
    setGoalTarget(goal.target_amount.toString());
    setGoalCurrent(goal.current_amount.toString());
    setGoalColor(goal.color || 'emerald');
    setIsCreateOpen(true);
  };

  const handleOpenCreate = () => {
    setEditGoalId(null);
    setGoalName('');
    setGoalTarget('');
    setGoalCurrent('');
    setGoalColor('emerald');
    setIsCreateOpen(true);
  };

  const handleDeleteGoal = async (id: string, name: string) => {
    if (!window.confirm(`Excluir definitivamente a meta de investimento "${name}"?`)) return;
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchGoals();
    } catch (err) {
      console.error('Error deleting goal:', err);
      alert('Erro ao excluir meta de investimento.');
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setDrawerError('');
    setDrawerSuccess('');
    setSaveStatus('saving');

    if (!goalName || !goalTarget) {
      setDrawerError('Preencha os campos obrigatórios.');
      setSaveStatus('error');
      return;
    }

    const targetAmt = parseFloat(goalTarget);
    const currentAmt = parseFloat(goalCurrent || '0');

    if (isNaN(targetAmt) || targetAmt <= 0) {
      setDrawerError('O valor alvo deve ser um número positivo.');
      setSaveStatus('error');
      return;
    }

    if (isNaN(currentAmt) || currentAmt < 0) {
      setDrawerError('O valor investido deve ser maior ou igual a zero.');
      setSaveStatus('error');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      if (editGoalId) {
        // Edit mode
        const { error } = await supabase
          .from('goals')
          .update({
            name: goalName,
            target_amount: targetAmt,
            current_amount: currentAmt,
            color: goalColor
          })
          .eq('id', editGoalId)
          .eq('user_id', user.id);

        if (error) throw error;
        setDrawerSuccess('Meta atualizada com sucesso!');
      } else {
        // Create mode
        const { error } = await supabase
          .from('goals')
          .insert({
            user_id: user.id,
            name: goalName,
            target_amount: targetAmt,
            current_amount: currentAmt,
            color: goalColor
          });

        if (error) throw error;
        setDrawerSuccess('Meta de investimento criada com sucesso!');
      }

      setSaveStatus('success');

      setTimeout(() => {
        setIsCreateOpen(false);
        setEditGoalId(null);
        setGoalName('');
        setGoalTarget('');
        setGoalCurrent('');
        setGoalColor('emerald');
        setDrawerSuccess('');
        setSaveStatus('idle');
        fetchGoals();
      }, 1000);

    } catch (err: any) {
      setDrawerError(err.message || 'Erro ao registrar meta.');
      setSaveStatus('error');
    }
  };

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
        <div className="flex justify-between items-center pb-4 border-b border-white/5">
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
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10 cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Meta
          </button>
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
            <div className="space-y-4 max-w-sm flex flex-col items-center">
              <div className="space-y-1">
                <p className="text-sm font-black uppercase tracking-widest text-slate-300">
                  Nenhuma meta de investimento ativa
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Cadastre seus objetivos de investimento para acompanhar o seu progresso patrimonial.
                </p>
              </div>
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Criar Primeira Meta
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in">
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
                    className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 space-y-6 hover:border-white/10 transition-colors relative group"
                  >
                    {/* Card Actions (Edit, Delete) */}
                    <div className="absolute right-6 top-6 flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(goal)}
                        className="w-7 h-7 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg flex items-center justify-center cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                        title="Editar Meta"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id, goal.name)}
                        className="w-7 h-7 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-lg flex items-center justify-center cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                        title="Excluir Meta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Card header */}
                    <div className="flex justify-between items-start pr-16">
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

      {/* Slide Drawer: Nova / Editar Meta */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border-l border-white/10 h-full p-8 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider">
                    {editGoalId ? 'Editar Meta de Investimento' : 'Nova Meta de Investimento'}
                  </h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    Estipule objetivos de acúmulo patrimonial
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {drawerError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{drawerError}</span>
                </div>
              )}

              {drawerSuccess && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{drawerSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveGoal} className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome do Objetivo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Reserva de Emergência, Viagem Europa"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Valor Alvo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 50000.00"
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Valor Já Investido (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 15000.00"
                      value={goalCurrent}
                      onChange={(e) => setGoalCurrent(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3">Escolha uma Cor / Tema</label>
                  <div className="flex flex-wrap gap-3">
                    {COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setGoalColor(c.name)}
                        className={`w-8 h-8 rounded-full border-2 hover:scale-110 transition-all cursor-pointer relative`}
                        style={{ backgroundColor: `${c.hex}20`, borderColor: goalColor === c.name ? c.hex : 'rgba(255,255,255,0.05)' }}
                        title={c.label}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                        </div>
                        {goalColor === c.name && (
                          <div className="absolute -inset-1 rounded-full border border-white/30" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="flex-1 py-4 border border-white/5 hover:bg-white/5 text-slate-300 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saveStatus === 'saving'}
                    className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-500/25 transition-all cursor-pointer text-center"
                  >
                    {saveStatus === 'saving' ? 'Salvando...' : editGoalId ? 'Atualizar Meta' : 'Criar Meta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

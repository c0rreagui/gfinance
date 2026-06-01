'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Repeat,
  Play,
  Pause,
  Calendar,
  DollarSign,
  Clock,
  Zap,
  Tv,
  Music,
  Cloud,
  Shield,
  Gamepad2,
  BookOpen,
  Dumbbell,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Reminder {
  id: string;
  title: string;
  due_date: string;
  amount: number;
  paid: boolean;
  created_at?: string;
  urgency?: string;
  is_recurring?: boolean;
  frequency?: string;
  category_icon?: string;
  brand_color?: string;
}

const serviceIcons: Record<string, any> = {
  netflix: Tv,
  spotify: Music,
  icloud: Cloud,
  vpn: Shield,
  xbox: Gamepad2,
  kindle: BookOpen,
  smartfit: Dumbbell,
  chatgpt: Zap,
};

const serviceGradients = [
  { color: 'from-red-500/10 to-red-900/5', borderColor: 'border-red-500/20' },
  { color: 'from-green-500/10 to-green-900/5', borderColor: 'border-green-500/20' },
  { color: 'from-blue-500/10 to-blue-900/5', borderColor: 'border-blue-500/20' },
  { color: 'from-indigo-500/10 to-indigo-900/5', borderColor: 'border-indigo-500/20' },
  { color: 'from-emerald-500/10 to-emerald-900/5', borderColor: 'border-emerald-500/20' },
  { color: 'from-amber-500/10 to-amber-900/5', borderColor: 'border-amber-500/20' },
  { color: 'from-orange-500/10 to-orange-900/5', borderColor: 'border-orange-500/20' },
  { color: 'from-violet-500/10 to-violet-900/5', borderColor: 'border-violet-500/20' },
];

function resolveSubscription(rem: Reminder, index: number) {
  const titleLower = rem.title.toLowerCase();
  let Icon = Repeat;
  
  if (rem.category_icon && serviceIcons[rem.category_icon.toLowerCase()]) {
    Icon = serviceIcons[rem.category_icon.toLowerCase()];
  } else {
    for (const [key, iconVal] of Object.entries(serviceIcons)) {
      if (titleLower.includes(key)) {
        Icon = iconVal;
        break;
      }
    }
  }

  const grad = serviceGradients[index % serviceGradients.length];
  const day = rem.due_date ? new Date(rem.due_date).getUTCDate() : 1;

  let color = grad.color;
  let borderColor = grad.borderColor;

  if (rem.brand_color) {
    const map: Record<string, { color: string; borderColor: string }> = {
      red: { color: 'from-red-500/10 to-red-900/5', borderColor: 'border-red-500/20' },
      green: { color: 'from-green-500/10 to-green-900/5', borderColor: 'border-green-500/20' },
      blue: { color: 'from-blue-500/10 to-blue-900/5', borderColor: 'border-blue-500/20' },
      indigo: { color: 'from-indigo-500/10 to-indigo-900/5', borderColor: 'border-indigo-500/20' },
      emerald: { color: 'from-emerald-500/10 to-emerald-900/5', borderColor: 'border-emerald-500/20' },
      amber: { color: 'from-amber-500/10 to-amber-900/5', borderColor: 'border-amber-500/20' },
      orange: { color: 'from-orange-500/10 to-orange-900/5', borderColor: 'border-orange-500/20' },
      violet: { color: 'from-violet-500/10 to-violet-900/5', borderColor: 'border-violet-500/20' },
    };
    if (map[rem.brand_color.toLowerCase()]) {
      color = map[rem.brand_color.toLowerCase()].color;
      borderColor = map[rem.brand_color.toLowerCase()].borderColor;
    }
  }

  return {
    id: rem.id,
    name: rem.title,
    price: Math.abs(rem.amount || 0),
    frequency: rem.frequency || 'Mensal',
    status: rem.paid ? 'pausada' : 'ativa',
    day,
    icon: Icon,
    color,
    borderColor,
  };
}

const monthDays = Array.from({ length: 31 }, (_, i) => i + 1);
const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function Subscriptions() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('reminders')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_recurring', true)
          .order('due_date', { ascending: true });

        if (error) throw error;
        setReminders(data || []);
      } catch (err) {
        console.error('Error fetching reminders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReminders();
  }, []);

  const displaySubs = useMemo(() => {
    return reminders.map((rem, idx) => resolveSubscription(rem, idx));
  }, [reminders]);

  const activeSubs = displaySubs.filter(s => s.status === 'ativa');
  const totalMensal = activeSubs.reduce((acc, s) => acc + s.price, 0);
  const nextCharge = useMemo(() => {
    const today = new Date().getDate();
    const upcoming = displaySubs
      .filter(s => s.status === 'ativa' && s.day >= today)
      .sort((a, b) => a.day - b.day);
    return upcoming[0] || displaySubs.filter(s => s.status === 'ativa').sort((a, b) => a.day - b.day)[0];
  }, [displaySubs]);

  // Calendar charge days
  const chargeDays = new Set(displaySubs.filter(s => s.status === 'ativa').map(s => s.day));

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-950 text-slate-100 h-full no-scrollbar relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(255,255,255,0))] pointer-events-none z-0"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 animate-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase">Assinaturas & Recorrências</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Gerenciamento de despesas fixas mensais
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-emerald-500"></div>
          </div>
        ) : displaySubs.length === 0 ? (
          /* Real Empty State */
          <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-16 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 bg-slate-800/60 rounded-3xl flex items-center justify-center border border-white/5">
              <Repeat className="w-8 h-8 text-slate-600 stroke-[1.5]" />
            </div>
            <div className="space-y-2 max-w-md">
              <p className="text-sm font-black uppercase tracking-wider text-slate-300">Nenhuma assinatura rastreada</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Nenhuma assinatura ou cobrança fixa mensal ativa no momento. Você pode gerenciar e adicionar suas assinaturas através do Gemini AI Brain informando suas recorrências no chat!
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Mensal</p>
                </div>
                <p className="text-2xl font-black text-slate-100">
                  {totalMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 font-bold">
                  {totalMensal > 0 ? `${(totalMensal * 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/ano` : '—'}
                </p>
              </div>

              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <Play className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assinaturas Ativas</p>
                </div>
                <p className="text-2xl font-black text-slate-100">
                  {activeSubs.length}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 font-bold">
                  de {displaySubs.length} cadastradas
                </p>
              </div>

              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <Clock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Próxima Cobrança</p>
                </div>
                <p className="text-lg font-black text-slate-100">
                  {nextCharge ? nextCharge.name : '—'}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 font-bold">
                  {nextCharge ? `Dia ${nextCharge.day} • ${nextCharge.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : '—'}
                </p>
              </div>
            </div>

            {/* Subscription Cards Grid */}
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-emerald-400" />
                Todas as Assinaturas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displaySubs.map((sub) => {
                  const Icon = sub.icon;
                  const isActive = sub.status === 'ativa';
                  return (
                    <div
                      key={sub.id}
                      className={`glass bg-gradient-to-br ${sub.color} rounded-[24px] border ${sub.borderColor} p-6 hover:scale-[1.02] transition-all duration-300 cursor-pointer group relative overflow-hidden`}
                    >
                      {/* Subtle glow */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] rounded-full blur-2xl group-hover:bg-white/[0.04] transition-all"></div>

                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-800/60 rounded-2xl flex items-center justify-center border border-white/5">
                              <Icon className="w-5 h-5 text-slate-300" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-100">{sub.name}</p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{sub.frequency}</p>
                            </div>
                          </div>
                          <span
                            className={`px-2.5 py-1 text-[8px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1 ${
                              isActive
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                : 'bg-slate-500/10 border border-slate-500/20 text-slate-500'
                            }`}
                          >
                            {isActive ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
                            {sub.status}
                          </span>
                        </div>

                        <div className="flex items-end justify-between">
                          <p className="text-lg font-black text-slate-200">
                            {sub.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          <p className="text-[9px] text-slate-500 font-bold">
                            Dia {sub.day}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calendar View */}
            <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-black uppercase tracking-wider">Calendário de Cobranças</h2>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
              </div>

              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map((d, i) => (
                  <div key={i} className="text-center text-[9px] font-black text-slate-600 uppercase tracking-widest py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Leading empty cells for proper day alignment */}
                {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() }, (_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {monthDays.map((day) => {
                  const isToday = day === new Date().getDate();
                  const hasCharge = chargeDays.has(day);
                  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
                  if (day > daysInMonth) return null;

                  return (
                    <div
                      key={day}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all relative ${
                        isToday
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                          : hasCharge
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'text-slate-500 hover:bg-white/5'
                      }`}
                    >
                      {day}
                      {hasCharge && !isToday && (
                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-400"></div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 mt-6 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Hoje</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30 border border-emerald-500/40"></div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dia de Cobrança</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

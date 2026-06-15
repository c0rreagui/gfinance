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
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  X,
  Check,
  Smartphone,
  Layers
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
  card_id?: string | null;
}

interface DBCreditCard {
  id: string;
  card_name: string;
  last_four: string;
  color_theme: string;
}

const serviceIcons: Record<string, any> = {
  Tv,
  Music,
  Cloud,
  Shield,
  Gamepad2,
  BookOpen,
  Dumbbell,
  Zap,
  Smartphone,
  Layers
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

const cardBadgeColors: { [key: string]: string } = {
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  crimson: 'bg-red-500/10 border-red-500/20 text-red-400',
};

function resolveSubscription(rem: Reminder, index: number) {
  const titleLower = rem.title.toLowerCase();
  let Icon = Repeat;
  
  if (rem.category_icon && serviceIcons[rem.category_icon]) {
    Icon = serviceIcons[rem.category_icon];
  } else {
    const serviceIconsLower: Record<string, any> = {
      netflix: Tv,
      spotify: Music,
      icloud: Cloud,
      vpn: Shield,
      xbox: Gamepad2,
      kindle: BookOpen,
      smartfit: Dumbbell,
      chatgpt: Zap,
      tim: Smartphone,
      claro: Smartphone,
      vivo: Smartphone,
      celular: Smartphone,
      planos: Layers,
      plano: Layers,
    };
    for (const [key, iconVal] of Object.entries(serviceIconsLower)) {
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
    rawPaid: rem.paid,
    day,
    icon: Icon,
    color,
    borderColor,
    card_id: rem.card_id
  };
}

const monthDays = Array.from({ length: 31 }, (_, i) => i + 1);
const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function Subscriptions() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [creditCards, setCreditCards] = useState<DBCreditCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for creating subscription
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const [subPrice, setSubPrice] = useState('');
  const [subDueDay, setSubDueDay] = useState('10');
  const [subIcon, setSubIcon] = useState('Tv');
  const [subColor, setSubColor] = useState('indigo');
  const [subCardId, setSubCardId] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // Filter state for calendar day click
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch recurring reminders (Subscriptions)
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_recurring', true)
        .lt('amount', 0)
        .order('due_date', { ascending: true });

      if (error) throw error;
      const parsedData = (data || []).map(r => ({
        ...r,
        amount: typeof r.amount === 'string' ? parseFloat(r.amount) : (r.amount || 0)
      }));
      setReminders(parsedData);

      // 2. Fetch credit cards
      const { data: cardsData } = await supabase
        .from('credit_cards')
        .select('id, card_name, last_four, color_theme')
        .eq('user_id', user.id);
      setCreditCards(cardsData || []);

    } catch (err) {
      console.error('Error fetching subscription page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const displaySubs = useMemo(() => {
    return reminders.map((rem, idx) => resolveSubscription(rem, idx));
  }, [reminders]);

  const subsByDay = useMemo(() => {
    const groups: Record<number, typeof displaySubs> = {};
    displaySubs.filter(s => s.status === 'ativa').forEach(sub => {
      if (!groups[sub.day]) {
        groups[sub.day] = [];
      }
      groups[sub.day].push(sub);
    });
    return groups;
  }, [displaySubs]);

  const filteredSubs = useMemo(() => {
    if (selectedDayFilter === null) return displaySubs;
    return displaySubs.filter(sub => sub.day === selectedDayFilter);
  }, [displaySubs, selectedDayFilter]);

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

  // Toggle paid status (Pause/Resume subscription)
  const handleToggleStatus = async (id: string, currentRawPaid: boolean) => {
    playHapticClick();
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ paid: !currentRawPaid })
        .eq('id', id);

      if (error) throw error;
      await fetchAllData();
    } catch (e) {
      console.error('Error toggling status:', e);
      alert('Erro ao alterar status da assinatura.');
    }
  };

  // Delete subscription
  const handleDeleteSub = async (id: string, name: string) => {
    playHapticClick();
    if (!window.confirm(`Excluir definitivamente a assinatura "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchAllData();
    } catch (e) {
      console.error('Error deleting subscription:', e);
      alert('Erro ao excluir assinatura.');
    }
  };

  const handleDayClick = (day: number, hasCharge: boolean) => {
    playHapticClick();
    if (!hasCharge) {
      setSelectedDayFilter(null);
      return;
    }
    if (selectedDayFilter === day) {
      setSelectedDayFilter(null);
    } else {
      setSelectedDayFilter(day);
    }
  };

  const handlePrevMonth = () => {
    playHapticClick();
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    playHapticClick();
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  // Create Novo Lembrete Recorrente / Assinatura
  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (!subTitle || !subPrice || !subDueDay) {
      setModalError('Preencha os campos obrigatórios.');
      return;
    }

    const priceNum = parseFloat(subPrice);
    const dayNum = parseInt(subDueDay, 10);

    if (isNaN(priceNum) || priceNum <= 0) {
      setModalError('O preço deve ser positivo.');
      return;
    }
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      setModalError('O dia de cobrança deve ser entre 1 e 31.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      const dueDate = new Date(today.getFullYear(), today.getMonth(), dayNum, 12, 0, 0);

      const { error } = await supabase
        .from('reminders')
        .insert({
          user_id: user.id,
          title: subTitle,
          amount: -priceNum, // negative for expense
          due_date: dueDate.toISOString(),
          urgency: 'low',
          paid: false,
          is_recurring: true,
          frequency: 'Mensal',
          category_icon: subIcon,
          brand_color: subColor,
          card_id: subCardId || null
        });

      if (error) throw error;

      setModalSuccess('Assinatura registrada com sucesso!');
      setSubTitle('');
      setSubPrice('');
      setSubDueDay('10');
      setSubIcon('Tv');
      setSubColor('indigo');
      setSubCardId('');

      setTimeout(() => {
        setIsModalOpen(false);
        setModalSuccess('');
        fetchAllData();
      }, 1000);

    } catch (err: any) {
      setModalError(err.message || 'Erro ao registrar assinatura.');
    }
  };

  const playHapticClick = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-950 text-slate-100 h-full no-scrollbar relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(255,255,255,0))] pointer-events-none z-0"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 animate-in">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
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
          <button 
            onClick={() => { playHapticClick(); setIsModalOpen(true); }}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10 cursor-pointer flex items-center gap-1.5 animate-in"
          >
            <Plus className="w-3.5 h-3.5" /> Nova Assinatura
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-emerald-500"></div>
          </div>
        ) : displaySubs.length === 0 ? (
          /* Real Empty State with CTA */
          <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-16 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 bg-slate-800/60 rounded-3xl flex items-center justify-center border border-white/5">
              <Repeat className="w-8 h-8 text-slate-600 stroke-[1.5]" />
            </div>
            <div className="space-y-2 max-w-md">
              <p className="text-sm font-black uppercase tracking-wider text-slate-300">Nenhuma assinatura rastreada</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Nenhuma assinatura ou cobrança fixa mensal ativa no momento. Cadastre suas assinaturas para projetá-las automaticamente no fluxo de faturas e calendário.
              </p>
            </div>
            <button
              onClick={() => { playHapticClick(); setIsModalOpen(true); }}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Cadastrar Minha Primeira Assinatura
            </button>
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
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-emerald-400" />
                  {selectedDayFilter !== null 
                    ? `Assinaturas do Dia ${selectedDayFilter}`
                    : 'Todas as Assinaturas'}
                </h2>
                {selectedDayFilter !== null && (
                  <button
                    onClick={() => { playHapticClick(); setSelectedDayFilter(null); }}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[9px] font-black text-slate-400 hover:text-white rounded-lg uppercase tracking-widest transition-all cursor-pointer border border-white/5"
                  >
                    Ver Todas
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSubs.map((sub) => {
                  const Icon = sub.icon;
                  const isActive = sub.status === 'ativa';
                  const linkedCard = creditCards.find(c => c.id === sub.card_id);

                  return (
                    <div
                      key={sub.id}
                      className={`glass bg-gradient-to-br ${sub.color} rounded-[24px] border ${sub.borderColor} p-6 hover:scale-[1.01] transition-all duration-300 group relative overflow-hidden`}
                    >
                      {/* Subtle glow */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] rounded-full blur-2xl group-hover:bg-white/[0.04] transition-all"></div>

                      <div className="relative z-10 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-800/60 rounded-2xl flex items-center justify-center border border-white/5 text-slate-300">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-100">{sub.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{sub.frequency}</p>
                                {linkedCard && (
                                  <span className={`px-1 rounded text-[7px] font-black uppercase tracking-wider border ${cardBadgeColors[linkedCard.color_theme] || cardBadgeColors.emerald}`}>
                                    💳 {linkedCard.card_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleStatus(sub.id, sub.rawPaid)}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
                              }`}
                              title={isActive ? 'Pausar Assinatura' : 'Reativar Assinatura'}
                            >
                              {isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                            </button>
                            <button
                              onClick={() => handleDeleteSub(sub.id, sub.name)}
                              className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 flex items-center justify-center cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                              title="Excluir Assinatura"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-end justify-between border-t border-white/5 pt-3">
                          <p className="text-lg font-black text-slate-200">
                            {sub.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                            Vence dia {sub.day}
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevMonth}
                    className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Mês Anterior"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest font-mono min-w-[110px] text-center">
                    {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Próximo Mês"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
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
                {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }, (_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {monthDays.map((day) => {
                  const today = new Date();
                  const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
                  const hasCharge = chargeDays.has(day);
                  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
                  if (day > daysInMonth) return null;

                  const isSelected = selectedDayFilter === day;
                  const daySubs = subsByDay[day] || [];

                  return (
                    <div
                      key={day}
                      onClick={() => handleDayClick(day, hasCharge)}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all relative group/day cursor-pointer ${
                        isToday
                          ? isSelected
                            ? 'bg-emerald-500 text-white ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-95 shadow-lg shadow-emerald-500/30'
                            : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                          : isSelected
                          ? 'bg-emerald-500/30 text-emerald-300 border-2 border-emerald-400 scale-95 shadow-md shadow-emerald-500/10'
                          : hasCharge
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:scale-105'
                          : 'text-slate-500 hover:bg-white/5 hover:scale-105'
                      }`}
                    >
                      <span>{day}</span>
                      
                      {/* Mini inline icons on charge days */}
                      {daySubs.length > 0 && (
                        <div className="flex gap-0.5 mt-1 justify-center items-center flex-wrap max-w-full px-1">
                          {daySubs.slice(0, 3).map(sub => {
                            const SubIcon = sub.icon;
                            return (
                              <div 
                                key={sub.id} 
                                className={`p-0.5 rounded text-[8px] border transition-colors ${
                                  isToday 
                                    ? 'bg-white/20 border-white/10 text-white' 
                                    : 'bg-slate-950/60 border-white/5 text-emerald-400'
                                }`}
                                title={sub.name}
                              >
                                <SubIcon className="w-2 h-2" />
                              </div>
                            );
                          })}
                          {daySubs.length > 3 && (
                            <span className={`text-[7px] font-black ${isToday ? 'text-white/60' : 'text-slate-500'}`}>
                              +{daySubs.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tooltip on Hover */}
                      {daySubs.length > 0 && (
                        <div className="absolute bottom-full mb-2.5 hidden group-hover/day:flex flex-col bg-slate-950/95 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl z-30 min-w-[190px] pointer-events-none animate-in fade-in zoom-in-95 duration-150 left-1/2 -translate-x-1/2">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5 pb-1.5 mb-1.5 flex justify-between items-center">
                            <span>Cobranças</span>
                            <span className="font-mono text-emerald-400">Dia {day}</span>
                          </p>
                          <div className="space-y-2 max-h-[120px] overflow-y-auto no-scrollbar">
                            {daySubs.map(sub => {
                              const SubIcon = sub.icon;
                              return (
                                <div key={sub.id} className="flex justify-between items-center gap-2.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <div className="p-1 bg-slate-900 border border-white/5 rounded-lg text-slate-400 shrink-0">
                                      <SubIcon className="w-2.5 h-2.5" />
                                    </div>
                                    <span className="text-[10px] text-slate-200 font-bold truncate max-w-[95px]">{sub.name}</span>
                                  </div>
                                  <span className="text-[9px] text-emerald-400 font-mono font-black whitespace-nowrap">
                                    {sub.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Hoje</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"></div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dia de Cobrança</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30 border-2 border-emerald-400"></div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dia Selecionado (Filtro)</span>
                </div>
                <div className="text-[9px] text-slate-400 ml-auto italic">
                  * Passe o mouse para detalhes • Clique para filtrar
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drawer: Nova Assinatura */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border-l border-white/10 h-full p-8 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider">Nova Assinatura</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Registre uma nova assinatura ou despesa recorrente mensal</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {modalError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateSub} className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome do Serviço / Recorrência</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Netflix, Spotify, Academia"
                    value={subTitle}
                    onChange={(e) => setSubTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Preço Mensal (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 55.90"
                      value={subPrice}
                      onChange={(e) => setSubPrice(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Dia de Cobrança</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      required
                      placeholder="Ex: 10"
                      value={subDueDay}
                      onChange={(e) => setSubDueDay(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white font-mono text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Categoria / Ícone</label>
                    <select
                      value={subIcon}
                      onChange={(e) => setSubIcon(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                    >
                      <option value="Tv">Streaming de Vídeo (Tv)</option>
                      <option value="Music">Streaming de Áudio (Música)</option>
                      <option value="Cloud">Armazenamento Nuvem (Cloud)</option>
                      <option value="Shield">Segurança/VPN (Shield)</option>
                      <option value="Gamepad2">Jogos / Consoles (Gamepad)</option>
                      <option value="BookOpen">Leitura / Notícias (Livro)</option>
                      <option value="Dumbbell">Bem-Estar / Esportes (Haltere)</option>
                      <option value="Zap">Tecnologia / SaaS (Raio)</option>
                      <option value="Smartphone">Plano de Celular (Smartphone)</option>
                      <option value="Layers">Assinatura de Planos (Geral)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Variação de Cor</label>
                    <select
                      value={subColor}
                      onChange={(e) => setSubColor(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                    >
                      <option value="red">Vermelho Sunset</option>
                      <option value="green">Verde Mint</option>
                      <option value="blue">Azul Cyber</option>
                      <option value="indigo">Índigo Royal</option>
                      <option value="emerald">Esmeralda Pro</option>
                      <option value="amber">Ouro Gold</option>
                      <option value="orange">Laranja Fire</option>
                      <option value="violet">Roxo Neon</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Cobrado no Cartão</label>
                  <select
                    value={subCardId}
                    onChange={(e) => setSubCardId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                  >
                    <option value="">Nenhum (Débito em Conta/Boleto)</option>
                    {creditCards.map(c => (
                      <option key={c.id} value={c.id}>{c.card_name} (•••• {c.last_four})</option>
                    ))}
                  </select>
                </div>

                <div className="pt-6 border-t border-white/5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3.5 border border-white/5 hover:bg-white/5 text-slate-300 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-500/25 transition-all cursor-pointer text-center"
                  >
                    Registrar Assinatura
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

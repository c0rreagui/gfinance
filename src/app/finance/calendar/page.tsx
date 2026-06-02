'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Repeat, 
  CreditCard, 
  ArrowUpRight, 
  Wallet, 
  AlertCircle, 
  CheckCircle2,
  CalendarDays,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  icon: string;
}

interface Reminder {
  id: string;
  title: string;
  due_date: string;
  amount: number;
  paid: boolean;
  is_recurring: boolean;
  frequency?: string;
  category_icon?: string;
  brand_color?: string;
}

interface CalendarEvent {
  id: string;
  type: 'transaction' | 'subscription' | 'reminder';
  title: string;
  amount: number;
  category: string;
  icon?: string;
  paid?: boolean;
}

// 2. Synthetic Haptic Click using Web Audio API
const playHapticClick = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Satisfying high-frequency magnetic snap style click
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2000, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.04);
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1200, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.03);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.04);
    osc2.stop(ctx.currentTime + 0.04);
  } catch (err) {
    console.warn('Web Audio click sound failed to play:', err);
  }
};

// 8. Subscription Brand Colors mapping helper
const getBrandColor = (title: string): string => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('netflix')) return '#E50914';
  if (lowerTitle.includes('spotify')) return '#1DB954';
  if (lowerTitle.includes('prime') || lowerTitle.includes('amazon')) return '#00A8E8';
  if (lowerTitle.includes('openai') || lowerTitle.includes('chatgpt')) return '#10A37F';
  return '#3b82f6';
};

export default function FinancialCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [initialBalance, setInitialBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 1. Privacy Mode States
  const [isPrivate, setIsPrivate] = useState(false);
  const [revealId, setRevealId] = useState<string | null>(null);

  // Detail Drawer States
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // New Transaction Form inside Drawer
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formCategory, setFormCategory] = useState('Outros');
  const [formError, setFormError] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  
  // Clipboard state for iCal subscription URL
  const [copied, setCopied] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Parallel fetch of all calendar datasets to eliminate waterfall latency
      const [
        { data: profile },
        { data: txs },
        { data: rems }
      ] = await Promise.all([
        supabase.from('profiles').select('initial_balance').eq('id', user.id).single(),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: true }),
        supabase.from('reminders').select('*').eq('user_id', user.id)
      ]);
      
      setInitialBalance(Number(profile?.initial_balance) || 0);
      setTransactions(txs || []);
      setReminders(rems || []);

    } catch (err) {
      console.error('Error fetching calendar dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  // 1. Hover handlers for temporal private reveal
  const handleRevealHover = (id: string, e: React.MouseEvent) => {
    if (isPrivate && e.ctrlKey) {
      setRevealId(id);
    } else {
      setRevealId(null);
    }
  };

  // Helper to render currencies with absolute privacy support
  const renderCurrency = (amount: number, id: string, className?: string) => {
    const isBlurred = isPrivate && revealId !== id;
    return (
      <span 
        className={`${className || ''} transition-all duration-300 ${
          isBlurred ? 'blur-[8px] select-none hover:blur-none' : ''
        }`}
        onMouseMove={(e) => handleRevealHover(id, e)}
        onMouseLeave={() => setRevealId(null)}
      >
        {amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
    );
  };

  const handlePrevMonth = () => {
    playHapticClick();
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
    setIsDrawerOpen(false);
  };

  const handleNextMonth = () => {
    playHapticClick();
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
    setIsDrawerOpen(false);
  };

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // 1. Calculate historical starting balance prior to the 1st of the current month
  const firstDayOfMonth = new Date(year, month, 1);

  const startBalancePriorToMonth = useMemo(() => {
    let bal = initialBalance;
    transactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      if (txDate < firstDayOfMonth) {
        bal += tx.amount;
      }
    });
    return bal;
  }, [transactions, initialBalance, firstDayOfMonth]);

  // 2. Map all transactions and replicated reminders to specific days in the current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Helper to detect if a day is strictly in the past
  const isPastDay = (dayNum: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = new Date(year, month, dayNum);
    return cellDate < today;
  };

  // 6. CFO Confidence Score Badge calculation
  const confidenceScore = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // Check if selected month is in the past
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return '100% Consolidado';
    }
    
    const diffMonths = (year - currentYear) * 12 + (month - currentMonth);
    
    if (diffMonths === 0) {
      return '98% Confiança';
    } else if (diffMonths === 1) {
      return '90% Confiança';
    } else {
      const score = Math.max(50, 90 - (diffMonths - 1) * 10);
      return `${score}% Confiança`;
    }
  }, [year, month]);

  const dailyEvents = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      map[d] = [];
    }

    // A. Add transactions that fall into this month
    transactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      if (txDate.getFullYear() === year && txDate.getMonth() === month) {
        const d = txDate.getDate();
        if (map[d]) {
          map[d].push({
            id: tx.id,
            type: 'transaction',
            title: tx.description,
            amount: tx.amount,
            category: tx.category,
            icon: tx.icon
          });
        }
      }
    });

    // B. Add reminders / subscriptions replicated to their respective calendar days
    reminders.forEach((rem) => {
      const remDate = new Date(rem.due_date);
      
      // Dynamic logic to detect if a reminder is an income or expense
      // If amount is positive and matches typical income categories or titles
      const isIncomeReminder = rem.amount > 0 && (
        rem.category_icon === 'ArrowDownLeft' ||
        rem.category_icon === 'Wallet' ||
        rem.title.toLowerCase().includes('salário') ||
        rem.title.toLowerCase().includes('receita') ||
        rem.title.toLowerCase().includes('rendimento')
      );
      // If it's a despesa and stored as positive, force negative sign for calendar projection
      // If it's stored as negative, keep negative. If income, keep positive.
      const resolvedAmount = rem.amount < 0 
        ? rem.amount 
        : isIncomeReminder 
        ? rem.amount 
        : -rem.amount;

      if (rem.is_recurring) {
        // If recurring: replicates on the same day of the current active month
        const dayOfMonth = remDate.getUTCDate();
        if (map[dayOfMonth]) {
          map[dayOfMonth].push({
            id: rem.id,
            type: rem.category_icon && rem.category_icon !== 'ArrowDownLeft' ? 'subscription' : 'reminder',
            title: rem.title,
            amount: resolvedAmount,
            category: rem.category_icon ? (isIncomeReminder ? 'Receita Recorrente' : 'Assinatura') : 'Lançamento Fixo',
            icon: rem.category_icon || 'Repeat',
            paid: rem.paid
          });
        }
      } else {
        // One-off reminder: only draws if it falls exactly in this month/year
        if (remDate.getFullYear() === year && remDate.getMonth() === month) {
          const dayOfMonth = remDate.getDate();
          if (map[dayOfMonth]) {
            map[dayOfMonth].push({
              id: rem.id,
              type: 'reminder',
              title: rem.title,
              amount: resolvedAmount,
              category: isIncomeReminder ? 'Receita Prevista' : 'Boleto',
              icon: rem.category_icon || 'AlertCircle',
              paid: rem.paid
            });
          }
        }
      }
    });

    return map;
  }, [transactions, reminders, year, month, daysInMonth]);

  // 3. Compute running daily balance projection for each day of the active month
  const dailyBalances = useMemo(() => {
    const map: Record<number, number> = {};
    let currentRunningBalance = startBalancePriorToMonth;

    for (let d = 1; d <= daysInMonth; d++) {
      const events = dailyEvents[d] || [];
      
      // Sum up day events (ignoring paid state for projections to anticipate cash flows)
      events.forEach((ev) => {
        // Replicated subscriptions/reminders are projected as debits unless already paid
        currentRunningBalance += ev.amount;
      });

      map[d] = currentRunningBalance;
    }

    return map;
  }, [startBalancePriorToMonth, dailyEvents, daysInMonth]);

  // Selected Day Items
  const selectedDayItems = useMemo(() => {
    if (selectedDay === null) return [];
    return dailyEvents[selectedDay] || [];
  }, [selectedDay, dailyEvents]);

  const selectedDayProjectedBalance = useMemo(() => {
    if (selectedDay === null) return 0;
    return dailyBalances[selectedDay] || 0;
  }, [selectedDay, dailyBalances]);

  // Core KPIs for the Top Banner
  const monthKpis = useMemo(() => {
    let projectedExpenses = 0;
    let projectedIncomes = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const events = dailyEvents[d] || [];
      events.forEach((ev) => {
        if (ev.amount > 0) projectedIncomes += ev.amount;
        else projectedExpenses += Math.abs(ev.amount);
      });
    }

    const netProjections = projectedIncomes - projectedExpenses;

    return {
      projectedIncomes,
      projectedExpenses,
      netProjections
    };
  }, [dailyEvents, daysInMonth]);

  // 7. iCal Subscription Copy Link Action
  const handleSyncCalendar = () => {
    if (!userId) return;
    playHapticClick();
    const url = `${window.location.origin}/api/finance/calendar/export?userId=${userId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 9. 1-Click Quick-Pay toggle
  const handleTogglePaid = async (id: string) => {
    playHapticClick();
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ paid: true })
        .eq('id', id);

      if (error) throw error;

      await fetchCalendarData();
    } catch (err) {
      console.error('Error toggling paid state:', err);
    }
  };

  // 10. Drag-and-Drop Rescheduling handlers
  const handleDragStart = (e: React.DragEvent, reminderId: string) => {
    e.dataTransfer.setData('text/plain', reminderId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, dayNum: number) => {
    e.preventDefault();
    const reminderId = e.dataTransfer.getData('text/plain');
    if (!reminderId) return;

    playHapticClick();

    const newDate = new Date(year, month, dayNum, 12, 0, 0);
    const formattedDate = newDate.toISOString().split('T')[0];

    try {
      const { error } = await supabase
        .from('reminders')
        .update({ due_date: formattedDate })
        .eq('id', reminderId);

      if (error) throw error;

      await fetchCalendarData();
    } catch (err) {
      console.error('Error updating rescheduled date:', err);
    }
  };

  // Drawer Create Transaction Action
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDay === null || !formDesc || !formAmount) return;
    setFormError('');

    const numericAmount = parseFloat(formAmount) * (formType === 'expense' ? -1 : 1);
    
    // Build date for selected day
    const transactionDate = new Date(year, month, selectedDay, 12, 0, 0);

    const getCategoryIcon = (cat: string, type: 'income' | 'expense') => {
      if (type === 'income') return 'ArrowDownLeft';
      switch (cat) {
        case 'Alimentação': return 'ShoppingCart';
        case 'Salário': return 'Wallet';
        case 'Cartão': return 'CreditCard';
        case 'Utilidades': return 'Zap';
        case 'Transporte': return 'Car';
        case 'Assinaturas': return 'Tv';
        case 'Boleto': return 'FileText';
        case 'Rendimentos': return 'Activity';
        case 'Transferência': return 'Wallet';
        case 'Saúde': return 'Heart';
        default: return 'Activity';
      }
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFormError('Você precisa estar autenticado para realizar esta ação.');
        return;
      }

      if (isRecurring) {
        // Create as a recurring reminder/subscription in Supabase
        const categoryIcon = getCategoryIcon(formCategory, formType);
        const { error } = await supabase.from('reminders').insert({
          user_id: user.id,
          title: formDesc,
          amount: numericAmount, // Stores signed value (- for despesa, + for receita)
          due_date: transactionDate.toISOString(),
          is_recurring: true,
          paid: false,
          urgency: 'medium',
          category_icon: categoryIcon,
          brand_color: getBrandColor(formDesc),
          frequency: 'mensal'
        });

        if (error) throw error;
      } else {
        // Create as a standard one-off transaction
        const { error } = await supabase.from('transactions').insert({
          user_id: user.id,
          description: formDesc,
          category: formCategory,
          amount: numericAmount,
          icon: getCategoryIcon(formCategory, formType),
          date: transactionDate.toISOString()
        });

        if (error) throw error;
      }

      // Synthesize satisfatory feedback on creation
      playHapticClick();

      // Re-fetch
      await fetchCalendarData();

      // Reset
      setFormDesc('');
      setFormAmount('');
      setFormCategory('Outros');
      setIsRecurring(false);
      setIsFormOpen(false);

    } catch (err: any) {
      setFormError(err.message || 'Erro ao criar transação.');
    }
  };

  // Generate grid days cells
  const firstDayIndex = new Date(year, month, 1).getDay(); // index 0-6 (Sun-Sat)
  const calendarCells = useMemo(() => {
    const cells: { type: 'empty' | 'day'; dayNum?: number }[] = [];

    // Prepend empty cells
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ type: 'empty' });
    }

    // Days cells
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ type: 'day', dayNum: d });
    }

    return cells;
  }, [firstDayIndex, daysInMonth]);

  if (loading && transactions.length === 0) {
    return (
      <div className="flex-1 overflow-hidden flex bg-slate-950 text-slate-100 h-full relative">
        <main className="flex-1 overflow-y-auto p-8 no-scrollbar relative z-10 flex flex-col h-full animate-pulse pointer-events-none select-none">
          <div className="max-w-6xl mx-auto space-y-6 w-full flex-1 flex flex-col">
            {/* Header skeleton */}
            <div className="flex justify-between items-center h-12 bg-white/5 border border-white/5 rounded-2xl"></div>
            {/* KPIs banner skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-20 bg-white/5 border border-white/5 rounded-[24px]"></div>
              <div className="h-20 bg-white/5 border border-white/5 rounded-[24px]"></div>
              <div className="h-20 bg-white/5 border border-white/5 rounded-[24px]"></div>
            </div>
            {/* Grid skeleton */}
            <div className="flex-1 bg-white/5 border border-white/5 rounded-[32px] p-6 h-[480px]"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex bg-slate-950 text-slate-100 h-full relative">
      {/* 3. Inline styled keyframes for high-end cascade */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .stagger-in {
          animation: fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}} />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(255,255,255,0))] pointer-events-none z-0"></div>

      <main className="flex-1 overflow-y-auto p-8 no-scrollbar relative z-10 flex flex-col h-full">
        <div className="max-w-6xl mx-auto space-y-6 w-full flex-1 flex flex-col">
          
          {/* Header */}
          <div className="stagger-in flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black tracking-tight uppercase">Calendário Financeiro</h1>
                  
                  {/* 6. CFO Confidence Score Badge */}
                  <div className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider rounded-full shadow-lg shadow-emerald-500/5 backdrop-blur-md">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>{confidenceScore}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Fluxo de Caixa Projetado & Lançamentos Periódicos
                </p>
              </div>
            </div>

            {/* Navigation & Controls */}
            <div className="flex items-center gap-3">
              {/* 7. iCal Sync Button */}
              {userId && (
                <button
                  onClick={handleSyncCalendar}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-900/60 border border-white/5 hover:border-white/10 hover:bg-slate-900 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white cursor-pointer shadow-lg shadow-black/20"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{copied ? 'Link Copiado!' : 'Sincronizar Agenda'}</span>
                </button>
              )}

              {/* 1. Privacy Mode Glassmorphic Toggle */}
              <button
                onClick={() => {
                  playHapticClick();
                  setIsPrivate(!isPrivate);
                }}
                className="p-2 bg-slate-900/60 border border-white/5 hover:border-white/10 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-white flex items-center justify-center shrink-0 shadow-lg shadow-black/20"
                title={isPrivate ? "Revelar Valores (Ctrl + Mouse sobre o campo)" : "Ocultar Valores (Modo Privacidade)"}
              >
                {isPrivate ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4" />}
              </button>

              {/* Navigation Month Control */}
              <div className="flex items-center gap-2 bg-slate-900/60 border border-white/5 p-1 rounded-2xl shadow-lg shadow-black/20">
                <button 
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black uppercase tracking-widest px-4 text-slate-200 capitalize">
                  {monthName}
                </span>
                <button 
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Top KPIs Banner */}
          <div className="stagger-in grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0" style={{ animationDelay: '100ms' }}>
            <div className="glass bg-slate-900/40 border border-white/5 rounded-[24px] p-5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Receitas Previstas</p>
                <p className="text-lg font-black text-emerald-400 mt-1">
                  {renderCurrency(monthKpis.projectedIncomes, 'kpi-incomes')}
                </p>
              </div>
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            <div className="glass bg-slate-900/40 border border-white/5 rounded-[24px] p-5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Despesas Projetadas</p>
                <p className="text-lg font-black text-red-400 mt-1">
                  {renderCurrency(monthKpis.projectedExpenses, 'kpi-expenses')}
                </p>
              </div>
              <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>

            <div className="glass bg-slate-900/40 border border-white/5 rounded-[24px] p-5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Resultado Líquido do Mês</p>
                <p className="text-lg font-black mt-1">
                  {renderCurrency(monthKpis.netProjections, 'kpi-net', monthKpis.netProjections >= 0 ? 'text-emerald-400' : 'text-red-400')}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${monthKpis.netProjections >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                <Wallet className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Calendar Grid Box */}
          <div className="flex-1 glass bg-slate-900/20 border border-white/5 rounded-[32px] overflow-hidden flex flex-col p-6 min-h-[480px]">
            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-2 mb-3 shrink-0">
              {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day) => (
                <div key={day} className="text-center text-[9px] font-black text-slate-500 uppercase tracking-widest py-2">
                  {day.substring(0, 3)}
                </div>
              ))}
            </div>

            {/* Grid days */}
            <div className="grid grid-cols-7 gap-2.5 flex-1 select-none">
              {calendarCells.map((cell, idx) => {
                if (cell.type === 'empty') {
                  return <div key={`empty-${idx}`} className="bg-slate-900/5 border border-transparent rounded-[20px]" />;
                }

                const dayNum = cell.dayNum!;
                const isSelected = selectedDay === dayNum;
                const events = dailyEvents[dayNum] || [];
                const dailyProjBalance = dailyBalances[dayNum] || 0;
                
                // Indicators check
                const hasIncomes = events.some(e => e.amount > 0);
                const hasExpenses = events.some(e => e.amount < 0 && e.type !== 'subscription');
                const hasSubscriptions = events.some(e => e.type === 'subscription');
                const hasReminders = events.some(e => e.type === 'reminder');

                // 5. Past vs Future Temporal styling
                const cellIsPast = isPastDay(dayNum);
                const temporalCellClass = cellIsPast
                  ? 'opacity-70 saturate-50 hover:opacity-100 hover:saturate-100'
                  : 'bright-cell';

                // 4. Data Congestion & Proportions Progress Bar calculation
                const dayEvents = events.slice(0, 3);
                const hasMoreThan3 = events.length > 3;
                const totalIncomesVolume = events.filter(e => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
                const totalExpensesVolume = events.filter(e => e.amount < 0).reduce((sum, e) => sum + Math.abs(e.amount), 0);
                const totalVolume = totalIncomesVolume + totalExpensesVolume;
                
                const incomePct = totalVolume > 0 ? (totalIncomesVolume / totalVolume) * 100 : 0;
                const expensePct = totalVolume > 0 ? (totalExpensesVolume / totalVolume) * 100 : 0;

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => {
                      setSelectedDay(dayNum);
                      setIsDrawerOpen(true);
                    }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, dayNum)}
                    className={`rounded-[20px] p-3 border transition-all duration-300 flex flex-col justify-between cursor-pointer group hover:scale-[1.02] stagger-in ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/5'
                        : 'bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/80'
                    } ${temporalCellClass}`}
                    style={{ animationDelay: `${200 + idx * 8}ms` }}
                  >
                    {/* Day number & indicators */}
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                        isSelected ? 'bg-emerald-500 text-white' : 'text-slate-300 group-hover:text-white'
                      }`}>
                        {dayNum}
                      </span>

                      {/* Dot indicators - Hidden when page displays mini-badges or limited to 3 */}
                      <div className="flex gap-1">
                        {hasIncomes && <span className="w-1 h-1 rounded-full bg-emerald-400" title="Receitas" />}
                        {hasExpenses && <span className="w-1 h-1 rounded-full bg-red-400" title="Despesas" />}
                        {hasSubscriptions && <span className="w-1 h-1 rounded-full bg-blue-400" title="Assinaturas" />}
                        {hasReminders && <span className="w-1 h-1 rounded-full bg-amber-400" title="Dívidas/Boletos" />}
                      </div>
                    </div>

                    {/* 4. Mini Events list inside cell */}
                    <div className="flex-1 flex flex-col justify-center my-2 space-y-1">
                      {dayEvents.map((ev, i) => {
                        const isInc = ev.amount > 0;
                        return (
                          <div
                            key={ev.id + '-' + i}
                            className={`text-[8px] font-black px-1.5 py-0.5 rounded-md truncate flex items-center justify-between ${
                              isInc 
                                ? 'bg-emerald-500/10 text-emerald-400/90 border border-emerald-500/10' 
                                : 'bg-red-500/10 text-red-400/90 border border-red-500/10'
                            }`}
                          >
                            <span className="truncate max-w-[65px]">{ev.title}</span>
                            <span 
                              className={`font-mono font-bold shrink-0 transition-all duration-300 ${
                                isPrivate && revealId !== `cell-ev-${ev.id}` ? 'blur-[4px] select-none' : ''
                              }`}
                              onMouseMove={(e) => handleRevealHover(`cell-ev-${ev.id}`, e)}
                              onMouseLeave={() => setRevealId(null)}
                            >
                              {isInc ? '+' : '-'}{Math.abs(ev.amount).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        );
                      })}
                      
                      {/* Subtle Congestion Indicators */}
                      {hasMoreThan3 && (
                        <div className="space-y-1 pt-0.5">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-left leading-none">
                            +{events.length - 3} lançamentos
                          </div>
                          {/* Proportions Progress Bar */}
                          <div className="h-0.5 w-full bg-white/10 rounded-full overflow-hidden flex">
                            <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${incomePct}%` }} />
                            <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${expensePct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Balance projection at the bottom */}
                    <div className="text-right">
                      <span 
                        className={`text-[8px] font-mono font-bold block transition-all duration-300 ${
                          dailyProjBalance >= 0 ? 'text-emerald-500/80' : 'text-red-500/80'
                        } ${isPrivate && revealId !== `cell-bal-${dayNum}` ? 'blur-[8px] select-none hover:blur-none' : ''}`}
                        onMouseMove={(e) => handleRevealHover(`cell-bal-${dayNum}`, e)}
                        onMouseLeave={() => setRevealId(null)}
                      >
                        {dailyProjBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Slide-out Day Details Drawer (Overlay right sheet) */}
      {isDrawerOpen && selectedDay !== null && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border-l border-white/10 p-8 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300 relative">
            
            {/* Header Drawer */}
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Dia {selectedDay} de {currentDate.toLocaleDateString('pt-BR', { month: 'long' })}
                    </h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Lançamentos agendados</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setIsFormOpen(false);
                  }}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Day Projections Balance KPI */}
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 flex justify-between items-center">
                {/* 5. Past vs Future Label logic */}
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {isPastDay(selectedDay) ? 'Saldo Consolidado' : 'Saldo Diário Projetado'}
                </span>
                <span className="text-sm font-black font-mono">
                  {renderCurrency(selectedDayProjectedBalance, 'drawer-balance', selectedDayProjectedBalance >= 0 ? 'text-emerald-400' : 'text-red-400')}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-3 overflow-y-auto no-scrollbar max-h-[300px] pr-1">
                {selectedDayItems.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 space-y-2">
                    <CalendarIcon className="w-8 h-8 text-slate-700 mx-auto stroke-[1.5]" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhum evento para este dia</p>
                  </div>
                ) : (
                  selectedDayItems.map((ev) => {
                    const isIncome = ev.amount > 0;
                    const isReminder = ev.type === 'reminder' || ev.type === 'subscription';
                    
                    // 8. Brand Color Vertical Line Accent
                    const brandColor = isReminder ? getBrandColor(ev.title) : null;
                    
                    // 9. Checkbox visualization logic
                    const showCheckbox = isReminder && ev.paid !== undefined;

                    return (
                      <div
                        key={ev.id}
                        draggable={isReminder && !ev.paid}
                        onDragStart={isReminder ? (e) => handleDragStart(e, ev.id) : undefined}
                        className={`relative overflow-hidden pl-5 p-4 bg-slate-950/30 border border-white/5 rounded-2xl flex justify-between items-center hover:border-white/10 transition-colors ${
                          isReminder && !ev.paid ? 'cursor-grab active:cursor-grabbing' : ''
                        }`}
                      >
                        {brandColor && (
                          <div 
                            className="absolute left-0 top-0 bottom-0 w-[3px]"
                            style={{ backgroundColor: brandColor }}
                          />
                        )}

                        <div className="flex items-center gap-3">
                          {/* 9. 1-Click Quick-Pay Checkbox */}
                          {showCheckbox && (
                            <button
                              onClick={() => !ev.paid && handleTogglePaid(ev.id)}
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                ev.paid 
                                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                                  : 'border-slate-600 hover:border-emerald-500 cursor-pointer'
                              }`}
                              title={ev.paid ? 'Confirmado' : 'Marcar como Pago'}
                            >
                              {ev.paid ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : null}
                            </button>
                          )}

                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                            isIncome
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : ev.type === 'subscription'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {isIncome ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : ev.type === 'subscription' ? (
                              <Repeat className="w-4 h-4" />
                            ) : (
                              <CreditCard className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-200">{ev.title}</p>
                            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                              {ev.category} • {ev.type.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-black">
                            {renderCurrency(ev.amount, `drawer-item-${ev.id}`, isIncome ? 'text-emerald-400' : 'text-slate-200')}
                          </p>
                          {ev.paid !== undefined && (
                            <span className={`text-[7px] font-black uppercase tracking-widest ${
                              ev.paid ? 'text-emerald-500' : 'text-amber-500'
                            }`}>
                              {ev.paid ? 'Pago' : 'Pendente'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Fast Register Form Drawer */}
            <div className="mt-8 border-t border-white/5 pt-6 space-y-4 shrink-0">
              {!isFormOpen ? (
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Adicionar Transação
                </button>
              ) : (
                <form onSubmit={handleCreateTransaction} className="space-y-4 animate-in fade-in duration-200">
                  {formError && (
                    <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Switch Type */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormType('expense')}
                      className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                        formType === 'expense' 
                          ? 'bg-slate-900 text-white shadow' 
                          : 'text-slate-500 hover:text-white'
                      }`}
                    >
                      Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('income')}
                      className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                        formType === 'income' 
                          ? 'bg-slate-900 text-white shadow' 
                          : 'text-slate-500 hover:text-white'
                      }`}
                    >
                      Receita
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Descrição (ex: Jantar, Dividendos)"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Valor (R$)"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                    />
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                    >
                      <option value="Outros">Outros</option>
                      <option value="Alimentação">Alimentação</option>
                      <option value="Lazer">Lazer</option>
                      <option value="Salário">Salário</option>
                      <option value="Cartão">Cartão</option>
                      <option value="Utilidades">Utilidades</option>
                      <option value="Transporte">Transporte</option>
                      <option value="Assinaturas">Assinaturas</option>
                      <option value="Boleto">Boleto</option>
                      <option value="Rendimentos">Rendimentos</option>
                      <option value="Transferência">Transferência</option>
                      <option value="Saúde">Saúde</option>
                    </select>
                  </div>

                  {/* 11. Recurring Toggle Switch */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-white/5 rounded-xl animate-in fade-in duration-350">
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Repetir Mensalmente</span>
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Criará um lançamento recorrente</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playHapticClick();
                        setIsRecurring(!isRecurring);
                      }}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer flex items-center ${
                        isRecurring ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white shadow-md transform duration-200" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="flex-1 py-3 border border-white/5 hover:bg-white/5 text-slate-300 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer text-center"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer text-center"
                    >
                      Cadastrar
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

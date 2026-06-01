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
  Sparkles
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

export default function FinancialCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [initialBalance, setInitialBalance] = useState(0);
  const [loading, setLoading] = useState(true);

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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch user initial balance from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('initial_balance')
        .eq('id', user.id)
        .single();
      
      setInitialBalance(Number(profile?.initial_balance) || 0);

      // 2. Fetch all transactions for the user
      const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      setTransactions(txs || []);

      // 3. Fetch reminders (both recurring and unpaid one-offs)
      const { data: rems } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id);

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

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
    setIsDrawerOpen(false);
  };

  const handleNextMonth = () => {
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
      
      if (rem.is_recurring) {
        // If recurring: replicates on the same day of the current active month
        const dayOfMonth = remDate.getUTCDate();
        if (map[dayOfMonth]) {
          map[dayOfMonth].push({
            id: rem.id,
            type: rem.category_icon ? 'subscription' : 'reminder',
            title: rem.title,
            amount: -Math.abs(rem.amount), // despesas recorrentes
            category: rem.category_icon ? 'Assinatura' : 'Lançamento Fixo',
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
              amount: -Math.abs(rem.amount),
              category: 'Boleto',
              icon: 'AlertCircle',
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

  // Drawer Create Transaction Action
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDay === null || !formDesc || !formAmount) return;
    setFormError('');

    const numericAmount = parseFloat(formAmount) * (formType === 'expense' ? -1 : 1);
    
    // Build date for selected day
    const transactionDate = new Date(year, month, selectedDay, 12, 0, 0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFormError('Você precisa estar autenticado para realizar esta ação.');
        return;
      }

      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        description: formDesc,
        category: formCategory,
        amount: numericAmount,
        icon: formType === 'expense' ? 'ShoppingCart' : 'ArrowDownLeft',
        date: transactionDate.toISOString()
      });

      if (error) throw error;

      // Re-fetch
      await fetchCalendarData();

      // Reset
      setFormDesc('');
      setFormAmount('');
      setFormCategory('Outros');
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
      <div className="flex-1 flex justify-center items-center h-full bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex bg-slate-950 text-slate-100 h-full relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(255,255,255,0))] pointer-events-none z-0"></div>

      <main className="flex-1 overflow-y-auto p-8 no-scrollbar relative z-10 flex flex-col h-full">
        <div className="max-w-6xl mx-auto space-y-6 w-full flex-1 flex flex-col">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight uppercase">Calendário Financeiro</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Fluxo de Caixa Projetado & Lançamentos Periódicos
                </p>
              </div>
            </div>

            {/* Navigation Month Control */}
            <div className="flex items-center gap-2 bg-slate-900/60 border border-white/5 p-1 rounded-2xl">
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

          {/* Top KPIs Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            <div className="glass bg-slate-900/40 border border-white/5 rounded-[24px] p-5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Receitas Previstas</p>
                <p className="text-lg font-black text-emerald-400 mt-1">
                  {monthKpis.projectedIncomes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                  {monthKpis.projectedExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>

            <div className="glass bg-slate-900/40 border border-white/5 rounded-[24px] p-5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Resultado Líquido do Mês</p>
                <p className={`text-lg font-black mt-1 ${monthKpis.netProjections >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {monthKpis.netProjections.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => {
                      setSelectedDay(dayNum);
                      setIsDrawerOpen(true);
                    }}
                    className={`rounded-[20px] p-3 border transition-all duration-300 flex flex-col justify-between cursor-pointer group hover:scale-[1.02] ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/5'
                        : 'bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/80'
                    }`}
                  >
                    {/* Day number & indicators */}
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                        isSelected ? 'bg-emerald-500 text-white' : 'text-slate-300 group-hover:text-white'
                      }`}>
                        {dayNum}
                      </span>

                      {/* Dot indicators */}
                      <div className="flex gap-1">
                        {hasIncomes && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Receitas" />}
                        {hasExpenses && <span className="w-1.5 h-1.5 rounded-full bg-red-400" title="Despesas" />}
                        {hasSubscriptions && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Assinaturas" />}
                        {hasReminders && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Dívidas/Boletos" />}
                      </div>
                    </div>

                    {/* Balance projection at the bottom */}
                    <div className="mt-4 text-right">
                      <span className={`text-[8px] font-mono font-bold block ${
                        dailyProjBalance >= 0 ? 'text-emerald-500/80' : 'text-red-500/80'
                      }`}>
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
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Diário Projetado</span>
                <span className={`text-sm font-black font-mono ${selectedDayProjectedBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {selectedDayProjectedBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                    return (
                      <div
                        key={ev.id}
                        className="p-4 bg-slate-950/30 border border-white/5 rounded-2xl flex justify-between items-center hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs ${
                            ev.type === 'transaction'
                              ? isIncome 
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-red-500/10 text-red-400'
                              : ev.type === 'subscription'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {ev.type === 'transaction' ? (
                              isIncome ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
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
                          <p className={`text-xs font-black ${isIncome ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {ev.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                      <option value="Transporte">Transporte</option>
                    </select>
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

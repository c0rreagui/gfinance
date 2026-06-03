'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Tv, 
  ShoppingCart, 
  ArrowDownLeft, 
  Zap, 
  Activity,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Filter
} from 'lucide-react';
import { TiltCard } from '@/components/TiltCard';
import { supabase } from '@/lib/supabase';
import { AiChatHub } from '@/app/components/AiChatHub';
import { User } from '@supabase/supabase-js';
import { reconcileBalances } from '@/lib/reconcile';

// Lucide Icon mapping dictionary helper
const iconMap: { [key: string]: React.ComponentType<any> } = {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Tv,
  ShoppingCart,
  ArrowDownLeft,
  Zap,
  Activity
};

interface Stat {
  id: string;
  label: string;
  value: string;
  trend: string;
  icon: string;
  color: string;
}

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
  urgency: 'high' | 'medium' | 'low';
}

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  color: string;
}

const playHapticClick = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {}
};

export default function FinanceDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cardLastFour, setCardLastFour] = useState<string>('4290');

  // Dynamic dashboard states
  const [stats, setStats] = useState<Stat[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Ignored range states
  const [ignoredRange, setIgnoredRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(() => new Date().getMonth());

  useEffect(() => {
    if (isFilterOpen) {
      if (filterStart) {
        const d = new Date(filterStart);
        if (!isNaN(d.getTime())) {
          setPickerYear(d.getFullYear());
          setPickerMonth(d.getMonth());
        }
      } else {
        const d = new Date();
        setPickerYear(d.getFullYear());
        setPickerMonth(d.getMonth());
      }
    }
  }, [isFilterOpen, filterStart]);

  useEffect(() => {
    const rangeStr = localStorage.getItem('gfinance_ignored_period');
    if (rangeStr) {
      try {
        const range = JSON.parse(rangeStr);
        setIgnoredRange(range);
        setFilterStart(range.startDate || '');
        setFilterEnd(range.endDate || '');
      } catch {}
    }

    const handleStorageChange = () => {
      const updated = localStorage.getItem('gfinance_ignored_period');
      if (updated) {
        try {
          const range = JSON.parse(updated);
          setIgnoredRange(range);
          setFilterStart(range.startDate || '');
          setFilterEnd(range.endDate || '');
        } catch {}
      } else {
        setIgnoredRange(null);
        setFilterStart('');
        setFilterEnd('');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    setMounted(true);
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchDashboardData(user.id);
    }
  }, [ignoredRange, user?.id]);

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
      await fetchDashboardData(user.id);
    } catch (err) {
      console.error('Error verifying auth state:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async (userId: string) => {
    try {
      // Reconcile balances first to sync any newly matured future transactions
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseToken = session?.access_token;
      if (supabaseToken) {
        try {
          await fetch('/api/finance/reconcile', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseToken}`
            }
          });
        } catch (e) {
          console.warn('Silent balance reconciliation failed:', e);
        }
      }

      // Fetch ignored transactions in parallel if ignoredRange is set
      let ignoredIncome = 0;
      let ignoredExpense = 0;

      if (ignoredRange) {
        const { data: ignoredTxs } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', userId)
          .gte('date', ignoredRange.startDate + 'T00:00:00Z')
          .lte('date', ignoredRange.endDate + 'T23:59:59Z');

        if (ignoredTxs) {
          ignoredTxs.forEach(tx => {
            const val = Number(tx.amount);
            if (val > 0) {
              ignoredIncome += val;
            } else {
              ignoredExpense += Math.abs(val);
            }
          });
        }
      }

      // Parallel fetch of all dashboard datasets to eliminate waterfall latency
      const [
        { data: dbBalances },
        { data: dbTransactions },
        { data: dbReminders },
        { data: dbGoals },
        { data: dbCards }
      ] = await Promise.all([
        supabase.from('balances').select('*').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId).lte('date', new Date().toISOString()).order('date', { ascending: false }).limit(ignoredRange ? 35 : 5),
        supabase.from('reminders').select('*').eq('user_id', userId).eq('paid', false).lt('amount', 0).order('due_date', { ascending: true }).limit(10),
        supabase.from('goals').select('*').eq('user_id', userId).limit(2),
        supabase.from('credit_cards').select('last_four').eq('user_id', userId).limit(1)
      ]);
      
      if (dbBalances && dbBalances.length > 0) {
        const formattedStats = dbBalances.map((b: { id: string; label: string; amount: any; trend: string; icon: string; type: string }) => {
          let amt = typeof b.amount === 'string' ? parseFloat(b.amount) : (b.amount || 0);
          if (ignoredRange) {
            if (b.type === 'income') {
              amt = Math.max(0, amt - ignoredIncome);
            } else if (b.type === 'expense') {
              amt = Math.max(0, amt - ignoredExpense);
            } else if (b.type === 'total') {
              amt = amt - ignoredIncome + ignoredExpense;
            }
          }
          return {
            id: b.id,
            label: b.label,
            value: amt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            trend: b.trend || '+0%',
            icon: b.icon || 'Wallet',
            color: b.type === 'expense' ? 'orange' : 'emerald'
          };
        });
        setStats(formattedStats);
      } else {
        setStats([
          { id: '1', label: 'Saldo Total', value: 'R$ 0,00', trend: '+0%', icon: 'Wallet', color: 'emerald' },
          { id: '2', label: 'Receitas', value: 'R$ 0,00', trend: '+0%', icon: 'ArrowUpCircle', color: 'emerald' },
          { id: '3', label: 'Despesas', value: 'R$ 0,00', trend: '-0%', icon: 'ArrowDownCircle', color: 'orange' }
        ]);
      }
 
      let filteredTxs = dbTransactions || [];
      if (ignoredRange) {
        const start = new Date(ignoredRange.startDate + 'T00:00:00Z');
        const end = new Date(ignoredRange.endDate + 'T23:59:59Z');
        filteredTxs = filteredTxs.filter(t => {
          const tDate = new Date(t.date);
          return !(tDate >= start && tDate <= end);
        });
      }

      setTransactions(filteredTxs.slice(0, 5).map(t => ({
        ...t,
        amount: typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount || 0)
      })));

      let filteredRems = dbReminders || [];
      if (ignoredRange) {
        const start = new Date(ignoredRange.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(ignoredRange.endDate);
        end.setHours(23, 59, 59, 999);
        
        filteredRems = filteredRems.filter(r => {
          if (!r.due_date) return true;
          const due = new Date(r.due_date);
          due.setHours(12, 0, 0, 0);
          return !(due >= start && due <= end);
        });
      }

      setReminders(filteredRems.slice(0, 2).map(r => ({
        ...r,
        amount: typeof r.amount === 'string' ? parseFloat(r.amount) : (r.amount || 0)
      })));
      setGoals(dbGoals || []);

      if (dbCards && dbCards.length > 0 && dbCards[0].last_four) {
        setCardLastFour(dbCards[0].last_four);
      }

    } catch (err) {
      console.error('Error fetching dashboard records:', err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  // Generate dynamic, actual running balance bezier paths for Cash Flow SVG
  const getChartPaths = () => {
    if (transactions.length === 0) {
      const stroke = "M 0 160 Q 150 120, 300 90 T 600 30";
      const fill = "M 0 200 L 0 160 Q 150 120, 300 90 T 600 30 L 600 200 Z";
      return { stroke, fill };
    }

    const sorted = [...transactions].reverse();
    const pointsCount = sorted.length;
    const stepX = 600 / Math.max(pointsCount - 1, 1);
    
    let currentBalance = 0;
    const balancesList: number[] = [];
    sorted.forEach((tx) => {
      currentBalance += tx.amount;
      balancesList.push(currentBalance);
    });

    const minBalance = Math.min(...balancesList, 0);
    const maxBalance = Math.max(...balancesList, 100);
    const balanceRange = maxBalance - minBalance || 1;

    const coordinates = balancesList.map((val, idx) => {
      const x = idx * stepX;
      // Map balance curve to Y: between 170 (bottom area) and 30 (top padding)
      const y = 170 - ((val - minBalance) / balanceRange) * 140;
      return { x, y };
    });

    let stroke = `M ${coordinates[0].x} ${coordinates[0].y}`;
    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];
      const cpX1 = prev.x + stepX / 2;
      const cpY1 = prev.y;
      const cpX2 = curr.x - stepX / 2;
      const cpY2 = curr.y;
      stroke += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }

    const fill = `M ${coordinates[0].x} 200 L ${coordinates[0].x} ${coordinates[0].y} ${stroke.substring(1)} L ${coordinates[coordinates.length - 1].x} 200 Z`;
    return { stroke, fill };
  };

  const { stroke: chartStroke, fill: chartFill } = getChartPaths();

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-8 no-scrollbar relative h-full bg-slate-950">
        <div className="max-w-6xl mx-auto space-y-8 animate-pulse pointer-events-none select-none">
          {/* Welcome Skeleton */}
          <div className="h-24 bg-white/5 border border-white/5 rounded-[32px]"></div>
          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-white/5 border border-white/5 rounded-[24px]"></div>
            <div className="h-32 bg-white/5 border border-white/5 rounded-[24px]"></div>
            <div className="h-32 bg-white/5 border border-white/5 rounded-[24px]"></div>
          </div>
          {/* Content Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="h-64 bg-white/5 border border-white/5 rounded-[32px]"></div>
              <div className="h-64 bg-white/5 border border-white/5 rounded-[32px]"></div>
            </div>
            <div className="space-y-8">
              <div className="h-56 bg-white/5 border border-white/5 rounded-[32px]"></div>
              <div className="h-56 bg-white/5 border border-white/5 rounded-[32px]"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-8 no-scrollbar relative h-full">
      <div className="max-w-6xl mx-auto space-y-8 animate-in">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/40 dark:bg-slate-800/40 p-6 rounded-[32px] border border-white/50 dark:border-white/5 gap-4">
          <div className="flex items-center gap-4">
            {/* Premium Glowing Avatar */}
            {user?.user_metadata?.avatar_url ? (
              <div className="relative group flex-shrink-0">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt={user.user_metadata.full_name || 'Avatar'} 
                  className="relative w-12 h-12 rounded-full border-2 border-white/10 dark:border-slate-950 object-cover shadow-inner"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="relative group flex-shrink-0">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-950 border border-white/10 dark:border-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-sm uppercase">
                  {(user?.user_metadata?.full_name || user?.email || 'U').substring(0, 2)}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                Olá, {user?.user_metadata?.full_name || user?.email} <Sparkles className="w-5 h-5 text-emerald-500" />
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Conta Premium Vinculada ao Supabase</p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end relative">
            {/* Ignored Range Filter Popover */}
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-xl transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-lg shadow-black/20 ${
                  ignoredRange
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                    : 'bg-slate-900 border-white/5 text-slate-300 hover:bg-slate-800 hover:border-white/10 hover:text-white'
                }`}
                title="Ocultar lembretes pendentes por período"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{ignoredRange ? 'Período Oculto' : 'Ignorar Período'}</span>
              </button>

              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-45 cursor-default" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-md z-50 space-y-4 text-left">
                    <div className="space-y-1">
                      <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Período Ignorado</h3>
                      <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                        Selecione as datas de início e fim no mini-calendário abaixo.
                      </p>
                    </div>

                    {/* Mini Calendar Widget */}
                    <div className="space-y-3">
                      {/* Month Selector Header */}
                      <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            playHapticClick();
                            if (pickerMonth === 0) {
                              setPickerMonth(11);
                              setPickerYear(prev => prev - 1);
                            } else {
                              setPickerMonth(prev => prev - 1);
                            }
                          }}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
                          {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][pickerMonth]} {pickerYear}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            playHapticClick();
                            if (pickerMonth === 11) {
                              setPickerMonth(0);
                              setPickerYear(prev => prev + 1);
                            } else {
                              setPickerMonth(prev => prev + 1);
                            }
                          }}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      {/* Week Days Headers */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-black text-slate-500 uppercase tracking-widest">
                        <span>Dom</span>
                        <span>Seg</span>
                        <span>Ter</span>
                        <span>Qua</span>
                        <span>Qui</span>
                        <span>Sex</span>
                        <span>Sáb</span>
                      </div>
                      
                      {/* Day Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
                          const firstDayIndex = new Date(pickerYear, pickerMonth, 1).getDay();
                          const cells = [];
                          
                          for (let i = 0; i < firstDayIndex; i++) {
                            cells.push(<div key={`pad-${i}`} className="h-7 w-7" />);
                          }
                          
                          for (let d = 1; d <= daysInMonth; d++) {
                            const monthStr = String(pickerMonth + 1).padStart(2, '0');
                            const dayStr = String(d).padStart(2, '0');
                            const dateStr = `${pickerYear}-${monthStr}-${dayStr}`;
                            
                            const isStart = filterStart === dateStr;
                            const isEnd = filterEnd === dateStr;
                            const isInRange = filterStart && filterEnd && dateStr > filterStart && dateStr < filterEnd;
                            
                            let cellClass = "h-7 w-7 text-[10px] rounded-lg flex items-center justify-center cursor-pointer transition-all font-mono ";
                            if (isStart || isEnd) {
                              cellClass += "bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20";
                            } else if (isInRange) {
                              cellClass += "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20";
                            } else {
                              cellClass += "text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white";
                            }
                            
                            cells.push(
                              <button
                                key={`day-${d}`}
                                type="button"
                                onClick={() => {
                                  playHapticClick();
                                  if (!filterStart || (filterStart && filterEnd)) {
                                    setFilterStart(dateStr);
                                    setFilterEnd('');
                                  } else {
                                    if (dateStr >= filterStart) {
                                      setFilterEnd(dateStr);
                                    } else {
                                      setFilterStart(dateStr);
                                      setFilterEnd('');
                                    }
                                  }
                                }}
                                className={cellClass}
                              >
                                {d}
                              </button>
                            );
                          }
                          return cells;
                        })()}
                      </div>
                    </div>

                    {/* Pre-formatted Date Text Display */}
                    <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 font-mono">
                      <div>
                        <span>Início: </span>
                        <span className="text-slate-800 dark:text-slate-200">{filterStart ? new Date(filterStart + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</span>
                      </div>
                      <div>
                        <span>Fim: </span>
                        <span className="text-slate-800 dark:text-slate-200">{filterEnd ? new Date(filterEnd + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (!filterStart || !filterEnd) return;
                          const range = { startDate: filterStart, endDate: filterEnd };
                          localStorage.setItem('gfinance_ignored_period', JSON.stringify(range));
                          setIgnoredRange(range);
                          setIsFilterOpen(false);
                          playHapticClick();
                          window.dispatchEvent(new Event('storage'));
                        }}
                        className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[9px] font-black rounded-lg uppercase tracking-widest transition-all cursor-pointer text-center border-0"
                      >
                        Aplicar
                      </button>
                      <button
                        onClick={() => {
                          localStorage.removeItem('gfinance_ignored_period');
                          setIgnoredRange(null);
                          setFilterStart('');
                          setFilterEnd('');
                          setIsFilterOpen(false);
                          playHapticClick();
                          window.dispatchEvent(new Event('storage'));
                        }}
                        className="flex-1 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-350 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-black rounded-lg uppercase tracking-widest transition-all cursor-pointer text-center border-0"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer text-center border-0"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Link 
            href="/transactions?open=true"
            className="flex items-center justify-between p-5 bg-white/60 dark:bg-slate-800/60 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all rounded-[24px] border border-white/50 dark:border-white/5 shadow-sm text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center text-sm font-black transition-colors group-hover:bg-emerald-500 group-hover:text-white">+</div>
              <span>Novo Lançamento</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link 
            href="/debts?open=true"
            className="flex items-center justify-between p-5 bg-white/60 dark:bg-slate-800/60 hover:bg-amber-500/10 hover:border-amber-500/20 transition-all rounded-[24px] border border-white/50 dark:border-white/5 shadow-sm text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center text-sm font-black transition-colors group-hover:bg-amber-500 group-hover:text-white">+</div>
              <span>Novo Boleto / Dívida</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link 
            href="/wealth?open=true"
            className="flex items-center justify-between p-5 bg-white/60 dark:bg-slate-800/60 hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-all rounded-[24px] border border-white/50 dark:border-white/5 shadow-sm text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center text-sm font-black transition-colors group-hover:bg-indigo-500 group-hover:text-white">+</div>
              <span>Nova Meta de Acúmulo</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, i) => {
            const Icon = iconMap[stat.icon] || Wallet;
            const isPositive = stat.trend.startsWith('+');
            return (
              <TiltCard 
                key={stat.id}
                style={{ animationDelay: `${i * 0.1}s` }} 
                className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-[32px] border border-white/50 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <div className="flex justify-between mb-4">
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                    isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {stat.trend}
                  </span>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  {stat.label}
                </p>
                <h3 className="text-2xl font-black dark:text-white tracking-tight">
                  {stat.value}
                </h3>
              </TiltCard>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Charts & Transactions column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Cash Flow Chart */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-8 rounded-[40px] border border-white/50 dark:border-white/5 shadow-sm">
              <h4 className="font-black text-xl mb-8 dark:text-white">Fluxo de Caixa</h4>
              <div className="h-[200px] w-full relative">
                <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Fill Area Gradient */}
                  <path 
                    d={chartFill}
                    fill="url(#chart-gradient)"
                    className="chart-path opacity-80"
                  />
                  {/* Stroke Path Line */}
                  <path 
                    d={chartStroke} 
                    fill="none" 
                    stroke="#10b981" 
                    strokeWidth="5" 
                    strokeLinecap="round" 
                    className="chart-path" 
                  />
                </svg>
              </div>
            </div>
            
            {/* Recent Transactions Table */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-[40px] border border-white/50 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-white/20 flex justify-between items-center">
                <h4 className="font-black text-xl dark:text-white">Transações Recentes</h4>
                <Link href="/transactions" className="text-emerald-500 font-bold text-sm hover:underline">
                  Ver todas
                </Link>
              </div>
              <div className="overflow-x-auto">
                {transactions.length === 0 ? (
                  <div className="text-center py-12 px-6 text-slate-400 text-sm flex flex-col items-center">
                    <p className="mb-2">Nenhuma transação registrada no seu livro.</p>
                    <Link href="/transactions" className="text-xs font-black text-emerald-500 uppercase tracking-widest hover:underline flex items-center gap-1">
                      Adicionar primeira transação <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {transactions.map((tx) => {
                        const Icon = iconMap[tx.icon] || Wallet;
                        return (
                          <tr key={tx.id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                            <td className="px-8 py-5 flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500">
                                <Icon className="w-[18px] h-[18px]" />
                              </div>
                              <div>
                                <p className="text-sm font-black dark:text-white">{tx.description}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                  {tx.category}
                                </p>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-right font-black">
                              <span className={tx.amount > 0 ? 'text-emerald-600' : 'dark:text-white'}>
                                {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
 
          {/* Right sidebar column */}
          <div className="space-y-8">
            {/* 3D CSS Premium Credit Card — zero crash, zero external deps */}
            <div
              className="rounded-[32px] aspect-[1.586/1] relative group overflow-hidden cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #064e3b 100%)',
                boxShadow: '0 32px 64px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
                transform: 'perspective(800px) rotateY(0deg)',
                transition: 'transform 0.4s ease, box-shadow 0.4s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'perspective(800px) rotateY(-6deg) rotateX(3deg) scale(1.02)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 40px 80px -12px rgba(0,0,0,0.9), 0 0 0 1px rgba(16,185,129,0.2), 0 0 40px -8px rgba(16,185,129,0.15)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 32px 64px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)';
              }}
            >
              {/* Shimmer overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_50%,rgba(16,185,129,0.04)_100%)] pointer-events-none" />
              {/* Glow orb top-right */}
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500 pointer-events-none" />
              {/* Card content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-between">
                {/* Top row: brand + chip */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-lg shadow-emerald-500/30">G</div>
                    <div>
                      <span className="text-white font-black text-sm tracking-tight">G-Black</span>
                      <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Platinum Elite</p>
                    </div>
                  </div>
                  {/* Holographic chip */}
                  <div className="w-10 h-8 rounded-md bg-gradient-to-br from-yellow-300/20 via-yellow-400/30 to-amber-500/10 border border-yellow-500/20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_3px,rgba(255,255,255,0.05)_3px,rgba(255,255,255,0.05)_4px)]" />
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(255,255,255,0.03)_3px,rgba(255,255,255,0.03)_4px)]" />
                  </div>
                </div>
                {/* Card number */}
                <div>
                  <p className="font-mono text-base tracking-[0.2em] text-white/90">•••• •••• •••• {cardLastFour}</p>
                  <div className="flex gap-4 mt-3">
                    <div>
                      <p className="text-[7px] text-slate-600 font-bold uppercase tracking-widest">Validade</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">12/32</p>
                    </div>
                    <div>
                      <p className="text-[7px] text-slate-600 font-bold uppercase tracking-widest">Titular</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate max-w-[120px]">{user?.user_metadata?.full_name || 'G. Corrêa'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gemini AI Brain Command Center */}
            <AiChatHub />
 
            {/* Upcoming Payments */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-8 rounded-[40px] border border-white/50 dark:border-white/5">
              <h4 className="font-black text-lg mb-6 dark:text-white tracking-tight">Próximos Pagamentos</h4>
              <div className="space-y-4">
                {reminders.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center">
                    <p className="mb-1">Sem faturas pendentes.</p>
                    <span className="text-[10px] text-slate-500">Tudo em dia para este mês!</span>
                  </div>
                ) : (
                  reminders.map((rem) => (
                    <div key={rem.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-black dark:text-white">{rem.title}</p>
                        <p className={`text-[10px] font-bold uppercase ${
                          rem.urgency === 'high' ? 'text-red-500' : 'text-blue-500'
                        }`}>
                          Vence em: {new Date(rem.due_date).toLocaleDateString('pt-BR')} • {rem.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  ))
                )}
              </div>
            </div>
 
            {/* Active Goals */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-8 rounded-[40px] border border-white/50 dark:border-white/5">
              <h4 className="font-black text-lg mb-6 dark:text-white tracking-tight">Metas Ativas</h4>
              <div className="space-y-6">
                {goals.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center">
                    <p className="mb-1">Nenhuma meta de investimento activa.</p>
                    <span className="text-[10px] text-slate-500">Defina objetivos de economia nos Ajustes.</span>
                  </div>
                ) : (
                  goals.map((goal) => {
                    const percentage = Math.min(Math.round((goal.current_amount / goal.target_amount) * 100), 100);
                    return (
                      <div key={goal.id}>
                        <div className="flex justify-between mb-2">
                          <span className="text-xs font-bold dark:text-white">{goal.name}</span>
                          <span className="text-xs font-bold text-emerald-600">{percentage}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

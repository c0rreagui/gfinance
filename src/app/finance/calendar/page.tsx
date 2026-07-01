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
  EyeOff,
  Trash2,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  icon: string;
  reminder_id?: string | null;
  card_id?: string | null;
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
  card_id?: string | null;
}

interface CalendarEvent {
  id: string;
  type: 'transaction' | 'subscription' | 'reminder' | 'invoice_closing' | 'invoice_due';
  title: string;
  amount: number;
  category: string;
  icon?: string;
  paid?: boolean;
  meta?: any;
  card_id?: string | null;
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

// Helper to check if a date is a weekend (Saturday or Sunday)
const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
};

// Helper to get the first business day of a month
const getFirstBusinessDay = (year: number, month: number): number => {
  const date = new Date(year, month, 1);
  while (isWeekend(date)) {
    date.setDate(date.getDate() + 1);
  }
  return date.getDate();
};

// Helper to get the last business day of a month
const getLastBusinessDay = (year: number, month: number): number => {
  const date = new Date(year, month + 1, 0);
  while (isWeekend(date)) {
    date.setDate(date.getDate() - 1);
  }
  return date.getDate();
};

// Helper to calculate the start and end dates of the billing cycle for a card in a given month (0-indexed)
const getCardBillingCycle = (card: any, y: number, m: number) => {
  const c = card.closing_day;
  const d = card.due_day;
  let startYear = y;
  let startMonth = m;
  let endYear = y;
  let endMonth = m;

  if (d > c) {
    // Closes in current month m, ends on day c. Starts in previous month m-1, day c+1.
    startMonth = m - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear = y - 1;
    }
  } else {
    // Closes in previous month m-1, ends on day c. Starts in month m-2, day c+1.
    startMonth = m - 2;
    endMonth = m - 1;
    if (startMonth < 0) {
      startMonth = startMonth + 12;
      startYear = y - 1;
    }
    if (endMonth < 0) {
      endMonth = 11;
      endYear = y - 1;
    }
  }

  // Use UTC to align with database ISO datetime strings
  const startDate = new Date(Date.UTC(startYear, startMonth, c + 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(endYear, endMonth, c, 23, 59, 59, 999));
  return { startDate, endDate };
};

// SHA-256 hash helper using Web Crypto API for client-side deterministic deduplication
const buildSourceHash = async (userId: string, date: string, description: string, amount: number): Promise<string> => {
  const normalized = `${userId}|${date.substring(0, 10)}|${description.trim().toLowerCase()}|${amount.toFixed(2)}`;
  const msgUint8 = new TextEncoder().encode(normalized);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};

export default function FinancialCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [initialBalance, setInitialBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');

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
  const [formFrequency, setFormFrequency] = useState('mensal');
  
  // Clipboard state for iCal subscription URL
  const [copied, setCopied] = useState(false);

  // Ignored range states
  const [ignoredRange, setIgnoredRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(() => new Date().getMonth());

  // Dedução de faturas no saldo projetado
  const [deductInvoices, setDeductInvoices] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deduct_invoices_projection');
      return saved === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('deduct_invoices_projection', String(deductInvoices));
  }, [deductInvoices]);

  // Helper to check if credit card invoice is paid for a specific cycle due date (dueYear, dueMonth)
  const checkInvoicePaid = (card: any, dueYear: number, dueMonth: number): boolean => {
    const targetDueDate = new Date(Date.UTC(dueYear, dueMonth, card.due_day, 12, 0, 0));
    
    return transactions.some((tx) => {
      if (tx.card_id !== null) return false;
      if (tx.category !== 'Cartão') return false;
      
      const desc = tx.description.toLowerCase();
      if (!desc.includes('pagamento')) return false;
      
      // Remove accents and normalize strings for matching
      const cardNameClean = card.card_name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const descClean = desc.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const matchesCardName = descClean.includes(cardNameClean) || 
        (card.last_four && descClean.includes(card.last_four)) ||
        (card.card_name === 'Itaú Mult MC Plat' && descClean.includes('itau mult mc plat'));
      
      if (!matchesCardName) return false;
      
      const txDate = new Date(tx.date);
      const diffTime = Math.abs(txDate.getTime() - targetDueDate.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays <= 15;
    });
  };

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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // 1. Fetch profile details including hidden_before_date
      const { data: profile } = await supabase
        .from('profiles')
        .select('initial_balance, hidden_before_date')
        .eq('id', user.id)
        .single();
      
      const profileHiddenBeforeDate = profile?.hidden_before_date || null;

      let txsQuery = supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: true });
      let remsQuery = supabase.from('reminders').select('*').eq('user_id', user.id);

      if (profileHiddenBeforeDate) {
        txsQuery = txsQuery.gte('date', `${profileHiddenBeforeDate}T00:00:00.000Z`);
        remsQuery = remsQuery.gte('due_date', `${profileHiddenBeforeDate}T00:00:00.000Z`);
      }

      // Parallel fetch of all calendar datasets to eliminate waterfall latency
      const [
        { data: txs },
        { data: rems },
        { data: cards }
      ] = await Promise.all([
        txsQuery,
        remsQuery,
        supabase.from('credit_cards').select('*').eq('user_id', user.id)
      ]);
      
      setInitialBalance(Number(profile?.initial_balance) || 0);
      setTransactions((txs || []).map(t => ({
        ...t,
        amount: typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount || 0)
      })));
      setReminders((rems || []).map(r => ({
        ...r,
        amount: typeof r.amount === 'string' ? parseFloat(r.amount) : (r.amount || 0)
      })));
      setCreditCards(cards || []);
      
      if (cards && cards.length > 0) {
        setSelectedCardId(cards[0].id);
      }

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

  // 1. Calculate historical starting balance prior to the 1st of the current month (in UTC to match database timestamps)
  const startBalancePriorToMonth = useMemo(() => {
    let bal = initialBalance;
    const firstDayOfMonthUTC = new Date(Date.UTC(year, month, 1));
    transactions.forEach((tx) => {
      if (ignoredRange) {
        const txDateStr = new Date(tx.date);
        txDateStr.setUTCHours(12, 0, 0, 0);
        const start = new Date(ignoredRange.startDate + 'T00:00:00Z');
        const end = new Date(ignoredRange.endDate + 'T23:59:59Z');
        if (txDateStr >= start && txDateStr <= end) return;
      }
      const txDate = new Date(tx.date);
      if (txDate < firstDayOfMonthUTC) {
        if (!tx.card_id) {
          bal += tx.amount;
        }
      }
    });
    return bal;
  }, [transactions, initialBalance, year, month, ignoredRange]);

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

    // A. Add transactions that fall into this month (using UTC values to avoid timezone shift)
    transactions.forEach((tx) => {
      // Hide transactions generated by reminders in the calendar daily grid to avoid duplication
      if (tx.reminder_id) return;
      // Ocultar compras de cartão do calendário para evitar poluição visual (a fatura consolidada já é plotada)
      if (tx.card_id) return;

      if (ignoredRange) {
        const txDateStr = new Date(tx.date);
        txDateStr.setUTCHours(12, 0, 0, 0);
        const start = new Date(ignoredRange.startDate + 'T00:00:00Z');
        const end = new Date(ignoredRange.endDate + 'T23:59:59Z');
        if (txDateStr >= start && txDateStr <= end) return;
      }

      const txDate = new Date(tx.date);
      const txYear = txDate.getUTCFullYear();
      const txMonth = txDate.getUTCMonth();
      const txDay = txDate.getUTCDate();
      if (txYear === year && txMonth === month) {
        if (map[txDay]) {
          map[txDay].push({
            id: tx.id,
            type: 'transaction',
            title: tx.description,
            amount: tx.amount,
            category: tx.category,
            icon: tx.icon,
            card_id: tx.card_id
          });
        }
      }
    });

    // B. Add reminders / subscriptions replicated to their respective calendar days
    reminders.forEach((rem) => {
      // Ocultar lançamentos individuais de cartão do calendário (a fatura consolidada já é plotada)
      if (rem.card_id) return;

      const remDate = new Date(rem.due_date);
      
      // Trust the sign of the amount directly (+ for income, - for expense)
      const isIncomeReminder = rem.amount > 0;
      const resolvedAmount = rem.amount;

      if (rem.is_recurring) {
        // If recurring: replicates on the calculated day of the current active month
        let dayOfMonth = remDate.getUTCDate();
        const freq = rem.frequency?.toLowerCase();
        if (freq === 'primeiro_dia_util') {
          dayOfMonth = getFirstBusinessDay(year, month);
        } else if (freq === 'ultimo_dia_util') {
          dayOfMonth = getLastBusinessDay(year, month);
        }
        
        // Dynamically check if a transaction exists for this reminder in the active month
        const isPaidInActiveMonth = transactions.some((tx) => {
          if (tx.reminder_id !== rem.id) return false;
          const txDate = new Date(tx.date);
          return txDate.getUTCFullYear() === year && txDate.getUTCMonth() === month;
        });

        // Skip/ignore if this occurrence falls inside the ignored date range
        const isIgnored = ignoredRange && (() => {
          const d = new Date(Date.UTC(year, month, dayOfMonth, 12, 0, 0));
          const start = new Date(ignoredRange.startDate + 'T00:00:00Z');
          const end = new Date(ignoredRange.endDate + 'T23:59:59Z');
          return d >= start && d <= end;
        })();

        if (isIgnored) return;
        
        if (map[dayOfMonth]) {
          map[dayOfMonth].push({
            id: rem.id,
            type: rem.category_icon && rem.category_icon !== 'ArrowDownLeft' ? 'subscription' : 'reminder',
            title: rem.title,
            amount: resolvedAmount,
            category: rem.category_icon ? (isIncomeReminder ? 'Receita Recorrente' : 'Assinatura') : 'Lançamento Fixo',
            icon: rem.category_icon || 'Repeat',
            paid: isPaidInActiveMonth,
            card_id: rem.card_id
          });
        }
      } else {
        // One-off reminder: only draws if it falls exactly in this month/year (using UTC dates)
        const remYear = remDate.getUTCFullYear();
        const remMonth = remDate.getUTCMonth();
        const remDay = remDate.getUTCDate();
        if (remYear === year && remMonth === month) {
          // Skip/ignore if this reminder falls inside the ignored date range
          const isIgnored = ignoredRange && (() => {
            const d = new Date(remDate);
            d.setUTCHours(12, 0, 0, 0);
            const start = new Date(ignoredRange.startDate + 'T00:00:00Z');
            const end = new Date(ignoredRange.endDate + 'T23:59:59Z');
            return d >= start && d <= end;
          })();

          if (isIgnored) return;

          if (map[remDay]) {
            map[remDay].push({
              id: rem.id,
              type: 'reminder',
              title: rem.title,
              amount: resolvedAmount,
              category: isIncomeReminder ? 'Receita Prevista' : 'Boleto',
              icon: rem.category_icon || 'AlertCircle',
              paid: rem.paid,
              card_id: rem.card_id
            });
          }
        }
      }
    });

    // C. Add credit card closing and due date events
    creditCards.forEach((card) => {
      const closingDay = card.closing_day;
      const dueDay = card.due_day;

      // 1. Plot closing day event (Fechamento da Fatura & Melhor Dia de Compra)
      if (closingDay >= 1 && closingDay <= daysInMonth) {
        // Calculate the cycle for this closing day
        // If due_day > closing_day, it's the cycle for the current month
        // If due_day <= closing_day, it's the cycle for the next month
        let cycleYear = year;
        let cycleMonth = month;
        if (dueDay <= closingDay) {
          cycleMonth = month + 1;
          if (cycleMonth > 11) {
            cycleMonth = 0;
            cycleYear = year + 1;
          }
        }
        
        // Compute billing cycle
        const { startDate, endDate } = getCardBillingCycle(card, cycleYear, cycleMonth);

        // Sum transactions linked to this card in this cycle
        const cycleTxs = transactions.filter((tx) => {
          if (tx.card_id !== card.id) return false;
          const txDate = new Date(tx.date);
          return txDate >= startDate && txDate <= endDate;
        });
        
        // Sum unpaid reminders linked to this card in this cycle
        const cycleRems = reminders.filter((rem) => {
          if (rem.card_id !== card.id || rem.paid) return false;
          const remDate = new Date(rem.due_date);
          return remDate >= startDate && remDate <= endDate;
        });

        const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();
        const invoiceTotal = (isCurrentMonth && card.manual_invoice_amount !== null && card.manual_invoice_amount !== undefined)
          ? Number(card.manual_invoice_amount)
          : cycleTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) +
            cycleRems.reduce((sum, rem) => sum + Math.abs(rem.amount), 0);

        const invoicePaid = checkInvoicePaid(card, cycleYear, cycleMonth);

        if (map[closingDay]) {
          map[closingDay].push({
            id: `card-closing-${card.id}-${cycleYear}-${cycleMonth}`,
            type: 'invoice_closing',
            title: `Fechamento: ${card.card_name}`,
            amount: -invoiceTotal,
            category: 'Fatura de Cartão',
            icon: 'CreditCard',
            paid: invoicePaid,
            meta: {
              card,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              transactions: cycleTxs,
              cycleYear,
              cycleMonth,
              invoiceTotal
            }
          });
        }
      }

      // 2. Plot due day event (Vencimento da Fatura)
      if (dueDay >= 1 && dueDay <= daysInMonth) {
        // Compute billing cycle for the invoice due in this month
        const { startDate, endDate } = getCardBillingCycle(card, year, month);
        
        // Sum transactions linked to this card in this cycle
        const cycleTxs = transactions.filter((tx) => {
          if (tx.card_id !== card.id) return false;
          const txDate = new Date(tx.date);
          return txDate >= startDate && txDate <= endDate;
        });

        // Sum unpaid reminders linked to this card in this cycle
        const cycleRems = reminders.filter((rem) => {
          if (rem.card_id !== card.id || rem.paid) return false;
          const remDate = new Date(rem.due_date);
          return remDate >= startDate && remDate <= endDate;
        });

        const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();
        const invoiceTotal = (isCurrentMonth && card.manual_invoice_amount !== null && card.manual_invoice_amount !== undefined)
          ? Number(card.manual_invoice_amount)
          : cycleTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) +
            cycleRems.reduce((sum, rem) => sum + Math.abs(rem.amount), 0);

        const invoicePaid = checkInvoicePaid(card, year, month);

        if (map[dueDay]) {
          map[dueDay].push({
            id: `card-due-${card.id}-${year}-${month}`,
            type: 'invoice_due',
            title: `Vencimento: ${card.card_name}`,
            amount: -invoiceTotal,
            category: 'Fatura de Cartão',
            icon: 'AlertCircle',
            paid: invoicePaid,
            meta: {
              card,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              transactions: cycleTxs,
              cycleYear: year,
              cycleMonth: month,
              invoiceTotal
            }
          });
        }
      }
    });

    return map;
  }, [transactions, reminders, creditCards, year, month, daysInMonth, ignoredRange]);

  // 3. Compute running daily balance projection for each day of the active month
  const dailyBalances = useMemo(() => {
    const map: Record<number, number> = {};
    let currentRunningBalance = startBalancePriorToMonth;

    for (let d = 1; d <= daysInMonth; d++) {
      const events = dailyEvents[d] || [];
      
      // Sum up day events (ignoring paid state for projections to anticipate cash flows)
      events.forEach((ev) => {
        // Exclude individual credit card transactions/reminders, invoice closing from cash flow.
        // Include invoice due dates (invoice_due) if deductInvoices is active.
        const isCreditCardItem = ev.card_id || ev.type === 'invoice_closing';
        const isInvoiceDue = ev.type === 'invoice_due';
        
        if (isInvoiceDue) {
          if (deductInvoices) {
            currentRunningBalance += ev.amount;
          }
        } else if (!isCreditCardItem) {
          currentRunningBalance += ev.amount;
        }
      });

      map[d] = currentRunningBalance;
    }

    return map;
  }, [startBalancePriorToMonth, dailyEvents, daysInMonth, deductInvoices]);

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
        // Exclude individual credit card transactions/reminders, invoice closing from cash flow.
        // Include invoice due dates (invoice_due) if deductInvoices is active.
        const isCreditCardItem = ev.card_id || ev.type === 'invoice_closing';
        const isInvoiceDue = ev.type === 'invoice_due';
        
        if (isInvoiceDue) {
          if (deductInvoices) {
            projectedExpenses += Math.abs(ev.amount);
          }
        } else if (!isCreditCardItem) {
          if (ev.amount > 0) projectedIncomes += ev.amount;
          else projectedExpenses += Math.abs(ev.amount);
        }
      });
    }

    const netProjections = projectedIncomes - projectedExpenses;

    return {
      projectedIncomes,
      projectedExpenses,
      netProjections
    };
  }, [dailyEvents, daysInMonth, deductInvoices]);

  // 7. iCal Subscription Copy Link Action
  const handleSyncCalendar = () => {
    if (!userId) return;
    playHapticClick();
    const url = `${window.location.origin}/api/finance/calendar/export?userId=${userId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 9. 1-Click Quick-Pay toggle (handles recurring reminder instances and one-off toggles)
  const handleTogglePaid = async (id: string, isRecurringReminder?: boolean, calculatedDate?: Date) => {
    playHapticClick();
    
    const rem = reminders.find(r => r.id === id);
    if (!rem) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isRecurringReminder && calculatedDate) {
        const isIncomeReminder = rem.amount > 0 && (
          rem.category_icon === 'ArrowDownLeft' ||
          rem.category_icon === 'Wallet' ||
          rem.title.toLowerCase().includes('salário') ||
          rem.title.toLowerCase().includes('receita') ||
          rem.title.toLowerCase().includes('rendimento')
        );
        const resolvedAmount = rem.amount < 0 
          ? rem.amount 
          : isIncomeReminder 
          ? rem.amount 
          : -rem.amount;

        const category = rem.category_icon 
          ? (isIncomeReminder ? 'Salário' : (rem.category_icon === 'Tv' ? 'Assinaturas' : 'Outros')) 
          : 'Outros';

        const yearVal = calculatedDate.getFullYear();
        const monthVal = calculatedDate.getMonth();
        const startOfMonth = new Date(Date.UTC(yearVal, monthVal, 1, 0, 0, 0)).toISOString();
        const endOfMonth = new Date(Date.UTC(yearVal, monthVal + 1, 0, 23, 59, 59)).toISOString();

        const { data: existingTx } = await supabase
          .from('transactions')
          .select('id')
          .eq('reminder_id', rem.id)
          .gte('date', startOfMonth)
          .lte('date', endOfMonth)
          .limit(1);

        if (existingTx && existingTx.length > 0) {
          // Delete the transaction for this month (mark as unpaid)
          await supabase
            .from('transactions')
            .delete()
            .eq('id', existingTx[0].id);
        } else {
          // Create a transaction for this calculated business day
          const formattedDate = new Date(Date.UTC(yearVal, monthVal, calculatedDate.getDate(), 12, 0, 0));
          await supabase.from('transactions').insert({
            user_id: user.id,
            description: rem.title,
            category: category,
            amount: resolvedAmount,
            icon: rem.category_icon || 'Repeat',
            date: formattedDate.toISOString(),
            reminder_id: rem.id,
            card_id: rem.card_id || null, // Link to credit card if the reminder has it
            source_type: 'manual'
          });
        }
      } else {
        // One-off reminder logic
        const { error } = await supabase
          .from('reminders')
          .update({ paid: !rem.paid })
          .eq('id', id);

        if (error) throw error;
      }

      await fetchCalendarData();
    } catch (err) {
      console.error('Error toggling paid state:', err);
    }
  };

  const handleToggleInvoicePaid = async (ev: CalendarEvent) => {
    playHapticClick();
    if (!userId || !ev.meta?.card) return;

    const { card, cycleYear, cycleMonth, invoiceTotal } = ev.meta;
    const isPaid = ev.paid;

    try {
      if (isPaid) {
        // Find the transaction representing the payment and delete it
        const targetDueDate = new Date(Date.UTC(cycleYear, cycleMonth, card.due_day, 12, 0, 0));
        
        const txToDelete = transactions.find((tx) => {
          if (tx.card_id !== null) return false;
          if (tx.category !== 'Cartão') return false;
          const desc = tx.description.toLowerCase();
          if (!desc.includes('pagamento')) return false;
          
          const cardNameClean = card.card_name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const descClean = desc.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const matchesCardName = descClean.includes(cardNameClean) || 
            (card.last_four && descClean.includes(card.last_four)) ||
            (card.card_name === 'Itaú Mult MC Plat' && descClean.includes('itau mult mc plat'));
          if (!matchesCardName) return false;
          
          const txDate = new Date(tx.date);
          const diffTime = Math.abs(txDate.getTime() - targetDueDate.getTime());
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          return diffDays <= 15;
        });

        if (txToDelete) {
          const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', txToDelete.id);
          if (error) throw error;
        }
      } else {
        // Create a new transaction representing the invoice payment in the checking account
        // Set date to selectedDay of year and month (use UTC to avoid timezone shift)
        const paymentDate = new Date(Date.UTC(year, month, selectedDay!, 12, 0, 0));
        const paymentDesc = `Pagamento Fatura: ${card.card_name}`;
        
        // Generate deterministically matching source_hash client-side
        const sourceHash = await buildSourceHash(userId, paymentDate.toISOString(), paymentDesc, -invoiceTotal);

        const { error } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            description: paymentDesc,
            category: 'Cartão',
            amount: -invoiceTotal,
            icon: 'CreditCard',
            date: paymentDate.toISOString(),
            card_id: null, // checking account transaction
            source_type: 'manual',
            source_hash: sourceHash
          });

        if (error) throw error;
      }

      await fetchCalendarData();
    } catch (err) {
      console.error('Error toggling invoice paid state:', err);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    playHapticClick();
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchCalendarData();
    } catch (err) {
      console.error('Error deleting reminder:', err);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    playHapticClick();
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchCalendarData();
    } catch (err) {
      console.error('Error deleting transaction:', err);
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
          frequency: formFrequency,
          card_id: formCategory === 'Cartão' ? (selectedCardId || null) : null
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
          date: transactionDate.toISOString(),
          card_id: formCategory === 'Cartão' ? (selectedCardId || null) : null
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
      setFormFrequency('mensal');
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
          <div className="stagger-in flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 relative z-20" style={{ animationDelay: '50ms' }}>
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
              {/* Toggle Dedução de Faturas */}
              <button
                onClick={() => {
                  playHapticClick();
                  setDeductInvoices(!deductInvoices);
                }}
                className={`flex items-center gap-2 px-3 py-2 border rounded-xl transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-lg shadow-black/20 ${
                  deductInvoices
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30'
                    : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-900 hover:border-white/10 hover:text-white'
                }`}
                title="Deduzir vencimento de faturas no saldo projetado diário"
              >
                <CreditCard className="w-3.5 h-3.5 animate-pulse" />
                <span>{deductInvoices ? 'Dedução Ativa' : 'Deduzir Faturas'}</span>
              </button>

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

              {/* 2. Ignored Range Filter Popover */}
              <div className="relative">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-xl transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-lg shadow-black/20 ${
                    ignoredRange
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                      : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-900 hover:border-white/10 hover:text-white'
                  }`}
                  title="Ocultar lembretes pendentes por período"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{ignoredRange ? 'Período Oculto' : 'Ignorar Período'}</span>
                </button>

                {isFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsFilterOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 bg-slate-900/95 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-md z-50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                      <div className="space-y-1">
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-200">Período Ignorado</h3>
                        <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                          Selecione as datas de início e fim no mini-calendário abaixo.
                        </p>
                      </div>

                      {/* Mini Calendar Widget */}
                      <div className="space-y-3">
                        {/* Month Selector Header */}
                        <div className="flex justify-between items-center bg-slate-950/40 p-1.5 rounded-xl border border-white/5">
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
                            className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-200 font-mono">
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
                            className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
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
                                cellClass += "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20";
                              } else {
                                cellClass += "text-slate-300 hover:bg-white/5 hover:text-white";
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
                      <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-white/5 font-mono">
                        <div>
                          <span>Início: </span>
                          <span className="text-slate-200">{filterStart ? new Date(filterStart + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</span>
                        </div>
                        <div>
                          <span>Fim: </span>
                          <span className="text-slate-200">{filterEnd ? new Date(filterEnd + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</span>
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
                          className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[9px] font-black rounded-lg uppercase tracking-widest transition-all cursor-pointer text-center"
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
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-black rounded-lg uppercase tracking-widest transition-all cursor-pointer text-center"
                        >
                          Limpar
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

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
                
                const todayDate = new Date();
                const isToday = todayDate.getDate() === dayNum &&
                                todayDate.getMonth() === month &&
                                todayDate.getFullYear() === year;
                const hasEvents = events.length > 0;
                const dailyNet = events.reduce((sum, e) => sum + e.amount, 0);

                // Indicators check
                const hasIncomes = events.some(e => e.amount > 0);
                const hasExpenses = events.some(e => e.amount < 0 && e.type !== 'subscription');
                const hasSubscriptions = events.some(e => e.type === 'subscription');
                const hasReminders = events.some(e => e.type === 'reminder');

                // 5. Past vs Future Temporal styling
                const cellIsPast = isPastDay(dayNum);

                // Premium visual hierarchy & Wow Factors
                let cellClass = 'rounded-[20px] p-3 border transition-all duration-300 flex flex-col justify-between cursor-pointer group hover:scale-[1.02] stagger-in ';
                let cellBgStyle = undefined;

                if (isSelected) {
                  cellClass += 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10';
                } else if (isToday) {
                  cellClass += 'border-violet-500/50 shadow-[0_0_25px_rgba(139,92,246,0.2)] hover:border-violet-500/80';
                  cellBgStyle = 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.22) 0%, rgba(15, 23, 42, 0.7) 100%)';
                } else if (hasEvents) {
                  if (dailyNet > 0) {
                    cellClass += 'border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.08)]';
                    cellBgStyle = 'linear-gradient(to bottom, rgba(16, 185, 129, 0.05) 0%, rgba(15, 23, 42, 0.55) 100%)';
                  } else if (dailyNet < 0) {
                    cellClass += 'border-red-500/30 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.08)]';
                    cellBgStyle = 'linear-gradient(to bottom, rgba(239, 68, 68, 0.05) 0%, rgba(15, 23, 42, 0.55) 100%)';
                  } else {
                    cellClass += 'bg-slate-900/40 border-white/10 hover:border-white/20 hover:bg-slate-900/80';
                  }
                } else {
                  // Mute empty days for visual focus
                  cellClass += 'bg-slate-950/20 border-white/5 opacity-40 hover:opacity-100 hover:bg-slate-900/40 hover:border-white/10';
                }

                if (cellIsPast && !isToday && !isSelected) {
                  cellClass += ' saturate-[0.4] opacity-50';
                } else if (!cellIsPast) {
                  cellClass += ' bright-cell';
                }

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
                    className={cellClass}
                    style={{ 
                      animationDelay: `${200 + idx * 8}ms`,
                      background: cellBgStyle
                    }}
                  >
                    {/* Day number & indicators */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-lg transition-all duration-300 ${
                          isSelected 
                            ? 'bg-emerald-500 text-white' 
                            : isToday
                              ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                              : hasEvents
                                ? 'bg-slate-800/80 text-slate-200 group-hover:text-white group-hover:bg-slate-700'
                                : 'text-slate-500 group-hover:text-slate-300'
                        }`}>
                          {dayNum}
                        </span>
                        {isToday && (
                          <span className="text-[7px] font-black uppercase tracking-wider text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1 py-0.5 rounded-md animate-pulse font-sans">
                            Hoje
                          </span>
                        )}
                      </div>

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
                        const isInvoice = ev.type === 'invoice_closing' || ev.type === 'invoice_due';
                        
                        let colorClass = isInc
                          ? 'bg-emerald-500/10 text-emerald-400/90 border border-emerald-500/10'
                          : 'bg-red-500/10 text-red-400/90 border border-red-500/10';

                        if (isInvoice) {
                          colorClass = ev.paid
                            ? 'bg-emerald-500/10 text-emerald-400/90 border border-emerald-500/10'
                            : 'bg-slate-800 text-slate-400 border border-slate-700/50';
                        }

                        return (
                          <div
                            key={ev.id + '-' + i}
                            className={`text-[8px] font-black px-1.5 py-0.5 rounded-md truncate flex items-center justify-between ${colorClass}`}
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
                    const isInvoiceEvent = ev.type === 'invoice_closing' || ev.type === 'invoice_due';
                    
                    // 8. Brand Color Vertical Line Accent
                    const brandColor = isReminder ? getBrandColor(ev.title) : isInvoiceEvent ? (ev.paid ? '#10b981' : '#64748b') : null;
                    
                    // 9. Checkbox visualization logic
                    const showCheckbox = (isReminder && ev.paid !== undefined) || isInvoiceEvent;

                    return (
                      <div
                        key={ev.id}
                        draggable={isReminder && !ev.paid}
                        onDragStart={isReminder ? (e) => handleDragStart(e, ev.id) : undefined}
                        className={`relative overflow-hidden pl-5 p-4 bg-slate-950/30 border border-white/5 rounded-2xl flex flex-col gap-2 hover:border-white/10 transition-colors ${
                          isReminder && !ev.paid ? 'cursor-grab active:cursor-grabbing' : ''
                        }`}
                      >
                        {brandColor && (
                          <div 
                            className="absolute left-0 top-0 bottom-0 w-[3px]"
                            style={{ backgroundColor: brandColor }}
                          />
                        )}

                        <div className="w-full flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            {/* 9. 1-Click Quick-Pay Checkbox */}
                            {showCheckbox && (
                              <button
                                onClick={() => {
                                  if (isInvoiceEvent) {
                                    handleToggleInvoicePaid(ev);
                                  } else {
                                    const isRecurring = ev.type === 'subscription' || (reminders.find(r => r.id === ev.id)?.is_recurring);
                                    const calculatedDate = selectedDay ? new Date(year, month, selectedDay, 12, 0, 0) : new Date();
                                    handleTogglePaid(ev.id, isRecurring, calculatedDate);
                                  }
                                }}
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                  ev.paid 
                                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                                    : 'border-slate-600 hover:border-emerald-500 cursor-pointer'
                                }`}
                                title={ev.paid ? 'Confirmado - Clique para desfazer' : 'Marcar como Pago'}
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
                                : isInvoiceEvent
                                ? (ev.paid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400')
                                : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {isIncome ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : ev.type === 'subscription' ? (
                                <Repeat className="w-4 h-4" />
                              ) : isInvoiceEvent ? (
                                <CreditCard className="w-4 h-4" />
                              ) : (
                                <CreditCard className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className={`text-xs font-black text-slate-200 transition-all ${ev.paid ? 'line-through opacity-50' : ''}`}>{ev.title}</p>
                              <span className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 block transition-all ${ev.paid ? 'opacity-40' : 'text-slate-500'}`}>
                                {ev.category} • {ev.type.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`text-xs font-black transition-all ${ev.paid ? 'opacity-40' : ''}`}>
                                {renderCurrency(ev.amount, `drawer-item-${ev.id}`, isIncome ? 'text-emerald-400' : (isInvoiceEvent ? (ev.paid ? 'text-emerald-400' : 'text-slate-400') : 'text-slate-200'))}
                              </p>
                              {ev.paid !== undefined && (
                                <span className={`text-[7px] font-black uppercase tracking-widest block transition-all ${
                                  ev.paid ? 'text-emerald-500' : 'text-amber-500'
                                }`}>
                                  {ev.paid ? 'Pago' : 'Pendente'}
                                </span>
                              )}
                            </div>
                            
                            {!isInvoiceEvent && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (ev.type === 'transaction') {
                                    handleDeleteTransaction(ev.id);
                                  } else {
                                    handleDeleteReminder(ev.id);
                                  }
                                }}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                                title={ev.type === 'transaction' ? 'Excluir Transação' : 'Excluir Lembrete'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Invoice breakdown list inside the event card */}
                        {isInvoiceEvent && ev.meta?.transactions && ev.meta.transactions.length > 0 && (
                          <div className="w-full mt-2 pt-2.5 border-t border-white/5 pl-2 space-y-1">
                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Lançamentos do Ciclo:</p>
                            <div className="max-h-[120px] overflow-y-auto no-scrollbar space-y-1.5 pr-1">
                              {ev.meta.transactions.map((tx: any) => (
                                <div key={tx.id} className="flex justify-between items-center text-[10px] bg-slate-950/20 p-1.5 rounded-lg border border-white/5">
                                  <div className="flex flex-col">
                                    <span className="text-slate-300 font-bold max-w-[150px] truncate">{tx.description}</span>
                                    <span className="text-[7px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                      {new Date(tx.date).toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                  <span className="text-slate-200 font-mono font-bold">
                                    {(-Math.abs(tx.amount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {isInvoiceEvent && (!ev.meta?.transactions || ev.meta.transactions.length === 0) && (
                          <div className="w-full mt-1.5 text-left pl-2 text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                            Nenhuma compra vinculada neste ciclo.
                          </div>
                        )}
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

                  {isRecurring && (
                    <div className="space-y-2 p-3.5 bg-slate-950/60 border border-white/5 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-left">Frequência da Recorrência</label>
                      <select
                        value={formFrequency}
                        onChange={(e) => setFormFrequency(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-white/5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                      >
                        <option value="mensal">Mesmo Dia do Mês</option>
                        <option value="primeiro_dia_util">Primeiro Dia Útil</option>
                        <option value="ultimo_dia_util">Último Dia Útil</option>
                      </select>
                    </div>
                  )}

                  {/* Credit Card Selector */}
                  {formCategory === 'Cartão' && creditCards.length > 0 && (
                    <div className="space-y-2 p-3.5 bg-slate-950/60 border border-white/5 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-left">Associar ao Cartão</label>
                      <select
                        value={selectedCardId}
                        onChange={(e) => setSelectedCardId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-white/5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                      >
                        {creditCards.map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.card_name} (•••• {card.last_four})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

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

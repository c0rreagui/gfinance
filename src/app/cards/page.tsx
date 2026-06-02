'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  HelpCircle,
  AlertCircle,
  Plus,
  Trash2,
  X,
  Calendar,
  Check,
  Edit2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DBCreditCard {
  id: string;
  user_id: string;
  card_name: string;
  last_four: string;
  expiration_date: string;
  card_limit: number;
  spline_url: string | null;
  closing_day: number;
  due_day: number;
  color_theme: string;
  manual_invoice_amount: number | null;
  created_at?: string;
}

interface DBInstallment {
  id: string;
  user_id: string;
  card_id: string | null;
  description: string;
  total_amount: number;
  total_installments: number;
  paid_installments: number;
  installment_amount: number;
  first_due_date: string;
  created_at?: string;
}

interface CardTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
}

const themes = {
  emerald: {
    name: 'Esmeralda',
    bg: 'from-[#0b0f19] via-[#09151e] to-[#042d2c]',
    logoBg: 'bg-emerald-500',
    logoText: 'text-white',
    accentText: 'text-emerald-400',
    glow: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
    circles: {
      left: 'bg-emerald-500/20 border-emerald-400/20',
      right: 'bg-emerald-500 border-emerald-400'
    },
    bubble: 'bg-emerald-500 border-emerald-400/50'
  },
  indigo: {
    name: 'Índigo Real',
    bg: 'from-[#0c0d16] via-[#101328] to-[#141544]',
    logoBg: 'bg-indigo-500',
    logoText: 'text-white',
    accentText: 'text-indigo-400',
    glow: 'bg-indigo-500/10 group-hover:bg-indigo-500/20',
    circles: {
      left: 'bg-indigo-500/20 border-indigo-400/20',
      right: 'bg-indigo-500 border-indigo-400'
    },
    bubble: 'bg-indigo-600 border-indigo-400/50'
  },
  rose: {
    name: 'Rosa Sunset',
    bg: 'from-[#0c0c0c] via-[#210915] to-[#420822]',
    logoBg: 'bg-rose-500',
    logoText: 'text-white',
    accentText: 'text-rose-400',
    glow: 'bg-rose-500/10 group-hover:bg-rose-500/20',
    circles: {
      left: 'bg-rose-500/20 border-rose-400/20',
      right: 'bg-rose-500 border-rose-400'
    },
    bubble: 'bg-rose-500 border-rose-400/50'
  },
  amber: {
    name: 'Ouro Nobre',
    bg: 'from-[#0f0e0c] via-[#22140d] to-[#422209]',
    logoBg: 'bg-amber-500',
    logoText: 'text-slate-900',
    accentText: 'text-amber-400',
    glow: 'bg-amber-500/10 group-hover:bg-amber-500/20',
    circles: {
      left: 'bg-amber-500/20 border-amber-400/20',
      right: 'bg-amber-500 border-amber-400'
    },
    bubble: 'bg-amber-500 border-amber-400/50'
  },
  crimson: {
    name: 'Rubi Premium',
    bg: 'from-[#0e0c0c] via-[#230d0d] to-[#4c0606]',
    logoBg: 'bg-red-600',
    logoText: 'text-white',
    accentText: 'text-red-400',
    glow: 'bg-red-500/10 group-hover:bg-red-500/20',
    circles: {
      left: 'bg-red-500/20 border-red-400/20',
      right: 'bg-red-500 border-red-400'
    },
    bubble: 'bg-red-600 border-red-400/50'
  }
};

const getCardBillingCycle = (card: DBCreditCard) => {
  const closingDay = card.closing_day;
  const dueDay = card.due_day;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let cycleMonth = currentMonth;
  let cycleYear = currentYear;
  if (now.getDate() > closingDay) {
    cycleMonth = currentMonth + 1;
    if (cycleMonth > 11) {
      cycleMonth = 0;
      cycleYear = currentYear + 1;
    }
  }

  let startYear = cycleYear;
  let startMonth = cycleMonth;
  let endYear = cycleYear;
  let endMonth = cycleMonth;

  if (dueDay > closingDay) {
    startMonth = cycleMonth - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear = cycleYear - 1;
    }
  } else {
    startMonth = cycleMonth - 2;
    endMonth = cycleMonth - 1;
    if (startMonth < 0) {
      startMonth = startMonth + 12;
      startYear = cycleYear - 1;
    }
    if (endMonth < 0) {
      endMonth = 11;
      endYear = cycleYear - 1;
    }
  }

  const startDate = new Date(Date.UTC(startYear, startMonth, closingDay + 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(endYear, endMonth, closingDay, 23, 59, 59, 999));

  return { startDate, endDate };
};

export default function CardsPage() {
  const [cards, setCards] = useState<DBCreditCard[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
  const [usedLimit, setUsedLimit] = useState(0);
  const [currentInvoice, setCurrentInvoice] = useState(0);

  // Form states for active card inline updates
  const [editName, setEditName] = useState('');
  const [editLastFour, setEditLastFour] = useState('');
  const [editExpiration, setEditExpiration] = useState('');
  const [editClosing, setEditClosing] = useState('');
  const [editDue, setEditDue] = useState('');
  
  // Feedback states
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Create card states (Drawer modal)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLastFour, setNewLastFour] = useState('');
  const [newLimit, setNewLimit] = useState('25000');
  const [newExpiration, setNewExpiration] = useState('12/32');
  const [newClosing, setNewClosing] = useState('4');
  const [newDue, setNewDue] = useState('10');
  const [newTheme, setNewTheme] = useState<string>('emerald');
  const [newError, setNewError] = useState('');
  const [newSuccess, setNewSuccess] = useState('');

  // Right Column Tab state
  const [rightTab, setRightTab] = useState<'transactions' | 'installments'>('transactions');
  const [installments, setInstallments] = useState<DBInstallment[]>([]);
  const [ignoredRange, setIgnoredRange] = useState<{ startDate: string; endDate: string } | null>(null);

  useEffect(() => {
    const rangeStr = localStorage.getItem('gfinance_ignored_period');
    if (rangeStr) {
      try {
        setIgnoredRange(JSON.parse(rangeStr));
      } catch {}
    }

    const handleStorageChange = () => {
      const updated = localStorage.getItem('gfinance_ignored_period');
      if (updated) {
        try {
          setIgnoredRange(JSON.parse(updated));
        } catch {}
      } else {
        setIgnoredRange(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Create installment states (Drawer modal)
  const [isInstallmentOpen, setIsInstallmentOpen] = useState(false);
  const [instDescription, setInstDescription] = useState('');
  const [instTotalAmount, setInstTotalAmount] = useState('');
  const [instTotalInstallments, setInstTotalInstallments] = useState('10');
  const [instPaidInstallments, setInstPaidInstallments] = useState('0');
  const [instFirstDueDate, setInstFirstDueDate] = useState('');
  const [instError, setInstError] = useState('');
  const [instSuccess, setInstSuccess] = useState('');

  // Profile metadata
  const [ownerName, setOwnerName] = useState('Guilherme C. S. P.');
  const [memberSince, setMemberSince] = useState('2026');

  const activeCard = cards[activeIndex] || null;
  const activeTheme = activeCard ? (themes[activeCard.color_theme as keyof typeof themes] || themes.emerald) : themes.emerald;

  const fetchCardData = async (selectCardId?: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch profile details
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, card_limit')
        .eq('id', user.id)
        .single();

      if (profile?.full_name) {
        setOwnerName(profile.full_name);
      }

      // 2. Fetch credit cards
      let { data: dbCards, error: cardError } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (cardError) throw cardError;

      // Provision fallback if none
      if (!dbCards || dbCards.length === 0) {
        const initialLimit = profile?.card_limit ? Number(profile.card_limit) : 25000;
        const { data: newCard, error: insertError } = await supabase
          .from('credit_cards')
          .insert({
            user_id: user.id,
            card_name: 'G-Black',
            last_four: '9912',
            expiration_date: '12/32',
            card_limit: initialLimit,
            closing_day: 4,
            due_day: 10,
            color_theme: 'emerald',
            spline_url: 'https://prod.spline.design/1e9d1552-3443-485d-a066-e46604b8db02/scene.splinecode'
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (newCard) {
          dbCards = [newCard];
        }
      }

      const fetchedCards = (dbCards || []).map(c => ({
        ...c,
        card_limit: typeof c.card_limit === 'string' ? parseFloat(c.card_limit) : (c.card_limit || 0),
        manual_invoice_amount: c.manual_invoice_amount !== null && c.manual_invoice_amount !== undefined 
          ? (typeof c.manual_invoice_amount === 'string' ? parseFloat(c.manual_invoice_amount) : c.manual_invoice_amount)
          : null
      }));
      setCards(fetchedCards);

      // Select proper card index
      if (selectCardId) {
        const foundIdx = fetchedCards.findIndex(c => c.id === selectCardId);
        if (foundIdx !== -1) setActiveIndex(foundIdx);
      } else if (activeIndex >= fetchedCards.length) {
        setActiveIndex(0);
      }

    } catch (err) {
      console.error('Error fetching card database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCardData();
  }, []);

  useEffect(() => {
    if (!activeCard) return;

    // Subscribe to schema changes to keep card metrics synced in real-time
    const channel = supabase
      .channel('cards-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => { loadCardData(activeCard); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'installments' },
        () => { fetchCardData(activeCard.id); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reminders' },
        () => { loadCardData(activeCard); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCard?.id]);

  const loadCardData = async (card: DBCreditCard) => {
    if (!card) return;
    try {
      const { startDate, endDate } = getCardBillingCycle(card);

      // 1. Fetch last 10 transactions
      const { data: recentTxs } = await supabase
        .from('transactions')
        .select('*')
        .eq('card_id', card.id)
        .order('date', { ascending: false })
        .limit(ignoredRange ? 35 : 10);
      let parsedRecent = (recentTxs || []).map(t => ({
        ...t,
        amount: typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount || 0)
      }));

      if (ignoredRange) {
        const start = new Date(ignoredRange.startDate + 'T00:00:00Z');
        const end = new Date(ignoredRange.endDate + 'T23:59:59Z');
        parsedRecent = parsedRecent.filter(t => {
          const tDate = new Date(t.date);
          return !(tDate >= start && tDate <= end);
        });
      }
      setCardTransactions(parsedRecent.slice(0, 10));

      // 2. Fetch all installments
      const { data: insts } = await supabase
        .from('installments')
        .select('*')
        .eq('card_id', card.id)
        .order('created_at', { ascending: false });
      const parsedInsts = (insts || []).map(i => ({
        ...i,
        total_amount: typeof i.total_amount === 'string' ? parseFloat(i.total_amount) : (i.total_amount || 0),
        installment_amount: typeof i.installment_amount === 'string' ? parseFloat(i.installment_amount) : (i.installment_amount || 0),
        paid_installments: Number(i.paid_installments || 0),
        total_installments: Number(i.total_installments || 0)
      }));
      setInstallments(parsedInsts);

      // 3. Fetch cycle transactions
      const { data: cycleTxs } = await supabase
        .from('transactions')
        .select('*')
        .eq('card_id', card.id)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());
      let parsedCycleTxs = (cycleTxs || []).map(t => ({
        ...t,
        amount: typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount || 0)
      }));

      if (ignoredRange) {
        const start = new Date(ignoredRange.startDate + 'T00:00:00Z');
        const end = new Date(ignoredRange.endDate + 'T23:59:59Z');
        parsedCycleTxs = parsedCycleTxs.filter(t => {
          const tDate = new Date(t.date);
          return !(tDate >= start && tDate <= end);
        });
      }

      // 4. Fetch cycle unpaid reminders
      const { data: cycleRems } = await supabase
        .from('reminders')
        .select('*')
        .eq('card_id', card.id)
        .eq('paid', false)
        .gte('due_date', startDate.toISOString())
        .lte('due_date', endDate.toISOString());
      let parsedCycleRems = (cycleRems || []).map(r => ({
        ...r,
        amount: typeof r.amount === 'string' ? parseFloat(r.amount) : (r.amount || 0)
      }));

      if (ignoredRange) {
        const start = new Date(ignoredRange.startDate + 'T00:00:00Z');
        const end = new Date(ignoredRange.endDate + 'T23:59:59Z');
        parsedCycleRems = parsedCycleRems.filter(r => {
          const due = new Date(r.due_date);
          due.setUTCHours(12, 0, 0, 0);
          return !(due >= start && due <= end);
        });
      }

      // 5. Calculate Fatura Atual (Current Invoice)
      if (card.manual_invoice_amount !== null && card.manual_invoice_amount !== undefined) {
        setCurrentInvoice(Number(card.manual_invoice_amount));
      } else {
        const txsSum = parsedCycleTxs.reduce((acc, t) => acc + Math.abs(t.amount), 0);
        const remsSum = parsedCycleRems.reduce((acc, r) => acc + Math.abs(r.amount), 0);
        setCurrentInvoice(txsSum + remsSum);
      }

      // 6. Calculate usedLimit (Outstanding Debt Consuming Limit)
      const oneOffTxsSum = parsedCycleTxs
        .filter(t => !t.installment_id)
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);
      
      // Fetch all reminders for this card to compute ignored installments
      const { data: cardRems } = await supabase
        .from('reminders')
        .select('*')
        .eq('card_id', card.id);
      const parsedCardRems = (cardRems || []).map(r => ({
        ...r,
        amount: typeof r.amount === 'string' ? parseFloat(r.amount) : (r.amount || 0)
      }));

      const remainingInstsSum = parsedCardRems.reduce((acc, r) => {
        if (!r.installment_id || r.paid) return acc;
        if (ignoredRange) {
          const due = new Date(r.due_date);
          due.setUTCHours(12, 0, 0, 0);
          const start = new Date(ignoredRange.startDate + 'T00:00:00Z');
          const end = new Date(ignoredRange.endDate + 'T23:59:59Z');
          if (due >= start && due <= end) return acc;
        }
        return acc + Math.abs(r.amount);
      }, 0);

      setUsedLimit(oneOffTxsSum + remainingInstsSum);

    } catch (e) {
      console.error('Error loading card data details:', e);
    }
  };

  // Update inline form fields when activeCard changes
  useEffect(() => {
    if (activeCard) {
      setEditName(activeCard.card_name);
      setEditLastFour(activeCard.last_four);
      setEditExpiration(activeCard.expiration_date);
      setEditClosing(activeCard.closing_day.toString());
      setEditDue(activeCard.due_day.toString());

      if (activeCard.created_at) {
        setMemberSince(new Date(activeCard.created_at).getFullYear().toString());
      } else {
        setMemberSince('2026');
      }

      loadCardData(activeCard);
    }
  }, [activeCard, ignoredRange]);

  // Handle color theme change directly
  const handleColorThemeChange = async (themeKey: string) => {
    if (!activeCard) return;
    playHapticClick();
    
    // Update local UI state immediately
    const updatedCards = [...cards];
    updatedCards[activeIndex].color_theme = themeKey;
    setCards(updatedCards);

    try {
      await supabase
        .from('credit_cards')
        .update({ color_theme: themeKey })
        .eq('id', activeCard.id);
    } catch (e) {
      console.error('Error saving color theme:', e);
    }
  };

  // Handle manual invoice override directly
  const handleInvoiceChange = async (newInvoiceVal: number | null) => {
    if (!activeCard) return;

    const updatedCards = [...cards];
    updatedCards[activeIndex].manual_invoice_amount = newInvoiceVal;
    setCards(updatedCards);

    // Reload card data with updated manual value
    await loadCardData(updatedCards[activeIndex]);

    try {
      await supabase
        .from('credit_cards')
        .update({ manual_invoice_amount: newInvoiceVal })
        .eq('id', activeCard.id);
    } catch (e) {
      console.error('Erro ao salvar fatura manual:', e);
    }
  };

  // Handle inline settings save
  const handleSaveActiveCardDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard) return;

    setSaveStatus('saving');
    setFeedbackMsg('');

    const closingNum = parseInt(editClosing, 10);
    const dueNum = parseInt(editDue, 10);

    if (!editName || !editLastFour || !editExpiration || !editClosing || !editDue) {
      setSaveStatus('error');
      setFeedbackMsg('Preencha todos os campos obrigatórios.');
      return;
    }
    if (isNaN(closingNum) || closingNum < 1 || closingNum > 31) {
      setSaveStatus('error');
      setFeedbackMsg('Dia de fechamento deve ser entre 1 e 31.');
      return;
    }
    if (isNaN(dueNum) || dueNum < 1 || dueNum > 31) {
      setSaveStatus('error');
      setFeedbackMsg('Dia de vencimento deve ser entre 1 e 31.');
      return;
    }

    try {
      const { error } = await supabase
        .from('credit_cards')
        .update({
          card_name: editName,
          last_four: editLastFour,
          expiration_date: editExpiration,
          closing_day: closingNum,
          due_day: dueNum
        })
        .eq('id', activeCard.id);

      if (error) throw error;

      setSaveStatus('success');
      setFeedbackMsg('Cartão atualizado com sucesso!');
      
      // Reload cards list to keep state fresh
      fetchCardData(activeCard.id);
      
      setTimeout(() => {
        setSaveStatus('idle');
        setFeedbackMsg('');
      }, 2000);

    } catch (err: any) {
      setSaveStatus('error');
      setFeedbackMsg(err.message || 'Erro ao atualizar dados.');
    }
  };

  // Limit slider change handler
  const handleLimitChange = async (newLimit: number) => {
    if (!activeCard) return;
    
    const updatedCards = [...cards];
    updatedCards[activeIndex].card_limit = newLimit;
    setCards(updatedCards);

    try {
      await supabase
        .from('credit_cards')
        .update({ card_limit: newLimit })
        .eq('id', activeCard.id);
    } catch (e) {
      console.error('Erro ao salvar novo limite:', e);
    }
  };

  // Create new card handler
  const handleCreateNewCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewError('');
    setNewSuccess('');

    if (!newName || !newLastFour || !newExpiration || !newClosing || !newDue) {
      setNewError('Preencha todos os campos obrigatórios.');
      return;
    }

    const limitNum = parseFloat(newLimit);
    const closingNum = parseInt(newClosing, 10);
    const dueNum = parseInt(newDue, 10);

    if (isNaN(limitNum) || limitNum <= 0) {
      setNewError('O limite deve ser positivo.');
      return;
    }
    if (isNaN(closingNum) || closingNum < 1 || closingNum > 31) {
      setNewError('Fechamento inválido (1-31).');
      return;
    }
    if (isNaN(dueNum) || dueNum < 1 || dueNum > 31) {
      setNewError('Vencimento inválido (1-31).');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newCard, error } = await supabase
        .from('credit_cards')
        .insert({
          user_id: user.id,
          card_name: newName,
          last_four: newLastFour,
          expiration_date: newExpiration,
          card_limit: limitNum,
          closing_day: closingNum,
          due_day: dueNum,
          color_theme: newTheme,
          spline_url: 'https://prod.spline.design/1e9d1552-3443-485d-a066-e46604b8db02/scene.splinecode'
        })
        .select()
        .single();

      if (error) throw error;

      setNewSuccess('Cartão adicionado com sucesso!');
      setTimeout(() => {
        setIsCreateOpen(false);
        fetchCardData(newCard?.id);
      }, 1000);

    } catch (err: any) {
      setNewError(err.message || 'Erro ao criar cartão.');
    }
  };

  // Delete card handler
  const handleDeleteActiveCard = async () => {
    if (!activeCard) return;
    if (!window.confirm(`Excluir definitivamente o cartão "${activeCard.card_name}"?`)) return;

    try {
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', activeCard.id);

      if (error) throw error;

      const nextIdx = activeIndex > 0 ? activeIndex - 1 : 0;
      setActiveIndex(nextIdx);
      fetchCardData();
    } catch (err: any) {
      console.error('Error deleting card:', err);
      alert(err.message || 'Erro ao excluir cartão.');
    }
  };
  
  // Create installment purchase handler
  const handleCreateInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    setInstError('');
    setInstSuccess('');

    if (!activeCard) return;
    if (!instDescription || !instTotalAmount || !instTotalInstallments || !instPaidInstallments || !instFirstDueDate) {
      setInstError('Preencha todos os campos obrigatórios.');
      return;
    }

    const totalAmt = parseFloat(instTotalAmount);
    const totalInsts = parseInt(instTotalInstallments, 10);
    const paidInsts = parseInt(instPaidInstallments, 10);

    if (isNaN(totalAmt) || totalAmt <= 0) {
      setInstError('O valor total deve ser positivo.');
      return;
    }
    if (isNaN(totalInsts) || totalInsts <= 0) {
      setInstError('O número de parcelas deve ser maior que 0.');
      return;
    }
    if (isNaN(paidInsts) || paidInsts < 0 || paidInsts > totalInsts) {
      setInstError('Parcelas pagas inválidas (deve ser entre 0 e o total).');
      return;
    }

    const installmentAmt = Number((totalAmt / totalInsts).toFixed(2));
    const firstDate = new Date(instFirstDueDate);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Create installment record
      const { data: installment, error: instErr } = await supabase
        .from('installments')
        .insert({
          user_id: user.id,
          card_id: activeCard.id,
          description: instDescription,
          total_amount: totalAmt,
          total_installments: totalInsts,
          paid_installments: paidInsts,
          installment_amount: installmentAmt,
          first_due_date: firstDate.toISOString()
        })
        .select()
        .single();

      if (instErr) throw instErr;
      if (!installment) throw new Error('Falha ao obter registro de parcelamento.');

      // 2. Loop and generate reminders for each installment
      const remindersToInsert = [];
      for (let i = 1; i <= totalInsts; i++) {
        const dueDate = new Date(firstDate);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));

        // Create transaction directly if already paid, or create reminder
        const isPaid = i <= paidInsts;

        remindersToInsert.push({
          user_id: user.id,
          card_id: activeCard.id,
          installment_id: installment.id,
          title: `${instDescription} (${i}/${totalInsts})`,
          amount: -installmentAmt, // negative for expense
          due_date: dueDate.toISOString(),
          paid: isPaid,
          urgency: 'medium',
          is_recurring: false,
          category_icon: 'CreditCard',
          brand_color: 'amber'
        });
      }

      const { error: remErr } = await supabase
        .from('reminders')
        .insert(remindersToInsert);

      if (remErr) throw remErr;

      setInstSuccess('Compra parcelada registrada com sucesso!');
      
      // Clear form
      setInstDescription('');
      setInstTotalAmount('');
      setInstTotalInstallments('10');
      setInstPaidInstallments('0');
      setInstFirstDueDate('');

      // Reload
      setTimeout(async () => {
        setIsInstallmentOpen(false);
        setInstSuccess('');
        loadCardData(activeCard);
      }, 1000);

    } catch (err: any) {
      setInstError(err.message || 'Erro ao registrar compra parcelada.');
    }
  };

  // Delete installment handler
  const handleDeleteInstallment = async (installmentId: string, desc: string) => {
    if (!activeCard) return;
    if (!window.confirm(`Excluir definitivamente o parcelamento "${desc}"? Isso removerá todas as parcelas não pagas vinculadas.`)) return;

    try {
      const { error } = await supabase
        .from('installments')
        .delete()
        .eq('id', installmentId);

      if (error) throw error;

      loadCardData(activeCard);

    } catch (err: any) {
      alert(err.message || 'Erro ao deletar parcelamento.');
    }
  };

  // Synthetic snap click sound
  const playHapticClick = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc1 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1500, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc1.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.03);
    } catch {}
  };

  const cardLimit = activeCard ? activeCard.card_limit : 25000;
  const availableLimit = cardLimit - usedLimit;
  const limitPercentage = cardLimit > 0 ? (usedLimit / cardLimit) * 100 : 0;

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-950 text-slate-100 h-full no-scrollbar relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(255,255,255,0))] pointer-events-none z-0"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 animate-in">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight uppercase">Meus Cartões</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Gerenciamento de limites e fatura premium
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
          </div>
        ) : !activeCard ? (
          <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-12 text-center text-slate-500 space-y-4">
            <AlertCircle className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-sm font-bold uppercase tracking-wider">Nenhum cartão cadastrado</p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all cursor-pointer"
            >
              Cadastrar Meu Primeiro Cartão
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Visual Card, Limit, Theme & Config */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Premium Gradual Credit Card Layout */}
              <div 
                className={`w-full max-w-md mx-auto aspect-[1.586/1] bg-gradient-to-br ${activeTheme.bg} rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden group hover:scale-[1.01] transition-all duration-500`}
              >
                {/* Glass reflex overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0)_60%)] pointer-events-none"></div>
                {/* Glowing decorative sphere */}
                <div className={`absolute right-[-10%] top-[-20%] w-48 h-48 rounded-full blur-3xl transition-all duration-500 ${activeTheme.glow}`}></div>

                <div className="h-full flex flex-col justify-between relative z-10">
                  {/* Brand & Chip */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 ${activeTheme.logoBg} rounded-lg flex items-center justify-center ${activeTheme.logoText} font-black text-sm`}>
                          G
                        </div>
                        <span className="font-black text-sm tracking-tight text-white uppercase">{activeCard.card_name}</span>
                      </div>
                      <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">Solo Platinum Elite</p>
                    </div>
                    {/* Holographic Chip */}
                    <div className="w-12 h-9 bg-gradient-to-br from-yellow-300/20 via-yellow-400/40 to-yellow-500/10 rounded-lg border border-yellow-500/20 relative shadow-inner overflow-hidden">
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_45%,rgba(255,255,255,0.2)_50%,transparent_55%)] animate-pulse"></div>
                    </div>
                  </div>

                  {/* Card Number */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="font-mono text-lg tracking-[0.25em] text-white">
                        •••• •••• •••• {activeCard.last_four}
                      </p>
                    </div>
                    <div className="flex gap-6 mt-4">
                      <div>
                        <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Validade</p>
                        <p className="text-[10px] font-bold text-slate-300 mt-0.5">{activeCard.expiration_date}</p>
                      </div>
                      <div>
                        <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Membro Desde</p>
                        <p className="text-[10px] font-bold text-slate-300 mt-0.5">{memberSince}</p>
                      </div>
                    </div>
                  </div>

                  {/* Owner Name & Logo */}
                  <div className="flex justify-between items-end border-t border-white/5 pt-4">
                    <div>
                      <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Titular</p>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-100 mt-0.5">{ownerName}</p>
                    </div>
                    <div className="flex -space-x-2">
                      <div className={`w-6 h-6 rounded-full backdrop-blur-sm border ${activeTheme.circles.left}`}></div>
                      <div className={`w-6 h-6 rounded-full border ${activeTheme.circles.right}`}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Theme Color Picker */}
              <div className="glass bg-slate-900/40 rounded-[28px] border border-white/5 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Aparência do Cartão</h3>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Selecione uma variação degradê</p>
                </div>
                <div className="flex items-center gap-3">
                  {Object.entries(themes).map(([themeKey, t]) => (
                    <button
                      key={themeKey}
                      onClick={() => handleColorThemeChange(themeKey)}
                      className={`w-6 h-6 rounded-full ${t.bubble} border-2 hover:scale-110 transition-all cursor-pointer relative ${
                        activeCard.color_theme === themeKey ? 'ring-2 ring-white/40 scale-105' : ''
                      }`}
                      title={t.name}
                    >
                      {activeCard.color_theme === themeKey && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider for limits */}
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-black uppercase tracking-wider">Ajuste de Limite Flex</h2>
                  <span className={`px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 ${activeTheme.accentText} text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1.5 animate-pulse`}>
                    <ShieldCheck className="w-3.5 h-3.5" /> Sob Medida
                  </span>
                </div>

                {/* Limit stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fatura Acumulada</p>
                    <p className="text-lg font-black mt-1 text-slate-200">
                      {currentInvoice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Limite Disponível</p>
                    <p className={`text-lg font-black mt-1 ${activeTheme.accentText}`}>
                      {availableLimit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/5">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, limitPercentage)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                    <span>{limitPercentage.toFixed(1)}% do limite de R$ {cardLimit.toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                {/* slider control */}
                <div className="space-y-3 border-t border-white/5 pt-6">
                  <input 
                    type="range" 
                    min="1000" 
                    max="100000" 
                    step="1000"
                    value={cardLimit}
                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                    <span>Min: R$ 1.000</span>
                    <span className={`${activeTheme.accentText} font-black`}>Slider: R$ {cardLimit.toLocaleString('pt-BR')}</span>
                    <span>Máx: R$ 100.000</span>
                  </div>
                </div>

                {/* manual inputs */}
                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Digite o Limite (R$)</label>
                    <input
                      type="number"
                      value={cardLimit}
                      onChange={(e) => handleLimitChange(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20 font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Digite a Fatura (Ajuste Manual)</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Automático (Compras)"
                        value={activeCard.manual_invoice_amount ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          handleInvoiceChange(val);
                        }}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20 font-mono text-center pr-8"
                      />
                      {activeCard.manual_invoice_amount !== null && (
                        <button
                          type="button"
                          onClick={() => handleInvoiceChange(null)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer px-1.5 py-0.5"
                          title="Limpar ajuste manual"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inline Direct Card Settings Panel (Full autonomy) */}
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-black uppercase tracking-wider">Ajustes & Informações</h3>
                  </div>
                  <button
                    onClick={handleDeleteActiveCard}
                    className="p-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 text-[10px] font-black rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Excluir Cartão
                  </button>
                </div>

                {feedbackMsg && (
                  <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 border ${
                    saveStatus === 'success' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {saveStatus === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{feedbackMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSaveActiveCardDetails} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome do Cartão</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Final do Cartão (4 dígitos)</label>
                      <input
                        type="text"
                        maxLength={4}
                        required
                        value={editLastFour}
                        onChange={(e) => setEditLastFour(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-center"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Validade (MM/AA)</label>
                      <input
                        type="text"
                        maxLength={5}
                        required
                        value={editExpiration}
                        onChange={(e) => setEditExpiration(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Fechamento (Dia)</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        required
                        value={editClosing}
                        onChange={(e) => setEditClosing(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Vencimento (Dia)</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        required
                        value={editDue}
                        onChange={(e) => setEditDue(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-center"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={saveStatus === 'saving'}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer text-center"
                    >
                      {saveStatus === 'saving' ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </form>
              </div>

            </div>

            {/* Right Column: Physical Wallet Stack & Purchases */}
            <div className="lg:col-span-5 space-y-8">
              
              {/* Stacked Wallet Visual Section */}
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 flex flex-col space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider">Minha Carteira</h2>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Selecione ou adicione cartões</p>
                  </div>
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>

                {/* Stacked overlapping visual cards list */}
                <div className="relative pt-6 pb-2 select-none">
                  {cards.map((c, idx) => {
                    const theme = themes[c.color_theme as keyof typeof themes] || themes.emerald;
                    const isActive = idx === activeIndex;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          playHapticClick();
                          setActiveIndex(idx);
                        }}
                        className={`w-full aspect-[1.586/1] bg-gradient-to-br ${theme.bg} rounded-2xl p-5 border shadow-xl relative overflow-hidden transition-all duration-500 cursor-pointer hover:-translate-y-2 ${
                          idx > 0 ? '-mt-24' : ''
                        } ${
                          isActive 
                            ? 'border-emerald-500 shadow-emerald-500/5 ring-1 ring-emerald-500/20 z-30 scale-[1.02] translate-x-2' 
                            : 'border-white/5 hover:border-white/20 opacity-90 z-10 hover:z-20'
                        }`}
                        style={{
                          transform: isActive ? 'translateX(8px) scale(1.02)' : 'none'
                        }}
                      >
                        <div className="h-full flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-black text-white uppercase tracking-wider">{c.card_name}</span>
                            <div className={`w-3.5 h-3.5 rounded-full ${theme.logoBg}`}></div>
                          </div>
                          <p className="font-mono text-xs text-white tracking-widest mt-4">
                            •••• •••• •••• {c.last_four}
                          </p>
                          <div className="flex justify-between items-end border-t border-white/5 pt-2 mt-2">
                            <span className="text-[7px] text-slate-400 font-mono">VAL: {c.expiration_date}</span>
                            <div className="flex -space-x-1">
                              <div className={`w-4 h-4 rounded-full ${theme.circles.left}`}></div>
                              <div className={`w-4 h-4 rounded-full ${theme.circles.right}`}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tabbed Purchases & Installments Panel */}
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 flex flex-col overflow-hidden min-h-[400px]">
                {/* Tabs Header */}
                <div className="flex justify-between items-center mb-6 shrink-0 border-b border-white/5 pb-4">
                  <div className="flex gap-4">
                    <button
                      onClick={() => setRightTab('transactions')}
                      className={`text-xs font-black uppercase tracking-widest transition-colors cursor-pointer pb-2 -mb-4.5 border-b-2 ${
                        rightTab === 'transactions' ? 'text-emerald-400 border-emerald-500' : 'text-slate-500 border-transparent hover:text-slate-300'
                      }`}
                    >
                      Lançamentos Recentes
                    </button>
                    <button
                      onClick={() => setRightTab('installments')}
                      className={`text-xs font-black uppercase tracking-widest transition-colors cursor-pointer pb-2 -mb-4.5 border-b-2 ${
                        rightTab === 'installments' ? 'text-emerald-400 border-emerald-500' : 'text-slate-500 border-transparent hover:text-slate-300'
                      }`}
                    >
                      Compras Parceladas
                    </button>
                  </div>
                  {rightTab === 'installments' && (
                    <button
                      onClick={() => setIsInstallmentOpen(true)}
                      className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                    >
                      + Novo Parcelamento
                    </button>
                  )}
                </div>

                {/* Tab Contents */}
                {rightTab === 'transactions' ? (
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 max-h-[320px] pr-1">
                    {cardTransactions.length === 0 ? (
                      <div className="text-center py-16 text-slate-500 space-y-4 flex flex-col items-center justify-center">
                        <AlertCircle className="w-10 h-10 text-slate-700 stroke-[1.5]" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma compra</p>
                        <p className="text-[9px] text-slate-500 max-w-[200px] leading-relaxed">
                          Despesas na categoria "Cartão" associadas a este cartão aparecerão aqui.
                        </p>
                      </div>
                    ) : (
                      cardTransactions.map((tx) => (
                        <div 
                          key={tx.id} 
                          className="flex justify-between items-center p-3.5 bg-slate-950/40 border border-white/5 rounded-2xl hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 text-xs">
                              💳
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-200">{tx.description}</p>
                              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                {new Date(tx.date).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs font-black text-slate-200 text-right">
                            {(-Math.abs(tx.amount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 max-h-[320px] pr-1">
                    {installments.length === 0 ? (
                      <div className="text-center py-16 text-slate-500 space-y-4 flex flex-col items-center justify-center">
                        <AlertCircle className="w-10 h-10 text-slate-700 stroke-[1.5]" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum parcelamento</p>
                        <p className="text-[9px] text-slate-500 max-w-[200px] leading-relaxed">
                          Registre suas compras parceladas para acompanhar o progresso de pagamentos aqui.
                        </p>
                      </div>
                    ) : (
                      installments.map((inst) => {
                        const amountPaid = inst.paid_installments * inst.installment_amount;
                        const amountRemaining = Math.max(0, inst.total_amount - amountPaid);
                        const percentagePaid = inst.total_installments > 0 
                          ? Math.round((inst.paid_installments / inst.total_installments) * 100) 
                          : 0;

                        return (
                          <div 
                            key={inst.id} 
                            className="p-5 bg-slate-950/40 border border-white/5 rounded-2xl space-y-3 relative group hover:border-white/10 transition-colors"
                          >
                            {/* Header */}
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-black text-slate-200">{inst.description}</p>
                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                  {inst.paid_installments} de {inst.total_installments} parcelas pagas ({percentagePaid}%)
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeleteInstallment(inst.id, inst.description)}
                                className="px-2 py-1 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 text-[8px] font-bold rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                title="Excluir parcelamento"
                              >
                                Excluir
                              </button>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-white/5">
                              <div 
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, percentagePaid)}%` }}
                              ></div>
                            </div>

                            {/* Amount details */}
                            <div className="grid grid-cols-3 gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider pt-2 border-t border-white/5">
                              <div>
                                <span>Pago:</span>
                                <p className="text-slate-300 font-black font-mono mt-0.5">
                                  {amountPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                              </div>
                              <div>
                                <span>Restante:</span>
                                <p className={`${activeTheme.accentText} font-black font-mono mt-0.5`}>
                                  {amountRemaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                              </div>
                              <div className="text-right">
                                <span>Total:</span>
                                <p className="text-slate-200 font-black font-mono mt-0.5">
                                  {inst.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Footer Total */}
                <div className="border-t border-white/5 pt-6 mt-6 shrink-0 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>{rightTab === 'transactions' ? 'Total Faturado' : 'Total em Parcelamentos'}</span>
                  <span className="text-slate-100 font-black text-sm">
                    {rightTab === 'transactions' 
                      ? currentInvoice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : installments.reduce((sum, inst) => sum + inst.total_amount, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    }
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Drawer for creating a card */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border-l border-white/10 h-full p-8 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider">Novo Cartão</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Adicione um new cartão de crédito à sua carteira</p>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {newError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{newError}</span>
                </div>
              )}

              {newSuccess && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{newSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateNewCard} className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome do Cartão</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: G-Platinum, Itaú"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Final do Cartão (4 dígitos)</label>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      placeholder="Ex: 1234"
                      value={newLastFour}
                      onChange={(e) => setNewLastFour(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Validade</label>
                    <input
                      type="text"
                      maxLength={5}
                      required
                      placeholder="Ex: 05/31"
                      value={newExpiration}
                      onChange={(e) => setNewExpiration(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white font-mono text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Limite (R$)</label>
                    <input
                      type="number"
                      required
                      placeholder="Ex: 15000"
                      value={newLimit}
                      onChange={(e) => setNewLimit(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Fechamento</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      placeholder="Ex: 4"
                      value={newClosing}
                      onChange={(e) => setNewClosing(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Vencimento</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      placeholder="Ex: 10"
                      value={newDue}
                      onChange={(e) => setNewDue(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Estilo / Variação Degradê</label>
                  <select
                    value={newTheme}
                    onChange={(e) => setNewTheme(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                  >
                    <option value="emerald">Esmeralda (Padrão)</option>
                    <option value="indigo">Índigo Real</option>
                    <option value="rose">Rosa Sunset</option>
                    <option value="amber">Ouro Nobre</option>
                    <option value="crimson">Rubi Premium</option>
                  </select>
                </div>

                <div className="pt-6 border-t border-white/5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="flex-1 py-3.5 border border-white/5 hover:bg-white/5 text-slate-300 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-500/25 transition-all cursor-pointer text-center"
                  >
                    Cadastrar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Drawer for creating an installment purchase */}
      {isInstallmentOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border-l border-white/10 h-full p-8 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider">Novo Parcelamento</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Registre uma compra parcelada vinculada a este cartão</p>
                </div>
                <button
                  onClick={() => setIsInstallmentOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {instError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{instError}</span>
                </div>
              )}

              {instSuccess && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{instSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateInstallment} className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Descrição / Produto</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Notebook, Smartphone"
                    value={instDescription}
                    onChange={(e) => setInstDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Valor Total da Compra (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 1200.00"
                      value={instTotalAmount}
                      onChange={(e) => setInstTotalAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Data de Aprovação (Compra)</label>
                    <input
                      type="date"
                      required
                      value={instFirstDueDate}
                      onChange={(e) => setInstFirstDueDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total de Parcelas</label>
                    <input
                      type="number"
                      min={1}
                      required
                      placeholder="Ex: 10"
                      value={instTotalInstallments}
                      onChange={(e) => setInstTotalInstallments(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Parcelas Já Pagas</label>
                    <input
                      type="number"
                      min={0}
                      required
                      placeholder="Ex: 5"
                      value={instPaidInstallments}
                      onChange={(e) => setInstPaidInstallments(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white text-center font-mono"
                    />
                  </div>
                </div>

                {instTotalAmount && instTotalInstallments && (
                  <div className="p-4 bg-slate-950/60 border border-white/5 rounded-xl text-[10px] text-slate-400 font-bold uppercase tracking-widest space-y-1">
                    <p>Valor por Parcela:</p>
                    <p className="text-sm font-black text-white font-mono">
                      {((parseFloat(instTotalAmount) || 0) / (parseInt(instTotalInstallments, 10) || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                )}

                <div className="pt-6 border-t border-white/5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsInstallmentOpen(false)}
                    className="flex-1 py-3.5 border border-white/5 hover:bg-white/5 text-slate-300 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-500/25 transition-all cursor-pointer text-center"
                  >
                    Registrar
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

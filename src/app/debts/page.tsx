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
  Plus,
  Trash2,
  X,
  Check,
  RotateCcw,
  CreditCard,
  Calendar,
  DollarSign,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Debt {
  id: string;
  title: string;
  due_date: string;
  amount: number;
  urgency: 'high' | 'medium' | 'low';
  paid: boolean;
  card_id?: string | null;
  installment_id?: string | null;
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

interface DBCreditCard {
  id: string;
  card_name: string;
  last_four: string;
  color_theme: string;
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

const cardBadgeColors: { [key: string]: string } = {
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  crimson: 'bg-red-500/10 border-red-500/20 text-red-400',
};

function getTimeProgress(createdAt: string | undefined, dueDate: string): number {
  const now = Date.now();
  const start = createdAt ? new Date(createdAt).getTime() : now - 30 * 86400_000;
  const end = new Date(dueDate).getTime();
  if (end <= start) return 100;
  const elapsed = now - start;
  const total = end - start;
  return Math.min(Math.max(Math.round((elapsed / total) * 100), 0), 100);
}

export default function DebtsPage() {
  const [activeTab, setActiveTab] = useState<'bills' | 'installments'>('bills');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [reminders, setReminders] = useState<Debt[]>([]);
  const [installments, setInstallments] = useState<DBInstallment[]>([]);
  const [creditCards, setCreditCards] = useState<DBCreditCard[]>([]);

  // Drawer modal toggles
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [isInstOpen, setIsInstOpen] = useState(false);

  // Form States for Novo Lembrete / Boleto
  const [billTitle, setBillTitle] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState('');
  const [billUrgency, setBillUrgency] = useState<'high' | 'medium' | 'low'>('medium');
  const [billCardId, setBillCardId] = useState('');
  const [billError, setBillError] = useState('');
  const [billSuccess, setBillSuccess] = useState('');

  // Form States for Novo Parcelamento
  const [instDesc, setInstDesc] = useState('');
  const [instTotalAmount, setInstTotalAmount] = useState('');
  const [instTotalInsts, setInstTotalInsts] = useState('10');
  const [instPaidInsts, setInstPaidInsts] = useState('0');
  const [instFirstDate, setInstFirstDate] = useState('');
  const [instCardId, setInstCardId] = useState('');
  const [instError, setInstError] = useState('');
  const [instSuccess, setInstSuccess] = useState('');

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Credit Cards
      const { data: cardsData } = await supabase
        .from('credit_cards')
        .select('id, card_name, last_four, color_theme')
        .eq('user_id', user.id);
      setCreditCards(cardsData || []);

      // 2. Fetch Installments
      const { data: instData } = await supabase
        .from('installments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      const parsedInsts = (instData || []).map(i => ({
        ...i,
        total_amount: typeof i.total_amount === 'string' ? parseFloat(i.total_amount) : (i.total_amount || 0),
        installment_amount: typeof i.installment_amount === 'string' ? parseFloat(i.installment_amount) : (i.installment_amount || 0),
        paid_installments: Number(i.paid_installments || 0),
        total_installments: Number(i.total_installments || 0)
      }));
      setInstallments(parsedInsts);

      // 3. Fetch Reminders (Expenses only: amount < 0)
      const { data: remData } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .lt('amount', 0)
        .order('due_date', { ascending: true });
      const parsedRems = (remData || []).map(r => ({
        ...r,
        amount: typeof r.amount === 'string' ? parseFloat(r.amount) : (r.amount || 0)
      }));
      setReminders(parsedRems);

    } catch (e) {
      console.error('Error fetching data for debts page:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('open') === 'true') {
        if (activeTab === 'bills') {
          setIsBillOpen(true);
        } else {
          setIsInstOpen(true);
        }
      }
    }
  }, [activeTab]);

  // Filtered Debts/Bills for Tab 1: Unpaid and NOT linked to an installment
  const activeBills = useMemo(() => {
    return reminders.filter(r => !r.paid && !r.installment_id);
  }, [reminders]);

  // Derived Stats
  const totalDebtAmount = useMemo(() => {
    // 1. Unpaid simple bills
    const unpaidBillsSum = activeBills.reduce((sum, b) => sum + Math.abs(b.amount), 0);
    // 2. Remaining balance of all installments
    const remainingInstallmentsSum = installments.reduce((sum, inst) => {
      const paidAmt = inst.paid_installments * inst.installment_amount;
      return sum + Math.max(0, inst.total_amount - paidAmt);
    }, 0);

    return unpaidBillsSum + remainingInstallmentsSum;
  }, [activeBills, installments]);

  const installmentsThisMonth = useMemo(() => {
    const now = new Date();
    // Sum simple bills due this month + installment reminders due this month (unpaid only)
    return reminders.filter(r => {
      if (r.paid) return false;
      const due = new Date(r.due_date);
      return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear();
    }).length;
  }, [reminders]);

  const projectedClearDate = useMemo(() => {
    const unpaid = reminders.filter(r => !r.paid);
    if (unpaid.length === 0) return '—';
    const latest = unpaid.reduce((max, r) =>
      new Date(r.due_date) > new Date(max.due_date) ? r : max
    );
    return new Date(latest.due_date).toLocaleDateString('pt-BR', {
      month: 'short',
      year: 'numeric',
    });
  }, [reminders]);

  // Handle reminder paid state toggle
  const handleTogglePaid = async (id: string, currentPaid: boolean) => {
    playHapticClick();
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ paid: !currentPaid })
        .eq('id', id);

      if (error) throw error;
      await fetchAllData();
    } catch (e) {
      console.error('Error toggling paid state:', e);
      alert('Erro ao atualizar status de pagamento.');
    }
  };

  // Handle reminder deletion
  const handleDeleteReminder = async (id: string, title: string) => {
    playHapticClick();
    if (!window.confirm(`Excluir definitivamente o compromisso "${title}"?`)) return;

    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchAllData();
    } catch (e) {
      console.error('Error deleting reminder:', e);
      alert('Erro ao excluir compromisso.');
    }
  };

  // Handle paying the NEXT installment of a purchase
  const handlePayNextInstallment = async (installmentId: string) => {
    playHapticClick();
    // Find all reminders linked to this installment, sort by due_date ascending
    const instReminders = reminders
      .filter(r => r.installment_id === installmentId)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    // Find the first unpaid one
    const nextUnpaid = instReminders.find(r => !r.paid);

    if (!nextUnpaid) {
      alert('Todas as parcelas deste parcelamento já estão pagas!');
      return;
    }

    try {
      const { error } = await supabase
        .from('reminders')
        .update({ paid: true })
        .eq('id', nextUnpaid.id);

      if (error) throw error;
      await fetchAllData();
    } catch (e) {
      console.error('Error paying next installment:', e);
      alert('Erro ao registrar pagamento da parcela.');
    }
  };

  // Handle undoing/estornar the LAST paid installment of a purchase
  const handleUndoLastInstallment = async (installmentId: string) => {
    playHapticClick();
    // Find all reminders linked to this installment, sort by due_date descending
    const instReminders = reminders
      .filter(r => r.installment_id === installmentId)
      .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

    // Find the first paid one (i.e. the latest paid)
    const lastPaid = instReminders.find(r => r.paid);

    if (!lastPaid) {
      alert('Nenhuma parcela paga encontrada para este parcelamento!');
      return;
    }

    try {
      const { error } = await supabase
        .from('reminders')
        .update({ paid: false })
        .eq('id', lastPaid.id);

      if (error) throw error;
      await fetchAllData();
    } catch (e) {
      console.error('Error undoing last installment:', e);
      alert('Erro ao estornar parcela.');
    }
  };

  // Handle deleting an entire installment purchase
  const handleDeleteInstallment = async (installmentId: string, desc: string) => {
    playHapticClick();
    if (!window.confirm(`Excluir definitivamente a compra parcelada "${desc}"? Isso apagará todas as parcelas associadas.`)) return;

    try {
      const { error } = await supabase
        .from('installments')
        .delete()
        .eq('id', installmentId);

      if (error) throw error;
      await fetchAllData();
    } catch (e) {
      console.error('Error deleting installment:', e);
      alert('Erro ao excluir parcelamento.');
    }
  };

  // Create Novo Lembrete / Boleto
  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setBillError('');
    setBillSuccess('');

    if (!billTitle || !billAmount || !billDueDate) {
      setBillError('Preencha os campos obrigatórios.');
      return;
    }

    const amt = parseFloat(billAmount);
    if (isNaN(amt) || amt <= 0) {
      setBillError('O valor deve ser positivo.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('reminders')
        .insert({
          user_id: user.id,
          title: billTitle,
          amount: -amt, // negative for expense
          due_date: new Date(billDueDate).toISOString(),
          urgency: billUrgency,
          paid: false,
          is_recurring: false,
          category_icon: 'FileText',
          brand_color: 'amber',
          card_id: billCardId || null
        });

      if (error) throw error;

      setBillSuccess('Lembrete de boleto/dívida criado com sucesso!');
      setBillTitle('');
      setBillAmount('');
      setBillDueDate('');
      setBillUrgency('medium');
      setBillCardId('');

      setTimeout(() => {
        setIsBillOpen(false);
        setBillSuccess('');
        fetchAllData();
      }, 1000);
    } catch (err: any) {
      setBillError(err.message || 'Erro ao criar lembrete.');
    }
  };

  // Create Novo Parcelamento
  const handleCreateInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    setInstError('');
    setInstSuccess('');

    if (!instDesc || !instTotalAmount || !instTotalInsts || !instPaidInsts || !instFirstDate) {
      setInstError('Preencha os campos obrigatórios.');
      return;
    }

    const totalAmt = parseFloat(instTotalAmount);
    const totalInsts = parseInt(instTotalInsts, 10);
    const paidInsts = parseInt(instPaidInsts, 10);

    if (isNaN(totalAmt) || totalAmt <= 0) {
      setInstError('O valor total deve ser positivo.');
      return;
    }
    if (isNaN(totalInsts) || totalInsts <= 0) {
      setInstError('O total de parcelas deve ser maior que 0.');
      return;
    }
    if (isNaN(paidInsts) || paidInsts < 0 || paidInsts > totalInsts) {
      setInstError('Parcelas pagas devem estar entre 0 e o total.');
      return;
    }

    const installmentAmt = Number((totalAmt / totalInsts).toFixed(2));
    const firstDueDate = new Date(instFirstDate);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Create installment row
      const { data: newInst, error: instErr } = await supabase
        .from('installments')
        .insert({
          user_id: user.id,
          card_id: instCardId || null,
          description: instDesc,
          total_amount: totalAmt,
          total_installments: totalInsts,
          paid_installments: paidInsts,
          installment_amount: installmentAmt,
          first_due_date: firstDueDate.toISOString()
        })
        .select()
        .single();

      if (instErr) throw instErr;
      if (!newInst) throw new Error('Falha ao gerar registro de parcelamento.');

      // 2. Bulk insert reminders for installments
      const remindersToInsert = [];
      for (let i = 1; i <= totalInsts; i++) {
        const dueDate = new Date(firstDueDate);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));

        remindersToInsert.push({
          user_id: user.id,
          card_id: instCardId || null,
          installment_id: newInst.id,
          title: `${instDesc} (${i}/${totalInsts})`,
          amount: -installmentAmt,
          due_date: dueDate.toISOString(),
          paid: i <= paidInsts,
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

      setInstSuccess('Compra parcelada criada com sucesso!');
      setInstDesc('');
      setInstTotalAmount('');
      setInstTotalInsts('10');
      setInstPaidInsts('0');
      setInstFirstDate('');
      setInstCardId('');

      setTimeout(() => {
        setIsInstOpen(false);
        setInstSuccess('');
        fetchAllData();
      }, 1000);
    } catch (err: any) {
      setInstError(err.message || 'Erro ao criar parcelamento.');
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
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  };

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
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight uppercase">Controle de Dívidas</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Gestão de passivos e compromissos parcelados
              </p>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in duration-300">
          {/* Total em Dívidas */}
          <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 space-y-3 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,185,129,0.02)_0%,rgba(255,255,255,0)_60%)] pointer-events-none"></div>
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pendente</p>
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <TrendingDown className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-200 tracking-tight">
              {totalDebtAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-[10px] text-slate-500 font-bold">
              {activeBills.length + installments.filter(i => i.paid_installments < i.total_installments).length} dívidas ativas
            </p>
          </div>

          {/* Parcelas do Mês */}
          <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parcelas do Mês</p>
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CalendarClock className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-200 tracking-tight">
              {installmentsThisMonth}
            </p>
            <p className="text-[10px] text-slate-500 font-bold">parcelas pendentes em {new Date().toLocaleString('pt-BR', { month: 'long' })}</p>
          </div>

          {/* Previsão de Quitação */}
          <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previsão de Quitação</p>
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-200 tracking-tight capitalize">
              {projectedClearDate}
            </p>
            <p className="text-[10px] text-slate-500 font-bold">data final estimada de passivos</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4 shrink-0">
          <div className="flex gap-6">
            <button
              onClick={() => { playHapticClick(); setActiveTab('bills'); }}
              className={`text-xs font-black uppercase tracking-widest transition-all cursor-pointer pb-2 -mb-4.5 border-b-2 ${
                activeTab === 'bills' ? 'text-emerald-400 border-emerald-500' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              Contas & Boletos
            </button>
            <button
              onClick={() => { playHapticClick(); setActiveTab('installments'); }}
              className={`text-xs font-black uppercase tracking-widest transition-all cursor-pointer pb-2 -mb-4.5 border-b-2 ${
                activeTab === 'installments' ? 'text-emerald-400 border-emerald-500' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              Compras Parceladas
            </button>
          </div>
          <button
            onClick={() => {
              playHapticClick();
              if (activeTab === 'bills') setIsBillOpen(true);
              else setIsInstOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10 cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {activeTab === 'bills' ? 'Novo Boleto / Lembrete' : 'Novo Parcelamento'}
          </button>
        </div>

        {/* Main Content Area */}
        {activeTab === 'bills' ? (
          /* Tab 1: Contas & Boletos */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Active Bills List */}
            <div className="lg:col-span-8 space-y-4">
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-sm font-black uppercase tracking-wider">Boletos em Aberto</h2>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {activeBills.length} pendente{activeBills.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {activeBills.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 space-y-4 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-emerald-400 stroke-[1.5]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Nenhum boleto em aberto</p>
                      <p className="text-[9px] text-slate-500 max-w-[240px] leading-relaxed">Você está em dia com todas as suas dívidas e contas avulsas!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 overflow-y-auto no-scrollbar max-h-[500px]">
                    {activeBills.map((bill) => {
                      const cfg = urgencyConfig[bill.urgency] || urgencyConfig.low;
                      const progress = getTimeProgress(bill.created_at, bill.due_date);
                      const dueDate = new Date(bill.due_date);
                      const isPastDue = dueDate < new Date();
                      const linkedCard = creditCards.find(c => c.id === bill.card_id);

                      return (
                        <div
                          key={bill.id}
                          className="p-5 bg-slate-950/40 border border-white/5 rounded-2xl hover:border-white/10 transition-colors space-y-4 group"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
                                {bill.urgency === 'high' ? (
                                  <AlertTriangle className={`w-4 h-4 ${cfg.text}`} />
                                ) : bill.urgency === 'medium' ? (
                                  <Clock className={`w-4 h-4 ${cfg.text}`} />
                                ) : (
                                  <CheckCircle2 className={`w-4 h-4 ${cfg.text}`} />
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-200">{bill.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                                    Vence: {dueDate.toLocaleDateString('pt-BR')}
                                    {isPastDue && (
                                      <span className="text-red-400 ml-1.5">• Atrasado</span>
                                    )}
                                  </p>
                                  {linkedCard && (
                                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider border ${cardBadgeColors[linkedCard.color_theme] || cardBadgeColors.emerald}`}>
                                      💳 {linkedCard.card_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-3">
                              <p className="text-sm font-black text-slate-200">
                                {Math.abs(bill.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleTogglePaid(bill.id, bill.paid)}
                                  className="w-7 h-7 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                                  title="Marcar como Pago"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteReminder(bill.id, bill.title)}
                                  className="w-7 h-7 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-lg flex items-center justify-center cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                                  title="Excluir Lembrete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-white/5">
                              <div
                                className={`${cfg.bar} h-full rounded-full transition-all duration-500`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-[8px] text-slate-600 font-bold uppercase tracking-wider">
                              <span>Tempo restante</span>
                              <span>{progress}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Payment Timeline (next 5) */}
            <div className="lg:col-span-4">
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8">
                <h2 className="text-sm font-black uppercase tracking-wider mb-6">Linha do Tempo</h2>
                
                {activeBills.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 space-y-2">
                    <CalendarClock className="w-8 h-8 text-slate-700 mx-auto stroke-[1.5]" />
                    <p className="text-[9px] font-bold uppercase tracking-widest">Nenhum vencimento próximo</p>
                  </div>
                ) : (
                  <div className="relative pl-4 space-y-5 border-l border-white/5">
                    {activeBills.slice(0, 5).map((bill) => {
                      const cfg = urgencyConfig[bill.urgency] || urgencyConfig.low;
                      const dueDate = new Date(bill.due_date);

                      return (
                        <div key={bill.id} className="relative group">
                          {/* Indicator Dot */}
                          <div className="absolute -left-[21px] top-1 flex items-center justify-center">
                            <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} border border-slate-950`}></div>
                          </div>

                          <div className="p-3.5 bg-slate-950/40 border border-white/5 rounded-xl">
                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                              {dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </p>
                            <p className="text-xs font-bold text-slate-300 mt-0.5 truncate">{bill.title}</p>
                            <p className="text-xs font-black text-slate-200 mt-1">
                              {Math.abs(bill.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Tab 2: Compras Parceladas */
          <div className="space-y-6">
            <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-black uppercase tracking-wider">Histórico de Compras Parceladas</h2>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  {installments.length} registro{installments.length !== 1 ? 's' : ''}
                </span>
              </div>

              {installments.length === 0 ? (
                <div className="text-center py-20 text-slate-500 space-y-4 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-emerald-400 stroke-[1.5]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Nenhum parcelamento ativo</p>
                    <p className="text-[9px] text-slate-500 max-w-[280px] leading-relaxed">
                      Registre compras de valores grandes (ex: móveis, eletrônicos) parceladas para gerenciar o que já foi pago e o que resta.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {installments.map((inst) => {
                    const linkedCard = creditCards.find(c => c.id === inst.card_id);
                    const amountPaid = inst.paid_installments * inst.installment_amount;
                    const amountRemaining = Math.max(0, inst.total_amount - amountPaid);
                    const percentPaid = inst.total_installments > 0
                      ? Math.round((inst.paid_installments / inst.total_installments) * 100)
                      : 0;
                    
                    const isFullyPaid = inst.paid_installments >= inst.total_installments;

                    return (
                      <div
                        key={inst.id}
                        className="p-6 bg-slate-950/40 border border-white/5 rounded-3xl space-y-4 relative group hover:border-white/10 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xs font-black text-slate-200">{inst.description}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                                {inst.paid_installments} de {inst.total_installments} parcelas pagas ({percentPaid}%)
                              </span>
                              {linkedCard && (
                                <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider border ${cardBadgeColors[linkedCard.color_theme] || cardBadgeColors.emerald}`}>
                                  💳 {linkedCard.card_name}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            {!isFullyPaid ? (
                              <button
                                onClick={() => handlePayNextInstallment(inst.id)}
                                className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 text-[8px] font-black rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
                                title="Pagar próxima parcela"
                              >
                                Pagar +1
                              </button>
                            ) : (
                              <span className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[8px] font-black rounded-lg uppercase tracking-wider">
                                Quitada
                              </span>
                            )}
                            
                            {inst.paid_installments > 0 && (
                              <button
                                onClick={() => handleUndoLastInstallment(inst.id)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[8px] font-black rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
                                title="Estornar última parcela"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteInstallment(inst.id, inst.description)}
                              className="w-7 h-7 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-lg flex items-center justify-center cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                              title="Excluir parcelamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-white/5">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${isFullyPaid ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(100, percentPaid)}%` }}
                          ></div>
                        </div>

                        {/* Financial Info Grid */}
                        <div className="grid grid-cols-3 gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider pt-3 border-t border-white/5 font-mono">
                          <div>
                            <span>Pago</span>
                            <p className="text-slate-300 font-black mt-0.5">
                              {amountPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                          <div>
                            <span>Restante</span>
                            <p className="text-amber-400 font-black mt-0.5">
                              {amountRemaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                          <div className="text-right">
                            <span>Total</span>
                            <p className="text-slate-200 font-black mt-0.5">
                              {inst.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drawer: Novo Lembrete / Boleto */}
      {isBillOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border-l border-white/10 h-full p-8 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider">Novo Lembrete / Boleto</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Agende um pagamento avulso e configure sua urgência</p>
                </div>
                <button
                  onClick={() => setIsBillOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {billError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{billError}</span>
                </div>
              )}

              {billSuccess && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{billSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateBill} className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Descrição da Conta / Boleto</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Conta de Luz, Condomínio"
                    value={billTitle}
                    onChange={(e) => setBillTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 350.00"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Vencimento</label>
                    <input
                      type="date"
                      required
                      value={billDueDate}
                      onChange={(e) => setBillDueDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Urgência</label>
                    <select
                      value={billUrgency}
                      onChange={(e) => setBillUrgency(e.target.value as any)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                    >
                      <option value="low">Tranquilo (Verde)</option>
                      <option value="medium">Moderado (Laranja)</option>
                      <option value="high">Urgente (Vermelho)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Vincular a Cartão</label>
                    <select
                      value={billCardId}
                      onChange={(e) => setBillCardId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                    >
                      <option value="">Nenhum (Debito/Boleto)</option>
                      {creditCards.map(c => (
                        <option key={c.id} value={c.id}>{c.card_name} (•••• {c.last_four})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsBillOpen(false)}
                    className="flex-1 py-3.5 border border-white/5 hover:bg-white/5 text-slate-300 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-500/25 transition-all cursor-pointer text-center"
                  >
                    Criar Lembrete
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Novo Parcelamento */}
      {isInstOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border-l border-white/10 h-full p-8 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider">Novo Parcelamento</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Registre compras parceladas em cartões de crédito</p>
                </div>
                <button
                  onClick={() => setIsInstOpen(false)}
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
                    placeholder="Ex: Notebook Dell, Sofá Sala"
                    value={instDesc}
                    onChange={(e) => setInstDesc(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Valor Total (R$)</label>
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
                      value={instFirstDate}
                      onChange={(e) => setInstFirstDate(e.target.value)}
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
                      value={instTotalInsts}
                      onChange={(e) => setInstTotalInsts(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Parcelas Já Pagas</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={instPaidInsts}
                      onChange={(e) => setInstPaidInsts(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white text-center font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Cartão de Crédito</label>
                  <select
                    value={instCardId}
                    required
                    onChange={(e) => setInstCardId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                  >
                    <option value="">Selecione um cartão...</option>
                    {creditCards.map(c => (
                      <option key={c.id} value={c.id}>{c.card_name} (•••• {c.last_four})</option>
                    ))}
                  </select>
                </div>

                {instTotalAmount && instTotalInsts && (
                  <div className="p-4 bg-slate-950/60 border border-white/5 rounded-xl text-[10px] text-slate-400 font-bold uppercase tracking-widest space-y-1">
                    <p>Valor por Parcela:</p>
                    <p className="text-sm font-black text-white font-mono">
                      {((parseFloat(instTotalAmount) || 0) / (parseInt(instTotalInsts, 10) || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                )}

                <div className="pt-6 border-t border-white/5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsInstOpen(false)}
                    className="flex-1 py-3.5 border border-white/5 hover:bg-white/5 text-slate-300 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-500/25 transition-all cursor-pointer text-center"
                  >
                    Criar Parcelamento
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

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Tv, 
  ShoppingCart, 
  ArrowDownLeft, 
  Zap, 
  Activity, 
  Car, 
  Smartphone,
  Plus,
  X,
  TrendingDown,
  TrendingUp,
  Wallet,
  AlertCircle,
  Trash2,
  Calendar,
  Repeat,
  Link2,
  Link2Off,
  Pencil
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Lucide icon mapping
const iconMap: { [key: string]: React.ComponentType<any> } = {
  Tv,
  ShoppingCart,
  ArrowDownLeft,
  Zap,
  Activity,
  Car,
  Smartphone,
  Wallet
};

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  icon: string;
  reminder_id?: string | null;
  reminders?: {
    id: string;
    title: string;
    amount: number;
    paid: boolean;
    is_recurring: boolean;
  } | null;
}

export default function Transactions() {
  const [search, setSearch] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Lazer');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [icon, setIcon] = useState('Tv');
  const [modalError, setModalError] = useState('');
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  
  // Installment purchase options
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState('12');
  const [paidInstallments, setPaidInstallments] = useState('0');
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const today = new Date();
    return today.toISOString().substring(0, 10);
  });

  // Linking State
  const [reminders, setReminders] = useState<any[]>([]);
  const [linkingTransaction, setLinkingTransaction] = useState<Transaction | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  // Filtering State
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLink, setFilterLink] = useState<'all' | 'linked' | 'unlinked'>('all');

  // Sorting State
  const [sortField, setSortField] = useState<'date' | 'description' | 'category' | 'reminder' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Editing State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('Lazer');
  const [editIcon, setEditIcon] = useState('Tv');
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<'expense' | 'income'>('expense');
  const [editCardId, setEditCardId] = useState('');
  const [editModalError, setEditModalError] = useState('');

  const handleSort = (field: 'date' | 'description' | 'category' | 'reminder' | 'amount') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'amount' ? 'desc' : 'asc');
    }
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction || !editDescription || !editAmount) return;
    setEditModalError('');

    try {
      const numericAmount = parseFloat(editAmount) * (editType === 'expense' ? -1 : 1);
      if (isNaN(numericAmount)) {
        setEditModalError('Por favor, insira um valor numérico válido.');
        return;
      }

      const { error } = await supabase
        .from('transactions')
        .update({
          description: editDescription,
          category: editCategory,
          icon: editIcon,
          amount: numericAmount,
          card_id: editCategory === 'Cartão' ? (editCardId || null) : null
        })
        .eq('id', editingTransaction.id);

      if (error) throw error;

      setIsEditModalOpen(false);
      setEditingTransaction(null);
      fetchTransactions();
    } catch (err: any) {
      setEditModalError(err.message || 'Erro ao atualizar transação.');
    }
  };

  const fetchRemindersForLinking = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('reminders')
        .select('*, transactions(id, description)')
        .eq('user_id', user.id);
      if (!error && data) {
        setReminders(data);
      }
    } catch (err) {
      console.error('Error fetching reminders for linking:', err);
    }
  };

  const handleLinkTransaction = async (reminderId: string) => {
    if (!linkingTransaction) return;
    try {
      setModalError('');
      // 1. Link transaction to reminder
      const { error: txErr } = await supabase
        .from('transactions')
        .update({ reminder_id: reminderId })
        .eq('id', linkingTransaction.id);
      if (txErr) throw txErr;

      // 2. Mark reminder as paid
      const { error: remErr } = await supabase
        .from('reminders')
        .update({ paid: true })
        .eq('id', reminderId);
      if (remErr) throw remErr;

      // Close modal and refresh
      setIsLinkModalOpen(false);
      setLinkingTransaction(null);
      fetchTransactions();
    } catch (err: any) {
      setModalError(err.message || 'Erro ao vincular transação.');
    }
  };

  const handleUnlinkTransaction = async (tx: Transaction) => {
    if (!tx.reminder_id) return;
    const confirmUnlink = window.confirm(`Desvincular a transação "${tx.description}" do lembrete?`);
    if (!confirmUnlink) return;
    
    try {
      // 1. Set reminder_id = null on transaction
      const { error: txErr } = await supabase
        .from('transactions')
        .update({ reminder_id: null })
        .eq('id', tx.id);
      if (txErr) throw txErr;

      // 2. Set paid = false on reminder
      const { error: remErr } = await supabase
        .from('reminders')
        .update({ paid: false })
        .eq('id', tx.reminder_id);
      if (remErr) throw remErr;

      fetchTransactions();
    } catch (err: any) {
      console.error('Error unlinking transaction:', err);
      alert('Erro ao desvincular transação: ' + err.message);
    }
  };

  const rankReminders = (remindersList: any[], tx: Transaction) => {
    const txAmount = Math.abs(tx.amount);
    return remindersList.map(r => {
      let score = 0;
      const remAmount = Math.abs(r.amount);
      
      // Amount similarity
      const diffPercent = Math.abs(txAmount - remAmount) / (txAmount || 1);
      if (diffPercent < 0.05) score += 100;
      else if (diffPercent < 0.2) score += 50;

      // Title similarity
      const txWords = tx.description.toLowerCase().split(/[\s*._-]+/);
      const remWords = r.title.toLowerCase().split(/[\s*._-]+/);
      let commonWords = 0;
      txWords.forEach(w => {
        if (w && w.length > 2 && remWords.some(rw => rw.includes(w) || w.includes(rw))) {
          commonWords++;
        }
      });
      score += commonWords * 40;

      if (r.paid) {
        score -= 10;
      }

      return { ...r, score };
    }).sort((a, b) => b.score - a.score);
  };

  const fetchCreditCards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user.id);
      if (!error && data) {
        setCreditCards(data);
        if (data.length > 0) setSelectedCardId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching cards:', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile to check for hidden_before_date
      const { data: profile } = await supabase
        .from('profiles')
        .select('hidden_before_date')
        .eq('id', user.id)
        .single();
      const profileHiddenBeforeDate = profile?.hidden_before_date || null;

      let query = supabase
        .from('transactions')
        .select('*, reminders:reminder_id (id, title, amount, paid, is_recurring)')
        .eq('user_id', user.id)
        .lte('date', new Date().toISOString());

      if (profileHiddenBeforeDate) {
        query = query.gte('date', `${profileHiddenBeforeDate}T00:00:00.000Z`);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      setTransactions((data || []).map(t => ({
        ...t,
        amount: typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount || 0)
      })));
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchCreditCards();

    // Check for ?open=true query param
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('open') === 'true') {
        setIsModalOpen(true);
      }
    }

    // Subscribe to real-time changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    setModalError('');

    try {
      // Find a mock user ID for testing if not signed in, or let RLS handle it
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) {
        setModalError('Você precisa estar autenticado para realizar esta ação.');
        return;
      }

      if (type === 'expense' && category === 'Cartão' && isInstallment) {
        // Create installment purchase logic
        const totalAmt = parseFloat(amount);
        const totalInsts = parseInt(totalInstallments, 10);
        const paidInsts = parseInt(paidInstallments, 10);

        if (isNaN(totalAmt) || totalAmt <= 0) {
          setModalError('O valor total deve ser positivo.');
          return;
        }
        if (isNaN(totalInsts) || totalInsts <= 0) {
          setModalError('O número de parcelas deve ser maior que 0.');
          return;
        }
        if (isNaN(paidInsts) || paidInsts < 0 || paidInsts > totalInsts) {
          setModalError('Parcelas pagas inválidas (deve estar entre 0 e o total).');
          return;
        }

        const installmentAmt = Number((totalAmt / totalInsts).toFixed(2));
        const firstDate = new Date(firstDueDate);

        // 1. Create installment record
        const { data: installment, error: instErr } = await supabase
          .from('installments')
          .insert({
            user_id: userId,
            card_id: selectedCardId || null,
            description,
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
            user_id: userId,
            card_id: selectedCardId || null,
            installment_id: installment.id,
            title: `${description} (${i}/${totalInsts})`,
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

        // Reset Form & Close Modal
        setDescription('');
        setAmount('');
        setCategory('Lazer');
        setIcon('Tv');
        setIsInstallment(false);
        setModalError('');
        setIsModalOpen(false);
        fetchTransactions();
        return;
      }

      const numericAmount = parseFloat(amount) * (type === 'expense' ? -1 : 1);

      const { error } = await supabase.from('transactions').insert({
        user_id: userId,
        description,
        category,
        amount: numericAmount,
        icon,
        date: new Date().toISOString(),
        card_id: category === 'Cartão' ? (selectedCardId || null) : null
      });

      if (error) throw error;

      // Reset Form & Close Modal
      setDescription('');
      setAmount('');
      setCategory('Lazer');
      setIcon('Tv');
      setModalError('');
      setIsModalOpen(false);
      fetchTransactions();
    } catch (err: any) {
      setModalError(err.message || 'Erro ao cadastrar transação.');
    }
  };

  const handleDeleteTransaction = async (id: string, desc: string) => {
    if (!window.confirm(`Excluir definitivamente a transação "${desc}"?`)) return;
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTransactions();
    } catch (e) {
      console.error('Error deleting transaction:', e);
      alert('Erro ao excluir transação.');
    }
  };

  const sortedAndFiltered = [...transactions]
    .filter((t) => {
      const matchesSearch = 
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase());
      
      const matchesType = 
        filterType === 'all' || 
        (filterType === 'expense' && t.amount < 0) || 
        (filterType === 'income' && t.amount > 0);
      
      const matchesCategory = 
        filterCategory === 'all' || 
        t.category === filterCategory;
      
      const matchesLink = 
        filterLink === 'all' || 
        (filterLink === 'linked' && t.reminder_id !== null && t.reminder_id !== undefined) || 
        (filterLink === 'unlinked' && (t.reminder_id === null || t.reminder_id === undefined));
      
      return matchesSearch && matchesType && matchesCategory && matchesLink;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'description') {
        comparison = a.description.localeCompare(b.description);
      } else if (sortField === 'category') {
        comparison = a.category.localeCompare(b.category);
      } else if (sortField === 'reminder') {
        const aRem = a.reminders?.title || '';
        const bRem = b.reminders?.title || '';
        comparison = aRem.localeCompare(bRem);
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative h-full">
      <main className="flex-1 overflow-y-auto p-8 no-scrollbar relative z-0">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center animate-in">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Buscar transação..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/60 dark:bg-slate-800/60 border border-white/50 dark:border-white/5 rounded-2xl glass text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
              />
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nova Transação
            </button>
          </div>

          {/* Filter Controls Row */}
          <div className="flex flex-wrap gap-4 items-center bg-white/40 dark:bg-slate-800/40 p-4 rounded-[24px] border border-white/30 dark:border-white/5 backdrop-blur-md animate-in">
            {/* Type Filter */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/50 dark:border-white/5">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  filterType === 'expense'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                Despesas
              </button>
              <button
                onClick={() => setFilterType('income')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  filterType === 'income'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                Receitas
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline">Categoria:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 dark:text-white cursor-pointer font-bold"
              >
                <option value="all">Todas as Categorias</option>
                <option value="Lazer">Lazer</option>
                <option value="Alimentação">Alimentação</option>
                <option value="Salário">Salário</option>
                <option value="Transporte">Transporte</option>
                <option value="Saúde">Saúde</option>
                <option value="Cartão">Cartão</option>
                <option value="Assinaturas">Assinaturas</option>
                <option value="Boleto">Boleto</option>
                <option value="Utilidades">Utilidades</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            {/* Vínculo Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline">Vínculo:</span>
              <select
                value={filterLink}
                onChange={(e) => setFilterLink(e.target.value)}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 dark:text-white cursor-pointer font-bold"
              >
                <option value="all">Todos os Vínculos</option>
                <option value="linked">Vinculados</option>
                <option value="unlinked">Não Vinculados</option>
              </select>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-[40px] border border-white/50 dark:border-white/5 shadow-sm overflow-hidden animate-in">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
              </div>
            ) : sortedAndFiltered.length === 0 ? (
              <div className="text-center py-20 text-slate-400 flex flex-col items-center justify-center">
                <p className="mb-4">Nenhuma transação encontrada para os filtros atuais.</p>
                <button 
                  onClick={() => {
                    setSearch('');
                    setFilterType('all');
                    setFilterCategory('all');
                    setFilterLink('all');
                  }}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:text-white text-xs font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer shadow-sm"
                >
                  Limpar Filtros
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5">
                      <th 
                        onClick={() => handleSort(sortField === 'date' ? 'description' : 'date')}
                        className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          Descrição / Data 
                          <span className="text-emerald-500/80 font-bold">
                            {sortField === 'date' ? (sortDirection === 'asc' ? '📅 ↑' : '📅 ↓') : (sortField === 'description' ? (sortDirection === 'asc' ? '🔤 A-Z' : '🔤 Z-A') : '')}
                          </span>
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('category')}
                        className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          Categoria {sortField === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('reminder')}
                        className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          Vínculo {sortField === 'reminder' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('amount')}
                        className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors text-right select-none"
                      >
                        <div className="flex items-center justify-end gap-1">
                          Valor {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {sortedAndFiltered.map((tx) => {
                      const IconComponent = iconMap[tx.icon] || Wallet;
                      const isIncome = tx.amount > 0;
                      return (
                        <tr key={tx.id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                <IconComponent className="w-[18px] h-[18px]" />
                              </div>
                              <div>
                                <p className="text-sm font-black dark:text-white">{tx.description}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {new Date(tx.date).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="px-3 py-1.5 bg-slate-100/50 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-[10px] font-black rounded-lg uppercase tracking-widest">
                              {tx.category}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            {tx.reminders ? (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all w-fit group/badge">
                                <span>🔗 {tx.reminders.title}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnlinkTransaction(tx);
                                  }}
                                  className="w-3.5 h-3.5 bg-violet-500/20 hover:bg-red-500 hover:text-white rounded-full flex items-center justify-center cursor-pointer transition-colors text-violet-300 text-[8px] font-bold"
                                  title="Remover Vínculo"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setLinkingTransaction(tx);
                                  setIsLinkModalOpen(true);
                                  fetchRemindersForLinking();
                                }}
                                className="text-slate-400 hover:text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <span>+ Vincular</span>
                              </button>
                            )}
                          </td>
                          <td className="px-8 py-5 text-right font-black text-sm dark:text-white">
                            <span className={isIncome ? 'text-emerald-500' : ''}>
                              {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingTransaction(tx);
                                  setEditDescription(tx.description);
                                  setEditCategory(tx.category);
                                  setEditIcon(tx.icon);
                                  setEditAmount(Math.abs(tx.amount).toString());
                                  setEditType(tx.amount > 0 ? 'income' : 'expense');
                                  setEditCardId(tx.card_id || '');
                                  setIsEditModalOpen(true);
                                }}
                                className="w-7 h-7 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                                title="Editar Transação"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(tx.id, tx.description)}
                                className="w-7 h-7 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-lg flex items-center justify-center cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                                title="Excluir Transação"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Insert Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-8 border border-white/20 shadow-2xl relative animate-in">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-black mb-6 dark:text-white">Nova Transação</h3>

            {modalError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-start gap-2 mb-6 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}
            
            <form onSubmit={handleCreateTransaction} className="space-y-6">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    type === 'expense' 
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" /> Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    type === 'income' 
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" /> Receita
                </button>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Descrição</label>
                <input 
                  type="text" 
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Netflix, Salário"
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                  >
                    <option value="Lazer">Lazer</option>
                    <option value="Alimentação">Alimentação</option>
                    <option value="Salário">Salário</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Assinaturas">Assinaturas</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Utilidades">Utilidades</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Ícone</label>
                  <select
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                  >
                    <option value="Tv">Lazer (Tv)</option>
                    <option value="ShoppingCart">Compras (Carrinho)</option>
                    <option value="ArrowDownLeft">Salário (Seta)</option>
                    <option value="Zap">Utilidades (Raio)</option>
                    <option value="Activity">Saúde (Gráfico)</option>
                    <option value="CreditCard">Cartão (Cartão)</option>
                    <option value="FileText">Boleto (Documento)</option>
                  </select>
                </div>
              </div>

              {category === 'Cartão' && creditCards.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Associar ao Cartão</label>
                    <select
                      value={selectedCardId}
                      onChange={(e) => setSelectedCardId(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                    >
                      {creditCards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.card_name} (•••• {card.last_four})
                        </option>
                      ))}
                    </select>
                  </div>

                  {type === 'expense' && (
                    <div className="flex items-center gap-2 py-1">
                      <input 
                        type="checkbox" 
                        id="isInstallment" 
                        checked={isInstallment}
                        onChange={(e) => setIsInstallment(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="isInstallment" className="text-xs font-bold text-slate-400 dark:text-slate-300 cursor-pointer select-none">
                        Esta compra é parcelada?
                      </label>
                    </div>
                  )}

                  {type === 'expense' && isInstallment && (
                    <div className="p-4 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-2xl space-y-4 animate-in fade-in duration-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Total de Parcelas</label>
                          <input 
                            type="number" 
                            min="1"
                            value={totalInstallments}
                            onChange={(e) => setTotalInstallments(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 dark:text-white font-mono text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Parcelas Pagas</label>
                          <input 
                            type="number" 
                            min="0"
                            value={paidInstallments}
                            onChange={(e) => setPaidInstallments(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 dark:text-white font-mono text-center"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Data de Aprovação (Compra)</label>
                        <input 
                          type="date" 
                          value={firstDueDate}
                          onChange={(e) => setFirstDueDate(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 dark:text-white font-mono"
                        />
                      </div>
                      {amount && totalInstallments && (
                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                          Valor da Parcela: <span className="text-slate-700 dark:text-slate-200 font-black">
                            {((parseFloat(amount) || 0) / (parseInt(totalInstallments, 10) || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Confirmar Transação
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Link Transaction Modal */}
      {isLinkModalOpen && linkingTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-8 border border-white/20 shadow-2xl relative animate-in max-h-[85vh] flex flex-col">
            <button 
              onClick={() => {
                setIsLinkModalOpen(false);
                setLinkingTransaction(null);
                setModalError('');
              }}
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="mb-6">
              <h3 className="text-xl font-black dark:text-white">Vincular Lançamento</h3>
              <p className="text-xs text-slate-400 mt-2">
                Selecione um lembrete (assinatura, conta ou dívida) para associar a esta transação. 
                Isso marcará o lembrete como pago automaticamente e evitará lançamentos duplicados.
              </p>
            </div>

            {/* Transaction Card Preview */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-black dark:text-white">{linkingTransaction.description}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {new Date(linkingTransaction.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-red-500">
                    {linkingTransaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>
            </div>

            {modalError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-start gap-2 mb-6 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Reminders List */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 min-h-[200px] pr-1">
              {reminders.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Nenhum lembrete encontrado.
                </div>
              ) : (
                rankReminders(reminders, linkingTransaction).map((r) => {
                  const isLinkedToOther = r.transactions && r.transactions.length > 0 && !r.transactions.some((t: any) => t.id === linkingTransaction.id);
                  const isSelected = linkingTransaction.reminder_id === r.id;
                  
                  return (
                    <div 
                      key={r.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'bg-violet-500/10 border-violet-500/30' 
                          : isLinkedToOther 
                            ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-white/5 opacity-50' 
                            : 'bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200 dark:border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400">
                          {r.is_recurring ? <Repeat className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                        </div>
                        <div className="max-w-[180px] sm:max-w-[240px]">
                          <p className="text-xs font-black dark:text-white flex items-center gap-2 truncate">
                            {r.title}
                            {r.paid && (
                              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-bold rounded shrink-0">
                                Pago
                              </span>
                            )}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Venc: {new Date(r.due_date).toLocaleDateString('pt-BR')} 
                            {r.is_recurring && ' • Recorrente'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs font-black dark:text-white">
                            {Number(r.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                        
                        {isLinkedToOther ? (
                          <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl font-sans">
                            Já Vinculado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleLinkTransaction(r.id)}
                            className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold rounded-xl uppercase tracking-wider transition-colors cursor-pointer font-sans"
                          >
                            Vincular
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {isEditModalOpen && editingTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-8 border border-white/20 shadow-2xl relative animate-in">
            <button 
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingTransaction(null);
                setEditModalError('');
              }}
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-black mb-6 dark:text-white">Editar Transação</h3>

            {editModalError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-start gap-2 mb-6 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{editModalError}</span>
              </div>
            )}
            
            <form onSubmit={handleUpdateTransaction} className="space-y-6">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setEditType('expense')}
                  className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    editType === 'expense' 
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" /> Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setEditType('income')}
                  className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    editType === 'income' 
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" /> Receita
                </button>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Descrição</label>
                <input 
                  type="text" 
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Categoria</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white cursor-pointer font-bold"
                  >
                    <option value="Lazer">Lazer</option>
                    <option value="Alimentação">Alimentação</option>
                    <option value="Salário">Salário</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Assinaturas">Assinaturas</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Utilidades">Utilidades</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Ícone</label>
                  <select
                    value={editIcon}
                    onChange={(e) => setEditIcon(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white cursor-pointer font-bold"
                  >
                    <option value="Tv">Lazer (Tv)</option>
                    <option value="ShoppingCart">Compras (Carrinho)</option>
                    <option value="ArrowDownLeft">Salário (Seta)</option>
                    <option value="Zap">Utilidades (Raio)</option>
                    <option value="Activity">Saúde (Gráfico)</option>
                    <option value="CreditCard">Cartão (Cartão)</option>
                    <option value="FileText">Boleto (Documento)</option>
                  </select>
                </div>
              </div>

              {editCategory === 'Cartão' && creditCards.length > 0 && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Associar ao Cartão</label>
                  <select
                    value={editCardId}
                    onChange={(e) => setEditCardId(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white cursor-pointer font-bold"
                  >
                    <option value="">Sem cartão específico</option>
                    {creditCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.card_name} (•••• {card.last_four})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all cursor-pointer font-sans"
              >
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

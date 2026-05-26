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
  AlertCircle
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

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

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

    const numericAmount = parseFloat(amount) * (type === 'expense' ? -1 : 1);

    try {
      // Find a mock user ID for testing if not signed in, or let RLS handle it
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) {
        setModalError('Você precisa estar autenticado para realizar esta ação.');
        return;
      }

      const { error } = await supabase.from('transactions').insert({
        user_id: userId,
        description,
        category,
        amount: numericAmount,
        icon,
        date: new Date().toISOString()
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

  const filtered = transactions.filter(
    (t) =>
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  );

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

          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-[40px] border border-white/50 dark:border-white/5 shadow-sm overflow-hidden animate-in">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-slate-400 flex flex-col items-center justify-center">
                <p className="mb-4">Nenhuma transação encontrada para a busca atual.</p>
                <button 
                  onClick={() => setSearch('')}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:text-white text-xs font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer shadow-sm"
                >
                  Limpar Busca
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filtered.map((tx) => {
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
                          <td className="px-8 py-5 text-right font-black text-sm dark:text-white">
                            <span className={isIncome ? 'text-emerald-500' : ''}>
                              {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
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
                  </select>
                </div>
              </div>

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
    </div>
  );
}

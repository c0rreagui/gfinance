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
  ChevronRight,
  Sparkles,
  Lock
} from 'lucide-react';
import { TiltCard } from '@/components/TiltCard';
import { supabase } from '@/lib/supabase';

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

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dynamic dashboard states
  const [stats, setStats] = useState<Stat[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    setMounted(true);
    checkUser();
  }, []);

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
      // 1. Fetch Balances
      const { data: dbBalances } = await supabase
        .from('balances')
        .select('*')
        .eq('user_id', userId);
      
      if (dbBalances && dbBalances.length > 0) {
        const formattedStats = dbBalances.map((b: any) => ({
          id: b.id,
          label: b.label,
          value: b.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          trend: b.trend || '+0%',
          icon: b.icon || 'Wallet',
          color: b.type === 'expense' ? 'orange' : 'emerald'
        }));
        setStats(formattedStats);
      } else {
        // Initialize default empty stats for new user
        setStats([
          { id: '1', label: 'Saldo Total', value: 'R$ 0,00', trend: '+0%', icon: 'Wallet', color: 'emerald' },
          { id: '2', label: 'Receitas', value: 'R$ 0,00', trend: '+0%', icon: 'ArrowUpCircle', color: 'emerald' },
          { id: '3', label: 'Despesas', value: 'R$ 0,00', trend: '-0%', icon: 'ArrowDownCircle', color: 'orange' }
        ]);
      }

      // 2. Fetch Transactions
      const { data: dbTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(5);
      
      setTransactions(dbTransactions || []);

      // 3. Fetch Reminders
      const { data: dbReminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .eq('paid', false)
        .order('due_date', { ascending: true })
        .limit(2);
      
      setReminders(dbReminders || []);

      // 4. Fetch Goals
      const { data: dbGoals } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .limit(2);
      
      setGoals(dbGoals || []);

    } catch (err) {
      console.error('Error fetching dashboard records:', err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-8 no-scrollbar relative h-full">
      <div className="max-w-6xl mx-auto space-y-8 animate-in">
        {/* Welcome Section */}
        <div className="flex justify-between items-center bg-white/40 dark:bg-slate-800/40 p-6 rounded-[32px] border border-white/50 dark:border-white/5">
          <div>
            <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
              Olá, {user?.user_metadata?.full_name || user?.email} <Sparkles className="w-5 h-5 text-emerald-500" />
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Conta Premium Vinculada ao Supabase</p>
          </div>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer"
          >
            Sair
          </button>
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
                  <path 
                    d="M 0 160 Q 150 140, 300 80 T 600 20" 
                    fill="none" 
                    stroke="#10b981" 
                    strokeWidth="6" 
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
                  <div className="text-center py-10 text-slate-400 text-sm">
                    Nenhuma transação registrada. Vá para a aba "Transações" para adicionar.
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
            {/* 3D Glass Credit Card */}
            <div className="bg-slate-900 rounded-[40px] aspect-[1.5/1] overflow-hidden relative group shadow-2xl">
              {mounted && (
                <div className="spline-container spline-interactive">
                  <spline-viewer url="https://prod.spline.design/1e9d1552-3443-485d-a066-e46604b8db02/scene.splinecode"></spline-viewer>
                </div>
              )}
              <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none z-10">
                <h4 className="text-white font-black text-lg">G-Black Card</h4>
                <div className="text-white/60 font-mono tracking-[0.2em] text-sm">•••• •••• •••• 4290</div>
              </div>
            </div>

            {/* Upcoming Payments */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-8 rounded-[40px] border border-white/50 dark:border-white/5">
              <h4 className="font-black text-lg mb-6 dark:text-white tracking-tight">Próximos Pagamentos</h4>
              <div className="space-y-4">
                {reminders.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Sem faturas pendentes.
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
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Nenhuma meta de investimento.
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

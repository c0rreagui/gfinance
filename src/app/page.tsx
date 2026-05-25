'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Tv, 
  ShoppingCart, 
  ArrowDownLeft, 
  Zap, 
  Activity,
  ChevronRight 
} from 'lucide-react';
import { TiltCard } from '@/components/TiltCard';

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
  id: number;
  label: string;
  value: string;
  trend: string;
  icon: string;
  color: string;
}

interface Transaction {
  id: number;
  date: string;
  desc: string;
  cat: string;
  value: number;
  icon: string;
}

interface Reminder {
  id: number;
  title: string;
  due: string;
  amount: string;
  urgency: 'high' | 'medium' | 'low';
}

interface Goal {
  id: number;
  name: string;
  progress: number;
  color: string;
}

const MOCK_DATA = {
  stats: [
    { id: 1, label: 'Saldo Total', value: 'R$ 14.580,20', trend: '+3.2%', icon: 'Wallet', color: 'emerald' },
    { id: 2, label: 'Receitas (Maio)', value: 'R$ 9.400,00', trend: '+15%', icon: 'ArrowUpCircle', color: 'emerald' },
    { id: 3, label: 'Despesas (Maio)', value: 'R$ 4.120,50', trend: '-8%', icon: 'ArrowDownCircle', color: 'orange' },
  ] as Stat[],
  transactions: [
    { id: 1, date: '24 Mai', desc: 'Netflix Premium', cat: 'Lazer', value: -55.90, icon: 'Tv' },
    { id: 2, date: '23 Mai', desc: 'Supermercado Silva', cat: 'Alimentação', value: -342.10, icon: 'ShoppingCart' },
    { id: 3, date: '22 Mai', desc: 'Salário G-Tech', cat: 'Renda', value: 6500.00, icon: 'ArrowDownLeft' },
    { id: 4, date: '21 Mai', desc: 'Posto Shell', cat: 'Transporte', value: -180.00, icon: 'Zap' },
    { id: 5, date: '20 Mai', desc: 'Academia Fit', cat: 'Saúde', value: -120.00, icon: 'Activity' },
  ] as Transaction[],
  reminders: [
    { id: 1, title: 'Fatura Nubank', due: 'Hoje', amount: 'R$ 1.250,00', urgency: 'high' },
    { id: 2, title: 'Aluguel Casa', due: 'Em 3 dias', amount: 'R$ 2.800,00', urgency: 'medium' }
  ] as Reminder[],
  goals: [
    { id: 1, name: 'Reserva Emergência', progress: 85, color: 'emerald' },
    { id: 2, name: 'Viagem Japão', progress: 42, color: 'emerald' }
  ] as Goal[]
};

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="flex-1 overflow-y-auto p-8 no-scrollbar relative h-full">
      <div className="max-w-6xl mx-auto space-y-8 animate-in">
        {/* Stat Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {MOCK_DATA.stats.map((stat, i) => {
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
                <a href="/transactions" className="text-emerald-500 font-bold text-sm hover:underline">
                  Ver todas
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {MOCK_DATA.transactions.map((tx) => {
                      const Icon = iconMap[tx.icon] || Wallet;
                      return (
                        <tr key={tx.id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                          <td className="px-8 py-5 flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500">
                              <Icon className="w-[18px] h-[18px]" />
                            </div>
                            <div>
                              <p className="text-sm font-black dark:text-white">{tx.desc}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                {tx.cat}
                              </p>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right font-black">
                            <span className={tx.value > 0 ? 'text-emerald-600' : 'dark:text-white'}>
                              {tx.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                {MOCK_DATA.reminders.map((rem) => (
                  <div key={rem.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-black dark:text-white">{rem.title}</p>
                      <p className={`text-[10px] font-bold uppercase ${
                        rem.urgency === 'high' ? 'text-red-500' : 'text-blue-500'
                      }`}>
                        {rem.due} • {rem.amount}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                ))}
              </div>
            </div>

            {/* Active Goals */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-8 rounded-[40px] border border-white/50 dark:border-white/5">
              <h4 className="font-black text-lg mb-6 dark:text-white tracking-tight">Metas Ativas</h4>
              <div className="space-y-6">
                {MOCK_DATA.goals.map((goal) => (
                  <div key={goal.id}>
                    <div className="flex justify-between mb-2">
                      <span className="text-xs font-bold dark:text-white">{goal.name}</span>
                      <span className="text-xs font-bold text-emerald-600">{goal.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

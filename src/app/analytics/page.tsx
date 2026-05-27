'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowUpDown,
  ChevronRight,
  AlertCircle,
  ArrowUp,
  ArrowDown
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

type SortKey = 'category' | 'total' | 'count' | 'percentage';
type SortDir = 'asc' | 'desc';

export default function Analytics() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    const fetchAllTransactions = async () => {
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
    fetchAllTransactions();
  }, []);

  // KPI Aggregations
  const kpis = useMemo(() => {
    const income = transactions.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0);
    const expense = transactions.filter(t => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0);
    const balance = income - expense;
    const savingsRate = income > 0 ? ((balance / income) * 100) : 0;
    return { income, expense, balance, savingsRate };
  }, [transactions]);

  // Category breakdown (expenses only)
  const categoryData = useMemo(() => {
    const expenses = transactions.filter(t => t.amount < 0);
    const totalExpense = expenses.reduce((a, t) => a + Math.abs(t.amount), 0);
    const grouped: Record<string, { total: number; count: number }> = {};

    expenses.forEach(t => {
      const cat = t.category || 'Outros';
      if (!grouped[cat]) grouped[cat] = { total: 0, count: 0 };
      grouped[cat].total += Math.abs(t.amount);
      grouped[cat].count += 1;
    });

    return Object.entries(grouped)
      .map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
        percentage: totalExpense > 0 ? (data.total / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  // Monthly trend data (last 12 months)
  const monthlyData = useMemo(() => {
    const grouped: Record<string, { income: number; expense: number }> = {};

    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = { income: 0, expense: 0 };
      if (t.amount > 0) grouped[key].income += t.amount;
      else grouped[key].expense += Math.abs(t.amount);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month,
        label: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short' }),
        income: data.income,
        expense: data.expense,
        balance: data.income - data.expense,
      }));
  }, [transactions]);

  // Sorted category data for table
  const sortedCategories = useMemo(() => {
    return [...categoryData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [categoryData, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  // SVG chart helpers
  const maxCategoryTotal = categoryData.length > 0 ? Math.max(...categoryData.map(c => c.total)) : 1;
  const categoryColors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6', '#14b8a6'];

  // Monthly sparkline SVG
  const sparklinePath = useMemo(() => {
    if (monthlyData.length < 2) return '';
    const maxVal = Math.max(...monthlyData.map(m => Math.max(m.income, m.expense)), 1);
    const w = 400;
    const h = 120;
    const padding = 8;

    const incomePath = monthlyData.map((m, i) => {
      const x = padding + (i / (monthlyData.length - 1)) * (w - padding * 2);
      const y = h - padding - (m.income / maxVal) * (h - padding * 2);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const expensePath = monthlyData.map((m, i) => {
      const x = padding + (i / (monthlyData.length - 1)) * (w - padding * 2);
      const y = h - padding - (m.expense / maxVal) * (h - padding * 2);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return { incomePath, expensePath, w, h, padding, maxVal };
  }, [monthlyData]);

  const hasData = transactions.length > 0;

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-950 text-slate-100 h-full no-scrollbar relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(255,255,255,0))] pointer-events-none z-0"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 animate-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase">Relatórios & Analytics</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Visão analítica consolidada das suas finanças
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-emerald-500"></div>
          </div>
        ) : !hasData ? (
          /* Empty State */
          <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-16 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 bg-slate-800/60 rounded-3xl flex items-center justify-center border border-white/5">
              <BarChart3 className="w-8 h-8 text-slate-600 stroke-[1.5]" />
            </div>
            <div className="space-y-2 max-w-md">
              <p className="text-sm font-black uppercase tracking-wider text-slate-400">Sem dados suficientes</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Sem dados suficientes para gerar relatórios. Registre transações para desbloquear insights financeiros detalhados, gráficos de categoria e tendências mensais.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Receita Total', value: kpis.income, icon: TrendingUp, accent: 'text-emerald-400', iconBg: 'bg-emerald-500/10' },
                { label: 'Despesa Total', value: kpis.expense, icon: TrendingDown, accent: 'text-red-400', iconBg: 'bg-red-500/10' },
                { label: 'Saldo Líquido', value: kpis.balance, icon: Wallet, accent: kpis.balance >= 0 ? 'text-emerald-400' : 'text-red-400', iconBg: kpis.balance >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10' },
                { label: 'Taxa de Economia', value: null, icon: PiggyBank, accent: kpis.savingsRate >= 0 ? 'text-emerald-400' : 'text-red-400', iconBg: 'bg-amber-500/10' },
              ].map((kpi) => (
                <div key={kpi.label} className="glass bg-slate-900/40 rounded-[24px] border border-white/5 p-6">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={`w-7 h-7 ${kpi.iconBg} rounded-lg flex items-center justify-center`}>
                      <kpi.icon className={`w-3.5 h-3.5 ${kpi.accent}`} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                  </div>
                  <p className={`text-xl font-black ${kpi.accent}`}>
                    {kpi.value !== null
                      ? kpi.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : `${kpis.savingsRate.toFixed(1)}%`
                    }
                  </p>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown Bar Chart */}
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8">
                <div className="flex items-center gap-2 mb-6">
                  <ChevronRight className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-black uppercase tracking-wider">Despesas por Categoria</h2>
                </div>
                <div className="space-y-3">
                  {categoryData.slice(0, 8).map((cat, i) => (
                    <div key={cat.category} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat.category}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-500">{cat.percentage.toFixed(1)}%</span>
                          <span className="text-xs font-black text-slate-200">
                            {cat.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-800/60 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${(cat.total / maxCategoryTotal) * 100}%`,
                            backgroundColor: categoryColors[i % categoryColors.length],
                            animation: `barGrow 0.8s ${i * 0.1}s ease-out both`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <style jsx>{`
                  @keyframes barGrow {
                    from { width: 0; }
                  }
                `}</style>
              </div>

              {/* Monthly Trend Sparkline */}
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8">
                <div className="flex items-center gap-2 mb-6">
                  <ChevronRight className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-black uppercase tracking-wider">Tendência Mensal</h2>
                </div>

                {monthlyData.length >= 2 && sparklinePath && typeof sparklinePath === 'object' ? (
                  <div className="relative">
                    <svg
                      viewBox={`0 0 ${sparklinePath.w} ${sparklinePath.h}`}
                      className="w-full h-auto"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                        <line
                          key={pct}
                          x1={sparklinePath.padding}
                          y1={sparklinePath.h - sparklinePath.padding - pct * (sparklinePath.h - sparklinePath.padding * 2)}
                          x2={sparklinePath.w - sparklinePath.padding}
                          y2={sparklinePath.h - sparklinePath.padding - pct * (sparklinePath.h - sparklinePath.padding * 2)}
                          stroke="rgba(255,255,255,0.04)"
                          strokeWidth="0.5"
                        />
                      ))}

                      {/* Income line */}
                      <path
                        d={sparklinePath.incomePath}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="chart-path"
                      />
                      {/* Expense line */}
                      <path
                        d={sparklinePath.expensePath}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="chart-path"
                        style={{ animationDelay: '0.3s' }}
                      />

                      {/* Data points — income */}
                      {monthlyData.map((m, i) => {
                        const x = sparklinePath.padding + (i / (monthlyData.length - 1)) * (sparklinePath.w - sparklinePath.padding * 2);
                        const y = sparklinePath.h - sparklinePath.padding - (m.income / sparklinePath.maxVal) * (sparklinePath.h - sparklinePath.padding * 2);
                        return (
                          <circle key={`inc-${i}`} cx={x} cy={y} r="3" fill="#10b981" opacity="0.8" />
                        );
                      })}
                      {/* Data points — expense */}
                      {monthlyData.map((m, i) => {
                        const x = sparklinePath.padding + (i / (monthlyData.length - 1)) * (sparklinePath.w - sparklinePath.padding * 2);
                        const y = sparklinePath.h - sparklinePath.padding - (m.expense / sparklinePath.maxVal) * (sparklinePath.h - sparklinePath.padding * 2);
                        return (
                          <circle key={`exp-${i}`} cx={x} cy={y} r="3" fill="#ef4444" opacity="0.8" />
                        );
                      })}
                    </svg>

                    {/* Month labels */}
                    <div className="flex justify-between mt-2 px-2">
                      {monthlyData.map((m) => (
                        <span key={m.month} className="text-[8px] font-black text-slate-600 uppercase tracking-wider">
                          {m.label}
                        </span>
                      ))}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-0.5 rounded bg-emerald-500"></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Receita</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-0.5 rounded bg-red-500"></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Despesa</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12 text-slate-500">
                    <p className="text-[10px] font-black uppercase tracking-widest">Dados insuficientes para o gráfico</p>
                  </div>
                )}
              </div>
            </div>

            {/* Category Breakdown Table */}
            <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 overflow-hidden">
              <div className="px-8 py-6 border-b border-white/5 flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-black uppercase tracking-wider">Detalhamento por Categoria</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5">
                      {[
                        { key: 'category' as SortKey, label: 'Categoria' },
                        { key: 'count' as SortKey, label: 'Transações' },
                        { key: 'percentage' as SortKey, label: 'Participação' },
                        { key: 'total' as SortKey, label: 'Total' },
                      ].map((col) => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-emerald-400 transition-colors select-none ${
                            col.key === 'total' || col.key === 'percentage' ? 'text-right' : ''
                          } ${sortKey === col.key ? 'text-emerald-400' : 'text-slate-400'}`}
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            {sortKey === col.key && (
                              sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sortedCategories.map((cat, i) => (
                      <tr key={cat.category} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: categoryColors[i % categoryColors.length] }}
                            />
                            <span className="text-sm font-black text-slate-200">{cat.category}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-sm font-bold text-slate-400">{cat.count}</span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-800/60 rounded-full h-1.5">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${cat.percentage}%`,
                                  backgroundColor: categoryColors[i % categoryColors.length],
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 w-12 text-right">
                              {cat.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <span className="text-sm font-black text-slate-200">
                            {cat.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Footer */}
              <div className="px-8 py-5 border-t border-white/5 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {categoryData.length} categorias • {transactions.filter(t => t.amount < 0).length} despesas
                </span>
                <span className="text-sm font-black text-slate-100">
                  {kpis.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

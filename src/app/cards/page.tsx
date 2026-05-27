'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CardTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
}

export default function CardsPage() {
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [cardLimit, setCardLimit] = useState(25000);
  const [usedLimit, setUsedLimit] = useState(8244.70);
  const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCardData = async () => {
      try {
        setLoading(true);
        // Buscar lançamentos de cartão de crédito no Supabase
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('category', 'Cartão')
          .order('date', { ascending: false })
          .limit(10);

        if (error) throw error;
        setCardTransactions(data || []);
        
        // Calcular valor de despesa total na categoria Cartão
        const { data: allTxs } = await supabase
          .from('transactions')
          .select('amount')
          .eq('category', 'Cartão');

        if (allTxs) {
          const sum = allTxs.reduce((acc, t) => acc + Math.abs(t.amount), 0);
          if (sum > 0) setUsedLimit(sum);
        }
      } catch (err) {
        console.error('Error fetching card transactions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCardData();
  }, []);

  const availableLimit = cardLimit - usedLimit;
  const limitPercentage = (usedLimit / cardLimit) * 100;

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-950 text-slate-100 h-full no-scrollbar relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(255,255,255,0))] pointer-events-none z-0"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 animate-in">
        {/* Header */}
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel: 3D Credit Card Render & Limits */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Immersive 3D G-Black Card */}
            <div className="w-full max-w-md mx-auto aspect-[1.586/1] bg-gradient-to-br from-slate-900 via-neutral-900 to-black rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer">
              {/* Glass reflex overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0)_60%)] pointer-events-none"></div>
              {/* Glowing decorative sphere */}
              <div className="absolute right-[-10%] top-[-20%] w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>

              <div className="h-full flex flex-col justify-between relative z-10">
                {/* Brand & Chip */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-black text-sm">
                        G
                      </div>
                      <span className="font-black text-sm tracking-tight text-white uppercase">G-Black</span>
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
                      {showCardNumber ? "4290 8812 3456 9912" : "•••• •••• •••• 9912"}
                    </p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowCardNumber(!showCardNumber); }}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showCardNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex gap-6 mt-4">
                    <div>
                      <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Validade</p>
                      <p className="text-[10px] font-bold text-slate-300 mt-0.5">12/32</p>
                    </div>
                    <div>
                      <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Membro Desde</p>
                      <p className="text-[10px] font-bold text-slate-300 mt-0.5">2026</p>
                    </div>
                  </div>
                </div>

                {/* Owner Name & Logo */}
                <div className="flex justify-between items-end border-t border-white/5 pt-4">
                  <div>
                    <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Titular</p>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-100 mt-0.5">Guilherme C. S. P.</p>
                  </div>
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/20 backdrop-blur-sm"></div>
                    <div className="w-6 h-6 rounded-full bg-emerald-500 border border-emerald-400"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Credit Limits Slider Card */}
            <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-black uppercase tracking-wider">Ajuste de Limite Flex</h2>
                <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                  <ShieldCheck className="w-3.5 h-3.5" /> Sob Medida
                </span>
              </div>

              {/* Bar stats */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fatura Atual (R$)</p>
                  <p className="text-lg font-black mt-1 text-slate-200">
                    {usedLimit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Limite Disponível (R$)</p>
                  <p className="text-lg font-black mt-1 text-emerald-400">
                    {availableLimit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>

              {/* Progress limit bar */}
              <div className="space-y-2">
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-white/5">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${limitPercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                  <span>0% utilizado</span>
                  <span>{limitPercentage.toFixed(1)}% do limite de R$ {cardLimit.toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Interactive Slide Control */}
              <div className="space-y-3 border-t border-white/5 pt-6">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Ajustar Limite Máximo</label>
                <input 
                  type="range" 
                  min="10000" 
                  max="100000" 
                  step="5000"
                  value={cardLimit}
                  onChange={(e) => setCardLimit(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                  <span>Min: R$ 10.000</span>
                  <span className="text-emerald-400 font-black">Atual: R$ {cardLimit.toLocaleString('pt-BR')}</span>
                  <span>Máx: R$ 100.000</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Panel: Recent Card Transactions */}
          <div className="lg:col-span-5 space-y-8 flex flex-col overflow-hidden">
            <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 flex flex-col flex-1 overflow-hidden min-h-[400px]">
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider">Últimos Lançamentos</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Filtrado por compras no cartão</p>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Fevereiro 2026
                </span>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1">
                {loading ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-emerald-500"></div>
                  </div>
                ) : cardTransactions.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 space-y-4 flex flex-col items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-slate-600 stroke-[1.5]" />
                    <p className="text-xs font-bold uppercase tracking-widest">Nenhuma compra no cartão</p>
                    <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed">
                      Lance transações na categoria "Cartão" para que elas surjam listadas aqui no painel.
                    </p>
                  </div>
                ) : (
                  cardTransactions.map((tx) => (
                    <div 
                      key={tx.id} 
                      className="flex justify-between items-center p-4 bg-slate-950/40 border border-white/5 rounded-2xl hover:border-white/10 transition-colors"
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
                        {-Math.abs(tx.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-white/5 pt-6 mt-6 shrink-0 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Total Faturado</span>
                <span className="text-slate-100 font-black text-sm">
                  {usedLimit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

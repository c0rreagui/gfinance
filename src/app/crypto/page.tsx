'use client';

import React, { useMemo } from 'react';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Wallet,
  Link2,
  ArrowRight,
  Shield,
  Zap,
  Globe,
  Lock,
  Sparkles
} from 'lucide-react';

// Deterministic sparkline data generator
function generateSparkline(seed: number, points: number = 24): number[] {
  const data: number[] = [];
  let value = seed;
  for (let i = 0; i < points; i++) {
    value += Math.sin(i * 0.8 + seed) * 3 + Math.cos(i * 0.3) * 2;
    data.push(value);
  }
  return data;
}

function sparklineToPath(data: number[], width: number, height: number): string {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  return data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

interface CryptoAsset {
  name: string;
  symbol: string;
  sparkSeed: number;
  change24h: number;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  marketCap: string;
  icon: string;
}

const assets: CryptoAsset[] = [
  {
    name: 'Bitcoin',
    symbol: 'BTC',
    sparkSeed: 42,
    change24h: 2.34,
    color: '#f7931a',
    gradientFrom: 'from-orange-500/15',
    gradientTo: 'to-orange-900/5',
    marketCap: '#1 por Market Cap',
    icon: '₿',
  },
  {
    name: 'Ethereum',
    symbol: 'ETH',
    sparkSeed: 27,
    change24h: -1.12,
    color: '#627eea',
    gradientFrom: 'from-indigo-500/15',
    gradientTo: 'to-indigo-900/5',
    marketCap: '#2 por Market Cap',
    icon: 'Ξ',
  },
  {
    name: 'Solana',
    symbol: 'SOL',
    sparkSeed: 65,
    change24h: 5.87,
    color: '#9945ff',
    gradientFrom: 'from-violet-500/15',
    gradientTo: 'to-violet-900/5',
    marketCap: '#5 por Market Cap',
    icon: '◎',
  },
];

const upcomingFeatures = [
  { icon: Link2, text: 'Sync automático com exchanges (Binance, Coinbase, Kraken)' },
  { icon: Shield, text: 'Rastreamento seguro on-chain de wallets' },
  { icon: Zap, text: 'Alertas de preço e variação em tempo real' },
  { icon: Globe, text: 'Conversão multi-moeda (BRL, USD, EUR)' },
];

export default function CryptoPage() {
  const sparklines = useMemo(() => {
    return assets.map(a => generateSparkline(a.sparkSeed));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-950 text-slate-100 h-full no-scrollbar relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(255,255,255,0))] pointer-events-none z-0"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 animate-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase">Portfolio Cripto</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Monitor de ativos digitais e blockchain
            </p>
          </div>
        </div>

        {/* Hero Card — Total Portfolio Value */}
        <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-10 relative overflow-hidden">
          {/* Decorative glow orbs */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/[0.06] rounded-full blur-3xl"></div>
          <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-violet-500/[0.04] rounded-full blur-3xl"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor Total do Portfolio</p>
              <p className="text-4xl font-black text-slate-100 tracking-tight">
                {(0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">24h</span>
                <span className="text-sm font-black text-slate-500">—</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 bg-slate-800/60 rounded-xl border border-white/5 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nenhuma carteira conectada</span>
              </div>
            </div>
          </div>
        </div>

        {/* Crypto Asset Cards */}
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Ativos Monitorados
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {assets.map((asset, idx) => {
              const data = sparklines[idx];
              const path = sparklineToPath(data, 140, 40);
              const isPositive = asset.change24h >= 0;

              return (
                <div
                  key={asset.symbol}
                  className={`glass bg-gradient-to-br ${asset.gradientFrom} ${asset.gradientTo} rounded-[24px] border border-white/5 p-6 hover:scale-[1.02] transition-all duration-300 cursor-pointer group relative overflow-hidden`}
                >
                  {/* Subtle glow */}
                  <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-all"
                    style={{ backgroundColor: asset.color }}
                  ></div>

                  <div className="relative z-10">
                    {/* Coin header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black border border-white/10"
                          style={{ backgroundColor: `${asset.color}20`, color: asset.color }}
                        >
                          {asset.icon}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-100">{asset.name}</p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{asset.symbol}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 text-[10px] font-black ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isPositive ? '+' : ''}{asset.change24h}%
                      </div>
                    </div>

                    {/* Sparkline */}
                    <div className="mb-4">
                      <svg viewBox="0 0 140 40" className="w-full h-10" preserveAspectRatio="xMidYMid meet">
                        <defs>
                          <linearGradient id={`grad-${asset.symbol}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={asset.color} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={asset.color} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {/* Area fill */}
                        <path
                          d={`${path} L 140 40 L 0 40 Z`}
                          fill={`url(#grad-${asset.symbol})`}
                        />
                        {/* Line */}
                        <path
                          d={path}
                          fill="none"
                          stroke={asset.color}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="chart-path"
                        />
                      </svg>
                    </div>

                    {/* Price */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Preço</p>
                        <p className="text-lg font-black text-slate-300">—</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Saldo</p>
                        <p className="text-sm font-black text-slate-400">
                          {(0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                    </div>

                    {/* Rank badge */}
                    <div className="mt-4 pt-3 border-t border-white/5">
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{asset.marketCap}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Connect Wallet CTA */}
        <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-10 relative overflow-hidden">
          {/* Animated decorative elements */}
          <div className="absolute top-4 right-4 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black rounded-lg uppercase tracking-widest z-20">
            Em Breve
          </div>

          <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/[0.04] rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-violet-500/[0.03] rounded-full blur-3xl"></div>

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                  <Wallet className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight">Conecte sua Carteira</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Rastreamento completo do seu portfolio cripto
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-lg">
                Em breve você poderá conectar suas exchanges e wallets para acompanhar seu portfolio
                de criptoativos em tempo real, com conversão automática para BRL e alertas inteligentes.
              </p>

              {/* Feature list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {upcomingFeatures.map((feature) => (
                  <div key={feature.text} className="flex items-start gap-2.5">
                    <div className="w-6 h-6 bg-white/[0.03] rounded-lg flex items-center justify-center border border-white/5 shrink-0 mt-0.5">
                      <feature.icon className="w-3 h-3 text-slate-500" />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{feature.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual CTA */}
            <div className="lg:shrink-0">
              <button
                disabled
                className="px-8 py-4 bg-emerald-500/20 border border-emerald-500/20 text-emerald-400/60 text-xs font-black rounded-2xl uppercase tracking-widest cursor-not-allowed flex items-center gap-2 shadow-xl shadow-emerald-500/5"
              >
                <Link2 className="w-4 h-4" />
                Conectar Exchange
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[9px] text-slate-600 font-bold text-center mt-3 uppercase tracking-widest">
                Disponível em breve
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Disclaimer */}
        <div className="text-center pb-4">
          <p className="text-[9px] text-slate-700 font-bold uppercase tracking-widest">
            Dados demonstrativos • Nenhuma transação real de criptoativos registrada
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutGrid, 
  Receipt, 
  CreditCard, 
  Landmark, 
  Target, 
  Repeat, 
  BarChart3, 
  Coins, 
  Link2, 
  Settings,
  Sparkles
} from 'lucide-react';

interface SidebarItem {
  name: string;
  icon: React.ComponentType<any>;
  path: string;
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const items: SidebarItem[] = [
    { name: 'Visão Geral', icon: LayoutGrid, path: '/' },
    { name: 'Gemini Brain', icon: Sparkles, path: '/gemini' },
    { name: 'Transações', icon: Receipt, path: '/transactions' },
    { name: 'Cartões', icon: CreditCard, path: '/cards' },
    { name: 'Dívidas', icon: Landmark, path: '/debts' },
    { name: 'Investimentos', icon: Target, path: '/wealth' },
    { name: 'Assinaturas', icon: Repeat, path: '/subscriptions' },
    { name: 'Relatórios', icon: BarChart3, path: '/analytics' },
    { name: 'Cripto', icon: Coins, path: '/crypto' },
    { name: 'Fontes de Dados', icon: Link2, path: '/integrations' },
    { name: 'Ajustes', icon: Settings, path: '/settings' },
  ];

  return (
    <aside className="w-64 glass border-r border-slate-200 dark:border-white/5 flex flex-col h-full z-10 overflow-y-auto no-scrollbar">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-emerald-500/20">
            G
          </div>
          <span className="font-black text-xl tracking-tight dark:text-white">G-Finance</span>
        </div>
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                  isActive
                    ? 'bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] transition-colors ${
                    isActive ? 'text-white' : 'group-hover:text-emerald-500'
                  }`}
                />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
export default Sidebar;

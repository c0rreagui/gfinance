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
  Sparkles,
  Briefcase,
  Mic,
  CornerUpLeft,
  Wallet
} from 'lucide-react';

interface SidebarItem {
  name: string;
  icon: React.ComponentType<any>;
  path: string;
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [currentQuery, setCurrentQuery] = React.useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentQuery(window.location.search);
    }
  }, [pathname]);

  // Hide sidebar on Hub Portal and Auth pages
  if (pathname === '/' || pathname === '/auth' || pathname === '/auth/callback') {
    return null;
  }

  const isTaskModule = pathname.startsWith('/tasks') || currentQuery.includes('module=work');

  // Dynamic items based on context (G-Finance vs. Work & Tasks)
  const financeItems: SidebarItem[] = [
    { name: 'Visão Geral', icon: LayoutGrid, path: '/finance' },
    { name: 'Gemini Brain', icon: Sparkles, path: '/gemini' },
    { name: 'Transações', icon: Receipt, path: '/transactions' },
    { name: 'Cartões', icon: CreditCard, path: '/cards' },
    { name: 'Dívidas', icon: Landmark, path: '/debts' },
    { name: 'Investimentos', icon: Target, path: '/wealth' },
    { name: 'Assinaturas', icon: Repeat, path: '/subscriptions' },
    { name: 'Relatórios', icon: BarChart3, path: '/analytics' },
    { name: 'Cripto', icon: Coins, path: '/crypto' },
    { name: 'Fontes de Dados', icon: Link2, path: '/integrations' },
    { name: 'Ajustes', icon: Settings, path: '/settings?module=finance' },
  ];

  const taskItems: SidebarItem[] = [
    { name: 'Quadro Kanban', icon: Briefcase, path: '/tasks' },
    { name: 'Projetos', icon: Target, path: '/tasks?tab=projects' },
    { name: 'Gravações & Transcrições', icon: Mic, path: '/tasks?tab=transcriptions' },
    { name: 'Ajustes', icon: Settings, path: '/settings?module=work' },
  ];

  const items = isTaskModule ? taskItems : financeItems;

  return (
    <aside className="w-64 glass border-r border-slate-200 dark:border-white/5 flex flex-col h-full z-10 overflow-y-auto no-scrollbar">
      <div className="p-8 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand Logo Header */}
          <div className="flex items-center gap-3 mb-12">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg ${
              isTaskModule 
                ? 'bg-blue-500 shadow-blue-500/20' 
                : 'bg-emerald-500 shadow-emerald-500/20'
            }`}>
              {isTaskModule ? 'W' : 'F'}
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tight dark:text-white leading-none">
                {isTaskModule ? 'G-Work' : 'G-Finance'}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                G-Hub
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || (item.path.includes('?') && pathname + currentQuery === item.path);
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                    isActive
                      ? isTaskModule
                        ? 'bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20'
                        : 'bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon
                    className={`w-[18px] h-[18px] transition-colors ${
                      isActive 
                        ? 'text-white' 
                        : isTaskModule
                          ? 'group-hover:text-blue-500'
                          : 'group-hover:text-emerald-500'
                    }`}
                  />
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions - Hub & App Switcher */}
        <div className="mt-8 space-y-2 pt-6 border-t border-slate-200 dark:border-white/5">
          {/* Quick Module Switch */}
          {isTaskModule ? (
            <Link
              href="/finance"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 group"
            >
              <Wallet className="w-[18px] h-[18px] text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold">Ir para G-Finance</span>
            </Link>
          ) : (
            <Link
              href="/tasks"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 group"
            >
              <Briefcase className="w-[18px] h-[18px] text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold">Ir para G-Work</span>
            </Link>
          )}

          {/* Hub portal button */}
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all duration-300 group"
          >
            <CornerUpLeft className="w-[18px] h-[18px] text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-bold">Portal Central</span>
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

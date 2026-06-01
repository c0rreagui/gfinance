'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sun, Moon, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);


  useEffect(() => {
    try {
      const theme = localStorage.getItem('theme');
      if (
        theme === 'dark' ||
        (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ) {
        document.documentElement.classList.add('dark');
        setIsDark(true);
      } else {
        document.documentElement.classList.remove('dark');
        setIsDark(false);
      }
    } catch (e) {
      console.warn('LocalStorage blocked or not available', e);
    }
  }, []);

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();
          if (data?.avatar_url) {
            setAvatarUrl(data.avatar_url);
          }
        }
      } catch (e) {}
    };

    fetchAvatar();

    // Set up real-time listener for profile avatar updates
    const channel = supabase
      .channel('header-avatar')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload: any) => {
          if (payload.new && payload.new.avatar_url) {
            setAvatarUrl(payload.new.avatar_url);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      setIsDark(false);
      try {
        localStorage.setItem('theme', 'light');
      } catch (e) {}
    } else {
      html.classList.add('dark');
      setIsDark(true);
      try {
        localStorage.setItem('theme', 'dark');
      } catch (e) {}
    }
  };

  const getMonthYear = () => {
    const date = new Date();
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getPageTitle = () => {
    if (pathname.startsWith('/tasks')) return 'G-Work';
    if (pathname.startsWith('/finance')) return 'Dashboard Financeiro';
    if (pathname.startsWith('/transactions')) return 'Extrato de Lançamentos';
    if (pathname.startsWith('/cards')) return 'Meus Cartões';
    if (pathname.startsWith('/debts')) return 'Controle de Dívidas';
    if (pathname.startsWith('/wealth')) return 'Investimentos';
    if (pathname.startsWith('/subscriptions')) return 'Assinaturas Recorrentes';
    if (pathname.startsWith('/analytics')) return 'Relatórios & Analytics';
    if (pathname.startsWith('/crypto')) return 'Monitor Cripto';
    if (pathname.startsWith('/integrations')) return 'Fontes de Dados';
    if (pathname.startsWith('/settings')) return 'Ajustes do Sistema';
    return 'Dashboard';
  };

  if (pathname === '/' || pathname === '/auth' || pathname === '/auth/callback') {
    return null;
  }

  return (
    <header className="h-20 px-8 flex items-center justify-between glass border-b border-slate-200 dark:border-white/5 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-black dark:text-white">{getPageTitle()}</h2>
        <div className="h-4 w-px bg-slate-200 dark:bg-white/10"></div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {getMonthYear()}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
          aria-label="Toggle Theme"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border-2 border-emerald-100 dark:border-white/10 flex items-center justify-center text-slate-400 shadow-sm overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5" />
          )}
        </div>
      </div>
    </header>
  );
};
export default Header;

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Wallet, 
  Sparkles, 
  ChevronRight,
  ChevronLeft,
  Briefcase,
  Layers,
  ArrowRight,
  Calendar,
  Plus,
  Trash2,
  MapPin,
  Clock,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Check,
  User,
  Folder,
  CalendarDays,
  CheckSquare,
  Square,
  ArrowUpRight
} from 'lucide-react';
import { TiltCard } from '@/components/TiltCard';
import { supabase } from '@/lib/supabase';
import { AiChatHub } from '@/app/components/AiChatHub';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  is_all_day: boolean;
  color: string;
  category: 'work' | 'personal' | 'finance' | 'general';
}

interface FinancialBalance {
  label: string;
  amount: number;
  type: 'total' | 'income' | 'expense';
  icon: string;
}

interface WorkTask {
  id: string;
  title: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low' | 'none';
  due_date: string;
}

interface BillReminder {
  id: string;
  title: string;
  due_date: string;
  amount: number;
  urgency: 'high' | 'medium' | 'low';
}

export default function HubPortal() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Core Datasets
  const [balances, setBalances] = useState<FinancialBalance[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [reminders, setReminders] = useState<BillReminder[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Calendar UI states
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Event Form State
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_date: new Date().toISOString().split('T')[0],
    end_time: '10:00',
    location: '',
    is_all_day: false,
    color: '#6366f1',
    category: 'general' as 'work' | 'personal' | 'finance' | 'general'
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setMounted(true);
    checkUserAndFetch();
  }, []);

  const checkUserAndFetch = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUser(user);
      await fetchData(user.id);
    } catch (err) {
      console.error('Error verifying auth or fetching portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (userId: string) => {
    try {
      const [
        { data: dbBalances },
        { data: dbCards },
        { data: dbReminders },
        { data: dbTasks },
        { data: dbProjects },
        { data: dbEvents }
      ] = await Promise.all([
        supabase.from('balances').select('*').eq('user_id', userId),
        supabase.from('credit_cards').select('*').eq('user_id', userId),
        supabase.from('reminders').select('*').eq('user_id', userId).eq('paid', false).order('due_date', { ascending: true }),
        supabase.from('tasks').select('*').eq('user_id', userId).neq('status', 'done').order('sort_order', { ascending: true }),
        supabase.from('tasks_projects').select('*').eq('user_id', userId),
        supabase.from('calendar_events').select('*').eq('user_id', userId)
      ]);

      if (dbBalances) setBalances(dbBalances);
      
      let activeCards = dbCards || [];
      if (!dbCards || dbCards.length === 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('card_limit')
          .eq('id', userId)
          .single();

        const initialLimit = profile?.card_limit ? Number(profile.card_limit) : 25000;
        const { data: newCard, error: insertError } = await supabase
          .from('credit_cards')
          .insert({
            user_id: userId,
            card_name: 'G-Black',
            last_four: '9912',
            expiration_date: '12/32',
            card_limit: initialLimit,
            closing_day: 4,
            due_day: 10,
            color_theme: 'emerald',
            spline_url: 'https://prod.spline.design/1e9d1552-3443-485d-a066-e46604b8db02/scene.splinecode'
          })
          .select()
          .single();

        if (!insertError && newCard) {
          activeCards = [newCard];
        }
      }
      setCreditCards(activeCards);

      if (dbReminders) setReminders(dbReminders);
      if (dbTasks) setTasks(dbTasks);
      if (dbProjects) setProjects(dbProjects);
      if (dbEvents) setEvents(dbEvents);
    } catch (err) {
      console.error('Error querying backend tables:', err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  // Toggle Task Completion (Done/Todo) directly from Command Center
  const handleToggleTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Error completing task:', err);
    }
  };

  // Delete Calendar Event
  const handleDeleteEvent = async (eventId: string) => {
    if (typeof window !== 'undefined' && !window.confirm('Tem certeza que deseja deletar este compromisso?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      setEvents(prev => prev.filter(ev => ev.id !== eventId));
    } catch (err) {
      console.error('Error deleting calendar event:', err);
    }
  };

  // Handle Event Creation
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim()) {
      setFormError('Título é obrigatório.');
      return;
    }
    setFormSubmitting(true);
    setFormError('');

    try {
      const startDateTime = new Date(`${newEvent.start_date}T${newEvent.start_time}:00`);
      const endDateTime = new Date(`${newEvent.end_date}T${newEvent.end_time}:00`);

      if (endDateTime <= startDateTime) {
        setFormError('A data de fim deve ser posterior à data de início.');
        setFormSubmitting(false);
        return;
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          user_id: user.id,
          title: newEvent.title,
          description: newEvent.description || null,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          location: newEvent.location || null,
          is_all_day: newEvent.is_all_day,
          color: newEvent.color,
          category: newEvent.category
        })
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        setEvents(prev => [...prev, data]);
        setIsModalOpen(false);
        // Reset form
        setNewEvent({
          title: '',
          description: '',
          start_date: selectedDate.toISOString().split('T')[0],
          start_time: '09:00',
          end_date: selectedDate.toISOString().split('T')[0],
          end_time: '10:00',
          location: '',
          is_all_day: false,
          color: '#6366f1',
          category: 'general'
        });
      }
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar evento no banco.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Calendar Calculation Helpers
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayIndex = (y: number, m: number) => new Date(y, m, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);
    const firstDayIndex = getFirstDayIndex(year, month);

    const cells: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

    // Prepend previous month's days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      cells.push({ day: d, isCurrentMonth: false, date: new Date(year, month - 1, d) });
    }

    // Current month's days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, isCurrentMonth: true, date: new Date(year, month, d) });
    }

    // Append next month's days
    const totalCells = 42; // standard 6-row grid
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, isCurrentMonth: false, date: new Date(year, month + 1, d) });
    }

    return cells;
  }, [currentCalendarDate]);

  const handlePrevMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  // Get items due/scheduled on a specific day
  const getDayItems = useCallback((date: Date) => {
    const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), date));
    const dayTasks = tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), date));
    const dayReminders = reminders.filter(r => r.due_date && isSameDay(new Date(r.due_date), date));

    return { dayEvents, dayTasks, dayReminders };
  }, [events, tasks, reminders]);

  // Selected Day Items
  const selectedDayData = useMemo(() => {
    return getDayItems(selectedDate);
  }, [selectedDate, getDayItems]);

  // Total balance display
  const totalBalanceString = useMemo(() => {
    const totalObj = balances.find(b => b.type === 'total');
    if (!totalObj) return 'R$ 0,00';
    return (typeof totalObj.amount === 'string' ? parseFloat(totalObj.amount as any) : totalObj.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }, [balances]);

  // Next event details
  const nextEvent = useMemo(() => {
    const now = new Date();
    const futureEvents = events
      .filter(e => new Date(e.start_time) > now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    return futureEvents[0] || null;
  }, [events]);

  // Months labels in pt-BR
  const monthName = currentCalendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  if (loading || !mounted) {
    return (
      <div className="flex-1 min-h-screen flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-100 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="space-y-4 text-center flex flex-col items-center animate-pulse">
          <div className="w-16 h-16 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center text-indigo-400 text-3xl font-black">G</div>
          <div className="h-6 w-48 bg-white/5 rounded-xl border border-white/5 mt-4"></div>
          <div className="h-4 w-32 bg-white/5 rounded-lg border border-white/5 mt-2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans relative overflow-x-hidden antialiased no-scrollbar pb-12">
      {/* Dynamic light bursts in background */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-indigo-500/5 via-purple-500/5 to-transparent pointer-events-none blur-3xl z-0" />
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/10 w-[450px] h-[450px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8 flex-1 flex flex-col">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/20">
              G
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                G-Hub <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 font-bold uppercase tracking-wide">Command Center</span>
              </h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                Olá, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/finance" className="px-4 py-2 border border-white/5 bg-slate-900/50 hover:bg-slate-900 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" /> G-Finance
            </Link>
            <Link href="/tasks" className="px-4 py-2 border border-white/5 bg-slate-900/50 hover:bg-slate-900 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" /> G-Work
            </Link>
            <div className="h-6 w-px bg-white/5" />
            <button 
              onClick={handleLogout}
              className="px-4 py-2 hover:bg-red-500/10 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-red-400 transition-all cursor-pointer"
            >
              Sair
            </button>
          </div>
        </header>

        {/* Quick Stats row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Link href="/finance" className="bg-slate-950/40 border border-white/5 rounded-3xl p-5 backdrop-blur-xl relative overflow-hidden block hover:border-emerald-500/20 hover:bg-slate-950/50 transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/10 group-hover:bg-emerald-500/20 transition-all">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="text-slate-500 group-hover:text-white transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo Líquido</span>
              <h4 className="text-xl font-black text-white mt-1">{totalBalanceString}</h4>
            </div>
          </Link>

          <Link href="/finance/calendar" className="bg-slate-950/40 border border-white/5 rounded-3xl p-5 backdrop-blur-xl relative overflow-hidden block hover:border-orange-500/20 hover:bg-slate-950/50 transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/10 group-hover:bg-orange-500/20 transition-all">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="text-slate-500 group-hover:text-white transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contas Pendentes</span>
              <h4 className="text-xl font-black text-white mt-1">{reminders.length} lançamentos</h4>
            </div>
          </Link>

          <Link href="/tasks" className="bg-slate-950/40 border border-white/5 rounded-3xl p-5 backdrop-blur-xl relative overflow-hidden block hover:border-blue-500/20 hover:bg-slate-950/50 transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/10 group-hover:bg-blue-500/20 transition-all">
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-slate-500 group-hover:text-white transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tarefas Pendentes</span>
              <h4 className="text-xl font-black text-white mt-1">{tasks.length} ativas</h4>
            </div>
          </Link>

          <Link href="/finance/calendar" className="bg-slate-950/40 border border-white/5 rounded-3xl p-5 backdrop-blur-xl relative overflow-hidden block hover:border-indigo-500/20 hover:bg-slate-950/50 transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/10 group-hover:bg-indigo-500/20 transition-all">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div className="text-slate-500 group-hover:text-white transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Próximo Evento</span>
              <h4 className="text-xs font-black text-white truncate mt-1.5" title={nextEvent?.title || 'Sem eventos futuros'}>
                {nextEvent ? nextEvent.title : 'Nenhum agendado'}
              </h4>
              <p className="text-[9px] font-semibold text-indigo-400 uppercase tracking-wider mt-0.5">
                {nextEvent ? new Date(nextEvent.start_time).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Total sintonia'}
              </p>
            </div>
          </Link>
        </section>

        {/* Dashboard Grid (Left Column Widgets, Right Column CoS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Summary widgets and Calendar (8 Cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Unified Calendar Widget */}
            <div className="bg-slate-950/40 border border-white/5 rounded-[40px] p-6 backdrop-blur-xl relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <h3 className="text-md font-black tracking-tight text-white uppercase">Planejamento & Agenda</h3>
                </div>
                <div className="flex items-center gap-3 bg-slate-900/60 p-1.5 border border-white/5 rounded-2xl">
                  <button 
                    onClick={handlePrevMonth}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white px-2 min-w-28 text-center">
                    {monthName}
                  </span>
                  <button 
                    onClick={handleNextMonth}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grid Header (Days of week) */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <span key={day} className="text-[9px] font-black uppercase tracking-wider text-slate-500">{day}</span>
                ))}
              </div>

              {/* Grid Days */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((cell, idx) => {
                  const { dayEvents, dayTasks, dayReminders } = getDayItems(cell.date);
                  const isSelected = isSameDay(cell.date, selectedDate);
                  const isToday = isSameDay(cell.date, new Date());
                  const hasItems = dayEvents.length > 0 || dayTasks.length > 0 || dayReminders.length > 0;

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(cell.date)}
                      className={`aspect-square p-2 border rounded-2xl text-left flex flex-col justify-between transition-all duration-300 relative group cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.08)]' 
                          : cell.isCurrentMonth
                            ? 'bg-slate-900/30 border-white/5 text-slate-200 hover:bg-slate-900/60 hover:border-white/10'
                            : 'bg-slate-950/20 border-white/5/20 text-slate-600 hover:bg-slate-900/10'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={`text-[10px] font-bold ${isToday ? 'bg-indigo-500 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-md shadow-indigo-500/20' : ''}`}>
                          {cell.day}
                        </span>
                      </div>
                      
                      {/* Dots overlay for indicators */}
                      {hasItems && (
                        <div className="flex gap-1 mt-auto">
                          {dayEvents.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                          {dayTasks.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                          {dayReminders.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Agenda Detail Pane */}
              <div className="mt-8 pt-6 border-t border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                      Agenda de {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h4>
                  </div>
                  <button 
                    onClick={() => {
                      setNewEvent(prev => ({
                        ...prev,
                        start_date: selectedDate.toISOString().split('T')[0],
                        end_date: selectedDate.toISOString().split('T')[0]
                      }));
                      setIsModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" /> Novo Compromisso
                  </button>
                </div>

                {/* Day Agenda List */}
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                  {selectedDayData.dayEvents.length === 0 && 
                   selectedDayData.dayTasks.length === 0 && 
                   selectedDayData.dayReminders.length === 0 ? (
                    <div className="text-center py-8 bg-slate-900/10 rounded-2xl border border-dashed border-white/5">
                      <CalendarDays className="w-8 h-8 text-slate-700 mx-auto mb-2 stroke-[1.5]" />
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Nenhum compromisso agendado para este dia</p>
                    </div>
                  ) : (
                    <>
                      {/* Events list */}
                      {selectedDayData.dayEvents.map((ev) => (
                        <div key={ev.id} className="flex justify-between items-center p-3.5 bg-slate-900/40 border border-white/5 rounded-2xl hover:border-white/10 transition-all duration-300 group">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-2.5 h-10 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: ev.color }} />
                            <div className="min-w-0">
                              <h5 className="text-xs font-black text-white tracking-tight">{ev.title}</h5>
                              <p className="text-[10px] text-slate-400 mt-1 leading-normal font-medium">{ev.description || 'Sem descrição'}</p>
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(ev.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(ev.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                {ev.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.location}</span>}
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="p-2 bg-transparent text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all duration-300 opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Deletar evento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {/* Tasks due list */}
                      {selectedDayData.dayTasks.map((tk) => (
                        <div key={tk.id} className="flex justify-between items-center p-3.5 bg-blue-500/5 border border-blue-500/10 rounded-2xl group hover:border-blue-500/25 transition-all duration-300">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => handleToggleTask(tk.id)}
                              className="w-5 h-5 rounded-lg border border-blue-500/20 text-transparent hover:text-blue-400 hover:bg-blue-500/10 flex items-center justify-center transition-all cursor-pointer"
                              title="Marcar como concluída"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <div>
                              <h5 className="text-xs font-black text-white tracking-tight flex items-center gap-2">
                                {tk.title}
                                <span className="text-[8px] px-1.5 py-0.2 bg-blue-500/10 text-blue-400 border border-blue-500/10 font-bold uppercase tracking-wide rounded">Tarefa G-Work</span>
                              </h5>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5">Prazo: Hoje • Prioridade: {tk.priority}</p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Reminders due list */}
                      {selectedDayData.dayReminders.map((rm) => (
                        <div key={rm.id} className="flex justify-between items-center p-3.5 bg-orange-500/5 border border-orange-500/10 rounded-2xl hover:border-orange-500/25 transition-all duration-300">
                          <div>
                            <h5 className="text-xs font-black text-white tracking-tight flex items-center gap-2">
                              {rm.title}
                              <span className="text-[8px] px-1.5 py-0.2 bg-orange-500/10 text-orange-400 border border-orange-500/10 font-bold uppercase tracking-wide rounded">Cobrança G-Finance</span>
                            </h5>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5">
                              Vencimento: Hoje • Valor: {rm.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                          <Link href="/finance/calendar" className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                            Pagar
                          </Link>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions and Widgets split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Active tasks widget */}
              <div className="bg-slate-950/40 border border-white/5 rounded-[40px] p-6 backdrop-blur-xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-black tracking-tight text-white uppercase">G-Work Tarefas</h3>
                  </div>
                  <Link href="/tasks" className="text-slate-500 hover:text-blue-400 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-0.5">
                    Kanban <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                  {tasks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Nenhuma tarefa pendente no momento</p>
                    </div>
                  ) : (
                    tasks.slice(0, 4).map((tk) => (
                      <div key={tk.id} className="flex justify-between items-center p-3 bg-slate-900/30 border border-white/5 rounded-2xl hover:border-white/10 transition-all duration-300">
                        <div className="flex items-center gap-3 min-w-0">
                          <button 
                            onClick={() => handleToggleTask(tk.id)}
                            className="w-4.5 h-4.5 rounded-lg border border-white/15 text-transparent hover:text-blue-400 hover:bg-blue-500/10 flex items-center justify-center transition-all shrink-0 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs text-slate-300 font-medium truncate" title={tk.title}>{tk.title}</span>
                        </div>
                        {tk.priority === 'critical' || tk.priority === 'high' ? (
                          <span className="text-[8px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/10 px-2 py-0.5 rounded-md shrink-0">
                            Alta
                          </span>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Wealth Goals & Cards G-Finance */}
              <div className="bg-slate-950/40 border border-white/5 rounded-[40px] p-6 backdrop-blur-xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2.5">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-black tracking-tight text-white uppercase">G-Finance Cartões</h3>
                  </div>
                  <Link href="/cards" className="text-slate-500 hover:text-emerald-400 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-0.5">
                    Cartões <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {creditCards.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Nenhum cartão cadastrado</p>
                    </div>
                  ) : (
                    creditCards.slice(0, 2).map((card) => {
                      const limit = parseFloat(card.card_limit || 0);
                      const available = parseFloat(card.available_limit || limit);
                      const spent = Math.max(0, limit - available);
                      const percent = limit > 0 ? (spent / limit) * 100 : 0;

                      return (
                        <div key={card.id} className="p-3.5 bg-slate-900/30 border border-white/5 rounded-2xl">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-300">{card.card_name} (•••• {card.last_four})</span>
                            <span className="text-[10px] font-black text-white">{spent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2.5 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">
                            <span>Limite: {limit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            <span>Disponível: {available.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: CoS Assistant integrated Panel (4 Cols) */}
          <div className="lg:col-span-4 h-[680px]">
            <div className="bg-slate-950/40 border border-white/5 rounded-[40px] p-6 backdrop-blur-xl h-full flex flex-col relative overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 mb-4 shrink-0 pb-4 border-b border-white/5">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-black tracking-tight text-white uppercase">CoS Assistant</h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Membro Principal de Assessoria</p>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <AiChatHub isFloating={true} forcedModule="hub" />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* NEW EVENT DIALOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 rounded-[32px] w-full max-w-lg p-6 overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="text-md font-black tracking-tight text-white uppercase mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" /> Agendar Compromisso
            </h3>

            {formError && (
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-wider text-red-400 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Título</label>
                <input 
                  type="text" 
                  value={newEvent.title}
                  onChange={e => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Nome da reunião, tarefa ou evento"
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Descrição</label>
                <textarea 
                  value={newEvent.description}
                  onChange={e => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Adicione detalhes, links ou pautas do evento"
                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none h-16"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Data Início</label>
                  <input 
                    type="date" 
                    value={newEvent.start_date}
                    onChange={e => setNewEvent(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Hora Início</label>
                  <input 
                    type="time" 
                    value={newEvent.start_time}
                    onChange={e => setNewEvent(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Data Fim</label>
                  <input 
                    type="date" 
                    value={newEvent.end_date}
                    onChange={e => setNewEvent(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Hora Fim</label>
                  <input 
                    type="time" 
                    value={newEvent.end_time}
                    onChange={e => setNewEvent(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Localização</label>
                  <input 
                    type="text" 
                    value={newEvent.location}
                    onChange={e => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Local físico ou link (ex: Meet)"
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Categoria</label>
                  <select 
                    value={newEvent.category}
                    onChange={e => setNewEvent(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="general">Geral</option>
                    <option value="work">Trabalho</option>
                    <option value="personal">Pessoal</option>
                    <option value="finance">Financeiro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center pt-2">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="is_all_day"
                    checked={newEvent.is_all_day}
                    onChange={e => setNewEvent(prev => ({ ...prev, is_all_day: e.target.checked }))}
                    className="w-4.5 h-4.5 rounded border-white/10 bg-slate-950 text-indigo-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <label htmlFor="is_all_day" className="text-[10px] font-black uppercase tracking-wider text-slate-300">Dia Inteiro</label>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Seletor de Cor</label>
                  <div className="flex gap-2">
                    {['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewEvent(prev => ({ ...prev, color: c }))}
                        className={`w-5 h-5 rounded-full border transition-all ${newEvent.color === c ? 'border-white scale-110' : 'border-transparent scale-100 hover:scale-105'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-white/5 hover:bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/10 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {formSubmitting ? 'Salvando...' : 'Salvar Compromisso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

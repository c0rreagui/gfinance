'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  HelpCircle,
  AlertCircle,
  Plus,
  Trash2,
  X,
  Calendar,
  Check,
  Edit2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DBCreditCard {
  id: string;
  user_id: string;
  card_name: string;
  last_four: string;
  expiration_date: string;
  card_limit: number;
  spline_url: string | null;
  closing_day: number;
  due_day: number;
  color_theme: string;
  created_at?: string;
}

interface CardTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
}

const themes = {
  emerald: {
    name: 'Esmeralda',
    bg: 'from-[#0b0f19] via-[#09151e] to-[#042d2c]',
    logoBg: 'bg-emerald-500',
    logoText: 'text-white',
    accentText: 'text-emerald-400',
    glow: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
    circles: {
      left: 'bg-emerald-500/20 border-emerald-400/20',
      right: 'bg-emerald-500 border-emerald-400'
    },
    bubble: 'bg-emerald-500 border-emerald-400/50'
  },
  indigo: {
    name: 'Índigo Real',
    bg: 'from-[#0c0d16] via-[#101328] to-[#141544]',
    logoBg: 'bg-indigo-500',
    logoText: 'text-white',
    accentText: 'text-indigo-400',
    glow: 'bg-indigo-500/10 group-hover:bg-indigo-500/20',
    circles: {
      left: 'bg-indigo-500/20 border-indigo-400/20',
      right: 'bg-indigo-500 border-indigo-400'
    },
    bubble: 'bg-indigo-600 border-indigo-400/50'
  },
  rose: {
    name: 'Rosa Sunset',
    bg: 'from-[#0c0c0c] via-[#210915] to-[#420822]',
    logoBg: 'bg-rose-500',
    logoText: 'text-white',
    accentText: 'text-rose-400',
    glow: 'bg-rose-500/10 group-hover:bg-rose-500/20',
    circles: {
      left: 'bg-rose-500/20 border-rose-400/20',
      right: 'bg-rose-500 border-rose-400'
    },
    bubble: 'bg-rose-500 border-rose-400/50'
  },
  amber: {
    name: 'Ouro Nobre',
    bg: 'from-[#0f0e0c] via-[#22140d] to-[#422209]',
    logoBg: 'bg-amber-500',
    logoText: 'text-slate-900',
    accentText: 'text-amber-400',
    glow: 'bg-amber-500/10 group-hover:bg-amber-500/20',
    circles: {
      left: 'bg-amber-500/20 border-amber-400/20',
      right: 'bg-amber-500 border-amber-400'
    },
    bubble: 'bg-amber-500 border-amber-400/50'
  },
  crimson: {
    name: 'Rubi Premium',
    bg: 'from-[#0e0c0c] via-[#230d0d] to-[#4c0606]',
    logoBg: 'bg-red-600',
    logoText: 'text-white',
    accentText: 'text-red-400',
    glow: 'bg-red-500/10 group-hover:bg-red-500/20',
    circles: {
      left: 'bg-red-500/20 border-red-400/20',
      right: 'bg-red-500 border-red-400'
    },
    bubble: 'bg-red-600 border-red-400/50'
  }
};

export default function CardsPage() {
  const [cards, setCards] = useState<DBCreditCard[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
  const [usedLimit, setUsedLimit] = useState(0);

  // Form states for active card inline updates
  const [editName, setEditName] = useState('');
  const [editLastFour, setEditLastFour] = useState('');
  const [editExpiration, setEditExpiration] = useState('');
  const [editClosing, setEditClosing] = useState('');
  const [editDue, setEditDue] = useState('');
  
  // Feedback states
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Create card states (Drawer modal)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLastFour, setNewLastFour] = useState('');
  const [newLimit, setNewLimit] = useState('25000');
  const [newExpiration, setNewExpiration] = useState('12/32');
  const [newClosing, setNewClosing] = useState('4');
  const [newDue, setNewDue] = useState('10');
  const [newTheme, setNewTheme] = useState<string>('emerald');
  const [newError, setNewError] = useState('');
  const [newSuccess, setNewSuccess] = useState('');

  // Profile metadata
  const [ownerName, setOwnerName] = useState('Guilherme C. S. P.');
  const [memberSince, setMemberSince] = useState('2026');

  const activeCard = cards[activeIndex] || null;
  const activeTheme = activeCard ? (themes[activeCard.color_theme as keyof typeof themes] || themes.emerald) : themes.emerald;

  const fetchCardData = async (selectCardId?: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch profile details
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, card_limit')
        .eq('id', user.id)
        .single();

      if (profile?.full_name) {
        setOwnerName(profile.full_name);
      }

      // 2. Fetch credit cards
      let { data: dbCards, error: cardError } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (cardError) throw cardError;

      // Provision fallback if none
      if (!dbCards || dbCards.length === 0) {
        const initialLimit = profile?.card_limit ? Number(profile.card_limit) : 25000;
        const { data: newCard, error: insertError } = await supabase
          .from('credit_cards')
          .insert({
            user_id: user.id,
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

        if (insertError) throw insertError;
        if (newCard) {
          dbCards = [newCard];
        }
      }

      const fetchedCards = dbCards || [];
      setCards(fetchedCards);

      // Select proper card index
      if (selectCardId) {
        const foundIdx = fetchedCards.findIndex(c => c.id === selectCardId);
        if (foundIdx !== -1) setActiveIndex(foundIdx);
      } else if (activeIndex >= fetchedCards.length) {
        setActiveIndex(0);
      }

    } catch (err) {
      console.error('Error fetching card database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCardData();
  }, []);

  // Update inline form fields when activeCard changes
  useEffect(() => {
    if (activeCard) {
      setEditName(activeCard.card_name);
      setEditLastFour(activeCard.last_four);
      setEditExpiration(activeCard.expiration_date);
      setEditClosing(activeCard.closing_day.toString());
      setEditDue(activeCard.due_day.toString());

      if (activeCard.created_at) {
        setMemberSince(new Date(activeCard.created_at).getFullYear().toString());
      } else {
        setMemberSince('2026');
      }

      // Fetch transactions for this card
      const fetchTransactionsForCard = async () => {
        try {
          const { data: txs } = await supabase
            .from('transactions')
            .select('*')
            .eq('card_id', activeCard.id)
            .order('date', { ascending: false })
            .limit(10);
          
          setCardTransactions(txs || []);

          // Calculate used limit
          const { data: allTxs } = await supabase
            .from('transactions')
            .select('amount')
            .eq('card_id', activeCard.id);

          if (allTxs) {
            const sum = allTxs.reduce((acc, t) => acc + Math.abs(t.amount), 0);
            setUsedLimit(sum);
          } else {
            setUsedLimit(0);
          }
        } catch (e) {
          console.error('Error fetching card transactions:', e);
        }
      };

      fetchTransactionsForCard();
    }
  }, [activeCard]);

  // Handle color theme change directly
  const handleColorThemeChange = async (themeKey: string) => {
    if (!activeCard) return;
    playHapticClick();
    
    // Update local UI state immediately
    const updatedCards = [...cards];
    updatedCards[activeIndex].color_theme = themeKey;
    setCards(updatedCards);

    try {
      await supabase
        .from('credit_cards')
        .update({ color_theme: themeKey })
        .eq('id', activeCard.id);
    } catch (e) {
      console.error('Error saving color theme:', e);
    }
  };

  // Handle inline settings save
  const handleSaveActiveCardDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard) return;

    setSaveStatus('saving');
    setFeedbackMsg('');

    const closingNum = parseInt(editClosing, 10);
    const dueNum = parseInt(editDue, 10);

    if (!editName || !editLastFour || !editExpiration || !editClosing || !editDue) {
      setSaveStatus('error');
      setFeedbackMsg('Preencha todos os campos obrigatórios.');
      return;
    }
    if (isNaN(closingNum) || closingNum < 1 || closingNum > 31) {
      setSaveStatus('error');
      setFeedbackMsg('Dia de fechamento deve ser entre 1 e 31.');
      return;
    }
    if (isNaN(dueNum) || dueNum < 1 || dueNum > 31) {
      setSaveStatus('error');
      setFeedbackMsg('Dia de vencimento deve ser entre 1 e 31.');
      return;
    }

    try {
      const { error } = await supabase
        .from('credit_cards')
        .update({
          card_name: editName,
          last_four: editLastFour,
          expiration_date: editExpiration,
          closing_day: closingNum,
          due_day: dueNum
        })
        .eq('id', activeCard.id);

      if (error) throw error;

      setSaveStatus('success');
      setFeedbackMsg('Cartão atualizado com sucesso!');
      
      // Reload cards list to keep state fresh
      fetchCardData(activeCard.id);
      
      setTimeout(() => {
        setSaveStatus('idle');
        setFeedbackMsg('');
      }, 2000);

    } catch (err: any) {
      setSaveStatus('error');
      setFeedbackMsg(err.message || 'Erro ao atualizar dados.');
    }
  };

  // Limit slider change handler
  const handleLimitChange = async (newLimit: number) => {
    if (!activeCard) return;
    
    const updatedCards = [...cards];
    updatedCards[activeIndex].card_limit = newLimit;
    setCards(updatedCards);

    try {
      await supabase
        .from('credit_cards')
        .update({ card_limit: newLimit })
        .eq('id', activeCard.id);
    } catch (e) {
      console.error('Erro ao salvar novo limite:', e);
    }
  };

  // Create new card handler
  const handleCreateNewCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewError('');
    setNewSuccess('');

    if (!newName || !newLastFour || !newExpiration || !newClosing || !newDue) {
      setNewError('Preencha todos os campos obrigatórios.');
      return;
    }

    const limitNum = parseFloat(newLimit);
    const closingNum = parseInt(newClosing, 10);
    const dueNum = parseInt(newDue, 10);

    if (isNaN(limitNum) || limitNum <= 0) {
      setNewError('O limite deve ser positivo.');
      return;
    }
    if (isNaN(closingNum) || closingNum < 1 || closingNum > 31) {
      setNewError('Fechamento inválido (1-31).');
      return;
    }
    if (isNaN(dueNum) || dueNum < 1 || dueNum > 31) {
      setNewError('Vencimento inválido (1-31).');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newCard, error } = await supabase
        .from('credit_cards')
        .insert({
          user_id: user.id,
          card_name: newName,
          last_four: newLastFour,
          expiration_date: newExpiration,
          card_limit: limitNum,
          closing_day: closingNum,
          due_day: dueNum,
          color_theme: newTheme,
          spline_url: 'https://prod.spline.design/1e9d1552-3443-485d-a066-e46604b8db02/scene.splinecode'
        })
        .select()
        .single();

      if (error) throw error;

      setNewSuccess('Cartão adicionado com sucesso!');
      setTimeout(() => {
        setIsCreateOpen(false);
        fetchCardData(newCard?.id);
      }, 1000);

    } catch (err: any) {
      setNewError(err.message || 'Erro ao criar cartão.');
    }
  };

  // Delete card handler
  const handleDeleteActiveCard = async () => {
    if (!activeCard) return;
    if (!window.confirm(`Excluir definitivamente o cartão "${activeCard.card_name}"?`)) return;

    try {
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', activeCard.id);

      if (error) throw error;

      const nextIdx = activeIndex > 0 ? activeIndex - 1 : 0;
      setActiveIndex(nextIdx);
      fetchCardData();
    } catch (err: any) {
      alert(err.message || 'Erro ao deletar cartão.');
    }
  };

  // Synthetic snap click sound
  const playHapticClick = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc1 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1500, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc1.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.03);
    } catch {}
  };

  const cardLimit = activeCard ? activeCard.card_limit : 25000;
  const availableLimit = cardLimit - usedLimit;
  const limitPercentage = cardLimit > 0 ? (usedLimit / cardLimit) * 100 : 0;

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-950 text-slate-100 h-full no-scrollbar relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(255,255,255,0))] pointer-events-none z-0"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 animate-in">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-white/5">
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
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
          </div>
        ) : !activeCard ? (
          <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-12 text-center text-slate-500 space-y-4">
            <AlertCircle className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-sm font-bold uppercase tracking-wider">Nenhum cartão cadastrado</p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all cursor-pointer"
            >
              Cadastrar Meu Primeiro Cartão
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Visual Card, Limit, Theme & Config */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Premium Gradual Credit Card Layout */}
              <div 
                className={`w-full max-w-md mx-auto aspect-[1.586/1] bg-gradient-to-br ${activeTheme.bg} rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden group hover:scale-[1.01] transition-all duration-500`}
              >
                {/* Glass reflex overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0)_60%)] pointer-events-none"></div>
                {/* Glowing decorative sphere */}
                <div className={`absolute right-[-10%] top-[-20%] w-48 h-48 rounded-full blur-3xl transition-all duration-500 ${activeTheme.glow}`}></div>

                <div className="h-full flex flex-col justify-between relative z-10">
                  {/* Brand & Chip */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 ${activeTheme.logoBg} rounded-lg flex items-center justify-center ${activeTheme.logoText} font-black text-sm`}>
                          G
                        </div>
                        <span className="font-black text-sm tracking-tight text-white uppercase">{activeCard.card_name}</span>
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
                        •••• •••• •••• {activeCard.last_four}
                      </p>
                    </div>
                    <div className="flex gap-6 mt-4">
                      <div>
                        <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Validade</p>
                        <p className="text-[10px] font-bold text-slate-300 mt-0.5">{activeCard.expiration_date}</p>
                      </div>
                      <div>
                        <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Membro Desde</p>
                        <p className="text-[10px] font-bold text-slate-300 mt-0.5">{memberSince}</p>
                      </div>
                    </div>
                  </div>

                  {/* Owner Name & Logo */}
                  <div className="flex justify-between items-end border-t border-white/5 pt-4">
                    <div>
                      <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Titular</p>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-100 mt-0.5">{ownerName}</p>
                    </div>
                    <div className="flex -space-x-2">
                      <div className={`w-6 h-6 rounded-full backdrop-blur-sm border ${activeTheme.circles.left}`}></div>
                      <div className={`w-6 h-6 rounded-full border ${activeTheme.circles.right}`}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Theme Color Picker */}
              <div className="glass bg-slate-900/40 rounded-[28px] border border-white/5 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Aparência do Cartão</h3>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Selecione uma variação degradê</p>
                </div>
                <div className="flex items-center gap-3">
                  {Object.entries(themes).map(([themeKey, t]) => (
                    <button
                      key={themeKey}
                      onClick={() => handleColorThemeChange(themeKey)}
                      className={`w-6 h-6 rounded-full ${t.bubble} border-2 hover:scale-110 transition-all cursor-pointer relative ${
                        activeCard.color_theme === themeKey ? 'ring-2 ring-white/40 scale-105' : ''
                      }`}
                      title={t.name}
                    >
                      {activeCard.color_theme === themeKey && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider for limits */}
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-black uppercase tracking-wider">Ajuste de Limite Flex</h2>
                  <span className={`px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 ${activeTheme.accentText} text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1.5 animate-pulse`}>
                    <ShieldCheck className="w-3.5 h-3.5" /> Sob Medida
                  </span>
                </div>

                {/* Limit stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fatura Acumulada</p>
                    <p className="text-lg font-black mt-1 text-slate-200">
                      {usedLimit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Limite Disponível</p>
                    <p className={`text-lg font-black mt-1 ${activeTheme.accentText}`}>
                      {availableLimit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/5">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, limitPercentage)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                    <span>{limitPercentage.toFixed(1)}% do limite de R$ {cardLimit.toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                {/* slider control */}
                <div className="space-y-3 border-t border-white/5 pt-6">
                  <input 
                    type="range" 
                    min="1000" 
                    max="100000" 
                    step="1000"
                    value={cardLimit}
                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                    <span>Min: R$ 1.000</span>
                    <span className={`${activeTheme.accentText} font-black`}>R$ {cardLimit.toLocaleString('pt-BR')}</span>
                    <span>Máx: R$ 100.000</span>
                  </div>
                </div>
              </div>

              {/* Inline Direct Card Settings Panel (Full autonomy) */}
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-black uppercase tracking-wider">Ajustes & Informações</h3>
                  </div>
                  <button
                    onClick={handleDeleteActiveCard}
                    className="p-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 text-[10px] font-black rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Excluir Cartão
                  </button>
                </div>

                {feedbackMsg && (
                  <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 border ${
                    saveStatus === 'success' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {saveStatus === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{feedbackMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSaveActiveCardDetails} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome do Cartão</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Final do Cartão (4 dígitos)</label>
                      <input
                        type="text"
                        maxLength={4}
                        required
                        value={editLastFour}
                        onChange={(e) => setEditLastFour(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-center"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Validade (MM/AA)</label>
                      <input
                        type="text"
                        maxLength={5}
                        required
                        value={editExpiration}
                        onChange={(e) => setEditExpiration(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Fechamento (Dia)</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        required
                        value={editClosing}
                        onChange={(e) => setEditClosing(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Vencimento (Dia)</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        required
                        value={editDue}
                        onChange={(e) => setEditDue(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-center"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={saveStatus === 'saving'}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer text-center"
                    >
                      {saveStatus === 'saving' ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </form>
              </div>

            </div>

            {/* Right Column: Physical Wallet Stack & Purchases */}
            <div className="lg:col-span-5 space-y-8">
              
              {/* Stacked Wallet Visual Section */}
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 flex flex-col space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider">Minha Carteira</h2>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Selecione ou adicione cartões</p>
                  </div>
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>

                {/* Stacked overlapping visual cards list */}
                <div className="relative pt-6 pb-2 select-none">
                  {cards.map((c, idx) => {
                    const theme = themes[c.color_theme as keyof typeof themes] || themes.emerald;
                    const isActive = idx === activeIndex;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          playHapticClick();
                          setActiveIndex(idx);
                        }}
                        className={`w-full aspect-[1.586/1] bg-gradient-to-br ${theme.bg} rounded-2xl p-5 border shadow-xl relative overflow-hidden transition-all duration-500 cursor-pointer hover:-translate-y-2 ${
                          idx > 0 ? '-mt-24' : ''
                        } ${
                          isActive 
                            ? 'border-emerald-500 shadow-emerald-500/5 ring-1 ring-emerald-500/20 z-30 scale-[1.02] translate-x-2' 
                            : 'border-white/5 hover:border-white/20 opacity-90 z-10 hover:z-20'
                        }`}
                        style={{
                          transform: isActive ? 'translateX(8px) scale(1.02)' : 'none'
                        }}
                      >
                        <div className="h-full flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-black text-white uppercase tracking-wider">{c.card_name}</span>
                            <div className={`w-3.5 h-3.5 rounded-full ${theme.logoBg}`}></div>
                          </div>
                          <p className="font-mono text-xs text-white tracking-widest mt-4">
                            •••• •••• •••• {c.last_four}
                          </p>
                          <div className="flex justify-between items-end border-t border-white/5 pt-2 mt-2">
                            <span className="text-[7px] text-slate-400 font-mono">VAL: {c.expiration_date}</span>
                            <div className="flex -space-x-1">
                              <div className={`w-4 h-4 rounded-full ${theme.circles.left}`}></div>
                              <div className={`w-4 h-4 rounded-full ${theme.circles.right}`}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Purchases List */}
              <div className="glass bg-slate-900/40 rounded-[32px] border border-white/5 p-8 flex flex-col overflow-hidden min-h-[300px]">
                <div className="flex justify-between items-center mb-6 shrink-0">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider">Últimos Lançamentos</h2>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Filtrado pelo cartão selecionado</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 max-h-[320px] pr-1">
                  {cardTransactions.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 space-y-4 flex flex-col items-center justify-center">
                      <AlertCircle className="w-10 h-10 text-slate-700 stroke-[1.5]" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma compra</p>
                      <p className="text-[9px] text-slate-500 max-w-[200px] leading-relaxed">
                        Despesas na categoria "Cartão" associadas a este cartão aparecerão aqui.
                      </p>
                    </div>
                  ) : (
                    cardTransactions.map((tx) => (
                      <div 
                        key={tx.id} 
                        className="flex justify-between items-center p-3.5 bg-slate-950/40 border border-white/5 rounded-2xl hover:border-white/10 transition-colors"
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
        )}
      </div>

      {/* Drawer for creating a card */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border-l border-white/10 h-full p-8 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider">Novo Cartão</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Adicione um novo cartão de crédito à sua carteira</p>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {newError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{newError}</span>
                </div>
              )}

              {newSuccess && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{newSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateNewCard} className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome do Cartão</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: G-Platinum, Itaú"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Final do Cartão (4 dígitos)</label>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      placeholder="Ex: 1234"
                      value={newLastFour}
                      onChange={(e) => setNewLastFour(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Validade</label>
                    <input
                      type="text"
                      maxLength={5}
                      required
                      placeholder="Ex: 05/31"
                      value={newExpiration}
                      onChange={(e) => setNewExpiration(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white font-mono text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Limite (R$)</label>
                    <input
                      type="number"
                      required
                      placeholder="Ex: 15000"
                      value={newLimit}
                      onChange={(e) => setNewLimit(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Fechamento</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      placeholder="Ex: 4"
                      value={newClosing}
                      onChange={(e) => setNewClosing(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Vencimento</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      placeholder="Ex: 10"
                      value={newDue}
                      onChange={(e) => setNewDue(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Estilo / Variação Degradê</label>
                  <select
                    value={newTheme}
                    onChange={(e) => setNewTheme(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-white"
                  >
                    <option value="emerald">Esmeralda (Padrão)</option>
                    <option value="indigo">Índigo Real</option>
                    <option value="rose">Rosa Sunset</option>
                    <option value="amber">Ouro Nobre</option>
                    <option value="crimson">Rubi Premium</option>
                  </select>
                </div>

                <div className="pt-6 border-t border-white/5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="flex-1 py-3.5 border border-white/5 hover:bg-white/5 text-slate-300 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-500/25 transition-all cursor-pointer text-center"
                  >
                    Cadastrar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

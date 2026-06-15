/**
 * src/app/components/AiChatHub.tsx
 *
 * Painel conversacional inteligente e premium — G-Finance (CFO) e G-Work (CPO).
 * Detecta o módulo automaticamente pelo pathname:
 * - Rotas /tasks/* → CPO Assistant (azul, foco em produto e tarefas)
 * - Outras rotas   → CFO Assistant (verde, foco financeiro)
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  AlertCircle,
  ArrowRight,
  History,
  ListTodo,
  FolderOpen,
  TrendingUp,
  Wallet,
  Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';

type AppModule = 'finance' | 'work';

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const formatMessageText = (text: string): string => {
  if (!text) return '';
  return text.replace(/\*\*/g, '');
};

// Configuração visual por módulo
const MODULE_CONFIG = {
  finance: {
    label: 'CFO Assistant',
    subtitle: 'Analista Financeiro Pessoal',
    thinkingText: 'Analisando seus dados financeiros...',
    emptyTitle: 'Como posso ajudar suas finanças hoje?',
    emptySubtitle: 'Tenho acesso seguro aos seus saldos, despesas, faturas e metas recentes.',
    placeholder: 'Pergunte sobre seus saldos ou gastos...',
    accentColor: 'emerald',
    suggestions: [
      { text: 'Qual é o meu saldo total?', icon: Wallet },
      { text: 'Resuma meus gastos recentes', icon: TrendingUp },
      { text: 'Como atingir minhas metas?', icon: Sparkles },
      { text: 'Sugira dicas de economia', icon: ArrowRight }
    ],
    // Tailwind classes por módulo
    fabGlow: 'from-emerald-500 to-teal-500',
    border: 'border-emerald-500/20',
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-400',
    iconBorder: 'border-emerald-500/10',
    activeDot: 'bg-emerald-400',
    historyIcon: 'text-emerald-400',
    sessionActive: 'border-emerald-500/25',
    sessionHover: 'group-hover/item:text-emerald-400',
    btnPrimary: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
    glowBar: 'from-orange-500 via-amber-400 to-emerald-500',
    sendBtn: 'from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/10',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10',
  },
  work: {
    label: 'CPO Assistant',
    subtitle: 'Chief Product Officer Virtual',
    thinkingText: 'Analisando seus projetos e tarefas...',
    emptyTitle: 'Como posso ajudar seu trabalho hoje?',
    emptySubtitle: 'Posso criar, atualizar e organizar suas tarefas, projetos e insights do G-Work.',
    placeholder: 'Pergunte sobre tarefas, projetos ou peça ações...',
    accentColor: 'blue',
    suggestions: [
      { text: 'Quais tarefas estão em aberto?', icon: ListTodo },
      { text: 'Crie uma tarefa com prioridade alta', icon: Sparkles },
      { text: 'Quais são meus projetos?', icon: FolderOpen },
      { text: 'Mostre o que está em progresso', icon: ArrowRight }
    ],
    fabGlow: 'from-blue-500 to-indigo-500',
    border: 'border-blue-500/20',
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-400',
    iconBorder: 'border-blue-500/10',
    activeDot: 'bg-blue-400',
    historyIcon: 'text-blue-400',
    sessionActive: 'border-blue-500/25',
    sessionHover: 'group-hover/item:text-blue-400',
    btnPrimary: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20',
    glowBar: 'from-blue-500 via-indigo-400 to-violet-500',
    sendBtn: 'from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-blue-500/10',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/10',
  }
};

export function AiChatHub({ isFloating = false }: { isFloating?: boolean }) {
  const pathname = usePathname();
  const module: AppModule = pathname?.startsWith('/tasks') ? 'work' : 'finance';
  const cfg = MODULE_CONFIG[module];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [input]);

  // Auto-scroll apenas dentro do container do chat
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Resetar estado quando o módulo mudar (troca de rota)
  useEffect(() => {
    setMessages([]);
    setActiveSessionId(null);
    setChatSessions([]);
    setErrorMsg('');
    setShowHistoryDropdown(false);
    loadLatestSession(module);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module]);

  const loadLatestSession = async (currentModule: AppModule) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/ai/sessions?module=${currentModule}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const sessions = data.sessions || [];
        setChatSessions(sessions);

        if (sessions.length > 0) {
          const latestSession = sessions[0];
          setActiveSessionId(latestSession.id);

          const msgsResponse = await fetch(`/api/ai/sessions/${latestSession.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (msgsResponse.ok) {
            const msgsData = await msgsResponse.json();
            const formatted = (msgsData.messages || []).map((m: any) => ({
              role: m.role,
              parts: [{ text: m.content }]
            }));
            setMessages(formatted);
          }
        }
      }
    } catch (err: any) {
      console.error(`[AiChatHub] Erro ao carregar sessão (${currentModule}):`, err);
    } finally {
      setLoading(false);
    }
  };

  // Enviar mensagem
  const handleSendMessage = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    setErrorMsg('');
    setInput('');
    setLoading(true);

    const userMessage: ChatMessage = {
      role: 'user',
      parts: [{ text: queryText }]
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseToken = session?.access_token || null;
      const providerToken = session?.provider_token || null;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(supabaseToken ? { 'Authorization': `Bearer ${supabaseToken}` } : {}),
          ...(providerToken ? { 'x-provider-token': providerToken } : {})
        },
        body: JSON.stringify({
          message: queryText,
          sessionId: activeSessionId,
          module
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao obter resposta da Inteligência Artificial.');
      }

      if (data.sessionId && data.sessionId !== activeSessionId) {
        setActiveSessionId(data.sessionId);
      }

      // Recarregar sessões (módulo correto)
      if (supabaseToken) {
        const responseSessions = await fetch(`/api/ai/sessions?module=${module}`, {
          headers: { 'Authorization': `Bearer ${supabaseToken}` }
        });
        if (responseSessions.ok) {
          const sessionsData = await responseSessions.json();
          setChatSessions(sessionsData.sessions || []);
        }
      }

      const modelResponse: ChatMessage = {
        role: 'model',
        parts: [{ text: data.response }]
      };

      setMessages(prev => [...prev, modelResponse]);

    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de rede ou cota esgotada. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = async (sid: string) => {
    setActiveSessionId(sid);
    setShowHistoryDropdown(false);
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const msgsResponse = await fetch(`/api/ai/sessions/${sid}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (msgsResponse.ok) {
        const msgsData = await msgsResponse.json();
        const formatted = (msgsData.messages || []).map((m: any) => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));
        setMessages(formatted);
      } else {
        setErrorMsg('Falha ao carregar histórico da conversa selecionada.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro de conexão ao carregar conversa.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = () => {
    setActiveSessionId(null);
    setMessages([]);
    setShowHistoryDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  return (
    <div className={isFloating
      ? "flex flex-col h-full w-full bg-transparent relative"
      : "bg-slate-900/40 backdrop-blur-xl rounded-[40px] border border-white/5 shadow-2xl flex flex-col h-[520px] overflow-hidden relative group hover:border-white/10 transition-all duration-500"
    }>

      {/* Dropdown de Histórico de Conversas */}
      {showHistoryDropdown && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-40 p-6 flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <History className={`w-4 h-4 ${cfg.historyIcon}`} />
              <h5 className="text-[10px] font-black text-white tracking-widest uppercase">Histórico de Sessões</h5>
            </div>
            <button
              onClick={() => setShowHistoryDropdown(false)}
              className="text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-wider cursor-pointer"
            >
              Fechar
            </button>
          </div>

          <button
            onClick={handleNewSession}
            className={`w-full p-3.5 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${cfg.btnPrimary}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Nova Conversa
          </button>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
            {chatSessions.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center p-4">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              chatSessions.map((session) => {
                const isActive = session.id === activeSessionId;
                return (
                  <div
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-300 flex justify-between items-center group/item ${
                      isActive
                        ? `bg-slate-900 ${cfg.sessionActive} shadow-lg`
                        : 'bg-slate-900/40 border-white/5 hover:bg-slate-900/80 hover:border-white/10'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className={`text-[11px] font-bold text-slate-200 truncate transition-colors ${cfg.sessionHover}`}>
                        {session.title}
                      </div>
                      <div className="text-[8px] text-slate-600 font-black uppercase tracking-widest mt-1 flex items-center gap-1.5">
                        <span>ID: {session.id.substring(0, 8)}...</span>
                        <span>•</span>
                        <span>{new Date(session.updated_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    {isActive && (
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.activeDot} shadow-[0_0_8px_rgba(99,102,241,0.5)]`}></span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Glow Superior ao Pensar */}
      <div className={`absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r ${cfg.glowBar} blur-[2px] transition-opacity duration-500 ${loading ? 'opacity-100 animate-pulse' : 'opacity-0'}`}></div>

      {/* Header */}
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-950/20">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-2xl flex items-center justify-center transition-all duration-500 ${
            loading
              ? `bg-gradient-to-tr ${cfg.glowBar} text-white rotate-180 animate-spin-slow`
              : `${cfg.iconBg} ${cfg.iconText} border ${cfg.iconBorder}`
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white tracking-wider flex items-center gap-1.5">
              {cfg.label}
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase border ${cfg.badge}`}>
                Active
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{cfg.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowHistoryDropdown(prev => !prev)}
            className={`p-2 rounded-xl transition-all duration-300 flex items-center justify-center border cursor-pointer ${
              showHistoryDropdown
                ? `${cfg.iconBg} ${cfg.iconText} ${cfg.border}`
                : 'bg-white/5 text-slate-500 hover:text-slate-300 border-transparent hover:bg-white/10'
            }`}
            title="Histórico de Sessões"
          >
            <History className="w-3.5 h-3.5" />
          </button>

          {messages.length > 0 && (
            <button
              onClick={handleNewSession}
              className="p-2 bg-white/5 hover:bg-white/10 border border-transparent text-slate-500 hover:text-slate-300 rounded-xl transition-colors cursor-pointer text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
              title="Nova Sessão"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Sessão
            </button>
          )}
        </div>
      </div>

      {/* Área de Mensagens */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center space-y-6 animate-in">
            <div className={`w-14 h-14 rounded-full bg-slate-950/60 border border-white/5 flex items-center justify-center ${cfg.iconText} shadow-inner`}>
              <Bot className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-1.5 max-w-xs">
              <h5 className="text-xs font-black text-slate-200">{cfg.emptyTitle}</h5>
              <p className="text-[10px] text-slate-500 leading-normal">{cfg.emptySubtitle}</p>
            </div>

            {/* Sugestões Rápidas */}
            <div className="grid grid-cols-2 gap-2.5 w-full pt-4">
              {cfg.suggestions.map((sug, i) => {
                const Icon = sug.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(sug.text)}
                    className="p-3 bg-slate-950/40 hover:bg-slate-950/80 border border-white/5 rounded-2xl text-[10px] font-bold text-slate-400 hover:text-white transition-all text-left flex justify-between items-center group/btn active:scale-98 cursor-pointer"
                  >
                    <span className="truncate mr-1">{sug.text}</span>
                    <Icon className={`w-3 h-3 text-slate-600 group-hover/btn:${cfg.iconText} group-hover/btn:translate-x-0.5 transition-all shrink-0`} />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={i}
                  className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    isUser
                      ? 'bg-slate-950 text-slate-300 border-white/5 shadow-inner'
                      : `${cfg.iconBg} ${cfg.iconText} ${cfg.iconBorder} shadow-lg`
                  }`}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`p-4 rounded-3xl text-[11px] leading-relaxed space-y-1.5 shadow-sm transition-all duration-300 ${
                    isUser
                      ? 'bg-gradient-to-tr from-slate-900 to-slate-950 text-slate-200 border border-white/5 rounded-tr-none'
                      : 'bg-slate-950/60 text-slate-300 border border-white/5 rounded-tl-none font-medium'
                  }`}>
                    <div className="whitespace-pre-line text-slate-300">
                      {formatMessageText(msg.parts[0].text)}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Spinner de Pensamento */}
            {loading && (
              <div className="flex gap-3 max-w-[80%]">
                <div className={`w-8 h-8 rounded-xl ${cfg.iconBg} ${cfg.iconText} border ${cfg.iconBorder} flex items-center justify-center shrink-0 animate-spin-slow`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="p-4 bg-slate-950/40 text-slate-500 border border-white/5 rounded-3xl rounded-tl-none text-[10px] font-bold uppercase tracking-wider flex items-center gap-2.5 animate-pulse">
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.activeDot} animate-ping`}></span>
                  {cfg.thinkingText}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input de Mensagem */}
      <div className="p-6 border-t border-white/5 bg-slate-950/30">
        {errorMsg && (
          <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-wider text-red-400 mb-3 shadow-inner">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="truncate">{errorMsg}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <div className="flex-1 min-w-0 bg-slate-950/80 border border-white/5 rounded-2xl px-4 py-3 flex items-center shadow-inner group/input focus-within:border-white/10 transition-all duration-300">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder={loading ? 'Analisando...' : cfg.placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="w-full bg-transparent text-xs text-slate-300 focus:outline-none placeholder-slate-600 disabled:opacity-40 resize-none max-h-32 py-0.5 overflow-y-auto no-scrollbar"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className={`h-[46px] px-4 bg-gradient-to-r ${cfg.sendBtn} text-white rounded-2xl transition-all duration-300 shadow-lg flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}

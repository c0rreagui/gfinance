/**
 * src/app/components/AiChatHub.tsx
 *
 * Painel conversacional inteligente e premium (Gemini AI Brain).
 * Apresenta estética dark-first, glassmorphism, micro-animações,
 * atalhos inteligentes e estado orbital de "pensando".
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  RefreshCw, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Wallet,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export function AiChatHub() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sugestões inteligentes e refinadas de perguntas
  const suggestions = [
    'Qual é o meu saldo total?',
    'Resuma meus gastos recentes',
    'Como atingir minhas metas?',
    'Sugira dicas de economia'
  ];

  // Auto-scroll para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

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

    // Atualiza a lista local com o input do usuário
    setMessages(prev => [...prev, userMessage]);

    try {
      // Pega a sessão ativa client-side para extrair o provider_token e access_token do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const providerToken = session?.provider_token;
      const supabaseToken = session?.access_token;

      // Formata histórico para enviar ao backend
      const historyPayload = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.parts[0].text }]
      }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(supabaseToken ? { 'Authorization': `Bearer ${supabaseToken}` } : {}),
          ...(providerToken ? { 'x-provider-token': providerToken } : {})
        },
        body: JSON.stringify({
          message: queryText,
          history: historyPayload
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao obter resposta da Inteligência Artificial.');
      }

      const modelResponse: ChatMessage = {
        role: 'model',
        parts: [{ text: data.response }]
      };

      setMessages(prev => [...prev, modelResponse]);

    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de rede ou cota esgotada. Tente novamente.');
      // Mantém a última mensagem enviada para que o usuário possa ver o que digitou e ver o erro contextualizado
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  const handleClearChat = () => {
    setMessages([]);
    setErrorMsg('');
    setLoading(false);
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl rounded-[40px] border border-white/5 shadow-2xl flex flex-col h-[520px] overflow-hidden relative group hover:border-emerald-500/10 transition-all duration-500">
      
      {/* Glow Superior Ativo ao Pensar */}
      <div className={`absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500 blur-[2px] transition-opacity duration-500 ${loading ? 'opacity-100 animate-pulse' : 'opacity-0'}`}></div>

      {/* Header */}
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-950/20">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-2xl flex items-center justify-center transition-all duration-500 ${
            loading 
              ? 'bg-gradient-to-tr from-orange-500 via-amber-500 to-emerald-500 text-white rotate-180 animate-spin-slow' 
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white tracking-wider flex items-center gap-1.5">
              Gemini Brain <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-black tracking-widest uppercase border border-emerald-500/10">Active</span>
            </h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Analista Pessoal e Predictor</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="p-2 hover:bg-white/5 text-slate-500 hover:text-slate-300 rounded-xl transition-colors cursor-pointer text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
            title="Limpar Conversa"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Histórico / Área Central */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center space-y-6 animate-in">
            <div className="w-14 h-14 rounded-full bg-slate-950/60 border border-white/5 flex items-center justify-center text-emerald-500 shadow-inner group-hover:scale-105 transition-transform duration-300">
              <Bot className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-1.5 max-w-xs">
              <h5 className="text-xs font-black text-slate-200">Como posso ajudar suas finanças hoje?</h5>
              <p className="text-[10px] text-slate-500 leading-normal">
                Tenho acesso seguro aos seus saldos, despesas, faturas e metas recentes para te dar análises reais.
              </p>
            </div>

            {/* Sugestões Rápidas */}
            <div className="grid grid-cols-2 gap-2.5 w-full pt-4">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(sug)}
                  className="p-3 bg-slate-950/40 hover:bg-slate-950/80 border border-white/5 rounded-2xl text-[10px] font-bold text-slate-400 hover:text-white transition-all text-left flex justify-between items-center group/btn active:scale-98 cursor-pointer"
                >
                  <span className="truncate mr-1">{sug}</span>
                  <ArrowRight className="w-3 h-3 text-slate-600 group-hover/btn:text-emerald-400 group-hover/btn:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
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
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10 shadow-lg shadow-emerald-500/2'
                  }`}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`p-4 rounded-3xl text-[11px] leading-relaxed space-y-1.5 shadow-sm transition-all duration-300 ${
                    isUser 
                      ? 'bg-gradient-to-tr from-slate-900 to-slate-950 text-slate-200 border border-white/5 rounded-tr-none' 
                      : 'bg-slate-950/60 text-slate-300 border border-white/5 rounded-tl-none font-medium'
                  }`}>
                    {/* Renderiza quebras de linha básicas no Markdown simplificado */}
                    <div className="whitespace-pre-line text-slate-300">
                      {msg.parts[0].text}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Spinner Orbital de Pensamento */}
            {loading && (
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 flex items-center justify-center shrink-0 animate-spin-slow">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="p-4 bg-slate-950/40 text-slate-500 border border-white/5 rounded-3xl rounded-tl-none text-[10px] font-bold uppercase tracking-wider flex items-center gap-2.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Gemini Brain está analisando suas contas...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
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
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 min-w-0 bg-slate-950/80 border border-white/5 rounded-2xl px-4 py-3 flex items-center shadow-inner group/input focus-within:border-emerald-500/30 transition-all duration-300">
            <input
              type="text"
              placeholder={loading ? 'Analisando dados...' : 'Pergunte sobre seus saldos ou gastos...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="w-full bg-transparent text-xs text-slate-300 focus:outline-none placeholder-slate-600 disabled:opacity-40"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className={`px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl transition-all duration-300 shadow-lg shadow-orange-500/10 flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* CSS extra para animação lenta */}
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

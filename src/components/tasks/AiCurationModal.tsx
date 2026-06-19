import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Check, Brain, Calendar, Users, FileText, ChevronRight, Layers, MessageSquare, Send, Loader2 } from 'lucide-react';
import { TypeBadge, PriorityBadge } from './Badges';
import { WorkItemType, WorkItemPriority } from '@/types/gwork';

interface HierarchicalItem {
  title: string;
  description: string | null;
  type: WorkItemType;
  priority: WorkItemPriority;
  daysFromNow: number;
  children?: HierarchicalItem[];
}

interface ExtractionResult {
  summary: string;
  key_decisions: string[];
  mentioned_people: string[];
  mentioned_dates: { label: string; daysFromNow: number }[];
  insights: { insight_type: string; title: string; body: string; severity: string }[];
  work_items: HierarchicalItem[];
  extracted_memories?: string[];
  chat_history?: { role: 'user' | 'model'; content: string }[];
}

interface AiCurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  transcriptionId: string;
  result: ExtractionResult | null;
  processedAt: string | null;
  onApprove: () => Promise<void>;
}

// Tree view renderer for the generated work items
const WorkItemTreeNode: React.FC<{ item: HierarchicalItem; depth: number }> = ({ item, depth }) => {
  return (
    <div className="flex flex-col">
      <div 
        className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-100/50 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/5 transition-all duration-200"
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-60 flex-shrink-0" />
        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
          <TypeBadge value={item.type} showIcon={false} className="scale-90" />
          <PriorityBadge value={item.priority} showIcon={false} className="scale-90" />
          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{item.title}</span>
        </div>
        {item.daysFromNow !== undefined && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold flex-shrink-0">
            {item.daysFromNow === 0 ? 'Hoje' : item.daysFromNow === 1 ? 'Amanhã' : `Prazo: ${item.daysFromNow} dias`}
          </span>
        )}
      </div>
      {item.children && item.children.map((child, i) => (
        <WorkItemTreeNode key={i} item={child} depth={depth + 1} />
      ))}
    </div>
  );
};

export const AiCurationModal: React.FC<AiCurationModalProps> = ({
  isOpen,
  onClose,
  fileName,
  transcriptionId,
  result,
  processedAt,
  onApprove
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'insights' | 'memories'>('overview');
  const [memories, setMemories] = useState<{ content: string; checked: boolean }[]>([]);
  const [currentResult, setCurrentResult] = useState<ExtractionResult | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refinementSuccess, setRefinementSuccess] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
  const isReadOnly = !!processedAt;

  // Auto-resize textarea height based on content
  useEffect(() => {
    const textarea = chatTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [chatInput]);


  useEffect(() => {
    if (isOpen && result) {
      setActiveTab('overview');
      setCurrentResult(result);
      if (result.extracted_memories) {
        setMemories(result.extracted_memories.map(m => ({ content: m, checked: true })));
      } else {
        setMemories([]);
      }
    }
  }, [isOpen, result]);

  // Auto-scroll chat history to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentResult?.chat_history, chatLoading]);

  if (!isOpen || !currentResult) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat(e as any);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || isReadOnly) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    try {
      // Optimistically add user message to UI chat history
      setCurrentResult(prev => {
        if (!prev) return null;
        const hist = prev.chat_history ? [...prev.chat_history] : [];
        return {
          ...prev,
          chat_history: [...hist, { role: 'user', content: userMsg }]
        };
      });

      const response = await fetch('/api/tasks/curate/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptionId,
          userMessage: userMsg
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar curadoria.');
      }

      if (data.extracted_entities) {
        setCurrentResult(data.extracted_entities);
        setRefinementSuccess(true);
        setTimeout(() => setRefinementSuccess(false), 8000); // 8 seconds
        if (data.extracted_entities.extracted_memories) {
          // Sync checkbox states preserving user preferences where possible
          const newMems = data.extracted_entities.extracted_memories.map((m: string) => {
            const existing = memories.find(ex => ex.content === m);
            return { content: m, checked: existing ? existing.checked : true };
          });
          setMemories(newMems);
        }
      }
    } catch (err: any) {
      console.error('[Curation Chat Error]:', err);
      alert(`Falha técnica na curadoria: ${err.message}`);
    } finally {
      setChatLoading(false);
    }
  };

  const handleApprove = async () => {
    if (saving || isReadOnly) return;
    setSaving(true);
    try {
      const approvedMems = memories
        .filter(m => m.checked && m.content.trim())
        .map(m => m.content.trim());

      const response = await fetch('/api/tasks/curate/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptionId,
          approvedMemories: approvedMems
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao aprovar e criar os itens.');
      }

      await onApprove();
      onClose();
    } catch (err: any) {
      console.error('[Curation Approval Error]:', err);
      alert(`Erro ao aprovar curadoria: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300"
        onClick={saving || chatLoading ? undefined : onClose}
      />

      {/* Modal Container: Side-by-Side Layout */}
      <div className="relative w-full max-w-5xl glass border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden h-[85vh] flex flex-col transition-all duration-300 transform scale-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Brain className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="font-black text-sm text-slate-900 dark:text-white truncate">
                Curadoria de IA G-Work
              </h3>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate">
                {fileName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isReadOnly ? (
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                Auditado
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-500 border border-purple-500/20 px-2.5 py-1 rounded-lg">
                Rascunho / Em Curadoria
              </span>
            )}
            <button 
              onClick={onClose}
              disabled={saving || chatLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {refinementSuccess && (
          <div className="mx-5 mt-4 p-3 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-bold text-center animate-in fade-in slide-in-from-top-2 duration-300">
            A proposta foi refinada com sucesso! Verifique os ajustes nas abas de entregáveis, insights e memórias.
          </div>
        )}

        {/* Side-by-Side Grid */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT PANEL: Proposal & Tab Content */}
          <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-white/5 overflow-hidden">
            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-white/5 text-xs font-bold px-5 bg-slate-50/30 dark:bg-slate-950/10 flex-shrink-0">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'overview' 
                    ? 'border-blue-500 text-blue-500' 
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Visão Geral
              </button>
              <button
                onClick={() => setActiveTab('items')}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'items' 
                    ? 'border-blue-500 text-blue-500' 
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Entregáveis Kanban ({currentResult.work_items?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('insights')}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'insights' 
                    ? 'border-blue-500 text-blue-500' 
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Insights ({currentResult.insights?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('memories')}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'memories' 
                    ? 'border-blue-500 text-blue-500' 
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Memória do Agente ({memories.length})
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* Summary */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5">
                    <h4 className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider mb-2.5">
                      <FileText className="w-4 h-4 text-blue-500" />
                      Resumo da Proposta
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      {currentResult.summary}
                    </p>
                  </div>

                  {/* Decisions */}
                  <div>
                    <h4 className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider mb-3">
                      <Brain className="w-4 h-4 text-emerald-500" />
                      Decisões Estratégicas
                    </h4>
                    {currentResult.key_decisions?.length > 0 ? (
                      <ul className="space-y-2">
                        {currentResult.key_decisions.map((dec, i) => (
                          <li key={i} className="flex gap-2.5 text-xs text-slate-600 dark:text-slate-400 items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                            <span className="leading-relaxed">{dec}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic">Nenhuma decisão registrada.</p>
                    )}
                  </div>

                  {/* Grid: People & Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* People */}
                    <div>
                      <h4 className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider mb-3">
                        <Users className="w-4 h-4 text-sky-500" />
                        Pessoas Citadas
                      </h4>
                      {currentResult.mentioned_people?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {currentResult.mentioned_people.map((p, i) => (
                            <span key={i} className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                              {p}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">Ninguém mencionado.</p>
                      )}
                    </div>

                    {/* Dates */}
                    <div>
                      <h4 className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider mb-3">
                        <Calendar className="w-4 h-4 text-purple-500" />
                        Prazos & Limites
                      </h4>
                      {currentResult.mentioned_dates?.length > 0 ? (
                        <ul className="space-y-1.5">
                          {currentResult.mentioned_dates.map((dt, i) => (
                            <li key={i} className="flex justify-between items-center text-xs p-2 rounded bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                              <span className="text-slate-600 dark:text-slate-400 truncate">{dt.label}</span>
                              <span className="text-[10px] bg-purple-500/10 text-purple-500 border border-purple-500/20 font-black px-1.5 py-0.5 rounded flex-shrink-0">
                                {dt.daysFromNow === 0 ? 'Hoje' : dt.daysFromNow === 1 ? 'Amanhã' : `Em ${dt.daysFromNow}d`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">Nenhum prazo claro citado.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'items' && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-500/5 border border-blue-500/10 text-blue-500 rounded-xl text-[10px] font-bold flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Esta hierarquia será criada no Kanban após a sua aprovação final.</span>
                  </div>
                  <div className="space-y-1 divide-y divide-slate-100 dark:divide-white/5">
                    {currentResult.work_items?.length > 0 ? (
                      currentResult.work_items.map((item, i) => (
                        <WorkItemTreeNode key={i} item={item} depth={0} />
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-8">Nenhum item extraído.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="space-y-3">
                  {currentResult.insights?.length > 0 ? (
                    currentResult.insights.map((ins, i) => {
                      const severityColors: Record<string, string> = {
                        info: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
                        warning: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
                        critical: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
                      };
                      const color = severityColors[ins.severity] || severityColors.info;
                      
                      return (
                        <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-bold text-xs text-slate-800 dark:text-white">{ins.title}</h5>
                            <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${color}`}>
                              {ins.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{ins.body}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-8">Nenhum insight extraído.</p>
                  )}
                </div>
              )}

              {activeTab === 'memories' && (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-bold flex items-center gap-2">
                    <Brain className="w-3.5 h-3.5" />
                    <span>Novas memórias e diretrizes extraídas. Marque as que deseja memorizar.</span>
                  </div>
                  
                  {memories.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-8">
                      Nenhuma diretriz de memória extraída desta gravação.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {memories.map((m, idx) => (
                        <div 
                          key={idx}
                          className={`p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-3.5 ${
                            m.checked 
                              ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-white/5 shadow-sm' 
                              : 'bg-transparent border-transparent opacity-40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={m.checked}
                            disabled={saving || isReadOnly}
                            onChange={() => {
                              const updated = [...memories];
                              updated[idx].checked = !updated[idx].checked;
                              setMemories(updated);
                            }}
                            className="rounded border-slate-300 dark:border-white/10 text-blue-500 focus:ring-blue-500/30 w-4 h-4 bg-slate-950 mt-0.5 cursor-pointer"
                          />
                          <div className="flex-1">
                            <input
                              type="text"
                              value={m.content}
                              disabled={saving || !m.checked || isReadOnly}
                              onChange={(e) => {
                                const updated = [...memories];
                                updated[idx].content = e.target.value;
                                setMemories(updated);
                              }}
                              className="w-full bg-transparent border-none p-0 text-xs text-slate-800 dark:text-slate-200 focus:ring-0 focus:outline-none font-bold"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Curation Chat */}
          <div className="w-[380px] flex flex-col bg-slate-50/30 dark:bg-slate-950/20 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/30 flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Refinamento de IA
              </span>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {/* Context Initial Prompt Bubble */}
              <div className="flex gap-2.5 items-start max-w-[85%]">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl rounded-tl-none">
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                    Guilherme, analisei a gravação e elaborei este plano. Você pode me instruir a ajustar tarefas, mudar prioridades ou adicionar novos pontos aqui no chat.
                  </p>
                </div>
              </div>

              {/* Dynamic Chat History */}
              {currentResult.chat_history && currentResult.chat_history.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div 
                    key={idx} 
                    className={`flex gap-2.5 items-start max-w-[85%] ${
                      isUser ? 'ml-auto flex-row-reverse' : ''
                    }`}
                  >
                    {!isUser && (
                      <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Brain className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div 
                      className={`p-3 rounded-2xl font-medium text-xs leading-relaxed border ${
                        isUser 
                          ? 'bg-blue-500 text-white border-blue-500/10 rounded-tr-none' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 rounded-tl-none'
                      }`}
                    >
                      <p>{msg.content}</p>
                    </div>
                  </div>
                );
              })}

              {/* Loading State Bubble */}
              {chatLoading && (
                <div className="flex gap-2.5 items-start max-w-[85%]">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl rounded-tl-none">
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">IA está reprocessando e ajustando a proposta...</p>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Panel */}
            <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 flex-shrink-0">
              {isReadOnly ? (
                <div className="p-2 bg-emerald-500/5 border border-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-lg text-center">
                  Plano aprovado. O chat está desativado.
                </div>
              ) : (
                <form onSubmit={handleSendChat} className="flex gap-2 items-end">
                  <div className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 flex items-center focus-within:bg-white dark:focus-within:bg-slate-950 focus-within:ring-2 focus-within:ring-blue-500/30 transition-all duration-300">
                    <textarea
                      ref={chatTextareaRef}
                      rows={1}
                      value={chatInput}
                      disabled={chatLoading}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Instrua a IA (ex: 'Defina a tarefa X como prioridade critical')"
                      className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 focus:outline-none placeholder-slate-400 disabled:opacity-50 resize-none max-h-24 py-0.5 overflow-y-auto no-scrollbar font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="p-2 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-blue-500 text-white shadow-md shadow-blue-500/10 transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-5 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/30 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={saving || chatLoading}
            className="px-4 py-2 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
          >
            Fechar
          </button>

          {!isReadOnly && (
            <button
              onClick={handleApprove}
              disabled={saving || chatLoading}
              className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando Itens no Kanban...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Aprovar e Criar Itens</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default AiCurationModal;

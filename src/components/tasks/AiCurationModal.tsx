import React, { useState } from 'react';
import { X, Sparkles, Check, Brain, Calendar, Users, HelpCircle, FileText, ChevronRight, Layers } from 'lucide-react';
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
}

interface AiCurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  result: ExtractionResult | null;
}

// Tree view renderer for the generated work items
const WorkItemTreeNode: React.FC<{ item: HierarchicalItem; depth: number }> = ({ item, depth }) => {
  return (
    <div className="flex flex-col">
      <div 
        className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-100/50 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/5 transition-all duration-200"
        style={{ marginLeft: `${depth * 20}px` }}
      >
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-60 flex-shrink-0" />
        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
          <TypeBadge value={item.type} showIcon={false} className="scale-90" />
          <PriorityBadge value={item.priority} showIcon={false} className="scale-90" />
          <span className="font-bold text-xs text-slate-800 dark:text-white truncate">{item.title}</span>
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
  result
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'insights'>('overview');

  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl glass border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-6 overflow-hidden h-[80vh] flex flex-col transition-all duration-300 transform scale-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Brain className="w-5 h-5 animate-pulse" />
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
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-white/5 text-xs font-bold my-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'overview' 
                ? 'border-blue-500 text-blue-500' 
                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Visão Geral & Decisões
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'items' 
                ? 'border-blue-500 text-blue-500' 
                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Tarefas & Hierarquia ({result.work_items?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'insights' 
                ? 'border-blue-500 text-blue-500' 
                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Insights Gerados ({result.insights?.length || 0})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-2 space-y-5">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/5">
                <h4 className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider mb-2.5">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Resumo da Gravação
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {result.summary}
                </p>
              </div>

              {/* Decisions */}
              <div>
                <h4 className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider mb-3">
                  <Brain className="w-4 h-4 text-emerald-500" />
                  Decisões Estratégicas
                </h4>
                {result.key_decisions?.length > 0 ? (
                  <ul className="space-y-2">
                    {result.key_decisions.map((dec, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 items-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                        <span>{dec}</span>
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
                  {result.mentioned_people?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {result.mentioned_people.map((p, i) => (
                        <span key={i} className="px-2 py-1 rounded bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
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
                    Prazos Mencionados
                  </h4>
                  {result.mentioned_dates?.length > 0 ? (
                    <ul className="space-y-1.5">
                      {result.mentioned_dates.map((dt, i) => (
                        <li key={i} className="flex justify-between items-center text-xs p-1.5 rounded bg-slate-50 dark:bg-white/5">
                          <span className="text-slate-600 dark:text-slate-400 truncate">{dt.label}</span>
                          <span className="text-[10px] bg-purple-500/10 text-purple-500 font-black px-1.5 py-0.5 rounded flex-shrink-0">
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
              <div className="p-3 bg-blue-500/5 border border-blue-500/10 text-blue-500 rounded-lg text-[10px] font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Os itens abaixo foram inseridos no seu quadro Kanban respeitando as hierarquias.</span>
              </div>
              <div className="space-y-1 divide-y divide-slate-100 dark:divide-white/5">
                {result.work_items?.length > 0 ? (
                  result.work_items.map((item, i) => (
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
              {result.insights?.length > 0 ? (
                result.insights.map((ins, i) => {
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
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{ins.body}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-8">Nenhum insight extraído.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end pt-4 border-t border-slate-200 dark:border-white/5">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Entendido, ver no Kanban</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default AiCurationModal;

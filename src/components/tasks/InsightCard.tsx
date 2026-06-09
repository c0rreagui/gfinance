import React, { useState } from 'react';
import { AiInsight, InsightSeverity, InsightType } from '@/types/gwork';
import { Sparkles, AlertTriangle, Info, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ============================================================================
// INSIGHT CARD
// ============================================================================

interface InsightCardProps {
  insight: AiInsight;
  onDismiss: (id: string) => Promise<void>;
  onActOn: (id: string) => Promise<void>;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight, onDismiss, onActOn }) => {
  const [loadingAction, setLoadingAction] = useState<'dismiss' | 'act' | null>(null);

  // Severity styles
  const severityStyles: Record<InsightSeverity, { border: string; bg: string; text: string; icon: any; iconColor: string }> = {
    info: {
      border: 'border-blue-500/20 dark:border-blue-500/10',
      bg: 'bg-blue-50/50 dark:bg-blue-950/20',
      text: 'text-blue-800 dark:text-blue-200',
      icon: Info,
      iconColor: 'text-blue-500 dark:text-blue-400',
    },
    warning: {
      border: 'border-amber-500/20 dark:border-amber-500/10',
      bg: 'bg-amber-50/50 dark:bg-amber-950/20',
      text: 'text-amber-800 dark:text-amber-200',
      icon: AlertTriangle,
      iconColor: 'text-amber-500 dark:text-amber-400',
    },
    critical: {
      border: 'border-rose-500/30 dark:border-rose-500/10',
      bg: 'bg-rose-50/50 dark:bg-rose-950/20',
      text: 'text-rose-800 dark:text-rose-200',
      icon: AlertCircle,
      iconColor: 'text-rose-500 dark:text-rose-400',
    },
  };

  const style = severityStyles[insight.severity] || severityStyles.info;
  const Icon = style.icon;

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingAction('dismiss');
    try {
      await onDismiss(insight.id);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleActOn = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingAction('act');
    try {
      await onActOn(insight.id);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className={`glass relative flex gap-4 p-5 rounded-xl border ${style.border} ${style.bg} transition-all duration-300 shadow-sm hover:shadow-md group`}>
      {/* Icon Column */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-white/80 dark:bg-slate-900/60 shadow-sm ${style.iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content Column */}
      <div className="flex-1 min-w-0 pr-6">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
          {insight.title}
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
          {insight.body}
        </p>

        {/* Footnote showing associations */}
        {(insight.related_work_items?.length || 0) > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Associado a {insight.related_work_items?.length} itens extraídos</span>
          </div>
        )}
      </div>

      {/* Actions (Absolute Top Right / Group hover visible) */}
      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={handleActOn}
          disabled={loadingAction !== null}
          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
          title="Marcar como resolvido/aplicado"
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleDismiss}
          disabled={loadingAction !== null}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50 transition-colors"
          title="Descartar insight"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// INSIGHT FEED
// ============================================================================

interface InsightFeedProps {
  insights: AiInsight[];
  refreshInsights: () => Promise<void>;
}

export const InsightFeed: React.FC<InsightFeedProps> = ({ insights, refreshInsights }) => {
  const [error, setError] = useState<string | null>(null);

  const handleUpdateInsight = async (id: string, update: { dismissed?: boolean; acted_on?: boolean }) => {
    try {
      const response = await fetch('/api/tasks/insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...update }),
      });
      
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Falha ao atualizar insight');
      }

      await refreshInsights();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao processar ação');
    }
  };

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-slate-200 dark:border-white/5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4 animate-bounce">
          <Sparkles className="w-6 h-6" />
        </div>
        <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Sem novos insights</h5>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[240px]">
          Transcreva novas gravações do drive para que o Gemini gere insights inteligentes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg">
          {error}
        </div>
      )}
      
      {insights.map((insight) => (
        <InsightCard
          key={insight.id}
          insight={insight}
          onDismiss={(id) => handleUpdateInsight(id, { dismissed: true })}
          onActOn={(id) => handleUpdateInsight(id, { acted_on: true })}
        />
      ))}
    </div>
  );
};
export default InsightFeed;

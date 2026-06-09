'use client';

import React from 'react';
import { useGWork } from '@/app/tasks/layout';
import { TypeBadge, PriorityBadge, StatusBadge } from '@/components/tasks/Badges';
import { 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Calendar, 
  AlertCircle,
  FileAudio,
  TrendingUp,
  Brain,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

// Helper to resolve the InsightFeed from the file it is located (InsightCard.tsx contains both)
import { InsightFeed as GWorkInsightFeed } from '@/components/tasks/InsightCard';

export default function DashboardPage() {
  const { user, loading, projects, workItems, transcriptions, insights, refreshInsights, refreshData } = useGWork();

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-full min-h-[400px]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-r-2 border-l-2 border-violet-500 rounded-full animate-spin animate-reverse"></div>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const totalItemsCount = workItems.length;
  const activeItems = workItems.filter(item => ['todo', 'in_progress', 'in_review'].includes(item.status));
  const activeItemsCount = activeItems.length;
  const completedItemsCount = workItems.filter(item => item.status === 'done').length;
  const completionRate = totalItemsCount > 0 ? Math.round((completedItemsCount / totalItemsCount) * 100) : 0;
  
  const processedTranscriptions = transcriptions.filter(t => t.processed_at).length;
  const pendingTranscriptions = transcriptions.filter(t => !t.processed_at).length;

  const urgentItems = activeItems
    .filter(item => item.priority === 'critical' || item.priority === 'high' || item.due_date)
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })
    .slice(0, 5);

  const recentTranscriptions = transcriptions.slice(0, 3);

  return (
    <main className="flex-1 overflow-y-auto no-scrollbar p-6 lg:p-8 bg-slate-50/10 dark:bg-slate-950/10 space-y-8">
      {/* Header Banner */}
      <div className="relative p-6 lg:p-8 rounded-3xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-violet-500/5 to-transparent overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-blue-500 bg-blue-500/10 border border-blue-500/20">
              <Brain className="w-3.5 h-3.5" /> G-Work Intelligence Engine
            </div>
            <h1 className="text-3xl font-black tracking-tight dark:text-white leading-tight">
              Olá, {user?.email?.split('@')[0] || 'Guilherme'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              O G-Work está ativo monitorando seu Google Drive. Processamos <strong className="text-slate-900 dark:text-white font-bold">{processedTranscriptions} gravações</strong> e geramos <strong className="text-slate-900 dark:text-white font-bold">{totalItemsCount} entregáveis</strong> hierárquicos para o seu fluxo de trabalho.
            </p>
          </div>
          
          <div className="flex gap-4">
            <Link 
              href="/tasks/transcriptions"
              className="px-5 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 font-bold text-xs uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <FileAudio className="w-4 h-4" /> Ver Transcrições
            </Link>
          </div>
        </div>
      </div>

      {/* Grid: Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Itens Ativos</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5" />
            </div>
          </div>
          <h2 className="text-3xl font-black dark:text-white tracking-tight">{activeItemsCount}</h2>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">Tarefas pendentes no Kanban</p>
        </div>

        {/* Metric 2 */}
        <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Taxa de Conclusão</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
          </div>
          <h2 className="text-3xl font-black dark:text-white tracking-tight">{completionRate}%</h2>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 relative overflow-hidden group hover:border-violet-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Projetos Ativos</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <Layers className="w-4.5 h-4.5" />
            </div>
          </div>
          <h2 className="text-3xl font-black dark:text-white tracking-tight">{projects.length}</h2>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">Iniciativas segmentadas</p>
        </div>

        {/* Metric 4 */}
        <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 relative overflow-hidden group hover:border-pink-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Transcrições</span>
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5" />
            </div>
          </div>
          <h2 className="text-3xl font-black dark:text-white tracking-tight">{transcriptions.length}</h2>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">
            {processedTranscriptions} processadas • {pendingTranscriptions} pendentes
          </p>
        </div>
      </div>

      {/* Main Grid: Insights & Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left / Middle: AI Curation & Insights Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Painel Inteligente</span>
              <h3 className="text-lg font-black dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-blue-500" /> Insights & Alertas de IA
              </h3>
            </div>
          </div>
          
          <GWorkInsightFeed 
            insights={insights} 
            refreshInsights={refreshInsights} 
          />
          
          {/* Recent Transcriptions block */}
          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Últimas Transcrições</h4>
              <Link href="/tasks/transcriptions" className="text-xs text-blue-500 hover:text-blue-400 font-bold flex items-center gap-1 group">
                Ver todas <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentTranscriptions.length === 0 ? (
                <div className="col-span-3 text-center py-6 border border-dashed border-slate-200 dark:border-white/5 rounded-xl text-slate-400 text-xs italic">
                  Nenhuma transcrição encontrada.
                </div>
              ) : (
                recentTranscriptions.map((tr) => (
                  <Link
                    key={tr.id}
                    href={`/tasks/transcriptions`}
                    className="glass p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:border-blue-500/20 bg-white/20 dark:bg-slate-900/20 hover:bg-white/40 dark:hover:bg-slate-900/40 transition-all flex flex-col justify-between aspect-[1.5/1]"
                  >
                    <div className="space-y-2">
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate" title={tr.file_name}>
                        {tr.file_name}
                      </h5>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {tr.ai_summary || tr.content}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mt-3 pt-2 border-t border-slate-200/50 dark:border-white/5">
                      <span>{new Date(tr.transcribed_at).toLocaleDateString('pt-BR')}</span>
                      {tr.processed_at ? (
                        <span className="text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Processada</span>
                      ) : (
                        <span className="text-amber-500 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Pendente</span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Urgent Items & Deadlines */}
        <div className="space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atenção Prioritária</span>
            <h3 className="text-lg font-black dark:text-white flex items-center gap-1.5">
              <AlertCircle className="w-5 h-5 text-rose-500" /> Prazos & Alta Prioridade
            </h3>
          </div>

          <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/30 dark:bg-slate-900/30 space-y-4">
            {urgentItems.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs italic">
                Nenhum item urgente ou com prazo próximo. Bom trabalho!
              </div>
            ) : (
              <div className="space-y-3">
                {urgentItems.map((item) => {
                  const proj = projects.find(p => p.id === item.project_id);
                  const formattedDate = item.due_date
                    ? new Date(item.due_date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      })
                    : null;

                  return (
                    <Link
                      key={item.id}
                      href="/tasks/kanban"
                      className="flex flex-col p-3 rounded-xl border border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-slate-950/20 hover:border-blue-500/30 hover:bg-white/60 dark:hover:bg-slate-950/40 transition-all duration-200 group"
                    >
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                          {item.title}
                        </span>
                        {formattedDate && (
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 flex-shrink-0">
                            <Calendar className="w-3 h-3 text-purple-400" />
                            {formattedDate}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <TypeBadge value={item.type} showIcon={false} className="scale-90" />
                        <PriorityBadge value={item.priority} showIcon={false} className="scale-90" />
                        <StatusBadge value={item.status} showIcon={false} className="scale-90" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}

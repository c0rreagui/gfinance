'use client';

import React, { useState, useEffect } from 'react';
import { useGWork } from '@/app/tasks/layout';
import { Transcription } from '@/types/gwork';
import { AiCurationModal } from '@/components/tasks/AiCurationModal';
import { supabase } from '@/lib/supabase';
import { 
  FileText, 
  Search, 
  Sparkles, 
  Calendar, 
  Tag, 
  Clock, 
  Activity, 
  CheckCircle, 
  Brain,
  Eye,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

export default function TranscriptionsPage() {
  const { projects, transcriptions, refreshData, refreshInsights } = useGWork();
  const [selectedTr, setSelectedTr] = useState<Transcription | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  // AI triggers states
  const [aiLoading, setAiLoading] = useState(false);
  const [curationResult, setCurationResult] = useState<any>(null);
  const [isCurationOpen, setIsCurationOpen] = useState(false);

  // Sync selected transcription when list updates
  useEffect(() => {
    if (transcriptions.length > 0) {
      if (!selectedTr) {
        setSelectedTr(transcriptions[0]);
      } else {
        const updated = transcriptions.find(t => t.id === selectedTr.id);
        if (updated) setSelectedTr(updated);
      }
    }
  }, [transcriptions]);

  const handleTriggerAI = async (trId: string) => {
    if (aiLoading) return;
    setAiLoading(true);

    try {
      const response = await fetch('/api/tasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptionId: trId })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao processar transcrição.');

      // Format result for curation modal
      const mappedResult = {
        summary: result.summary,
        work_items: result.work_items || [],
        insights: result.insights || [],
        key_decisions: result.key_decisions || [],
        mentioned_people: result.mentioned_people || [],
        mentioned_dates: result.mentioned_dates || []
      };

      setCurationResult(mappedResult);
      setIsCurationOpen(true);

      // Force refresh data in layouts
      await Promise.all([refreshData(), refreshInsights()]);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Falha ao processar com IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleOpenCurationDetails = () => {
    if (!selectedTr || !selectedTr.processed_at) return;

    // Retrieve data from extracted_entities object
    const entities = selectedTr.extracted_entities as any;
    if (!entities) return;

    setCurationResult({
      summary: entities.summary || selectedTr.ai_summary || '',
      work_items: entities.work_items || [],
      insights: entities.insights || [],
      key_decisions: entities.key_decisions || [],
      mentioned_people: entities.mentioned_people || [],
      mentioned_dates: entities.mentioned_dates || []
    });
    setIsCurationOpen(true);
  };

  // Resolvers
  const getProjectName = (projId: string | null) => projects.find(p => p.id === projId)?.name;

  // Filter transcriptions
  const filteredTranscriptions = transcriptions.filter(tr => {
    const matchesSearch = tr.file_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      tr.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = !filterProject || tr.project_id === filterProject;
    return matchesSearch && matchesProject;
  }).sort((a, b) => {
    const dateA = new Date(a.transcribed_at).getTime();
    const dateB = new Date(b.transcribed_at).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  return (
    <main className="flex-1 overflow-hidden flex flex-col lg:flex-row h-full bg-slate-50/10 dark:bg-slate-950/10">
      
      {/* Left Pane: Audio recordings list */}
      <div className="w-full lg:w-[380px] border-r border-slate-200 dark:border-white/5 flex flex-col overflow-hidden bg-white/10 dark:bg-slate-900/10 flex-shrink-0">
        
        {/* Search, Filter & Sort */}
        <div className="p-5 border-b border-slate-200 dark:border-white/5 space-y-3 bg-white/20 dark:bg-slate-900/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Buscar gravações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-950/50 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="flex-1 px-2.5 py-1.5 border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-950/50 rounded-lg text-[10px] font-bold text-slate-500 cursor-pointer focus:outline-none"
            >
              <option value="">Filtrar Projeto</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-950/50 rounded-lg text-[10px] font-bold text-slate-500 cursor-pointer focus:outline-none"
            >
              <option value="desc">Mais recentes</option>
              <option value="asc">Mais antigas</option>
            </select>
          </div>
        </div>

        {/* List items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 no-scrollbar">
          {filteredTranscriptions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-600 text-xs italic">
              Nenhuma gravação encontrada
            </div>
          ) : (
            filteredTranscriptions.map(tr => {
              const isSelected = selectedTr?.id === tr.id;
              return (
                <div
                  key={tr.id}
                  onClick={() => setSelectedTr(tr)}
                  className={`p-4 flex flex-col gap-1.5 cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'bg-blue-500/10 dark:bg-blue-500/10 border-l-4 border-blue-500' 
                      : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h5 className={`font-bold text-xs truncate max-w-[220px] ${isSelected ? 'text-blue-500 dark:text-blue-400' : 'text-slate-800 dark:text-white'}`}>
                      {tr.file_name}
                    </h5>
                    <span className="text-[9px] font-medium text-slate-400 whitespace-nowrap">
                      {new Date(tr.transcribed_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {tr.ai_summary || tr.content}
                  </p>

                  <div className="flex items-center justify-between mt-1 text-[9px] font-bold">
                    <span className="text-slate-400 dark:text-slate-500">
                      {getProjectName(tr.project_id) || 'Sem projeto'}
                    </span>
                    {tr.processed_at ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-500">
                        <CheckCircle className="w-3 h-3" /> Auditado
                      </span>
                    ) : (
                      <span className="text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        Pendente
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Selected transcription details & AI Command Panel */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col bg-white/20 dark:bg-slate-900/10">
        {selectedTr ? (
          <div className="p-6 lg:p-8 flex-1 flex flex-col h-full gap-6">
            
            {/* Header / Info Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 dark:border-white/5 gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-black dark:text-white leading-tight">
                  {selectedTr.file_name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 font-semibold">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span>Gravação: {new Date(selectedTr.transcribed_at).toLocaleString('pt-BR')}</span>
                  </div>
                  {selectedTr.project_id && (
                    <div className="flex items-center gap-1">
                      <Tag className="w-4 h-4 text-blue-400" />
                      <span>Projeto: {getProjectName(selectedTr.project_id)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {selectedTr.processed_at ? (
                  <button
                    onClick={handleOpenCurationDetails}
                    className="px-4 py-2 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" /> Visualizar Plano de Ação
                  </button>
                ) : (
                  <button
                    onClick={() => handleTriggerAI(selectedTr.id)}
                    disabled={aiLoading}
                    className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white text-xs font-bold rounded-xl uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>{aiLoading ? 'Processando com IA...' : 'Analisar com IA'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Split layout: Raw transcription vs AI Analysis if processed */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              
              {/* Raw Transcript Content */}
              <div className="space-y-3 flex flex-col h-full min-h-[300px]">
                <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Transcrição Bruta (Drive)</h4>
                <div className="flex-1 p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/30 overflow-y-auto text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                  {selectedTr.content}
                </div>
              </div>

              {/* AI Hub Results */}
              <div className="space-y-4 flex flex-col h-full">
                <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Relatório de IA G-Work</h4>
                
                {selectedTr.processed_at ? (
                  <div className="flex-1 p-5 rounded-2xl border border-blue-500/10 bg-blue-500/[0.02] dark:bg-blue-500/[0.01] space-y-5 overflow-y-auto no-scrollbar">
                    
                    {/* Model Details Footnote */}
                    <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/5 p-2 rounded-lg">
                      <span>IA: {selectedTr.gemini_model || 'gemini-2.5-flash'}</span>
                      {selectedTr.token_count && <span>Tamanho: {selectedTr.token_count} tokens</span>}
                      <span>Processado em: {new Date(selectedTr.processed_at).toLocaleString('pt-BR')}</span>
                    </div>

                    {/* Summary */}
                    <div>
                      <h5 className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider mb-2">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        Resumo do Plano
                      </h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {selectedTr.ai_summary}
                      </p>
                    </div>

                    {/* Key decisions preview */}
                    {selectedTr.extracted_entities && (selectedTr.extracted_entities as any).key_decisions?.length > 0 && (
                      <div>
                        <h5 className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider mb-2">
                          <Brain className="w-3.5 h-3.5 text-emerald-500" />
                          Principais Decisões
                        </h5>
                        <ul className="space-y-1.5">
                          {(selectedTr.extracted_entities as any).key_decisions.slice(0, 3).map((dec: string, i: number) => (
                            <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 items-start">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                              <span>{dec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Button link to full view */}
                    <button
                      onClick={handleOpenCurationDetails}
                      className="w-full py-2.5 bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/30 text-blue-500 font-bold text-xs rounded-xl transition-all"
                    >
                      Inspecionar Todas as Metas & Insights
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-slate-200 dark:border-white/5 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Ainda não auditada</h5>
                    <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[240px] mb-4">
                      Deixe o Gemini auditar esta gravação para mapear decisões e gerar entregáveis automáticos.
                    </p>
                    <button
                      onClick={() => handleTriggerAI(selectedTr.id)}
                      disabled={aiLoading}
                      className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      {aiLoading ? 'Processando com IA...' : 'Analisar com IA'}
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <FileText className="w-12 h-12 text-slate-400 mb-4" />
            <h5 className="font-bold text-slate-800 dark:text-slate-200">Selecione uma gravação</h5>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Escolha um item de áudio na lista lateral para visualizar a transcrição e auditar o plano.
            </p>
          </div>
        )}
      </div>

      {/* AI Curation Modal */}
      <AiCurationModal
        isOpen={isCurationOpen}
        onClose={() => setIsCurationOpen(false)}
        fileName={selectedTr ? selectedTr.file_name : ''}
        result={curationResult}
      />
    </main>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useGWork } from '@/app/tasks/layout';
import { Transcription } from '@/types/gwork';
import { AiCurationModal } from '@/components/tasks/AiCurationModal';
import { BulkEditModal, BulkEditUpdates } from '@/components/tasks/BulkEditModal';
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
  ChevronDown,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  X
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

  // UX Premium states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Bulk selection states
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingIndex, setProcessingIndex] = useState<number>(0);
  const [processingTotal, setProcessingTotal] = useState<number>(0);
  const [bulkResultNotify, setBulkResultNotify] = useState<{
    successCount: number;
    failedCount: number;
    errors: { fileName: string; error: string }[];
  } | null>(null);

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

  // Clear error message when switching selected transcription
  useEffect(() => {
    setErrorMsg('');
  }, [selectedTr?.id]);

  const handleTriggerAI = async (trId: string) => {
    if (aiLoading) return;
    setAiLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/tasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptionId: trId })
      });

      let result: any = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        // Extract plain text or simple description if it's a HTML response
        const cleanText = text.replace(/<[^>]*>/g, '').substring(0, 120).trim();
        throw new Error(cleanText || `Erro HTTP ${response.status}`);
      }

      if (!response.ok) throw new Error(result.error || `Erro ao processar transcrição (Status ${response.status}).`);

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
      setErrorMsg(err.message || 'Falha técnica ao processar com IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleOpenCurationDetails = () => {
    if (!selectedTr) return;

    // Retrieve data from extracted_entities object
    const entities = selectedTr.extracted_entities as any;
    if (!entities) return;

    setCurationResult({
      summary: entities.summary || selectedTr.ai_summary || '',
      work_items: entities.work_items || [],
      insights: entities.insights || [],
      key_decisions: entities.key_decisions || [],
      mentioned_people: entities.mentioned_people || [],
      mentioned_dates: entities.mentioned_dates || [],
      chat_history: entities.chat_history || []
    });
    setIsCurationOpen(true);
  };

  const handleApproveCurationCallback = async () => {
    await Promise.all([refreshData(), refreshInsights()]);
    setSuccessMsg('Plano de tarefas e insights criados no Kanban com sucesso!');
    setTimeout(() => setSuccessMsg(''), 12000); // 12 seconds
    if (selectedTr) {
      const { data: updated } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('id', selectedTr.id)
        .single();
      if (updated) {
        setSelectedTr(updated);
      }
    }
  };

  const handleUpdateProject = async (trId: string, projectId: string) => {
    try {
      const { error } = await supabase
        .from('transcriptions')
        .update({ project_id: projectId || null })
        .eq('id', trId);
      if (error) throw error;
      
      await refreshData();
      setSelectedTr(prev => prev && prev.id === trId ? { ...prev, project_id: projectId || null } : prev);
    } catch (err: any) {
      console.error('Erro ao atualizar projeto da transcrição:', err.message);
    }
  };

  const handleDeleteTranscription = async (trId: string) => {
    if (!confirm('Deseja excluir permanentemente esta gravação do G-Work?')) return;
    try {
      const { error } = await supabase
        .from('transcriptions')
        .delete()
        .eq('id', trId);
      if (error) throw error;
      
      setSelectedTr(null);
      await refreshData();
    } catch (err: any) {
      console.error('Erro ao excluir transcrição:', err.message);
    }
  };

  const handleCopy = () => {
    if (!selectedTr) return;
    navigator.clipboard.writeText(selectedTr.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveMemories = async (approvedMemories: string[]) => {
    if (approvedMemories.length === 0 || !selectedTr) return;
    try {
      const response = await fetch('/api/tasks/memories/dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memories: approvedMemories,
          sourceTranscriptionId: selectedTr.id
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gravar memórias no banco.');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Falha ao gravar aprendizados: ${err.message}`);
    }
  };

  // Bulk Selection Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkUpdateProject = async (projId: string) => {
    if (!projId) return;
    const finalProjId = projId === 'none' ? null : projId;
    setBulkActionLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('transcriptions')
        .update({ project_id: finalProjId })
        .in('id', selectedIds);
      
      if (error) throw error;
      
      await refreshData();
      
      // Update selectedTr project_id inline if it was updated
      if (selectedTr && selectedIds.includes(selectedTr.id)) {
        setSelectedTr(prev => prev ? { ...prev, project_id: finalProjId } : prev);
      }
      setSelectedIds([]);
      setIsBulkMode(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao atualizar projetos em lote.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const confirmMsg = selectedIds.length === 1 
      ? 'Deseja excluir permanentemente a gravação selecionada?'
      : `Deseja excluir permanentemente as ${selectedIds.length} gravações selecionadas?`;
    if (!confirm(confirmMsg)) return;

    setBulkActionLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('transcriptions')
        .delete()
        .in('id', selectedIds);
      
      if (error) throw error;
      
      // Deselect selectedTr if it was deleted
      if (selectedTr && selectedIds.includes(selectedTr.id)) {
        setSelectedTr(null);
      }
      
      setSelectedIds([]);
      setIsBulkMode(false);
      await refreshData();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao excluir gravações em lote.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkTriggerAI = async () => {
    // Only analyze files that are not already processed
    const pendingIds = transcriptions
      .filter(tr => selectedIds.includes(tr.id) && !tr.processed_at)
      .map(tr => tr.id);

    if (pendingIds.length === 0) {
      setBulkResultNotify({
        successCount: 0,
        failedCount: 0,
        errors: [{ fileName: 'Seleção em Lote', error: 'Nenhuma das gravações selecionadas está pendente de análise.' }]
      });
      return;
    }

    setBulkActionLoading(true);
    setErrorMsg('');
    setProcessingTotal(pendingIds.length);
    setProcessingIndex(0);
    
    let processedCount = 0;
    let failedCount = 0;
    const batchErrors: { fileName: string; error: string }[] = [];

    for (let idx = 0; idx < pendingIds.length; idx++) {
      const id = pendingIds[idx];
      setProcessingId(id);
      setProcessingIndex(idx + 1);
      try {
        const response = await fetch('/api/tasks/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcriptionId: id })
        });

        let result: any = null;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const text = await response.text();
          const cleanText = text.replace(/<[^>]*>/g, '').substring(0, 120).trim();
          throw new Error(cleanText || `Erro HTTP ${response.status}`);
        }

        if (!response.ok) throw new Error(result.error || `Erro Status ${response.status}`);
        processedCount++;
      } catch (err: any) {
        console.error(`[Bulk AI] Erro ao processar transcrição ${id}:`, err);
        const fName = transcriptions.find(t => t.id === id)?.file_name || id;
        batchErrors.push({ fileName: fName, error: err.message || 'Erro de análise' });
        failedCount++;
      }
      
      // Delay to avoid Gemini API free-tier concurrent spikes
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
      // Force refresh data in layout context
      await Promise.all([refreshData(), refreshInsights()]);
      setSelectedIds([]);
      setIsBulkMode(false);
      
      setBulkResultNotify({
        successCount: processedCount,
        failedCount,
        errors: batchErrors
      });
    } catch (err: any) {
      console.error(err);
    } finally {
      setBulkActionLoading(false);
      setProcessingId(null);
      setProcessingIndex(0);
      setProcessingTotal(0);
    }
  };

  const handleBulkConsolidateAI = async () => {
    const pendingItems = transcriptions.filter(
      tr => selectedIds.includes(tr.id) && !tr.processed_at
    );

    setBulkActionLoading(true);
    setErrorMsg('');
    setProcessingTotal(pendingItems.length);
    setProcessingIndex(0);

    try {
      // 1. Process pending items sequentially
      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i];
        setProcessingId(item.id);
        setProcessingIndex(i + 1);
        
        const response = await fetch('/api/tasks/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcriptionId: item.id })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(`Erro ao analisar a gravação ${item.file_name}: ${errData.error || response.status}`);
        }

        // Delay to avoid Gemini API free-tier concurrent spikes
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      setProcessingId(null); // Finished individual analyses phase
      
      // Refresh data so the individual summaries are updated
      await refreshData();

      // 2. Call consolidation API
      const consolidateResponse = await fetch('/api/tasks/consolidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptionIds: selectedIds })
      });

      const consolidateResult = await consolidateResponse.json();
      if (!consolidateResponse.ok) {
        throw new Error(consolidateResult.error || 'Erro ao consolidar gravações.');
      }

      setSelectedIds([]);
      setIsBulkMode(false);
      
      // Force refresh data in layout context
      await Promise.all([refreshData(), refreshInsights()]);

      setBulkResultNotify({
        successCount: selectedIds.length,
        failedCount: 0,
        errors: []
      });
    } catch (err: any) {
      console.error(err);
      setBulkResultNotify({
        successCount: 0,
        failedCount: selectedIds.length,
        errors: [{ fileName: 'Consolidação Geral', error: err.message || 'Falha na consolidação' }]
      });
    } finally {
      setBulkActionLoading(false);
      setProcessingId(null);
      setProcessingIndex(0);
      setProcessingTotal(0);
    }
  };

  const handleBulkEditSave = async (updates: BulkEditUpdates) => {
    setBulkActionLoading(true);
    setErrorMsg('');

    try {
      // 1. Reset AI Status if requested
      if (updates.resetAi) {
        const { error } = await supabase
          .from('transcriptions')
          .update({
            processed_at: null,
            extracted_entities: null,
            ai_summary: null,
            ai_insights: null,
            gemini_model: null,
            token_count: null
          })
          .in('id', selectedIds);
        
        if (error) throw error;
      }

      // 2. Mark manually as audited/processed if requested
      if (updates.markAsAudited) {
        const { error } = await supabase
          .from('transcriptions')
          .update({
            processed_at: new Date().toISOString()
          })
          .in('id', selectedIds);
        
        if (error) throw error;
      }

      // 3. Update project if requested
      if (updates.updateProject) {
        const { error } = await supabase
          .from('transcriptions')
          .update({
            project_id: updates.project_id
          })
          .in('id', selectedIds);
        
        if (error) throw error;
      }

      // 4. Update date if requested
      if (updates.updateDate && updates.transcribed_at) {
        const { error } = await supabase
          .from('transcriptions')
          .update({
            transcribed_at: new Date(updates.transcribed_at).toISOString()
          })
          .in('id', selectedIds);
        
        if (error) throw error;
      }

      // 5. Rename files if requested
      if (updates.doRename) {
        const { data: itemsToRename, error: fetchError } = await supabase
          .from('transcriptions')
          .select('id, file_name')
          .in('id', selectedIds);
        
        if (fetchError) throw fetchError;

        if (itemsToRename) {
          const updatePromises = itemsToRename.map(item => {
            let newName = item.file_name;
            
            if (updates.renamePrefix) {
              newName = updates.renamePrefix + newName;
            }
            
            if (updates.renameSuffix) {
              const extIndex = newName.lastIndexOf('.');
              if (extIndex !== -1) {
                newName = newName.substring(0, extIndex) + updates.renameSuffix + newName.substring(extIndex);
              } else {
                newName = newName + updates.renameSuffix;
              }
            }

            if (updates.renameFind) {
              newName = newName.replaceAll(updates.renameFind, updates.renameReplace || '');
            }

            return supabase
              .from('transcriptions')
              .update({ file_name: newName })
              .eq('id', item.id);
          });

          const results = await Promise.all(updatePromises);
          const firstError = results.find(r => r.error)?.error;
          if (firstError) throw firstError;
        }
      }

      await refreshData();
      setSelectedIds([]);
      setIsBulkMode(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao realizar edições em lote.');
    } finally {
      setBulkActionLoading(false);
    }
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

  const filteredIds = filteredTranscriptions.map(t => t.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));
  const someSelected = filteredIds.length > 0 && filteredIds.some(id => selectedIds.includes(id)) && !allSelected;

  const handleSelectAllToggle = () => {
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const otherSelected = prev.filter(id => !filteredIds.includes(id));
        return [...otherSelected, ...filteredIds];
      });
    }
  };

  return (
    <main className="flex-1 overflow-hidden flex flex-col lg:flex-row h-full bg-slate-50/10 dark:bg-slate-950/10">
      
      {/* Left Pane: Audio recordings list */}
      <div className="w-full lg:w-[380px] border-r border-slate-200 dark:border-white/5 flex flex-col overflow-hidden bg-white/10 dark:bg-slate-900/10 flex-shrink-0">
        
        {/* Gravações header & Bulk selection toggle */}
        <div className="p-5 pb-2 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-white/20 dark:bg-slate-900/20">
          <h3 className="font-bold text-xs uppercase dark:text-white tracking-wider">Gravações</h3>
          <button
            onClick={() => {
              setIsBulkMode(!isBulkMode);
              setSelectedIds([]);
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              isBulkMode 
                ? 'bg-blue-500 text-white shadow-sm' 
                : 'border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400'
            }`}
          >
            {isBulkMode ? 'Sair da Seleção' : 'Seleção em Massa'}
          </button>
        </div>

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

        {/* Bulk select all bar */}
        {isBulkMode && filteredTranscriptions.length > 0 && (
          <div className="px-5 py-2.5 border-b border-slate-200 dark:border-white/5 bg-slate-50/55 dark:bg-slate-950/20 flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = someSelected;
                  }
                }}
                onChange={handleSelectAllToggle}
                className="rounded border-slate-300 dark:border-white/10 text-blue-500 focus:ring-blue-500/30 w-3.5 h-3.5 bg-slate-950 cursor-pointer"
              />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Selecionar Tudo ({filteredTranscriptions.length})
              </span>
            </label>
            <span className="text-[9px] font-bold text-slate-400">
              {selectedIds.length} selecionados
            </span>
          </div>
        )}

        {/* List items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 no-scrollbar">
          {filteredTranscriptions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-600 text-xs italic">
              Nenhuma gravação encontrada
            </div>
          ) : (
            filteredTranscriptions.map(tr => {
              const isSelected = selectedTr?.id === tr.id;
              const isChecked = selectedIds.includes(tr.id);
              return (
                <div
                  key={tr.id}
                  onClick={() => {
                    if (isBulkMode) {
                      handleToggleSelect(tr.id);
                    }
                    setSelectedTr(tr);
                  }}
                  className={`p-4 flex gap-3 cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'bg-blue-500/10 dark:bg-blue-500/10 border-l-4 border-blue-500' 
                      : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  {isBulkMode && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(tr.id);
                      }}
                      className="flex items-center justify-center pt-0.5"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="rounded border-slate-300 dark:border-white/10 text-blue-500 focus:ring-blue-500/30 w-3.5 h-3.5 bg-slate-950 cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h5 className={`font-bold text-xs truncate ${isSelected ? 'text-blue-500 dark:text-blue-400' : 'text-slate-800 dark:text-white'}`}>
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
                      {tr.id === processingId ? (
                        <span className="inline-flex items-center gap-1 text-blue-500 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded animate-pulse font-bold">
                          <Loader2 className="w-3 h-3 animate-spin" /> Analisando...
                        </span>
                      ) : tr.processed_at ? (
                        <span className="inline-flex items-center gap-1 text-emerald-500 font-bold">
                          <CheckCircle className="w-3 h-3" /> Auditado
                        </span>
                      ) : tr.extracted_entities ? (
                        <span className="inline-flex items-center gap-1 text-purple-500 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">
                          <Sparkles className="w-3 h-3 animate-pulse" /> Rascunho
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                          <Clock className="w-3 h-3" /> Pendente
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Selected transcription details & AI Command Panel */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col bg-white/20 dark:bg-slate-900/10">
        
        {bulkResultNotify && (
          <div className="p-6 lg:p-8 pb-0 flex-shrink-0">
            <div className={`p-4 rounded-2xl border flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-4 duration-300 ${
              bulkResultNotify.failedCount > 0 
                ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
                  {bulkResultNotify.failedCount > 0 ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span>Processamento concluído com falhas</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>Processamento concluído com sucesso</span>
                    </>
                  )}
                </div>
                <button 
                  onClick={() => setBulkResultNotify(null)}
                  className="p-1 hover:bg-slate-100/10 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-xs font-semibold leading-relaxed">
                Lote processado: {bulkResultNotify.successCount} sucessos e {bulkResultNotify.failedCount} falhas.
              </p>
              
              {bulkResultNotify.errors.length > 0 && (
                <div className="mt-2.5 border-t border-red-500/10 pt-2.5">
                  <div className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wider mb-2">
                    Visualizador de Erros do Console do Lote:
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar font-mono text-[10px] leading-relaxed bg-black/40 border border-red-500/20 rounded-xl p-3.5 text-red-400/95 shadow-inner select-text">
                    {bulkResultNotify.errors.map((item, idx) => (
                      <div key={idx} className="border-b border-red-500/5 pb-1.5 last:border-b-0 last:pb-0">
                        <span className="font-extrabold text-red-500 underline uppercase tracking-tight">[Arquivo: {item.fileName}]</span>
                        <div className="mt-1 font-medium whitespace-pre-wrap">{item.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTr ? (
          <div className="p-6 lg:p-8 flex-1 flex flex-col h-full gap-6">
            
            {successMsg && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 animate-pulse" />
                  <span>{successMsg}</span>
                </div>
                <a 
                  href="/tasks/kanban" 
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors uppercase tracking-wider text-[10px] cursor-pointer"
                >
                  Visualizar Kanban
                </a>
              </div>
            )}
            
            {/* Header / Info Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 dark:border-white/5 gap-4">
              <div className="space-y-1.5 flex-1">
                <h3 className="text-lg font-black dark:text-white leading-tight">
                  {selectedTr.file_name}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 dark:text-slate-500 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span>Gravação: {new Date(selectedTr.transcribed_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-slate-400 dark:text-slate-500">Projeto:</span>
                    <select
                      value={selectedTr.project_id || ''}
                      onChange={(e) => handleUpdateProject(selectedTr.id, e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-300 font-black cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors p-0 text-xs focus:outline-none"
                    >
                      <option value="" className="dark:bg-slate-900">Nenhum projeto</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id} className="dark:bg-slate-900">{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDeleteTranscription(selectedTr.id)}
                  className="p-2.5 border border-slate-200 dark:border-white/5 bg-white/5 dark:bg-slate-950/20 hover:bg-red-500/10 hover:text-red-500 text-slate-400 dark:text-slate-500 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm"
                  title="Excluir gravação"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>

                {selectedTr.processed_at ? (
                  <button
                    onClick={handleOpenCurationDetails}
                    className="px-4 py-2.5 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-xs font-black rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" /> Visualizar Plano de Ação
                  </button>
                ) : (
                  <button
                    onClick={() => handleTriggerAI(selectedTr.id)}
                    disabled={aiLoading}
                    className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white text-xs font-black rounded-xl uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
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
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Transcrição Bruta (Drive)</h4>
                  <button
                    onClick={handleCopy}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1 text-[10px] uppercase font-black tracking-wider"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex-1 p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/30 overflow-y-auto text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap no-scrollbar">
                  {selectedTr.content}
                </div>
              </div>

              {/* AI Hub Results */}
              <div className="space-y-4 flex flex-col h-full">
                <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Relatório de IA G-Work</h4>
                
                {errorMsg ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-2xl border border-red-500/10 bg-red-500/[0.01] text-center min-h-[300px]">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Falha na Análise de IA</h5>
                    <p className="text-xs text-red-500/80 dark:text-red-400/80 max-w-[280px] mb-6 leading-relaxed font-semibold">
                      {errorMsg}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setErrorMsg('');
                          handleTriggerAI(selectedTr.id);
                        }}
                        className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer uppercase tracking-wider"
                      >
                        Tentar Novamente
                      </button>
                      <button
                        onClick={() => setErrorMsg('')}
                        className="px-5 py-2.5 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Ignorar Erro
                      </button>
                    </div>
                  </div>
                ) : aiLoading ? (
                  <div className="flex-1 p-5 rounded-2xl border border-blue-500/10 bg-blue-500/[0.01] dark:bg-blue-500/[0.005] flex flex-col justify-between min-h-[300px]">
                    <div className="space-y-6 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Brain className="w-4 h-4 text-blue-400 animate-bounce" />
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3"></div>
                          <div className="h-2.5 bg-slate-200 dark:bg-slate-800/85 rounded-md w-1/2"></div>
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-md w-full"></div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-md w-5/6"></div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-md w-4/5"></div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-md w-full"></div>
                      </div>
                      <div className="space-y-3 pt-2">
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/4"></div>
                        <div className="flex gap-2 items-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400/50"></div>
                          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-md flex-1"></div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400/50"></div>
                          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-md w-5/6"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : selectedTr.processed_at ? (
                  <div className="flex-1 p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.01] dark:bg-emerald-500/[0.005] space-y-5 overflow-y-auto no-scrollbar min-h-[300px]">
                    
                    {/* Model Details Footnote */}
                    <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/5 p-2 rounded-lg">
                      <span>IA: {selectedTr.gemini_model || 'gemini-2.5-flash'}</span>
                      {selectedTr.token_count && <span>Tamanho: {selectedTr.token_count} tokens</span>}
                      <span>Auditado em: {new Date(selectedTr.processed_at).toLocaleString('pt-BR')}</span>
                    </div>

                    {/* Summary */}
                    <div>
                      <h5 className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider mb-2">
                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                        Resumo Aprovado
                      </h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                        {selectedTr.ai_summary}
                      </p>
                    </div>

                    {/* Key decisions preview */}
                    {selectedTr.extracted_entities && (selectedTr.extracted_entities as any).key_decisions?.length > 0 && (
                      <div>
                        <h5 className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider mb-2">
                          <Brain className="w-3.5 h-3.5 text-emerald-500" />
                          Decisões Mapeadas
                        </h5>
                        <ul className="space-y-1.5">
                          {(selectedTr.extracted_entities as any).key_decisions.slice(0, 3).map((dec: string, i: number) => (
                            <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 items-start">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                              <span className="font-semibold">{dec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Button link to full view */}
                    <button
                      onClick={handleOpenCurationDetails}
                      className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 font-bold text-xs rounded-xl transition-all cursor-pointer uppercase tracking-wider"
                    >
                      Visualizar Plano de Ação
                    </button>
                  </div>
                ) : selectedTr.extracted_entities ? (
                  <div className="flex-1 p-5 rounded-2xl border border-purple-500/25 bg-purple-500/[0.02] dark:bg-purple-500/[0.01] space-y-5 overflow-y-auto no-scrollbar min-h-[300px]">
                    
                    {/* Model Details Footnote */}
                    <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/5 p-2 rounded-lg">
                      <span>IA: {selectedTr.gemini_model || 'gemini-2.5-flash'}</span>
                      {selectedTr.token_count && <span>Tamanho: {selectedTr.token_count} tokens</span>}
                      <span className="text-purple-400">Rascunho pendente de aprovação</span>
                    </div>

                    {/* Summary */}
                    <div>
                      <h5 className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider mb-2">
                        <FileText className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                        Proposta da IA
                      </h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                        {selectedTr.ai_summary}
                      </p>
                    </div>

                    {/* Key decisions preview */}
                    {selectedTr.extracted_entities && (selectedTr.extracted_entities as any).key_decisions?.length > 0 && (
                      <div>
                        <h5 className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider mb-2">
                          <Brain className="w-3.5 h-3.5 text-purple-400" />
                          Sugestões de Decisão
                        </h5>
                        <ul className="space-y-1.5">
                          {(selectedTr.extracted_entities as any).key_decisions.slice(0, 3).map((dec: string, i: number) => (
                            <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 items-start">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0 animate-pulse" />
                              <span className="font-semibold">{dec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Button link to curation/revisar proposal */}
                    <button
                      onClick={handleOpenCurationDetails}
                      className="w-full py-2.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-500 dark:text-purple-400 font-bold text-xs rounded-xl transition-all cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/5"
                    >
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Revisar Proposta & Conversar</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-slate-200 dark:border-white/5 text-center min-h-[300px]">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Ainda não auditada</h5>
                    <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[240px] mb-6 leading-relaxed">
                      Deixe o Gemini auditar esta gravação para mapear decisões e gerar entregáveis automáticos.
                    </p>
                    <button
                      onClick={() => handleTriggerAI(selectedTr.id)}
                      disabled={aiLoading}
                      className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer uppercase tracking-wider shadow-lg shadow-blue-500/20"
                    >
                      Analisar com IA
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
        transcriptionId={selectedTr ? selectedTr.id : ''}
        result={curationResult}
        processedAt={selectedTr ? selectedTr.processed_at : null}
        onApprove={handleApproveCurationCallback}
      />

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedCount={selectedIds.length}
        projects={projects}
        onSave={handleBulkEditSave}
      />

      {/* Floating Bulk Actions Bar */}
      {isBulkMode && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 bg-slate-900/90 dark:bg-slate-950/90 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-[10px] font-black text-white uppercase tracking-wider whitespace-nowrap">
            {selectedIds.length} {selectedIds.length === 1 ? 'Selecionado' : 'Selecionados'}
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* Action: Bulk Edit */}
          <button
            onClick={() => setIsBulkEditOpen(true)}
            disabled={bulkActionLoading}
            className="flex items-center gap-1 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 text-white text-[9px] font-bold uppercase tracking-wider rounded-lg px-3 py-1.5 cursor-pointer transition-all"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>

          {/* Action: Bulk Project Change */}
          <div className="flex items-center gap-2">
            <select
              value=""
              onChange={(e) => handleBulkUpdateProject(e.target.value)}
              disabled={bulkActionLoading}
              className="bg-white/5 border border-white/10 hover:border-white/20 text-white text-[9px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-0 disabled:opacity-50"
            >
              <option value="" className="bg-slate-900 text-white">Mudar Projeto</option>
              <option value="none" className="bg-slate-900 text-white">Remover Projeto</option>
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">{p.name}</option>
              ))}
            </select>
          </div>

          {/* Action: Bulk AI Process */}
          <button
            onClick={handleBulkTriggerAI}
            disabled={bulkActionLoading}
            className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-[9px] font-bold uppercase tracking-wider rounded-lg px-3 py-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition-all"
          >
            {processingTotal > 0 && processingId ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>
              {bulkActionLoading 
                ? processingTotal > 0 
                  ? `Processando (${processingIndex}/${processingTotal})...`
                  : 'Processando...'
                : 'Analisar com IA'}
            </span>
          </button>

          {/* Action: Bulk Consolidate AI */}
          {selectedIds.length >= 2 && (
            <button
              onClick={handleBulkConsolidateAI}
              disabled={bulkActionLoading}
              className="flex items-center gap-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white text-[9px] font-black uppercase tracking-wider rounded-lg px-3 py-1.5 shadow-md shadow-indigo-500/20 cursor-pointer transition-all animate-in fade-in zoom-in-95 duration-200"
            >
              {bulkActionLoading && processingTotal > 0 && processingId ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>
                {bulkActionLoading 
                  ? processingTotal > 0 && processingId
                    ? `Analisando (${processingIndex}/${processingTotal})...`
                    : 'Consolidando...'
                  : 'Consolidar com IA'}
              </span>
            </button>
          )}

          {/* Action: Bulk Delete */}
          <button
            onClick={handleBulkDelete}
            disabled={bulkActionLoading}
            className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-red-500 text-[9px] font-bold uppercase tracking-wider border border-red-500/20 rounded-lg px-3 py-1.5 cursor-pointer transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir</span>
          </button>

          <div className="h-4 w-px bg-white/10" />

          {/* Cancel Selection */}
          <button
            onClick={() => setSelectedIds([])}
            disabled={bulkActionLoading}
            className="text-white/60 hover:text-white text-[9px] font-bold uppercase tracking-wider cursor-pointer"
          >
            Limpar
          </button>
        </div>
      )}
    </main>
  );
}

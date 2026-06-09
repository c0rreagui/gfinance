import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, Calendar, Tag, FileText, CheckCircle, RefreshCw, Type, AlertCircle } from 'lucide-react';
import { Project } from '@/types/gwork';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  projects: Project[];
  onSave: (updates: BulkEditUpdates) => Promise<void>;
}

export interface BulkEditUpdates {
  project_id?: string | null;
  updateProject: boolean;
  transcribed_at?: string;
  updateDate: boolean;
  renamePrefix?: string;
  renameSuffix?: string;
  renameFind?: string;
  renameReplace?: string;
  doRename: boolean;
  resetAi: boolean;
  markAsAudited: boolean;
}

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  onClose,
  selectedCount,
  projects,
  onSave
}) => {
  // Option enablement states
  const [updateProject, setUpdateProject] = useState(false);
  const [updateDate, setUpdateDate] = useState(false);
  const [doRename, setDoRename] = useState(false);
  const [resetAi, setResetAi] = useState(false);
  const [markAsAudited, setMarkAsAudited] = useState(false);

  // Field values
  const [projectId, setProjectId] = useState<string>('none');
  const [transcribedAt, setTranscribedAt] = useState<string>('');
  const [renamePrefix, setRenamePrefix] = useState<string>('');
  const [renameSuffix, setRenameSuffix] = useState<string>('');
  const [renameFind, setRenameFind] = useState<string>('');
  const [renameReplace, setRenameReplace] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setUpdateProject(false);
      setUpdateDate(false);
      setDoRename(false);
      setResetAi(false);
      setMarkAsAudited(false);
      setProjectId('none');
      setTranscribedAt(new Date().toISOString().substring(0, 10));
      setRenamePrefix('');
      setRenameSuffix('');
      setRenameFind('');
      setRenameReplace('');
      setErrorMsg('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const updates: BulkEditUpdates = {
        project_id: projectId === 'none' ? null : projectId,
        updateProject,
        transcribed_at: transcribedAt,
        updateDate,
        renamePrefix: renamePrefix.trim() || undefined,
        renameSuffix: renameSuffix.trim() || undefined,
        renameFind: renameFind || undefined,
        renameReplace: renameReplace || undefined,
        doRename,
        resetAi,
        markAsAudited
      };

      await onSave(updates);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha ao aplicar alterações em lote.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={loading ? undefined : onClose}
      />

      {/* Modal Container */}
      <form 
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg glass border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col transition-all duration-300 transform scale-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="font-black text-sm text-slate-900 dark:text-white truncate">
                Edição em Massa
              </h3>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate">
                Modificando {selectedCount} {selectedCount === 1 ? 'gravação selecionada' : 'gravações selecionadas'}
              </span>
            </div>
          </div>
          <button 
            type="button"
            disabled={loading}
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-start gap-2.5 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Project Update Field */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={updateProject}
                onChange={(e) => setUpdateProject(e.target.checked)}
                className="rounded border-slate-300 dark:border-white/10 text-blue-500 focus:ring-blue-500/30 w-4.5 h-4.5 bg-slate-950 cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Alterar Projeto Associado</span>
              </div>
            </label>

            {updateProject && (
              <div className="pl-7.5 animate-in fade-in duration-200">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/30 focus:outline-none cursor-pointer"
                >
                  <option value="none">Sem projeto (Desassociar)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Date Update Field */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={updateDate}
                onChange={(e) => setUpdateDate(e.target.checked)}
                className="rounded border-slate-300 dark:border-white/10 text-blue-500 focus:ring-blue-500/30 w-4.5 h-4.5 bg-slate-950 cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Atualizar Data da Gravação</span>
              </div>
            </label>

            {updateDate && (
              <div className="pl-7.5 animate-in fade-in duration-200">
                <input
                  type="date"
                  value={transcribedAt}
                  onChange={(e) => setTranscribedAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* File Renaming Panel */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={doRename}
                onChange={(e) => setDoRename(e.target.checked)}
                className="rounded border-slate-300 dark:border-white/10 text-blue-500 focus:ring-blue-500/30 w-4.5 h-4.5 bg-slate-950 cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Renomear Nomes de Arquivo</span>
              </div>
            </label>

            {doRename && (
              <div className="pl-7.5 space-y-3.5 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">Prefixo</label>
                    <input
                      type="text"
                      placeholder="Ex: [Importante] "
                      value={renamePrefix}
                      onChange={(e) => setRenamePrefix(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">Sufixo</label>
                    <input
                      type="text"
                      placeholder="Ex: - 2026"
                      value={renameSuffix}
                      onChange={(e) => setRenameSuffix(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-white/5 pt-2">
                  <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-2.5">Localizar e Substituir</span>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Buscar texto..."
                      value={renameFind}
                      onChange={(e) => setRenameFind(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Substituir por..."
                      value={renameReplace}
                      onChange={(e) => setRenameReplace(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Status / Audited Status Toggle */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold mb-1">
              <RefreshCw className="w-4 h-4 text-blue-400" />
              <span className="text-xs">Estado de Processamento & IA</span>
            </div>

            <div className="pl-1 space-y-2.5">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={resetAi}
                  disabled={markAsAudited}
                  onChange={(e) => setResetAi(e.target.checked)}
                  className="rounded border-slate-300 dark:border-white/10 text-blue-500 focus:ring-blue-500/30 w-4.5 h-4.5 bg-slate-950 cursor-pointer disabled:opacity-50"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Zerar Análise de IA (Redefinir como Pendente)</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Apaga os resumos e entregáveis gerados para reanalisar.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none border-t border-slate-200 dark:border-white/5 pt-2.5">
                <input
                  type="checkbox"
                  checked={markAsAudited}
                  disabled={resetAi}
                  onChange={(e) => setMarkAsAudited(e.target.checked)}
                  className="rounded border-slate-300 dark:border-white/10 text-blue-500 focus:ring-blue-500/30 w-4.5 h-4.5 bg-slate-950 cursor-pointer disabled:opacity-50"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Marcar Manualmente como Auditado</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Define o status como auditado sem passar pela análise da IA.</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || (!updateProject && !updateDate && !doRename && !resetAi && !markAsAudited)}
            className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/40 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>{loading ? 'Aplicando...' : 'Aplicar Alterações'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

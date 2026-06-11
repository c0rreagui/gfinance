import React, { useState } from 'react';
import { 
  WorkItemType, 
  WorkItemStatus, 
  WorkItemPriority,
  WORK_ITEM_TYPE_CONFIG,
  WORK_ITEM_PRIORITY_CONFIG,
  WORK_ITEM_STATUS_CONFIG,
  STATUS_COLUMNS
} from '@/types/gwork';
import { supabase } from '@/lib/supabase';
import { X, Calendar, Tag, ChevronDown, Check } from 'lucide-react';

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  projects: { id: string; name: string }[];
  onCreated: () => void;
  defaultStatus?: WorkItemStatus;
  parentItem?: { id: string; type: WorkItemType; title: string; project_id?: string | null };
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen,
  onClose,
  userId,
  projects,
  onCreated,
  defaultStatus = 'todo',
  parentItem
}) => {
  const suggestedType: WorkItemType = parentItem
    ? parentItem.type === 'epic' ? 'feature'
    : parentItem.type === 'feature' ? 'story'
    : 'task'
    : 'task';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<WorkItemType>(suggestedType);
  const [status, setStatus] = useState<WorkItemStatus>(defaultStatus);
  const [priority, setPriority] = useState<WorkItemPriority>('medium');
  const [projectId, setProjectId] = useState<string>(parentItem?.project_id || '');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('O título é obrigatório.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          project_id: projectId || parentItem?.project_id || null,
          parent_id: parentItem?.id || null,
          title,
          description: description || null,
          status,
          priority,
          type,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          ai_generated: false
        });

      if (insertError) throw insertError;

      setTitle('');
      setDescription('');
      setType('task');
      setStatus(defaultStatus);
      setPriority('medium');
      setProjectId('');
      setDueDate('');
      onCreated();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao criar item de trabalho');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg glass border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col transition-all duration-300 transform scale-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5">
        <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            {parentItem ? (
              <span>Adicionar filho a: <strong className="text-blue-400">{parentItem.title}</strong></span>
            ) : (
              <span>Criar Item de Trabalho</span>
            )}
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Título
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Desenhar fluxo do checkout"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/80 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Forneça detalhes adicionais..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/80 transition-all resize-none"
            />
          </div>

          {/* Type, Status & Priority Group */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as WorkItemType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/80 transition-all cursor-pointer"
              >
                {Object.entries(WORK_ITEM_TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Estado
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkItemStatus)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/80 transition-all cursor-pointer"
              >
                {Object.entries(WORK_ITEM_STATUS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WorkItemPriority)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/80 transition-all cursor-pointer"
              >
                {Object.entries(WORK_ITEM_PRIORITY_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Project & Due Date Group */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Projeto
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/80 transition-all cursor-pointer"
              >
                <option value="">Nenhum</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Prazo final
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/80 transition-all cursor-pointer"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            {loading ? (
              <span>Criando...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Salvar item</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
export default QuickCreateModal;

'use client';

import React, { useState, useMemo } from 'react';
import { useGWork } from '@/app/tasks/layout';
import { WorkItem, WorkItemType, WorkItemStatus, WorkItemPriority, WORK_ITEM_TYPE_CONFIG, WORK_ITEM_STATUS_CONFIG, WORK_ITEM_PRIORITY_CONFIG } from '@/types/gwork';
import { TypeBadge, PriorityBadge, StatusBadge } from '@/components/tasks/Badges';
import { QuickCreateModal } from '@/components/tasks/QuickCreateModal';
import { supabase } from '@/lib/supabase';
import { 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Plus, 
  Sparkles, 
  ListTree, 
  ArrowDownWideNarrow,
  PlusCircle,
  GitMerge,
  Eye,
  Trash2,
  Check,
  X
} from 'lucide-react';

// ============================================================================
// HIERARCHY TREE NODE
// ============================================================================

interface TreeNodeProps {
  item: WorkItem & { children?: WorkItem[] };
  projectName?: string;
  onAddChild: (parent: WorkItem) => void;
  onEdit: (item: WorkItem) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ item, projectName, onAddChild, onEdit }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;

  // Level specific indentation and styles
  const indentStyles = {
    epic: 'border-l-2 border-violet-500/20 pl-4 py-2 bg-violet-500/[0.01] dark:bg-violet-500/[0.02] my-2',
    feature: 'border-l-2 border-sky-500/20 pl-4 py-1.5 bg-sky-500/[0.01] dark:bg-sky-500/[0.01] my-1',
    story: 'border-l-2 border-emerald-500/10 pl-4 py-1.5 my-1',
    task: 'pl-6 py-1 my-0.5 opacity-90',
  };

  const levelStyle = indentStyles[item.type] || indentStyles.task;

  return (
    <div className={`flex flex-col relative ${levelStyle}`}>
      {/* Node Info Row */}
      <div 
        className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-100/50 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/5 transition-all duration-200 group cursor-pointer"
        onClick={() => onEdit(item)}
      >
        {/* Expand/Collapse Toggle */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setIsExpanded(!isExpanded);
          }}
          className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 dark:text-slate-500 transition-colors ${
            hasChildren ? 'cursor-pointer' : 'cursor-default opacity-0'
          }`}
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>

        {/* Level type and Priority badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <TypeBadge value={item.type} showIcon={false} className="scale-90" />
          <PriorityBadge value={item.priority} showIcon={false} className="scale-90" />
        </div>

        {/* Title */}
        <span className="font-bold text-xs text-slate-800 dark:text-white truncate flex-1 min-w-0 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
          {item.title}
        </span>

        {/* Project indicator */}
        {projectName && (
          <span className="hidden sm:inline-block text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 dark:text-blue-400 flex-shrink-0">
            {projectName}
          </span>
        )}

        {/* Status */}
        <StatusBadge value={item.status} showIcon={false} className="scale-90 flex-shrink-0" />

        {/* AI extra indicator */}
        {item.ai_generated && (
          <span title="Gerado por IA" className="flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          </span>
        )}

        {/* Action button inside tree row */}
        {item.type !== 'task' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(item);
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all flex items-center gap-1 text-[10px] font-bold"
            title={`Adicionar sub-item a este ${item.type}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Adicionar</span>
          </button>
        )}
      </div>

      {/* Children list */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col mt-1">
          {item.children?.map(child => (
            <TreeNode
              key={child.id}
              item={child}
              projectName={projectName}
              onAddChild={onAddChild}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function HierarchyPage() {
  const { user, projects, workItems, refreshData } = useGWork();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  
  // Modals & child creation state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [parentForChild, setParentForChild] = useState<WorkItem | null>(null);

  // Edit details modal
  const [editingItem, setEditingItem] = useState<WorkItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editType, setEditType] = useState<WorkItemType>('task');
  const [editStatus, setEditStatus] = useState<WorkItemStatus>('todo');
  const [editPriority, setEditPriority] = useState<WorkItemPriority>('medium');
  const [editProjId, setEditProjId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Tree construct helper
  const hierarchyTree = useMemo(() => {
    const filteredItems = workItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesProject = !selectedProject || item.project_id === selectedProject;
      return matchesSearch && matchesProject;
    });

    const itemMap: Record<string, WorkItem & { children: WorkItem[] }> = {};
    
    filteredItems.forEach(item => {
      itemMap[item.id] = { ...item, children: [] };
    });

    const rootItems: (WorkItem & { children?: WorkItem[] })[] = [];

    filteredItems.forEach(item => {
      const mappedItem = itemMap[item.id];
      if (item.parent_id && itemMap[item.parent_id]) {
        itemMap[item.parent_id].children.push(mappedItem);
      } else {
        rootItems.push(mappedItem);
      }
    });

    // Sort items
    Object.values(itemMap).forEach(mapped => {
      mapped.children.sort((a, b) => a.sort_order - b.sort_order);
    });
    rootItems.sort((a, b) => a.sort_order - b.sort_order);

    return rootItems;
  }, [workItems, searchQuery, selectedProject]);

  // Resolvers
  const getProjectName = (projId: string | null) => projects.find(p => p.id === projId)?.name;
  
  const handleOpenAddChild = (parent: WorkItem) => {
    setParentForChild(parent);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (item: WorkItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDesc(item.description || '');
    setEditType(item.type);
    setEditStatus(item.status);
    setEditPriority(item.priority);
    setEditProjId(item.project_id || '');
    setEditDueDate(item.due_date ? new Date(item.due_date).toISOString().split('T')[0] : '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: editTitle,
          description: editDesc || null,
          type: editType,
          status: editStatus,
          priority: editPriority,
          project_id: editProjId || null,
          due_date: editDueDate ? new Date(editDueDate).toISOString() : null,
        })
        .eq('id', editingItem.id);

      if (error) throw error;
      setEditingItem(null);
    } catch (err) {
      console.error('[Hierarchy] Failed to update item:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateChild = async (title: string, description: string, type: WorkItemType, priority: WorkItemPriority, status: WorkItemStatus, projectId: string, dueDate: string) => {
    if (!parentForChild || !user) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          project_id: projectId || parentForChild.project_id || null,
          parent_id: parentForChild.id,
          title,
          description: description || null,
          status,
          priority,
          type,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          ai_generated: false
        });

      if (error) throw error;
      refreshData();
      setIsCreateOpen(false);
      setParentForChild(null);
    } catch (err) {
      console.error('[Hierarchy] Failed to create child item:', err);
    }
  };

  return (
    <main className="flex-1 overflow-hidden flex flex-col h-full bg-slate-50/10 dark:bg-slate-950/10">
      {/* Top Controls Bar */}
      <div className="p-6 pb-4 border-b border-slate-200 dark:border-white/5 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black dark:text-white tracking-tight flex items-center gap-1.5">
            <ListTree className="w-5 h-5 text-blue-500" /> Hierarquia de Atividades
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Visão em árvore Azure DevOps (Epic → Feature → Story → Task)</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-48 pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Project filter */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 text-xs focus:outline-none cursor-pointer"
          >
            <option value="">Todos os Projetos</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tree Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 lg:p-8">
        <div className="glass max-w-4xl mx-auto p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 shadow-sm space-y-2">
          {hierarchyTree.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-wider">
              Nenhuma estrutura encontrada
            </div>
          ) : (
            hierarchyTree.map(rootNode => (
              <TreeNode
                key={rootNode.id}
                item={rootNode}
                projectName={getProjectName(rootNode.project_id)}
                onAddChild={handleOpenAddChild}
                onEdit={handleOpenEdit}
              />
            ))
          )}
        </div>
      </div>

      {/* Add Child Dialog */}
      {isCreateOpen && parentForChild && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)} />
          <div className="relative w-full max-w-lg glass border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-blue-500" />
                <span>Vincular sub-item a: <strong className="font-bold text-blue-500">{parentForChild.title}</strong></span>
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Embedded Form */}
            <div className="flex-1 py-4 space-y-4">
              <QuickCreateModalContent
                projects={projects}
                defaultProjectId={parentForChild.project_id || ''}
                suggestedType={
                  parentForChild.type === 'epic' ? 'feature' :
                  parentForChild.type === 'feature' ? 'story' : 'task'
                }
                onSubmit={handleCreateChild}
              />
            </div>
          </div>
        </div>
      )}

      {/* Details/Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setEditingItem(null)} />
          <div className="relative w-full max-w-lg glass border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5">
              <span className="font-black text-sm text-slate-900 dark:text-white">Editar Item</span>
              <button onClick={() => setEditingItem(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Título</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Descrição</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/40 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tipo</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as WorkItemType)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs cursor-pointer focus:outline-none"
                  >
                    {Object.entries(WORK_ITEM_TYPE_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Estado</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as WorkItemStatus)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs cursor-pointer focus:outline-none"
                  >
                    {Object.entries(WORK_ITEM_STATUS_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Prioridade</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as WorkItemPriority)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs cursor-pointer focus:outline-none"
                  >
                    {Object.entries(WORK_ITEM_PRIORITY_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </form>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/5">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? 'Salvando...' : 'Salvar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Helper inline component to render child item form fields
const QuickCreateModalContent: React.FC<{
  projects: any[];
  defaultProjectId: string;
  suggestedType: WorkItemType;
  onSubmit: (title: string, description: string, type: WorkItemType, priority: WorkItemPriority, status: WorkItemStatus, projectId: string, dueDate: string) => void;
}> = ({ projects, defaultProjectId, suggestedType, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<WorkItemType>(suggestedType);
  const [priority, setPriority] = useState<WorkItemPriority>('medium');
  const [status, setStatus] = useState<WorkItemStatus>('todo');
  const [projId, setProjId] = useState(defaultProjectId);
  const [dueDate, setDueDate] = useState('');

  const handleFormSubmit = () => {
    if (!title.trim()) return;
    onSubmit(title, desc, type, priority, status, projId, dueDate);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Título</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Criar modelo de dados"
          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Descrição</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/40 focus:outline-none resize-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as WorkItemType)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs cursor-pointer focus:outline-none"
          >
            {Object.entries(WORK_ITEM_TYPE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Estado</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as WorkItemStatus)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs cursor-pointer focus:outline-none"
          >
            {Object.entries(WORK_ITEM_STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Prioridade</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as WorkItemPriority)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs cursor-pointer focus:outline-none"
          >
            {Object.entries(WORK_ITEM_PRIORITY_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Projeto</label>
          <select
            value={projId}
            onChange={(e) => setProjId(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs cursor-pointer focus:outline-none"
          >
            <option value="">Nenhum</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Prazo</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs cursor-pointer focus:outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleFormSubmit}
          className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Vincular Sub-item</span>
        </button>
      </div>
    </div>
  );
};

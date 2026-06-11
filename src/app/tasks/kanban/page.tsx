'use client';

import React, { useState } from 'react';
import { useGWork } from '@/app/tasks/layout';
import { 
  WorkItem, 
  WorkItemStatus, 
  WORK_ITEM_STATUS_CONFIG, 
  STATUS_COLUMNS,
  WorkItemPriority,
  WorkItemType,
  WORK_ITEM_TYPE_CONFIG,
  WORK_ITEM_PRIORITY_CONFIG
} from '@/types/gwork';
import { TypeBadge, PriorityBadge, StatusBadge } from '@/components/tasks/Badges';
import { WorkItemCard } from '@/components/tasks/WorkItemCard';
import { QuickCreateModal } from '@/components/tasks/QuickCreateModal';
import { supabase } from '@/lib/supabase';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable, useDraggable, DragOverlay } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  Search, 
  Plus, 
  SlidersHorizontal,
  X, 
  Calendar, 
  Trash2, 
  Check, 
  Sparkles,
  GitPullRequest
} from 'lucide-react';

// ============================================================================
// DRAGGABLE CARD WRAPPER
// ============================================================================

const DraggableCard: React.FC<{
  item: WorkItem;
  projectName?: string;
  parentTitle?: string;
  onClick: () => void;
  isBulkMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: () => void;
}> = ({ item, projectName, parentTitle, onClick, isBulkMode, isSelected, onSelectToggle }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    disabled: isBulkMode,
  });

  return (
    <WorkItemCard
      item={item}
      projectName={projectName}
      parentTitle={parentTitle}
      onClick={isBulkMode ? onSelectToggle : onClick}
      innerRef={setNodeRef}
      isDragging={isDragging}
      listeners={isBulkMode ? {} : listeners}
      attributes={isBulkMode ? {} : attributes}
      isSelected={isSelected}
      showCheckbox={isBulkMode}
    />
  );
};

// ============================================================================
// DROPPABLE COLUMN WRAPPER
// ============================================================================

interface KanbanColumnProps {
  id: WorkItemStatus;
  title: string;
  dotColor: string;
  items: WorkItem[];
  projectNameResolver: (id: string | null) => string | undefined;
  parentTitleResolver: (id: string | null) => string | undefined;
  onCardClick: (item: WorkItem) => void;
  onAddTaskClick: () => void;
  isBulkMode?: boolean;
  selectedIds?: string[];
  onSelectToggle?: (id: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  dotColor,
  items,
  projectNameResolver,
  parentTitleResolver,
  onCardClick,
  onAddTaskClick,
  isBulkMode,
  selectedIds,
  onSelectToggle
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col bg-slate-100/30 dark:bg-slate-950/20 rounded-2xl border p-4 overflow-hidden min-h-[500px] transition-all duration-300 ${
        isOver 
          ? 'bg-blue-500/5 dark:bg-blue-500/5 border-blue-500/30' 
          : 'border-slate-200/50 dark:border-white/5'
      }`}
    >
      {/* Column Header */}
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
          <h4 className="font-bold text-xs uppercase dark:text-white tracking-wider">{title}</h4>
          <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800/80 text-[10px] font-black rounded text-slate-500 dark:text-slate-400">
            {items.length}
          </span>
        </div>
        <button
          onClick={onAddTaskClick}
          className="p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:border-blue-500/20 transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Column Cards Container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar min-h-[200px]">
        {items.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-600 text-[10px] uppercase font-bold tracking-widest">
            Sem itens
          </div>
        ) : (
          items.map(item => (
            <DraggableCard
              key={item.id}
              item={item}
              projectName={projectNameResolver(item.project_id)}
              parentTitle={parentTitleResolver(item.parent_id)}
              onClick={() => onCardClick(item)}
              isBulkMode={isBulkMode}
              isSelected={selectedIds?.includes(item.id)}
              onSelectToggle={() => onSelectToggle?.(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function KanbanPage() {
  const { user, projects, workItems, refreshData } = useGWork();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedParent, setSelectedParent] = useState<string>('');
  
  // Drag and Drop active states
  const [activeId, setActiveId] = useState<string | null>(null);

  // Modals & Editor states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createColumn, setCreateColumn] = useState<WorkItemStatus>('todo');
  const [editingItem, setEditingItem] = useState<WorkItem | null>(null);
  
  // Editor form states
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editType, setEditType] = useState<WorkItemType>('task');
  const [editStatus, setEditStatus] = useState<WorkItemStatus>('todo');
  const [editPriority, setEditPriority] = useState<WorkItemPriority>('medium');
  const [editProjId, setEditProjId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Bulk selection states
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Setup dnd sensors with activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Responsive activation distance (5px) to support smooth dragging
      },
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id as string);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overStatus = over.id as WorkItemStatus;

    const draggedItem = workItems.find(w => w.id === activeId);
    if (!draggedItem) return;

    if (draggedItem.status !== overStatus) {
      try {
        const { error } = await supabase
          .from('tasks')
          .update({ status: overStatus })
          .eq('id', activeId);
        
        if (error) throw error;
        await refreshData();
      } catch (err) {
        console.error('[Kanban] Failed to move item:', err);
      }
    }
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
      await refreshData();
    } catch (err) {
      console.error('[Kanban] Failed to update item:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!editingItem) return;
    if (!confirm('Deseja realmente excluir este item de trabalho?')) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', editingItem.id);

      if (error) throw error;
      setEditingItem(null);
    } catch (err) {
      console.error('[Kanban] Failed to delete item:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Resolvers
  const getProjectName = (projId: string | null) => projects.find(p => p.id === projId)?.name;
  const getParentTitle = (parentId: string | null) => workItems.find(w => w.id === parentId)?.title;

  // Helper to get all descendant IDs of a parent item recursively
  const getDescendantsList = (parentId: string): string[] => {
    const list: string[] = [];
    const traverse = (id: string) => {
      const children = workItems.filter(w => w.parent_id === id);
      for (const child of children) {
        list.push(child.id);
        traverse(child.id);
      }
    };
    traverse(parentId);
    return list;
  };

  // Filter items
  const filteredItems = workItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesProject = !selectedProject || item.project_id === selectedProject;

    let matchesType = true;
    if (selectedType === 'actionable') {
      matchesType = item.type === 'task' || item.type === 'story';
    } else if (selectedType !== 'all') {
      matchesType = item.type === selectedType;
    }

    let matchesParent = true;
    if (selectedParent) {
      const descendants = getDescendantsList(selectedParent);
      matchesParent = descendants.includes(item.id);
    }

    return matchesSearch && matchesProject && matchesType && matchesParent;
  });

  // Extract all unique parent items (Epics & Features) to display in the filter dropdown
  const parentItemsForFilter = workItems.filter(item => item.type === 'epic' || item.type === 'feature');

  // Toggle selection for bulk mode
  const handleSelectToggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Bulk Status Change
  const handleBulkStatusChange = async (newStatus: WorkItemStatus) => {
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .in('id', selectedIds);
      if (error) throw error;
      setSelectedIds([]);
      setIsBulkMode(false);
      await refreshData();
    } catch (err) {
      console.error('[Kanban] Failed bulk status update:', err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk Priority Change
  const handleBulkPriorityChange = async (newPriority: WorkItemPriority) => {
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ priority: newPriority })
        .in('id', selectedIds);
      if (error) throw error;
      setSelectedIds([]);
      setIsBulkMode(false);
      await refreshData();
    } catch (err) {
      console.error('[Kanban] Failed bulk priority update:', err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (!confirm(`Deseja realmente excluir permanentemente os ${selectedIds.length} itens de trabalho selecionados?`)) return;
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', selectedIds);
      if (error) throw error;
      setSelectedIds([]);
      setIsBulkMode(false);
      await refreshData();
    } catch (err) {
      console.error('[Kanban] Failed bulk delete:', err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  return (
    <main className="flex-1 overflow-hidden flex flex-col h-full bg-slate-50/10 dark:bg-slate-950/10">
      {/* Top Controls Bar */}
      <div className="p-6 pb-4 border-b border-slate-200 dark:border-white/5 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black dark:text-white tracking-tight">Quadro Kanban</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Gerenciamento visual de atividades</p>
        </div>

        {/* Filters & Add Button */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-40 pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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

          {/* Type filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 text-xs focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os Tipos</option>
            <option value="actionable">Itens Acionáveis (Stories/Tasks)</option>
            <option value="epic">Apenas Épicos</option>
            <option value="feature">Apenas Features</option>
            <option value="story">Apenas Stories</option>
            <option value="task">Apenas Tarefas</option>
          </select>

          {/* Parent filter */}
          <select
            value={selectedParent}
            onChange={(e) => setSelectedParent(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 text-xs focus:outline-none cursor-pointer max-w-[150px] truncate"
          >
            <option value="">Foco (Pai)</option>
            {parentItemsForFilter.map(item => (
              <option key={item.id} value={item.id}>
                {item.type === 'epic' ? '👑' : '✨'} {item.title}
              </option>
            ))}
          </select>

          {/* Bulk select toggle */}
          <button
            onClick={() => {
              setIsBulkMode(!isBulkMode);
              setSelectedIds([]);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              isBulkMode 
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' 
                : 'border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400'
            }`}
          >
            {isBulkMode ? 'Sair da Seleção' : 'Seleção em Massa'}
          </button>

          {/* Add task button */}
          <button
            onClick={() => {
              setCreateColumn('todo');
              setIsCreateOpen(true);
            }}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl uppercase tracking-wider shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Criar Item
          </button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto p-6 lg:p-8">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex gap-6 min-w-[1000px] h-full items-start">
            {STATUS_COLUMNS.map(colId => {
              const colConfig = WORK_ITEM_STATUS_CONFIG[colId] || { label: colId, dotColor: 'bg-slate-500' };
              const colItems = filteredItems.filter(item => item.status === colId);
              
              return (
                <div key={colId} className="flex-1 min-w-[220px]">
                  <KanbanColumn
                    id={colId}
                    title={colConfig.label}
                    dotColor={colConfig.dotColor}
                    items={colItems}
                    projectNameResolver={getProjectName}
                    parentTitleResolver={getParentTitle}
                    onCardClick={handleOpenEdit}
                    onAddTaskClick={() => {
                      setCreateColumn(colId);
                      setIsCreateOpen(true);
                    }}
                    isBulkMode={isBulkMode}
                    selectedIds={selectedIds}
                    onSelectToggle={handleSelectToggle}
                  />
                </div>
              );
            })}
          </div>

          <DragOverlay adjustScale={false}>
            {activeId ? (
              <WorkItemCard
                item={workItems.find(w => w.id === activeId)!}
                projectName={getProjectName(workItems.find(w => w.id === activeId)!.project_id)}
                parentTitle={getParentTitle(workItems.find(w => w.id === activeId)!.parent_id)}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modals */}
      {user && (
        <QuickCreateModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          userId={user.id}
          projects={projects}
          onCreated={refreshData}
          defaultStatus={createColumn}
        />
      )}

      {/* Details/Edit Drawer Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setEditingItem(null)} />
          <div className="relative w-full max-w-lg glass border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-900 dark:text-white">Detalhes do Item</span>
                {editingItem.ai_generated && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-[9px] font-bold text-blue-500 uppercase">
                    <Sparkles className="w-2.5 h-2.5" /> Extraído por IA
                  </span>
                )}
              </div>
              <button onClick={() => setEditingItem(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-4">
              
              {/* Title */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Título</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Descrição</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                />
              </div>

              {/* Type, Status, Priority */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tipo</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as WorkItemType)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
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
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
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
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    {Object.entries(WORK_ITEM_PRIORITY_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Project & Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Projeto</label>
                  <select
                    value={editProjId}
                    onChange={(e) => setEditProjId(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
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
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
                  />
                </div>
              </div>

              {/* Relations info (if parent exists) */}
              {editingItem.parent_id && (
                <div className="p-3 bg-violet-500/5 border border-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl text-[10px] font-semibold flex items-center gap-1.5">
                  <GitPullRequest className="w-3.5 h-3.5" />
                  <span>Sub-item vinculado ao pai: <strong className="font-bold">{getParentTitle(editingItem.parent_id)}</strong></span>
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/5">
              <button
                type="button"
                onClick={handleDeleteItem}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold transition-all flex items-center gap-1"
                title="Excluir item permanentemente"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Excluindo...' : 'Excluir'}</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white transition-colors"
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
        </div>
      )}
      {/* Floating Bulk Actions Bar */}
      {isBulkMode && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 bg-slate-900/90 dark:bg-slate-950/90 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-[10px] font-black text-white uppercase tracking-wider whitespace-nowrap">
            {selectedIds.length} {selectedIds.length === 1 ? 'Selecionado' : 'Selecionados'}
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* Action: Bulk Status Change */}
          <div className="flex items-center gap-2">
            <select
              value=""
              onChange={(e) => handleBulkStatusChange(e.target.value as WorkItemStatus)}
              disabled={bulkActionLoading}
              className="bg-white/5 border border-white/10 hover:border-white/20 text-white text-[9px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-0 disabled:opacity-50"
            >
              <option value="" className="bg-slate-900 text-white">Mudar Estado</option>
              {Object.entries(WORK_ITEM_STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key} className="bg-slate-900 text-white">{cfg.label}</option>
              ))}
            </select>
          </div>

          {/* Action: Bulk Priority Change */}
          <div className="flex items-center gap-2">
            <select
              value=""
              onChange={(e) => handleBulkPriorityChange(e.target.value as WorkItemPriority)}
              disabled={bulkActionLoading}
              className="bg-white/5 border border-white/10 hover:border-white/20 text-white text-[9px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-0 disabled:opacity-50"
            >
              <option value="" className="bg-slate-900 text-white">Mudar Prioridade</option>
              {Object.entries(WORK_ITEM_PRIORITY_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key} className="bg-slate-900 text-white">{cfg.label}</option>
              ))}
            </select>
          </div>

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

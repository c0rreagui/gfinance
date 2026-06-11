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
  X,
  Check,
  Trash2,
  Crown,
  GitMerge,
  BookOpen,
  CheckSquare,
  Target,
  TrendingUp,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';

// ============================================================================
// PROGRESS BAR COMPONENT
// ============================================================================

function ProgressRing({ pct, size = 28, strokeWidth = 3, color = 'emerald' }: {
  pct: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (pct / 100) * circumference;
  const colorMap: Record<string, string> = {
    violet: '#8b5cf6',
    sky: '#38bdf8',
    emerald: '#34d399',
    slate: '#94a3b8',
  };
  const strokeColor = colorMap[color] || colorMap.emerald;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
}

// ============================================================================
// TYPE ICON MAP
// ============================================================================

function TypeIcon({ type, className = 'w-4 h-4' }: { type: WorkItemType; className?: string }) {
  const icons: Record<WorkItemType, React.ReactNode> = {
    epic: <Crown className={`${className} text-violet-400`} />,
    feature: <Sparkles className={`${className} text-sky-400`} />,
    story: <BookOpen className={`${className} text-emerald-400`} />,
    task: <CheckSquare className={`${className} text-slate-400`} />,
  };
  return <>{icons[type] || icons.task}</>;
}

// ============================================================================
// ROADMAP TREE NODE
// ============================================================================

interface RoadmapNodeProps {
  item: WorkItem & { children: (WorkItem & { children: (WorkItem & { children: WorkItem[] })[] })[] };
  depth: number;
  allItems: WorkItem[];
  onEdit: (item: WorkItem) => void;
  onAddChild: (parent: WorkItem) => void;
  projectName?: string;
}

function getProgress(item: WorkItem, allItems: WorkItem[]): { done: number; total: number } {
  // Collect all descendant tasks
  const collect = (id: string): WorkItem[] => {
    const children = allItems.filter(w => w.parent_id === id);
    return children.flatMap(c => [c, ...collect(c.id)]);
  };
  const descendants = collect(item.id);
  const tasks = descendants.filter(d => d.type === 'task' || d.type === 'story');
  const done = tasks.filter(d => d.status === 'done').length;
  return { done, total: tasks.length };
}

const DEPTH_CONFIG = [
  { // Epic — depth 0
    containerClass: 'rounded-2xl border bg-gradient-to-r from-violet-950/30 to-slate-950/50 border-violet-500/20 hover:border-violet-500/40',
    labelClass: 'text-violet-300 font-black text-sm',
    indentClass: '',
    ringColor: 'violet',
  },
  { // Feature — depth 1
    containerClass: 'rounded-xl border bg-gradient-to-r from-sky-950/20 to-slate-950/40 border-sky-500/15 hover:border-sky-500/30',
    labelClass: 'text-sky-300 font-bold text-xs',
    indentClass: 'ml-5',
    ringColor: 'sky',
  },
  { // Story — depth 2
    containerClass: 'rounded-xl border bg-slate-900/30 border-emerald-500/10 hover:border-emerald-500/25',
    labelClass: 'text-emerald-300 font-semibold text-xs',
    indentClass: 'ml-10',
    ringColor: 'emerald',
  },
  { // Task — depth 3
    containerClass: 'rounded-lg border bg-slate-950/20 border-white/5 hover:border-white/10',
    labelClass: 'text-slate-300 font-medium text-[11px]',
    indentClass: 'ml-[60px]',
    ringColor: 'slate',
  },
];

const RoadmapNode: React.FC<RoadmapNodeProps> = ({ item, depth, allItems, onEdit, onAddChild, projectName }) => {
  const [expanded, setExpanded] = useState(depth < 2); // epics and features expanded by default
  const hasChildren = (item.children?.length ?? 0) > 0;
  const cfg = DEPTH_CONFIG[Math.min(depth, 3)];
  const { done, total } = getProgress(item, allItems);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const statusCfg = WORK_ITEM_STATUS_CONFIG[item.status];

  return (
    <div className={`flex flex-col gap-1 ${cfg.indentClass}`}>
      {/* Node Row */}
      <div
        className={`group flex items-center gap-3 px-4 py-3 transition-all duration-200 cursor-pointer ${cfg.containerClass}`}
        onClick={() => onEdit(item)}
      >
        {/* Expand/Collapse */}
        <button
          onClick={e => { e.stopPropagation(); if (hasChildren) setExpanded(!expanded); }}
          className={`p-0.5 rounded text-slate-600 hover:text-slate-400 transition-colors shrink-0 ${hasChildren ? 'cursor-pointer' : 'opacity-0 pointer-events-none'}`}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Type Icon */}
        <TypeIcon type={item.type} className="w-3.5 h-3.5 shrink-0" />

        {/* Title */}
        <span className={`flex-1 min-w-0 truncate ${cfg.labelClass} group-hover:opacity-80 transition-opacity`}>
          {item.title}
        </span>

        {/* Project badge */}
        {projectName && depth === 0 && (
          <span className="hidden sm:inline-flex text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/10 shrink-0">
            {projectName}
          </span>
        )}

        {/* Priority */}
        <PriorityBadge value={item.priority} showIcon={false} className="scale-90 shrink-0" />

        {/* Status dot */}
        <div className="flex items-center gap-1 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg?.dotColor || 'bg-slate-500'}`} />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider hidden sm:block">
            {statusCfg?.label}
          </span>
        </div>

        {/* Progress ring (only for items with descendants) */}
        {total > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <ProgressRing pct={pct} size={22} strokeWidth={2.5} color={cfg.ringColor} />
            <span className="text-[9px] font-black text-slate-500 w-7 text-right">{pct}%</span>
          </div>
        )}

        {/* AI badge */}
        {item.ai_generated && (
          <span title="Gerado por IA" className="shrink-0">
            <Sparkles className="w-3 h-3 text-blue-500" />
          </span>
        )}

        {/* Add child button */}
        {item.type !== 'task' && (
          <button
            onClick={e => { e.stopPropagation(); onAddChild(item); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-white/5 transition-all flex items-center gap-1 text-[10px] font-bold shrink-0"
            title={`Adicionar filho a este ${item.type}`}
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="flex flex-col gap-1 mt-0.5">
          {item.children.map(child => (
            <RoadmapNode
              key={child.id}
              item={child as any}
              depth={depth + 1}
              allItems={allItems}
              onEdit={onEdit}
              onAddChild={onAddChild}
              projectName={projectName}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN PAGE — ROADMAP
// ============================================================================

export default function HierarchyPage() {
  const { user, projects, workItems, refreshData } = useGWork();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [parentForChild, setParentForChild] = useState<WorkItem | null>(null);

  const [editingItem, setEditingItem] = useState<WorkItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editType, setEditType] = useState<WorkItemType>('task');
  const [editStatus, setEditStatus] = useState<WorkItemStatus>('todo');
  const [editPriority, setEditPriority] = useState<WorkItemPriority>('medium');
  const [editProjId, setEditProjId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Build tree starting from epics and features only (roadmap view)
  const roadmapTree = useMemo(() => {
    const filtered = workItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesProject = !selectedProject || item.project_id === selectedProject;
      return matchesSearch && matchesProject;
    });

    const itemMap: Record<string, WorkItem & { children: any[] }> = {};
    filtered.forEach(item => { itemMap[item.id] = { ...item, children: [] }; });

    const roots: (WorkItem & { children: any[] })[] = [];

    filtered.forEach(item => {
      const mapped = itemMap[item.id];
      if (item.parent_id && itemMap[item.parent_id]) {
        itemMap[item.parent_id].children.push(mapped);
      } else {
        // Only epics and features as root nodes in the roadmap
        if (item.type === 'epic' || item.type === 'feature') {
          roots.push(mapped);
        } else if (item.parent_id && !itemMap[item.parent_id]) {
          // Parent not in filtered set — orphan, still show
          if (item.type === 'story' || item.type === 'task') {
            // Skip — these belong in kanban
          }
        }
      }
    });

    // Sort roots: epics first, then features; by sort_order
    roots.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'epic' ? -1 : 1;
      return a.sort_order - b.sort_order;
    });

    // Sort children recursively
    const sortChildren = (items: (WorkItem & { children: any[] })[]) => {
      items.sort((a, b) => a.sort_order - b.sort_order);
      items.forEach(i => sortChildren(i.children));
    };
    roots.forEach(r => sortChildren(r.children));

    return roots;
  }, [workItems, searchQuery, selectedProject]);

  // Summary stats
  const stats = useMemo(() => {
    const epics = workItems.filter(w => w.type === 'epic');
    const features = workItems.filter(w => w.type === 'feature');
    const allTasks = workItems.filter(w => w.type === 'task' || w.type === 'story');
    const doneTasks = allTasks.filter(w => w.status === 'done');
    const inProgress = workItems.filter(w => w.status === 'in_progress');
    return { epics: epics.length, features: features.length, tasks: allTasks.length, done: doneTasks.length, inProgress: inProgress.length };
  }, [workItems]);

  const getProjectName = (projId: string | null) => projects.find(p => p.id === projId)?.name;

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

  const handleSaveEdit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingItem) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('tasks').update({
        title: editTitle,
        description: editDesc || null,
        type: editType,
        status: editStatus,
        priority: editPriority,
        project_id: editProjId || null,
        due_date: editDueDate ? new Date(editDueDate).toISOString() : null,
      }).eq('id', editingItem.id);
      if (error) throw error;
      setEditingItem(null);
      refreshData();
    } catch (err) {
      console.error('[Roadmap] Failed to update:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!editingItem || !confirm('Excluir este item e todos os seus filhos?')) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', editingItem.id);
      if (error) throw error;
      setEditingItem(null);
      refreshData();
    } catch (err) {
      console.error('[Roadmap] Failed to delete:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="flex-1 overflow-hidden flex flex-col h-full bg-slate-50/10 dark:bg-slate-950/10">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-slate-200 dark:border-white/5 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-black dark:text-white tracking-tight flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-400" />
              Roadmap
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Épicos → Features → Stories → Tasks — visão estratégica completa
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-48 pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>

            {/* Project filter */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="">Todos os Projetos</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {/* Create Epic button */}
            <button
              onClick={() => { setParentForChild(null); setIsCreateOpen(true); }}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl uppercase tracking-wider shadow-md shadow-violet-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5" /> Criar Épico
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Crown className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{stats.epics} Épicos</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{stats.features} Features</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{stats.inProgress} Em Progresso</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              {stats.done}/{stats.tasks} Tarefas Concluídas
            </span>
          </div>
          {/* Overall progress bar */}
          <div className="flex-1 flex items-center gap-3 max-w-xs ml-auto">
            <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${stats.tasks > 0 ? Math.round((stats.done / stats.tasks) * 100) : 0}%` }}
              />
            </div>
            <span className="text-[10px] font-black text-slate-400 shrink-0">
              {stats.tasks > 0 ? Math.round((stats.done / stats.tasks) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Roadmap Tree */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-2">
          {roadmapTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Crown className="w-8 h-8 text-violet-400/60" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-400">Nenhum Épico ou Feature encontrado</p>
                <p className="text-[11px] text-slate-600 mt-1">Crie um Épico para começar a estruturar seu Roadmap</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl uppercase tracking-wider shadow-md shadow-violet-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Criar primeiro Épico
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {roadmapTree.map(root => (
                <RoadmapNode
                  key={root.id}
                  item={root as any}
                  depth={0}
                  allItems={workItems}
                  onEdit={handleOpenEdit}
                  onAddChild={(parent) => { setParentForChild(parent); setIsCreateOpen(true); }}
                  projectName={getProjectName(root.project_id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {user && (
        <QuickCreateModal
          isOpen={isCreateOpen}
          onClose={() => { setIsCreateOpen(false); setParentForChild(null); }}
          userId={user.id}
          projects={projects}
          onCreated={() => { refreshData(); setParentForChild(null); }}
          defaultStatus="todo"
          parentItem={parentForChild || undefined}
        />
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setEditingItem(null)} />
          <div className="relative w-full max-w-lg glass border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-2">
                <TypeIcon type={editingItem.type} className="w-4 h-4" />
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  {WORK_ITEM_TYPE_CONFIG[editingItem.type]?.label}
                </span>
                {editingItem.ai_generated && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-[9px] font-bold text-blue-500 uppercase">
                    <Sparkles className="w-2.5 h-2.5" /> IA
                  </span>
                )}
              </div>
              <button onClick={() => setEditingItem(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
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
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs focus:ring-2 focus:ring-violet-500/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Descrição</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs focus:ring-2 focus:ring-violet-500/40 focus:outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tipo</label>
                  <select value={editType} onChange={(e) => setEditType(e.target.value as WorkItemType)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs cursor-pointer focus:outline-none">
                    {Object.entries(WORK_ITEM_TYPE_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Estado</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as WorkItemStatus)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs cursor-pointer focus:outline-none">
                    {Object.entries(WORK_ITEM_STATUS_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Prioridade</label>
                  <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as WorkItemPriority)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs cursor-pointer focus:outline-none">
                    {Object.entries(WORK_ITEM_PRIORITY_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Projeto</label>
                  <select value={editProjId} onChange={(e) => setEditProjId(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs cursor-pointer focus:outline-none">
                    <option value="">Nenhum</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Prazo</label>
                  <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs cursor-pointer focus:outline-none" />
                </div>
              </div>
            </form>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/5">
              <button
                type="button"
                onClick={handleDeleteItem}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Excluindo...' : 'Excluir'}</span>
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">
                  Cancelar
                </button>
                <button onClick={handleSaveEdit} disabled={saving} className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-violet-500/20 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>{saving ? 'Salvando...' : 'Salvar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

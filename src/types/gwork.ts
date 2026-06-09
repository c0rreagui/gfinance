/**
 * gwork.ts
 * Centralized TypeScript types, configurations, and helper functions for G-Work.
 * Defines the core models: WorkItem, Project, Transcription, and AiInsight.
 */

export type WorkItemType = 'epic' | 'feature' | 'story' | 'task';
export type WorkItemStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type WorkItemPriority = 'critical' | 'high' | 'medium' | 'low' | 'none';
export type InsightType = 'action_suggestion' | 'deadline_warning' | 'pattern_detected' | 'priority_shift';
export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface WorkItem {
  id: string;
  user_id: string;
  parent_id: string | null;
  project_id: string | null;
  type: WorkItemType;
  title: string;
  description: string | null;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  sort_order: number;
  ai_generated: boolean;
  ai_confidence: number | null;
  source_transcription_id: string | null;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  children?: WorkItem[];
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface Transcription {
  id: string;
  user_id: string;
  file_name: string;
  google_drive_file_id: string | null;
  content: string;
  transcribed_at: string;
  project_id: string | null;
  ai_summary: string | null;
  ai_insights: string | null;
  file_hash: string | null;
  extracted_entities: {
    work_items?: any[];
    insights?: any[];
    summary?: string;
    key_decisions?: string[];
    mentioned_people?: string[];
    mentioned_dates?: { label: string; date?: string; daysFromNow?: number }[];
  } | null;
  processed_at: string | null;
  gemini_model: string | null;
  token_count: number | null;
  created_at: string;
}

export interface AiInsight {
  id: string;
  user_id: string;
  insight_type: InsightType;
  title: string;
  body: string;
  severity: InsightSeverity;
  related_work_items: string[] | null;
  related_transcriptions: string[] | null;
  dismissed: boolean;
  acted_on: boolean;
  created_at: string;
}

export interface GeminiExtractionResult {
  work_items: {
    title: string;
    description: string | null;
    type: WorkItemType;
    priority: WorkItemPriority;
    children?: any[];
  }[];
  insights: {
    insight_type: InsightType;
    title: string;
    body: string;
    severity: InsightSeverity;
  }[];
  summary: string;
  key_decisions: string[];
  mentioned_people: string[];
  mentioned_dates: {
    label: string;
    daysFromNow: number;
  }[];
}

export interface TypeConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
}

export interface StatusConfig {
  label: string;
  color: string;
  dotColor: string;
}

export interface PriorityConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
}

// Visual configurations reflecting Vercel/Linear dark-first aesthetics
export const WORK_ITEM_TYPE_CONFIG: Record<WorkItemType, TypeConfig> = {
  epic: {
    label: 'Épico',
    color: 'text-violet-400',
    bg: 'bg-violet-950/40',
    border: 'border-violet-800/30',
    icon: 'Crown',
  },
  feature: {
    label: 'Feature',
    color: 'text-sky-400',
    bg: 'bg-sky-950/40',
    border: 'border-sky-800/30',
    icon: 'Sparkles',
  },
  story: {
    label: 'Story',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-800/30',
    icon: 'BookOpen',
  },
  task: {
    label: 'Tarefa',
    color: 'text-slate-400',
    bg: 'bg-slate-900/60',
    border: 'border-slate-800/40',
    icon: 'CheckSquare',
  },
};

export const WORK_ITEM_STATUS_CONFIG: Record<WorkItemStatus, StatusConfig> = {
  backlog: {
    label: 'Backlog',
    color: 'text-slate-500',
    dotColor: 'bg-slate-500',
  },
  todo: {
    label: 'A Fazer',
    color: 'text-slate-300',
    dotColor: 'bg-slate-300',
  },
  in_progress: {
    label: 'Em Progresso',
    color: 'text-blue-400',
    dotColor: 'bg-blue-400',
  },
  in_review: {
    label: 'Em Revisão',
    color: 'text-amber-400',
    dotColor: 'bg-amber-400',
  },
  done: {
    label: 'Concluído',
    color: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'text-rose-500/70',
    dotColor: 'bg-rose-500/50',
  },
};

export const WORK_ITEM_PRIORITY_CONFIG: Record<WorkItemPriority, PriorityConfig> = {
  critical: {
    label: 'Crítica',
    color: 'text-rose-400',
    bg: 'bg-rose-950/50',
    border: 'border-rose-800/40',
    icon: 'AlertCircle',
  },
  high: {
    label: 'Alta',
    color: 'text-amber-400',
    bg: 'bg-amber-950/40',
    border: 'border-amber-800/30',
    icon: 'ArrowUpCircle',
  },
  medium: {
    label: 'Média',
    color: 'text-sky-400',
    bg: 'bg-sky-950/40',
    border: 'border-sky-800/30',
    icon: 'ArrowRightCircle',
  },
  low: {
    label: 'Baixa',
    color: 'text-slate-400',
    bg: 'bg-slate-900/60',
    border: 'border-slate-800/20',
    icon: 'ArrowDownCircle',
  },
  none: {
    label: 'Nenhuma',
    color: 'text-slate-600',
    bg: 'bg-transparent',
    border: 'border-transparent',
    icon: 'MinusCircle',
  },
};

export const STATUS_COLUMNS: WorkItemStatus[] = [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
];

export function getTypeConfig(type: WorkItemType): TypeConfig {
  return WORK_ITEM_TYPE_CONFIG[type] || WORK_ITEM_TYPE_CONFIG.task;
}

export function getStatusConfig(status: WorkItemStatus): StatusConfig {
  return WORK_ITEM_STATUS_CONFIG[status] || WORK_ITEM_STATUS_CONFIG.todo;
}

export function getPriorityConfig(priority: WorkItemPriority): PriorityConfig {
  return WORK_ITEM_PRIORITY_CONFIG[priority] || WORK_ITEM_PRIORITY_CONFIG.none;
}

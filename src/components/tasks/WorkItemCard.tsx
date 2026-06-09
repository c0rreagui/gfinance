import React from 'react';
import { WorkItem } from '@/types/gwork';
import { TypeBadge, StatusBadge, PriorityBadge } from './Badges';
import { Calendar, Tag, GitPullRequest, GripVertical } from 'lucide-react';

interface WorkItemCardProps {
  item: WorkItem;
  projectName?: string;
  parentTitle?: string;
  onClick?: () => void;
  // dnd-kit props
  dragHandleProps?: any;
  listeners?: any;
  attributes?: any;
  innerRef?: React.Ref<HTMLDivElement>;
  style?: React.CSSProperties;
  isDragging?: boolean;
}

export const WorkItemCard: React.FC<WorkItemCardProps> = ({
  item,
  projectName,
  parentTitle,
  onClick,
  dragHandleProps,
  listeners,
  attributes,
  innerRef,
  style,
  isDragging
}) => {
  const formattedDate = item.due_date
    ? new Date(item.due_date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      })
    : null;

  return (
    <div
      ref={innerRef}
      style={style}
      onClick={onClick}
      className={`glass group relative flex flex-col p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 hover:bg-white/60 dark:hover:bg-slate-900/60 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer select-none ${
        isDragging ? 'opacity-50 ring-2 ring-blue-500 scale-[1.02] shadow-2xl z-50' : ''
      }`}
    >
      {/* Top Section: Badges & Drag Handle */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <TypeBadge value={item.type} />
          <PriorityBadge value={item.priority} />
        </div>
        
        {/* Drag handle visible on hover or if dragging */}
        <div
          {...attributes}
          {...listeners}
          {...dragHandleProps}
          className="opacity-0 group-hover:opacity-100 hover:bg-white/10 p-1 rounded transition-opacity cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()} // Prevent clicking the card when dragging
        >
          <GripVertical className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Title */}
      <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors leading-tight mb-2">
        {item.title}
      </h4>

      {/* Description */}
      {item.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {item.description}
        </p>
      )}

      {/* Divider */}
      <div className="h-px bg-slate-200 dark:bg-white/5 my-2" />

      {/* Bottom Row: Metadata (Date, Project, Parent) */}
      <div className="flex items-center justify-between gap-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex-wrap">
        <div className="flex items-center gap-2">
          {formattedDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
          )}
          
          {projectName && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 dark:text-blue-400 max-w-[80px] truncate">
              <Tag className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{projectName}</span>
            </div>
          )}
        </div>

        {parentTitle && (
          <div className="flex items-center gap-1 max-w-[120px] truncate text-[9px] uppercase tracking-wider text-slate-500">
            <GitPullRequest className="w-3 h-3 text-violet-400 flex-shrink-0" />
            <span className="truncate">{parentTitle}</span>
          </div>
        )}
      </div>

      {/* Subtle indicator for AI generated items */}
      {item.ai_generated && (
        <div className="absolute top-0 right-0 w-2 h-2 rounded-bl-xl bg-blue-500/80 dark:bg-blue-400/80 shadow-[0_0_8px_rgba(59,130,246,0.5)]" title="Gerado por Inteligência Artificial" />
      )}
    </div>
  );
};
export default WorkItemCard;

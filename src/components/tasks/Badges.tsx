import React from 'react';
import * as Icons from 'lucide-react';
import { 
  WorkItemType, 
  WorkItemStatus, 
  WorkItemPriority, 
  getTypeConfig, 
  getStatusConfig, 
  getPriorityConfig 
} from '@/types/gwork';

interface BadgeProps<T> {
  value: T;
  className?: string;
  showIcon?: boolean;
}

export const TypeBadge: React.FC<BadgeProps<WorkItemType>> = ({ value, className = '', showIcon = true }) => {
  const config = getTypeConfig(value);
  const Icon = (Icons as any)[config.icon] || Icons.HelpCircle;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.75 rounded-full text-xs font-semibold border transition-all duration-300 ${config.bg} ${config.color} ${config.border} ${className}`}>
      {showIcon && <Icon className="w-3.5 h-3.5 stroke-[2]" />}
      <span>{config.label}</span>
    </span>
  );
};

export const StatusBadge: React.FC<BadgeProps<WorkItemStatus>> = ({ value, className = '', showIcon = true }) => {
  const config = getStatusConfig(value);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.75 rounded-full text-xs font-semibold transition-all duration-300 ${config.color} ${className}`}>
      {showIcon && <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} animate-pulse`} />}
      <span>{config.label}</span>
    </span>
  );
};

export const PriorityBadge: React.FC<BadgeProps<WorkItemPriority>> = ({ value, className = '', showIcon = true }) => {
  const config = getPriorityConfig(value);
  const Icon = (Icons as any)[config.icon] || Icons.MinusCircle;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.75 rounded-full text-xs font-semibold border transition-all duration-300 ${config.bg} ${config.color} ${config.border} ${className}`}>
      {showIcon && <Icon className="w-3.5 h-3.5 stroke-[2]" />}
      <span>{config.label}</span>
    </span>
  );
};

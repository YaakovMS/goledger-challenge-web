import { type ReactNode } from 'react';
import { type LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800/50 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">{title}</h3>
      {description && (
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">{description}</p>
      )}
      {action}
    </div>
  );
}

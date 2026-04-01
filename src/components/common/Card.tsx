import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
}

export function Card({ children, className = '', hoverable = false, onClick, onMouseEnter }: CardProps) {
  return (
    <div
      className={`
        bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl
        shadow-sm dark:shadow-none
        ${hoverable ? 'card-hover cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 ${className}`}>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 ${className}`}>
      {children}
    </div>
  );
}

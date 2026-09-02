'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in-scale',
        className
      )}
    >
      <div className="relative mb-6">
        <div
          aria-hidden
          className="absolute inset-0 -m-3 rounded-full bg-terracotta-100/70 blur-xl animate-soft-pulse"
        />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-paper-deep bg-paper-raised text-terracotta-500 shadow-soft">
          {icon || (
            <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none" aria-hidden>
              <rect x="10" y="12" width="28" height="24" rx="3" className="stroke-current" strokeWidth="1.5" />
              <path d="M16 20h16M16 25h12M16 30h8" className="stroke-current" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </div>
      </div>
      <h3 className="font-serif text-xl tracking-display text-ink mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-ink-muted max-w-sm leading-relaxed mb-6">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {action && (
            <Button size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };

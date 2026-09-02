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
        'flex flex-col items-start sm:items-center justify-center py-14 px-2 text-left sm:text-center animate-fade-in-scale',
        className
      )}
    >
      {icon && (
        <div className="mb-5 text-ink-subtle">
          {icon}
        </div>
      )}
      <h3 className="font-serif text-2xl tracking-display text-ink mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-ink-muted max-w-md leading-relaxed mb-6">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center sm:justify-center gap-4">
          {action && (
            <Button size="sm" className="rounded-full" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="link-underline text-sm"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };

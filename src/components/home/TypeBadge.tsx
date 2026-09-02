'use client';

import { FileText, Play, MessageSquare, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentType } from '@/lib/demo-data';

export function TypeIcon({ type, className }: { type: ContentType; className?: string }) {
  const icons: Record<ContentType, React.ReactNode> = {
    article: <FileText className={className} />,
    video: <Play className={className} />,
    tweet: <MessageSquare className={className} />,
    reddit: <Hash className={className} />,
  };
  return <>{icons[type]}</>;
}

export function TypeLabel({ type }: { type: ContentType }) {
  const labels: Record<ContentType, string> = {
    article: 'Article',
    video: 'Video',
    tweet: 'Tweet',
    reddit: 'Reddit',
  };
  const colors: Record<ContentType, string> = {
    article: 'bg-paper-muted text-ink-muted',
    video: 'bg-paper-muted text-ink-muted',
    tweet: 'bg-paper-muted text-ink-muted',
    reddit: 'bg-paper-muted text-ink-muted',
  };
  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide', colors[type])}>
      {labels[type]}
    </span>
  );
}

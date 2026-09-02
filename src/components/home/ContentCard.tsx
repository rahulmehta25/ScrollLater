'use client';

import { motion } from 'framer-motion';
import { Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { scheduleDays, type DemoItem } from '@/lib/demo-data';
import { TypeIcon, TypeLabel } from './TypeBadge';

export const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04 },
  },
};

export function ContentCard({ item, onClick }: { item: DemoItem; onClick?: () => void }) {
  return (
    <motion.div
      layout
      variants={cardVariants}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClick}
      className={cn(
        'library-row group',
        item.isRead && 'opacity-55'
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-md bg-paper-muted flex items-center justify-center text-ink-subtle">
        <TypeIcon type={item.type} className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-serif text-lg tracking-display text-ink leading-snug line-clamp-2">
          {item.title}
        </h3>

        <p className="mt-1.5 text-sm text-ink-subtle line-clamp-2 leading-relaxed">{item.excerpt}</p>

        <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[11px] text-ink-faint">
          <TypeLabel type={item.type} />
          <span>{item.source}</span>
          <span className="text-paper-deep">/</span>
          <span className="inline-flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {item.readTimeMinutes} min
          </span>
          {item.scheduledDate && (
            <>
              <span className="text-paper-deep">/</span>
              <span className="inline-flex items-center gap-0.5 text-ink-muted font-medium">
                <Calendar className="w-3 h-3" />
                {scheduleDays.find((d) => d.date === item.scheduledDate)?.label || item.scheduledDate}
              </span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

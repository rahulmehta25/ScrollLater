'use client';

import { motion } from 'framer-motion';
import { Clock, Calendar, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { categoryThumbBg, categoryThumbIcon, scheduleDays, type DemoItem } from '@/lib/demo-data';
import { TypeIcon, TypeLabel } from './TypeBadge';

export const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

export function ContentCard({ item, onClick }: { item: DemoItem; onClick?: () => void }) {
  return (
    <motion.div
      layout
      variants={cardVariants}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(42, 38, 34, 0.08)' }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      onClick={onClick}
      className={cn(
        'group flex gap-3.5 p-4 bg-paper-raised border border-paper-deep rounded-2xl hover:border-ink-faint transition-colors cursor-pointer',
        item.isRead && 'opacity-60'
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
      <div
        className={cn(
          'flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105',
          categoryThumbBg[item.category]
        )}
      >
        <TypeIcon type={item.type} className={cn('w-5 h-5', categoryThumbIcon[item.category])} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-ink leading-snug line-clamp-2 group-hover:text-ink-muted transition-colors tracking-tight">
            {item.title}
          </h3>
          <ExternalLink className="w-3.5 h-3.5 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
        </div>

        <p className="mt-1.5 text-xs text-ink-subtle line-clamp-2 leading-relaxed">{item.excerpt}</p>

        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          <TypeLabel type={item.type} />
          <span className="text-[11px] text-ink-faint">{item.source}</span>
          <span className="text-paper-deep">/</span>
          <span className="text-[11px] text-ink-faint flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {item.readTimeMinutes} min
          </span>
          {item.scheduledDate && (
            <>
              <span className="text-paper-deep">/</span>
              <span className="text-[11px] text-ink-muted flex items-center gap-0.5 font-medium">
                <Calendar className="w-3 h-3" />
                {scheduleDays.find((d) => d.date === item.scheduledDate)?.label || item.scheduledDate}
              </span>
            </>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          {item.tags.slice(0, 3).map((tag) => (
            <motion.span
              key={tag}
              whileHover={{ scale: 1.04 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="px-1.5 py-0.5 bg-paper-soft text-ink-subtle rounded-md text-[10px] border border-paper-deep cursor-default hover:bg-paper-muted hover:text-ink-muted transition-colors"
            >
              {tag}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

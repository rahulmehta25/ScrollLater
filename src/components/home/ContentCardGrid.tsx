'use client';

import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { collections, type DemoItem } from '@/lib/demo-data';
import { TypeIcon, TypeLabel } from './TypeBadge';

export const gridContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04 },
  },
};

export const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function ContentCardGrid({ item, onClick }: { item: DemoItem; onClick?: () => void }) {
  return (
    <motion.div
      layout
      variants={cardVariants}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClick}
      className={cn(
        'group border-b border-paper-deep py-5 cursor-pointer transition-opacity duration-craft hover:opacity-80',
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
      <div className="flex items-center gap-2 mb-3 text-ink-subtle">
        <TypeIcon type={item.type} className="w-4 h-4" />
        <TypeLabel type={item.type} />
        <span className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          {collections.find((c) => c.id === item.category)?.name}
        </span>
      </div>
      <h3 className="font-serif text-xl tracking-display text-ink leading-snug line-clamp-3">
        {item.title}
      </h3>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-faint">
        <span className="truncate">{item.source}</span>
        <span className="text-paper-deep">/</span>
        <span className="inline-flex items-center gap-0.5 flex-shrink-0">
          <Clock className="w-3 h-3" />
          {item.readTimeMinutes} min
        </span>
      </div>
    </motion.div>
  );
}

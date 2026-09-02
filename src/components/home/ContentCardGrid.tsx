'use client';

import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { categoryThumbBg, categoryThumbIcon, categoryBadge, collections, type DemoItem } from '@/lib/demo-data';
import { TypeIcon, TypeLabel } from './TypeBadge';

export const gridContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

export const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export function ContentCardGrid({ item, onClick }: { item: DemoItem; onClick?: () => void }) {
  return (
    <motion.div
      layout
      variants={cardVariants}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3, boxShadow: '0 8px 20px rgba(0,0,0,0.06)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      className={cn(
        'group bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors cursor-pointer overflow-hidden h-full',
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
      <div className={cn('h-24 flex items-center justify-center transition-transform border-b border-gray-100/80', categoryThumbBg[item.category])}>
        <TypeIcon type={item.type} className={cn('w-8 h-8 transition-transform group-hover:scale-110', categoryThumbIcon[item.category])} />
      </div>
      <div className="p-3.5 flex flex-col">
        <div className="flex items-center gap-1.5 mb-2">
          <TypeLabel type={item.type} />
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', categoryBadge[item.category])}>
            {collections.find((c) => c.id === item.category)?.name}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-gray-700 transition-colors tracking-tight">
          {item.title}
        </h3>
        <div className="mt-auto pt-2.5 flex items-center gap-2 text-[11px] text-gray-400">
          <span className="truncate">{item.source}</span>
          <span className="text-gray-200">·</span>
          <span className="flex items-center gap-0.5 flex-shrink-0">
            <Clock className="w-3 h-3" />
            {item.readTimeMinutes} min
          </span>
        </div>
      </div>
    </motion.div>
  );
}

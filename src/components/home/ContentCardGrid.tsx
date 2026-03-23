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
        'group bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-colors cursor-pointer overflow-hidden',
        item.isRead && 'opacity-60'
      )}
    >
      <div className={cn('h-24 flex items-center justify-center transition-transform', categoryThumbBg[item.category])}>
        <TypeIcon type={item.type} className={cn('w-8 h-8 transition-transform group-hover:scale-110', categoryThumbIcon[item.category])} />
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <TypeLabel type={item.type} />
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', categoryBadge[item.category])}>
            {collections.find((c) => c.id === item.category)?.name}
          </span>
        </div>
        <h3 className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 group-hover:text-gray-700 transition-colors">
          {item.title}
        </h3>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
          <span>{item.source}</span>
          <span className="text-gray-200">|</span>
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {item.readTimeMinutes} min
          </span>
        </div>
      </div>
    </motion.div>
  );
}

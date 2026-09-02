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
      whileHover={{ y: -3, boxShadow: '0 8px 20px rgba(0,0,0,0.06)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      className={cn(
        'group flex gap-3.5 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors cursor-pointer',
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
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-gray-700 transition-colors tracking-tight">
            {item.title}
          </h3>
          <ExternalLink className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
        </div>

        <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">{item.excerpt}</p>

        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          <TypeLabel type={item.type} />
          <span className="text-[11px] text-gray-400">{item.source}</span>
          <span className="text-gray-200">·</span>
          <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {item.readTimeMinutes} min
          </span>
          {item.scheduledDate && (
            <>
              <span className="text-gray-200">·</span>
              <span className="text-[11px] text-gray-600 flex items-center gap-0.5 font-medium">
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
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded-md text-[10px] border border-gray-100 cursor-default hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              {tag}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

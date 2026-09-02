'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { scheduleDays, collections, type DemoItem } from '@/lib/demo-data';

interface SchedulePanelProps {
  items: DemoItem[];
  onItemClick?: (item: DemoItem) => void;
}

export function SchedulePanel({ items, onItemClick }: SchedulePanelProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const days = scheduleDays.map((day, i) => ({
    ...day,
    label: weekOffset === 0 ? day.label : `Mar ${7 + i + weekOffset * 7}`,
    items: weekOffset === 0
      ? items.filter((item) => item.scheduledDate === day.date)
      : [],
  }));

  const totalScheduled = items.filter((i) => i.scheduledDate).length;
  const totalMinutes = items
    .filter((i) => i.scheduledDate)
    .reduce((sum, i) => sum + i.readTimeMinutes, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-tight">Schedule</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
              disabled={weekOffset === 0}
              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <span className="text-xs text-gray-500 min-w-[80px] text-center">
              {weekOffset === 0 ? 'This week' : 'Next week'}
            </span>
            <button
              onClick={() => setWeekOffset(Math.min(1, weekOffset + 1))}
              disabled={weekOffset === 1}
              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              aria-label="Next week"
            >
              <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="flex gap-5">
          <div>
            <p className="text-xl font-semibold text-gray-900 tracking-tight">{totalScheduled}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Scheduled</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-gray-900 tracking-tight">
              {Math.round(totalMinutes / 60)}h {totalMinutes % 60}m
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Reading time</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {days.map((day) => (
          <div key={day.date}>
            <div className="flex items-center gap-2 px-1 py-1.5">
              <span
                className={cn(
                  'text-xs font-medium',
                  day.label === 'Today' ? 'text-gray-900' : 'text-gray-500'
                )}
              >
                {day.dayName}
              </span>
              <span
                className={cn(
                  'text-xs',
                  day.label === 'Today' ? 'text-gray-900 font-semibold' : 'text-gray-400'
                )}
              >
                {day.label}
              </span>
              {day.items.length > 0 && (
                <span className="ml-auto text-[10px] text-gray-400">
                  {day.items.reduce((s, i) => s + i.readTimeMinutes, 0)} min
                </span>
              )}
            </div>
            {day.items.length > 0 ? (
              <div className="space-y-1 mb-2">
                {day.items.map((item) => (
                  <motion.button
                    type="button"
                    key={item.id}
                    whileHover={{ x: 2 }}
                    onClick={() => onItemClick?.(item)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 bg-gray-50 border border-transparent rounded-xl hover:bg-white hover:border-gray-200 transition-colors cursor-pointer group text-left"
                  >
                    <div
                      className={cn(
                        'w-1 h-8 rounded-full flex-shrink-0',
                        collections.find((c) => c.id === item.category)?.dotColor
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-800 truncate group-hover:text-gray-900">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {item.readTimeMinutes} min · {item.source}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="px-2.5 py-2.5 mb-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                <p className="text-[11px] text-gray-400">
                  {weekOffset === 0 ? 'Free slot. Open an item to schedule it.' : 'Nothing planned yet.'}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 text-center leading-relaxed">
          Open any item to schedule a reading slot
        </p>
      </div>
    </div>
  );
}

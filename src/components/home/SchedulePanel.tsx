'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { scheduleDays, collections, type DemoItem } from '@/lib/demo-data';

export function SchedulePanel({ items }: { items: DemoItem[] }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const days = scheduleDays.map((day, i) => ({
    ...day,
    label: weekOffset === 0 ? day.label : `Mar ${7 + i + weekOffset * 7}`,
    items: items.filter((item) => item.scheduledDate === day.date),
  }));

  const totalScheduled = items.filter((i) => i.scheduledDate).length;
  const totalMinutes = items
    .filter((i) => i.scheduledDate)
    .reduce((sum, i) => sum + i.readTimeMinutes, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Schedule</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
              disabled={weekOffset === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <span className="text-xs text-gray-500 min-w-[80px] text-center">
              {weekOffset === 0 ? 'This week' : 'Next week'}
            </span>
            <button
              onClick={() => setWeekOffset(Math.min(1, weekOffset + 1))}
              disabled={weekOffset === 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-xl font-semibold text-gray-900">{totalScheduled}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Scheduled</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-gray-900">{Math.round(totalMinutes / 60)}h {totalMinutes % 60}m</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Reading time</p>
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
                  <motion.div
                    key={item.id}
                    whileHover={{ x: 2 }}
                    className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
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
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="px-2 py-1.5 mb-2">
                <p className="text-[11px] text-gray-300 italic">No items scheduled</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 text-center">
          Drag items from feed to reschedule
        </p>
      </div>
    </div>
  );
}

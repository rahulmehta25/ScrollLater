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
      <div className="p-4 border-b border-paper-deep">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-olive-50 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-olive-600" />
            </div>
            <h3 className="font-serif text-sm tracking-display text-ink">Schedule</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
              disabled={weekOffset === 0}
              className="p-1 rounded-lg hover:bg-paper-muted disabled:opacity-30 transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-ink-subtle" />
            </button>
            <span className="text-xs text-ink-subtle min-w-[80px] text-center">
              {weekOffset === 0 ? 'This week' : 'Next week'}
            </span>
            <button
              onClick={() => setWeekOffset(Math.min(1, weekOffset + 1))}
              disabled={weekOffset === 1}
              className="p-1 rounded-lg hover:bg-paper-muted disabled:opacity-30 transition-colors"
              aria-label="Next week"
            >
              <ChevronRight className="w-3.5 h-3.5 text-ink-subtle" />
            </button>
          </div>
        </div>
        <div className="flex gap-5">
          <div>
            <p className="font-serif text-xl tracking-display text-ink">{totalScheduled}</p>
            <p className="text-[10px] text-ink-faint uppercase tracking-[0.12em] mt-0.5">Scheduled</p>
          </div>
          <div>
            <p className="font-serif text-xl tracking-display text-ink">
              {Math.round(totalMinutes / 60)}h {totalMinutes % 60}m
            </p>
            <p className="text-[10px] text-ink-faint uppercase tracking-[0.12em] mt-0.5">Reading time</p>
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
                  day.label === 'Today' ? 'text-ink' : 'text-ink-subtle'
                )}
              >
                {day.dayName}
              </span>
              <span
                className={cn(
                  'text-xs',
                  day.label === 'Today' ? 'text-ink font-semibold' : 'text-ink-faint'
                )}
              >
                {day.label}
              </span>
              {day.items.length > 0 && (
                <span className="ml-auto text-[10px] text-ink-faint">
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
                    className="w-full flex items-center gap-2 px-2.5 py-2 bg-paper-soft border border-transparent rounded-xl hover:bg-paper-raised hover:border-paper-deep transition-colors cursor-pointer group text-left"
                  >
                    <div
                      className={cn(
                        'w-1 h-8 rounded-full flex-shrink-0',
                        collections.find((c) => c.id === item.category)?.dotColor
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-ink truncate group-hover:text-ink">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-ink-faint">
                        {item.readTimeMinutes} min / {item.source}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="px-2.5 py-2.5 mb-2 rounded-xl border border-dashed border-paper-deep bg-paper-soft/60">
                <p className="text-[11px] text-ink-faint">
                  {weekOffset === 0 ? 'Free slot. Open an item to schedule it.' : 'Nothing planned yet.'}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-paper-deep">
        <p className="text-[11px] text-ink-faint text-center leading-relaxed">
          Open any item to schedule a reading slot
        </p>
      </div>
    </div>
  );
}

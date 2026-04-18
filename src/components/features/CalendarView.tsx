'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Play,
  MessageSquare,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduledItem {
  id: string;
  title: string;
  type: 'article' | 'video' | 'tweet' | 'reddit';
  readTime: number;
  collection?: string;
  collectionColor?: string;
  scheduledTime?: string;
}

interface CalendarViewProps {
  items?: ScheduledItem[];
  onItemClick?: (item: ScheduledItem) => void;
  onDateClick?: (date: Date) => void;
  className?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function CalendarView({
  items = [],
  onItemClick,
  onDateClick,
  className,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'week'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    const remainingDays = 42 - days.length;
    for (let i = 0; i < remainingDays; i++) {
      days.push(null);
    }

    return days;
  }, [year, month]);

  const getItemsForDate = (date: Date | null) => {
    if (!date) return [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return items.filter((item) => {
      return true;
    }).slice(0, 3);
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date | null) => {
    if (!date || !selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const handlePrev = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNext = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (date: Date | null) => {
    if (!date) return;
    setSelectedDate(date);
    onDateClick?.(date);
  };

  const typeIcons = {
    article: <FileText className="w-3 h-3" />,
    video: <Play className="w-3 h-3" />,
    tweet: <MessageSquare className="w-3 h-3" />,
    reddit: <Hash className="w-3 h-3" />,
  };

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold text-gray-900 min-w-[140px] text-center">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
          <button
            onClick={() => setView('week')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            )}
          >
            Week
          </button>
          <button
            onClick={() => setView('month')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              view === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            )}
          >
            Month
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[11px] font-medium text-gray-400 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((date, index) => {
          const dayItems = getItemsForDate(date);
          const hasItems = dayItems.length > 0;

          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              disabled={!date}
              className={cn(
                'relative min-h-[80px] p-1 border-b border-r border-gray-100 transition-colors text-left',
                'last:border-r-0 [&:nth-child(7n)]:border-r-0',
                date && 'hover:bg-gray-50',
                isSelected(date) && 'bg-gray-100',
                !date && 'bg-gray-50'
              )}
            >
              {date && (
                <>
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-6 h-6 text-xs rounded-full',
                      isToday(date)
                        ? 'bg-gray-900 text-white font-semibold'
                        : 'text-gray-700'
                    )}
                  >
                    {date.getDate()}
                  </span>

                  {hasItems && (
                    <div className="mt-1 space-y-0.5">
                      {dayItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onItemClick?.(item);
                          }}
                          className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] bg-gray-100 hover:bg-gray-200 transition-colors truncate"
                          style={{
                            borderLeft: item.collectionColor
                              ? `2px solid ${item.collectionColor}`
                              : '2px solid #9CA3AF',
                          }}
                        >
                          <span className="text-gray-400">{typeIcons[item.type]}</span>
                          <span className="text-gray-700 truncate">{item.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="p-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h3>

          {items.length > 0 ? (
            <div className="space-y-2">
              {items.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  onClick={() => onItemClick?.(item)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: item.collectionColor
                        ? `${item.collectionColor}20`
                        : '#F3F4F6',
                    }}
                  >
                    {typeIcons[item.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.readTime} min
                      {item.scheduledTime && ` at ${item.scheduledTime}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No items scheduled</p>
          )}
        </div>
      )}
    </div>
  );
}

export { CalendarView };
export type { CalendarViewProps, ScheduledItem };

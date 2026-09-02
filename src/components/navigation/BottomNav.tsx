'use client';

import { motion } from 'framer-motion';
import { Bookmark, Inbox, Calendar, Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onAddClick?: () => void;
  className?: string;
}

function BottomNav({
  activeTab = 'all',
  onTabChange,
  onAddClick,
  className,
}: BottomNavProps) {
  const tabs = [
    { id: 'all', label: 'All', icon: Bookmark },
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'add', label: 'Add', icon: Plus, isAction: true },
    { id: 'scheduled', label: 'Schedule', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav
      className={cn(
        'lg:hidden fixed bottom-0 left-0 right-0 bg-paper-raised/95 backdrop-blur border-t border-paper-deep px-2 pb-safe z-40',
        className
      )}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isAction) {
            return (
              <button
                key={tab.id}
                onClick={onAddClick}
                className="relative -mt-5 transition-opacity duration-craft hover:opacity-90"
                aria-label="Save link"
              >
                <div className="w-14 h-14 bg-ink rounded-2xl flex items-center justify-center shadow-soft">
                  <Plus className="w-6 h-6 text-paper" strokeWidth={2} />
                </div>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className="relative flex flex-col items-center justify-center w-16 h-full"
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-ink rounded-b-full"
                  initial={false}
                  transition={{ duration: 0.18 }}
                />
              )}
              <Icon
                className={cn(
                  'w-5 h-5 transition-colors duration-craft',
                  isActive ? 'text-ink' : 'text-ink-faint'
                )}
              />
              <span
                className={cn(
                  'text-[10px] mt-1 transition-colors',
                  isActive ? 'text-ink font-medium' : 'text-ink-faint'
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export { BottomNav };
export type { BottomNavProps };

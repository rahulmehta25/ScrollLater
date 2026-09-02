'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Bookmark,
  Search,
  Inbox,
  Calendar,
  CheckCircle,
  Archive,
  Settings,
  Plus,
  ChevronDown,
  Command,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Collection {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface SidebarProps {
  collections?: Collection[];
  itemCounts?: {
    all: number;
    inbox: number;
    scheduled: number;
    completed: number;
    archived: number;
  };
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onAddClick?: () => void;
  onCommandPalette?: () => void;
  activeCollection?: string;
  onCollectionChange?: (id: string) => void;
  className?: string;
}

const defaultCounts = {
  all: 0,
  inbox: 0,
  scheduled: 0,
  completed: 0,
  archived: 0,
};

/* eslint-disable @typescript-eslint/no-unused-vars */
function Sidebar({
  collections = [],
  itemCounts = defaultCounts,
  searchQuery = '',
  onSearchChange,
  onAddClick,
  onCommandPalette,
  activeCollection = 'all',
  onCollectionChange,
  className,
}: SidebarProps) {
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const pathname = usePathname();
  const [collectionsExpanded, setCollectionsExpanded] = useState(true);

  const navItems = [
    { id: 'all', label: 'All Items', icon: Bookmark, count: itemCounts.all },
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: itemCounts.inbox },
    { id: 'scheduled', label: 'Scheduled', icon: Calendar, count: itemCounts.scheduled },
    { id: 'completed', label: 'Completed', icon: CheckCircle, count: itemCounts.completed },
    { id: 'archived', label: 'Archive', icon: Archive, count: itemCounts.archived },
  ];

  return (
    <aside
      className={cn(
        'hidden lg:flex w-56 flex-col border-r border-paper-deep bg-paper relative z-20',
        className
      )}
    >
      <div className="p-5 border-b border-paper-deep">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-ink rounded-md flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-paper" strokeWidth={2.25} />
          </div>
          <span className="font-serif text-lg tracking-display text-ink">
            ScrollLater
          </span>
        </Link>
      </div>

      <div className="p-4 space-y-2">
        <button
          onClick={onCommandPalette}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-subtle bg-paper-muted/60 border border-paper-deep rounded-lg hover:bg-paper-muted transition-colors duration-craft"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-ink-faint bg-paper border border-paper-deep rounded">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>

        <button
          onClick={onAddClick}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-paper bg-ink rounded-full transition-opacity duration-craft hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Save Link
        </button>
      </div>

      <nav className="flex-1 px-3 py-1 overflow-y-auto">
        <p className="px-2 py-2 text-[11px] font-medium text-ink-faint uppercase tracking-[0.14em]">
          Library
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeCollection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onCollectionChange?.(item.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors duration-craft relative',
                isActive
                  ? 'text-ink font-medium bg-paper-muted'
                  : 'text-ink-muted hover:bg-paper-muted/70 hover:text-ink'
              )}
            >
              <Icon className="w-4 h-4 relative z-10" />
              <span className="flex-1 text-left relative z-10">{item.label}</span>
              {item.count > 0 && (
                <span className="text-xs text-ink-faint tabular-nums relative z-10">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}

        <div className="my-3 border-t border-paper-deep" />

        <button
          onClick={() => setCollectionsExpanded(!collectionsExpanded)}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-medium text-ink-faint uppercase tracking-[0.14em] hover:text-ink-subtle transition-colors duration-craft"
        >
          <span>Collections</span>
          <ChevronDown
            className={cn(
              'w-3 h-3 transition-transform duration-craft',
              collectionsExpanded && 'rotate-180'
            )}
          />
        </button>

        {collectionsExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.18 }}
          >
            {collections.map((col) => {
              const isActive = activeCollection === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => onCollectionChange?.(col.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors duration-craft',
                    isActive
                      ? 'bg-paper-muted text-ink font-medium'
                      : 'text-ink-muted hover:bg-paper-muted/70 hover:text-ink'
                  )}
                >
                  <span className="w-1 h-1 rounded-full bg-ink-faint" />
                  <span className="flex-1 text-left truncate">{col.name}</span>
                  {col.count > 0 && (
                    <span className="text-xs text-ink-faint tabular-nums">
                      {col.count}
                    </span>
                  )}
                </button>
              );
            })}
            {collections.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-ink-faint italic">
                No collections yet
              </p>
            )}
          </motion.div>
        )}
      </nav>

      <div className="relative z-30 p-4 pb-8 border-t border-paper-deep bg-paper">
        <Link
          href="/dashboard/settings"
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm transition-colors duration-craft',
            pathname === '/dashboard/settings'
              ? 'bg-paper-muted text-ink font-medium'
              : 'text-ink-muted hover:bg-paper-muted/70 hover:text-ink'
          )}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}

export { Sidebar };
export type { SidebarProps, Collection };

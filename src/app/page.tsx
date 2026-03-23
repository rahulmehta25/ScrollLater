'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Calendar,
  Sparkles,
  LayoutGrid,
  List,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  demoItems,
  collections,
} from '@/lib/demo-data';
import { Sidebar } from '@/components/navigation/Sidebar';
import { BottomNav } from '@/components/navigation/BottomNav';
import { MobileHeader } from '@/components/navigation/MobileHeader';
import { CommandPalette, useCommandPalette } from '@/components/ui/CommandPalette';
import { QuickAddModal } from '@/components/features/QuickAddModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard, SkeletonCardGrid } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ScrollProgress } from '@/components/ui/ScrollProgress';
import {
  ContentCard,
  ContentCardGrid,
  SchedulePanel,
  DigestPanel,
  containerVariants,
  gridContainerVariants,
} from '@/components/home';

const contentTypeFilters: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'article', label: 'Articles' },
  { id: 'video', label: 'Videos' },
  { id: 'tweet', label: 'Tweets' },
  { id: 'reddit', label: 'Reddit' },
];

export default function Home() {
  const router = useRouter();
  const { success } = useToast();
  const { open: commandOpen, setOpen: setCommandOpen } = useCommandPalette();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [activeCollection, setActiveCollection] = useState('all');
  const [activeType, setActiveType] = useState('all');
  const [searchQuery] = useState('');
  const [rightTab, setRightTab] = useState<'schedule' | 'digest'>('digest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [mobileTab, setMobileTab] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of demoItems) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, []);

  const sidebarItemCounts = useMemo(() => ({
    all: demoItems.length,
    inbox: demoItems.filter((i) => !i.isRead).length,
    scheduled: demoItems.filter((i) => i.scheduledDate).length,
    completed: demoItems.filter((i) => i.isRead).length,
    archived: 0,
  }), []);

  const sidebarCollections = useMemo(() =>
    collections.map((col) => ({
      id: col.id,
      name: col.name,
      color: col.dotColor.replace('bg-', '').replace('-500', ''),
      count: itemCounts[col.id] || 0,
    }))
  , [itemCounts]);

  const filteredItems = useMemo(() => {
    return demoItems.filter((item) => {
      if (activeCollection === 'unread' && item.isRead) return false;
      if (activeCollection === 'inbox' && item.isRead) return false;
      if (activeCollection === 'scheduled' && !item.scheduledDate) return false;
      if (activeCollection === 'completed' && !item.isRead) return false;
      if (activeCollection !== 'all' && activeCollection !== 'unread' && activeCollection !== 'inbox' && activeCollection !== 'scheduled' && activeCollection !== 'completed' && item.category !== activeCollection) return false;
      if (activeType !== 'all' && item.type !== activeType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q) ||
          item.tags.some((t) => t.includes(q)) ||
          item.excerpt.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeCollection, activeType, searchQuery]);

  const totalReadTime = filteredItems.reduce((s, i) => s + i.readTimeMinutes, 0);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSaveLink = (data: { url: string }) => {
    success('Link saved', 'Added to your reading list');
  };

  const handleMobileTabChange = (tab: string) => {
    setMobileTab(tab);
    if (tab === 'settings') {
      router.push('/dashboard/settings');
    } else {
      setActiveCollection(tab);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="h-screen flex bg-gray-50"
    >
      <ScrollProgress />
      <Sidebar
        collections={sidebarCollections}
        itemCounts={sidebarItemCounts}
        activeCollection={activeCollection}
        onCollectionChange={setActiveCollection}
        onAddClick={() => setQuickAddOpen(true)}
        onCommandPalette={() => setCommandOpen(true)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <MobileHeader onSearchClick={() => setCommandOpen(true)} />

        <div className="bg-white border-b border-gray-200">
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
              {contentTypeFilters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveType(f.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                    activeType === f.id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-400">
                {filteredItems.length} items · {Math.floor(totalReadTime / 60)}h {totalReadTime % 60}m
              </span>
              <div className="w-px h-4 bg-gray-200" />
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  viewMode === 'list' ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  viewMode === 'grid' ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="lg:hidden px-4 pb-3">
            <button
              onClick={() => setCommandOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Search items...</span>
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-white border border-gray-200 rounded">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-4">
          {isLoading ? (
            viewMode === 'list' ? (
              <div className="max-w-3xl mx-auto space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <SkeletonCardGrid key={i} />
                ))}
              </div>
            )
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={<Search className="w-6 h-6" />}
              title="No items found"
              description="Try adjusting your filters or save a new link to get started."
              action={{
                label: 'Save Link',
                onClick: () => setQuickAddOpen(true),
              }}
            />
          ) : viewMode === 'list' ? (
            <motion.div
              layout
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="max-w-3xl mx-auto space-y-2"
            >
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              layout
              variants={gridContainerVariants}
              initial="hidden"
              animate="visible"
              className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-3"
            >
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => (
                  <ContentCardGrid key={item.id} item={item} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>

      <aside className="hidden xl:flex w-80 flex-col border-l border-gray-200 bg-white">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setRightTab('schedule')}
            className={cn(
              'flex-1 py-3 text-xs font-medium text-center transition-colors border-b-2',
              rightTab === 'schedule'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Calendar className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
            Schedule
          </button>
          <button
            onClick={() => setRightTab('digest')}
            className={cn(
              'flex-1 py-3 text-xs font-medium text-center transition-colors border-b-2',
              rightTab === 'digest'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Sparkles className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
            AI Digest
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={rightTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-hidden"
          >
            {rightTab === 'schedule' ? (
              <SchedulePanel items={demoItems} />
            ) : (
              <DigestPanel items={demoItems} />
            )}
          </motion.div>
        </AnimatePresence>
      </aside>

      <BottomNav
        activeTab={mobileTab}
        onTabChange={handleMobileTabChange}
        onAddClick={() => setQuickAddOpen(true)}
      />

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onSaveLink={() => setQuickAddOpen(true)}
        onNavigate={(path) => router.push(path)}
      />

      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSave={handleSaveLink}
      />
    </motion.div>
  );
}

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
  Archive,
  Inbox,
  Bookmark,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  demoItems,
  collections,
  type DemoItem,
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
  ItemDetailModal,
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

function getEmptyState(collection: string, type: string) {
  if (collection === 'archived') {
    return {
      icon: <Archive className="w-6 h-6" />,
      title: 'Archive is empty',
      description: 'Finished items you archive will land here. Keep exploring your library for now.',
      actionLabel: 'Browse library',
      actionKey: 'all' as const,
    };
  }
  if (collection === 'completed') {
    return {
      icon: <Bookmark className="w-6 h-6" />,
      title: 'No completed items yet',
      description: 'Mark something as read from an item detail view to see it here.',
      actionLabel: 'Browse inbox',
      actionKey: 'inbox' as const,
    };
  }
  if (collection === 'scheduled') {
    return {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Nothing scheduled',
      description: 'Open any item and tap Schedule to plan a reading slot.',
      actionLabel: 'Browse library',
      actionKey: 'all' as const,
    };
  }
  if (collection === 'inbox') {
    return {
      icon: <Inbox className="w-6 h-6" />,
      title: 'Inbox zero',
      description: 'You are caught up. Save a new link or browse collections.',
      actionLabel: 'Save link',
      actionKey: 'save' as const,
    };
  }
  if (type !== 'all') {
    return {
      icon: <Search className="w-6 h-6" />,
      title: `No ${type}s here`,
      description: 'Try another filter, or save a link that matches this type.',
      actionLabel: 'Clear filters',
      actionKey: 'clear' as const,
    };
  }
  return {
    icon: <Search className="w-6 h-6" />,
    title: 'No items found',
    description: 'Try adjusting your filters or save a new link to get started.',
    actionLabel: 'Save link',
    actionKey: 'save' as const,
  };
}

export default function Home() {
  const router = useRouter();
  const { success, info } = useToast();
  const { open: commandOpen, setOpen: setCommandOpen } = useCommandPalette();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [items, setItems] = useState<DemoItem[]>(demoItems);
  const [activeCollection, setActiveCollection] = useState('all');
  const [activeType, setActiveType] = useState('all');
  const [searchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [mobileTab, setMobileTab] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<DemoItem | null>(null);
  const [mobilePanel, setMobilePanel] = useState<'digest' | 'schedule' | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [items]);

  const sidebarItemCounts = useMemo(() => ({
    all: items.length,
    inbox: items.filter((i) => !i.isRead).length,
    scheduled: items.filter((i) => i.scheduledDate).length,
    completed: items.filter((i) => i.isRead).length,
    archived: 0,
  }), [items]);

  const sidebarCollections = useMemo(() =>
    collections.map((col) => ({
      id: col.id,
      name: col.name,
      color: col.hex,
      count: itemCounts[col.id] || 0,
    }))
  , [itemCounts]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeCollection === 'unread' && item.isRead) return false;
      if (activeCollection === 'inbox' && item.isRead) return false;
      if (activeCollection === 'scheduled' && !item.scheduledDate) return false;
      if (activeCollection === 'completed' && !item.isRead) return false;
      if (activeCollection === 'archived') return false;
      if (
        activeCollection !== 'all' &&
        activeCollection !== 'unread' &&
        activeCollection !== 'inbox' &&
        activeCollection !== 'scheduled' &&
        activeCollection !== 'completed' &&
        activeCollection !== 'archived' &&
        item.category !== activeCollection
      ) {
        return false;
      }
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
  }, [items, activeCollection, activeType, searchQuery]);

  const totalReadTime = filteredItems.reduce((s, i) => s + i.readTimeMinutes, 0);

  const handleSaveLink = (data: { url: string; collection?: string; scheduledFor?: string }) => {
    const host = (() => {
      try {
        return new URL(data.url).hostname.replace(/^www\./, '');
      } catch {
        return 'saved.link';
      }
    })();

    const type =
      data.url.includes('youtube') || data.url.includes('youtu.be')
        ? 'video'
        : data.url.includes('reddit.com')
        ? 'reddit'
        : data.url.includes('twitter.com') || data.url.includes('x.com')
        ? 'tweet'
        : 'article';

    const scheduleMap: Record<string, string> = {
      Today: '2026-03-07',
      Tomorrow: '2026-03-08',
      'This Weekend': '2026-03-08',
      'Next Week': '2026-03-10',
    };

    const newItem: DemoItem = {
      id: `local-${Date.now()}`,
      type,
      title: host,
      source: host,
      excerpt: 'Just saved. Open this card to review details, schedule reading time, or mark it done.',
      savedAgo: 'Just now',
      readTimeMinutes: type === 'video' ? 12 : 5,
      category: data.collection || 'tech',
      tags: ['saved', 'demo'],
      scheduledDate: data.scheduledFor ? scheduleMap[data.scheduledFor] || null : null,
      isRead: false,
    };

    setItems((prev) => [newItem, ...prev]);
    setActiveCollection('all');
    setActiveType('all');
    setMobileTab('all');
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

  const handleEmptyAction = (actionKey: 'all' | 'inbox' | 'save' | 'clear') => {
    if (actionKey === 'save') {
      setQuickAddOpen(true);
      return;
    }
    if (actionKey === 'clear') {
      setActiveType('all');
      setActiveCollection('all');
      setMobileTab('all');
      return;
    }
    setActiveCollection(actionKey);
    setMobileTab(actionKey);
    setActiveType('all');
  };

  const handleMarkRead = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: !item.isRead } : item))
    );
    setSelectedItem((prev) =>
      prev && prev.id === id ? { ...prev, isRead: !prev.isRead } : prev
    );
    success('Updated', 'Reading status saved');
  };

  const handleScheduleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, scheduledDate: item.scheduledDate || '2026-03-08' } : item
      )
    );
    setSelectedItem((prev) =>
      prev && prev.id === id
        ? { ...prev, scheduledDate: prev.scheduledDate || '2026-03-08' }
        : prev
    );
    success('Scheduled', 'Added to tomorrow reading block');
  };

  const handleCategorySelect = (categoryId: string) => {
    setActiveCollection(categoryId);
    setActiveType('all');
    setMobileTab('all');
    setMobilePanel(null);
    info('Filtered library', `Showing ${collections.find((c) => c.id === categoryId)?.name || categoryId}`);
  };

  const empty = getEmptyState(activeCollection, activeType);

  const digestPanel = (
    <DigestPanel
      items={items}
      onCategorySelect={handleCategorySelect}
      onGenerateReport={() =>
        success('Digest ready', 'Your full reading report is ready to share.')
      }
    />
  );

  const schedulePanel = (
    <SchedulePanel
      items={items}
      onItemClick={(item) => {
        setSelectedItem(item);
        setMobilePanel(null);
      }}
    />
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="h-screen flex bg-paper"
    >
      <ScrollProgress />
      <Sidebar
        collections={sidebarCollections}
        itemCounts={sidebarItemCounts}
        activeCollection={activeCollection}
        onCollectionChange={(id) => {
          setActiveCollection(id);
          setMobileTab(id === 'inbox' || id === 'scheduled' ? id : 'all');
        }}
        onAddClick={() => setQuickAddOpen(true)}
        onCommandPalette={() => setCommandOpen(true)}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-paper">
        <MobileHeader onSearchClick={() => setCommandOpen(true)} />

        <div className="border-b border-paper-deep bg-paper">
          <div className="mx-auto max-w-3xl px-5 sm:px-8 pt-8 pb-5">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-subtle">Your library</p>
            <h1 className="mt-2 font-serif text-3xl tracking-display text-ink sm:text-4xl">
              Reading for later
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              {filteredItems.length} items / {Math.floor(totalReadTime / 60)}h {totalReadTime % 60}m set aside
            </p>
          </div>

          <div className="mx-auto max-w-3xl px-5 sm:px-8 pb-4 flex items-center gap-2">
            <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
              {contentTypeFilters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveType(f.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors duration-craft',
                    activeType === f.id
                      ? 'bg-ink text-paper'
                      : 'text-ink-muted hover:bg-paper-muted'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => {
                  setMobilePanel('digest');
                }}
                className="p-1.5 rounded-lg text-ink-muted hover:bg-paper-muted transition-colors duration-craft"
                aria-label="Open AI digest"
                title="AI Digest"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setMobilePanel('schedule');
                }}
                className="p-1.5 rounded-lg text-ink-muted hover:bg-paper-muted transition-colors duration-craft"
                aria-label="Open schedule"
                title="Schedule"
              >
                <Calendar className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-lg transition-colors duration-craft',
                  viewMode === 'list' ? 'bg-paper-muted text-ink' : 'text-ink-faint hover:text-ink-muted'
                )}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-lg transition-colors duration-craft',
                  viewMode === 'grid' ? 'bg-paper-muted text-ink' : 'text-ink-faint hover:text-ink-muted'
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="lg:hidden px-5 pb-4">
            <button
              onClick={() => setCommandOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-ink-subtle bg-paper-muted/50 border border-paper-deep rounded-lg"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Search items...</span>
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-ink-faint bg-paper border border-paper-deep rounded">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-24 lg:pb-8">
          <div className="band band-warm border-b border-paper-deep">
            <div className="mx-auto max-w-3xl px-5 sm:px-8 py-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-ink-subtle">Today</p>
                <p className="mt-1 font-serif text-xl tracking-display text-ink">
                  A short digest of what waits for you.
                </p>
              </div>
              <button
                onClick={() => {
                  setMobilePanel('digest');
                }}
                className="link-underline text-sm self-start sm:self-auto"
              >
                Open digest
              </button>
            </div>
          </div>

          <div className="mx-auto max-w-3xl px-5 sm:px-8 pt-2">
            {isLoading ? (
              viewMode === 'list' ? (
                <div className="space-y-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  {[1, 2, 3, 4].map((i) => (
                    <SkeletonCardGrid key={i} />
                  ))}
                </div>
              )
            ) : filteredItems.length === 0 ? (
              <div className="band border-y border-paper-deep my-8">
                <EmptyState
                  icon={empty.icon}
                  title={empty.title}
                  description={empty.description}
                  action={{
                    label: empty.actionLabel,
                    onClick: () => handleEmptyAction(empty.actionKey),
                  }}
                  secondaryAction={
                    empty.actionKey !== 'save'
                      ? {
                          label: 'Save link',
                          onClick: () => setQuickAddOpen(true),
                        }
                      : {
                          label: 'View digest',
                          onClick: () => setMobilePanel('digest'),
                        }
                  }
                />
              </div>
            ) : viewMode === 'list' ? (
              <motion.div
                layout
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item) => (
                    <ContentCard
                      key={item.id}
                      item={item}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                layout
                variants={gridContainerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 gap-x-10"
              >
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item) => (
                    <ContentCardGrid
                      key={item.id}
                      item={item}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {mobilePanel && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
              aria-label="Close panel"
              onClick={() => setMobilePanel(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-paper border-l border-paper-deep flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-paper-deep">
                <p className="font-serif text-base tracking-display text-ink">
                  {mobilePanel === 'digest' ? 'AI Digest' : 'Schedule'}
                </p>
                <button
                  onClick={() => setMobilePanel(null)}
                  className="p-1.5 rounded-lg text-ink-faint hover:text-ink-muted hover:bg-paper-muted transition-colors duration-craft"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {mobilePanel === 'digest' ? digestPanel : schedulePanel}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        onOpenDigest={() => {
          setMobilePanel('digest');
        }}
        onOpenSchedule={() => {
          setMobilePanel('schedule');
        }}
        onBrowseCollections={() => {
          setActiveCollection('ai');
          setMobileTab('all');
        }}
        recentItems={items.slice(0, 5).map((item) => ({
          id: item.id,
          title: item.title,
          type: item.type,
        }))}
        onSelectRecent={(id) => {
          const item = items.find((i) => i.id === id);
          if (item) setSelectedItem(item);
        }}
      />

      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSave={handleSaveLink}
      />

      <ItemDetailModal
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onMarkRead={handleMarkRead}
        onSchedule={handleScheduleItem}
      />
    </motion.div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Bookmark,
  Calendar,
  Clock,
  FileText,
  Play,
  MessageSquare,
  Hash,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Folder,
  ExternalLink,
  TrendingUp,
  BookOpen,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  demoItems,
  collections,
  categoryThumbBg,
  categoryThumbIcon,
  categoryBadge,
  digestCategories,
  scheduleDays,
  type DemoItem,
  type ContentType,
} from '@/lib/demo-data';

const contentTypeFilters: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'article', label: 'Articles' },
  { id: 'video', label: 'Videos' },
  { id: 'tweet', label: 'Tweets' },
  { id: 'reddit', label: 'Reddit' },
];

function TypeIcon({ type, className }: { type: ContentType; className?: string }) {
  const icons: Record<ContentType, React.ReactNode> = {
    article: <FileText className={className} />,
    video: <Play className={className} />,
    tweet: <MessageSquare className={className} />,
    reddit: <Hash className={className} />,
  };
  return <>{icons[type]}</>;
}

function TypeLabel({ type }: { type: ContentType }) {
  const labels: Record<ContentType, string> = {
    article: 'Article',
    video: 'Video',
    tweet: 'Tweet',
    reddit: 'Reddit',
  };
  const colors: Record<ContentType, string> = {
    article: 'bg-gray-100 text-gray-600',
    video: 'bg-red-50 text-red-600',
    tweet: 'bg-sky-50 text-sky-600',
    reddit: 'bg-orange-50 text-orange-600',
  };
  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide', colors[type])}>
      {labels[type]}
    </span>
  );
}

function Sidebar({
  activeCollection,
  onCollectionChange,
  itemCounts,
  searchQuery,
  onSearchChange,
}: {
  activeCollection: string;
  onCollectionChange: (id: string) => void;
  itemCounts: Record<string, number>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  return (
    <aside className="hidden lg:flex w-60 flex-col border-r border-gray-200 bg-white">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Bookmark className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold text-gray-900 tracking-tight">ScrollLater</span>
        </div>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 placeholder:text-gray-400"
          />
        </div>
      </div>

      <nav className="flex-1 px-2 py-1 overflow-y-auto">
        <p className="px-2 py-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Library</p>
        <button
          onClick={() => onCollectionChange('all')}
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
            activeCollection === 'all'
              ? 'bg-orange-50 text-orange-700 font-medium'
              : 'text-gray-700 hover:bg-gray-50'
          )}
        >
          <Bookmark className="w-4 h-4" />
          <span className="flex-1 text-left">All Items</span>
          <span className="text-xs text-gray-400 tabular-nums">{demoItems.length}</span>
        </button>

        <button
          onClick={() => onCollectionChange('unread')}
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
            activeCollection === 'unread'
              ? 'bg-orange-50 text-orange-700 font-medium'
              : 'text-gray-700 hover:bg-gray-50'
          )}
        >
          <BookOpen className="w-4 h-4" />
          <span className="flex-1 text-left">Unread</span>
          <span className="text-xs text-gray-400 tabular-nums">{demoItems.filter((i) => !i.isRead).length}</span>
        </button>

        <div className="my-2 border-t border-gray-100" />

        <p className="px-2 py-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">Collections</p>
        {collections.map((col) => (
          <button
            key={col.id}
            onClick={() => onCollectionChange(col.id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
              activeCollection === col.id
                ? 'bg-orange-50 text-orange-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            )}
          >
            <span className={cn('w-2.5 h-2.5 rounded-full', col.dotColor)} />
            <span className="flex-1 text-left">{col.name}</span>
            <span className="text-xs text-gray-400 tabular-nums">{itemCounts[col.id] || 0}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2 px-2.5 py-2 text-sm text-gray-500">
          <Folder className="w-4 h-4" />
          <span>6 collections</span>
        </div>
      </div>
    </aside>
  );
}

function ContentCard({ item }: { item: DemoItem }) {
  return (
    <div className={cn(
      'group flex gap-3.5 p-3.5 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer',
      item.isRead && 'opacity-60'
    )}>
      <div
        className={cn(
          'flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center',
          categoryThumbBg[item.category]
        )}
      >
        <TypeIcon type={item.type} className={cn('w-6 h-6', categoryThumbIcon[item.category])} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
            {item.title}
          </h3>
          <ExternalLink className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
        </div>

        <p className="mt-1 text-xs text-gray-500 line-clamp-1">{item.excerpt}</p>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <TypeLabel type={item.type} />
          <span className="text-[11px] text-gray-400">{item.source}</span>
          <span className="text-gray-200">|</span>
          <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {item.readTimeMinutes} min
          </span>
          <span className="text-gray-200">|</span>
          <span className="text-[11px] text-gray-400">{item.savedAgo}</span>
          {item.scheduledDate && (
            <>
              <span className="text-gray-200">|</span>
              <span className="text-[11px] text-orange-500 flex items-center gap-0.5 font-medium">
                <Calendar className="w-3 h-3" />
                {scheduleDays.find((d) => d.date === item.scheduledDate)?.label || item.scheduledDate}
              </span>
            </>
          )}
        </div>

        <div className="mt-1.5 flex items-center gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded text-[10px]">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentCardGrid({ item }: { item: DemoItem }) {
  return (
    <div className={cn(
      'group bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer overflow-hidden',
      item.isRead && 'opacity-60'
    )}>
      <div className={cn('h-28 flex items-center justify-center', categoryThumbBg[item.category])}>
        <TypeIcon type={item.type} className={cn('w-10 h-10', categoryThumbIcon[item.category])} />
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <TypeLabel type={item.type} />
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', categoryBadge[item.category])}>
            {collections.find((c) => c.id === item.category)?.name}
          </span>
        </div>
        <h3 className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
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
    </div>
  );
}

function SchedulePanel({ items }: { items: DemoItem[] }) {
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
        <div className="flex gap-3">
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
                  day.label === 'Today' ? 'text-orange-600' : 'text-gray-500'
                )}
              >
                {day.dayName}
              </span>
              <span
                className={cn(
                  'text-xs',
                  day.label === 'Today' ? 'text-orange-600 font-semibold' : 'text-gray-400'
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
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors cursor-pointer group"
                  >
                    <div
                      className={cn(
                        'w-1 h-8 rounded-full flex-shrink-0',
                        collections.find((c) => c.id === item.category)?.dotColor
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-800 truncate group-hover:text-orange-700">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {item.readTimeMinutes} min &middot; {item.source}
                      </p>
                    </div>
                  </div>
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

function DigestPanel({ items }: { items: DemoItem[] }) {
  const totalItems = items.length;
  const totalMinutes = items.reduce((s, i) => s + i.readTimeMinutes, 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-900">AI Smart Digest</h3>
        </div>
        <p className="text-xs text-gray-500">Daily briefing &middot; March 7, 2026</p>
        <div className="mt-3 flex gap-3">
          <div className="text-center">
            <p className="text-xl font-semibold text-gray-900">{totalItems}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Items</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-gray-900">{hours}h {mins}m</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total time</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-gray-900">6</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Topics</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <Lightbulb className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-semibold text-orange-700">Top Recommendation</span>
          </div>
          <p className="text-xs text-orange-800">
            Start with the 3 AI articles -- trending topic this week with major developments in safety and capability.
          </p>
        </div>

        {digestCategories.map((cat) => {
          const col = collections.find((c) => c.id === cat.category);
          return (
            <div key={cat.category} className="border border-gray-100 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                <span className={cn('w-2 h-2 rounded-full', col?.dotColor)} />
                <span className="text-xs font-medium text-gray-800">{cat.label}</span>
                <span className="ml-auto text-[10px] text-gray-400">
                  {cat.itemCount} items &middot; {cat.totalMinutes} min
                </span>
              </div>
              <div className="px-3 py-2.5 space-y-1.5">
                <div className="flex items-start gap-1.5">
                  <TrendingUp className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-gray-600">
                    <span className="font-medium text-gray-700">Key theme:</span> {cat.keyTheme}
                  </p>
                </div>
                <div className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-gray-600">{cat.keyTakeaway}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-gray-100">
        <button className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors">
          Generate Full Report
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeCollection, setActiveCollection] = useState('all');
  const [activeType, setActiveType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rightTab, setRightTab] = useState<'schedule' | 'digest'>('digest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of demoItems) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, []);

  const filteredItems = useMemo(() => {
    return demoItems.filter((item) => {
      if (activeCollection === 'unread' && item.isRead) return false;
      if (activeCollection !== 'all' && activeCollection !== 'unread' && item.category !== activeCollection) return false;
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

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar
        activeCollection={activeCollection}
        onCollectionChange={setActiveCollection}
        itemCounts={itemCounts}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-2.5 p-3 bg-white border-b border-gray-200">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
            <Bookmark className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold text-gray-900">ScrollLater</span>
        </div>

        {/* Top bar */}
        <div className="bg-white border-b border-gray-200">
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="flex items-center gap-1 flex-1 overflow-x-auto">
              {contentTypeFilters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveType(f.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                    activeType === f.id
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-400">
                {filteredItems.length} items &middot; {Math.floor(totalReadTime / 60)}h {totalReadTime % 60}m
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

          {/* Mobile search */}
          <div className="lg:hidden px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Search className="w-8 h-8 mb-2" />
              <p className="text-sm">No items match your filters</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="max-w-3xl mx-auto space-y-2">
              {filteredItems.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredItems.map((item) => (
                <ContentCardGrid key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Right panel */}
      <aside className="hidden xl:flex w-80 flex-col border-l border-gray-200 bg-white">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setRightTab('schedule')}
            className={cn(
              'flex-1 py-3 text-xs font-medium text-center transition-colors border-b-2',
              rightTab === 'schedule'
                ? 'border-orange-500 text-orange-600'
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
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Sparkles className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
            AI Digest
          </button>
        </div>

        {rightTab === 'schedule' ? (
          <SchedulePanel items={demoItems} />
        ) : (
          <DigestPanel items={demoItems} />
        )}
      </aside>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Lightbulb, TrendingUp, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { collections, digestCategories, type DemoItem } from '@/lib/demo-data';
import { Button } from '@/components/ui/Button';

interface DigestPanelProps {
  items: DemoItem[];
  onCategorySelect?: (categoryId: string) => void;
  onGenerateReport?: () => void;
}

export function DigestPanel({ items, onCategorySelect, onGenerateReport }: DigestPanelProps) {
  const [generated, setGenerated] = useState(false);
  const totalItems = items.length;
  const totalMinutes = items.reduce((s, i) => s + i.readTimeMinutes, 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const handleGenerate = () => {
    setGenerated(true);
    onGenerateReport?.();
    setTimeout(() => setGenerated(false), 2500);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-paper-deep">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-terracotta-50 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-terracotta-600" />
          </div>
          <h3 className="font-serif text-sm tracking-display text-ink">AI Smart Digest</h3>
        </div>
        <p className="text-xs text-ink-subtle">
          {`Daily briefing / ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
        </p>
        <div className="mt-3.5 flex gap-5">
          <div>
            <p className="font-serif text-xl tracking-display text-ink">{totalItems}</p>
            <p className="text-[10px] text-ink-faint uppercase tracking-[0.12em] mt-0.5">Items</p>
          </div>
          <div>
            <p className="font-serif text-xl tracking-display text-ink">{hours}h {mins}m</p>
            <p className="text-[10px] text-ink-faint uppercase tracking-[0.12em] mt-0.5">Total time</p>
          </div>
          <div>
            <p className="font-serif text-xl tracking-display text-ink">{digestCategories.length}</p>
            <p className="text-[10px] text-ink-faint uppercase tracking-[0.12em] mt-0.5">Topics</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <div className="p-3.5 bg-terracotta-50/70 border border-terracotta-100 rounded-2xl">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-terracotta-600" />
            <span className="text-xs font-semibold text-ink">Top recommendation</span>
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            Start with the 3 AI articles. It is the trending topic this week, with major
            developments in safety and capability.
          </p>
          <button
            onClick={() => onCategorySelect?.('ai')}
            className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-terracotta-700 hover:text-terracotta-800 transition-colors"
          >
            Browse AI collection
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {digestCategories.map((cat) => {
          const col = collections.find((c) => c.id === cat.category);
          return (
            <motion.button
              type="button"
              key={cat.category}
              whileHover={{ scale: 1.01 }}
              onClick={() => onCategorySelect?.(cat.category)}
              className="w-full text-left border border-paper-deep rounded-2xl overflow-hidden cursor-pointer hover:border-ink-faint hover:shadow-soft transition-all bg-paper-raised"
            >
              <div className="flex items-center gap-2 px-3 py-2.5 bg-paper-soft border-b border-paper-deep">
                <span className={cn('w-2 h-2 rounded-full', col?.dotColor)} />
                <span className="text-xs font-medium text-ink">{cat.label}</span>
                <span className="ml-auto text-[10px] text-ink-faint">
                  {cat.itemCount} items / {cat.totalMinutes} min
                </span>
              </div>
              <div className="px-3 py-2.5 space-y-1.5">
                <div className="flex items-start gap-1.5">
                  <TrendingUp className="w-3 h-3 text-ink-faint mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-ink-muted leading-relaxed">
                    <span className="font-medium text-ink">Key theme:</span> {cat.keyTheme}
                  </p>
                </div>
                <div className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-ink-faint mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-ink-muted leading-relaxed">{cat.keyTakeaway}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="p-3 border-t border-paper-deep">
        <Button
          className="w-full"
          size="sm"
          onClick={handleGenerate}
          icon={generated ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
        >
          {generated ? 'Report ready' : 'Generate full report'}
        </Button>
      </div>
    </div>
  );
}

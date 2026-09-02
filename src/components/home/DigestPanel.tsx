'use client';

import { useState } from 'react';
import { Sparkles, Lightbulb, ArrowRight, CheckCircle2 } from 'lucide-react';
import { digestCategories, type DemoItem } from '@/lib/demo-data';
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
    <div className="h-full flex flex-col bg-paper">
      <div className="px-5 py-5 border-b border-paper-deep">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-ink-muted" />
          <h3 className="font-serif text-base tracking-display text-ink">AI Smart Digest</h3>
        </div>
        <p className="text-xs text-ink-subtle">
          {`Daily briefing / ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
        </p>
        <div className="mt-4 flex gap-6">
          <div>
            <p className="font-serif text-2xl tracking-display text-ink">{totalItems}</p>
            <p className="text-[10px] text-ink-faint uppercase tracking-[0.12em] mt-0.5">Items</p>
          </div>
          <div>
            <p className="font-serif text-2xl tracking-display text-ink">{hours}h {mins}m</p>
            <p className="text-[10px] text-ink-faint uppercase tracking-[0.12em] mt-0.5">Total time</p>
          </div>
          <div>
            <p className="font-serif text-2xl tracking-display text-ink">{digestCategories.length}</p>
            <p className="text-[10px] text-ink-faint uppercase tracking-[0.12em] mt-0.5">Topics</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="pb-5 mb-2 border-b border-paper-deep">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-ink-muted" />
            <span className="text-xs font-medium text-ink">Top recommendation</span>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            Start with the 3 AI articles. It is the trending topic this week, with major
            developments in safety and capability.
          </p>
          <button
            onClick={() => onCategorySelect?.('ai')}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium link-underline"
          >
            Browse AI collection
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="divide-y divide-paper-deep">
          {digestCategories.map((cat) => (
            <button
              type="button"
              key={cat.category}
              onClick={() => onCategorySelect?.(cat.category)}
              className="w-full text-left py-4 transition-opacity duration-craft hover:opacity-75"
            >
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="font-serif text-lg tracking-display text-ink">{cat.label}</span>
                <span className="text-[10px] text-ink-faint uppercase tracking-[0.1em] shrink-0">
                  {cat.itemCount} / {cat.totalMinutes}m
                </span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                <span className="text-ink">Theme:</span> {cat.keyTheme}
              </p>
              <p className="mt-1 text-xs text-ink-subtle leading-relaxed">{cat.keyTakeaway}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 border-t border-paper-deep">
        <Button
          className="w-full rounded-full"
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

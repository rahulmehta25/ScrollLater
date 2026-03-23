'use client';

import { motion } from 'framer-motion';
import { Sparkles, Lightbulb, TrendingUp, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { collections, digestCategories, type DemoItem } from '@/lib/demo-data';
import { Button } from '@/components/ui/Button';

export function DigestPanel({ items }: { items: DemoItem[] }) {
  const totalItems = items.length;
  const totalMinutes = items.reduce((s, i) => s + i.readTimeMinutes, 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">AI Smart Digest</h3>
        </div>
        <p className="text-xs text-gray-500">{`Daily briefing · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}</p>
        <div className="mt-3 flex gap-4">
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
        <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <Lightbulb className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-xs font-semibold text-gray-800">Top Recommendation</span>
          </div>
          <p className="text-xs text-gray-600">
            Start with the 3 AI articles — trending topic this week with major developments in safety and capability.
          </p>
        </div>

        {digestCategories.map((cat) => {
          const col = collections.find((c) => c.id === cat.category);
          return (
            <motion.div
              key={cat.category}
              whileHover={{ scale: 1.01 }}
              className="border border-gray-100 rounded-lg overflow-hidden cursor-pointer"
            >
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                <span className={cn('w-2 h-2 rounded-full', col?.dotColor)} />
                <span className="text-xs font-medium text-gray-800">{cat.label}</span>
                <span className="ml-auto text-[10px] text-gray-400">
                  {cat.itemCount} items · {cat.totalMinutes} min
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
            </motion.div>
          );
        })}
      </div>

      <div className="p-3 border-t border-gray-100">
        <Button className="w-full" size="sm">
          Generate Full Report
        </Button>
      </div>
    </div>
  );
}

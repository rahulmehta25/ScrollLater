'use client';

import Link from 'next/link';
import { BookOpen, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  title?: string;
  onSearchClick?: () => void;
  className?: string;
}

function MobileHeader({ title = 'ScrollLater', onSearchClick, className }: MobileHeaderProps) {
  return (
    <header
      className={cn(
        'lg:hidden sticky top-0 flex items-center justify-between px-4 h-14 bg-paper border-b border-paper-deep z-40',
        className
      )}
    >
      <Link href="/" className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-ink rounded-lg flex items-center justify-center">
          <BookOpen className="w-3.5 h-3.5 text-paper-raised" strokeWidth={2.25} />
        </div>
        <span className="font-serif text-base tracking-display text-ink">{title}</span>
      </Link>

      <button
        onClick={onSearchClick}
        className="p-2 rounded-xl text-ink-subtle hover:bg-paper-muted hover:text-ink transition-colors"
        aria-label="Search"
      >
        <Search className="w-5 h-5" />
      </button>
    </header>
  );
}

export { MobileHeader };
export type { MobileHeaderProps };

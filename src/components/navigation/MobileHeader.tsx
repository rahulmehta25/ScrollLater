'use client';

import { Bookmark, Search } from 'lucide-react';
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
        'lg:hidden sticky top-0 flex items-center justify-between px-4 h-14 bg-white border-b border-gray-200 z-30',
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
          <Bookmark className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-base font-semibold text-gray-900">{title}</span>
      </div>

      <button
        onClick={onSearchClick}
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Search className="w-5 h-5" />
      </button>
    </header>
  );
}

export { MobileHeader };
export type { MobileHeaderProps };

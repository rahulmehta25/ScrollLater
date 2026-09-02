'use client';

import { Clock, Calendar, Bookmark, CheckCircle2, ExternalLink } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  categoryThumbBg,
  categoryThumbIcon,
  categoryBadge,
  collections,
  scheduleDays,
  type DemoItem,
} from '@/lib/demo-data';
import { TypeIcon, TypeLabel } from './TypeBadge';

interface ItemDetailModalProps {
  item: DemoItem | null;
  open: boolean;
  onClose: () => void;
  onMarkRead?: (id: string) => void;
  onSchedule?: (id: string) => void;
}

export function ItemDetailModal({
  item,
  open,
  onClose,
  onMarkRead,
  onSchedule,
}: ItemDetailModalProps) {
  if (!item) return null;

  const collection = collections.find((c) => c.id === item.category);
  const scheduleLabel =
    scheduleDays.find((d) => d.date === item.scheduledDate)?.label || item.scheduledDate;

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader>
        <div className="flex items-start gap-3 pr-8">
          <div
            className={cn(
              'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center',
              categoryThumbBg[item.category]
            )}
          >
            <TypeIcon
              type={item.type}
              className={cn('w-5 h-5', categoryThumbIcon[item.category])}
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <TypeLabel type={item.type} />
              {collection && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-medium',
                    categoryBadge[item.category]
                  )}
                >
                  {collection.name}
                </span>
              )}
              {item.isRead && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                  Read
                </span>
              )}
            </div>
            <ModalTitle className="text-lg leading-snug">{item.title}</ModalTitle>
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-5">
        <p className="text-sm text-gray-600 leading-relaxed">{item.excerpt}</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
          <span className="font-medium text-gray-700">{item.source}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {item.readTimeMinutes} min
          </span>
          <span>Saved {item.savedAgo}</span>
          {item.scheduledDate && (
            <span className="flex items-center gap-1 font-medium text-gray-700">
              <Calendar className="w-3.5 h-3.5" />
              {scheduleLabel}
            </span>
          )}
        </div>

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-50 text-gray-600 rounded-md text-xs border border-gray-100"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-700 mb-1">Why this is in your library</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Saved from {item.source} and filed under {collection?.name || 'your library'}. Open
            the original when you are ready, or schedule a quiet reading slot.
          </p>
        </div>
      </ModalBody>

      <ModalFooter className="justify-between sm:justify-between flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const host = item.source.replace(/^@/, '').replace(/^r\//, 'reddit.com/r/');
            const url = host.includes('.') ? `https://${host}` : `https://www.google.com/search?q=${encodeURIComponent(item.title)}`;
            window.open(url, '_blank', 'noopener,noreferrer');
          }}
          icon={<ExternalLink className="w-3.5 h-3.5" />}
        >
          Open source
        </Button>
        <div className="flex items-center gap-2">
          {!item.scheduledDate && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSchedule?.(item.id)}
              icon={<Calendar className="w-3.5 h-3.5" />}
            >
              Schedule
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => onMarkRead?.(item.id)}
            icon={
              item.isRead ? (
                <Bookmark className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )
            }
          >
            {item.isRead ? 'Keep in inbox' : 'Mark as read'}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}

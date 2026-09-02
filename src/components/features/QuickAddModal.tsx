'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link as LinkIcon,
  Calendar,
  Loader2,
  Globe,
  FileText,
  Play,
  CheckCircle,
} from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { posthog } from '@/lib/posthog';

interface MetadataPreview {
  title: string;
  description: string;
  image?: string;
  siteName?: string;
  type: 'article' | 'video' | 'tweet' | 'reddit' | 'link';
  readTime?: number;
}

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (data: { url: string; collection?: string; scheduledFor?: string }) => void;
}

const collections = [
  { id: 'tech', name: 'Tech' },
  { id: 'ai', name: 'AI & ML' },
  { id: 'finance', name: 'Finance' },
  { id: 'design', name: 'Design' },
  { id: 'science', name: 'Science' },
  { id: 'productivity', name: 'Productivity' },
];

function QuickAddModal({ open, onClose, onSave }: QuickAddModalProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [metadata, setMetadata] = useState<MetadataPreview | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const detectUrlType = (url: string): MetadataPreview['type'] => {
    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) {
      return 'video';
    }
    if (url.includes('twitter.com') || url.includes('x.com')) {
      return 'tweet';
    }
    if (url.includes('reddit.com')) {
      return 'reddit';
    }
    return 'article';
  };

  const fetchMetadata = useCallback(async (inputUrl: string) => {
    if (!inputUrl || !inputUrl.startsWith('http')) return;

    setIsLoading(true);
    setMetadata(null);

    await new Promise((r) => setTimeout(r, 800));

    const type = detectUrlType(inputUrl);
    const mockMetadata: MetadataPreview = {
      title:
        type === 'video'
          ? 'The Future of AI: A Deep Dive'
          : 'Understanding Modern Web Development',
      description:
        'An in-depth exploration of the latest trends and technologies shaping the future.',
      siteName:
        type === 'video'
          ? 'YouTube'
          : type === 'tweet'
          ? 'Twitter'
          : type === 'reddit'
          ? 'Reddit'
          : 'Medium',
      type,
      readTime: type === 'video' ? 15 : Math.floor(Math.random() * 10) + 3,
    };

    setMetadata(mockMetadata);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!open) return;
      const text = e.clipboardData?.getData('text');
      if (text && text.startsWith('http')) {
        setUrl(text);
        fetchMetadata(text);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [open, fetchMetadata]);

  useEffect(() => {
    if (!open) {
      setUrl('');
      setMetadata(null);
      setSelectedCollection(null);
      setScheduledFor(null);
      setShowSuccess(false);
    }
  }, [open]);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value.startsWith('http')) {
      const debounceTimer = setTimeout(() => fetchMetadata(value), 500);
      return () => clearTimeout(debounceTimer);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    onSave?.({ url, collection: selectedCollection || undefined, scheduledFor: scheduledFor || undefined });
    const categorizationVariant =
      posthog.getFeatureFlag?.('scrolllater-ai-categorization-v2') ?? 'v1';
    posthog.capture?.('article_saved', {
      url,
      collection: selectedCollection || null,
      scheduled: !!scheduledFor,
      categorization_variant: categorizationVariant,
    });
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const typeIcons = {
    article: <FileText className="w-4 h-4" />,
    video: <Play className="w-4 h-4" />,
    tweet: <Globe className="w-4 h-4" />,
    reddit: <Globe className="w-4 h-4" />,
    link: <LinkIcon className="w-4 h-4" />,
  };

  return (
    <Modal open={open} onClose={onClose} size="md">
      <AnimatePresence mode="wait">
        {showSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="py-12 px-6 flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 bg-paper-muted rounded-full flex items-center justify-center mb-4 text-ink">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl tracking-display text-ink mb-1">Saved</h3>
            <p className="text-sm text-ink-muted">Added to your reading list. Find it at the top of your library.</p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <ModalHeader>
              <ModalTitle>Save Link</ModalTitle>
            </ModalHeader>

            <ModalBody className="space-y-5">
              <Input
                placeholder="Paste a URL..."
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                icon={<LinkIcon className="w-4 h-4" />}
                autoFocus
              />

              {isLoading && (
                <div className="flex items-center gap-3 py-3 text-ink-subtle">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Fetching metadata...</span>
                </div>
              )}

              {metadata && (
                <div className="py-4 border-y border-paper-deep">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-paper-muted rounded-md flex items-center justify-center text-ink-subtle flex-shrink-0">
                      {typeIcons[metadata.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 text-[11px] text-ink-faint uppercase tracking-[0.12em]">
                        <span>{metadata.siteName}</span>
                        {metadata.readTime && (
                          <>
                            <span>/</span>
                            <span>{metadata.readTime} min</span>
                          </>
                        )}
                      </div>
                      <h4 className="font-serif text-lg tracking-display text-ink line-clamp-2">
                        {metadata.title}
                      </h4>
                      <p className="text-sm text-ink-muted line-clamp-2 mt-1">
                        {metadata.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-[0.14em] text-ink-subtle mb-3">
                  Collection
                </label>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {collections.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() =>
                        setSelectedCollection(selectedCollection === col.id ? null : col.id)
                      }
                      className={cn(
                        'text-sm transition-colors duration-craft',
                        selectedCollection === col.id
                          ? 'text-ink font-medium underline decoration-ink underline-offset-[0.18em]'
                          : 'text-ink-muted hover:text-ink'
                      )}
                    >
                      {col.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.14em] text-ink-subtle mb-3">
                  <Calendar className="w-3 h-3 inline-block mr-1.5 -mt-0.5" />
                  Schedule
                </label>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {['Today', 'Tomorrow', 'This Weekend', 'Next Week'].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setScheduledFor(scheduledFor === time ? null : time)}
                      className={cn(
                        'text-sm transition-colors duration-craft',
                        scheduledFor === time
                          ? 'text-ink font-medium underline decoration-ink underline-offset-[0.18em]'
                          : 'text-ink-muted hover:text-ink'
                      )}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="justify-between sm:justify-between">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-ink underline decoration-ink/40 underline-offset-[0.18em] transition-colors duration-craft hover:decoration-ink"
              >
                Cancel
              </button>
              <Button
                onClick={handleSave}
                loading={isSaving}
                disabled={!url}
                className={cn(
                  'rounded-full px-5 min-w-[7.5rem]',
                  !url && 'border border-paper-deep bg-paper-muted text-ink-subtle'
                )}
              >
                Save Link
              </Button>
            </ModalFooter>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

export { QuickAddModal };
export type { QuickAddModalProps };

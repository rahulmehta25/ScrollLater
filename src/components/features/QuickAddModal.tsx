'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link as LinkIcon,
  Calendar,
  Tag,
  Sparkles,
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
  { id: 'tech', name: 'Tech', color: '#3B82F6' },
  { id: 'ai', name: 'AI & ML', color: '#8B5CF6' },
  { id: 'finance', name: 'Finance', color: '#10B981' },
  { id: 'design', name: 'Design', color: '#EC4899' },
  { id: 'science', name: 'Science', color: '#06B6D4' },
  { id: 'productivity', name: 'Productivity', color: '#F59E0B' },
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="py-12 px-6 flex flex-col items-center text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
              className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4"
            >
              <CheckCircle className="w-7 h-7 text-green-600" />
            </motion.div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Saved!</h3>
            <p className="text-sm text-gray-500">Added to your reading list</p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ModalHeader>
              <ModalTitle>Save Link</ModalTitle>
            </ModalHeader>

            <ModalBody className="space-y-4">
              <Input
                placeholder="Paste URL or type to search..."
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                icon={<LinkIcon className="w-4 h-4" />}
                autoFocus
              />

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
                >
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  <span className="text-sm text-gray-500">Fetching metadata...</span>
                </motion.div>
              )}

              {metadata && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
                      {typeIcons[metadata.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                          {metadata.siteName}
                        </span>
                        {metadata.readTime && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="text-[10px] text-gray-400">
                              {metadata.readTime} min read
                            </span>
                          </>
                        )}
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                        {metadata.title}
                      </h4>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                        {metadata.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                    <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      AI will analyze and categorize this content
                    </span>
                  </div>
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Tag className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                  Collection (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {collections.map((col) => (
                    <button
                      key={col.id}
                      onClick={() =>
                        setSelectedCollection(selectedCollection === col.id ? null : col.id)
                      }
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                        selectedCollection === col.id
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-1.5"
                        style={{ backgroundColor: col.color }}
                      />
                      {col.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                  Schedule (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Today', 'Tomorrow', 'This Weekend', 'Next Week'].map((time) => (
                    <button
                      key={time}
                      onClick={() => setScheduledFor(scheduledFor === time ? null : time)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                        scheduledFor === time
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={isSaving} disabled={!url}>
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

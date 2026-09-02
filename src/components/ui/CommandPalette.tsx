'use client';

import { Fragment, useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild, Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import {
  Search,
  Plus,
  Bookmark,
  Calendar,
  Settings,
  FileText,
  Hash,
  Sparkles,
  ArrowRight,
  Command,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  name: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string[];
  section: 'actions' | 'navigation' | 'recent';
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSaveLink?: () => void;
  onNavigate?: (path: string) => void;
  onOpenDigest?: () => void;
  onOpenSchedule?: () => void;
  onBrowseCollections?: () => void;
  onSelectRecent?: (id: string) => void;
  recentItems?: Array<{ id: string; title: string; type: string }>;
}

function CommandPalette({
  open,
  onClose,
  onSaveLink,
  onNavigate,
  onOpenDigest,
  onOpenSchedule,
  onBrowseCollections,
  onSelectRecent,
  recentItems = [],
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [
      {
        id: 'save-link',
        name: 'Save new link',
        description: 'Add a URL to your reading list',
        icon: <Plus className="w-4 h-4" />,
        shortcut: ['N'],
        section: 'actions',
        action: () => {
          onClose();
          onSaveLink?.();
        },
      },
      {
        id: 'quick-capture',
        name: 'Quick capture',
        description: 'Paste from clipboard',
        icon: <Bookmark className="w-4 h-4" />,
        shortcut: ['V'],
        section: 'actions',
        action: () => {
          onClose();
          onSaveLink?.();
        },
      },
      {
        id: 'schedule',
        name: 'Schedule reading time',
        description: 'Review your reading calendar',
        icon: <Calendar className="w-4 h-4" />,
        shortcut: ['S'],
        section: 'actions',
        action: () => {
          onClose();
          onOpenSchedule?.();
        },
      },
      {
        id: 'ai-digest',
        name: 'Open AI digest',
        description: 'Browse themes across your reading list',
        icon: <Sparkles className="w-4 h-4" />,
        section: 'actions',
        action: () => {
          onClose();
          onOpenDigest?.();
        },
      },
      {
        id: 'nav-dashboard',
        name: 'Go to Library',
        icon: <FolderOpen className="w-4 h-4" />,
        section: 'navigation',
        action: () => {
          onClose();
          onNavigate?.('/');
        },
      },
      {
        id: 'nav-settings',
        name: 'Go to Settings',
        icon: <Settings className="w-4 h-4" />,
        shortcut: [','],
        section: 'navigation',
        action: () => {
          onClose();
          onNavigate?.('/dashboard/settings');
        },
      },
      {
        id: 'nav-collections',
        name: 'Browse Collections',
        icon: <Hash className="w-4 h-4" />,
        section: 'navigation',
        action: () => {
          onClose();
          onBrowseCollections?.();
        },
      },
    ];

    recentItems.slice(0, 5).forEach((item) => {
      items.push({
        id: `recent-${item.id}`,
        name: item.title,
        description: item.type,
        icon: <FileText className="w-4 h-4" />,
        section: 'recent',
        action: () => {
          onClose();
          onSelectRecent?.(item.id);
        },
      });
    });

    return items;
  }, [
    onClose,
    onSaveLink,
    onNavigate,
    onOpenDigest,
    onOpenSchedule,
    onBrowseCollections,
    onSelectRecent,
    recentItems,
  ]);

  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(lowerQuery) ||
        cmd.description?.toLowerCase().includes(lowerQuery)
    );
  }, [commands, query]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      actions: [],
      navigation: [],
      recent: [],
    };
    filteredCommands.forEach((cmd) => {
      groups[cmd.section].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-start justify-center pt-[15vh] p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-150"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
              <Combobox
                onChange={(item: CommandItem | null) => {
                  if (item) item.action();
                }}
              >
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <ComboboxInput
                    className="w-full h-12 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 border-0 border-b border-gray-100 focus:outline-none focus:ring-0"
                    placeholder="Search commands..."
                    displayValue={() => query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 rounded">
                      esc
                    </kbd>
                  </div>
                </div>

                <ComboboxOptions static className="max-h-80 overflow-y-auto p-2">
                  {filteredCommands.length === 0 ? (
                    <div className="py-8 text-center">
                      <Search className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No commands found</p>
                    </div>
                  ) : (
                    <>
                      {groupedCommands.actions.length > 0 && (
                        <div className="mb-2">
                          <p className="px-2 py-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                            Actions
                          </p>
                          {groupedCommands.actions.map((cmd) => (
                            <CommandOption key={cmd.id} command={cmd} />
                          ))}
                        </div>
                      )}

                      {groupedCommands.navigation.length > 0 && (
                        <div className="mb-2">
                          <p className="px-2 py-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                            Navigation
                          </p>
                          {groupedCommands.navigation.map((cmd) => (
                            <CommandOption key={cmd.id} command={cmd} />
                          ))}
                        </div>
                      )}

                      {groupedCommands.recent.length > 0 && (
                        <div>
                          <p className="px-2 py-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                            Recent
                          </p>
                          {groupedCommands.recent.map((cmd) => (
                            <CommandOption key={cmd.id} command={cmd} />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </ComboboxOptions>

                <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[10px]">↑↓</kbd>
                      navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[10px]">↵</kbd>
                      select
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <Command className="w-3 h-3" />
                    <span>K to open</span>
                  </div>
                </div>
              </Combobox>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}

function CommandOption({ command }: { command: CommandItem }) {
  return (
    <ComboboxOption
      value={command}
      className={({ focus }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors',
          focus ? 'bg-gray-100' : ''
        )
      }
    >
      {({ focus }) => (
        <>
          <div
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
              focus ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
            )}
          >
            {command.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{command.name}</p>
            {command.description && (
              <p className="text-xs text-gray-500 truncate">{command.description}</p>
            )}
          </div>
          {command.shortcut && (
            <div className="flex items-center gap-1">
              {command.shortcut.map((key, i) => (
                <kbd
                  key={i}
                  className="px-1.5 py-0.5 text-[10px] font-medium text-gray-500 bg-white border border-gray-200 rounded"
                >
                  {key}
                </kbd>
              ))}
            </div>
          )}
          {focus && (
            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
        </>
      )}
    </ComboboxOption>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { open, setOpen };
}

export { CommandPalette };
export type { CommandPaletteProps, CommandItem };

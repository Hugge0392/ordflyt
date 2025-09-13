import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SlashMenuProps } from './types';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Table,
  Minus,
  Code,
  Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuCommand {
  id: string;
  title: string;
  description: string;
  icon: any;
  command: () => void;
  searchTerms: string[];
}

export function SlashMenu({ editor, show, position, onHide }: SlashMenuProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const commands: MenuCommand[] = [
    {
      id: 'paragraph',
      title: 'Text',
      description: 'Vanlig text',
      icon: Type,
      command: () => {
        editor.chain().focus().setParagraph().run();
        onHide();
      },
      searchTerms: ['paragraph', 'text', 'p']
    },
    {
      id: 'heading1',
      title: 'Rubrik 1',
      description: 'Stor huvudrubrik',
      icon: Heading1,
      command: () => {
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        onHide();
      },
      searchTerms: ['heading', 'h1', 'title', 'rubrik']
    },
    {
      id: 'heading2',
      title: 'Rubrik 2',
      description: 'Medium underrubrik',
      icon: Heading2,
      command: () => {
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        onHide();
      },
      searchTerms: ['heading', 'h2', 'subtitle', 'rubrik']
    },
    {
      id: 'heading3',
      title: 'Rubrik 3',
      description: 'Liten underrubrik',
      icon: Heading3,
      command: () => {
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        onHide();
      },
      searchTerms: ['heading', 'h3', 'subtitle', 'rubrik']
    },
    {
      id: 'bulletList',
      title: 'Punktlista',
      description: 'Skapa en lista med punkter',
      icon: List,
      command: () => {
        editor.chain().focus().toggleBulletList().run();
        onHide();
      },
      searchTerms: ['bullet', 'list', 'ul', 'punktlista', 'lista']
    },
    {
      id: 'orderedList',
      title: 'Numrerad lista',
      description: 'Skapa en numrerad lista',
      icon: ListOrdered,
      command: () => {
        editor.chain().focus().toggleOrderedList().run();
        onHide();
      },
      searchTerms: ['numbered', 'ordered', 'list', 'ol', 'numrerad', 'lista']
    },
    {
      id: 'blockquote',
      title: 'Citat',
      description: 'Infoga ett citat',
      icon: Quote,
      command: () => {
        editor.chain().focus().toggleBlockquote().run();
        onHide();
      },
      searchTerms: ['quote', 'blockquote', 'citation', 'citat']
    },
    {
      id: 'codeBlock',
      title: 'Kodblock',
      description: 'Infoga kod med syntaxmarkering',
      icon: Code,
      command: () => {
        editor.chain().focus().toggleCodeBlock().run();
        onHide();
      },
      searchTerms: ['code', 'codeblock', 'syntax', 'kod']
    },
    {
      id: 'table',
      title: 'Tabell',
      description: 'Infoga en tabell',
      icon: Table,
      command: () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        onHide();
      },
      searchTerms: ['table', 'grid', 'tabell']
    },
    {
      id: 'divider',
      title: 'Avdelare',
      description: 'Horisontell linje',
      icon: Minus,
      command: () => {
        editor.chain().focus().setHorizontalRule().run();
        onHide();
      },
      searchTerms: ['divider', 'hr', 'line', 'separator', 'avdelare', 'linje']
    }
  ];

  // Filter commands based on search
  const filteredCommands = search
    ? commands.filter(command =>
        command.title.toLowerCase().includes(search.toLowerCase()) ||
        command.description.toLowerCase().includes(search.toLowerCase()) ||
        command.searchTerms.some(term => term.toLowerCase().includes(search.toLowerCase()))
      )
    : commands;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!show) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex(prev => prev === 0 ? filteredCommands.length - 1 : prev - 1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].command();
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onHide();
      } else if (event.key === 'Backspace') {
        if (search.length > 0) {
          setSearch(prev => prev.slice(0, -1));
        } else {
          // Delete the slash and hide menu
          const { state, dispatch } = editor.view;
          const { selection } = state;
          const { from } = selection;
          const tr = state.tr.delete(from - 1, from);
          dispatch(tr);
          onHide();
        }
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        setSearch(prev => prev + event.key);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, search, selectedIndex, filteredCommands, editor, onHide]);

  // Reset selection when commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onHide();
      }
    };

    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show, onHide]);

  if (!show) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        maxWidth: '300px',
        minWidth: '250px',
      }}
    >
      <Card className="p-2 shadow-lg border bg-white dark:bg-gray-800 max-h-80 overflow-y-auto">
        {/* Search display */}
        {search && (
          <div className="px-3 py-2 text-sm text-gray-500 border-b border-gray-200 dark:border-gray-700">
            Sök: "{search}"
          </div>
        )}

        {/* Commands */}
        <div className="space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              Inga kommandon hittades
            </div>
          ) : (
            filteredCommands.map((command, index) => {
              const Icon = command.icon;
              return (
                <Button
                  key={command.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-auto p-3 text-left",
                    index === selectedIndex && "bg-gray-100 dark:bg-gray-700"
                  )}
                  onClick={() => command.command()}
                  data-testid={`slash-menu-${command.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded border bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {command.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {command.description}
                      </div>
                    </div>
                  </div>
                </Button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700 mt-2">
          ↑↓ för att navigera • Enter för att välja • Esc för att stänga
        </div>
      </Card>
    </div>
  );
}
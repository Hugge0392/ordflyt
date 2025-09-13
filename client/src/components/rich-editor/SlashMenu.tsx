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
  Hash,
  Image as ImageIcon
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

  // Helper function to get cursor position and remove slash
  const getCursorPositionAndCleanSlash = () => {
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    
    // Find the slash character and remove it
    const textBefore = state.doc.textBetween(Math.max(0, $from.pos - 10), $from.pos);
    const slashIndex = textBefore.lastIndexOf('/');
    
    if (slashIndex !== -1) {
      const slashPos = $from.pos - (textBefore.length - slashIndex);
      // Delete the slash
      const tr = state.tr.delete(slashPos, $from.pos);
      editor.view.dispatch(tr);
      return slashPos;
    }
    
    return $from.pos;
  };

  // Helper function to insert block at position
  const insertBlockAtPosition = (blockContent: any, pos?: number) => {
    const insertPos = pos || getCursorPositionAndCleanSlash();
    
    // Insert the block content and position cursor appropriately
    return editor.chain()
      .focus()
      .insertContentAt(insertPos, blockContent)
      .command(({ tr, commands }) => {
        // Move cursor to the beginning of the newly inserted block
        const newPos = insertPos + 1;
        if (newPos <= tr.doc.content.size) {
          commands.setTextSelection(newPos);
        }
        return true;
      })
      .run();
  };

  // Helper function to insert image via file dialog
  const insertImageBlock = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpg,image/jpeg,image/webp,image/gif';
    input.multiple = false;
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files[0]) {
        const file = files[0];
        
        try {
          // Clean slash first
          const insertPos = getCursorPositionAndCleanSlash();
          
          // Upload image
          const formData = new FormData();
          formData.append('file', file, file.name);
          
          const response = await fetch('/api/upload-direct', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) throw new Error('Upload failed');
          
          const { objectPath } = await response.json();
          
          // Insert image block at the cleaned position
          editor.chain()
            .focus()
            .insertContentAt(insertPos, {
              type: 'paragraph',
              content: [],
            })
            .insertImageBlock({
              src: objectPath,
              alt: file.name.replace(/\.[^/.]+$/, ''),
            })
            .run();
            
        } catch (error) {
          console.error('Image upload error:', error);
        }
      }
    };
    
    input.click();
  };

  const commands: MenuCommand[] = [
    {
      id: 'paragraph',
      title: 'Text',
      description: 'Nytt textblock',
      icon: Type,
      command: () => {
        insertBlockAtPosition({ type: 'paragraph', content: [] });
        onHide();
      },
      searchTerms: ['paragraph', 'text', 'p', 'stycke']
    },
    {
      id: 'heading1',
      title: 'Rubrik 1',
      description: 'Stor huvudrubrik',
      icon: Heading1,
      command: () => {
        insertBlockAtPosition({ type: 'heading', attrs: { level: 1 }, content: [] });
        onHide();
      },
      searchTerms: ['heading', 'h1', 'title', 'rubrik', 'huvudrubrik']
    },
    {
      id: 'heading2',
      title: 'Rubrik 2',
      description: 'Medium underrubrik',
      icon: Heading2,
      command: () => {
        insertBlockAtPosition({ type: 'heading', attrs: { level: 2 }, content: [] });
        onHide();
      },
      searchTerms: ['heading', 'h2', 'subtitle', 'rubrik', 'underrubrik']
    },
    {
      id: 'heading3',
      title: 'Rubrik 3',
      description: 'Liten underrubrik',
      icon: Heading3,
      command: () => {
        insertBlockAtPosition({ type: 'heading', attrs: { level: 3 }, content: [] });
        onHide();
      },
      searchTerms: ['heading', 'h3', 'subtitle', 'rubrik', 'underrubrik']
    },
    {
      id: 'bulletList',
      title: 'Punktlista',
      description: 'Lista med punkter',
      icon: List,
      command: () => {
        insertBlockAtPosition({
          type: 'bulletList',
          content: [{
            type: 'listItem',
            content: [{ type: 'paragraph', content: [] }]
          }]
        });
        onHide();
      },
      searchTerms: ['bullet', 'list', 'ul', 'punktlista', 'lista']
    },
    {
      id: 'orderedList',
      title: 'Numrerad lista',
      description: 'Lista med nummer',
      icon: ListOrdered,
      command: () => {
        insertBlockAtPosition({
          type: 'orderedList',
          content: [{
            type: 'listItem',
            content: [{ type: 'paragraph', content: [] }]
          }]
        });
        onHide();
      },
      searchTerms: ['numbered', 'ordered', 'list', 'ol', 'numrerad', 'lista']
    },
    {
      id: 'blockquote',
      title: 'Citat',
      description: 'Citatblock',
      icon: Quote,
      command: () => {
        insertBlockAtPosition({
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [] }]
        });
        onHide();
      },
      searchTerms: ['quote', 'blockquote', 'citation', 'citat']
    },
    {
      id: 'codeBlock',
      title: 'Kodblock',
      description: 'Block för kod',
      icon: Code,
      command: () => {
        insertBlockAtPosition({ type: 'codeBlock', content: [] });
        onHide();
      },
      searchTerms: ['code', 'codeblock', 'syntax', 'kod']
    },
    {
      id: 'table',
      title: 'Tabell',
      description: 'Infoga tabell',
      icon: Table,
      command: () => {
        // Clean slash first, then insert table
        getCursorPositionAndCleanSlash();
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        onHide();
      },
      searchTerms: ['table', 'grid', 'tabell']
    },
    {
      id: 'image',
      title: 'Bild',
      description: 'Lägg till bild',
      icon: ImageIcon,
      command: () => {
        insertImageBlock();
        onHide();
      },
      searchTerms: ['image', 'picture', 'photo', 'bild', 'foto']
    },
    {
      id: 'divider',
      title: 'Avdelare',
      description: 'Horisontell linje',
      icon: Minus,
      command: () => {
        const insertPos = getCursorPositionAndCleanSlash();
        editor.chain().focus().insertContentAt(insertPos, { type: 'horizontalRule' }).run();
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
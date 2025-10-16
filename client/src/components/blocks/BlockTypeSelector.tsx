import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Type, 
  Image, 
  Heading1, 
  Heading2, 
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus
} from 'lucide-react';
import type { BlockTypeSelectorProps, BlockTypeOption } from './types';

const BLOCK_TYPE_OPTIONS: BlockTypeOption[] = [
  {
    id: 'text',
    label: 'Textblock',
    icon: <Type className="h-4 w-4" />,
    description: 'Lägg till nytt textblock med paragraf'
  },
  {
    id: 'image',
    label: 'Bildblock', 
    icon: <Image className="h-4 w-4" />,
    description: 'Lägg till en bild'
  },
  {
    id: 'heading1',
    label: 'Stor rubrik',
    icon: <Heading1 className="h-4 w-4" />,
    description: 'Textblock med stor rubrik (H1)'
  },
  {
    id: 'heading2',
    label: 'Medium rubrik',
    icon: <Heading2 className="h-4 w-4" />,
    description: 'Textblock med medium rubrik (H2)'
  },
  {
    id: 'heading3',
    label: 'Liten rubrik',
    icon: <Heading3 className="h-4 w-4" />,
    description: 'Textblock med liten rubrik (H3)'
  },
  {
    id: 'list',
    label: 'Punktlista',
    icon: <List className="h-4 w-4" />,
    description: 'Textblock med punktlista'
  },
  {
    id: 'ordered-list',
    label: 'Numrerad lista',
    icon: <ListOrdered className="h-4 w-4" />,
    description: 'Textblock med numrerad lista'
  },
  {
    id: 'quote',
    label: 'Citat',
    icon: <Quote className="h-4 w-4" />,
    description: 'Textblock formaterat som citat'
  },
  {
    id: 'code',
    label: 'Kod',
    icon: <Code className="h-4 w-4" />,
    description: 'Textblock för kod'
  },
  {
    id: 'divider',
    label: 'Avdelare',
    icon: <Minus className="h-4 w-4" />,
    description: 'Linje som delar upp innehåll'
  }
];

export function BlockTypeSelector({ 
  onSelect, 
  onClose, 
  position,
  show 
}: BlockTypeSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [show, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [show, onClose]);

  if (!show) return null;

  const handleSelect = (blockType: string) => {
    onSelect(blockType);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-20"
      data-testid="block-type-selector-overlay"
    >
      <div
        ref={containerRef}
        className={cn(
          "absolute z-50 w-80 max-h-96 overflow-y-auto shadow-lg border bg-white rounded-lg",
          "animate-in fade-in-0 zoom-in-95"
        )}
        style={{
          left: position?.x || '50%',
          top: position?.y || '50%',
          transform: position ? 'none' : 'translate(-50%, -50%)'
        }}
        data-testid="block-type-selector"
      >
        <div className="p-2">
          <div className="space-y-1">
            <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Välj block-typ
            </div>
            
            {BLOCK_TYPE_OPTIONS.map((option) => (
              <Button
                key={option.id}
                variant="ghost"
                size="sm"
                onClick={() => handleSelect(option.id)}
                className="w-full justify-start text-left h-auto p-3 hover:bg-gray-100"
                data-testid={`block-type-${option.id}`}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="flex-shrink-0 mt-0.5 text-gray-400">
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {option.description}
                      </div>
                    )}
                  </div>
                </div>
              </Button>
            ))}
          </div>
          
          <div className="mt-3 pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-400 px-2">
              Tryck Escape för att avbryta
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ImageToolbar } from './ImageToolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Grip, Edit3, Trash2 } from 'lucide-react';

export function ImageNode({ node, updateAttributes, selected, editor, deleteNode, getPos }: NodeViewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [tempCaption, setTempCaption] = useState(node.attrs.caption || '');
  const imageRef = useRef<HTMLImageElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  
  const { src, alt, caption, width, height, align = 'center' } = node.attrs;

  // Handle image load to set natural dimensions if not set
  useEffect(() => {
    if (imageRef.current && !width && !height) {
      const img = imageRef.current;
      const handleLoad = () => {
        updateAttributes({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      
      if (img.complete) {
        handleLoad();
      } else {
        img.addEventListener('load', handleLoad);
        return () => img.removeEventListener('load', handleLoad);
      }
    }
  }, [src, width, height, updateAttributes]);

  // Handle resize functionality
  useEffect(() => {
    if (!isResizing || !resizeHandleRef.current || !imageRef.current) return;

    const startResize = (e: MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = imageRef.current!.offsetWidth;
      const aspectRatio = height && width ? width / height : 1;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const newWidth = Math.max(100, Math.min(800, startWidth + deltaX));
        const newHeight = newWidth / aspectRatio;

        updateAttributes({
          width: Math.round(newWidth),
          height: Math.round(newHeight),
        });
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const handle = resizeHandleRef.current;
    handle.addEventListener('mousedown', startResize);

    return () => {
      handle.removeEventListener('mousedown', startResize);
    };
  }, [isResizing, height, width, updateAttributes]);

  const handleCaptionSave = () => {
    updateAttributes({ caption: tempCaption });
    setShowCaptionInput(false);
  };

  const handleCaptionCancel = () => {
    setTempCaption(node.attrs.caption || '');
    setShowCaptionInput(false);
  };

  const alignmentClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    full: 'justify-center w-full',
  }[align] || 'justify-center';

  const imageWrapperClass = {
    left: 'max-w-sm',
    center: 'max-w-2xl',
    right: 'max-w-sm ml-auto',
    full: 'w-full max-w-none',
  }[align] || 'max-w-2xl';

  return (
    <NodeViewWrapper
      className={cn(
        'relative my-4 flex',
        alignmentClass,
        selected && 'ring-2 ring-blue-500 ring-offset-2 rounded-lg'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid="image-node-wrapper"
    >
      <div className={cn('relative group', imageWrapperClass)}>
        {/* Image */}
        <img
          ref={imageRef}
          src={src}
          alt={alt || ''}
          className={cn(
            'rounded-lg shadow-sm transition-shadow duration-200',
            selected && 'shadow-lg',
            isResizing && 'cursor-ew-resize'
          )}
          style={{
            width: width ? `${width}px` : undefined,
            maxWidth: align === 'full' ? '100%' : '800px',
            height: 'auto',
          }}
          draggable={false}
          data-testid="image-display"
        />

        {/* Resize Handle */}
        {(selected || isHovered) && align !== 'full' && (
          <div
            ref={resizeHandleRef}
            className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-8 bg-blue-500 rounded cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
            onMouseDown={() => setIsResizing(true)}
            data-testid="resize-handle"
          >
            <Grip className="h-3 w-3 text-white" />
          </div>
        )}

        {/* Image Toolbar */}
        {(selected || isHovered) && (
          <ImageToolbar
            node={node}
            updateAttributes={updateAttributes}
            deleteNode={deleteNode}
            editor={editor}
            onEditCaption={() => setShowCaptionInput(true)}
          />
        )}

        {/* Caption */}
        {caption && !showCaptionInput && (
          <div 
            className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center italic cursor-pointer hover:text-gray-800 dark:hover:text-gray-200"
            onClick={() => setShowCaptionInput(true)}
            data-testid="image-caption"
          >
            {caption}
          </div>
        )}

        {/* Caption Input */}
        {showCaptionInput && (
          <div className="mt-2 space-y-2">
            <Input
              value={tempCaption}
              onChange={(e) => setTempCaption(e.target.value)}
              placeholder="Bildtext..."
              className="text-sm text-center"
              autoFocus
              data-testid="caption-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCaptionSave();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleCaptionCancel();
                }
              }}
            />
            <div className="flex justify-center space-x-2">
              <Button
                size="sm"
                onClick={handleCaptionSave}
                data-testid="caption-save"
              >
                Spara
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCaptionCancel}
                data-testid="caption-cancel"
              >
                Avbryt
              </Button>
            </div>
          </div>
        )}

        {/* Add caption button if no caption exists */}
        {!caption && !showCaptionInput && (selected || isHovered) && (
          <div className="mt-2 flex justify-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCaptionInput(true)}
              className="text-xs text-gray-500 hover:text-gray-700"
              data-testid="add-caption-button"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Lägg till bildtext
            </Button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
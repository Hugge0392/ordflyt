import { JSONContent } from '@tiptap/react';

export interface RichDocEditorProps {
  content?: JSONContent;
  onChange?: (content: JSONContent) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  autoFocus?: boolean;
}

export interface RichDocRendererProps {
  content: JSONContent;
  className?: string;
}

export interface ToolbarProps {
  editor: any;
}

export interface SlashMenuProps {
  editor: any;
  show: boolean;
  position: { x: number; y: number };
  onHide: () => void;
}

export interface BlockInsertButtonProps {
  position: { x: number; y: number };
  onInsertBlock: (blockType: string) => void;
  show: boolean;
}

export interface BlockDragHandleProps {
  position: { x: number; y: number };
  show: boolean;
  onDragStart: (e: React.DragEvent) => void;
}

export interface BlockTypeMenuProps {
  editor: any;
  show: boolean;
  position: { x: number; y: number };
  onHide: () => void;
  onSelectType: (blockType: string) => void;
}

export interface BlockCommand {
  id: string;
  title: string;
  description: string;
  icon: any;
  command: () => void;
  searchTerms: string[];
}
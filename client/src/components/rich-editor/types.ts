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
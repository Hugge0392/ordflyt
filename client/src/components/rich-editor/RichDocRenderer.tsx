import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { cn } from '@/lib/utils';
import { RichDocRendererProps } from './types';

export function RichDocRenderer({ content, className }: RichDocRendererProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        resizable: false, // No resizing in read-only mode
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content || {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [],
        },
      ],
    },
    editable: false, // Read-only
  });

  if (!editor) {
    return (
      <div className={cn("p-4", className)}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white dark:bg-gray-900", className)}>
      <EditorContent
        editor={editor}
        className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none p-6 focus-within:outline-none"
        style={{
          '--tw-prose-body': 'rgb(55 65 81)',
          '--tw-prose-headings': 'rgb(17 24 39)',
          '--tw-prose-lead': 'rgb(75 85 99)',
          '--tw-prose-links': 'rgb(59 130 246)',
          '--tw-prose-bold': 'rgb(17 24 39)',
          '--tw-prose-counters': 'rgb(107 114 128)',
          '--tw-prose-bullets': 'rgb(209 213 219)',
          '--tw-prose-hr': 'rgb(229 231 235)',
          '--tw-prose-quotes': 'rgb(17 24 39)',
          '--tw-prose-quote-borders': 'rgb(229 231 235)',
          '--tw-prose-captions': 'rgb(107 114 128)',
          '--tw-prose-code': 'rgb(17 24 39)',
          '--tw-prose-pre-code': 'rgb(229 231 235)',
          '--tw-prose-pre-bg': 'rgb(55 65 81)',
          '--tw-prose-th-borders': 'rgb(209 213 219)',
          '--tw-prose-td-borders': 'rgb(229 231 235)',
          // Dark mode styles
          '--tw-prose-invert-body': 'rgb(209 213 219)',
          '--tw-prose-invert-headings': 'rgb(243 244 246)',
          '--tw-prose-invert-lead': 'rgb(156 163 175)',
          '--tw-prose-invert-links': 'rgb(96 165 250)',
          '--tw-prose-invert-bold': 'rgb(243 244 246)',
          '--tw-prose-invert-counters': 'rgb(156 163 175)',
          '--tw-prose-invert-bullets': 'rgb(75 85 99)',
          '--tw-prose-invert-hr': 'rgb(55 65 81)',
          '--tw-prose-invert-quotes': 'rgb(243 244 246)',
          '--tw-prose-invert-quote-borders': 'rgb(55 65 81)',
          '--tw-prose-invert-captions': 'rgb(156 163 175)',
          '--tw-prose-invert-code': 'rgb(243 244 246)',
          '--tw-prose-invert-pre-code': 'rgb(209 213 219)',
          '--tw-prose-invert-pre-bg': 'rgb(17 24 39)',
          '--tw-prose-invert-th-borders': 'rgb(75 85 99)',
          '--tw-prose-invert-td-borders': 'rgb(55 65 81)',
        } as any}
      />
    </div>
  );
}
import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageNode } from '../components/ImageNode';

export interface ImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      /**
       * Add an image
       */
      setImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        caption?: string;
        width?: number;
        height?: number;
        align?: 'left' | 'center' | 'right' | 'full';
        aspectRatio?: string;
      }) => ReturnType;
    };
  }
}

export const inputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/;

export const ImageExtension = Node.create<ImageOptions>({
  name: 'image',

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? 'inline' : 'block';
  },

  draggable: true,
  selectable: true,
  atom: true, // Prevents splitting of the node

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      caption: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      align: {
        default: 'center',
      },
      aspectRatio: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (dom) => {
          if (typeof dom === 'string') return {};
          const element = dom as HTMLElement;
          
          return {
            src: element.getAttribute('src'),
            alt: element.getAttribute('alt'),
            title: element.getAttribute('title'),
            caption: element.getAttribute('data-caption'),
            width: element.getAttribute('width') ? parseInt(element.getAttribute('width')!) : null,
            height: element.getAttribute('height') ? parseInt(element.getAttribute('height')!) : null,
            align: element.getAttribute('data-align') || 'center',
            aspectRatio: element.getAttribute('data-aspect-ratio'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { caption, align, aspectRatio, ...imgAttributes } = HTMLAttributes;
    
    return [
      'div',
      {
        class: `image-wrapper align-${align || 'center'}`,
        'data-align': align,
      },
      [
        'img',
        mergeAttributes(this.options.HTMLAttributes, imgAttributes, {
          'data-caption': caption,
          'data-align': align,
          'data-aspect-ratio': aspectRatio,
        }),
      ],
      caption ? ['div', { class: 'image-caption' }, caption] : '',
    ];
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands, state, chain }) => {
          // Ensure we insert image as a separate block with paragraphs before/after
          const { selection } = state;
          const { $from } = selection;
          
          // Check if we're in an empty paragraph
          const isEmptyParagraph = $from.parent.type.name === 'paragraph' && $from.parent.content.size === 0;
          
          if (isEmptyParagraph) {
            // Replace empty paragraph with image and add paragraph after
            return chain()
              .insertContent({
                type: this.name,
                attrs: options,
              })
              .insertContent({
                type: 'paragraph',
                content: [],
              })
              .run();
          } else {
            // Insert image with paragraphs before and after
            return chain()
              .insertContent({
                type: 'paragraph',
                content: [],
              })
              .insertContent({
                type: this.name,
                attrs: options,
              })
              .insertContent({
                type: 'paragraph',
                content: [],
              })
              .run();
          }
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: (match) => {
          const [,, alt, src, title] = match;

          return { src, alt, title };
        },
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNode);
  },
});
import { JSONContent } from '@tiptap/react';

/**
 * Utilities for converting between different content formats
 * Used for migrating from legacy HTML/markdown to ProseMirror JSON
 */

// Basic HTML to ProseMirror JSON conversion
export function htmlToRichDoc(html: string): JSONContent {
  if (!html || html.trim() === '') {
    return createEmptyRichDoc();
  }

  try {

  // Parse simple HTML structures to ProseMirror nodes
  const content: any[] = [];
  
  // Split by major HTML elements and create nodes
  const lines = html.split('\n').filter(line => line.trim() !== '');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('<h1>') && trimmedLine.endsWith('</h1>')) {
      const text = trimmedLine.replace(/<\/?h1>/g, '');
      content.push({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text }],
      });
    } else if (trimmedLine.startsWith('<h2>') && trimmedLine.endsWith('</h2>')) {
      const text = trimmedLine.replace(/<\/?h2>/g, '');
      content.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text }],
      });
    } else if (trimmedLine.startsWith('<h3>') && trimmedLine.endsWith('</h3>')) {
      const text = trimmedLine.replace(/<\/?h3>/g, '');
      content.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text }],
      });
    } else if (trimmedLine.startsWith('<blockquote>') && trimmedLine.endsWith('</blockquote>')) {
      const text = trimmedLine.replace(/<\/?blockquote>/g, '');
      content.push({
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text }],
          },
        ],
      });
    } else if (trimmedLine.startsWith('<ul>') || trimmedLine.includes('<li>')) {
      // Handle lists (simplified for now)
      const text = trimmedLine.replace(/<\/?[ul|li]+>/g, '').replace(/<li>/g, '');
      if (text.trim()) {
        content.push({
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: text.trim() }],
                },
              ],
            },
          ],
        });
      }
    } else if (trimmedLine.includes('--- SIDBRYTNING ---')) {
      // Skip page breaks - these will be handled at the page level
      continue;
    } else {
      // Regular paragraph with HTML formatting
      const textContent = parseInlineHtml(trimmedLine);
      if (textContent && textContent.length > 0) {
        content.push({
          type: 'paragraph',
          content: textContent,
        });
      }
    }
  }

  // If no content was created, add an empty paragraph
  if (content.length === 0) {
    content.push({
      type: 'paragraph',
      content: [],
    });
  }

    return {
      type: 'doc',
      content,
    };
  } catch (error) {
    console.warn('Error converting HTML to RichDoc:', error);
    // Return empty document on error
    return createEmptyRichDoc();
  }
}

// Parse inline HTML formatting (bold, italic, etc.)
function parseInlineHtml(html: string): any[] {
  if (!html || html.trim() === '') {
    return [];
  }

  // Remove outer HTML tags that don't contain text content
  let text = html.replace(/<\/?(div|p|span)[^>]*>/g, '');
  
  if (!text.trim()) {
    return [];
  }

  // For now, create a simple text node and let TipTap handle the formatting
  // This is a simplified approach - in production you might want more sophisticated parsing
  const cleanText = text
    .replace(/<strong>(.*?)<\/strong>/g, '$1')
    .replace(/<em>(.*?)<\/em>/g, '$1')
    .replace(/<\/?[^>]+(>|$)/g, ''); // Remove any remaining HTML tags

  if (!cleanText.trim()) {
    return [];
  }

  return [{ type: 'text', text: cleanText.trim() }];
}

// Convert ProseMirror JSON to HTML (for backward compatibility)
export function richDocToHtml(doc: JSONContent): string {
  if (!doc || !doc.content) {
    return '';
  }

  try {
    const content = doc.content.map(nodeToHtml).join('\n');
    return content;
  } catch (error) {
    console.warn('Error converting RichDoc to HTML:', error);
    return '';
  }
}

function nodeToHtml(node: any): string {
  if (!node) return '';

  switch (node.type) {
    case 'paragraph':
      const pContent = node.content ? node.content.map(inlineToHtml).join('') : '';
      return pContent ? `<p>${pContent}</p>` : '';
    
    case 'heading':
      const level = node.attrs?.level || 1;
      const hContent = node.content ? node.content.map(inlineToHtml).join('') : '';
      return `<h${level}>${hContent}</h${level}>`;
    
    case 'blockquote':
      const bqContent = node.content ? node.content.map(nodeToHtml).join('') : '';
      return `<blockquote>${bqContent}</blockquote>`;
    
    case 'bulletList':
      const listItems = node.content ? node.content.map(nodeToHtml).join('') : '';
      return `<ul>${listItems}</ul>`;
    
    case 'orderedList':
      const orderedItems = node.content ? node.content.map(nodeToHtml).join('') : '';
      return `<ol>${orderedItems}</ol>`;
    
    case 'listItem':
      const liContent = node.content ? node.content.map(nodeToHtml).join('') : '';
      return `<li>${liContent}</li>`;
    
    case 'horizontalRule':
      return '<hr>';
    
    case 'image':
      const src = node.attrs?.src || '';
      const alt = node.attrs?.alt || '';
      return `<img src="${src}" alt="${alt}">`;
    
    default:
      // For unknown nodes, try to render their content
      if (node.content) {
        return node.content.map(nodeToHtml).join('');
      }
      return '';
  }
}

function inlineToHtml(node: any): string {
  if (!node) return '';

  if (node.type === 'text') {
    let text = node.text || '';
    
    // Apply marks
    if (node.marks) {
      for (const mark of node.marks) {
        switch (mark.type) {
          case 'bold':
            text = `<strong>${text}</strong>`;
            break;
          case 'italic':
            text = `<em>${text}</em>`;
            break;
          case 'underline':
            text = `<u>${text}</u>`;
            break;
          case 'strike':
            text = `<s>${text}</s>`;
            break;
          case 'code':
            text = `<code>${text}</code>`;
            break;
          case 'link':
            const href = mark.attrs?.href || '#';
            text = `<a href="${href}">${text}</a>`;
            break;
        }
      }
    }
    
    return text;
  }

  return '';
}

// Helper function to check if content is legacy HTML format
export function isLegacyContent(content: any): boolean {
  return typeof content === 'string' && content.includes('<');
}

// Helper function to migrate legacy page format to rich page format
export function migrateLegacyPage(page: any): any {
  if (!page) return null;

  // If page already has a doc property, it's likely already migrated
  if (page.doc) {
    return page;
  }

  // Convert legacy content to rich doc
  const doc = htmlToRichDoc(page.content || '');

  return {
    id: page.id,
    doc,
    meta: {
      wordCount: countWords(doc),
    },
    // Preserve legacy fields for backward compatibility
    content: page.content,
    imagesAbove: page.imagesAbove,
    imagesBelow: page.imagesBelow,
    questions: page.questions,
  };
}

// Count words in a rich document
export function countWords(doc: JSONContent): number {
  if (!doc || !doc.content) return 0;

  let wordCount = 0;

  function traverseNode(node: any) {
    if (node.type === 'text' && node.text) {
      wordCount += node.text.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
    }
    
    if (node.content) {
      node.content.forEach(traverseNode);
    }
  }

  doc.content.forEach(traverseNode);
  return wordCount;
}

// Create an empty rich document
export function createEmptyRichDoc(): JSONContent {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [],
      },
    ],
  };
}

// Extract plain text from rich document (for TTS, search, etc.)
export function richDocToText(doc: JSONContent): string {
  if (!doc || !doc.content) return '';

  try {
    const textParts: string[] = [];

    function traverseNode(node: any) {
      if (node.type === 'text' && node.text) {
        textParts.push(node.text);
      }
      
      if (node.content) {
        node.content.forEach(traverseNode);
      }
    }

    doc.content.forEach(traverseNode);
    return textParts.join(' ').replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.warn('Error extracting text from RichDoc:', error);
    return '';
  }
}
import type { JSONContent } from '@tiptap/core';
import type { RichPage, LegacyPage, ReadingLesson, RichDoc } from '@shared/schema';
import { JSDOM } from 'jsdom';

// Core HTML to ProseMirror conversion
export class HtmlToRichDocConverter {
  private dom: JSDOM;

  constructor() {
    this.dom = new JSDOM();
  }

  /**
   * Convert HTML string to ProseMirror JSONContent
   */
  convertHtmlToProseMirror(html: string): JSONContent {
    if (!html || html.trim() === '') {
      return this.createEmptyDoc();
    }

    try {
      // Parse HTML using JSDOM
      const document = new JSDOM(html).window.document;
      const body = document.body;
      
      const content: JSONContent[] = [];
      
      // Process each child element in the body
      for (const child of Array.from(body.childNodes)) {
        const node = this.convertDomNode(child);
        if (node) {
          content.push(node);
        }
      }

      // If no content was generated, create a default paragraph
      if (content.length === 0) {
        content.push({
          type: 'paragraph',
          content: []
        });
      }

      return {
        type: 'doc',
        content
      };
    } catch (error) {
      console.error('Error converting HTML to ProseMirror:', error);
      return this.createEmptyDoc();
    }
  }

  /**
   * Convert a DOM node to ProseMirror JSONContent
   */
  private convertDomNode(node: Node): JSONContent | null {
    if (node.nodeType === 3) { // Text node
      const text = node.textContent?.trim();
      if (!text) return null;
      
      return {
        type: 'text',
        text
      };
    }

    if (node.nodeType === 1) { // Element node
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      
      switch (tagName) {
        case 'h1':
          return this.createHeading(element, 1);
        case 'h2':
          return this.createHeading(element, 2);
        case 'h3':
          return this.createHeading(element, 3);
        case 'h4':
          return this.createHeading(element, 4);
        case 'h5':
          return this.createHeading(element, 5);
        case 'h6':
          return this.createHeading(element, 6);
        case 'p':
          return this.createParagraph(element);
        case 'strong':
        case 'b':
          return this.createBold(element);
        case 'em':
        case 'i':
          return this.createItalic(element);
        case 'u':
          return this.createUnderline(element);
        case 'a':
          return this.createLink(element);
        case 'ul':
          return this.createBulletList(element);
        case 'ol':
          return this.createOrderedList(element);
        case 'li':
          return this.createListItem(element);
        case 'br':
          return { type: 'hardBreak' };
        case 'hr':
          return { type: 'horizontalRule' };
        case 'blockquote':
          return this.createBlockquote(element);
        case 'code':
          return this.createCode(element);
        case 'pre':
          return this.createCodeBlock(element);
        case 'img':
          return this.createImage(element);
        case 'div':
        case 'span':
          // For div and span, process children and return their content
          return this.processInlineChildren(element);
        default:
          // For unknown elements, try to process their children
          return this.processInlineChildren(element);
      }
    }

    return null;
  }

  private createEmptyDoc(): JSONContent {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: []
        }
      ]
    };
  }

  private createHeading(element: Element, level: number): JSONContent {
    const content = this.getInlineContent(element);
    return {
      type: 'heading',
      attrs: { level },
      content
    };
  }

  private createParagraph(element: Element): JSONContent {
    const content = this.getInlineContent(element);
    return {
      type: 'paragraph',
      content
    };
  }

  private createBold(element: Element): JSONContent {
    const content = this.getInlineContent(element);
    return {
      type: 'text',
      marks: [{ type: 'bold' }],
      text: element.textContent || ''
    };
  }

  private createItalic(element: Element): JSONContent {
    const content = this.getInlineContent(element);
    return {
      type: 'text',
      marks: [{ type: 'italic' }],
      text: element.textContent || ''
    };
  }

  private createUnderline(element: Element): JSONContent {
    return {
      type: 'text',
      marks: [{ type: 'underline' }],
      text: element.textContent || ''
    };
  }

  private createLink(element: Element): JSONContent {
    const href = element.getAttribute('href') || '';
    return {
      type: 'text',
      marks: [{ type: 'link', attrs: { href } }],
      text: element.textContent || ''
    };
  }

  private createBulletList(element: Element): JSONContent {
    const content: JSONContent[] = [];
    for (const child of Array.from(element.children)) {
      if (child.tagName.toLowerCase() === 'li') {
        const listItem = this.createListItem(child);
        if (listItem) content.push(listItem);
      }
    }
    
    return {
      type: 'bulletList',
      content
    };
  }

  private createOrderedList(element: Element): JSONContent {
    const content: JSONContent[] = [];
    for (const child of Array.from(element.children)) {
      if (child.tagName.toLowerCase() === 'li') {
        const listItem = this.createListItem(child);
        if (listItem) content.push(listItem);
      }
    }
    
    return {
      type: 'orderedList',
      content
    };
  }

  private createListItem(element: Element): JSONContent {
    const content = this.getBlockContent(element);
    return {
      type: 'listItem',
      content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }]
    };
  }

  private createBlockquote(element: Element): JSONContent {
    const content = this.getBlockContent(element);
    return {
      type: 'blockquote',
      content
    };
  }

  private createCode(element: Element): JSONContent {
    return {
      type: 'text',
      marks: [{ type: 'code' }],
      text: element.textContent || ''
    };
  }

  private createCodeBlock(element: Element): JSONContent {
    return {
      type: 'codeBlock',
      content: [
        {
          type: 'text',
          text: element.textContent || ''
        }
      ]
    };
  }

  private createImage(element: Element): JSONContent {
    const src = element.getAttribute('src') || '';
    const alt = element.getAttribute('alt') || '';
    const title = element.getAttribute('title') || '';
    
    return {
      type: 'image',
      attrs: {
        src,
        alt,
        title,
        align: 'center', // Default alignment
        width: null,
        height: null
      }
    };
  }

  private getInlineContent(element: Element): JSONContent[] {
    const content: JSONContent[] = [];
    
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === 3) { // Text node
        const text = child.textContent;
        if (text) {
          content.push({
            type: 'text',
            text
          });
        }
      } else if (child.nodeType === 1) { // Element node
        const childElement = child as Element;
        const tagName = childElement.tagName.toLowerCase();
        
        switch (tagName) {
          case 'strong':
          case 'b':
            content.push(this.createBold(childElement));
            break;
          case 'em':
          case 'i':
            content.push(this.createItalic(childElement));
            break;
          case 'u':
            content.push(this.createUnderline(childElement));
            break;
          case 'a':
            content.push(this.createLink(childElement));
            break;
          case 'code':
            content.push(this.createCode(childElement));
            break;
          case 'br':
            content.push({ type: 'hardBreak' });
            break;
          default:
            // For other inline elements, get their text content
            const text = childElement.textContent;
            if (text) {
              content.push({
                type: 'text',
                text
              });
            }
        }
      }
    }
    
    return content;
  }

  private getBlockContent(element: Element): JSONContent[] {
    const content: JSONContent[] = [];
    
    for (const child of Array.from(element.childNodes)) {
      const node = this.convertDomNode(child);
      if (node) {
        // Ensure block content is properly wrapped
        if (node.type === 'text') {
          content.push({
            type: 'paragraph',
            content: [node]
          });
        } else {
          content.push(node);
        }
      }
    }
    
    return content;
  }

  private processInlineChildren(element: Element): JSONContent | null {
    const content = this.getInlineContent(element);
    if (content.length === 0) return null;
    
    // If it's just text content, return a text node
    if (content.length === 1 && content[0].type === 'text') {
      return content[0];
    }
    
    // Otherwise, wrap in a paragraph
    return {
      type: 'paragraph',
      content
    };
  }
}

/**
 * Migration service for converting reading lessons
 */
export class ReadingLessonMigrator {
  private converter: HtmlToRichDocConverter;

  constructor() {
    this.converter = new HtmlToRichDocConverter();
  }

  /**
   * Migrate a single reading lesson from legacy format to rich document format
   */
  migrateLesson(lesson: ReadingLesson): {
    richPages: RichPage[];
    migrationLog: string[];
  } {
    const migrationLog: string[] = [];
    const richPages: RichPage[] = [];

    try {
      migrationLog.push(`Starting migration for lesson: ${lesson.title}`);

      // Handle different content sources
      if (lesson.pages && Array.isArray(lesson.pages) && lesson.pages.length > 0) {
        // Migrate from pages array (LegacyPage[] format)
        migrationLog.push(`Found ${lesson.pages.length} pages to migrate`);
        
        for (let i = 0; i < lesson.pages.length; i++) {
          const page = lesson.pages[i] as LegacyPage;
          const richPage = this.migrateLegacyPage(page, i, migrationLog);
          richPages.push(richPage);
        }
      } else {
        // Migrate from single content field
        migrationLog.push('Migrating from single content field');
        const richPage = this.migrateContentToPage(lesson.content, lesson, migrationLog);
        richPages.push(richPage);
      }

      migrationLog.push(`Migration completed successfully. Created ${richPages.length} rich pages.`);
      
    } catch (error) {
      migrationLog.push(`Migration failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }

    return { richPages, migrationLog };
  }

  /**
   * Migrate a legacy page to rich page format
   */
  private migrateLegacyPage(legacyPage: LegacyPage, pageIndex: number, migrationLog: string[]): RichPage {
    migrationLog.push(`Migrating page ${pageIndex + 1}: ${legacyPage.id}`);
    
    const doc: JSONContent = {
      type: 'doc',
      content: []
    };

    // Add imagesAbove at the beginning
    if (legacyPage.imagesAbove && legacyPage.imagesAbove.length > 0) {
      migrationLog.push(`Adding ${legacyPage.imagesAbove.length} images above content`);
      
      for (const imageUrl of legacyPage.imagesAbove) {
        doc.content!.push({
          type: 'image',
          attrs: {
            src: imageUrl,
            alt: 'Migrated image',
            align: 'center',
            width: null,
            height: null
          }
        });
      }
    }

    // Convert main content
    if (legacyPage.content) {
      migrationLog.push('Converting main content from HTML to ProseMirror');
      const convertedContent = this.converter.convertHtmlToProseMirror(legacyPage.content);
      
      if (convertedContent.content) {
        doc.content!.push(...convertedContent.content);
      }
    }

    // Add imagesBelow at the end
    if (legacyPage.imagesBelow && legacyPage.imagesBelow.length > 0) {
      migrationLog.push(`Adding ${legacyPage.imagesBelow.length} images below content`);
      
      for (const imageUrl of legacyPage.imagesBelow) {
        doc.content!.push({
          type: 'image',
          attrs: {
            src: imageUrl,
            alt: 'Migrated image',
            align: 'center',
            width: null,
            height: null
          }
        });
      }
    }

    // Ensure there's at least one paragraph if no content
    if (!doc.content || doc.content.length === 0) {
      doc.content = [
        {
          type: 'paragraph',
          content: []
        }
      ];
    }

    return {
      id: legacyPage.id,
      doc: doc as RichDoc,
      meta: {
        wordCount: this.calculateWordCount(doc)
      }
    };
  }

  /**
   * Migrate content field to a single rich page
   */
  private migrateContentToPage(content: string, lesson: ReadingLesson, migrationLog: string[]): RichPage {
    const doc = this.converter.convertHtmlToProseMirror(content);
    
    migrationLog.push('Converted main content to ProseMirror format');

    return {
      id: `page-1`,
      doc: doc as RichDoc,
      meta: {
        wordCount: this.calculateWordCount(doc)
      }
    };
  }

  /**
   * Calculate word count from ProseMirror document
   */
  private calculateWordCount(doc: JSONContent): number {
    let wordCount = 0;
    
    const traverse = (node: JSONContent) => {
      if (node.type === 'text' && node.text) {
        wordCount += node.text.split(/\s+/).filter(word => word.length > 0).length;
      }
      
      if (node.content) {
        for (const child of node.content) {
          traverse(child);
        }
      }
    };
    
    traverse(doc);
    return wordCount;
  }

  /**
   * Validate migrated content
   */
  validateMigration(richPages: RichPage[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!richPages || richPages.length === 0) {
      errors.push('No rich pages generated');
      return { valid: false, errors };
    }

    for (let i = 0; i < richPages.length; i++) {
      const page = richPages[i];
      
      if (!page.id) {
        errors.push(`Page ${i + 1} missing ID`);
      }
      
      if (!page.doc) {
        errors.push(`Page ${i + 1} missing document`);
        continue;
      }
      
      if (page.doc.type !== 'doc') {
        errors.push(`Page ${i + 1} invalid document type: ${page.doc.type}`);
      }
      
      if (!page.doc.content || !Array.isArray(page.doc.content)) {
        errors.push(`Page ${i + 1} missing or invalid content array`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Singleton instance
export const readingLessonMigrator = new ReadingLessonMigrator();
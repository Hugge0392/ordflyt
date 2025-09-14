import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { BlockManager } from "@/components/blocks/BlockManager";
import { htmlToRichDoc, richDocToHtml, createEmptyRichDoc, migrateLegacyPage, countWords, richDocToBlocks, blocksToRichDoc, blocksToHtml, migrateLegacyPageToBlocks } from "@/lib/content-converter";
import type { Block } from "@/components/blocks/types";
import { createTextBlock } from "@/components/blocks/types";
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Plus, 
  Trash2, 
  BookOpen, 
  FileText, 
  MessageSquare, 
  Book, 
  Settings,
  Upload,
  Download,
  Copy,
  CheckCircle,
  Image,
  Globe,
  EyeOff
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { ReadingQuestion, ReadingLesson as SchemaReadingLesson, WordDefinition as SchemaWordDefinition } from "@shared/schema";

interface WordDefinition {
  id?: string; // Make id optional to match schema
  word: string;
  definition: string;
  context?: string; // Add context to match schema
}

interface Question {
  id: string;
  type: 'multiple-choice' | 'multiple_choice' | 'true-false' | 'true_false' | 'open' | 'open_ended';
  question: string;
  alternatives?: string[];
  options?: string[]; // for legacy support
  correctAnswer?: string | number | boolean;
  explanation?: string;
  pageNumber?: number;
}

interface PreReadingQuestion {
  id: string;
  question: string;
  purpose: string;
}

interface LocalReadingLesson {
  id: string;
  title: string;
  description: string | null;
  gradeLevel: string;
  subject: string | null;
  readingTime: number | null;
  content: string;
  featuredImage?: string | null;
  preReadingQuestions: PreReadingQuestion[];
  questions: Question[];
  wordDefinitions: WordDefinition[];
  isPublished: boolean;
  createdAt: string | Date | null;
}

export default function ReadingLessonBuilder() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/lasforstaelse/skapa/:id");
  const lessonId = params?.id;
  
  // Main lesson state
  const [editingLesson, setEditingLesson] = useState<LocalReadingLesson | null>(null);
  const [localPages, setLocalPages] = useState<{ id: string; content: string; doc?: any; blocks?: Block[]; imagesAbove?: string[]; imagesBelow?: string[]; questions?: Question[] }[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  // UI state
  const [activeTab, setActiveTab] = useState("content");
  const [showPreview, setShowPreview] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  
  // Form states for dialogs
  const [newQuestionForm, setNewQuestionForm] = useState({
    type: 'multiple-choice' as Question['type'],
    question: '',
    alternatives: ['', '', '', ''],
    correctAnswer: 0 as number | boolean,
    explanation: '',
    pageNumber: 1
  });
  
  const [newWordDefinition, setNewWordDefinition] = useState({ word: '', definition: '' });
  const [newPreReadingQuestion, setNewPreReadingQuestion] = useState('');
  
  const [newLessonForm, setNewLessonForm] = useState({
    title: '',
    description: '',
    gradeLevel: '6',
    subject: 'Svenska',
    readingTime: 10,
    featuredImage: '',
    isPublished: false,
    numberOfPages: 1
  });

  // Fetch the specific lesson based on URL parameter
  const { data: lesson, isLoading } = useQuery<SchemaReadingLesson>({
    queryKey: ["/api/reading-lessons", lessonId],
    enabled: !!lessonId,
  });

  // Auto-load lesson when data arrives
  useEffect(() => {
    if (lesson) {
      // Just load the lesson as is - don't extract questions from pages
      // The questions saved on pages should stay on pages (these are "Under läsning" questions)
      // The questions in lesson.questions are global questions from "Frågor" tab
      
      setEditingLesson({
        ...lesson,
        isPublished: Boolean(lesson.isPublished), // Convert number to boolean
        questions: (lesson.questions || []).map(q => ({
          ...q,
          // Ensure alternatives is set for compatibility
          alternatives: q.alternatives || q.options
        })), // Keep only global questions
        wordDefinitions: (lesson.wordDefinitions || []).map((w, index) => ({
          ...w,
          id: `wd-${index}-${Date.now()}` // Generate consistent id for local use
        }))
      });
      
      const numberOfPages = (lesson as any)?.numberOfPages || 1;
      
      // Load pages with their questions intact (these will be "Under läsning" questions)
      if ((lesson as any).pages && (lesson as any).pages.length > 0) {
        // Migrate legacy pages to block format
        const migratedPages = (lesson as any).pages.map((page: any) => {
          let blocks: Block[] = [];
          
          if (page.blocks && Array.isArray(page.blocks)) {
            // Already in block format
            blocks = page.blocks;
          } else if (page.doc) {
            // Convert from RichDoc to blocks
            blocks = richDocToBlocks(page.doc);
          } else if (page.content && typeof page.content === 'string') {
            // Convert from HTML to blocks
            blocks = migrateLegacyPageToBlocks(page);
          } else {
            // Empty page
            blocks = [createTextBlock()];
          }
          
          return {
            ...page,
            blocks: blocks,
            // Keep legacy fields for backward compatibility
            doc: page.doc || (blocks.length > 0 ? blocksToRichDoc(blocks) : createEmptyRichDoc()),
            content: page.content || blocksToHtml(blocks)
          };
        });
        setLocalPages(migratedPages);
      } else {
        // Create empty pages based on numberOfPages
        const emptyPages = Array.from({ length: numberOfPages }, (_, index) => ({
          id: `page-${index + 1}`,
          content: '',
          doc: createEmptyRichDoc(),
          blocks: [createTextBlock()],
          imagesAbove: [],
          imagesBelow: [],
          questions: []
        }));
        setLocalPages(emptyPages);
      }
      
      // Update form with lesson data
      setNewLessonForm({
        title: lesson.title || '',
        description: lesson.description || '',
        gradeLevel: lesson.gradeLevel || '6',
        subject: lesson.subject || 'Svenska',
        readingTime: lesson.readingTime || 10,
        featuredImage: lesson.featuredImage || '',
        isPublished: Boolean(lesson.isPublished),
        numberOfPages: numberOfPages
      });
    }
  }, [lesson]);

  // Update pages when numberOfPages changes
  useEffect(() => {
    if (newLessonForm.numberOfPages !== localPages.length) {
      const currentPagesCount = localPages.length;
      const targetPagesCount = newLessonForm.numberOfPages;
      
      if (targetPagesCount > currentPagesCount) {
        // Add more pages
        const newPages = Array.from({ length: targetPagesCount - currentPagesCount }, (_, index) => ({
          id: `page-${currentPagesCount + index + 1}`,
          content: '',
          doc: createEmptyRichDoc(),
          blocks: [createTextBlock()],
          imagesAbove: [],
          imagesBelow: [],
          questions: []
        }));
        setLocalPages(prev => [...prev, ...newPages]);
      } else if (targetPagesCount < currentPagesCount) {
        // Remove excess pages
        setLocalPages(prev => prev.slice(0, targetPagesCount));
        // Reset page index if it's outside the new range
        if (currentPageIndex >= targetPagesCount) {
          setCurrentPageIndex(0);
        }
      }
    }
  }, [newLessonForm.numberOfPages]);

  // Update lesson mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, lesson }: { id: string, lesson: Partial<SchemaReadingLesson> }) => {
      return apiRequest('PUT', `/api/reading-lessons/${id}`, lesson);
    },
    onSuccess: (updatedLesson) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons", lessonId] });
      // Keep user in editor and sync back server truth:
      setEditingLesson(updatedLesson);
      // Update local pages, preferring block pages, then rich pages, then legacy
      if ((updatedLesson as any).blockPages && (updatedLesson as any).blockPages.length > 0) {
        // Use new block pages format
        const blockPages = (updatedLesson as any).blockPages.map((blockPage: any) => ({
          id: blockPage.id,
          blocks: blockPage.blocks || [createTextBlock()],
          content: blocksToHtml(blockPage.blocks || [createTextBlock()]),
          doc: blocksToRichDoc(blockPage.blocks || [createTextBlock()]),
          imagesAbove: [],
          imagesBelow: [],
          questions: blockPage.questions || []
        }));
        setLocalPages(blockPages);
      } else if ((updatedLesson as any).richPages && (updatedLesson as any).richPages.length > 0) {
        // Convert rich pages to block format
        const richPages = (updatedLesson as any).richPages.map((richPage: any) => {
          const blocks = richPage.blocks || (richPage.doc ? richDocToBlocks(richPage.doc) : [createTextBlock()]);
          return {
            id: richPage.id,
            blocks: blocks,
            content: richDocToHtml(richPage.doc || blocksToRichDoc(blocks)),
            doc: richPage.doc || blocksToRichDoc(blocks),
            imagesAbove: richPage.imagesAbove || [],
            imagesBelow: richPage.imagesBelow || [],
            questions: richPage.questions || []
          };
        });
        setLocalPages(richPages);
      } else if ((updatedLesson as any).pages) {
        // Fallback to legacy pages format - convert to blocks
        const legacyPages = (updatedLesson as any).pages.map((page: any) => {
          const blocks = migrateLegacyPageToBlocks(page);
          return {
            ...page,
            blocks: blocks,
            doc: page.doc || blocksToRichDoc(blocks),
            content: page.content || blocksToHtml(blocks)
          };
        });
        setLocalPages(legacyPages);
      }
      toast({ 
        title: "Lektion uppdaterad!", 
        description: "Ändringarna har sparats." 
      });
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera lektionen",
        variant: "destructive"
      });
    }
  });

  // Delete lesson mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/reading-lessons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      toast({
        title: "Lektion borttagen",
        description: "Lektionen har tagits bort permanent",
      });
      setLocation("/lasforstaelse/skapa");
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte ta bort lektionen",
        variant: "destructive",
      });
    },
  });

  // Save content manually
  const handleSaveContent = async () => {
    if (!lesson || !editingLesson) return;
    
    // Check if there's any content (blocks, RichDoc, or HTML)
    const hasContent = localPages.some(page => 
      (page.blocks && page.blocks.length > 0 && page.blocks.some(block => 
        (block.type === 'text' && block.data.content && block.data.content.content && block.data.content.content.length > 0) ||
        (block.type === 'image' && block.data.src)
      )) ||
      (page.content && page.content.trim()) || 
      (page.doc && page.doc.content && page.doc.content.length > 0)
    );
    
    if (localPages.length === 0 || !hasContent) {
      toast({
        title: "Ingen text att spara",
        description: "Skriv något innehåll först",
        variant: "destructive"
      });
      return;
    }

    // Combine all page content for the main content field (backward compatibility)
    const combinedContent = localPages.map(page => {
      // Prioritize blocks format, then fallback to legacy formats
      if (page.blocks && page.blocks.length > 0) {
        return blocksToHtml(page.blocks);
      }
      return page.content || richDocToHtml(page.doc || createEmptyRichDoc());
    }).join('\n\n--- SIDBRYTNING ---\n\n');

    // Prepare pages with questions distributed - now with block format
    const enhancedPages = localPages.map((page, index) => {
      const pageNumber = index + 1;
      // Get questions from both sources:
      // 1. From editingLesson.questions (global "Frågor" tab questions)
      const globalQuestionsForThisPage = editingLesson.questions?.filter(q => q.pageNumber === pageNumber) || [];
      // 2. From page.questions (local "Under läsning" tab questions)
      const localQuestionsForThisPage = page.questions || [];
      
      // Combine both types of questions
      const allQuestionsForThisPage = [...globalQuestionsForThisPage, ...localQuestionsForThisPage];
      
      // Ensure we have blocks
      const pageBlocks = page.blocks || [createTextBlock()];
      const pageRichDoc = blocksToRichDoc(pageBlocks);
      
      return {
        id: page.id,
        blocks: pageBlocks, // New block format
        doc: pageRichDoc, // RichDoc for backward compatibility
        meta: {
          wordCount: countWords(pageRichDoc),
          blockCount: pageBlocks.length
        },
        // Include backward compatibility fields
        content: blocksToHtml(pageBlocks),
        imagesAbove: page.imagesAbove || [],
        imagesBelow: page.imagesBelow || [],
        questions: allQuestionsForThisPage
      };
    });

    await updateMutation.mutateAsync({
      id: lesson.id,
      lesson: {
        content: combinedContent, // Legacy content field
        pages: enhancedPages.map(page => ({ // Legacy pages format with enhanced data
          id: page.id,
          content: page.content,
          doc: page.doc,
          imagesAbove: page.imagesAbove,
          imagesBelow: page.imagesBelow,
          questions: page.questions
        })),
        richPages: enhancedPages, // Rich pages format with block support
        blockPages: enhancedPages.map(page => ({ // New block pages format
          id: page.id,
          blocks: page.blocks,
          meta: page.meta,
          questions: page.questions
        })),
        migrated: true, // Mark as migrated to block format
        blockFormatVersion: '1.0', // Version tracking for future migrations
        title: newLessonForm.title || lesson.title,
        gradeLevel: newLessonForm.gradeLevel || lesson.gradeLevel,
        description: newLessonForm.description || lesson.description,
        subject: newLessonForm.subject || lesson.subject,
        readingTime: newLessonForm.readingTime || lesson.readingTime,
        featuredImage: newLessonForm.featuredImage || lesson.featuredImage,
        preReadingQuestions: editingLesson.preReadingQuestions ?? [],
        questions: [], // Clear global questions since they're now distributed to pages
        wordDefinitions: editingLesson.wordDefinitions ?? [],
        isPublished: newLessonForm.isPublished ? 1 : 0, // Convert boolean to number
        numberOfPages: newLessonForm.numberOfPages
      } as Partial<SchemaReadingLesson>
    });
  };

  // Add question
  const addQuestion = () => {
    if (!editingLesson) return;
    
    const question: Question = {
      id: Date.now().toString(),
      type: newQuestionForm.type,
      question: newQuestionForm.question,
      alternatives: newQuestionForm.type === 'multiple-choice' ? newQuestionForm.alternatives : undefined,
      correctAnswer: newQuestionForm.type === 'multiple-choice' ? newQuestionForm.correctAnswer : 
                    newQuestionForm.type === 'true-false' ? newQuestionForm.alternatives[0] : undefined,
      explanation: newQuestionForm.explanation || undefined,
      pageNumber: newQuestionForm.pageNumber
    };

    setEditingLesson({
      ...editingLesson,
      questions: [...editingLesson.questions, question]
    });

    // Reset form but keep the selected page
    setNewQuestionForm(prev => ({
      type: 'multiple-choice',
      question: '',
      alternatives: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      pageNumber: prev.pageNumber // Keep the currently selected page
    }));
  };

  // Add word definition
  const addWordDefinition = () => {
    if (!editingLesson || !newWordDefinition.word.trim() || !newWordDefinition.definition.trim()) return;
    
    const definition: WordDefinition = {
      id: Date.now().toString(),
      word: newWordDefinition.word.trim(),
      definition: newWordDefinition.definition.trim()
    };

    setEditingLesson({
      ...editingLesson,
      wordDefinitions: [...editingLesson.wordDefinitions, definition]
    });

    setNewWordDefinition({ word: '', definition: '' });
  };

  // Add pre-reading question
  const addPreReadingQuestion = () => {
    if (!editingLesson || !newPreReadingQuestion.trim()) return;
    
    const question: PreReadingQuestion = {
      id: Date.now().toString(),
      question: newPreReadingQuestion.trim(),
      purpose: 'Förbered läsningen' // Default purpose
    };

    setEditingLesson({
      ...editingLesson,
      preReadingQuestions: [...editingLesson.preReadingQuestions, question]
    });

    setNewPreReadingQuestion('');
  };

  // Remove functions
  const removeQuestion = (id: string) => {
    if (!editingLesson) return;
    setEditingLesson({
      ...editingLesson,
      questions: editingLesson.questions.filter(q => q.id !== id)
    });
  };

  // Move question to different page
  const moveQuestion = (questionId: string, newPageNumber: number) => {
    if (!editingLesson) return;
    setEditingLesson({
      ...editingLesson,
      questions: editingLesson.questions.map(q => 
        q.id === questionId ? { ...q, pageNumber: newPageNumber } : q
      )
    });
  };

  const removeWordDefinition = (id: string | undefined) => {
    if (!editingLesson || !id) return;
    setEditingLesson({
      ...editingLesson,
      wordDefinitions: editingLesson.wordDefinitions.filter(w => (w.id || w.word) !== id)
    });
  };

  const removePreReadingQuestion = (id: string) => {
    if (!editingLesson) return;
    setEditingLesson({
      ...editingLesson,
      preReadingQuestions: editingLesson.preReadingQuestions.filter(q => q.id !== id)
    });
  };

  // Add reading question to current page
  const addReadingQuestion = () => {
    if (!newQuestionForm.question.trim() || localPages.length === 0) return;
    
    // Create the question object
    const question: Question = {
      id: Date.now().toString(),
      type: newQuestionForm.type,
      question: newQuestionForm.question.trim(),
      alternatives: newQuestionForm.type === 'multiple-choice' ? newQuestionForm.alternatives : undefined,
      correctAnswer: newQuestionForm.correctAnswer,
      explanation: newQuestionForm.explanation || undefined
    };

    // Add question to the selected page based on pageNumber
    const targetPageIndex = (newQuestionForm.pageNumber || 1) - 1;
    const updatedPages = [...localPages];
    if (updatedPages[targetPageIndex]) {
      updatedPages[targetPageIndex] = {
        ...updatedPages[targetPageIndex],
        questions: [...(updatedPages[targetPageIndex].questions || []), question]
      };
      setLocalPages(updatedPages);
    }

    // Reset form but keep the selected page
    setNewQuestionForm(prev => ({
      type: 'multiple-choice',
      question: '',
      alternatives: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      pageNumber: prev.pageNumber // Keep the currently selected page
    }));
  };

  // Remove reading question from specific page
  const removeReadingQuestion = (pageId: string, questionId: string) => {
    const updatedPages = localPages.map(page => {
      if (page.id === pageId) {
        return {
          ...page,
          questions: (page.questions || []).filter(q => q.id !== questionId)
        };
      }
      return page;
    });
    setLocalPages(updatedPages);
  };

  // Move reading question between pages
  const moveReadingQuestion = (questionId: string, fromPageId: string, toPageIndex: number) => {
    // Find the question to move
    let questionToMove: Question | null = null;
    
    // Remove from source page
    const updatedPages = localPages.map(page => {
      if (page.id === fromPageId) {
        const questions = page.questions || [];
        questionToMove = questions.find(q => q.id === questionId) || null;
        return {
          ...page,
          questions: questions.filter(q => q.id !== questionId)
        };
      }
      return page;
    });

    // Add to target page
    if (questionToMove && updatedPages[toPageIndex]) {
      updatedPages[toPageIndex] = {
        ...updatedPages[toPageIndex],
        questions: [...(updatedPages[toPageIndex].questions || []), questionToMove]
      };
    }

    setLocalPages(updatedPages);
  };

  // Handle featured image upload
  const uploadMap = useRef<Record<string, { objectPath?: string; publicURL?: string }>>({});

  const handleFeaturedImageUpload = async (file: any) => {
    try {
      const response = await fetch("/api/objects/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      
      if (!response.ok) throw new Error("Failed to get upload URL");
      
      const { uploadURL, objectPath, publicURL } = await response.json();
      
      // Save the server's path for use in onComplete
      uploadMap.current[file.name] = { objectPath, publicURL };
      
      return {
        method: "PUT" as const,
        url: uploadURL,
        headers: { "Content-Type": file.type }
      };
    } catch (error) {
      console.error("Error getting upload URL:", error);
      throw error;
    }
  };

  const handleFeaturedImageComplete = (result: any) => {
    if (result.successful && result.successful[0]) {
      const file = result.successful[0];
      
      // Use the actual path returned by the server
      const saved = uploadMap.current[file.name] || {};
      const finalUrl = saved.publicURL || saved.objectPath;
      
      if (!finalUrl) {
        // Fallback: check if the response contains the path
        const maybeFromLib = file?.response?.body?.publicURL || file?.response?.body?.objectPath;
        if (!maybeFromLib) {
          console.warn("No object path/public URL was found for uploaded file");
          return;
        }
        setNewLessonForm(prev => ({ ...prev, featuredImage: maybeFromLib }));
        toast({
          title: "Bild uppladdad!",
          description: "Utvald bild har lagts till"
        });
        return;
      }
      
      setNewLessonForm(prev => ({
        ...prev,
        featuredImage: finalUrl
      }));
      
      toast({
        title: "Bild uppladdad!",
        description: "Utvald bild har lagts till"
      });
    }
  };

  // Toggle publish status
  const handleTogglePublish = () => {
    if (!lesson || !editingLesson) return;

    const newPublishStatus = !newLessonForm.isPublished;
    
    setNewLessonForm(prev => ({
      ...prev,
      isPublished: newPublishStatus
    }));

    // Save immediately with ALL form data including featuredImage
    const updatedLesson: Partial<SchemaReadingLesson> = {
      title: newLessonForm.title,
      description: newLessonForm.description,
      gradeLevel: newLessonForm.gradeLevel,
      subject: newLessonForm.subject,
      readingTime: newLessonForm.readingTime,
      featuredImage: newLessonForm.featuredImage,
      isPublished: newPublishStatus ? 1 : 0 // Convert boolean to number
    };

    updateMutation.mutate({ 
      id: lesson.id, 
      lesson: updatedLesson 
    });
  };

  // Export lesson functionality
  const handleExportLesson = async () => {
    if (!lesson) return;

    try {
      const response = await fetch(`/api/reading-lessons/${lesson.id}/export`);
      if (!response.ok) throw new Error("Failed to export");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${lesson.title.replace(/\s+/g, '-').toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export lyckades!",
        description: "Lektionen har laddats ned som HTML-fil"
      });
    } catch (error) {
      toast({
        title: "Export misslyckades",
        description: "Kunde inte exportera lektionen",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/lasforstaelse">
            <Button variant="outline" size="sm" data-testid="button-back-reading-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till läsförståelse
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-blue-600" />
              Redigera lektion
            </h1>
            <p className="text-gray-600">Avancerat verktyg för att redigera interaktiva läsövningar</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Laddar lektion...</p>
            </div>
          </div>
        ) : !lesson ? (
          <Card className="h-96">
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center">
                <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">Lektion hittades inte</h3>
                <p className="text-gray-500">Den begärda lektionen kunde inte hittas.</p>
                <Button 
                  onClick={() => setLocation("/lasforstaelse/skapa")}
                  className="mt-4"
                  data-testid="button-back-to-selector"
                >
                  Tillbaka till lektionsval
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Lesson Header */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{editingLesson?.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Årskurs {editingLesson?.gradeLevel} • {editingLesson?.subject} • {editingLesson?.readingTime} min
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowPreview(true)}
                      data-testid="button-preview-lesson"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Förhandsgranska
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowSettingsDialog(true)}
                      data-testid="button-lesson-settings"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Inställningar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleExportLesson}
                      data-testid="button-export-lesson"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Exportera
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSaveContent}
                      disabled={updateMutation.isPending}
                      data-testid="button-save-content"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {updateMutation.isPending ? "Sparar..." : "Spara"}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => {
                        if (confirm("Är du säker på att du vill ta bort denna lektion? Detta kan inte ångras.")) {
                          deleteMutation.mutate(lesson.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      data-testid="button-delete-lesson"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {deleteMutation.isPending ? "Tar bort..." : "Ta bort"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation("/lasforstaelse/skapa")}
                      data-testid="button-back-to-list"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Tillbaka
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Editor Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="content" data-testid="tab-content">
                      <FileText className="w-4 h-4 mr-2" />
                      Innehåll
                    </TabsTrigger>
                    <TabsTrigger value="prereading" data-testid="tab-prereading">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Innan du läser
                    </TabsTrigger>
                    <TabsTrigger value="reading-questions" data-testid="tab-reading-questions">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Under läsning
                    </TabsTrigger>
                    <TabsTrigger value="questions" data-testid="tab-questions">
                      <Book className="w-4 h-4 mr-2" />
                      Frågor
                    </TabsTrigger>
                    <TabsTrigger value="definitions" data-testid="tab-definitions">
                      <Settings className="w-4 h-4 mr-2" />
                      Ordförklaringar
                    </TabsTrigger>
                  </TabsList>

                  {/* Content Tab */}
                  <TabsContent value="content" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Redigera text och innehåll</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Använd den avancerade textredigeraren för att skapa engagerande innehåll med bilder, formatering och sidbrytningar.
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Page Navigation */}
                          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div>
                              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                📄 Sida {currentPageIndex + 1} av {newLessonForm.numberOfPages}
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                                Varje sida har sin egen textredigerare
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                                disabled={currentPageIndex === 0}
                              >
                                ← Föregående
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPageIndex(Math.min(newLessonForm.numberOfPages - 1, currentPageIndex + 1))}
                                disabled={currentPageIndex >= newLessonForm.numberOfPages - 1}
                              >
                                Nästa →
                              </Button>
                            </div>
                          </div>

                          {/* Current Page Editor */}
                          {localPages[currentPageIndex] && (
                            <div className="border rounded-lg p-4 min-h-[400px] bg-white dark:bg-gray-900">
                              <BlockManager
                                blocks={localPages[currentPageIndex].blocks || [createTextBlock()]}
                                onChange={(blocks) => {
                                  setLocalPages(prev => {
                                    const updated = [...prev];
                                    updated[currentPageIndex] = {
                                      ...updated[currentPageIndex],
                                      blocks: blocks,
                                      // Keep legacy formats for backward compatibility
                                      doc: blocksToRichDoc(blocks),
                                      content: blocksToHtml(blocks)
                                    };
                                    return updated;
                                  });
                                }}
                                readonly={false}
                                className="min-h-[350px]"
                              />
                              {(!localPages[currentPageIndex].blocks || localPages[currentPageIndex].blocks.length === 0) && (
                                <div className="text-center py-8 text-gray-500">
                                  <p className="text-sm">Sida {currentPageIndex + 1} är tom</p>
                                  <p className="text-xs mt-1">Klicka "Lägg till block" för att börja redigera</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Pre-reading Questions Tab */}
                  <TabsContent value="prereading" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Innan du läser - frågor</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Skapa frågor som eleverna ska fundera på innan de läser texten
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            value={newPreReadingQuestion}
                            onChange={(e) => setNewPreReadingQuestion(e.target.value)}
                            placeholder="Skriv en fråga att fundera på..."
                            data-testid="input-prereading-question"
                          />
                          <Button 
                            onClick={addPreReadingQuestion}
                            disabled={!newPreReadingQuestion.trim()}
                            data-testid="button-add-prereading"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          {editingLesson?.preReadingQuestions?.map((question, index) => (
                            <div key={question.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                              <span className="font-medium text-sm">{index + 1}.</span>
                              <span className="flex-1">{question.question}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removePreReadingQuestion(question.id)}
                                data-testid={`button-remove-prereading-${question.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Reading Questions Tab - Questions that appear during reading */}
                  <TabsContent value="reading-questions" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Frågor under läsning</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Skapa frågor som eleverna svarar på medan de läser texten. Frågorna visas bredvid texten för att hjälpa eleverna hänga med.
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-4 border rounded-lg bg-blue-50">
                          <h4 className="font-medium mb-3 text-blue-800">Lägg till fråga för aktuell sida</h4>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Frågetyp</Label>
                                <Select 
                                  value={newQuestionForm.type} 
                                  onValueChange={(value: Question['type']) => setNewQuestionForm(prev => ({ ...prev, type: value }))}
                                >
                                  <SelectTrigger data-testid="select-reading-question-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="multiple-choice">Flerval</SelectItem>
                                    <SelectItem value="true-false">Sant/Falskt</SelectItem>
                                    <SelectItem value="open">Öppen fråga</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="p-3 border-2 border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-950">
                                <Label className="text-blue-700 dark:text-blue-300 font-semibold">📖 Vilken sida ska frågan visas på?</Label>
                                <Select 
                                  value={newQuestionForm.pageNumber?.toString() || "1"} 
                                  onValueChange={(value) => setNewQuestionForm(prev => ({ ...prev, pageNumber: parseInt(value) }))}
                                >
                                  <SelectTrigger data-testid="select-reading-question-page" className="mt-2 border-blue-300">
                                    <SelectValue placeholder="Välj sida" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: newLessonForm.numberOfPages }, (_, i) => (
                                      <SelectItem key={i + 1} value={(i + 1).toString()}>Sida {i + 1}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div>
                              <Label>Fråga</Label>
                              <Textarea
                                value={newQuestionForm.question}
                                onChange={(e) => setNewQuestionForm(prev => ({ ...prev, question: e.target.value }))}
                                placeholder="Skriv din fråga för denna del av texten..."
                                data-testid="textarea-reading-question"
                              />
                            </div>

                            {newQuestionForm.type === 'multiple-choice' && (
                              <div>
                                <Label>Svarsalternativ</Label>
                                <div className="space-y-2">
                                  {newQuestionForm.alternatives.map((alt, index) => (
                                    <div key={index} className="flex gap-2">
                                      <Input
                                        value={alt}
                                        onChange={(e) => {
                                          const newAlts = [...newQuestionForm.alternatives];
                                          newAlts[index] = e.target.value;
                                          setNewQuestionForm(prev => ({ ...prev, alternatives: newAlts }));
                                        }}
                                        placeholder={`Alternativ ${index + 1}`}
                                        data-testid={`input-reading-alt-${index}`}
                                      />
                                      {index === newQuestionForm.correctAnswer && (
                                        <Badge variant="secondary" className="self-center">Rätt svar</Badge>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setNewQuestionForm(prev => ({ ...prev, correctAnswer: index }))}
                                        className={index === newQuestionForm.correctAnswer ? "bg-green-100" : ""}
                                        data-testid={`button-reading-correct-${index}`}
                                      >
                                        ✓
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {newQuestionForm.type === 'true-false' && (
                              <div>
                                <Label>Rätt svar</Label>
                                <Select 
                                  value={String(newQuestionForm.correctAnswer)} 
                                  onValueChange={(value) => setNewQuestionForm(prev => ({ ...prev, correctAnswer: value === 'true' ? true : false }))}
                                >
                                  <SelectTrigger data-testid="select-reading-true-false">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">Sant</SelectItem>
                                    <SelectItem value="false">Falskt</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div>
                              <Label>Förklaring (valfritt)</Label>
                              <Textarea
                                value={newQuestionForm.explanation}
                                onChange={(e) => setNewQuestionForm(prev => ({ ...prev, explanation: e.target.value }))}
                                placeholder="Förklara varför detta är rätt svar..."
                                data-testid="textarea-reading-explanation"
                              />
                            </div>

                            <Button 
                              onClick={() => addReadingQuestion()}
                              disabled={!newQuestionForm.question.trim()}
                              data-testid="button-add-reading-question"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Lägg till fråga under läsning
                            </Button>
                          </div>
                        </div>

                        {/* Display existing reading questions grouped by page */}
                        <div className="space-y-6">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-lg">Frågor under läsning</h4>
                            <Badge variant="secondary">
                              {localPages.reduce((total, page) => total + (page.questions?.length || 0), 0)} totalt
                            </Badge>
                          </div>
                          
                          {Array.from({ length: newLessonForm.numberOfPages }, (_, pageIndex) => {
                            const page = localPages[pageIndex];
                            const pageQuestions = page?.questions || [];
                            const pageNumber = pageIndex + 1;
                            
                            return (
                              <div key={pageIndex} className="border-2 rounded-lg p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                                    {pageNumber}
                                  </div>
                                  <h5 className="font-semibold text-lg">Sida {pageNumber}</h5>
                                  <Badge variant={pageQuestions.length > 0 ? "default" : "outline"} className="bg-green-600">
                                    {pageQuestions.length} frågor
                                  </Badge>
                                </div>
                                
                                {pageQuestions.length === 0 ? (
                                  <div className="p-4 border-2 border-dashed border-green-300 rounded-lg text-center">
                                    <p className="text-sm text-muted-foreground">Inga frågor för denna sida än</p>
                                    <p className="text-xs text-muted-foreground mt-1">Välj "Sida {pageNumber}" i formuläret ovan för att lägga till frågor här</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {pageQuestions.map((question, qIndex) => (
                                      <div key={question.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                              <Badge variant="outline">{question.type}</Badge>
                                              <span className="text-sm font-medium">Fråga {qIndex + 1}</span>
                                            </div>
                                            <p className="text-sm mb-2">{question.question}</p>
                                            {question.alternatives && question.type === 'multiple-choice' && (
                                              <div className="text-xs text-muted-foreground">
                                                Alternativ: {question.alternatives.join(', ')}
                                                <br />Rätt svar: {question.alternatives[question.correctAnswer as number]}
                                              </div>
                                            )}
                                            {question.explanation && (
                                              <p className="text-xs text-muted-foreground mt-1">
                                                Förklaring: {question.explanation}
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex gap-2">
                                            {/* Move question dropdown */}
                                            <Select
                                              value={(pageIndex + 1).toString()}
                                              onValueChange={(value) => moveReadingQuestion(question.id, page.id, parseInt(value) - 1)}
                                            >
                                              <SelectTrigger className="w-24 h-8 text-xs">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {Array.from({ length: newLessonForm.numberOfPages }, (_, i) => (
                                                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                                                    Sida {i + 1}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeReadingQuestion(page.id, question.id)}
                                              data-testid={`button-remove-reading-${question.id}`}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Questions Tab */}
                  <TabsContent value="questions" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Förståelsefrågor</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Skapa frågor för att testa elevernas förståelse av texten
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Add Question Form */}
                        <div className="p-4 border rounded-lg bg-gray-50">
                          <h4 className="font-medium mb-3">Lägg till ny fråga</h4>
                          <div className="space-y-3">
                            <div>
                              <Label>Frågetyp</Label>
                              <Select 
                                value={newQuestionForm.type} 
                                onValueChange={(value: Question['type']) => setNewQuestionForm(prev => ({ ...prev, type: value }))}
                              >
                                <SelectTrigger data-testid="select-question-type">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="multiple-choice">Flerval</SelectItem>
                                  <SelectItem value="true-false">Sant/Falskt</SelectItem>
                                  <SelectItem value="open">Öppen fråga</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>Fråga</Label>
                              <Textarea
                                value={newQuestionForm.question}
                                onChange={(e) => setNewQuestionForm(prev => ({ ...prev, question: e.target.value }))}
                                placeholder="Skriv din fråga här..."
                                data-testid="textarea-question-text"
                              />
                            </div>

                            {newQuestionForm.type === 'multiple-choice' && (
                              <div>
                                <Label>Svarsalternativ</Label>
                                <div className="space-y-2">
                                  {newQuestionForm.alternatives.map((alt, index) => (
                                    <div key={index} className="flex gap-2">
                                      <Input
                                        value={alt}
                                        onChange={(e) => {
                                          const newAlts = [...newQuestionForm.alternatives];
                                          newAlts[index] = e.target.value;
                                          setNewQuestionForm(prev => ({ ...prev, alternatives: newAlts }));
                                        }}
                                        placeholder={`Alternativ ${index + 1}`}
                                        data-testid={`input-alternative-${index}`}
                                      />
                                      <Button
                                        variant={newQuestionForm.correctAnswer === index ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setNewQuestionForm(prev => ({ ...prev, correctAnswer: index }))}
                                        data-testid={`button-correct-${index}`}
                                      >
                                        {newQuestionForm.correctAnswer === index ? <CheckCircle className="w-4 h-4" /> : "Rätt"}
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {newQuestionForm.type === 'true-false' && (
                              <div>
                                <Label>Rätt svar</Label>
                                <div className="flex gap-2">
                                  <Button
                                    variant={newQuestionForm.alternatives[0] === 'sant' ? "default" : "outline"}
                                    onClick={() => setNewQuestionForm(prev => ({ ...prev, alternatives: ['sant', 'falskt'] }))}
                                    data-testid="button-true"
                                  >
                                    Sant
                                  </Button>
                                  <Button
                                    variant={newQuestionForm.alternatives[0] === 'falskt' ? "default" : "outline"}
                                    onClick={() => setNewQuestionForm(prev => ({ ...prev, alternatives: ['falskt', 'sant'] }))}
                                    data-testid="button-false"
                                  >
                                    Falskt
                                  </Button>
                                </div>
                              </div>
                            )}

                            <div>
                              <Label>Förklaring (valfritt)</Label>
                              <Textarea
                                value={newQuestionForm.explanation}
                                onChange={(e) => setNewQuestionForm(prev => ({ ...prev, explanation: e.target.value }))}
                                placeholder="Förklaring av det rätta svaret..."
                                data-testid="textarea-question-explanation"
                              />
                            </div>

                            <Button 
                              onClick={addQuestion}
                              disabled={!newQuestionForm.question.trim()}
                              data-testid="button-add-question"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Lägg till fråga
                            </Button>
                          </div>
                        </div>

                        {/* Questions List grouped by page */}
                        <div className="space-y-6">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-lg">Sparade frågor</h4>
                            <Badge variant="secondary">{editingLesson?.questions?.length || 0} totalt</Badge>
                          </div>
                          
                          {Array.from({ length: newLessonForm.numberOfPages }, (_, pageIndex) => {
                            const pageNumber = pageIndex + 1;
                            const pageQuestions = editingLesson?.questions?.filter(q => q.pageNumber === pageNumber) || [];
                            
                            return (
                              <div key={pageNumber} className="border-2 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                                    {pageNumber}
                                  </div>
                                  <h5 className="font-semibold text-lg">Sida {pageNumber}</h5>
                                  <Badge variant={pageQuestions.length > 0 ? "default" : "outline"} className="bg-blue-600">
                                    {pageQuestions.length} frågor
                                  </Badge>
                                </div>
                                
                                {pageQuestions.length === 0 ? (
                                  <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg text-center">
                                    <p className="text-sm text-muted-foreground">Inga frågor för denna sida än</p>
                                    <p className="text-xs text-muted-foreground mt-1">Välj "Sida {pageNumber}" i formuläret ovan för att lägga till frågor här</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {pageQuestions.map((question, index) => (
                                      <div key={question.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                              <Badge variant="outline">{question.type}</Badge>
                                              <span className="text-sm font-medium">Fråga {index + 1}</span>
                                            </div>
                                            <p className="text-sm mb-2">{question.question}</p>
                                            {question.alternatives && question.type === 'multiple-choice' && (
                                              <div className="text-xs text-muted-foreground">
                                                Alternativ: {question.alternatives.join(', ')}
                                                <br />Rätt svar: {question.alternatives[question.correctAnswer as number]}
                                              </div>
                                            )}
                                            {question.explanation && (
                                              <p className="text-xs text-muted-foreground mt-1">
                                                Förklaring: {question.explanation}
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex gap-2">
                                            {/* Move question dropdown */}
                                            <Select
                                              value={question.pageNumber?.toString()}
                                              onValueChange={(value) => moveQuestion(question.id, parseInt(value))}
                                            >
                                              <SelectTrigger className="w-24 h-8 text-xs">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {Array.from({ length: newLessonForm.numberOfPages }, (_, i) => (
                                                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                                                    Sida {i + 1}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeQuestion(question.id)}
                                              data-testid={`button-remove-question-${question.id}`}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Word Definitions Tab */}
                  <TabsContent value="definitions" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Ordförklaringar</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Lägg till förklaringar för svåra ord som ska visas som tooltips i texten
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            value={newWordDefinition.word}
                            onChange={(e) => setNewWordDefinition(prev => ({ ...prev, word: e.target.value }))}
                            placeholder="Ord att förklara"
                            data-testid="input-word"
                          />
                          <Input
                            value={newWordDefinition.definition}
                            onChange={(e) => setNewWordDefinition(prev => ({ ...prev, definition: e.target.value }))}
                            placeholder="Förklaring"
                            className="flex-1"
                            data-testid="input-definition"
                          />
                          <Button 
                            onClick={addWordDefinition}
                            disabled={!newWordDefinition.word.trim() || !newWordDefinition.definition.trim()}
                            data-testid="button-add-definition"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          {editingLesson?.wordDefinitions?.map((def) => (
                            <div key={def.id || def.word} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                              <span className="font-medium">{def.word}:</span>
                              <span className="flex-1">{def.definition}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeWordDefinition(def.id || def.word)}
                                data-testid={`button-remove-definition-${def.id || def.word}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lektionsinställningar</DialogTitle>
            <DialogDescription>
              Hantera lektionens metadata och avancerade inställningar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="lesson-title">Titel</Label>
                <Input
                  id="lesson-title"
                  value={newLessonForm.title}
                  onChange={(e) => setNewLessonForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Lektionstitel"
                  data-testid="input-lesson-title"
                />
              </div>
              <div>
                <Label htmlFor="lesson-subject">Ämne</Label>
                <Input
                  id="lesson-subject"
                  value={newLessonForm.subject}
                  onChange={(e) => setNewLessonForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="t.ex. Svenska"
                  data-testid="input-lesson-subject"
                />
              </div>
              <div>
                <Label htmlFor="lesson-grade">Årskurs</Label>
                <Input
                  id="lesson-grade"
                  value={newLessonForm.gradeLevel}
                  onChange={(e) => setNewLessonForm(prev => ({ ...prev, gradeLevel: e.target.value }))}
                  placeholder="t.ex. 6"
                  data-testid="input-lesson-grade"
                />
              </div>
              <div>
                <Label htmlFor="lesson-time">Lästid (min)</Label>
                <Input
                  id="lesson-time"
                  type="number"
                  value={newLessonForm.readingTime}
                  onChange={(e) => setNewLessonForm(prev => ({ ...prev, readingTime: parseInt(e.target.value) || 10 }))}
                  placeholder="10"
                  data-testid="input-lesson-time"
                />
              </div>
              <div>
                <Label htmlFor="lesson-pages">Antal sidor</Label>
                <Input
                  id="lesson-pages"
                  type="number"
                  min="1"
                  max="10"
                  value={newLessonForm.numberOfPages}
                  onChange={(e) => setNewLessonForm(prev => ({ ...prev, numberOfPages: parseInt(e.target.value) || 1 }))}
                  placeholder="1"
                  data-testid="input-lesson-pages"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="lesson-description">Beskrivning</Label>
              <Textarea
                id="lesson-description"
                value={newLessonForm.description}
                onChange={(e) => setNewLessonForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Kort beskrivning av lektionen..."
                rows={3}
                data-testid="textarea-lesson-description"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <Label>Utvald bild</Label>
                {newLessonForm.featuredImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewLessonForm(prev => ({ ...prev, featuredImage: '' }))}
                    data-testid="button-remove-featured-image"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Ta bort bild
                  </Button>
                )}
              </div>
              
              {newLessonForm.featuredImage ? (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Image className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Bild uppladdad</p>
                      <p className="text-xs text-muted-foreground">{newLessonForm.featuredImage}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={5242880} // 5MB
                  onGetUploadParameters={handleFeaturedImageUpload}
                  onComplete={handleFeaturedImageComplete}
                  buttonClassName="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Ladda upp utvald bild
                </ObjectUploader>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Publicering</p>
                <p className="text-sm text-muted-foreground">
                  {newLessonForm.isPublished ? 
                    "Lektionen är publicerad och synlig för alla" : 
                    "Lektionen är ett utkast och endast synlig för lärare"}
                </p>
              </div>
              <Button
                variant={newLessonForm.isPublished ? "destructive" : "default"}
                onClick={handleTogglePublish}
                disabled={updateMutation.isPending}
                data-testid="button-toggle-publish-dialog"
              >
                {newLessonForm.isPublished ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Avpublicera
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mr-2" />
                    Publicera
                  </>
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowSettingsDialog(false)}
              data-testid="button-cancel-settings"
            >
              Stäng
            </Button>
            <Button 
              onClick={() => {
                handleSaveContent();
                setShowSettingsDialog(false);
              }}
              disabled={updateMutation.isPending}
              data-testid="button-save-settings"
            >
              <Save className="w-4 h-4 mr-2" />
              Spara inställningar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {showPreview && editingLesson && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Förhandsgranska: {editingLesson.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Pre-reading questions */}
              {editingLesson.preReadingQuestions.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium mb-3">Innan du läser - fundera på detta:</h3>
                  <ul className="space-y-2">
                    {editingLesson.preReadingQuestions.map((q, index) => (
                      <li key={q.id} className="text-sm">
                        {index + 1}. {q.question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Content with word definitions */}
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: editingLesson.content || '' 
                }}
              />
              
              {/* Questions */}
              {editingLesson.questions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Frågor:</h3>
                  {editingLesson.questions.map((q, index) => (
                    <div key={q.id} className="p-4 border rounded-lg">
                      <p className="font-medium mb-2">{index + 1}. {q.question}</p>
                      {q.alternatives && q.type === 'multiple-choice' && (
                        <div className="space-y-1">
                          {q.alternatives.map((alt, altIndex) => (
                            <div key={altIndex} className={`text-sm p-2 rounded ${altIndex === q.correctAnswer ? 'bg-green-100' : ''}`}>
                              {String.fromCharCode(65 + altIndex)}. {alt}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
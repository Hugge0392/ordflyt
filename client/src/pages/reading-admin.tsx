import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { Plus, BookOpen, Eye, Edit, Trash2, Save, X, Image as ImageIcon, FileText, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ObjectUploader } from "@/components/ObjectUploader";

import type { ReadingLesson, InsertReadingLesson, ReadingQuestion, WordDefinition, PreReadingQuestion } from "@shared/schema";
import type { UploadResult } from "@uppy/core";

// Function to parse content into pages based on page breaks
function parseContentIntoPages(content: string): string[] {
  if (!content) return [];
  
  // Split by page break marker
  const pages = content.split(/\[SIDBRYTNING\]/g).filter(page => page.trim().length > 0);
  
  // If no page breaks found, return entire content as one page
  if (pages.length <= 1) {
    return [content];
  }
  
  return pages;
}

export default function ReadingAdmin() {
  const [selectedLesson, setSelectedLesson] = useState<ReadingLesson | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Partial<InsertReadingLesson> | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);
  
  // Dirty state management för per-sida frågor
  const [dirtyPages, setDirtyPages] = useState<Record<number, boolean>>({});
  const [localPages, setLocalPages] = useState<any[]>([]);
  const [currentEditorContent, setCurrentEditorContent] = useState<string>("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lessons, isLoading } = useQuery<ReadingLesson[]>({
    queryKey: ["/api/reading-lessons"],
  });

  const createMutation = useMutation({
    mutationFn: async (lesson: InsertReadingLesson) => {
      const response = await fetch("/api/reading-lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lesson),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      setIsCreating(false);
      setEditingLesson(null);
      toast({ title: "Lektion skapad!", description: "Den nya läsförståelselektionen har sparats." });
    },
    onError: (error) => {
      toast({ 
        title: "Fel", 
        description: "Kunde inte skapa lektionen. Försök igen.",
        variant: "destructive"
      });
      console.error("Error creating lesson:", error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, lesson }: { id: string, lesson: Partial<InsertReadingLesson> }) => {
      const response = await fetch(`/api/reading-lessons/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lesson),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      setSelectedLesson(null);
      setEditingLesson(null);
      toast({ title: "Lektion uppdaterad!", description: "Ändringarna har sparats." });
    },
    onError: (error) => {
      toast({ 
        title: "Fel", 
        description: "Kunde inte uppdatera lektionen. Försök igen.",
        variant: "destructive"
      });
      console.error("Error updating lesson:", error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/reading-lessons/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      setSelectedLesson(null);
      toast({ title: "Lektion borttagen!", description: "Lektionen har raderats permanent." });
    },
    onError: (error) => {
      toast({ 
        title: "Fel", 
        description: "Kunde inte radera lektionen. Försök igen.",
        variant: "destructive"
      });
      console.error("Error deleting lesson:", error);
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/reading-lessons/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublished: 0 }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      toast({ title: "Lektion avpublicerad!", description: "Lektionen är nu ett utkast igen." });
    },
    onError: () => {
      toast({ 
        title: "Fel", 
        description: "Kunde inte avpublicera lektionen. Försök igen.",
        variant: "destructive"
      });
    },
  });

  const handleCreateLesson = () => {
    setIsCreating(true);
    setActiveFormTab('basic');
    
    // Clear local pages and dirty state for new lesson
    setLocalPages([]);
    setDirtyPages({});
    
    setEditingLesson({
      title: "",
      description: "",
      content: "",
      gradeLevel: "4-6",
      subject: "Svenska",
      readingTime: 5,
      featuredImage: null,
      preReadingQuestions: [],
      questions: [],
      wordDefinitions: []
    });
  };

  const handleSaveLesson = () => {
    if (!editingLesson) return;
    
    if (!editingLesson.title || !editingLesson.content || !editingLesson.gradeLevel) {
      toast({
        title: "Fyll i alla obligatoriska fält",
        description: "Titel, innehåll och årskurs måste fyllas i.",
        variant: "destructive"
      });
      return;
    }

    // Use lesson data as-is since images are now part of pages

    if (isCreating) {
      createMutation.mutate(editingLesson as InsertReadingLesson);
    } else if (selectedLesson) {
      updateMutation.mutate({ id: selectedLesson.id, lesson: editingLesson });
    }
  };

  const handleEditLesson = (lesson: ReadingLesson) => {
    setSelectedLesson(lesson);
    setActiveFormTab('basic');
    
    // Initialize local pages from lesson data
    setLocalPages(lesson.pages || []);
    setDirtyPages({}); // Clear dirty state
    
    setEditingLesson({
      title: lesson.title || "",
      description: lesson.description || "",
      content: lesson.content || "",
      gradeLevel: lesson.gradeLevel,
      subject: lesson.subject || "",
      readingTime: lesson.readingTime,
      featuredImage: lesson.featuredImage || "",
      preReadingQuestions: lesson.preReadingQuestions || [],
      questions: lesson.questions || [],
      wordDefinitions: lesson.wordDefinitions || [],
      isPublished: lesson.isPublished || 0,
      pages: lesson.pages || []
    });
    
    console.log('[EDIT LESSON] Content loaded:', lesson.content?.length || 0, 'characters');

    setIsCreating(false);
  };

  const addQuestion = (type: ReadingQuestion["type"]) => {
    if (!editingLesson) return;
    
    const newQuestion: ReadingQuestion = {
      id: `q_${Date.now()}`,
      type,
      question: "",
      ...(type === "multiple_choice" && { options: ["", "", "", ""], correctAnswer: 0 }),
      ...(type === "true_false" && { correctAnswer: true }),
      explanation: ""
    };

    setEditingLesson({
      ...editingLesson,
      questions: [...(editingLesson.questions || []), newQuestion]
    });
  };

  const updateQuestion = (index: number, updates: Partial<ReadingQuestion>) => {
    if (!editingLesson) return;
    
    const questions = [...(editingLesson.questions || [])];
    questions[index] = { ...questions[index], ...updates };
    
    setEditingLesson({
      ...editingLesson,
      questions
    });
  };

  const removeQuestion = (index: number) => {
    if (!editingLesson) return;
    
    const questions = [...(editingLesson.questions || [])];
    questions.splice(index, 1);
    
    setEditingLesson({
      ...editingLesson,
      questions
    });
  };

  const addWordDefinition = () => {
    if (!editingLesson) return;
    
    const newDefinition: WordDefinition = {
      word: "",
      definition: "",
      context: ""
    };

    setEditingLesson({
      ...editingLesson,
      wordDefinitions: [...(editingLesson.wordDefinitions || []), newDefinition]
    });
  };

  const updateWordDefinition = (index: number, updates: Partial<WordDefinition>) => {
    if (!editingLesson) return;
    
    const definitions = [...(editingLesson.wordDefinitions || [])];
    definitions[index] = { ...definitions[index], ...updates };
    
    setEditingLesson({
      ...editingLesson,
      wordDefinitions: definitions
    });
  };

  const removeWordDefinition = (index: number) => {
    if (!editingLesson) return;
    
    const definitions = [...(editingLesson.wordDefinitions || [])];
    definitions.splice(index, 1);
    
    setEditingLesson({
      ...editingLesson,
      wordDefinitions: definitions
    });
  };

  const addPreReadingQuestion = () => {
    if (!editingLesson) return;
    
    const newQuestion: PreReadingQuestion = {
      id: `pre_${Date.now()}`,
      question: "",
      purpose: ""
    };

    setEditingLesson({
      ...editingLesson,
      preReadingQuestions: [...(editingLesson.preReadingQuestions || []), newQuestion]
    });
  };

  const updatePreReadingQuestion = (index: number, updates: Partial<PreReadingQuestion>) => {
    if (!editingLesson) return;
    
    const questions = [...(editingLesson.preReadingQuestions || [])];
    questions[index] = { ...questions[index], ...updates };
    
    setEditingLesson({
      ...editingLesson,
      preReadingQuestions: questions
    });
  };

  const removePreReadingQuestion = (index: number) => {
    if (!editingLesson) return;
    
    const questions = [...(editingLesson.preReadingQuestions || [])];
    questions.splice(index, 1);
    
    setEditingLesson({
      ...editingLesson,
      preReadingQuestions: questions
    });
  };

  // Mark a page as dirty (has local changes)
  const markPageDirty = useCallback((pageIndex: number) => {
    setDirtyPages(prev => ({ ...prev, [pageIndex]: true }));
  }, []);

  // Mark a page as clean (saved to server)
  const markPageClean = useCallback((pageIndex: number) => {
    setDirtyPages(prev => {
      const { [pageIndex]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Apply incoming pages data (from server/storage) - merge if dirty, replace if clean
  const applyIncomingPages = useCallback((incomingPages: any[]) => {
    setLocalPages(currentLocal => {
      console.log('[INCOMING PAGES]', 'incoming length:', incomingPages.length, 'dirty pages:', Object.keys(dirtyPages));
      
      // If no dirty pages, use incoming data as-is
      if (Object.keys(dirtyPages).length === 0) {
        console.log('[CLEAN STATE] Using incoming pages as-is');
        return incomingPages;
      }
      
      // If we have dirty pages, merge by ID to preserve local changes
      const result = [...currentLocal];
      incomingPages.forEach((incomingPage, pageIndex) => {
        if (!dirtyPages[pageIndex]) {
          // Page is not dirty, use incoming data
          result[pageIndex] = incomingPage;
        } else {
          // Page is dirty, merge questions by ID
          const currentPage = result[pageIndex] || { ...incomingPage, questions: [] };
          const questionsByID = new Map();
          
          // Add existing local questions
          (currentPage.questions || []).forEach((q: any) => questionsByID.set(q.id, q));
          
          // Add incoming questions that don't exist locally
          (incomingPage.questions || []).forEach((q: any) => {
            if (!questionsByID.has(q.id)) {
              questionsByID.set(q.id, q);
            }
          });
          
          result[pageIndex] = {
            ...incomingPage,
            questions: Array.from(questionsByID.values())
          };
          
          console.log('[MERGED PAGE]', pageIndex, 'questions:', result[pageIndex].questions.length);
        }
      });
      
      return result;
    });
  }, [dirtyPages]);

  // Per-page question functions with dirty state management
  const addPageQuestion = useCallback((pageIndex: number, type: ReadingQuestion["type"]) => {
    console.log('[ADD QUESTION]', { pageIndex, type });
    
    if (!editingLesson) {
      console.log('No editingLesson, returning early');
      return;
    }
    
    // Create unique question
    const newQuestion: ReadingQuestion = {
      id: crypto.randomUUID(),
      type,
      question: "",
      ...(type === "multiple_choice" && { 
        options: ["Alternativ 1", "Alternativ 2"], 
        correctAnswer: 0 
      }),
      ...(type === "true_false" && { correctAnswer: true })
    };

    // Update local pages
    setLocalPages(currentPages => {
      const pages = parseContentIntoPages(editingLesson.content || "");
      
      // Ensure we have pages to work with
      let workingPages = [...currentPages];
      if (workingPages.length === 0) {
        workingPages = pages.map((page, index) => ({
          id: `page-${index}`,
          content: page,
          questions: []
        }));
        
        if (workingPages.length === 0) {
          workingPages = [{
            id: 'page-0',
            content: editingLesson.content || '',
            questions: []
          }];
        }
      }
      
      // Ensure the specific page exists
      if (!workingPages[pageIndex]) {
        workingPages[pageIndex] = {
          id: `page-${pageIndex}`,
          content: pages[pageIndex] || editingLesson.content || "",
          questions: []
        };
      }
      
      // Add question to page
      const updatedPages = [...workingPages];
      const currentPage = { ...updatedPages[pageIndex] };
      currentPage.questions = [...(currentPage.questions || []), newQuestion];
      updatedPages[pageIndex] = currentPage;
      
      console.log('[LOCAL PAGES UPDATED]', pageIndex, 'questions:', currentPage.questions.length);
      
      return updatedPages;
    });
    
    // Mark page as dirty
    markPageDirty(pageIndex);
    
    // Update editingLesson to include the new question
    setEditingLesson(prev => {
      if (!prev) return prev;
      
      const updatedPages = [...(prev.pages || localPages)];
      if (!updatedPages[pageIndex]) {
        updatedPages[pageIndex] = {
          id: `page-${pageIndex}`,
          content: parseContentIntoPages(prev.content || "")[pageIndex] || prev.content || "",
          questions: []
        };
      }
      
      const currentPage = { ...updatedPages[pageIndex] } as any;
      currentPage.questions = [...(currentPage.questions || []), newQuestion];
      updatedPages[pageIndex] = currentPage;
      
      return { ...prev, pages: updatedPages };
    });
    
    console.log('[QUESTION ADDED]', newQuestion.id, 'to page', pageIndex);
  }, [editingLesson, localPages, markPageDirty]);

  const updatePageQuestion = useCallback((pageIndex: number, questionIndex: number, updates: Partial<ReadingQuestion>) => {
    console.log('[UPDATE QUESTION]', { pageIndex, questionIndex, updates });
    
    // Update local pages
    setLocalPages(currentPages => {
      if (!currentPages[pageIndex]?.questions?.[questionIndex]) return currentPages;
      
      const updatedPages = [...currentPages];
      const currentPage = { ...updatedPages[pageIndex] };
      const questions = [...(currentPage.questions || [])];
      questions[questionIndex] = { ...questions[questionIndex], ...updates };
      currentPage.questions = questions;
      updatedPages[pageIndex] = currentPage;
      
      return updatedPages;
    });
    
    // Mark page as dirty
    markPageDirty(pageIndex);
    
    // Update editingLesson
    setEditingLesson(prev => {
      if (!prev?.pages?.[pageIndex]?.questions) return prev;
      
      const newPages = [...prev.pages];
      const currentPage = { ...newPages[pageIndex] } as any;
      const questions = [...currentPage.questions];
      questions[questionIndex] = { ...questions[questionIndex], ...updates };
      currentPage.questions = questions;
      newPages[pageIndex] = currentPage;
      
      return { ...prev, pages: newPages };
    });
  }, [markPageDirty]);

  const removePageQuestion = useCallback((pageIndex: number, questionIndex: number) => {
    console.log('[REMOVE QUESTION]', { pageIndex, questionIndex });
    
    // Update local pages
    setLocalPages(currentPages => {
      if (!currentPages[pageIndex]?.questions?.[questionIndex]) return currentPages;
      
      const updatedPages = [...currentPages];
      const currentPage = { ...updatedPages[pageIndex] };
      const questions = (currentPage.questions || []).filter((_: any, i: number) => i !== questionIndex);
      currentPage.questions = questions;
      updatedPages[pageIndex] = currentPage;
      
      console.log('[LOCAL PAGES] Question removed, remaining:', questions.length);
      
      return updatedPages;
    });
    
    // Mark page as dirty
    markPageDirty(pageIndex);
    
    // Update editingLesson
    setEditingLesson(prev => {
      if (!prev?.pages?.[pageIndex]?.questions) return prev;
      
      const newPages = [...prev.pages];
      const currentPage = { ...newPages[pageIndex] } as any;
      const questions = currentPage.questions.filter((_: any, i: number) => i !== questionIndex);
      currentPage.questions = questions;
      newPages[pageIndex] = currentPage;
      
      return { ...prev, pages: newPages };
    });
  }, [markPageDirty]);

  // Manual save function for pages and complete lesson
  const saveCompleteLesson = useCallback(async () => {
    if (!editingLesson) return;
    
    setIsSaving(true);
    try {
      // Ensure all current form data is included, especially content
      const lessonToSave = {
        ...editingLesson,
        pages: localPages.length > 0 ? localPages : editingLesson.pages
      };
      
      console.log('[SAVE] Lesson data before save:', {
        title: lessonToSave.title,
        contentLength: lessonToSave.content?.length || 0,
        pagesCount: lessonToSave.pages?.length || 0,
        hasContent: !!lessonToSave.content
      });
      
      if (isCreating) {
        const result = await createMutation.mutateAsync(lessonToSave as InsertReadingLesson);
        setIsCreating(false);
        setSelectedLesson(result);
        console.log('Complete lesson saved with pages');
      } else if (selectedLesson) {
        console.log('[SAVE] Sending update with content length:', lessonToSave.content?.length || 0);
        const updatedLesson = await updateMutation.mutateAsync({ id: selectedLesson.id, lesson: lessonToSave });
        console.log('[SAVE] Update response content length:', updatedLesson.content?.length || 0);
        
        // Update local state with server response to ensure consistency
        setEditingLesson(updatedLesson);
        console.log('Complete lesson updated with pages');
      }
      
      // Clear all dirty flags after successful save
      setDirtyPages({});
      console.log('[PAGES SAVED] All dirty flags cleared');
      
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editingLesson, localPages, isCreating, selectedLesson, createMutation, updateMutation]);

  // Auto-save när editingLesson ändras (men inte pages för att undvika race condition)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (editingLesson && (editingLesson.title || editingLesson.content)) {
      // Avbryt tidigare auto-save
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Sätt ny timeout, men exkludera pages från auto-save för att undvika race
      autoSaveTimeoutRef.current = setTimeout(async () => {
        if (editingLesson && (editingLesson.title || editingLesson.content)) {
          setIsSaving(true);
          try {
            // Auto-save med allt innehåll men bevara befintliga pages
            const lessonToSave = { ...editingLesson };
            
            // Säkerställ att content inte försvinner
            if (!lessonToSave.content || lessonToSave.content.trim() === '') {
              console.log('[AUTO-SAVE] Content is empty, skipping auto-save to preserve existing content');
              return;
            }
            
            // Ta bort pages från auto-save för att undvika överskrivning av per-sida frågor
            if (localPages.length > 0) {
              delete lessonToSave.pages;
            }
            
            if (isCreating) {
              // Först auto-save skickar bara grunddata, pages sparas manuellt
              console.log('Auto-saving new lesson without pages');
            } else if (selectedLesson) {
              console.log('Auto-saving existing lesson without pages');
              await updateMutation.mutateAsync({ id: selectedLesson.id, lesson: lessonToSave });
            }
          } catch (error) {
            console.error('Auto-save failed:', error);
          } finally {
            setIsSaving(false);
          }
        }
      }, 3000);
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [editingLesson?.title, editingLesson?.content, editingLesson?.description]); // Exkludera pages från dependencies

  // Manuell funktion för att lägga till ny sida för per-sida frågor
  const addNewPageForQuestions = useCallback(() => {
    const newPageIndex = localPages.length;
    const newPage = {
      id: `page-${newPageIndex}`,
      content: `Sida ${newPageIndex + 1} innehåll`,
      questions: []
    };
    
    setLocalPages(prev => [...prev, newPage]);
    markPageDirty(newPageIndex);
    
    console.log('[MANUAL PAGE ADD] Added page:', newPageIndex + 1);
    
    toast({
      title: "Ny sida tillagd",
      description: `Sida ${newPageIndex + 1} har lagts till för per-sida frågor`,
    });
  }, [localPages.length, markPageDirty, toast]);

  // Inte behövd längre - ObjectUploader hanterar direkt upload
  const handleFeaturedImageUpload = () => ({});

  const handleFeaturedImageComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    console.log("Featured image upload completed:", result);
    
    if (result.failed && result.failed.length > 0) {
      console.error("Featured image upload failed:", result.failed);
      result.failed.forEach(file => {
        console.error("Failed featured image file:", file.name, file.error);
      });
      toast({
        title: "Uppladdning misslyckades",
        description: `Kunde inte ladda upp huvudbild: ${result.failed[0]?.error || 'Okänt fel'}`,
        variant: "destructive",
      });
      return;
    }
    
    if (result.successful && result.successful.length > 0) {
      const first = result.successful[0] as any;
      // Hämta objectPath från direktuppladdning
      const objectPath = first?.response?.objectPath || first?.response?.body?.objectPath;

      if (!objectPath) {
        console.warn("Featured image upload ok, men saknar objectPath i resultatet:", first);
        toast({
          title: "Uppladdning klar",
          description: "Kunde inte läsa in sökvägen till objektet automatiskt.",
          variant: "destructive",
        });
        return;
      }

      setEditingLesson(prev => prev ? {
        ...prev,
        featuredImage: objectPath
      } : prev);
      toast({
        title: "Bild uppladdad!",
        description: "Huvudbilden har lagts till.",
      });
    }
  };

  if (editingLesson || isCreating) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-background">
          <div className="max-w-6xl mx-auto p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6" />
                <div>
                  <h1 className="text-2xl font-bold">
                    {isCreating ? "Skapa ny lektion" : "Redigera lektion"}
                  </h1>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Läsförståelse Admin</p>
                    {isSaving && (
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        Sparar...
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingLesson(null);
                    setSelectedLesson(null);
                    setActiveFormTab('basic');
                  }}
                  data-testid="button-cancel"
                >
                  <X className="w-4 h-4 mr-2" />
                  Avbryt
                </Button>
                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!editingLesson?.content}
                      data-testid="button-preview-lesson"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Förhandsgranska
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingLesson?.title || "Förhandsgranskning"}</DialogTitle>
                      <DialogDescription>
                        Så här kommer lektionen att se ut för eleverna
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {editingLesson?.featuredImage && (
                        <div className="w-full h-48 bg-muted rounded-lg overflow-hidden">
                          <img 
                            src={editingLesson.featuredImage} 
                            alt={editingLesson.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-4">
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          {editingLesson?.gradeLevel && `Årskurs ${editingLesson.gradeLevel}`}
                        </Badge>
                        {editingLesson?.readingTime && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {editingLesson.readingTime} min läsning
                          </div>
                        )}
                      </div>
                      {editingLesson?.description && (
                        <p className="text-muted-foreground mb-4">{editingLesson.description}</p>
                      )}
                      {editingLesson?.content && (
                        <div 
                          className="prose dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: editingLesson.content }}
                        />
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  onClick={() => {
                    // Spara komplett lektion inklusive pages
                    saveCompleteLesson();
                  }}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-lesson"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createMutation.isPending || updateMutation.isPending ? "Sparar..." : "Spara lektion"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-6">
          <div className="w-full">
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
              {[
                { id: 'basic', label: 'Grundinfo' },
                { id: 'content', label: 'Innehåll' },
                { id: 'prereading', label: 'Innan du läser' },
                { id: 'questions', label: 'Frågor' },
                { id: 'page-questions', label: 'Per-sida frågor' },
                { id: 'definitions', label: 'Ordförklaringar' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFormTab(tab.id)}
                  className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                    activeFormTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className={`space-y-4 ${activeFormTab !== 'basic' ? 'hidden' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titel *</Label>
                  <Input
                    id="title"
                    value={editingLesson?.title || ""}
                    onChange={(e) => editingLesson && setEditingLesson({ ...editingLesson, title: e.target.value })}
                    placeholder="T.ex. Sommaräventyret"
                    data-testid="input-title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gradeLevel">Årskurs *</Label>
                  <Select
                    value={editingLesson?.gradeLevel || ""}
                    onValueChange={(value) => editingLesson && setEditingLesson({ ...editingLesson, gradeLevel: value })}
                  >
                    <SelectTrigger data-testid="select-grade-level">
                      <SelectValue placeholder="Välj årskurs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-3">Årskurs 1-3</SelectItem>
                      <SelectItem value="4-6">Årskurs 4-6</SelectItem>
                      <SelectItem value="7-9">Årskurs 7-9</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Ämne</Label>
                  <Input
                    id="subject"
                    value={editingLesson?.subject || ""}
                    onChange={(e) => editingLesson && setEditingLesson({ ...editingLesson, subject: e.target.value })}
                    placeholder="T.ex. Svenska, Naturkunskap"
                    data-testid="input-subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="readingTime">Läsningstid (minuter)</Label>
                  <Input
                    id="readingTime"
                    type="number"
                    value={editingLesson?.readingTime || ""}
                    onChange={(e) => editingLesson && setEditingLesson({ ...editingLesson, readingTime: parseInt(e.target.value) || null })}
                    placeholder="5"
                    data-testid="input-reading-time"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beskrivning</Label>
                <Textarea
                  id="description"
                  value={editingLesson?.description || ""}
                  onChange={(e) => editingLesson && setEditingLesson({ ...editingLesson, description: e.target.value })}
                  placeholder="En kort beskrivning av lektionen..."
                  rows={3}
                  data-testid="textarea-description"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="font-medium">Lektion</p>
                    <p className="text-sm text-muted-foreground">
                      Lektionen sparas i systemet och är tillgänglig för användning
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`space-y-4 ${activeFormTab !== 'content' ? 'hidden' : ''}`}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Huvudbild (valfri)</Label>
                  {editingLesson?.featuredImage ? (
                    <div className="space-y-3">
                      <img
                        src={editingLesson.featuredImage}
                        alt="Huvudbild"
                        className="w-full max-w-md h-48 object-cover rounded-lg border"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editingLesson && setEditingLesson({...editingLesson, featuredImage: null})}
                        >
                          Ta bort bild
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={5 * 1024 * 1024} // 5MB
                      onComplete={handleFeaturedImageComplete}
                      buttonClassName="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    >
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <ImageIcon className="h-8 w-8" />
                        <span>Ladda upp huvudbild</span>
                        <span className="text-xs">JPG, PNG eller GIF (max 5MB)</span>
                      </div>
                    </ObjectUploader>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Huvudbilden visas överst i lektionen för att fånga elevernas uppmärksamhet.
                  </p>
                </div>

                <div className="space-y-4">
                  <RichTextEditor
                    key={`content-editor-${selectedLesson?.id || 'new'}`}
                    value={editingLesson?.content || ""}
                    onChange={(content) => {
                      console.log('[CONTENT CHANGE] New content length:', content?.length || 0);
                      console.log('[CONTENT CHANGE] Content preview:', content?.substring(0, 100));
                      
                      // Update both the lesson state and our current content tracker
                      setCurrentEditorContent(content || "");
                      
                      if (editingLesson) {
                        const updatedLesson = {...editingLesson, content};
                        console.log('[CONTENT CHANGE] Updated lesson content length:', updatedLesson.content?.length || 0);
                        setEditingLesson(updatedLesson);
                      }
                    }}
                    onPagesChange={(pages) => editingLesson && setEditingLesson({...editingLesson, pages})}
                    placeholder="Skriv ditt textinnehåll här..."
                    className="min-h-[400px]"
                    ref={(editor) => {
                      // Store reference to editor for manual content extraction
                      if (editor) {
                        (window as any).richTextEditor = editor;
                      }
                    }}
                  />
                  
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        console.log('[MANUAL SAVE DEBUG] editingLesson:', editingLesson);
                        console.log('[MANUAL SAVE DEBUG] content:', editingLesson?.content);
                        console.log('[MANUAL SAVE DEBUG] content length:', editingLesson?.content?.length);
                        
                        // Get current content - prioritize our tracked content over editingLesson state
                        let currentContent = currentEditorContent || editingLesson?.content;
                        console.log('[MANUAL SAVE DEBUG] currentEditorContent:', currentEditorContent?.length || 0);
                        console.log('[MANUAL SAVE DEBUG] editingLesson.content:', editingLesson?.content?.length || 0);
                        
                        // If still no content, try to extract from DOM as fallback
                        if (!currentContent || currentContent.trim() === '') {
                          const editorElement = document.querySelector('[data-testid="rich-text-editor"]');
                          if (editorElement) {
                            const textAreas = editorElement.querySelectorAll('textarea');
                            const inputs = editorElement.querySelectorAll('input[type="text"]');
                            let extractedContent = '';
                            
                            textAreas.forEach(textarea => {
                              if (textarea.value.trim()) {
                                extractedContent += textarea.value + '\n';
                              }
                            });
                            
                            inputs.forEach(input => {
                              if (input.value.trim()) {
                                extractedContent += input.value + '\n';
                              }
                            });
                            
                            if (extractedContent.trim()) {
                              currentContent = extractedContent.trim();
                              console.log('[MANUAL SAVE] Extracted content from DOM:', currentContent.length, 'characters');
                            }
                          }
                        }
                        
                        if (!currentContent || currentContent.trim() === '') {
                          toast({
                            title: "Inget innehåll att spara",
                            description: "Skriv lite text innan du sparar innehållet.",
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        setIsSaving(true);
                        try {
                          const contentOnlyUpdate = {
                            content: currentContent
                          };
                          
                          console.log('[MANUAL CONTENT SAVE] Saving content manually:', contentOnlyUpdate.content?.length, 'characters');
                          
                          if (isCreating) {
                            toast({
                              title: "Spara lektionen först",
                              description: "Du måste spara hela lektionen innan du kan spara bara innehållet.",
                              variant: "destructive"
                            });
                          } else if (selectedLesson) {
                            await updateMutation.mutateAsync({ 
                              id: selectedLesson.id, 
                              lesson: contentOnlyUpdate 
                            });
                            
                            toast({
                              title: "Innehåll sparat!",
                              description: `${contentOnlyUpdate.content.length} tecken sparade.`,
                            });
                          }
                        } catch (error) {
                          console.error('Manual content save failed:', error);
                          toast({
                            title: "Fel vid sparning",
                            description: "Kunde inte spara innehållet. Försök igen.",
                            variant: "destructive"
                          });
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      disabled={isSaving || isCreating}
                      data-testid="button-save-content"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Sparar innehåll..." : "Spara innehåll"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className={`space-y-4 ${activeFormTab !== 'prereading' ? 'hidden' : ''}`}>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Innan du läser ({editingLesson?.preReadingQuestions?.length || 0})</h3>
                <Button variant="outline" onClick={addPreReadingQuestion} data-testid="button-add-prereading-question">
                  <Plus className="w-4 h-4 mr-2" />
                  Lägg till fråga
                </Button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Om "Innan du läser"-frågor</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Dessa frågor ställs innan eleven läser texten för att aktivera förkunskaper, väcka nyfikenhet och ge en riktning för läsningen. 
                  De hjälper eleven att fokusera på viktiga teman och förbereder för bättre textförståelse.
                </p>
              </div>

              <div className="space-y-4">
                {editingLesson?.preReadingQuestions?.map((question, index) => (
                  <Card key={(question as PreReadingQuestion).id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Fråga {index + 1}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePreReadingQuestion(index)}
                          data-testid={`button-remove-prereading-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>Fråga</Label>
                        <Textarea
                          value={(question as PreReadingQuestion).question}
                          onChange={(e) => updatePreReadingQuestion(index, { question: e.target.value })}
                          placeholder="T.ex. Vad tror du att texten handlar om baserat på rubriken?"
                          rows={2}
                          data-testid={`textarea-prereading-question-${index}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Syfte</Label>
                        <Input
                          value={(question as PreReadingQuestion).purpose}
                          onChange={(e) => updatePreReadingQuestion(index, { purpose: e.target.value })}
                          placeholder="T.ex. Aktivera förkunskaper om ämnet"
                          data-testid={`input-prereading-purpose-${index}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {(!editingLesson?.preReadingQuestions || editingLesson.preReadingQuestions.length === 0) && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500 mb-3">Inga "Innan du läser"-frågor ännu</p>
                    <Button variant="outline" onClick={addPreReadingQuestion} data-testid="button-add-first-prereading">
                      <Plus className="w-4 h-4 mr-2" />
                      Lägg till första frågan
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className={`space-y-4 ${activeFormTab !== 'questions' ? 'hidden' : ''}`}>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Frågor ({editingLesson?.questions?.length || 0})</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addQuestion("multiple_choice")} data-testid="button-add-multiple-choice">
                    + Flervalsfrågna
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addQuestion("true_false")} data-testid="button-add-true-false">
                    + Sant/Falskt
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addQuestion("open_ended")} data-testid="button-add-open-ended">
                    + Öppen fråga
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {editingLesson?.questions?.map((question, index) => (
                  <Card key={(question as ReadingQuestion).id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline">
                          {(question as ReadingQuestion).type === "multiple_choice" && "Flervalsfrågna"}
                          {(question as ReadingQuestion).type === "true_false" && "Sant/Falskt"}
                          {(question as ReadingQuestion).type === "open_ended" && "Öppen fråga"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(index)}
                          data-testid={`button-remove-question-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label>Fråga</Label>
                        <Input
                          value={(question as ReadingQuestion).question}
                          onChange={(e) => updateQuestion(index, { question: e.target.value })}
                          placeholder="Skriv din fråga här..."
                          data-testid={`input-question-${index}`}
                        />
                      </div>

                      {(question as ReadingQuestion).type === "multiple_choice" && (
                        <div className="space-y-2">
                          <Label>Svarsalternativ</Label>
                          {(question as ReadingQuestion).options?.map((option: string, optionIndex: number) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${(question as ReadingQuestion).id}`}
                                checked={(question as ReadingQuestion).correctAnswer === optionIndex}
                                onChange={() => updateQuestion(index, { correctAnswer: optionIndex })}
                                data-testid={`radio-correct-${index}-${optionIndex}`}
                              />
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...((question as ReadingQuestion).options || [])];
                                  newOptions[optionIndex] = e.target.value;
                                  updateQuestion(index, { options: newOptions });
                                }}
                                placeholder={`Alternativ ${optionIndex + 1}`}
                                data-testid={`input-option-${index}-${optionIndex}`}
                              />
                              <span className="text-xs text-muted-foreground">
                                {(question as ReadingQuestion).correctAnswer === optionIndex ? "(Rätt)" : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(question as ReadingQuestion).type === "true_false" && (
                        <div className="space-y-2">
                          <Label>Korrekt svar</Label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`tf-${(question as ReadingQuestion).id}`}
                                checked={(question as ReadingQuestion).correctAnswer === true}
                                onChange={() => updateQuestion(index, { correctAnswer: true })}
                                data-testid={`radio-true-${index}`}
                              />
                              Sant
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`tf-${(question as ReadingQuestion).id}`}
                                checked={(question as ReadingQuestion).correctAnswer === false}
                                onChange={() => updateQuestion(index, { correctAnswer: false })}
                                data-testid={`radio-false-${index}`}
                              />
                              Falskt
                            </label>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Förklaring (valfri)</Label>
                        <Textarea
                          value={(question as ReadingQuestion).explanation || ""}
                          onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
                          placeholder="Förklara varför svaret är korrekt..."
                          rows={2}
                          data-testid={`textarea-explanation-${index}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className={`space-y-4 ${activeFormTab !== 'page-questions' ? 'hidden' : ''}`}>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Frågor per sida</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addNewPageForQuestions}
                    data-testid="button-add-new-page"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Lägg till ny sida
                  </Button>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Om per-sida frågor</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Lägg till frågor som eleven måste besvara för att kunna gå vidare till nästa sida. Klicka på "Lägg till ny sida" för att skapa en ny sida för frågor.
                  </p>
                </div>

                {(() => {
                  // Use localPages as the source of truth for per-page questions
                  let pages = localPages;
                  
                  // If no pages exist, show empty state
                  if (pages.length === 0) {
                    return (
                      <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                          Inga sidor för frågor ännu
                        </h4>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          Klicka på "Lägg till ny sida" för att skapa din första sida med frågor
                        </p>
                        <Button
                          type="button"
                          onClick={addNewPageForQuestions}
                          data-testid="button-add-first-page"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Lägg till första sidan
                        </Button>
                      </div>
                    );
                  }
                  
                  console.log('[RENDER PAGES]', 'manual pages:', pages.length, 'total questions:', pages.reduce((sum, p) => sum + (p.questions?.length || 0), 0));
                  
                  return pages.length > 0 ? (
                  <div className="space-y-6">
                    {pages.map((page: any, pageIndex: number) => (
                      <Card key={page.id} className="border-l-4 border-l-blue-500">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-lg">
                                Sida {pageIndex + 1}
                                {dirtyPages[pageIndex] && <span className="text-xs text-blue-600 ml-2">●</span>}
                              </CardTitle>
                              <CardDescription>
                                {page.questions?.length || 0} frågor
                              </CardDescription>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // Ta bort sida
                                  setLocalPages(prev => prev.filter((_, i) => i !== pageIndex));
                                  // Ta bort dirty flag
                                  setDirtyPages(prev => {
                                    const { [pageIndex]: _, ...rest } = prev;
                                    return rest;
                                  });
                                  console.log('Removed page:', pageIndex + 1);
                                  toast({
                                    title: "Sida borttagen",
                                    description: `Sida ${pageIndex + 1} har tagits bort`,
                                  });
                                }}
                                data-testid={`button-remove-page-${pageIndex}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Adding multiple choice question to page', pageIndex);
                                  addPageQuestion(pageIndex, "multiple_choice");
                                }}
                                data-testid={`button-add-page-multiple-choice-${pageIndex}`}
                              >
                                + Flervalsfrågna
                              </Button>
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Adding true/false question to page', pageIndex);
                                  addPageQuestion(pageIndex, "true_false");
                                }}
                                data-testid={`button-add-page-true-false-${pageIndex}`}
                              >
                                + Sant/Falskt
                              </Button>
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Adding open ended question to page', pageIndex);
                                  addPageQuestion(pageIndex, "open_ended");
                                }}
                                data-testid={`button-add-page-open-ended-${pageIndex}`}
                              >
                                + Öppen fråga
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {/* Preview of page content */}
                          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md max-h-32 overflow-hidden">
                            <div 
                              className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3"
                              dangerouslySetInnerHTML={{ __html: page.content.substring(0, 200) + (page.content.length > 200 ? '...' : '') }}
                            />
                          </div>

                          {/* Page questions */}
                          {page.questions && page.questions.length > 0 ? (
                            <div className="space-y-3">
                              {page.questions.map((question: ReadingQuestion, questionIndex: number) => (
                                <Card key={question.id} className="border border-gray-200">
                                  <CardContent className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                      <Badge variant="outline">
                                        {question.type === "multiple_choice" && "Flervalsfrågna"}
                                        {question.type === "true_false" && "Sant/Falskt"}
                                        {question.type === "open_ended" && "Öppen fråga"}
                                      </Badge>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          console.log('Removing question', questionIndex, 'from page', pageIndex);
                                          removePageQuestion(pageIndex, questionIndex);
                                        }}
                                        data-testid={`button-remove-page-question-${pageIndex}-${questionIndex}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>

                                    <div className="space-y-2">
                                      <Label>Fråga</Label>
                                      <Input
                                        value={question.question}
                                        onChange={(e) => updatePageQuestion(pageIndex, questionIndex, { question: e.target.value })}
                                        placeholder="Skriv din fråga här..."
                                        data-testid={`input-page-question-${pageIndex}-${questionIndex}`}
                                      />
                                    </div>

                                    {question.type === "multiple_choice" && (
                                      <div className="space-y-2">
                                        <Label>Svarsalternativ</Label>
                                        {question.options?.map((option: string, optionIndex: number) => (
                                          <div key={optionIndex} className="flex items-center gap-2">
                                            <input
                                              type="radio"
                                              name={`page-correct-${pageIndex}-${question.id}`}
                                              checked={question.correctAnswer === optionIndex}
                                              onChange={() => updatePageQuestion(pageIndex, questionIndex, { correctAnswer: optionIndex })}
                                              data-testid={`radio-page-correct-${pageIndex}-${questionIndex}-${optionIndex}`}
                                            />
                                            <Input
                                              value={option}
                                              onChange={(e) => {
                                                const newOptions = [...(question.options || [])];
                                                newOptions[optionIndex] = e.target.value;
                                                updatePageQuestion(pageIndex, questionIndex, { options: newOptions });
                                              }}
                                              placeholder={`Alternativ ${optionIndex + 1}`}
                                              data-testid={`input-page-option-${pageIndex}-${questionIndex}-${optionIndex}`}
                                            />
                                            {question.options && question.options.length > 2 && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  const newOptions = question.options?.filter((_: string, i: number) => i !== optionIndex) || [];
                                                  updatePageQuestion(pageIndex, questionIndex, { options: newOptions });
                                                }}
                                                data-testid={`button-remove-page-option-${pageIndex}-${questionIndex}-${optionIndex}`}
                                              >
                                                <X className="w-4 h-4" />
                                              </Button>
                                            )}
                                          </div>
                                        ))}
                                        
                                        {(!question.options || question.options.length < 5) && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              const currentOptions = question.options || [];
                                              updatePageQuestion(pageIndex, questionIndex, { 
                                                options: [...currentOptions, `Alternativ ${currentOptions.length + 1}`] 
                                              });
                                            }}
                                            data-testid={`button-add-page-option-${pageIndex}-${questionIndex}`}
                                          >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Lägg till alternativ
                                          </Button>
                                        )}
                                      </div>
                                    )}

                                    {question.type === "true_false" && (
                                      <div className="space-y-2">
                                        <Label>Korrekt svar</Label>
                                        <div className="flex gap-4">
                                          <label className="flex items-center gap-2">
                                            <input
                                              type="radio"
                                              name={`page-tf-${pageIndex}-${question.id}`}
                                              checked={question.correctAnswer === true}
                                              onChange={() => updatePageQuestion(pageIndex, questionIndex, { correctAnswer: true })}
                                              data-testid={`radio-page-true-${pageIndex}-${questionIndex}`}
                                            />
                                            Sant
                                          </label>
                                          <label className="flex items-center gap-2">
                                            <input
                                              type="radio"
                                              name={`page-tf-${pageIndex}-${question.id}`}
                                              checked={question.correctAnswer === false}
                                              onChange={() => updatePageQuestion(pageIndex, questionIndex, { correctAnswer: false })}
                                              data-testid={`radio-page-false-${pageIndex}-${questionIndex}`}
                                            />
                                            Falskt
                                          </label>
                                        </div>
                                      </div>
                                    )}

                                    <div className="space-y-2">
                                      <Label>Förklaring (valfri)</Label>
                                      <Textarea
                                        value={question.explanation || ""}
                                        onChange={(e) => updatePageQuestion(pageIndex, questionIndex, { explanation: e.target.value })}
                                        placeholder="Förklara varför svaret är korrekt..."
                                        rows={2}
                                        data-testid={`textarea-page-explanation-${pageIndex}-${questionIndex}`}
                                      />
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                              <p className="text-gray-500 mb-3">Inga frågor för denna sida ännu</p>
                              <div className="flex justify-center gap-2">
                                <Button 
                                  type="button"
                                  variant="outline" 
                                  size="sm" 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Adding multiple choice question to page', pageIndex, 'from empty state');
                                    addPageQuestion(pageIndex, "multiple_choice");
                                  }}
                                >
                                  + Flervalsfrågna
                                </Button>
                                <Button 
                                  type="button"
                                  variant="outline" 
                                  size="sm" 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Adding true/false question to page', pageIndex, 'from empty state');
                                    addPageQuestion(pageIndex, "true_false");
                                  }}
                                >
                                  + Sant/Falskt
                                </Button>
                                <Button 
                                  type="button"
                                  variant="outline" 
                                  size="sm" 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Adding open ended question to page', pageIndex, 'from empty state');
                                    addPageQuestion(pageIndex, "open_ended");
                                  }}
                                >
                                  + Öppen fråga
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                      <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500 mb-3">Inga sidor skapade ännu</p>
                      <p className="text-sm text-gray-400">Använd sidbrytningar i innehållsredigeraren för att skapa sidor</p>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className={`space-y-4 ${activeFormTab !== 'definitions' ? 'hidden' : ''}`}>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Ordförklaringar ({editingLesson?.wordDefinitions?.length || 0})</h3>
                <Button variant="outline" onClick={addWordDefinition} data-testid="button-add-word-definition">
                  <Plus className="w-4 h-4 mr-2" />
                  Lägg till ordförklaring
                </Button>
              </div>

              <div className="space-y-4">
                {editingLesson?.wordDefinitions?.map((definition, index) => (
                  <Card key={index}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Ordförklaring {index + 1}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWordDefinition(index)}
                          data-testid={`button-remove-definition-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Ord</Label>
                          <Input
                            value={(definition as WordDefinition).word}
                            onChange={(e) => updateWordDefinition(index, { word: e.target.value })}
                            placeholder="t.ex. mystisk"
                            data-testid={`input-word-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Förklaring</Label>
                          <Input
                            value={(definition as WordDefinition).definition}
                            onChange={(e) => updateWordDefinition(index, { definition: e.target.value })}
                            placeholder="t.ex. hemlighetsfull, gåtfull"
                            data-testid={`input-definition-${index}`}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Kontext (valfri)</Label>
                        <Input
                          value={(definition as WordDefinition).context || ""}
                          onChange={(e) => updateWordDefinition(index, { context: e.target.value })}
                          placeholder="Meningen där ordet förekommer..."
                          data-testid={`input-context-${index}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/lasforstaelse" className="text-sm text-muted-foreground hover:text-foreground">
                ← Tillbaka till läsförståelse
              </Link>
              <div className="w-px h-6 bg-border"></div>
              <BookOpen className="w-6 h-6" />
              <div>
                <h1 className="text-2xl font-bold">Admin - Läsförståelse</h1>
                <p className="text-sm text-muted-foreground">Hantera läsförståelselektioner</p>
              </div>
            </div>
            <Button onClick={handleCreateLesson} data-testid="button-create-lesson">
              <Plus className="w-4 h-4 mr-2" />
              Skapa ny lektion
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-2 text-muted-foreground">Laddar lektioner...</p>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="all">Alla lektioner</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lessons?.map((lesson) => (
                  <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{lesson.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {lesson.description || "Ingen beskrivning"}
                          </CardDescription>
                        </div>
                        <Badge variant={lesson.isPublished ? "default" : "secondary"}>
                          {lesson.isPublished ? "Publicerad" : "Utkast"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div>Årskurs: {lesson.gradeLevel}</div>
                        {lesson.subject && <div>Ämne: {lesson.subject}</div>}
                        {lesson.readingTime && <div>Läsningstid: {lesson.readingTime} min</div>}
                        <div>Innan du läser: {lesson.preReadingQuestions.length}</div>
                        <div>Frågor: {lesson.questions.length}</div>
                        <div>Ordförklaringar: {lesson.wordDefinitions.length}</div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditLesson(lesson)}
                          data-testid={`button-edit-${lesson.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        {lesson.isPublished ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              updateMutation.mutate({ 
                                id: lesson.id, 
                                lesson: { ...lesson, isPublished: 0 } 
                              });
                            }}
                            disabled={updateMutation.isPending}
                            data-testid={`button-unpublish-${lesson.id}`}
                          >
                            Avpublicera
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              updateMutation.mutate({ 
                                id: lesson.id, 
                                lesson: { ...lesson, isPublished: 1 } 
                              });
                            }}
                            disabled={updateMutation.isPending}
                            data-testid={`button-publish-${lesson.id}`}
                          >
                            Publicera
                          </Button>
                        )}
                        
                        {lesson.isPublished && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            data-testid={`button-view-${lesson.id}`}
                          >
                            <Link href={`/lasforstaelse/${lesson.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(lesson.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${lesson.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {(!lessons || lessons.length === 0) && !isLoading && (
                  <div className="col-span-full text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Inga lektioner ännu</h3>
                    <p className="text-muted-foreground mb-4">
                      Skapa din första läsförståelselektion för att komma igång.
                    </p>
                    <Button onClick={handleCreateLesson} data-testid="button-create-first-lesson">
                      <Plus className="w-4 h-4 mr-2" />
                      Skapa första lektionen
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="published" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lessons?.filter(lesson => lesson.isPublished).map((lesson) => (
                  <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{lesson.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {lesson.description || "Ingen beskrivning"}
                          </CardDescription>
                        </div>
                        <Badge variant="default">Publicerad</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div>Årskurs: {lesson.gradeLevel}</div>
                        {lesson.subject && <div>Ämne: {lesson.subject}</div>}
                        {lesson.readingTime && <div>Läsningstid: {lesson.readingTime} min</div>}
                        <div>Innan du läser: {lesson.preReadingQuestions.length}</div>
                        <div>Frågor: {lesson.questions.length}</div>
                        <div>Ordförklaringar: {lesson.wordDefinitions.length}</div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/lasforstaelse/${lesson.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditLesson(lesson)}
                          data-testid={`button-edit-published-${lesson.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unpublishMutation.mutate(lesson.id)}
                          disabled={unpublishMutation.isPending}
                          data-testid={`button-unpublish-${lesson.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(lesson.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-published-${lesson.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {lessons?.filter(lesson => lesson.isPublished).length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Inga publicerade lektioner</h3>
                    <p className="text-muted-foreground">
                      Publicera en lektion för att se den här.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="drafts" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lessons?.filter(lesson => !lesson.isPublished).map((lesson) => (
                  <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{lesson.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {lesson.description || "Ingen beskrivning"}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">Utkast</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div>Årskurs: {lesson.gradeLevel}</div>
                        {lesson.subject && <div>Ämne: {lesson.subject}</div>}
                        {lesson.readingTime && <div>Läsningstid: {lesson.readingTime} min</div>}
                        <div>Innan du läser: {lesson.preReadingQuestions.length}</div>
                        <div>Frågor: {lesson.questions.length}</div>
                        <div>Ordförklaringar: {lesson.wordDefinitions.length}</div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditLesson(lesson)}
                          data-testid={`button-edit-draft-${lesson.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(lesson.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-draft-${lesson.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {lessons?.filter(lesson => !lesson.isPublished).length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Inga utkast</h3>
                    <p className="text-muted-foreground mb-4">
                      Skapa en ny lektion för att se den här.
                    </p>
                    <Button onClick={handleCreateLesson} data-testid="button-create-lesson-from-drafts">
                      <Plus className="w-4 h-4 mr-2" />
                      Skapa ny lektion
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
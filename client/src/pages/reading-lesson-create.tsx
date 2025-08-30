import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/RichTextEditor";

const readingLessonSchema = z.object({
  title: z.string().min(1, "Titel är obligatorisk"),
  description: z.string().optional(),
  gradeLevel: z.string().min(1, "Årskurs är obligatorisk"),
  subject: z.string().optional(),
  readingTime: z.number().optional(),
  content: z.string().min(1, "Innehåll är obligatoriskt"),
  preReadingQuestions: z.array(z.object({
    question: z.string(),
    type: z.enum(["reflection", "prediction", "knowledge"])
  })).default([]),
  questions: z.array(z.object({
    question: z.string(),
    type: z.enum(["multiple-choice", "true-false", "open"]),
    alternatives: z.array(z.object({
      text: z.string(),
      correct: z.boolean()
    })).optional(),
    correctAnswer: z.string().optional()
  })).default([]),
  wordDefinitions: z.array(z.object({
    word: z.string(),
    definition: z.string()
  })).default([])
});

type ReadingLessonForm = z.infer<typeof readingLessonSchema>;

export default function ReadingLessonCreate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { id } = useParams<{ id?: string }>();
  const [content, setContent] = useState("");
  const isEditing = !!id;

  // Fetch existing lesson if editing
  const { data: existingLesson } = useQuery({
    queryKey: ["/api/reading-lessons", id],
    enabled: isEditing,
  });

  const form = useForm<ReadingLessonForm>({
    resolver: zodResolver(readingLessonSchema),
    defaultValues: {
      title: "",
      description: "",
      gradeLevel: "",
      subject: "",
      content: "",
      preReadingQuestions: [],
      questions: [],
      wordDefinitions: []
    }
  });

  // Update form when existing lesson loads
  useEffect(() => {
    if (existingLesson) {
      form.reset({
        title: existingLesson.title || "",
        description: existingLesson.description || "",
        gradeLevel: existingLesson.gradeLevel || "",
        subject: existingLesson.subject || "",
        content: existingLesson.content || "",
        preReadingQuestions: existingLesson.preReadingQuestions || [],
        questions: existingLesson.questions || [],
        wordDefinitions: existingLesson.wordDefinitions || []
      });
      setContent(existingLesson.content || "");
    }
  }, [existingLesson, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: ReadingLessonForm) => {
      const payload = {
        ...data,
        content,
        isPublished: 0
      };
      
      if (isEditing) {
        const response = await apiRequest("PUT", `/api/reading-lessons/${id}`, payload);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/reading-lessons", payload);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-lessons"] });
      toast({
        title: "Framgång",
        description: isEditing ? "Lektionen har uppdaterats" : "Läsförståelselektion skapad som utkast"
      });
      setLocation("/lasforstaelse/admin");
    },
    onError: () => {
      toast({
        title: "Fel",
        description: isEditing ? "Kunde inte uppdatera lektionen" : "Kunde inte skapa lektionen",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: ReadingLessonForm) => {
    saveMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/lasforstaelse/admin">
            <Button variant="outline" size="sm" data-testid="button-back-reading-admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till läsförståelse
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-blue-600" />
              {isEditing ? "Redigera läsförståelselektion" : "Skapa ny läsförståelselektion"}
            </h1>
            <p className="text-gray-600">{isEditing ? "Redigera befintlig lektion" : "Skapa en ny lektion för läsförståelse"}</p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Grundläggande information</CardTitle>
              <CardDescription>
                Fyll i grundläggande information om lektionen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titel *</Label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    placeholder="T.ex. Familjen på ön"
                    data-testid="input-lesson-title"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gradeLevel">Årskurs *</Label>
                  <Select onValueChange={(value) => form.setValue("gradeLevel", value)}>
                    <SelectTrigger data-testid="select-grade-level">
                      <SelectValue placeholder="Välj årskurs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Årskurs 1</SelectItem>
                      <SelectItem value="2">Årskurs 2</SelectItem>
                      <SelectItem value="3">Årskurs 3</SelectItem>
                      <SelectItem value="4">Årskurs 4</SelectItem>
                      <SelectItem value="5">Årskurs 5</SelectItem>
                      <SelectItem value="6">Årskurs 6</SelectItem>
                      <SelectItem value="7">Årskurs 7</SelectItem>
                      <SelectItem value="8">Årskurs 8</SelectItem>
                      <SelectItem value="9">Årskurs 9</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.gradeLevel && (
                    <p className="text-sm text-red-500">{form.formState.errors.gradeLevel.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beskrivning</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Kort beskrivning av lektionen..."
                  data-testid="textarea-lesson-description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Ämne</Label>
                  <Input
                    id="subject"
                    {...form.register("subject")}
                    placeholder="T.ex. Svenska, Naturkunskap"
                    data-testid="input-lesson-subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="readingTime">Läsningstid (minuter)</Label>
                  <Input
                    id="readingTime"
                    type="number"
                    {...form.register("readingTime", { valueAsNumber: true })}
                    placeholder="T.ex. 10"
                    data-testid="input-reading-time"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Innehåll</CardTitle>
              <CardDescription>
                Skriv texten som eleverna ska läsa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Skriv din läsförståelsetext här..."
                className="min-h-[300px]"
              />
              {form.formState.errors.content && (
                <p className="text-sm text-red-500 mt-2">{form.formState.errors.content.message}</p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href="/lasforstaelse/admin">
              <Button variant="outline" data-testid="button-cancel-create">
                Avbryt
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={saveMutation.isPending}
              data-testid="button-save-lesson"
            >
              {saveMutation.isPending ? "Sparar..." : isEditing ? "Uppdatera" : "Spara som utkast"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
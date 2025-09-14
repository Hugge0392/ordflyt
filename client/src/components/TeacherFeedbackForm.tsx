import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { insertTeacherFeedbackSchema } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, Save, X, AlertCircle, ThumbsUp, Star, Flag } from 'lucide-react';

// Use shared schema with additional validation
const feedbackSchema = insertTeacherFeedbackSchema.extend({
  title: z.string().min(1, 'Titel krävs').max(255, 'Titel för lång'),
  message: z.string().min(1, 'Meddelande krävs').max(5000, 'Meddelande för långt'),
  studentId: z.string().min(1, 'Elev krävs'),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface TeacherFeedbackFormProps {
  studentId?: string;
  assignmentId?: string;
  progressId?: string;
  isOpen: boolean;
  onClose: () => void;
  editingFeedback?: any;
}

const FEEDBACK_TYPE_LABELS = {
  lesson_completion: 'Lektionsreflektion',
  progress_comment: 'Framstegskommentar',
  behavior_note: 'Beteendeanteckning',
  achievement: 'Utmärkelse',
  concern: 'Oro/Uppmärksamhet'
};

const PRIORITY_LABELS = {
  low: 'Låg',
  normal: 'Normal',
  high: 'Hög', 
  urgent: 'Brådskande'
};

const FEEDBACK_TEMPLATES = {
  lesson_completion: [
    'Utmärkt arbete! Du har visat god förståelse för materialet.',
    'Bra jobbat! Fortsätt att arbeta på samma sätt.',
    'Du har kommit längre, men det finns rum för förbättring.',
    'Vi behöver träna mer på detta område tillsammans.'
  ],
  progress_comment: [
    'Du har gjort stora framsteg sedan förra gången!',
    'Jag ser att du anstränger dig - fortsätt så!',
    'Du är på rätt väg. Låt oss arbeta vidare tillsammans.',
    'Det här kan du träna mer på hemma.'
  ],
  achievement: [
    'Fantastiskt! Du har verkligen visat vad du kan!',
    'Jag är så stolt över dina framsteg!',
    'Du är ett exempel för andra elever!',
    'Denna prestation förtjänar extra erkännande!'
  ],
  concern: [
    'Jag märker att du har svårigheter med detta. Låt oss prata om hur vi kan hjälpa.',
    'Du verkar ha tappat fokus. Finns det något som stör dig?',
    'Jag skulle vilja träffa dig för att diskutera dina framsteg.',
    'Vi behöver hitta en annan strategi för att hjälpa dig.'
  ]
};

export default function TeacherFeedbackForm({
  studentId,
  assignmentId,
  progressId,
  isOpen,
  onClose,
  editingFeedback
}: TeacherFeedbackFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: editingFeedback ? {
      feedbackType: editingFeedback.feedbackType,
      title: editingFeedback.title || '',
      message: editingFeedback.message || '',
      priority: editingFeedback.priority || 'normal',
      isPositive: editingFeedback.isPositive,
      isPrivate: editingFeedback.isPrivate || false,
      requiresFollowUp: editingFeedback.requiresFollowUp || false,
      studentId: editingFeedback.studentId || studentId || '',
      assignmentId: editingFeedback.assignmentId || assignmentId,
      progressId: editingFeedback.progressId || progressId,
    } : {
      feedbackType: 'progress_comment',
      title: '',
      message: '',
      priority: 'normal',
      isPositive: undefined,
      isPrivate: false,
      requiresFollowUp: false,
      studentId: studentId || '',
      assignmentId: assignmentId,
      progressId: progressId,
    }
  });

  const createFeedbackMutation = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      if (editingFeedback) {
        return apiRequest(`/api/feedback/${editingFeedback.id}`, 'PUT', data);
      } else {
        return apiRequest('/api/feedback', 'POST', data);
      }
    },
    onSuccess: () => {
      // Invalidate all feedback-related queries comprehensively
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      if (studentId) {
        queryClient.invalidateQueries({ queryKey: [`/api/feedback/student/${studentId}`] });
      }
      if (assignmentId) {
        queryClient.invalidateQueries({ queryKey: [`/api/feedback/assignment/${assignmentId}`] });
      }
      toast({
        title: editingFeedback ? 'Återkoppling uppdaterad' : 'Återkoppling skickad',
        description: 'Återkopplingen har sparats framgångsrikt.'
      });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Fel',
        description: error.message || 'Kunde inte spara återkopplingen.',
        variant: 'destructive'
      });
    }
  });

  const handleTemplateSelect = (template: string) => {
    form.setValue('message', template);
    setSelectedTemplate('');
  };

  const feedbackType = form.watch('feedbackType');
  const isPositive = form.watch('isPositive');

  const onSubmit = (data: FeedbackFormData) => {
    createFeedbackMutation.mutate(data);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="feedback-form-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {editingFeedback ? 'Redigera återkoppling' : 'Ny återkoppling'}
          </DialogTitle>
          <DialogDescription>
            Ge eleven konstruktiv återkoppling på deras arbete och framsteg.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Feedback Type & Priority Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="feedbackType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ av återkoppling</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-feedback-type">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj typ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(FEEDBACK_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioritet</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-priority">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj prioritet" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            <Badge className={getPriorityColor(value)}>
                              {label}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titel</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Kort beskrivning av återkopplingen..." 
                      {...field} 
                      data-testid="input-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Templates */}
            {feedbackType && FEEDBACK_TEMPLATES[feedbackType as keyof typeof FEEDBACK_TEMPLATES] && (
              <div className="space-y-2">
                <FormLabel>Mallar (välj för att fylla i meddelandet)</FormLabel>
                <div className="grid grid-cols-1 gap-2">
                  {FEEDBACK_TEMPLATES[feedbackType as keyof typeof FEEDBACK_TEMPLATES].map((template, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-left justify-start h-auto whitespace-normal p-3"
                      onClick={() => handleTemplateSelect(template)}
                      data-testid={`template-${index}`}
                    >
                      {template}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meddelande</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Skriv din återkoppling här..."
                      className="min-h-[120px]"
                      {...field}
                      data-testid="textarea-message"
                    />
                  </FormControl>
                  <FormDescription>
                    Ge konstruktiv och uppmuntrande återkoppling som hjälper eleven att förstå och förbättra sitt arbete.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tone & Flags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isPositive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ton</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === 'true' ? true : value === 'false' ? false : undefined)}
                      value={field.value === true ? 'true' : field.value === false ? 'false' : 'neutral'}
                      data-testid="select-tone"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj ton" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">
                          <div className="flex items-center gap-2">
                            <ThumbsUp className="h-4 w-4 text-green-600" />
                            Positiv/Beröm
                          </div>
                        </SelectItem>
                        <SelectItem value="false">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            Konstruktiv kritik
                          </div>
                        </SelectItem>
                        <SelectItem value="neutral">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-blue-600" />
                            Neutral/Information
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Privat återkoppling</FormLabel>
                      <FormDescription>
                        Endast synlig för lärare och eleven (inte för föräldrar eller andra)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-private"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiresFollowUp"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Kräver uppföljning</FormLabel>
                      <FormDescription>
                        Markera om detta behöver diskuteras vidare eller följas upp
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-follow-up"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                <X className="h-4 w-4 mr-2" />
                Avbryt
              </Button>
              <Button 
                type="submit" 
                disabled={createFeedbackMutation.isPending}
                data-testid="button-submit"
              >
                {createFeedbackMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Sparar...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    {editingFeedback ? 'Uppdatera' : 'Skicka'} återkoppling
                  </div>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
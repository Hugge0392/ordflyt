import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format, formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { 
  MessageSquare, 
  Bell, 
  BellOff, 
  Star, 
  ThumbsUp, 
  AlertTriangle, 
  BookOpen, 
  TrendingUp, 
  User, 
  Calendar, 
  Reply, 
  Send, 
  Eye,
  Heart,
  CheckCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeacherFeedback {
  id: string;
  teacherId: string;
  studentId: string;
  feedbackType: 'lesson_completion' | 'progress_comment' | 'behavior_note' | 'achievement' | 'concern';
  progressId?: string;
  assignmentId?: string;
  title?: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isPositive?: boolean;
  isPrivate: boolean;
  studentHasRead: boolean;
  studentResponse?: string;
  studentRespondedAt?: string;
  requiresFollowUp: boolean;
  createdAt: string;
  updatedAt: string;
  teacher?: {
    id: string;
    username: string;
  };
  assignment?: {
    id: string;
    title: string;
    assignmentType: string;
  };
}

const FEEDBACK_TYPE_LABELS = {
  lesson_completion: 'Reflektion på lektion',
  progress_comment: 'Framstegskommentar',
  behavior_note: 'Beteendeanteckning',
  achievement: 'Utmärkelse',
  concern: 'Uppmärksamhet'
};

const FEEDBACK_TYPE_ICONS = {
  lesson_completion: BookOpen,
  progress_comment: TrendingUp,
  behavior_note: User,
  achievement: Star,
  concern: AlertTriangle
};

const FEEDBACK_TYPE_COLORS = {
  lesson_completion: 'bg-blue-50 border-blue-200 text-blue-800',
  progress_comment: 'bg-green-50 border-green-200 text-green-800',
  behavior_note: 'bg-purple-50 border-purple-200 text-purple-800',
  achievement: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  concern: 'bg-orange-50 border-orange-200 text-orange-800'
};

interface StudentFeedbackViewProps {
  compact?: boolean;
  showUnreadCount?: boolean;
  assignmentId?: string;
}

export default function StudentFeedbackView({ 
  compact = false, 
  showUnreadCount = true,
  assignmentId 
}: StudentFeedbackViewProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<TeacherFeedback | null>(null);
  const [responseText, setResponseText] = useState('');
  const [showResponseDialog, setShowResponseDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch student's feedback
  const { data: feedback = [], isLoading } = useQuery<TeacherFeedback[]>({
    queryKey: assignmentId ? [`/api/feedback/assignment/${assignmentId}`] : ['/api/feedback/student/me'],
    queryFn: () => {
      if (assignmentId) {
        return apiRequest(`/api/feedback/assignment/${assignmentId}`);
      } else {
        // This would need to be implemented to get current student's feedback
        return apiRequest('/api/feedback/student/me');
      }
    },
    enabled: !!user
  });

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['/api/feedback/student/unread-count'],
    queryFn: () => apiRequest('/api/feedback/student/unread-count'),
    enabled: showUnreadCount && !!user
  });

  // Mark feedback as read
  const markAsReadMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      return apiRequest(`/api/feedback/${feedbackId}/mark-read`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      queryClient.invalidateQueries({ queryKey: ['/api/feedback/student/unread-count'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel',
        description: error.message || 'Kunde inte markera som läst.',
        variant: 'destructive'
      });
    }
  });

  // Submit response
  const submitResponseMutation = useMutation({
    mutationFn: async ({ feedbackId, response }: { feedbackId: string; response: string }) => {
      return apiRequest(`/api/feedback/${feedbackId}`, 'PUT', {
        studentResponse: response,
        studentRespondedAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      setResponseText('');
      setShowResponseDialog(false);
      setSelectedFeedback(null);
      toast({
        title: 'Svar skickat',
        description: 'Ditt svar har skickats till din lärare.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel',
        description: error.message || 'Kunde inte skicka svar.',
        variant: 'destructive'
      });
    }
  });

  const handleFeedbackClick = (feedbackItem: TeacherFeedback) => {
    if (!feedbackItem.studentHasRead) {
      markAsReadMutation.mutate(feedbackItem.id);
    }
    setSelectedFeedback(feedbackItem);
  };

  const handleRespond = (feedbackItem: TeacherFeedback) => {
    setSelectedFeedback(feedbackItem);
    setShowResponseDialog(true);
  };

  const submitResponse = () => {
    if (!selectedFeedback || !responseText.trim()) return;
    
    submitResponseMutation.mutate({
      feedbackId: selectedFeedback.id,
      response: responseText.trim()
    });
  };

  const getFeedbackIcon = (type: string) => {
    return FEEDBACK_TYPE_ICONS[type as keyof typeof FEEDBACK_TYPE_ICONS] || MessageSquare;
  };

  const getToneIcon = (isPositive?: boolean) => {
    if (isPositive === true) return ThumbsUp;
    if (isPositive === false) return AlertTriangle;
    return MessageSquare;
  };

  const getToneColor = (isPositive?: boolean) => {
    if (isPositive === true) return 'text-green-600';
    if (isPositive === false) return 'text-orange-600';
    return 'text-blue-600';
  };

  // Sort feedback by date, unread first
  const sortedFeedback = [...feedback].sort((a, b) => {
    // Unread first
    if (!a.studentHasRead && b.studentHasRead) return -1;
    if (a.studentHasRead && !b.studentHasRead) return 1;
    
    // Then by date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (compact) {
    return (
      <div className="space-y-3" data-testid="student-feedback-compact">
        {showUnreadCount && unreadData?.unreadCount > 0 && (
          <Alert>
            <Bell className="h-4 w-4" />
            <AlertDescription>
              Du har {unreadData.unreadCount} ny{unreadData.unreadCount !== 1 ? 'a' : ''} meddelande{unreadData.unreadCount !== 1 ? 'n' : ''} från din lärare.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="text-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Laddar meddelanden...</p>
          </div>
        ) : sortedFeedback.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Inga meddelanden från din lärare än.</p>
          </div>
        ) : (
          sortedFeedback.slice(0, 3).map((item) => {
            const IconComponent = getFeedbackIcon(item.feedbackType);
            const ToneIcon = getToneIcon(item.isPositive);
            
            return (
              <Card 
                key={item.id} 
                className={cn(
                  "cursor-pointer hover:shadow-md transition-all",
                  !item.studentHasRead && "border-blue-300 bg-blue-50/50"
                )}
                onClick={() => handleFeedbackClick(item)}
                data-testid={`feedback-item-${item.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg bg-opacity-20", getToneColor(item.isPositive))}>
                      <ToneIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {FEEDBACK_TYPE_LABELS[item.feedbackType]}
                        </Badge>
                        {!item.studentHasRead && (
                          <Badge className="text-xs bg-blue-600">
                            Nytt
                          </Badge>
                        )}
                      </div>
                      {item.title && (
                        <h4 className="font-medium text-sm truncate mb-1">{item.title}</h4>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.message}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(item.createdAt), { locale: sv, addSuffix: true })}</span>
                        {item.assignment && (
                          <>
                            <span>•</span>
                            <span>{item.assignment.title}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {!item.studentHasRead && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="student-feedback-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Meddelanden från lärare</h2>
          <p className="text-muted-foreground">
            Återkoppling och kommentarer på ditt arbete
          </p>
        </div>
        {showUnreadCount && unreadData?.unreadCount > 0 && (
          <Badge className="bg-blue-600">
            <Bell className="h-4 w-4 mr-1" />
            {unreadData.unreadCount} nya
          </Badge>
        )}
      </div>

      {/* Unread notification */}
      {showUnreadCount && unreadData?.unreadCount > 0 && (
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            Du har {unreadData.unreadCount} oläs{unreadData.unreadCount !== 1 ? 'ta' : 't'} meddelande{unreadData.unreadCount !== 1 ? 'n' : ''} från din lärare.
          </AlertDescription>
        </Alert>
      )}

      {/* Feedback List */}
      {isLoading ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
            <p>Laddar meddelanden...</p>
          </CardContent>
        </Card>
      ) : sortedFeedback.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Inga meddelanden från din lärare än.</p>
            <p className="text-sm text-muted-foreground">
              Här kommer du att se återkoppling och kommentarer på ditt arbete.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedFeedback.map((item) => {
            const IconComponent = getFeedbackIcon(item.feedbackType);
            const ToneIcon = getToneIcon(item.isPositive);
            
            return (
              <Card 
                key={item.id} 
                className={cn(
                  "transition-all hover:shadow-md",
                  !item.studentHasRead && "border-blue-300 bg-blue-50/30",
                  item.feedbackType === 'achievement' && "border-yellow-300 bg-yellow-50/30",
                  item.feedbackType === 'concern' && "border-orange-300 bg-orange-50/30"
                )}
                data-testid={`feedback-card-${item.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-3 rounded-lg flex-shrink-0",
                      FEEDBACK_TYPE_COLORS[item.feedbackType]
                    )}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline">
                          {FEEDBACK_TYPE_LABELS[item.feedbackType]}
                        </Badge>
                        {!item.studentHasRead && (
                          <Badge className="bg-blue-600">
                            <Eye className="h-3 w-3 mr-1" />
                            Nytt meddelande
                          </Badge>
                        )}
                        {item.feedbackType === 'achievement' && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Star className="h-3 w-3 mr-1" />
                            Utmärkelse
                          </Badge>
                        )}
                      </div>

                      {item.title && (
                        <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                      )}
                      
                      <div className="prose prose-sm max-w-none mb-4">
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {item.message}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(item.createdAt), 'dd MMMM yyyy', { locale: sv })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDistanceToNow(new Date(item.createdAt), { locale: sv, addSuffix: true })}</span>
                        </div>
                        {item.assignment && (
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            <span>{item.assignment.title}</span>
                          </div>
                        )}
                      </div>

                      {item.studentResponse ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-2 text-gray-700 mb-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Ditt svar</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(item.studentRespondedAt!), { locale: sv, addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">{item.studentResponse}</p>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRespond(item)}
                            data-testid={`respond-button-${item.id}`}
                          >
                            <Reply className="h-4 w-4 mr-2" />
                            Svara
                          </Button>
                          {!item.studentHasRead && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => markAsReadMutation.mutate(item.id)}
                              data-testid={`mark-read-button-${item.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Markera som läst
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-2xl" data-testid="response-dialog">
          <DialogHeader>
            <DialogTitle>Svara på återkoppling</DialogTitle>
            <DialogDescription>
              Skriv ett svar till din lärare om denna återkoppling.
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">
                    {FEEDBACK_TYPE_LABELS[selectedFeedback.feedbackType]}
                  </Badge>
                </div>
                {selectedFeedback.title && (
                  <h4 className="font-medium mb-2">{selectedFeedback.title}</h4>
                )}
                <p className="text-sm text-gray-600">{selectedFeedback.message}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ditt svar</label>
                <Textarea
                  placeholder="Skriv ditt svar här..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="response-textarea"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowResponseDialog(false)}>
                  Avbryt
                </Button>
                <Button 
                  onClick={submitResponse}
                  disabled={!responseText.trim() || submitResponseMutation.isPending}
                  data-testid="submit-response-button"
                >
                  {submitResponseMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Skickar...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Skicka svar
                    </div>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
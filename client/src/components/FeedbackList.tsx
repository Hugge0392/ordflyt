import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Calendar, 
  User, 
  Flag, 
  Clock, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  CheckCircle,
  Star,
  ThumbsUp,
  MoreVertical,
  Reply,
  BookOpen,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TeacherFeedbackForm from './TeacherFeedbackForm';

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
  followedUpAt?: string;
  followUpNotes?: string;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    studentName: string;
    username: string;
  };
  assignment?: {
    id: string;
    title: string;
    assignmentType: string;
  };
}

const FEEDBACK_TYPE_LABELS = {
  lesson_completion: 'Lektionsreflektion',
  progress_comment: 'Framstegskommentar',
  behavior_note: 'Beteendeanteckning',
  achievement: 'Utmärkelse',
  concern: 'Oro/Uppmärksamhet'
};

const FEEDBACK_TYPE_ICONS = {
  lesson_completion: BookOpen,
  progress_comment: TrendingUp,
  behavior_note: User,
  achievement: Star,
  concern: AlertTriangle
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const PRIORITY_LABELS = {
  low: 'Låg',
  normal: 'Normal',
  high: 'Hög',
  urgent: 'Brådskande'
};

interface FeedbackListProps {
  showStudent?: boolean;
  studentId?: string;
  assignmentId?: string;
  compact?: boolean;
}

export default function FeedbackList({ 
  showStudent = true, 
  studentId, 
  assignmentId, 
  compact = false 
}: FeedbackListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingFeedback, setEditingFeedback] = useState<TeacherFeedback | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine which endpoint to use based on props
  const getQueryKey = () => {
    if (studentId) {
      return [`/api/feedback/student/${studentId}`];
    } else if (assignmentId) {
      return [`/api/feedback/assignment/${assignmentId}`];
    } else {
      return ['/api/feedback/teacher'];
    }
  };

  const getEndpoint = () => {
    if (studentId) {
      return `/api/feedback/student/${studentId}`;
    } else if (assignmentId) {
      return `/api/feedback/assignment/${assignmentId}`;
    } else {
      return '/api/feedback/teacher';
    }
  };

  // Fetch feedback
  const { data: feedback = [], isLoading, refetch } = useQuery<TeacherFeedback[]>({
    queryKey: getQueryKey(),
    queryFn: () => apiRequest(getEndpoint())
  });

  // Delete feedback mutation
  const deleteFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      return apiRequest(`/api/feedback/${feedbackId}`, 'DELETE');
    },
    onSuccess: () => {
      // Invalidate all feedback-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      queryClient.invalidateQueries({ queryKey: getQueryKey() });
      toast({
        title: 'Återkoppling borttagen',
        description: 'Återkopplingen har tagits bort framgångsrikt.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel',
        description: error.message || 'Kunde inte ta bort återkopplingen.',
        variant: 'destructive'
      });
    }
  });

  // Mark follow-up as completed
  const markFollowUpMutation = useMutation({
    mutationFn: async ({ feedbackId, notes }: { feedbackId: string; notes: string }) => {
      return apiRequest(`/api/feedback/${feedbackId}`, 'PUT', {
        followedUpAt: new Date().toISOString(),
        followUpNotes: notes
      });
    },
    onSuccess: () => {
      // Invalidate all feedback-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      queryClient.invalidateQueries({ queryKey: getQueryKey() });
      toast({
        title: 'Uppföljning markerad som klar',
        description: 'Uppföljningen har markerats som slutförd.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel',
        description: error.message || 'Kunde inte markera uppföljning som klar.',
        variant: 'destructive'
      });
    }
  });

  // Filter feedback
  const filteredFeedback = feedback.filter(item => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        item.title?.toLowerCase().includes(searchLower) ||
        item.message.toLowerCase().includes(searchLower) ||
        item.student?.studentName?.toLowerCase().includes(searchLower) ||
        item.assignment?.title?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Type filter
    if (feedbackTypeFilter !== 'all' && item.feedbackType !== feedbackTypeFilter) {
      return false;
    }

    // Priority filter
    if (priorityFilter !== 'all' && item.priority !== priorityFilter) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'unread':
          return !item.studentHasRead;
        case 'read':
          return item.studentHasRead;
        case 'responded':
          return !!item.studentResponse;
        case 'follow-up':
          return item.requiresFollowUp && !item.followedUpAt;
        case 'private':
          return item.isPrivate;
        case 'urgent':
          return item.priority === 'urgent' || item.priority === 'high';
      }
    }

    return true;
  });

  const handleEdit = (feedback: TeacherFeedback) => {
    setEditingFeedback(feedback);
    setShowEditForm(true);
  };

  const handleDelete = (feedbackId: string) => {
    deleteFeedbackMutation.mutate(feedbackId);
  };

  const getFeedbackIcon = (type: string) => {
    const IconComponent = FEEDBACK_TYPE_ICONS[type as keyof typeof FEEDBACK_TYPE_ICONS] || MessageSquare;
    return IconComponent;
  };

  const getToneColor = (isPositive?: boolean) => {
    if (isPositive === true) return 'text-green-600';
    if (isPositive === false) return 'text-orange-600';
    return 'text-blue-600';
  };

  const getToneIcon = (isPositive?: boolean) => {
    if (isPositive === true) return ThumbsUp;
    if (isPositive === false) return AlertTriangle;
    return MessageSquare;
  };

  if (compact) {
    return (
      <div className="space-y-3" data-testid="feedback-list-compact">
        {isLoading ? (
          <div className="text-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Laddar återkoppling...</p>
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Ingen återkoppling tillgänglig.</p>
          </div>
        ) : (
          filteredFeedback.map((item) => {
            const IconComponent = getFeedbackIcon(item.feedbackType);
            const ToneIcon = getToneIcon(item.isPositive);
            
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow" data-testid={`feedback-item-${item.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn("p-2 rounded-lg", getToneColor(item.isPositive))}>
                        <ToneIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {FEEDBACK_TYPE_LABELS[item.feedbackType]}
                          </Badge>
                          <Badge className={cn("text-xs", PRIORITY_COLORS[item.priority])}>
                            {PRIORITY_LABELS[item.priority]}
                          </Badge>
                          {!item.studentHasRead && (
                            <Badge variant="secondary" className="text-xs">
                              Oläst
                            </Badge>
                          )}
                        </div>
                        {item.title && (
                          <h4 className="font-medium text-sm truncate">{item.title}</h4>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{format(new Date(item.createdAt), 'dd MMM', { locale: sv })}</span>
                          {showStudent && item.student && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {item.student.studentName}
                            </span>
                          )}
                          {item.requiresFollowUp && !item.followedUpAt && (
                            <Badge variant="destructive" className="text-xs">
                              Kräver uppföljning
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
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
    <div className="space-y-6" data-testid="feedback-list">
      {/* Header & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold">Återkoppling ({filteredFeedback.length})</h3>
            <p className="text-sm text-muted-foreground">
              Hantera och följ upp feedback till elever
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm" data-testid="button-refresh-feedback">
            <MessageSquare className="h-4 w-4 mr-2" />
            Uppdatera
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sök</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Sök i återkoppling..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Typ</label>
                <Select value={feedbackTypeFilter} onValueChange={setFeedbackTypeFilter} data-testid="select-type">
                  <SelectTrigger>
                    <SelectValue placeholder="Alla typer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-type-all">Alla typer</SelectItem>
                    {Object.entries(FEEDBACK_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value} data-testid={`option-type-${value}`}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prioritet</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter} data-testid="select-priority">
                  <SelectTrigger>
                    <SelectValue placeholder="Alla prioriteter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-priority-all">Alla prioriteter</SelectItem>
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value} data-testid={`option-priority-${value}`}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-status">
                  <SelectTrigger>
                    <SelectValue placeholder="Alla statusar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-status-all">Alla statusar</SelectItem>
                    <SelectItem value="unread" data-testid="option-status-unread">Olästa</SelectItem>
                    <SelectItem value="read" data-testid="option-status-read">Lästa</SelectItem>
                    <SelectItem value="responded" data-testid="option-status-responded">Besvarade</SelectItem>
                    <SelectItem value="follow-up" data-testid="option-status-followup">Behöver uppföljning</SelectItem>
                    <SelectItem value="private" data-testid="option-status-private">Privata</SelectItem>
                    <SelectItem value="urgent" data-testid="option-status-urgent">Brådskande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback List */}
      {isLoading ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
            <p>Laddar återkoppling...</p>
          </CardContent>
        </Card>
      ) : filteredFeedback.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Ingen återkoppling hittades.</p>
            <p className="text-sm text-muted-foreground">
              {feedback.length === 0 
                ? 'Du har inte skickat någon återkoppling än.' 
                : 'Prova att ändra filtren för att se fler resultat.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFeedback.map((item) => {
            const IconComponent = getFeedbackIcon(item.feedbackType);
            const ToneIcon = getToneIcon(item.isPositive);
            
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow" data-testid={`feedback-card-${item.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={cn("p-3 rounded-lg bg-opacity-10", getToneColor(item.isPositive))}>
                        <ToneIcon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">
                            {FEEDBACK_TYPE_LABELS[item.feedbackType]}
                          </Badge>
                          <Badge className={PRIORITY_COLORS[item.priority]}>
                            {PRIORITY_LABELS[item.priority]}
                          </Badge>
                          {!item.studentHasRead && (
                            <Badge variant="secondary">
                              <Eye className="h-3 w-3 mr-1" />
                              Oläst
                            </Badge>
                          )}
                          {item.isPrivate && (
                            <Badge variant="outline">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Privat
                            </Badge>
                          )}
                        </div>

                        {item.title && (
                          <h4 className="font-semibold text-lg mb-2">{item.title}</h4>
                        )}
                        
                        <p className="text-gray-700 mb-3 whitespace-pre-wrap">{item.message}</p>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(item.createdAt), 'dd MMM yyyy HH:mm', { locale: sv })}</span>
                          </div>
                          {showStudent && item.student && (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>{item.student.studentName}</span>
                            </div>
                          )}
                          {item.assignment && (
                            <div className="flex items-center gap-1">
                              <IconComponent className="h-4 w-4" />
                              <span>{item.assignment.title}</span>
                            </div>
                          )}
                        </div>

                        {item.requiresFollowUp && !item.followedUpAt && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2 text-orange-800">
                              <Flag className="h-4 w-4" />
                              <span className="font-medium">Kräver uppföljning</span>
                            </div>
                          </div>
                        )}

                        {item.studentResponse && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2 text-blue-800 mb-2">
                              <Reply className="h-4 w-4" />
                              <span className="font-medium">Elevens svar</span>
                              <span className="text-xs">
                                {formatDistanceToNow(new Date(item.studentRespondedAt!), { locale: sv, addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-blue-700 text-sm">{item.studentResponse}</p>
                          </div>
                        )}

                        {item.followedUpAt && item.followUpNotes && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-green-800 mb-2">
                              <CheckCircle className="h-4 w-4" />
                              <span className="font-medium">Uppföljning slutförd</span>
                              <span className="text-xs">
                                {format(new Date(item.followedUpAt), 'dd MMM yyyy', { locale: sv })}
                              </span>
                            </div>
                            <p className="text-green-700 text-sm">{item.followUpNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(item)}
                        data-testid={`edit-button-${item.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" data-testid={`delete-button-${item.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent data-testid="dialog-delete-feedback">
                          <AlertDialogHeader>
                            <AlertDialogTitle data-testid="title-delete-feedback">Ta bort återkoppling</AlertDialogTitle>
                            <AlertDialogDescription data-testid="desc-delete-feedback">
                              Är du säker på att du vill ta bort denna återkoppling? 
                              Detta kan inte ångras.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid="button-cancel-delete">Avbryt</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(item.id)}
                              className="bg-red-600 hover:bg-red-700"
                              data-testid="button-confirm-delete"
                            >
                              Ta bort
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Feedback Form */}
      {showEditForm && editingFeedback && (
        <TeacherFeedbackForm
          isOpen={showEditForm}
          onClose={() => {
            setShowEditForm(false);
            setEditingFeedback(null);
          }}
          editingFeedback={editingFeedback}
        />
      )}
    </div>
  );
}
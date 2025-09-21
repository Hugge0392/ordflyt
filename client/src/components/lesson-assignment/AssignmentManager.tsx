import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns';
import { sv } from 'date-fns/locale';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar, 
  Users, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  BarChart3,
  Edit,
  Trash2,
  Eye,
  PlayCircle,
  PauseCircle,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  assignmentType: 'practice' | 'test' | 'homework';
  lessonIds: string[];
  lessonType: string;
  classId?: string;
  studentId?: string;
  dueDate?: string;
  createdAt: string;
  isActive: boolean;
  settings: {
    showProgress?: boolean;
    allowLateSubmission?: boolean;
    immediateCorrection?: boolean;
    requireCompletion?: boolean;
  };
}

interface StudentProgress {
  id: string;
  studentId: string;
  assignmentId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'submitted' | 'overdue';
  progressPercentage?: number;
  score?: number;
  timeSpent?: number;
  attempts?: number;
  completedAt?: string;
  lastActivityAt?: string;
}

const ASSIGNMENT_TYPE_LABELS = {
  'practice': 'Övning',
  'test': 'Test',
  'homework': 'Hemläxa'
};

const STATUS_LABELS = {
  'not_started': 'Ej påbörjad',
  'in_progress': 'Pågående',
  'completed': 'Slutförd',
  'submitted': 'Inlämnad',
  'overdue': 'Försenad'
};

const STATUS_COLORS = {
  'not_started': 'secondary',
  'in_progress': 'default',
  'completed': 'default',
  'submitted': 'default',
  'overdue': 'destructive'
} as const;

export function AssignmentManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch assignments
  const { data: assignments = [], isLoading, error } = useQuery<Assignment[]>({
    queryKey: ['/api/assignments'],
  });

  // Fetch progress for selected assignment
  const { data: progressData = [], isLoading: isLoadingProgress } = useQuery<StudentProgress[]>({
    queryKey: ['/api/assignments', selectedAssignment?.id, 'progress'],
    enabled: !!selectedAssignment,
  });

  // Toggle assignment active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest('PUT', `/api/assignments/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      toast({
        title: 'Uppgift uppdaterad',
        description: 'Status för uppgiften har ändrats.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Kunde inte uppdatera uppgift',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete assignment
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      toast({
        title: 'Uppgift borttagen',
        description: 'Uppgiften har tagits bort framgångsrikt.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Kunde inte ta bort uppgift',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = !searchTerm || 
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && assignment.isActive) ||
      (filterStatus === 'inactive' && !assignment.isActive) ||
      (filterStatus === 'overdue' && assignment.dueDate && isAfter(new Date(), new Date(assignment.dueDate)));
    
    const matchesType = filterType === 'all' || assignment.assignmentType === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getAssignmentStatusBadge = (assignment: Assignment) => {
    const now = new Date();
    const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
    
    if (!assignment.isActive) {
      return <Badge variant="secondary">Inaktiv</Badge>;
    }
    
    if (dueDate && isAfter(now, dueDate)) {
      return <Badge variant="destructive">Försenad</Badge>;
    }
    
    return <Badge variant="default">Aktiv</Badge>;
  };

  const getProgressSummary = (assignment: Assignment) => {
    // This would normally come from the progress data
    // For now, return a placeholder
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0
    };
  };

  if (error) {
    return (
      <Alert variant="destructive" data-testid="error-alert">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Kunde inte ladda uppgifter. Försök igen senare.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6" data-testid="assignment-manager">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Mina uppgifter</h2>
          <p className="text-muted-foreground">
            Hantera och följ upp tilldelade uppgifter
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök uppgifter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-assignments"
          />
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48" data-testid="select-filter-status">
            <SelectValue placeholder="Filtrera status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla status</SelectItem>
            <SelectItem value="active">Aktiva</SelectItem>
            <SelectItem value="inactive">Inaktiva</SelectItem>
            <SelectItem value="overdue">Försenade</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32" data-testid="select-filter-type">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla typer</SelectItem>
            <SelectItem value="practice">Övning</SelectItem>
            <SelectItem value="test">Test</SelectItem>
            <SelectItem value="homework">Hemläxa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8" data-testid="loading-assignments">
            <p>Laddar uppgifter...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-8" data-testid="no-assignments">
            <p className="text-muted-foreground">
              {assignments.length === 0 
                ? 'Inga uppgifter skapade än.' 
                : 'Inga uppgifter matchar dina filter.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredAssignments.map((assignment) => {
              const progressSummary = getProgressSummary(assignment);
              const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
              
              return (
                <Card key={assignment.id} className="hover:shadow-md transition-shadow" data-testid={`card-assignment-${assignment.id}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          {assignment.title}
                          {getAssignmentStatusBadge(assignment)}
                          <Badge variant="outline" className="text-xs">
                            {ASSIGNMENT_TYPE_LABELS[assignment.assignmentType]}
                          </Badge>
                        </CardTitle>
                        
                        {assignment.description && (
                          <CardDescription>{assignment.description}</CardDescription>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Skapad {format(new Date(assignment.createdAt), 'PPp', { locale: sv })}
                          </span>
                          
                          {dueDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Slutdatum {format(dueDate, 'PPp', { locale: sv })}
                            </span>
                          )}
                          
                          <span className="flex items-center gap-1">
                            {assignment.classId ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                            {assignment.classId ? 'Klass' : 'Individuell'}
                          </span>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`button-menu-${assignment.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setShowProgressDialog(true);
                            }}
                            data-testid={`menu-view-progress-${assignment.id}`}
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Visa framsteg
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem data-testid={`menu-edit-${assignment.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Redigera
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => toggleActiveMutation.mutate({ 
                              id: assignment.id, 
                              isActive: !assignment.isActive 
                            })}
                            data-testid={`menu-toggle-${assignment.id}`}
                          >
                            {assignment.isActive ? (
                              <>
                                <PauseCircle className="h-4 w-4 mr-2" />
                                Inaktivera
                              </>
                            ) : (
                              <>
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Aktivera
                              </>
                            )}
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              if (confirm('Är du säker på att du vill ta bort denna uppgift?')) {
                                deleteAssignmentMutation.mutate(assignment.id);
                              }
                            }}
                            data-testid={`menu-delete-${assignment.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Ta bort
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex justify-between items-center text-sm">
                      <div className="text-muted-foreground">
                        {assignment.lessonIds.length} {assignment.lessonIds.length === 1 ? 'lektion' : 'lektioner'}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {/* Progress indicators would go here */}
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{progressSummary.completed} slutförda</span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{progressSummary.inProgress} pågående</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Progress Dialog */}
      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-progress">
          <DialogHeader>
            <DialogTitle>Framsteg för: {selectedAssignment?.title}</DialogTitle>
            <DialogDescription>
              Visa detaljerat framsteg för alla elever i denna uppgift
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {isLoadingProgress ? (
              <div className="text-center py-4">
                <p>Laddar framsteg...</p>
              </div>
            ) : progressData.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Inget framsteg registrerat än.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Elev</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Framsteg</TableHead>
                    <TableHead>Poäng</TableHead>
                    <TableHead>Tid spenderad</TableHead>
                    <TableHead>Senaste aktivitet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progressData.map((progress) => (
                    <TableRow key={progress.id}>
                      <TableCell>{progress.studentId}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[progress.status] as any}>
                          {STATUS_LABELS[progress.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {progress.progressPercentage ? `${progress.progressPercentage}%` : '-'}
                      </TableCell>
                      <TableCell>
                        {progress.score ? `${progress.score}%` : '-'}
                      </TableCell>
                      <TableCell>
                        {progress.timeSpent ? `${Math.round(progress.timeSpent / 60)} min` : '-'}
                      </TableCell>
                      <TableCell>
                        {progress.lastActivityAt 
                          ? formatDistanceToNow(new Date(progress.lastActivityAt), { locale: sv, addSuffix: true })
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
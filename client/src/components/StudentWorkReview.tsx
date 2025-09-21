import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  MessageSquare, 
  Trophy, 
  TrendingUp,
  Eye,
  BookOpen,
  FileText,
  Calendar,
  Timer,
  Award,
  AlertTriangle,
  BarChart3,
  SortAsc,
  SortDesc,
  RefreshCw,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TeacherFeedbackForm from './TeacherFeedbackForm';

interface StudentProgress {
  id: string;
  studentId: string;
  assignmentId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'submitted';
  progressPercentage?: number;
  score?: number;
  timeSpent?: number;
  attempts?: number;
  completedAt?: string;
  lastActivityAt?: string;
  createdAt: string;
  assignment: {
    id: string;
    title: string;
    assignmentType: string;
    dueDate?: string;
    classId: string;
  };
  student?: {
    id: string;
    studentName: string;
    username: string;
  };
  existingFeedback?: any[];
}

interface CompletionOverview {
  assignment: {
    id: string;
    title: string;
    assignmentType: string;
    dueDate?: string;
  };
  totalStudents: number;
  statusCounts: {
    not_started: number;
    in_progress: number;
    completed: number;
    submitted: number;
  };
  completionRate: number;
}

const STATUS_LABELS = {
  not_started: 'Ej påbörjad',
  in_progress: 'Pågår',
  completed: 'Klar',
  submitted: 'Inlämnad'
};

const STATUS_COLORS = {
  not_started: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  submitted: 'bg-purple-100 text-purple-800'
};

const ASSIGNMENT_TYPE_LABELS = {
  reading_lesson: 'Läslektion',
  word_class_practice: 'Ordklassövning',
  published_lesson: 'Publicerad lektion',
  custom_exercise: 'Anpassad övning'
};

export default function StudentWorkReview() {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('lastActivityAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState<StudentProgress | null>(null);
  const [activeTab, setActiveTab] = useState('individual');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch student work for review
  const { data: studentWork = [], isLoading: isLoadingWork, refetch: refetchWork } = useQuery<StudentProgress[]>({
    queryKey: ['/api/feedback/student-work/review', { 
      classId: selectedClass !== 'all' ? selectedClass : undefined,
      assignmentId: selectedAssignment !== 'all' ? selectedAssignment : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      sortBy,
      sortOrder
    }],
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey;
      const searchParams = new URLSearchParams();
      
      Object.entries(params as any).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
      });
      
      return apiRequest('GET', `/api/feedback/student-work/review?${searchParams}`);
    }
  });

  // Fetch completion overview
  const { data: completionOverview = [], isLoading: isLoadingOverview } = useQuery<CompletionOverview[]>({
    queryKey: ['/api/feedback/completion-overview', {
      classId: selectedClass !== 'all' ? selectedClass : undefined,
      assignmentId: selectedAssignment !== 'all' ? selectedAssignment : undefined
    }],
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey;
      const searchParams = new URLSearchParams();
      
      Object.entries(params as any).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
      });
      
      return apiRequest('GET', `/api/feedback/completion-overview?${searchParams}`);
    }
  });

  // Fetch teacher's classes
  const { data: classes = [] } = useQuery({
    queryKey: ['/api/license/classes'],
    select: (data: any) => data.classes || []
  });

  // Fetch teacher's assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ['/api/assignments']
  });

  // Filter student work based on search term
  const filteredStudentWork = studentWork.filter(work => {
    if (!searchTerm) return true;
    const studentName = work.student?.studentName?.toLowerCase() || '';
    const assignmentTitle = work.assignment.title.toLowerCase();
    return studentName.includes(searchTerm.toLowerCase()) || 
           assignmentTitle.includes(searchTerm.toLowerCase());
  });

  const handleProvideFeedback = (progress: StudentProgress) => {
    setSelectedProgress(progress);
    setShowFeedbackForm(true);
  };

  const handleSortChange = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getScoreColor = (score: number | undefined) => {
    if (!score) return 'text-gray-500';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatTimeSpent = (minutes: number | undefined) => {
    if (!minutes) return '—';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-blue-600';
    if (rate >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6" data-testid="student-work-review">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Granska elevarbeten</h2>
          <p className="text-muted-foreground">
            Översikt över elevers framsteg och ge återkoppling på deras arbete
          </p>
        </div>
        <Button onClick={() => refetchWork()} variant="outline" data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          Uppdatera
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter och sök
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Klass</label>
              <Select value={selectedClass} onValueChange={setSelectedClass} data-testid="select-class">
                <SelectTrigger>
                  <SelectValue placeholder="Alla klasser" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla klasser</SelectItem>
                  {classes.map((cls: any) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Uppgift</label>
              <Select value={selectedAssignment} onValueChange={setSelectedAssignment} data-testid="select-assignment">
                <SelectTrigger>
                  <SelectValue placeholder="Alla uppgifter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla uppgifter</SelectItem>
                  {assignments.map((assignment: any) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {assignment.title}
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
                  <SelectItem value="all">Alla statusar</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sök elev/uppgift</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sök..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="individual" data-testid="tab-individual">
            <User className="h-4 w-4 mr-2" />
            Individuell granskning
          </TabsTrigger>
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Klassöversikt
          </TabsTrigger>
        </TabsList>

        {/* Individual Student Work Review */}
        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Elevarbeten ({filteredStudentWork.length})</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportera
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingWork ? (
                <div className="text-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
                  <p>Laddar elevarbeten...</p>
                </div>
              ) : filteredStudentWork.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Inga elevarbeten hittades med de valda filtren.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer" onClick={() => handleSortChange('student.studentName')}>
                          <div className="flex items-center gap-2">
                            Elev
                            {sortBy === 'student.studentName' && (
                              sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSortChange('assignment.title')}>
                          <div className="flex items-center gap-2">
                            Uppgift
                            {sortBy === 'assignment.title' && (
                              sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSortChange('status')}>
                          <div className="flex items-center gap-2">
                            Status
                            {sortBy === 'status' && (
                              sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSortChange('score')}>
                          <div className="flex items-center gap-2">
                            Resultat
                            {sortBy === 'score' && (
                              sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSortChange('timeSpent')}>
                          <div className="flex items-center gap-2">
                            Tid
                            {sortBy === 'timeSpent' && (
                              sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSortChange('completedAt')}>
                          <div className="flex items-center gap-2">
                            Slutförd
                            {sortBy === 'completedAt' && (
                              sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead>Återkoppling</TableHead>
                        <TableHead>Åtgärder</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudentWork.map((work) => (
                        <TableRow key={work.id} data-testid={`work-row-${work.id}`}>
                          <TableCell>
                            <div className="font-medium">{work.student?.studentName || 'Okänd elev'}</div>
                            <div className="text-sm text-muted-foreground">{work.student?.username}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{work.assignment.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {ASSIGNMENT_TYPE_LABELS[work.assignment.assignmentType as keyof typeof ASSIGNMENT_TYPE_LABELS] || work.assignment.assignmentType}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[work.status as keyof typeof STATUS_COLORS]}>
                              {STATUS_LABELS[work.status as keyof typeof STATUS_LABELS]}
                            </Badge>
                            {work.progressPercentage !== undefined && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {work.progressPercentage}% klart
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className={cn("font-medium", getScoreColor(work.score))}>
                              {work.score !== undefined ? `${work.score}%` : '—'}
                            </div>
                            {work.attempts && work.attempts > 1 && (
                              <div className="text-sm text-muted-foreground">
                                {work.attempts} försök
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Timer className="h-4 w-4 text-muted-foreground" />
                              {formatTimeSpent(work.timeSpent)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {work.completedAt ? (
                              <div>
                                <div className="text-sm">
                                  {format(new Date(work.completedAt), 'dd MMM', { locale: sv })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(work.completedAt), { locale: sv, addSuffix: true })}
                                </div>
                              </div>
                            ) : work.lastActivityAt ? (
                              <div className="text-sm text-muted-foreground">
                                Senast aktiv {formatDistanceToNow(new Date(work.lastActivityAt), { locale: sv, addSuffix: true })}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {work.existingFeedback && work.existingFeedback.length > 0 ? (
                              <Badge variant="outline" className="text-green-600">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                {work.existingFeedback.length} kommentar{work.existingFeedback.length !== 1 ? 'er' : ''}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Ingen återkoppling</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleProvideFeedback(work)}
                                data-testid={`feedback-button-${work.id}`}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Återkoppling
                              </Button>
                              <Button size="sm" variant="ghost">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Class Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingOverview ? (
              <Card className="col-span-full">
                <CardContent className="text-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
                  <p>Laddar klassöversikt...</p>
                </CardContent>
              </Card>
            ) : completionOverview.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Ingen data att visa för de valda filtren.</p>
                </CardContent>
              </Card>
            ) : (
              completionOverview.map((overview) => (
                <Card key={overview.assignment.id} data-testid={`overview-card-${overview.assignment.id}`}>
                  <CardHeader>
                    <CardTitle className="text-lg">{overview.assignment.title}</CardTitle>
                    <CardDescription>
                      {ASSIGNMENT_TYPE_LABELS[overview.assignment.assignmentType as keyof typeof ASSIGNMENT_TYPE_LABELS] || overview.assignment.assignmentType}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Slutförandegraden</span>
                      <span className={cn("font-bold", getCompletionRateColor(overview.completionRate))}>
                        {overview.completionRate.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Totalt elever</span>
                        <span className="font-medium">{overview.totalStudents}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ej påbörjad</span>
                          <span className="font-medium">{overview.statusCounts.not_started}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-600">Pågår</span>
                          <span className="font-medium">{overview.statusCounts.in_progress}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-600">Klar</span>
                          <span className="font-medium">{overview.statusCounts.completed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-600">Inlämnad</span>
                          <span className="font-medium">{overview.statusCounts.submitted}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${overview.completionRate}%` }}
                        />
                      </div>
                    </div>

                    {overview.assignment.dueDate && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Förfaller {format(new Date(overview.assignment.dueDate), 'dd MMM yyyy', { locale: sv })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Feedback Form Dialog */}
      {showFeedbackForm && selectedProgress && (
        <TeacherFeedbackForm
          isOpen={showFeedbackForm}
          onClose={() => {
            setShowFeedbackForm(false);
            setSelectedProgress(null);
          }}
          studentId={selectedProgress.studentId}
          assignmentId={selectedProgress.assignmentId}
          progressId={selectedProgress.id}
        />
      )}
    </div>
  );
}
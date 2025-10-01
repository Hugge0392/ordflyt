import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { HelpTooltip, InfoTooltip } from '@/components/ui/help-tooltip';
import { HelpMenu, commonGuides } from '@/components/ui/help-menu';
import {
  Users,
  BookOpen,
  BarChart3,
  Monitor,
  GraduationCap,
  Clock,
  Activity,
  School,
  LogOut,
  Settings,
  Home,
  ChevronRight,
  User,
  Calendar,
  Target,
  TrendingUp,
  Award,
  Zap,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Search,
  Filter,
  Download,
  Plus,
  Printer,
  Trash2,
  MessageSquare,
  MapPin,
  Lightbulb,
  Library
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Link } from 'wouter';
import StudentResultsAnalytics from '@/components/analytics/StudentResultsAnalytics';
// Temporarily disabled due to WebSocket connection issues
// import ClassroomControlPanel from '@/components/classroom/ClassroomControlPanel';
// import { ClassroomWebSocketProvider } from '@/components/classroom/ClassroomWebSocketContext';
import StudentWorkReview from '@/components/StudentWorkReview';
import FeedbackList from '@/components/FeedbackList';
import TeacherFeedbackForm from '@/components/TeacherFeedbackForm';
import ExportDashboard from '@/components/export/ExportDashboard';
import TeacherLessonBank from '@/pages/teacher-lesson-bank';
// Temporarily disabled due to potential issues
// import { usePreview } from '@/contexts/PreviewContext';

// Dashboard section types
type DashboardSection = 'overview' | 'students' | 'assignments' | 'assign-lessons' | 'results' | 'classroom' | 'feedback' | 'export' | 'lessonbank';

interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  activeAssignments: number;
  completedLessons: number;
  averageProgress: number;
  totalSchoolHours: number;
}

interface StudentData {
  id: string;
  username: string;
  studentName: string;
  classId: string;
  className: string;
  lastLogin?: string;
  createdAt: string;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
}

interface ClassData {
  id: string;
  name: string;
  term?: string;
  description?: string;
  createdAt: string;
  students: StudentData[];
}

interface ClassesResponse {
  classes: ClassData[];
}

interface StudentsWithPasswordsResponse {
  students: StudentData[];
}

// Student Management Section Component
function StudentManagementSection() {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
  const [studentPasswords, setStudentPasswords] = useState<{[key: string]: string}>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [selectedClassForCreation, setSelectedClassForCreation] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [showToolSettings, setShowToolSettings] = useState(false);
  const [selectedStudentForSettings, setSelectedStudentForSettings] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<'none' | 'password-reset' | 'settings'>('none');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, teacherContext } = useAuth();

  // Kontrollera licensstatus först
  const { data: licenseStatus, isLoading: isCheckingLicense, error: licenseError } = useQuery({
    queryKey: ['/api/license/status'],
    enabled: isAuthenticated && teacherContext?.isTeacher,
    retry: false,
  });

  // Debug logging for license status (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Teacher Dashboard License check:', {
      isLoading: isCheckingLicense,
      hasLicense: (licenseStatus as any)?.hasLicense,
      licenseStatus,
      error: licenseError,
      isAuthenticated,
      teacherContext
    });
  }

  // Allow access if dev bypass is active
  const isDevBypass = import.meta.env.DEV && localStorage.getItem('devBypass') === 'true';

  // Fetch teacher's classes and students - tillåt access i dev-läge eller med licens
  const { data: classesData, isLoading: isLoadingClasses } = useQuery<ClassesResponse>({
    queryKey: ['/api/license/classes'],
    enabled: isAuthenticated && teacherContext?.isTeacher && (
      isDevBypass || (!isCheckingLicense && (licenseStatus as any)?.hasLicense === true)
    ),
    staleTime: 0, // Ensure fresh data
    refetchOnMount: true, // Always refetch when component mounts
    initialData: { classes: [] },
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Kopierat!',
        description: `${label} kopierad till urklipp.`,
      });
    } catch (error) {
      toast({
        title: 'Kunde inte kopiera',
        description: 'Markera och kopiera texten manuellt.',
        variant: 'destructive',
      });
    }
  };

  const fetchStudentPassword = async (studentId: string) => {
    try {
      const response = await apiRequest('GET', `/api/license/students/${studentId}/password`);
      setStudentPasswords(prev => ({
        ...prev,
        [studentId]: response.password
      }));
      return response.password;
    } catch (error: any) {
      toast({
        title: 'Kunde inte hämta lösenord',
        description: error.message || 'Lösenordet har gått ut. Återställ lösenordet för att se det.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const togglePasswordVisibility = async (studentId: string) => {
    if (showPasswords[studentId]) {
      // Hide password
      setShowPasswords(prev => ({
        ...prev,
        [studentId]: false
      }));
    } else {
      // Show password - fetch if not already cached
      if (!studentPasswords[studentId]) {
        await fetchStudentPassword(studentId);
      }
      setShowPasswords(prev => ({
        ...prev,
        [studentId]: true
      }));
    }
  };

  const resetPasswordMutation = useMutation({
    mutationFn: async (studentId: string) => {
      return apiRequest('POST', `/api/license/students/${studentId}/reset-password`);
    },
    onSuccess: (data, studentId) => {
      // Cache the new password for immediate display
      if (data.student?.newPassword) {
        setStudentPasswords(prev => ({
          ...prev,
          [studentId]: data.student.newPassword
        }));
        setShowPasswords(prev => ({
          ...prev,
          [studentId]: true
        }));
      }
      queryClient.invalidateQueries({ queryKey: ['/api/license/classes'] });
      toast({
        title: 'Lösenord återställt',
        description: `Nytt lösenord: ${data.student?.newPassword || 'Se kolumnen för lösenord'}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel vid återställning',
        description: error.message || 'Kunde inte återställa lösenordet.',
        variant: 'destructive',
      });
    },
  });

  const createStudentMutation = useMutation({
    mutationFn: async ({ classId, studentName }: { classId: string; studentName: string }) => {
      return apiRequest('POST', `/api/license/classes/${classId}/students`, { studentName });
    },
    onSuccess: (data) => {
      // Cache the new password for immediate display
      if (data.student?.clearPassword) {
        setStudentPasswords(prev => ({
          ...prev,
          [data.student.id]: data.student.clearPassword
        }));
        setShowPasswords(prev => ({
          ...prev,
          [data.student.id]: true
        }));
      }
      queryClient.invalidateQueries({ queryKey: ['/api/license/classes'] });
      setShowCreateForm(false);
      setNewStudentName('');
      setSelectedClassForCreation('');
      toast({
        title: 'Elev skapad',
        description: `${data.student?.studentName} har lagts till med användarnamn: ${data.student?.username}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel vid skapande av elev',
        description: error.message || 'Kunde inte skapa eleven.',
        variant: 'destructive',
      });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      return apiRequest('DELETE', `/api/license/students/${studentId}`);
    },
    onSuccess: (data, studentId) => {
      // Remove password from cache
      setStudentPasswords(prev => {
        const newPasswords = { ...prev };
        delete newPasswords[studentId];
        return newPasswords;
      });
      setShowPasswords(prev => {
        const newShow = { ...prev };
        delete newShow[studentId];
        return newShow;
      });
      queryClient.invalidateQueries({ queryKey: ['/api/license/classes'] });
      toast({
        title: 'Elev borttagen',
        description: 'Eleven har tagits bort från systemet.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel vid borttagning',
        description: error.message || 'Kunde inte ta bort eleven.',
        variant: 'destructive',
      });
    },
  });

  // Filter and prepare student data
  const allStudents: StudentData[] = classesData?.classes?.flatMap((cls: ClassData) => 
    cls.students?.map(student => ({
      ...student,
      className: cls.name,
      classId: cls.id
    })) || []
  ) || [];

  const filteredStudents = allStudents.filter(student => {
    const matchesClass = selectedClass === 'all' || student.classId === selectedClass;
    const matchesSearch = searchTerm === '' || 
      student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.className.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesClass && matchesSearch;
  });

  const exportStudentData = () => {
    const csvContent = [
      ['Elevnamn', 'Användarnamn', 'Klass', 'Senaste inloggning', 'Skapad'],
      ...filteredStudents.map(student => [
        student.studentName,
        student.username,
        student.className,
        student.lastLogin ? new Date(student.lastLogin).toLocaleString('sv-SE') : 'Aldrig',
        new Date(student.createdAt).toLocaleDateString('sv-SE'),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `elever_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printStudentCredentials = () => {
    const studentsWithPasswords = filteredStudents.filter(student => 
      studentPasswords[student.id]
    );
    
    if (studentsWithPasswords.length === 0) {
      toast({
        title: 'Inga lösenord att skriva ut',
        description: 'Visa lösenord för elever innan du skriver ut dem.',
        variant: 'destructive',
      });
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Elevkonton - ${new Date().toLocaleDateString('sv-SE')}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .page-break { page-break-after: always; }
            .student-card {
              border: 2px solid #333;
              margin: 20px 0;
              padding: 20px;
              border-radius: 8px;
              background: #f9f9f9;
              display: inline-block;
              width: calc(50% - 20px);
              margin-right: 20px;
              vertical-align: top;
            }
            .school-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .student-name { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            .credential-line { margin: 8px 0; font-size: 14px; }
            .credential-value { font-family: monospace; font-weight: bold; }
          }
          @media screen {
            body { padding: 40px; background: #f0f0f0; }
            .print-preview { background: white; max-width: 800px; margin: 0 auto; padding: 40px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
          }
        </style>
      </head>
      <body>
        <div class="print-preview">
          <div class="school-header">
            <h1>Elevkonton</h1>
            <p>Utskrivet: ${new Date().toLocaleDateString('sv-SE')} - ${classesData?.classes?.find(c => c.id === selectedClass)?.name || 'Alla klasser'}</p>
          </div>
          ${studentsWithPasswords.map(student => `
            <div class="student-card">
              <div class="student-name">${student.studentName}</div>
              <div class="credential-line">Användarnamn: <span class="credential-value">${student.username}</span></div>
              <div class="credential-line">Lösenord: <span class="credential-value">${studentPasswords[student.id]}</span></div>
              <div class="credential-line">Klass: <span class="credential-value">${student.className}</span></div>
              <div style="margin-top: 15px; font-size: 12px; color: #666;">
                Första inloggning kräver lösenordsändring
              </div>
            </div>
          `).join('')}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow?.document.write(printContent);
    printWindow?.document.close();
  };

  const handleCreateStudent = () => {
    if (!newStudentName.trim()) {
      toast({
        title: 'Elevnamn krävs',
        description: 'Ange elevens namn för att fortsätta.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!selectedClassForCreation) {
      toast({
        title: 'Klass krävs',
        description: 'Välj en klass för eleven.',
        variant: 'destructive',
      });
      return;
    }

    createStudentMutation.mutate({
      classId: selectedClassForCreation,
      studentName: newStudentName.trim()
    });
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const selectAllStudents = (select: boolean) => {
    if (select) {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const bulkPasswordResetMutation = useMutation({
    mutationFn: async (studentIds: string[]) => {
      const promises = studentIds.map(id => 
        apiRequest('POST', `/api/license/students/${id}/reset-password`)
      );
      return Promise.all(promises);
    },
    onSuccess: (results) => {
      // Cache all new passwords
      results.forEach((data, index) => {
        const studentId = Array.from(selectedStudents)[index];
        if (data.student?.newPassword) {
          setStudentPasswords(prev => ({
            ...prev,
            [studentId]: data.student.newPassword
          }));
          setShowPasswords(prev => ({
            ...prev,
            [studentId]: true
          }));
        }
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/license/classes'] });
      setSelectedStudents(new Set());
      setBulkAction('none');
      
      toast({
        title: 'Lösenord återställda',
        description: `${results.length} elever fick nya lösenord.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel vid bulk-återställning',
        description: error.message || 'Några lösenord kunde inte återställas.',
        variant: 'destructive',
      });
    },
  });

  const handleBulkAction = () => {
    if (selectedStudents.size === 0) {
      toast({
        title: 'Inga elever valda',
        description: 'Välj minst en elev för att utföra massaktioner.',
        variant: 'destructive',
      });
      return;
    }

    if (bulkAction === 'password-reset') {
      bulkPasswordResetMutation.mutate(Array.from(selectedStudents));
    }
  };

  const studentToolSettingsMutation = useMutation({
    mutationFn: async ({ studentId, settings }: { studentId: string; settings: any }) => {
      return apiRequest('PUT', `/api/license/students/${studentId}/tool-settings`, settings);
    },
    onSuccess: () => {
      setShowToolSettings(false);
      setSelectedStudentForSettings(null);
      toast({
        title: 'Inställningar sparade',
        description: 'Tillgänglighetsinställningar har uppdaterats.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel vid sparande',
        description: error.message || 'Kunde inte spara inställningarna.',
        variant: 'destructive',
      });
    },
  });

  if (isLoadingClasses) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Laddar elever...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2 text-blue-500" />
              Totalt elever
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900" data-testid="text-total-students-detail">
              {allStudents.length}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Fördelade över {classesData?.classes?.length || 0} klasser
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Activity className="h-4 w-4 mr-2 text-green-500" />
              Aktiva elever
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900" data-testid="text-active-students">
              {allStudents.filter(s => s.lastLogin).length}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Har loggat in minst en gång
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <RefreshCw className="h-4 w-4 mr-2 text-orange-500" />
              Behöver byta lösenord
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900" data-testid="text-password-reset-needed">
              {allStudents.filter(s => s.mustChangePassword).length}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Första inloggning
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                Mina elever
              </CardTitle>
              <CardDescription>
                Hantera elever, visa lösenord och återställ konton
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    data-testid="button-create-student"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Skapa ny elev
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Skapa ny elev</DialogTitle>
                    <DialogDescription>
                      Ange elevens namn och välj klass. Användarnamn och lösenord genereras automatiskt.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label htmlFor="student-name" className="text-sm font-medium">
                        Elevnamn
                      </label>
                      <Input
                        id="student-name"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        placeholder="Ange elevens fullständiga namn"
                        data-testid="input-new-student-name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="student-class" className="text-sm font-medium">
                        Klass
                      </label>
                      <select
                        id="student-class"
                        value={selectedClassForCreation}
                        onChange={(e) => setSelectedClassForCreation(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        data-testid="select-new-student-class"
                      >
                        <option value="">Välj klass...</option>
                        {classesData?.classes?.map((cls: ClassData) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewStudentName('');
                        setSelectedClassForCreation('');
                      }}
                      data-testid="button-cancel-create-student"
                    >
                      Avbryt
                    </Button>
                    <Button
                      onClick={handleCreateStudent}
                      disabled={createStudentMutation.isPending}
                      data-testid="button-confirm-create-student"
                    >
                      {createStudentMutation.isPending ? 'Skapar...' : 'Skapa elev'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {selectedStudents.size > 0 && (
                <>
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value as any)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="select-bulk-action"
                  >
                    <option value="none">Välj massfåtänd...</option>
                    <option value="password-reset">Lösenordsåterställning</option>
                    <option value="settings">Tillgänglighetsinställningar</option>
                  </select>
                  
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleBulkAction}
                    disabled={bulkAction === 'none' || bulkPasswordResetMutation.isPending}
                    data-testid="button-execute-bulk-action"
                  >
                    {bulkPasswordResetMutation.isPending ? 'Utför...' : `Utför (${selectedStudents.size})`}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedStudents(new Set());
                      setBulkAction('none');
                    }}
                    data-testid="button-clear-selection"
                  >
                    Avmarkera alla
                  </Button>
                </>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={printStudentCredentials}
                data-testid="button-print-credentials"
              >
                <Printer className="h-4 w-4 mr-2" />
                Skriv ut
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={exportStudentData}
                data-testid="button-export-students"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportera
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Sök elever, användarnamn eller klass..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-students"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="select-class-filter"
              >
                <option value="all">Alla klasser</option>
                {classesData?.classes?.map((cls: ClassData) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.students?.length || 0} elever)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Inga elever hittades</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Prova att ändra din sökning.' : 'Skapa din första klass för att lägga till elever.'}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                        onChange={(e) => selectAllStudents(e.target.checked)}
                        className="rounded border-gray-300 focus:ring-blue-500"
                        data-testid="checkbox-select-all-students"
                      />
                    </TableHead>
                    <TableHead>Elevnamn</TableHead>
                    <TableHead>Användarnamn</TableHead>
                    <TableHead>Lösenord</TableHead>
                    <TableHead>Klass</TableHead>
                    <TableHead>Senaste inloggning</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Åtgärder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow 
                      key={student.id} 
                      data-testid={`row-student-${student.username}`}
                      className={selectedStudents.has(student.id) ? 'bg-blue-50' : ''}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="rounded border-gray-300 focus:ring-blue-500"
                          data-testid={`checkbox-select-${student.username}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          {student.studentName}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center space-x-2">
                          <span>{student.username}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(student.username, 'Användarnamn')}
                            data-testid={`button-copy-username-${student.username}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm">
                            {showPasswords[student.id] ? 
                              (studentPasswords[student.id] || 'Laddar...') : 
                              '••••••••'
                            }
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePasswordVisibility(student.id)}
                            data-testid={`button-toggle-password-${student.username}`}
                          >
                            {showPasswords[student.id] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(
                              studentPasswords[student.id] || 'Ej tillgängligt', 
                              'Lösenord'
                            )}
                            disabled={!studentPasswords[student.id]}
                            data-testid={`button-copy-password-${student.username}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.className}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {student.lastLogin ? (
                          new Date(student.lastLogin).toLocaleString('sv-SE')
                        ) : (
                          <span className="text-gray-400">Aldrig</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.mustChangePassword && (
                          <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
                            Första inloggning
                          </Badge>
                        )}
                        {student.failedLoginAttempts > 0 && (
                          <Badge variant="destructive" className="ml-1">
                            {student.failedLoginAttempts} försök
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetPasswordMutation.mutate(student.id)}
                            disabled={resetPasswordMutation.isPending}
                            data-testid={`button-reset-password-${student.username}`}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Återställ
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedStudentForSettings(student.id);
                              setShowToolSettings(true);
                            }}
                            data-testid={`button-tool-settings-${student.username}`}
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`button-delete-student-${student.username}`}
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Ta bort elev</DialogTitle>
                                <DialogDescription>
                                  Är du säker på att du vill ta bort <strong>{student.studentName}</strong>?
                                  <br /><br />
                                  Denna åtgärd kan inte ångras och eleven kommer att förlora all progress.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex justify-end space-x-2 pt-4">
                                <DialogTrigger asChild>
                                  <Button variant="outline">
                                    Avbryt
                                  </Button>
                                </DialogTrigger>
                                <Button
                                  variant="destructive"
                                  onClick={() => deleteStudentMutation.mutate(student.id)}
                                  disabled={deleteStudentMutation.isPending}
                                  data-testid={`button-confirm-delete-${student.username}`}
                                >
                                  {deleteStudentMutation.isPending ? 'Tar bort...' : 'Ta bort elev'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredStudents.length > 0 && (
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>
                Visar {filteredStudents.length} av {allStudents.length} elever
              </span>
              <span>
                {selectedClass !== 'all' && (
                  <>Filtrerad på: {classesData?.classes?.find((c: ClassData) => c.id === selectedClass)?.name}</>
                )}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tool Settings Dialog */}
      <Dialog open={showToolSettings} onOpenChange={setShowToolSettings}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Tillgänglighetsinställningar</DialogTitle>
            <DialogDescription>
              Konfigurera verktyg och tillgänglighetsinställningar för eleven.
            </DialogDescription>
          </DialogHeader>
          
          {selectedStudentForSettings && (
            <div className="space-y-6 py-4">
              {(() => {
                const student = allStudents.find(s => s.id === selectedStudentForSettings);
                return student ? (
                  <>
                    <div className="bg-blue-50 p-3 rounded-lg border">
                      <div className="font-medium text-blue-900">{student.studentName}</div>
                      <div className="text-sm text-blue-700">@{student.username} • {student.className}</div>
                    </div>

                    <div className="grid gap-6">
                      {/* Support Tools */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Stödverktyg</h4>
                        
                        <div className="grid gap-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="text-to-speech">Text-till-tal</Label>
                              <div className="text-sm text-gray-500">Läs upp text högt</div>
                            </div>
                            <Switch id="text-to-speech" />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="speech-to-text">Tal-till-text</Label>
                              <div className="text-sm text-gray-500">Diktera istället för att skriva</div>
                            </div>
                            <Switch id="speech-to-text" />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="ai-assistant">AI-assistent</Label>
                              <div className="text-sm text-gray-500">Extra hjälp och vägledning</div>
                            </div>
                            <Switch id="ai-assistant" />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="dictionary">Ordbok</Label>
                              <div className="text-sm text-gray-500">Slå upp ord</div>
                            </div>
                            <Switch id="dictionary" defaultChecked />
                          </div>
                        </div>
                      </div>

                      {/* Visual Settings */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Visuella inställningar</h4>
                        
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="font-size">Textstorlek</Label>
                            <Select defaultValue="medium">
                              <SelectTrigger>
                                <SelectValue placeholder="Välj textstorlek" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="small">Liten</SelectItem>
                                <SelectItem value="medium">Normal</SelectItem>
                                <SelectItem value="large">Stor</SelectItem>
                                <SelectItem value="extra_large">Extra stor</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="font-family">Typsnitt</Label>
                            <Select defaultValue="default">
                              <SelectTrigger>
                                <SelectValue placeholder="Välj typsnitt" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">Standard</SelectItem>
                                <SelectItem value="dyslexia_friendly">Dyslexi-vänligt</SelectItem>
                                <SelectItem value="sans_serif">Sans Serif</SelectItem>
                                <SelectItem value="serif">Serif</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="high-contrast">Hög kontrast</Label>
                              <div className="text-sm text-gray-500">Förbättrad synlighet</div>
                            </div>
                            <Switch id="high-contrast" />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="reduced-animations">Reducerade animationer</Label>
                              <div className="text-sm text-gray-500">Mindre rörelse</div>
                            </div>
                            <Switch id="reduced-animations" />
                          </div>
                        </div>
                      </div>

                      {/* Learning Support */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Lärstöd</h4>
                        
                        <div className="grid gap-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="show-hints">Visa tips</Label>
                              <div className="text-sm text-gray-500">Hjälpande ledtrådar</div>
                            </div>
                            <Switch id="show-hints" defaultChecked />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="extended-time">Förlängd tid</Label>
                              <div className="text-sm text-gray-500">Extra tid på uppgifter</div>
                            </div>
                            <Switch id="extended-time" />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="immediate-correction">Direkt korrigering</Label>
                              <div className="text-sm text-gray-500">Visa fel omedelbart</div>
                            </div>
                            <Switch id="immediate-correction" defaultChecked />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowToolSettings(false)}
                      >
                        Avbryt
                      </Button>
                      <Button
                        onClick={() => {
                          // Here we would collect all the form data and submit
                          const mockSettings = {
                            textToSpeechEnabled: false,
                            speechToTextEnabled: false,
                            aiAssistantEnabled: false,
                            dictionaryLookupEnabled: true,
                            fontSize: 'medium',
                            fontFamily: 'default',
                            highContrastMode: false,
                            reducedAnimations: false,
                            showHints: true,
                            extendedTimeAllowed: false,
                            immediateCorrection: true
                          };
                          
                          studentToolSettingsMutation.mutate({
                            studentId: selectedStudentForSettings,
                            settings: mockSettings
                          });
                        }}
                        disabled={studentToolSettingsMutation.isPending}
                        data-testid="button-save-tool-settings"
                      >
                        {studentToolSettingsMutation.isPending ? 'Sparar...' : 'Spara inställningar'}
                      </Button>
                    </div>
                  </>
                ) : null;
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2 text-yellow-500" />
            Snabbåtgärder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4" asChild>
              <Link href="/teacher/classes">
                <div className="flex flex-col items-center space-y-2">
                  <Users className="h-6 w-6 text-blue-600" />
                  <span className="font-medium">Skapa ny klass</span>
                  <span className="text-xs text-gray-500">Lägg till fler elever</span>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4" onClick={exportStudentData}>
              <div className="flex flex-col items-center space-y-2">
                <Download className="h-6 w-6 text-green-600" />
                <span className="font-medium">Exportera data</span>
                <span className="text-xs text-gray-500">Ladda ner CSV-fil</span>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4" disabled>
              <div className="flex flex-col items-center space-y-2">
                <RefreshCw className="h-6 w-6 text-purple-600" />
                <span className="font-medium">Massåterställ lösenord</span>
                <span className="text-xs text-gray-500">Kommer snart</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TeacherDashboard() {
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading, teacherContext, school, hasSchoolAccess } = useAuth();
  const { toast } = useToast();
  // Temporarily disabled preview functionality
  // const { isPreviewMode, previewStudent, setPreviewMode, exitPreviewMode } = usePreview();
  const isPreviewMode = false;
  const previewStudent = null;

  // Fetch dashboard statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: ['/api/teacher/dashboard-stats'],
    enabled: isAuthenticated && teacherContext?.isTeacher && (
      isDevBypass || (!isCheckingLicense && (licenseStatus as any)?.hasLicense === true)
    ),
    initialData: {
      totalStudents: 0,
      totalClasses: 0,
      activeAssignments: 0,
      completedLessons: 0,
      averageProgress: 0,
      totalSchoolHours: 0,
    }
  });

  // Fetch recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['/api/teacher/recent-activity'],
    enabled: isAuthenticated && teacherContext?.isTeacher && (
      isDevBypass || (!isCheckingLicense && (licenseStatus as any)?.hasLicense === true)
    ),
    initialData: []
  });

  // Fetch teacher's classes and students for preview dropdown
  const { data: dashboardClassesData } = useQuery<ClassesResponse>({
    queryKey: ['/api/license/classes'],
    enabled: isAuthenticated && teacherContext?.isTeacher && (
      isDevBypass || (!isCheckingLicense && (licenseStatus as any)?.hasLicense === true)
    ),
    initialData: { classes: [] },
  });

  // Check authentication and redirect if needed
  useEffect(() => {
    // Skip redirect if dev bypass is active
    const isDevBypass = import.meta.env.DEV && localStorage.getItem('devBypass') === 'true';
    if (isDevBypass) {
      console.log('Dev bypass active in TeacherDashboard, skipping auth redirects');
      return;
    }

    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
    if (!isLoading && isAuthenticated && (!user || (user.role !== 'LARARE' && user.role !== 'ADMIN'))) {
      setLocation('/');
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  const handleLogout = async () => {
    try {
      const result = await apiRequest('POST', '/api/auth/logout');
      localStorage.removeItem('csrfToken');
      toast({
        title: 'Utloggad',
        description: 'Du har loggats ut från systemet',
      });
      // Use redirectPath from backend response, fallback to home page
      setLocation(result.redirectPath || '/');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Fel',
        description: 'Kunde inte logga ut',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laddar lärarpanel...</p>
        </div>
      </div>
    );
  }

  // License check loading state
  if (isCheckingLicense) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Kontrollerar licens...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // License requirement check - men bara om license status är explicit false
  // Visa "Licens krävs" bara om vi verkligen vet att licensen saknas (inte under loading)
  if (!isCheckingLicense && licenseStatus && (licenseStatus as any)?.hasLicense === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-800">Licens krävs</CardTitle>
            </div>
            <CardDescription>
              Du behöver en aktiv lärarlicens för att komma åt lärarpanelen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/license">
              <Button className="w-full">
                <GraduationCap className="h-4 w-4 mr-2" />
                Aktivera licens
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isDevBypass && (!user || !teacherContext?.isTeacher)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Åtkomst nekad</h2>
            <p className="text-gray-600 mb-4">Du behöver vara inloggad som lärare för att komma åt denna sida.</p>
            <Link href="/login">
              <Button>Logga in som lärare</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const navItems = [
    {
      id: 'overview' as DashboardSection,
      label: 'Översikt',
      icon: Home,
      description: 'Huvudöversikt och statistik'
    },
    {
      id: 'students' as DashboardSection,
      label: 'Mina elever',
      icon: Users,
      description: 'Hantera elever och lösenord'
    },
    {
      id: 'lessonbank' as DashboardSection,
      label: 'Lektionsbank',
      icon: Library,
      description: 'Bläddra, anpassa och tilldela lektioner till dina klasser'
    },
    {
      id: 'results' as DashboardSection,
      label: 'Resultat elever',
      icon: BarChart3,
      description: 'Analysera elevers framsteg'
    },
    {
      id: 'classroom' as DashboardSection,
      label: 'Klassrumsskärm',
      icon: Monitor,
      description: 'Klassrumskontroll och timer'
    },
    {
      id: 'feedback' as DashboardSection,
      label: 'Återkoppling',
      icon: MessageSquare,
      description: 'Ge feedback och granska elevarbeten'
    },
    {
      id: 'export' as DashboardSection,
      label: 'Dataexport',
      icon: Download,
      description: 'Exportera elevdata för föräldramöten och backup'
    }
  ];

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="text-welcome">
              Välkommen, {user.username}!
            </h1>
            <p className="text-blue-100 text-lg">
              Lärarpanel för {school?.name || 'din skola'}
            </p>
            {hasSchoolAccess && (
              <div className="mt-2 flex items-center text-blue-200">
                <School className="h-4 w-4 mr-2" />
                <span className="text-sm">Kopplad till {school?.name}</span>
                {teacherContext?.licenseId && (
                  <Badge variant="secondary" className="ml-3 bg-white/20 text-white border-white/30">
                    Aktiv licens
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-blue-100 text-sm">
              {new Date().toLocaleDateString('sv-SE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <div className="text-2xl font-mono text-white mt-1">
              {new Date().toLocaleTimeString('sv-SE', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>
      </div>


      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Users className="h-4 w-4 mr-2 text-blue-500" />
                Totalt elever
              </CardTitle>
              <HelpTooltip 
                content="Det totala antalet elever du har ansvar för, fördelade över alla dina klasser. Inkluderar både aktiva och inaktiva elever."
                testId="help-total-students"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900" data-testid="text-total-students">
              {stats?.totalStudents || 0}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Fördelade över {stats?.totalClasses || 0} klasser
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-green-500" />
                Aktiva uppgifter
              </CardTitle>
              <HelpTooltip 
                content="Antal lektioner och övningar som för närvarande är tilldelade till dina klasser och som eleverna kan arbeta med."
                testId="help-active-assignments"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900" data-testid="text-active-assignments">
              {stats?.activeAssignments || 0}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Pågående lektioner och övningar
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Award className="h-4 w-4 mr-2 text-purple-500" />
                Slutförda lektioner
              </CardTitle>
              <HelpTooltip 
                content="Antal lektioner som dina elever har slutfört framgångsrikt under den aktuella veckan. Visar aktivitetsnivån."
                testId="help-completed-lessons"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900" data-testid="text-completed-lessons">
              {stats?.completedLessons || 0}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Denna vecka
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-orange-500" />
                Genomsnitt framsteg
              </CardTitle>
              <HelpTooltip 
                content="Genomsnittlig framstegsnivå för alla dina elever baserat på slutförda uppgifter och prestationer. Hjälper dig identifiera klassens övergripande prestanda."
                testId="help-average-progress"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900" data-testid="text-average-progress">
              {stats?.averageProgress || 0}%
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Över alla elever
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-500" />
              Snabbåtgärder
            </CardTitle>
            <CardDescription>
              Vanliga aktiviteter för att komma igång snabbt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-between h-12"
              onClick={() => setActiveSection('students')}
              data-testid="button-quick-students"
            >
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-3 text-blue-600" />
                <span>Hantera elever</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-between h-12"
              onClick={() => setActiveSection('assignments')}
              data-testid="button-quick-assignments"
            >
              <div className="flex items-center">
                <BookOpen className="h-4 w-4 mr-3 text-green-600" />
                <span>Tilldela ny lektion</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-between h-12"
              onClick={() => setActiveSection('results')}
              data-testid="button-quick-results"
            >
              <div className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-3 text-purple-600" />
                <span>Se elevresultat</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-500" />
              Senaste aktivitet
            </CardTitle>
            <CardDescription>
              Vad som hänt nyligen i dina klasser
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity: any, index: number) => (
                  <div key={index} className="flex items-start space-x-3 text-sm">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-gray-900">{activity.description || 'Aktivitet'}</p>
                      <p className="text-gray-500 text-xs">{activity.time || 'Nyligen'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-3 text-blue-300" />
                <h4 className="text-sm font-medium text-gray-900 mb-2">Ingen aktivitet ännu 📊</h4>
                <p className="text-xs text-gray-600 mb-3">
                  Aktiviteter kommer att visas här när dina elever:
                </p>
                <div className="bg-blue-50 p-3 rounded-lg text-left max-w-sm mx-auto">
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Loggar in och börjar lektioner</li>
                    <li>• Slutför uppgifter och övningar</li>
                    <li>• Tjänar mynt och nivåer upp</li>
                    <li>• Interagerar med materialet</li>
                  </ul>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Tilldela lektioner till dina klasser för att komma igång!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'students':
        return <StudentManagementSection />;
      case 'lessonbank':
        return <TeacherLessonBank />;
      case 'results':
        return <StudentResultsAnalytics />;
      case 'classroom':
        // Get teacher's first class for classroom control
        const teacherClasses = dashboardClassesData?.classes || [];
        const primaryClass = teacherClasses[0];
        
        if (!primaryClass) {
          return (
            <Card>
              <CardHeader>
                <CardTitle>Klassrumsskärm</CardTitle>
                <CardDescription>Klassrumskontroller med timer och skärmlås</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-12">
                <Monitor className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen klass tillgänglig</h3>
                <p className="text-gray-600 mb-6">Du behöver ha minst en klass för att använda klassrumskontrollerna.</p>
                <Link href="/teacher/classes">
                  <Button>Skapa klass</Button>
                </Link>
              </CardContent>
            </Card>
          );
        }
        
        return (
          <Card>
            <CardHeader>
              <CardTitle>Klassrumsskärm</CardTitle>
              <CardDescription>Klassrumskontroller med timer och skärmlås</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <Monitor className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Klassrumsskärm för {primaryClass.name}</h3>
              <p className="text-gray-600 mb-6">Denna funktion är tillfälligt inaktiverad under utveckling.</p>
              <Button variant="outline" disabled>
                Kommer snart
              </Button>
            </CardContent>
          </Card>
        );
      case 'feedback':
        return <StudentWorkReview />;
      case 'export':
        return <ExportDashboard teacherId={user?.id} />;
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Top Navigation Bar */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <GraduationCap className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Lärarpanel</span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="text-sm text-gray-600">
                <span className="font-medium">{user.username}</span>
                {school && (
                  <span className="ml-2 text-gray-400">• {school.name}</span>
                )}
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              <div className="text-right text-sm">
                <div className="text-gray-900 font-medium">{user.username}</div>
                <div className="text-gray-500">Lärare</div>
              </div>
              <HelpMenu
                availableGuides={commonGuides.teacher}
                userRole="teacher"
                userId={user?.id}
                testId="teacher-help-menu"
              />
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-red-200 hover:bg-red-50 hover:border-red-300 text-red-700 hover:text-red-800 dark:border-red-800 dark:hover:bg-red-900/20 dark:text-red-400 dark:hover:text-red-300"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
                Logga ut
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:flex w-64 bg-white shadow-sm border-r min-h-[calc(100vh-64px)]">
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-l-blue-500'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  data-testid={`nav-${item.id}`}
                >
                  <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  <div className="text-left">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {/* Mobile Navigation */}
          <div className="lg:hidden mb-6">
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                    data-testid={`nav-mobile-${item.id}`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section Content */}
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
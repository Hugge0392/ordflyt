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
  Download
} from 'lucide-react';
import { Link } from 'wouter';

// Dashboard section types
type DashboardSection = 'overview' | 'students' | 'assignments' | 'results' | 'classroom';

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch teacher's classes and students
  const { data: classesData, isLoading: isLoadingClasses } = useQuery<ClassesResponse>({
    queryKey: ['/api/license/classes'],
    initialData: { classes: [] },
  });

  // Fetch detailed student data with passwords (when needed)
  const { data: studentsWithPasswords, isLoading: isLoadingPasswords } = useQuery<StudentsWithPasswordsResponse>({
    queryKey: ['/api/license/students-with-passwords', selectedClass],
    enabled: Object.keys(showPasswords).some(key => showPasswords[key]),
    initialData: { students: [] },
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

  const togglePasswordVisibility = (studentId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const resetPasswordMutation = useMutation({
    mutationFn: async (studentId: string) => {
      return apiRequest(`/api/license/students/${studentId}/reset-password`, 'POST');
    },
    onSuccess: (data, studentId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/license/classes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/license/students-with-passwords'] });
      toast({
        title: 'Lösenord återställt',
        description: `Nytt lösenord genererat för eleven.`,
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
                    <TableRow key={student.id} data-testid={`row-student-${student.username}`}>
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
                            {showPasswords[student.id] ? '********' : '••••••••'}
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
                            onClick={() => copyToClipboard('********', 'Lösenord')}
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

  // Fetch dashboard statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: ['/api/teacher/dashboard-stats'],
    enabled: isAuthenticated && teacherContext?.isTeacher,
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
    enabled: isAuthenticated && teacherContext?.isTeacher,
    initialData: []
  });

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
    if (!isLoading && isAuthenticated && (!user || (user.role !== 'LARARE' && user.role !== 'ADMIN'))) {
      setLocation('/');
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': localStorage.getItem('csrfToken') || '',
        },
      });

      if (response.ok) {
        localStorage.removeItem('csrfToken');
        toast({
          title: 'Utloggad',
          description: 'Du har loggats ut från systemet',
        });
        setLocation('/login');
      }
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

  if (!user || !teacherContext?.isTeacher) {
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
      id: 'assignments' as DashboardSection,
      label: 'Tilldela lektioner',
      icon: BookOpen,
      description: 'Tilldela uppgifter och lektioner'
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
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2 text-blue-500" />
              Totalt elever
            </CardTitle>
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
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <BookOpen className="h-4 w-4 mr-2 text-green-500" />
              Aktiva uppgifter
            </CardTitle>
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
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Award className="h-4 w-4 mr-2 text-purple-500" />
              Slutförda lektioner
            </CardTitle>
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
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-orange-500" />
              Genomsnitt framsteg
            </CardTitle>
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
                <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Ingen aktivitet att visa ännu</p>
                <p className="text-xs mt-1">Aktiviteter visas här när elever börjar använda systemet</p>
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
      case 'assignments':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Tilldela lektioner</CardTitle>
              <CardDescription>Tilldela uppgifter och lektioner till dina elever</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Lektionstilldelning</h3>
              <p className="text-gray-600 mb-6">Här kommer du kunna tilldela lektioner och övningar till dina klasser och enskilda elever.</p>
              <Button variant="outline" disabled>
                Kommer snart
              </Button>
            </CardContent>
          </Card>
        );
      case 'results':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Resultat elever</CardTitle>
              <CardDescription>Analysera elevers framsteg och resultat</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Resultatanalys</h3>
              <p className="text-gray-600 mb-6">Här kommer du kunna se detaljerade resultat, framsteg och statistik för dina elever.</p>
              <Button variant="outline" disabled>
                Kommer snart
              </Button>
            </CardContent>
          </Card>
        );
      case 'classroom':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Klassrumsskärm</CardTitle>
              <CardDescription>Klassrumskontroller med timer och skärmlås</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <Monitor className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Klassrumskontroll</h3>
              <p className="text-gray-600 mb-6">Här kommer du kunna styra timers, låsa skärmar och kontrollera klassrumsaktiviteter.</p>
              <Button variant="outline" disabled>
                Kommer snart
              </Button>
            </CardContent>
          </Card>
        );
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
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
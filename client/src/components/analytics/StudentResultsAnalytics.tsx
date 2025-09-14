import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Target, 
  Award, 
  AlertTriangle,
  Download,
  Search,
  Filter,
  Eye,
  ChevronRight,
  BookOpen,
  Calendar
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface TeacherAnalytics {
  overview: {
    totalStudents: number;
    totalClasses: number;
    activeAssignments: number;
    completedAssignments: number;
    averageCompletionRate: number;
    averageScore: number;
    totalTimeSpent: number;
  };
  recentActivity: {
    date: string;
    completions: number;
    averageScore: number;
  }[];
  classBreakdown: {
    classId: string;
    className: string;
    studentCount: number;
    averageScore: number;
    completionRate: number;
    strugglingStudents: number;
  }[];
}

interface ClassAnalytics {
  classInfo: {
    id: string;
    name: string;
    studentCount: number;
    averageScore: number;
    averageCompletionRate: number;
    totalTimeSpent: number;
  };
  studentPerformance: {
    studentId: string;
    studentName: string;
    averageScore: number;
    completionRate: number;
    timeSpent: number;
    assignmentsCompleted: number;
    lastActivity: string | null;
    needsHelp: boolean;
  }[];
  assignmentBreakdown: {
    assignmentId: string;
    title: string;
    assignmentType: string;
    completionRate: number;
    averageScore: number;
    strugglingStudentCount: number;
  }[];
  progressTrends: {
    date: string;
    completions: number;
    averageScore: number;
    timeSpent: number;
  }[];
}

interface StrugglingStudent {
  studentId: string;
  studentName: string;
  className: string;
  concerns: {
    lowCompletionRate: boolean;
    lowAverageScore: boolean;
    longTimeSpent: boolean;
    frequentHelp: boolean;
    recentInactivity: boolean;
  };
  metrics: {
    completionRate: number;
    averageScore: number;
    averageTimeSpent: number;
    helpRequests: number;
    daysSinceLastActivity: number;
  };
  recommendations: string[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const formatTimeSpent = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}t ${mins}m`;
  }
  return `${mins}m`;
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

const getCompletionRateColor = (rate: number): string => {
  if (rate >= 80) return 'bg-green-100 text-green-800';
  if (rate >= 60) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

function OverviewTab({ analytics }: { analytics: TeacherAnalytics }) {
  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Totalt antal elever</p>
                <p className="text-3xl font-bold text-blue-600" data-testid="text-total-students">
                  {analytics.overview.totalStudents}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Genomsnittlig poäng</p>
                <p className={`text-3xl font-bold ${getScoreColor(analytics.overview.averageScore)}`} data-testid="text-average-score">
                  {analytics.overview.averageScore}%
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Slutförandegrad</p>
                <p className={`text-3xl font-bold ${getScoreColor(analytics.overview.averageCompletionRate)}`} data-testid="text-completion-rate">
                  {analytics.overview.averageCompletionRate}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total tid</p>
                <p className="text-3xl font-bold text-orange-600" data-testid="text-total-time">
                  {formatTimeSpent(analytics.overview.totalTimeSpent)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Aktivitet senaste veckan</CardTitle>
            <CardDescription>Slutförda uppgifter och genomsnittlig poäng</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.recentActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('sv-SE')}
                  formatter={(value, name) => [
                    name === 'completions' ? `${value} slutförda` : `${value}%`,
                    name === 'completions' ? 'Slutförda uppgifter' : 'Genomsnittlig poäng'
                  ]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="completions" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Slutförda uppgifter"
                />
                <Line 
                  type="monotone" 
                  dataKey="averageScore" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Genomsnittlig poäng"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Class Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Klassernas prestationer</CardTitle>
            <CardDescription>Slutförandegrad per klass</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.classBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="className" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value}%`,
                    name === 'completionRate' ? 'Slutförandegrad' : 'Genomsnittlig poäng'
                  ]}
                />
                <Legend />
                <Bar dataKey="completionRate" fill="#8884d8" name="Slutförandegrad" />
                <Bar dataKey="averageScore" fill="#82ca9d" name="Genomsnittlig poäng" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Class Overview Table */}
      <Card>
        <CardHeader>
          <CardTitle>Klassöversikt</CardTitle>
          <CardDescription>Detaljerad översikt över alla dina klasser</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Klass</th>
                  <th className="text-left py-3 px-4 font-medium">Elever</th>
                  <th className="text-left py-3 px-4 font-medium">Genomsnitt</th>
                  <th className="text-left py-3 px-4 font-medium">Slutförandegrad</th>
                  <th className="text-left py-3 px-4 font-medium">Behöver hjälp</th>
                  <th className="text-left py-3 px-4 font-medium">Åtgärd</th>
                </tr>
              </thead>
              <tbody>
                {analytics.classBreakdown.map((classData) => (
                  <tr key={classData.classId} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium" data-testid={`text-class-${classData.classId}`}>
                      {classData.className}
                    </td>
                    <td className="py-3 px-4">{classData.studentCount}</td>
                    <td className={`py-3 px-4 font-medium ${getScoreColor(classData.averageScore)}`}>
                      {classData.averageScore}%
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getCompletionRateColor(classData.completionRate)}>
                        {classData.completionRate}%
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {classData.strugglingStudents > 0 ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {classData.strugglingStudents}
                        </Badge>
                      ) : (
                        <Badge variant="outline">0</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex items-center gap-1"
                        data-testid={`button-view-class-${classData.classId}`}
                      >
                        <Eye className="h-4 w-4" />
                        Visa detaljer
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ClassDetailsTab() {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: classAnalytics, isLoading } = useQuery<ClassAnalytics>({
    queryKey: ['/api/analytics/class', selectedClass],
    enabled: !!selectedClass,
  });

  const filteredStudents = classAnalytics?.studentPerformance.filter(student =>
    student.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* Class Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Välj klass för detaljanalys</CardTitle>
          <CardDescription>Få detaljerad information om enskilda elever och deras framsteg</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-64" data-testid="select-class">
                <SelectValue placeholder="Välj en klass" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="class1">Klass 7A</SelectItem>
                <SelectItem value="class2">Klass 7B</SelectItem>
                <SelectItem value="class3">Klass 8A</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Sök elev..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-student"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClass && classAnalytics && (
        <>
          {/* Class Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{classAnalytics.classInfo.name} - Översikt</CardTitle>
              <CardDescription>Sammanfattning av klassens prestationer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{classAnalytics.classInfo.studentCount}</p>
                  <p className="text-sm text-gray-600">Elever</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${getScoreColor(classAnalytics.classInfo.averageScore)}`}>
                    {classAnalytics.classInfo.averageScore}%
                  </p>
                  <p className="text-sm text-gray-600">Genomsnittlig poäng</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${getScoreColor(classAnalytics.classInfo.averageCompletionRate)}`}>
                    {classAnalytics.classInfo.averageCompletionRate}%
                  </p>
                  <p className="text-sm text-gray-600">Slutförandegrad</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {formatTimeSpent(classAnalytics.classInfo.totalTimeSpent)}
                  </p>
                  <p className="text-sm text-gray-600">Total tid</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Elevernas prestationer</CardTitle>
              <CardDescription>Detaljerad översikt över varje elevs framsteg</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Elev</th>
                      <th className="text-left py-3 px-4 font-medium">Genomsnitt</th>
                      <th className="text-left py-3 px-4 font-medium">Slutförd</th>
                      <th className="text-left py-3 px-4 font-medium">Tid</th>
                      <th className="text-left py-3 px-4 font-medium">Senaste aktivitet</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Åtgärd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.studentId} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium" data-testid={`text-student-${student.studentId}`}>
                          {student.studentName}
                        </td>
                        <td className={`py-3 px-4 font-medium ${getScoreColor(student.averageScore)}`}>
                          {student.averageScore}%
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getCompletionRateColor(student.completionRate)}>
                            {student.completionRate}%
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{formatTimeSpent(student.timeSpent)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {student.lastActivity ? 
                            new Date(student.lastActivity).toLocaleDateString('sv-SE') : 
                            'Aldrig'
                          }
                        </td>
                        <td className="py-3 px-4">
                          {student.needsHelp ? (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Behöver hjälp
                            </Badge>
                          ) : (
                            <Badge variant="outline">OK</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-view-student-${student.studentId}`}
                          >
                            Visa detaljer
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StrugglingStudentsTab() {
  const { data: strugglingStudents, isLoading } = useQuery<StrugglingStudent[]>({
    queryKey: ['/api/analytics/struggling-students'],
  });

  if (isLoading) {
    return <div className="text-center py-8">Laddar elever som behöver hjälp...</div>;
  }

  if (!strugglingStudents || strugglingStudents.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Award className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Alla elever klarar sig bra!</h3>
          <p className="text-gray-600">Inga elever behöver extra uppmärksamhet just nu.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Elever som behöver extra stöd
          </CardTitle>
          <CardDescription>
            Elever som visar tecken på att behöva ytterligare hjälp eller uppmärksamhet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {strugglingStudents.map((student) => (
              <Card key={student.studentId} className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-lg">{student.studentName}</h4>
                      <p className="text-sm text-gray-600">{student.className}</p>
                    </div>
                    <Button variant="outline" size="sm" data-testid={`button-help-student-${student.studentId}`}>
                      Skapa åtgärdsplan
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{student.metrics.completionRate}%</p>
                      <p className="text-xs text-gray-600">Slutförandegrad</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{student.metrics.averageScore}%</p>
                      <p className="text-xs text-gray-600">Genomsnitt</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{formatTimeSpent(student.metrics.averageTimeSpent)}</p>
                      <p className="text-xs text-gray-600">Genomsnittlig tid</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{student.metrics.daysSinceLastActivity}</p>
                      <p className="text-xs text-gray-600">Dagar sedan aktivitet</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Identifierade problem:</p>
                    <div className="flex flex-wrap gap-2">
                      {student.concerns.lowCompletionRate && (
                        <Badge variant="destructive">Låg slutförandegrad</Badge>
                      )}
                      {student.concerns.lowAverageScore && (
                        <Badge variant="destructive">Låg genomsnittlig poäng</Badge>
                      )}
                      {student.concerns.longTimeSpent && (
                        <Badge variant="secondary">Tar lång tid</Badge>
                      )}
                      {student.concerns.frequentHelp && (
                        <Badge variant="secondary">Behöver ofta hjälp</Badge>
                      )}
                      {student.concerns.recentInactivity && (
                        <Badge variant="destructive">Inaktiv</Badge>
                      )}
                    </div>
                  </div>

                  {student.recommendations.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Rekommenderade åtgärder:</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {student.recommendations.map((recommendation, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-500 mt-1">•</span>
                            {recommendation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StudentResultsAnalytics() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: teacherAnalytics, isLoading, error } = useQuery<TeacherAnalytics>({
    queryKey: ['/api/analytics/teacher'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Laddar analyser...</h3>
          <p className="text-gray-600">Hämtar data om dina elevers framsteg.</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Kunde inte ladda analyser</h3>
          <p className="text-gray-600">Ett fel uppstod när analyser skulle hämtas. Försök igen senare.</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Försök igen
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!teacherAnalytics) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen data tillgänglig</h3>
          <p className="text-gray-600">Det finns ännu ingen elevdata att analysera. Elever kommer visas här när de börjar använda systemet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                Resultatanalys
              </CardTitle>
              <CardDescription>
                Analysera dina elevers framsteg, identifiera förbättringsområden och följa prestationer över tid
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" data-testid="button-export-data">
                <Download className="h-4 w-4 mr-2" />
                Exportera data
              </Button>
              <Button variant="outline" size="sm" data-testid="button-filter-data">
                <Filter className="h-4 w-4 mr-2" />
                Filtrera
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" data-testid="tab-overview">
            Översikt
          </TabsTrigger>
          <TabsTrigger value="classes" data-testid="tab-classes">
            Klassdetaljer
          </TabsTrigger>
          <TabsTrigger value="struggling" data-testid="tab-struggling">
            Behöver hjälp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab analytics={teacherAnalytics} />
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <ClassDetailsTab />
        </TabsContent>

        <TabsContent value="struggling" className="space-y-6">
          <StrugglingStudentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
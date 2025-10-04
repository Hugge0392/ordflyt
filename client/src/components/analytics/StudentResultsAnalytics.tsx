import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  BookOpen,
  Users,
  ArrowLeft,
  CheckCircle,
  Clock,
  Calendar,
  MessageSquare,
  TrendingUp,
  BarChart3,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

// Interface för lektioner som läraren har publicerat
interface PublishedLesson {
  id: string;
  title: string;
  assignmentType: string;
  publishedAt: string;
  classId: string;
  className: string;
  totalStudents: number;
  completedCount: number;
  pendingCount: number;
}

// Interface för elevens status i en lektion
interface StudentLessonStatus {
  studentId: string;
  studentName: string;
  classId: string;
  completed: boolean;
  score: number | null;
  submittedAt: string | null;
  correctAnswers: number;
  totalQuestions: number;
}

// Interface för elevens fullständiga uppgift med svar
interface StudentAssignmentDetail {
  studentId: string;
  studentName: string;
  assignmentId: string;
  assignmentTitle: string;
  completed: boolean;
  score: number | null;
  submittedAt: string | null;
  answers: {
    questionId: string;
    questionText: string;
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
  teacherFeedback?: string;
}

// Tab för "Mina lektioner"
function MyLessonsTab() {
  const [selectedLesson, setSelectedLesson] = useState<PublishedLesson | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentLessonStatus | null>(null);

  const { data: publishedLessons = [], isLoading } = useQuery<PublishedLesson[]>({
    queryKey: ['/api/teacher/published-lessons'],
  });

  const { data: lessonStudents = [], isLoading: isLoadingStudents } = useQuery<StudentLessonStatus[]>({
    queryKey: ['/api/teacher/lesson-students', selectedLesson?.id],
    enabled: !!selectedLesson,
  });

  const { data: studentAssignment, isLoading: isLoadingAssignment } = useQuery<StudentAssignmentDetail>({
    queryKey: ['/api/teacher/student-assignment', selectedLesson?.id, selectedStudent?.studentId],
    enabled: !!selectedLesson && !!selectedStudent,
  });

  // Tillbaka från studentvy
  const handleBackFromStudent = () => {
    setSelectedStudent(null);
  };

  // Tillbaka från lektionsvy
  const handleBackFromLesson = () => {
    setSelectedLesson(null);
    setSelectedStudent(null);
  };

  // Visa lektionslista
  if (!selectedLesson) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Mina publicerade lektioner
            </CardTitle>
            <CardDescription>
              Översikt över alla lektioner du har skickat ut till dina klasser
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Laddar lektioner...</div>
            ) : publishedLessons.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Inga publicerade lektioner</h3>
                <p className="text-gray-600">Du har inte publicerat några lektioner än.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {publishedLessons.map((lesson) => (
                  <Card
                    key={lesson.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                    onClick={() => setSelectedLesson(lesson)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {lesson.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {lesson.className}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(lesson.publishedAt).toLocaleDateString('sv-SE')}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {lesson.completedCount} klara
                            </Badge>
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              <Clock className="h-3 w-3 mr-1" />
                              {lesson.pendingCount} saknas
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="h-6 w-6 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Visa studentlista för vald lektion
  if (selectedLesson && !selectedStudent) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackFromLesson}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tillbaka till lektioner
            </Button>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              {selectedLesson.title}
            </CardTitle>
            <CardDescription>
              {selectedLesson.className} • Publicerad {new Date(selectedLesson.publishedAt).toLocaleDateString('sv-SE')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStudents ? (
              <div className="text-center py-8 text-gray-500">Laddar elever...</div>
            ) : (
              <div className="space-y-3">
                {lessonStudents.map((student) => (
                  <div
                    key={student.studentId}
                    className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                      student.completed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            student.completed ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                        <div>
                          <p className={`font-medium ${
                            student.completed ? 'text-green-900' : 'text-red-900'
                          }`}>
                            {student.studentName}
                          </p>
                          {student.completed && student.score !== null && (
                            <p className="text-sm text-gray-600">
                              Resultat: {student.correctAnswers}/{student.totalQuestions} rätt ({student.score}%)
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {student.completed ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Klar
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Ej klar
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm">
                          Resultat & feedback
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Visa elevens uppgift och feedback
  if (selectedStudent && selectedLesson) {
    return (
      <StudentAssignmentView
        studentAssignment={studentAssignment}
        isLoading={isLoadingAssignment}
        onBack={handleBackFromStudent}
        lessonTitle={selectedLesson.title}
      />
    );
  }

  return null;
}

// Komponent för att visa elevens uppgift och ge feedback
function StudentAssignmentView({
  studentAssignment,
  isLoading,
  onBack,
  lessonTitle
}: {
  studentAssignment?: StudentAssignmentDetail;
  isLoading: boolean;
  onBack: () => void;
  lessonTitle: string;
}) {
  const [feedback, setFeedback] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const feedbackMutation = useMutation({
    mutationFn: async (feedbackText: string) => {
      return apiRequest('POST', `/api/teacher/assignment-feedback`, {
        assignmentId: studentAssignment?.assignmentId,
        studentId: studentAssignment?.studentId,
        feedback: feedbackText
      });
    },
    onSuccess: () => {
      toast({
        title: 'Feedback skickad',
        description: 'Din feedback har skickats till eleven.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teacher/student-assignment'] });
      setFeedback('');
    },
    onError: () => {
      toast({
        title: 'Fel',
        description: 'Kunde inte skicka feedback. Försök igen.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar elevens uppgift...</p>
        </CardContent>
      </Card>
    );
  }

  if (!studentAssignment) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Kunde inte ladda elevens uppgift.</p>
          <Button onClick={onBack} className="mt-4">
            Gå tillbaka
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka till elevlista
          </Button>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            {studentAssignment.studentName} - Resultat & feedback
          </CardTitle>
          <CardDescription>
            {lessonTitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resultatöversikt */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {studentAssignment.answers.filter(a => a.isCorrect).length}/{studentAssignment.answers.length}
                </p>
                <p className="text-sm text-gray-600">Antal rätt</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {studentAssignment.score !== null ? `${studentAssignment.score}%` : '-'}
                </p>
                <p className="text-sm text-gray-600">Resultat</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  {studentAssignment.submittedAt
                    ? new Date(studentAssignment.submittedAt).toLocaleString('sv-SE')
                    : 'Ej inlämnad'
                  }
                </p>
                <p className="text-sm text-gray-600">Inlämnad</p>
              </div>
            </div>
          </div>

          {/* Elevens svar */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Elevens svar</h3>
            <div className="space-y-4">
              {studentAssignment.answers.map((answer, index) => (
                <div
                  key={answer.questionId}
                  className={`p-4 rounded-lg border ${
                    answer.isCorrect
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-medium text-sm ${
                        answer.isCorrect ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-2">
                        {answer.questionText}
                      </p>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">Elevens svar:</span>{' '}
                          <span className={answer.isCorrect ? 'text-green-700' : 'text-red-700'}>
                            {answer.studentAnswer}
                          </span>
                        </p>
                        {!answer.isCorrect && (
                          <p className="text-sm">
                            <span className="font-medium">Rätt svar:</span>{' '}
                            <span className="text-green-700">{answer.correctAnswer}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    {answer.isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback sektion */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">Ge feedback till eleven</h3>
            {studentAssignment.teacherFeedback && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-blue-900 mb-1">Tidigare feedback:</p>
                <p className="text-sm text-blue-800">{studentAssignment.teacherFeedback}</p>
              </div>
            )}
            <Textarea
              placeholder="Skriv din feedback här... Detta skickas till elevens sida."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[120px] mb-4"
            />
            <Button
              onClick={() => feedbackMutation.mutate(feedback)}
              disabled={!feedback.trim() || feedbackMutation.isPending}
            >
              {feedbackMutation.isPending ? 'Skickar...' : 'Skicka feedback till eleven'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Tab för "Utveckling" (tom för nu)
function DevelopmentTab() {
  const [activeSubTab, setActiveSubTab] = useState<'class' | 'student'>('class');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Utveckling
          </CardTitle>
          <CardDescription>
            Statistik och diagram över klassens och elevernas utveckling över tid
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as 'class' | 'student')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="class">
                Klassutveckling
              </TabsTrigger>
              <TabsTrigger value="student">
                Elevutveckling
              </TabsTrigger>
            </TabsList>

            <TabsContent value="class">
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Klassutveckling kommer snart
                </h3>
                <p className="text-gray-600">
                  Här kommer du kunna se diagram och statistik över hela klassens utveckling
                </p>
              </div>
            </TabsContent>

            <TabsContent value="student">
              <div className="text-center py-12">
                <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Elevutveckling kommer snart
                </h3>
                <p className="text-gray-600">
                  Här kommer du kunna se diagram och statistik över enskilda elevers utveckling
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Huvudkomponent
export default function StudentResultsAnalytics() {
  const [activeTab, setActiveTab] = useState<'lessons' | 'development'>('lessons');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Resultat & Analys
          </CardTitle>
          <CardDescription>
            Följ upp dina elevers prestationer och utveckling
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'lessons' | 'development')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lessons">
            <BookOpen className="h-4 w-4 mr-2" />
            Mina lektioner
          </TabsTrigger>
          <TabsTrigger value="development">
            <TrendingUp className="h-4 w-4 mr-2" />
            Utveckling
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lessons" className="mt-6">
          <MyLessonsTab />
        </TabsContent>

        <TabsContent value="development" className="mt-6">
          <DevelopmentTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

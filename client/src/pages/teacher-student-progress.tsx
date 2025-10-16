import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  Trophy,
  User,
  Calendar
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface StudentProgress {
  studentId: string;
  studentName: string;
  assignmentId: string;
  assignmentTitle: string;
  completedAt: Date;
  score: number;
  timeSpent: number;
  needsHelp: boolean;
}

export default function TeacherStudentProgress() {
  const { user } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Fetch student progress data
  const { data: studentProgress = [], isLoading } = useQuery<StudentProgress[]>({
    queryKey: ['/api/teacher/student-progress', selectedClassId, selectedStudentId],
    enabled: !!user && user.role === 'teacher',
  });

  const formatTimeSpent = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return '🌟';
    if (score >= 75) return '⭐';
    return '🔄';
  };

  if (!user || user.role !== 'teacher') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Åtkomst nekad</h2>
            <p className="text-gray-600">Du behöver vara inloggad som lärare för att se elevframsteg.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">📊</div>
          <div className="text-lg text-gray-600">Laddar elevframsteg...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Elevframsteg</h1>
          <p className="text-gray-600">Se hur dina elever presterar på sina uppdrag</p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <User className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">
                {new Set(studentProgress.map(p => p.studentId)).size}
              </div>
              <div className="text-sm text-gray-600">Aktiva elever</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">
                {studentProgress.length}
              </div>
              <div className="text-sm text-gray-600">Slutförda uppdrag</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(studentProgress.reduce((acc, p) => acc + p.score, 0) / studentProgress.length || 0)}%
              </div>
              <div className="text-sm text-gray-600">Genomsnittlig poäng</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">
                {studentProgress.filter(p => p.needsHelp).length}
              </div>
              <div className="text-sm text-gray-600">Behöver hjälp</div>
            </CardContent>
          </Card>
        </div>

        {/* Progress List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Senaste aktivitet
            </CardTitle>
          </CardHeader>
          <CardContent>
            {studentProgress.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Ingen aktivitet än</h3>
                <p className="text-gray-600">När dina elever slutför uppdrag kommer aktiviteten att synas här.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {studentProgress
                  .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                  .map((progress, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        progress.needsHelp
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-semibold text-gray-900">
                              {progress.studentName}
                            </div>
                            {progress.needsHelp && (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Behöver hjälp
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            <strong>{progress.assignmentTitle}</strong>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(progress.completedAt).toLocaleDateString('sv-SE')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeSpent(progress.timeSpent)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getScoreColor(progress.score)}>
                            <Trophy className="w-3 h-3 mr-1" />
                            {progress.score}%
                          </Badge>
                          <div className="text-2xl">
                            {getScoreIcon(progress.score)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
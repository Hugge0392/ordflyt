import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  User, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Clock, 
  Target, 
  BookOpen,
  Brain,
  Zap,
  Star,
  AlertTriangle,
  CheckCircle,
  Eye,
  Download,
  Share,
  MessageSquare,
  Calendar,
  BarChart3,
  LineChart,
  Activity,
  Globe
} from 'lucide-react';
import { StudentRadarChart, ProgressCurve, PerformanceHeatmap, TreeMap } from './charts';
import type { StudentAnalytics, AssignmentAnalytics } from '@shared/schema';

interface StudentAnalyticsDashboardProps {
  studentId: string;
  classId?: string;
  teacherId: string;
  onBackToClass?: () => void;
  onAssignmentDrillDown?: (assignmentId: string) => void;
  onRecommendationAction?: (action: string, studentId: string) => void;
}

interface LearningMilestone {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'achievement' | 'challenge' | 'improvement' | 'milestone';
  value?: number;
  assignmentId?: string;
  metadata?: Record<string, any>;
}

interface LearningVelocityPoint {
  week: string;
  velocity: number; // Assignments per week
  difficultyProgression: number;
  averageScore: number;
  timeEfficiency: number;
}

interface EngagementPattern {
  hour: number;
  dayOfWeek: string;
  engagementScore: number;
  averageSessionLength: number;
  completionRate: number;
}

const StudentAnalyticsDashboard = ({
  studentId,
  classId,
  teacherId,
  onBackToClass,
  onAssignmentDrillDown,
  onRecommendationAction
}: StudentAnalyticsDashboardProps) => {
  const [selectedView, setSelectedView] = useState<'overview' | 'progress' | 'skills' | 'engagement' | 'interventions'>('overview');
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '180d' | 'all'>('90d');
  const [comparisonMode, setComparisonMode] = useState<'self' | 'class' | 'target'>('class');
  const [showPredictions, setShowPredictions] = useState(true);
  const [focusArea, setFocusArea] = useState<string | null>(null);

  // Fetch comprehensive student analytics
  const { data: studentAnalytics, isLoading } = useQuery<StudentAnalytics>({
    queryKey: ['/api/analytics/student', studentId]
  });

  // Fetch assignment-specific analytics for detailed views
  const { data: assignmentAnalytics } = useQuery({
    queryKey: ['/api/analytics/assignments/student', studentId, timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/assignments/student/${studentId}?timeRange=${timeRange}`);
      return response.json();
    }
  });

  // Generate learning milestones from student data
  const learningMilestones: LearningMilestone[] = useMemo(() => {
    if (!studentAnalytics?.performanceHistory) return [];
    
    const milestones: LearningMilestone[] = [];
    const history = studentAnalytics.performanceHistory;
    
    // Add achievement milestones
    history.forEach((entry, index) => {
      if (entry.score >= 90 && index > 0 && history[index - 1].score < 90) {
        milestones.push({
          id: `achievement-${index}`,
          title: 'Excellent Performance Achieved',
          description: `First time scoring 90%+ in ${entry.assignmentType}`,
          date: entry.date,
          type: 'achievement',
          value: entry.score,
          metadata: { assignmentTitle: entry.assignmentTitle }
        });
      }
      
      if (entry.score >= 80 && index > 0 && history[index - 1].score < 70) {
        milestones.push({
          id: `improvement-${index}`,
          title: 'Significant Improvement',
          description: `Score improved by ${entry.score - history[index - 1].score}% in ${entry.assignmentType}`,
          date: entry.date,
          type: 'improvement',
          value: entry.score - history[index - 1].score,
          metadata: { assignmentTitle: entry.assignmentTitle }
        });
      }
    });

    // Add challenge milestones for difficult assignments
    history.forEach((entry, index) => {
      if (entry.timeSpent > 60 && entry.score < 60) {
        milestones.push({
          id: `challenge-${index}`,
          title: 'Learning Challenge',
          description: `Struggled with ${entry.assignmentTitle} - needs additional support`,
          date: entry.date,
          type: 'challenge',
          value: entry.score,
          metadata: { timeSpent: entry.timeSpent }
        });
      }
    });

    return milestones.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [studentAnalytics]);

  // Calculate learning velocity over time
  const learningVelocity: LearningVelocityPoint[] = useMemo(() => {
    if (!studentAnalytics?.performanceHistory) return [];
    
    const history = studentAnalytics.performanceHistory;
    const weeklyData = new Map<string, any[]>();
    
    // Group by week
    history.forEach(entry => {
      const week = new Date(entry.date).toISOString().substring(0, 10); // Simplified weekly grouping
      if (!weeklyData.has(week)) {
        weeklyData.set(week, []);
      }
      weeklyData.get(week)!.push(entry);
    });

    return Array.from(weeklyData.entries()).map(([week, entries]) => {
      const averageScore = entries.reduce((sum, e) => sum + e.score, 0) / entries.length;
      const averageTime = entries.reduce((sum, e) => sum + e.timeSpent, 0) / entries.length;
      
      return {
        week,
        velocity: entries.length,
        difficultyProgression: averageScore, // Simplified
        averageScore: Math.round(averageScore),
        timeEfficiency: averageTime > 0 ? Math.round(averageScore / averageTime * 100) : 0
      };
    }).slice(-12); // Last 12 weeks
  }, [studentAnalytics]);

  // Analyze engagement patterns
  const engagementPatterns: EngagementPattern[] = useMemo(() => {
    // Simulated engagement pattern data - in real implementation would come from activity logs
    const patterns: EngagementPattern[] = [];
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    for (let hour = 6; hour <= 22; hour++) {
      daysOfWeek.forEach(day => {
        patterns.push({
          hour,
          dayOfWeek: day,
          engagementScore: Math.round(50 + Math.random() * 50),
          averageSessionLength: Math.round(15 + Math.random() * 45),
          completionRate: Math.round(60 + Math.random() * 40)
        });
      });
    }
    
    return patterns;
  }, []);

  // Prepare radar chart data for skills analysis
  const skillsRadarData = useMemo(() => {
    if (!studentAnalytics?.weakAreas) return [];
    
    return studentAnalytics.weakAreas.map(area => ({
      subject: area.assignmentType,
      score: area.averageScore,
      maxScore: 100,
      studentName: studentAnalytics.studentInfo.name,
      className: studentAnalytics.studentInfo.className
    }));
  }, [studentAnalytics]);

  // Prepare progress curve data
  const progressCurveData = useMemo(() => {
    if (!studentAnalytics?.performanceHistory) return [];
    
    let cumulativeScore = 0;
    
    return studentAnalytics.performanceHistory.map((entry, index) => {
      cumulativeScore = ((cumulativeScore * index) + entry.score) / (index + 1);
      
      return {
        date: entry.date,
        score: entry.score,
        cumulativeScore: Math.round(cumulativeScore),
        timeSpent: entry.timeSpent,
        assignmentTitle: entry.assignmentTitle,
        assignmentType: entry.assignmentType,
        difficulty: entry.score < 70 ? 'hard' : entry.score < 85 ? 'medium' : 'easy',
        milestone: entry.score >= 90 || (index > 0 && entry.score - studentAnalytics.performanceHistory[index - 1].score >= 15)
      } as const;
    });
  }, [studentAnalytics]);

  // Calculate key performance indicators
  const keyMetrics = useMemo(() => {
    if (!studentAnalytics) return null;
    
    const recentTrend = progressCurveData.length >= 2 
      ? progressCurveData[progressCurveData.length - 1].score - progressCurveData[progressCurveData.length - 2].score
      : 0;

    const consistencyScore = studentAnalytics.weakAreas?.length > 0
      ? Math.round(100 - (studentAnalytics.weakAreas.filter(area => area.needsAttention).length / studentAnalytics.weakAreas.length * 100))
      : 100;

    const improvementRate = progressCurveData.length >= 4
      ? Math.round((progressCurveData[progressCurveData.length - 1].score - progressCurveData[0].score) / progressCurveData.length)
      : 0;

    return {
      currentScore: studentAnalytics.studentInfo.overallScore,
      completionRate: studentAnalytics.studentInfo.completionRate,
      totalTimeSpent: Math.round(studentAnalytics.studentInfo.totalTimeSpent / 60), // Convert to hours
      assignmentsCompleted: studentAnalytics.studentInfo.assignmentsCompleted,
      recentTrend,
      consistencyScore,
      improvementRate,
      strengthAreas: studentAnalytics.strengthsAndChallenges.strengths.length,
      challengeAreas: studentAnalytics.strengthsAndChallenges.challenges.length
    };
  }, [studentAnalytics, progressCurveData]);

  // Generate personalized recommendations
  const recommendations = useMemo(() => {
    if (!studentAnalytics) return [];
    
    const recs = [];
    
    // Performance-based recommendations
    if (keyMetrics?.currentScore && keyMetrics.currentScore < 70) {
      recs.push({
        type: 'urgent',
        title: 'Immediate Intervention Needed',
        description: 'Student performance is below threshold. Schedule one-on-one support session.',
        action: 'schedule_intervention',
        priority: 'high'
      });
    }
    
    if (keyMetrics?.recentTrend && keyMetrics.recentTrend < -10) {
      recs.push({
        type: 'warning',
        title: 'Declining Performance Trend',
        description: 'Recent scores show downward trend. Review recent assignments and provide additional practice.',
        action: 'review_assignments',
        priority: 'medium'
      });
    }
    
    // Strength-based recommendations
    if (studentAnalytics.strengthsAndChallenges.strengths.length > 0) {
      recs.push({
        type: 'opportunity',
        title: 'Leverage Strengths',
        description: `Student excels in ${studentAnalytics.strengthsAndChallenges.strengths[0]}. Consider advanced challenges.`,
        action: 'advanced_material',
        priority: 'low'
      });
    }
    
    // Challenge-based recommendations
    studentAnalytics.strengthsAndChallenges.challenges.forEach(challenge => {
      recs.push({
        type: 'support',
        title: 'Targeted Support Needed',
        description: challenge,
        action: 'targeted_practice',
        priority: 'medium'
      });
    });
    
    return recs;
  }, [studentAnalytics, keyMetrics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading student analytics...</span>
      </div>
    );
  }

  if (!studentAnalytics) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <User className="h-12 w-12 mx-auto mb-2" />
          <p>No analytics data available for this student.</p>
        </div>
        {onBackToClass && (
          <Button onClick={onBackToClass} variant="outline">
            Back to Class Overview
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="student-analytics-dashboard">
      {/* Student Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBackToClass && (
            <Button variant="ghost" onClick={onBackToClass}>
              ← Back to Class
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <User className="h-6 w-6 text-blue-600" />
              {studentAnalytics.studentInfo.name}
            </h2>
            <p className="text-gray-600">
              {studentAnalytics.studentInfo.className} • Individual Performance Analytics
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(value: '30d' | '90d' | '180d' | 'all') => setTimeRange(value)}>
            <SelectTrigger className="w-32" data-testid="select-time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="180d">Last 6 months</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={comparisonMode} onValueChange={(value: 'self' | 'class' | 'target') => setComparisonMode(value)}>
            <SelectTrigger className="w-32" data-testid="select-comparison">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="self">Self comparison</SelectItem>
              <SelectItem value="class">vs Class average</SelectItem>
              <SelectItem value="target">vs Target goals</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" data-testid="button-share">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          
          <Button variant="outline" size="sm" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      {keyMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Score</p>
                  <p className="text-2xl font-bold text-blue-600" data-testid="metric-current-score">
                    {keyMetrics.currentScore}%
                  </p>
                </div>
                <Target className="h-5 w-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="metric-completion">
                    {keyMetrics.completionRate}%
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Study Time</p>
                  <p className="text-2xl font-bold text-purple-600" data-testid="metric-study-time">
                    {keyMetrics.totalTimeSpent}h
                  </p>
                </div>
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Assignments</p>
                  <p className="text-2xl font-bold text-orange-600" data-testid="metric-assignments">
                    {keyMetrics.assignmentsCompleted}
                  </p>
                </div>
                <BookOpen className="h-5 w-5 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-indigo-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Trend</p>
                  <div className="flex items-center gap-1">
                    <p className={`text-2xl font-bold ${keyMetrics.recentTrend >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="metric-trend">
                      {keyMetrics.recentTrend > 0 ? '+' : ''}{keyMetrics.recentTrend}%
                    </p>
                    {keyMetrics.recentTrend >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-cyan-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Consistency</p>
                  <p className="text-2xl font-bold text-cyan-600" data-testid="metric-consistency">
                    {keyMetrics.consistencyScore}%
                  </p>
                </div>
                <Activity className="h-5 w-5 text-cyan-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-pink-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Improvement</p>
                  <p className="text-2xl font-bold text-pink-600" data-testid="metric-improvement">
                    {keyMetrics.improvementRate > 0 ? '+' : ''}{keyMetrics.improvementRate}%
                  </p>
                </div>
                <Brain className="h-5 w-5 text-pink-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Strengths</p>
                  <p className="text-2xl font-bold text-emerald-600" data-testid="metric-strengths">
                    {keyMetrics.strengthAreas}
                  </p>
                </div>
                <Star className="h-5 w-5 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Challenges</p>
                  <p className="text-2xl font-bold text-red-600" data-testid="metric-challenges">
                    {keyMetrics.challengeAreas}
                  </p>
                </div>
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics Tabs */}
      <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as 'overview' | 'progress' | 'skills' | 'engagement' | 'interventions')}>
        <TabsList className="grid w-full grid-cols-5" data-testid="student-tabs">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">Progress Timeline</TabsTrigger>
          <TabsTrigger value="skills">Skills Analysis</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="interventions">Recommendations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Skills Radar Chart */}
            <StudentRadarChart
              data={skillsRadarData}
              title="Skills Performance Overview"
              description="Comprehensive view of student strengths and areas for improvement"
              showComparison={comparisonMode === 'class'}
              onDrillDown={(subject) => setFocusArea(subject)}
            />

            {/* Learning Milestones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Recent Milestones & Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {learningMilestones.slice(0, 8).map((milestone) => (
                    <div key={milestone.id} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className={`p-2 rounded-full ${
                        milestone.type === 'achievement' ? 'bg-green-100 text-green-600' :
                        milestone.type === 'improvement' ? 'bg-blue-100 text-blue-600' :
                        milestone.type === 'milestone' ? 'bg-purple-100 text-purple-600' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                        {milestone.type === 'achievement' ? <Award className="h-4 w-4" /> :
                         milestone.type === 'improvement' ? <TrendingUp className="h-4 w-4" /> :
                         milestone.type === 'milestone' ? <Star className="h-4 w-4" /> :
                         <AlertTriangle className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                          <span className="text-xs text-gray-500">
                            {new Date(milestone.date).toLocaleDateString('sv-SE')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                        {milestone.value && (
                          <Badge variant="outline" className="mt-2">
                            {milestone.type === 'improvement' ? `+${milestone.value}%` : `${milestone.value}%`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Learning Trajectory Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Learning Trajectory Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {studentAnalytics.studentInfo.overallScore}%
                  </div>
                  <div className="text-sm text-gray-600 mb-4">Overall Performance</div>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                    studentAnalytics.studentInfo.overallScore >= 90 ? 'bg-green-100 text-green-800' :
                    studentAnalytics.studentInfo.overallScore >= 80 ? 'bg-blue-100 text-blue-800' :
                    studentAnalytics.studentInfo.overallScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {studentAnalytics.studentInfo.overallScore >= 90 ? 'Excellent' :
                     studentAnalytics.studentInfo.overallScore >= 80 ? 'Good' :
                     studentAnalytics.studentInfo.overallScore >= 70 ? 'Satisfactory' :
                     'Needs Support'}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {learningVelocity.length > 0 ? learningVelocity[learningVelocity.length - 1].velocity : 0}
                  </div>
                  <div className="text-sm text-gray-600 mb-4">Assignments/Week</div>
                  <div className="text-sm text-gray-500">Learning Velocity</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {keyMetrics?.consistencyScore}%
                  </div>
                  <div className="text-sm text-gray-600 mb-4">Consistency Score</div>
                  <div className="text-sm text-gray-500">Performance Stability</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Timeline Tab */}
        <TabsContent value="progress" className="space-y-6">
          <ProgressCurve
            data={progressCurveData}
            title="Individual Learning Progress"
            description="Detailed timeline of academic progress with milestone tracking"
            studentName={studentAnalytics.studentInfo.name}
            showTargets={true}
            showMilestones={true}
            onDataPointClick={(dataPoint) => {
              console.log('Drill down to assignment:', dataPoint);
              // Handle drill-down to specific assignment
            }}
            height={500}
          />

          {/* Learning Velocity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Velocity Analysis</CardTitle>
              <p className="text-sm text-gray-600">
                Track how quickly the student progresses through assignments and difficulty levels
              </p>
            </CardHeader>
            <CardContent>
              <div style={{ height: 300 }}>
                {/* This would be implemented with a custom chart showing learning velocity */}
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Zap className="h-12 w-12 mx-auto mb-2" />
                    <p>Learning velocity chart coming soon</p>
                    <p className="text-sm">Shows assignment completion rate and difficulty progression</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Analysis Tab */}
        <TabsContent value="skills" className="space-y-6">
          {/* Detailed Skills Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Strength Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {studentAnalytics.strengthsAndChallenges.strengths.map((strength, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <Star className="h-5 w-5 text-green-600" />
                      <span className="text-green-800 font-medium">{strength}</span>
                    </div>
                  ))}
                  {studentAnalytics.strengthsAndChallenges.strengths.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Brain className="h-8 w-8 mx-auto mb-2" />
                      <p>Continue working to develop strength areas</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Areas for Improvement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {studentAnalytics.strengthsAndChallenges.challenges.map((challenge, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <span className="text-orange-800 font-medium">{challenge}</span>
                    </div>
                  ))}
                  {studentAnalytics.strengthsAndChallenges.challenges.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>All skill areas performing well!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Skills Progress Matrix */}
          <Card>
            <CardHeader>
              <CardTitle>Skills Development Matrix</CardTitle>
              <p className="text-sm text-gray-600">
                Track progress across different skill areas over time
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {studentAnalytics.weakAreas.map((area, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{area.assignmentType}</h4>
                      <Badge className={area.needsAttention ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                        {area.averageScore}%
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className={`h-2 rounded-full ${area.needsAttention ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${area.averageScore}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Completion: {area.completionRate}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          {/* Engagement Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Learning Activity Patterns
              </CardTitle>
              <p className="text-sm text-gray-600">
                When is this student most engaged and productive?
              </p>
            </CardHeader>
            <CardContent>
              <div style={{ height: 400 }}>
                {/* This would show an engagement heatmap by hour and day of week */}
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Globe className="h-12 w-12 mx-auto mb-2" />
                    <p>Engagement pattern heatmap</p>
                    <p className="text-sm">Shows optimal learning times and activity patterns</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average session length</span>
                    <span className="font-medium">
                      {Math.round(studentAnalytics.studentInfo.totalTimeSpent / 
                        Math.max(studentAnalytics.studentInfo.assignmentsCompleted, 1))}min
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Most productive time</span>
                    <span className="font-medium">Mornings (9-11 AM)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Preferred session length</span>
                    <span className="font-medium">30-45 minutes</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Break frequency</span>
                    <span className="font-medium">Every 25 minutes</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="font-medium text-blue-800 mb-1">Peak Performance</div>
                    <div className="text-sm text-blue-700">
                      Shows highest engagement on Tuesday mornings and Thursday afternoons
                    </div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="font-medium text-yellow-800 mb-1">Attention Pattern</div>
                    <div className="text-sm text-yellow-700">
                      Concentration tends to decrease after 30-minute sessions
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="font-medium text-green-800 mb-1">Optimal Schedule</div>
                    <div className="text-sm text-green-700">
                      Recommend 25-minute focused sessions with 5-minute breaks
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recommendations/Interventions Tab */}
        <TabsContent value="interventions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Personalized Recommendations
              </CardTitle>
              <p className="text-sm text-gray-600">
                Data-driven insights and actionable recommendations for this student
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.map((rec, index) => (
                  <div key={index} className={`p-4 rounded-lg border-l-4 ${
                    rec.priority === 'high' ? 'border-l-red-500 bg-red-50' :
                    rec.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
                    'border-l-green-500 bg-green-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className={`font-medium ${
                            rec.priority === 'high' ? 'text-red-800' :
                            rec.priority === 'medium' ? 'text-yellow-800' :
                            'text-green-800'
                          }`}>
                            {rec.title}
                          </h4>
                          <Badge variant={rec.priority === 'high' ? 'destructive' : 
                                         rec.priority === 'medium' ? 'secondary' : 'default'}>
                            {rec.priority} priority
                          </Badge>
                        </div>
                        <p className={`text-sm ${
                          rec.priority === 'high' ? 'text-red-700' :
                          rec.priority === 'medium' ? 'text-yellow-700' :
                          'text-green-700'
                        }`}>
                          {rec.description}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onRecommendationAction?.(rec.action, studentId)}
                        data-testid={`action-${rec.action}`}
                      >
                        Take Action
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action History */}
          <Card>
            <CardHeader>
              <CardTitle>Intervention History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-2" />
                <p>Previous interventions and their outcomes will be tracked here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentAnalyticsDashboard;
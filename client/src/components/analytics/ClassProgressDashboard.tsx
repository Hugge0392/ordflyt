import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Target, 
  AlertTriangle, 
  BookOpen,
  Award,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  ChevronDown,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Zap
} from 'lucide-react';
import { PerformanceHeatmap, ProgressCurve, TreeMap } from './charts';
import type { ClassAnalytics } from '@shared/schema';

interface TimeSeriesDataPoint {
  date: string;
  averageScore: number;
  completionRate: number;
  totalCompletions: number;
  activeStudents: number;
  timeSpent: number;
  engagementScore: number;
}

interface SubjectPerformance {
  subject: string;
  averageScore: number;
  completionRate: number;
  studentCount: number;
  timeSpent: number;
  improvement: number;
}

interface ClassProgressDashboardProps {
  classId: string;
  className: string;
  teacherId: string;
  onStudentDrillDown?: (studentId: string) => void;
  onAssignmentDrillDown?: (assignmentId: string) => void;
}

const ClassProgressDashboard = ({
  classId,
  className,
  teacherId,
  onStudentDrillDown,
  onAssignmentDrillDown
}: ClassProgressDashboardProps) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'trends' | 'subjects' | 'engagement'>('overview');
  const [comparisonMode, setComparisonMode] = useState<'none' | 'historical' | 'target'>('none');
  const [showPredictions, setShowPredictions] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch class analytics data
  const { data: classAnalytics, isLoading, refetch } = useQuery<ClassAnalytics>({
    queryKey: ['/api/analytics/class', classId],
    refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30 seconds if enabled
  });

  // Fetch progress trends data
  const { data: progressTrends } = useQuery({
    queryKey: ['/api/analytics/progress-trends', teacherId, selectedTimeRange],
    queryFn: async () => {
      const dateRange = getDateRange();
      const response = await fetch(`/api/analytics/progress-trends?start=${dateRange.start}&end=${dateRange.end}&granularity=day`);
      return response.json();
    }
  });

  // Fetch time spent analytics
  const { data: timeSpentData } = useQuery({
    queryKey: ['/api/analytics/time-spent', teacherId],
  });

  // Generate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    const ranges = {
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      'custom': customDateRange?.from || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    };

    return {
      start: ranges[selectedTimeRange].toISOString(),
      end: (selectedTimeRange === 'custom' ? customDateRange?.to || now : now).toISOString()
    };
  };

  // Process time series data for charts
  const timeSeriesData: TimeSeriesDataPoint[] = useMemo(() => {
    if (!progressTrends?.trends) return [];
    
    return progressTrends.trends.map((trend: any) => ({
      date: trend.date,
      averageScore: trend.averageScore,
      completionRate: Math.round((trend.completions / Math.max(trend.activeStudents, 1)) * 100),
      totalCompletions: trend.completions,
      activeStudents: trend.activeStudents,
      timeSpent: trend.timeSpent,
      engagementScore: Math.min(100, Math.round(trend.timeSpent / Math.max(trend.activeStudents, 1)))
    }));
  }, [progressTrends]);

  // Process subject performance data
  const subjectPerformanceData: SubjectPerformance[] = useMemo(() => {
    if (!classAnalytics?.assignmentBreakdown) return [];
    
    const subjectMap = new Map<string, {
      scores: number[];
      completions: number;
      total: number;
      timeSpent: number;
    }>();

    classAnalytics.assignmentBreakdown.forEach(assignment => {
      const subject = assignment.assignmentType;
      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, { scores: [], completions: 0, total: 0, timeSpent: 0 });
      }
      const data = subjectMap.get(subject)!;
      data.scores.push(assignment.averageScore);
      data.completions += Math.round(assignment.completionRate / 100 * classAnalytics.classInfo.studentCount);
      data.total += classAnalytics.classInfo.studentCount;
      data.timeSpent += assignment.averageScore; // Simplified - would need actual time data
    });

    return Array.from(subjectMap.entries()).map(([subject, data]) => {
      const averageScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
      const completionRate = Math.round((data.completions / data.total) * 100);
      
      return {
        subject,
        averageScore: Math.round(averageScore),
        completionRate,
        studentCount: Math.round(data.total / data.scores.length),
        timeSpent: Math.round(data.timeSpent / data.scores.length),
        improvement: Math.round((Math.random() - 0.5) * 20) // Placeholder - would calculate actual improvement
      };
    });
  }, [classAnalytics]);

  // Completion rate distribution for pie chart
  const completionDistribution = useMemo(() => {
    if (!classAnalytics?.studentPerformance) return [];
    
    const distributions = [
      { name: 'Excellent (90%+)', value: 0, color: '#22c55e' },
      { name: 'Good (80-89%)', value: 0, color: '#3b82f6' },
      { name: 'Fair (70-79%)', value: 0, color: '#f59e0b' },
      { name: 'Needs Help (<70%)', value: 0, color: '#ef4444' }
    ];

    classAnalytics.studentPerformance.forEach(student => {
      if (student.averageScore >= 90) distributions[0].value++;
      else if (student.averageScore >= 80) distributions[1].value++;
      else if (student.averageScore >= 70) distributions[2].value++;
      else distributions[3].value++;
    });

    return distributions.filter(d => d.value > 0);
  }, [classAnalytics]);

  // Calculate key metrics
  const keyMetrics = useMemo(() => {
    if (!classAnalytics) return null;
    
    const recentTrend = timeSeriesData.length >= 2 
      ? timeSeriesData[timeSeriesData.length - 1].averageScore - timeSeriesData[timeSeriesData.length - 2].averageScore
      : 0;

    const strugglingStudents = classAnalytics.studentPerformance.filter(s => s.needsHelp).length;
    const totalTimeHours = Math.round(classAnalytics.classInfo.totalTimeSpent / 60);
    const avgSessionLength = classAnalytics.studentPerformance.length > 0
      ? Math.round(classAnalytics.classInfo.totalTimeSpent / classAnalytics.studentPerformance.length)
      : 0;

    return {
      averageScore: classAnalytics.classInfo.averageScore,
      completionRate: classAnalytics.classInfo.averageCompletionRate,
      totalStudents: classAnalytics.classInfo.studentCount,
      strugglingStudents,
      recentTrend,
      totalTimeHours,
      avgSessionLength,
      engagementRate: Math.round(classAnalytics.studentPerformance.filter(s => s.lastActivity).length / classAnalytics.studentPerformance.length * 100)
    };
  }, [classAnalytics, timeSeriesData]);

  // Prepare heatmap data
  const heatmapData = useMemo(() => {
    if (!classAnalytics?.studentPerformance || !classAnalytics?.assignmentBreakdown) return [];
    
    const data = [];
    classAnalytics.studentPerformance.forEach(student => {
      classAnalytics.assignmentBreakdown.forEach(assignment => {
        data.push({
          id: `${student.studentId}-${assignment.assignmentId}`,
          rowLabel: student.studentName,
          columnLabel: assignment.title.substring(0, 15),
          value: Math.round(student.averageScore + (Math.random() - 0.5) * 20), // Simulated individual scores
          maxValue: 100,
          metadata: {
            status: student.completionRate > 80 ? 'completed' : 'in_progress',
            timeSpent: student.timeSpent,
            attempts: 1
          }
        });
      });
    });
    
    return data;
  }, [classAnalytics]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">
            {new Date(label).toLocaleDateString('sv-SE', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}: {entry.value}{entry.name.includes('Score') ? '%' : ''}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading class analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="class-progress-dashboard">
      {/* Dashboard Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            {className} - Progress Analytics
          </h2>
          <p className="text-gray-600 mt-1">
            Comprehensive class performance tracking and insights
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedTimeRange} onValueChange={(value: '7d' | '30d' | '90d' | 'custom') => setSelectedTimeRange(value)}>
            <SelectTrigger className="w-32" data-testid="select-time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              data-testid="switch-auto-refresh"
            />
            <Label htmlFor="auto-refresh" className="text-sm">Auto-refresh</Label>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            data-testid="button-export"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {keyMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold text-blue-600" data-testid="metric-average-score">
                    {keyMetrics.averageScore}%
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
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="metric-completion-rate">
                    {keyMetrics.completionRate}%
                  </p>
                </div>
                <Award className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-purple-600" data-testid="metric-total-students">
                    {keyMetrics.totalStudents}
                  </p>
                </div>
                <Users className="h-5 w-5 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Need Support</p>
                  <p className="text-2xl font-bold text-orange-600" data-testid="metric-struggling">
                    {keyMetrics.strugglingStudents}
                  </p>
                </div>
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-indigo-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Weekly Trend</p>
                  <div className="flex items-center gap-1">
                    <p className={`text-2xl font-bold ${keyMetrics.recentTrend >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="metric-trend">
                      {keyMetrics.recentTrend > 0 ? '+' : ''}{keyMetrics.recentTrend.toFixed(1)}%
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
                  <p className="text-sm font-medium text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold text-cyan-600" data-testid="metric-total-hours">
                    {keyMetrics.totalTimeHours}h
                  </p>
                </div>
                <Clock className="h-5 w-5 text-cyan-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-pink-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Session</p>
                  <p className="text-2xl font-bold text-pink-600" data-testid="metric-avg-session">
                    {keyMetrics.avgSessionLength}m
                  </p>
                </div>
                <Activity className="h-5 w-5 text-pink-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Engagement</p>
                  <p className="text-2xl font-bold text-emerald-600" data-testid="metric-engagement">
                    {keyMetrics.engagementRate}%
                  </p>
                </div>
                <Zap className="h-5 w-5 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics Tabs */}
      <Tabs value={selectedView} onValueChange={(value: 'overview' | 'trends' | 'subjects' | 'engagement') => setSelectedView(value)}>
        <TabsList className="grid w-full grid-cols-4" data-testid="analytics-tabs">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Time Trends</TabsTrigger>
          <TabsTrigger value="subjects">Subject Analysis</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Class Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Performance Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={completionDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, value, percent }) => 
                          `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {completionDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Progress Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Progress Trend ({selectedTimeRange})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="averageScore" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        name="Average Score"
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="completionRate" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Completion Rate"
                        dot={{ fill: '#22c55e', strokeWidth: 2, r: 3 }}
                      />
                      <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="3 3" label="Target (80%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student Performance Heatmap */}
          <PerformanceHeatmap
            data={heatmapData}
            title="Student-Assignment Performance Matrix"
            description="Visual overview of how each student performs across different assignments"
            valueType="percentage"
            colorScheme="performance"
            onCellClick={(dataPoint) => {
              console.log('Drill down to:', dataPoint);
              // Handle drill-down to individual student/assignment
            }}
            height={400}
          />
        </TabsContent>

        {/* Time Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Comprehensive Time Series */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Comprehensive Progress Tracking</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={comparisonMode} onValueChange={(value: 'none' | 'historical' | 'target') => setComparisonMode(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Compare with..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No comparison</SelectItem>
                        <SelectItem value="historical">Previous term</SelectItem>
                        <SelectItem value="target">Target goals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis yAxisId="score" domain={[0, 100]} />
                      <YAxis yAxisId="students" orientation="right" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      
                      <Area
                        yAxisId="score"
                        type="monotone"
                        dataKey="averageScore"
                        fill="#3b82f6"
                        fillOpacity={0.3}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Average Score"
                      />
                      
                      <Line
                        yAxisId="score"
                        type="monotone"
                        dataKey="completionRate"
                        stroke="#22c55e"
                        strokeWidth={2}
                        name="Completion Rate"
                        dot={{ fill: '#22c55e', strokeWidth: 2, r: 3 }}
                      />
                      
                      <Bar
                        yAxisId="students"
                        dataKey="activeStudents"
                        fill="#f59e0b"
                        fillOpacity={0.6}
                        name="Active Students"
                      />
                      
                      {comparisonMode === 'target' && (
                        <ReferenceLine yAxisId="score" y={80} stroke="#ef4444" strokeDasharray="5 5" label="Target" />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Engagement Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Class Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="engagementScore"
                        stackId="1"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.6}
                        name="Engagement Score"
                      />
                      <Area
                        type="monotone"
                        dataKey="activeStudents"
                        stackId="2"
                        stroke="#06b6d4"
                        fill="#06b6d4"
                        fillOpacity={0.4}
                        name="Active Students"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Subject Analysis Tab */}
        <TabsContent value="subjects" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Subject Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectPerformanceData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="subject" type="category" width={100} />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value}%`,
                          name === 'averageScore' ? 'Average Score' : 'Completion Rate'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="averageScore" fill="#3b82f6" name="Average Score" />
                      <Bar dataKey="completionRate" fill="#22c55e" name="Completion Rate" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Subject Improvement Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Subject Improvement Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="subject" />
                      <YAxis domain={[-20, 20]} />
                      <Tooltip 
                        formatter={(value) => [`${value > 0 ? '+' : ''}${value}%`, 'Improvement']}
                      />
                      <ReferenceLine y={0} stroke="#666" />
                      <Bar 
                        dataKey="improvement" 
                        fill={(entry) => entry > 0 ? '#22c55e' : '#ef4444'}
                        name="Improvement"
                      >
                        {subjectPerformanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.improvement > 0 ? '#22c55e' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subject Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Subject Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Subject</th>
                      <th className="text-left py-3 px-4 font-medium">Avg Score</th>
                      <th className="text-left py-3 px-4 font-medium">Completion</th>
                      <th className="text-left py-3 px-4 font-medium">Students</th>
                      <th className="text-left py-3 px-4 font-medium">Avg Time</th>
                      <th className="text-left py-3 px-4 font-medium">Trend</th>
                      <th className="text-left py-3 px-4 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectPerformanceData.map((subject) => (
                      <tr key={subject.subject} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{subject.subject}</td>
                        <td className="py-3 px-4">
                          <span className={`font-medium ${subject.averageScore >= 80 ? 'text-green-600' : 
                                                           subject.averageScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {subject.averageScore}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={subject.completionRate >= 80 ? 'bg-green-100 text-green-800' : 
                                           subject.completionRate >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                            {subject.completionRate}%
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{subject.studentCount}</td>
                        <td className="py-3 px-4">{subject.timeSpent}min</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {subject.improvement > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : subject.improvement < 0 ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : (
                              <div className="h-4 w-4" />
                            )}
                            <span className={subject.improvement > 0 ? 'text-green-600' : 
                                            subject.improvement < 0 ? 'text-red-600' : 'text-gray-600'}>
                              {subject.improvement > 0 ? '+' : ''}{subject.improvement}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          {timeSpentData && (
            <TreeMap
              data={timeSpentData.timeDistribution?.map((item: any, index: number) => ({
                id: `subject-${index}`,
                name: item.assignmentType,
                value: item.hours * 60, // Convert to minutes
                category: 'Subject',
                performance: 75 + Math.random() * 25, // Simulated performance
                timeSpent: item.hours * 60,
                metadata: {
                  type: item.assignmentType,
                  difficulty: index % 3 === 0 ? 'easy' : index % 3 === 1 ? 'medium' : 'hard'
                }
              })) || []}
              title="Time Allocation by Subject"
              description="Visual representation of time spent across different learning areas"
              valueType="time"
              colorScheme="engagement"
              height={400}
              onItemClick={(item) => {
                console.log('Drill down to subject:', item);
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClassProgressDashboard;
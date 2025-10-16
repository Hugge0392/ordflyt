import { useState } from 'react';
import { 
  Radar, 
  RadarChart as RechartsRadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, Settings } from 'lucide-react';

interface RadarChartDataPoint {
  subject: string;
  score: number;
  maxScore: number;
  studentName?: string;
  className?: string;
}

interface StudentRadarChartProps {
  data: RadarChartDataPoint[];
  title: string;
  description?: string;
  height?: number;
  showComparison?: boolean;
  comparisonData?: RadarChartDataPoint[];
  onExport?: () => void;
  onDrillDown?: (subject: string) => void;
}

const StudentRadarChart = ({
  data,
  title,
  description,
  height = 400,
  showComparison = false,
  comparisonData,
  onExport,
  onDrillDown
}: StudentRadarChartProps) => {
  const [selectedMetric, setSelectedMetric] = useState<'score' | 'percentage'>('percentage');
  const [showGrid, setShowGrid] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  // Transform data for radar chart
  const chartData = data.map(item => ({
    subject: item.subject,
    student: selectedMetric === 'percentage' 
      ? Math.round((item.score / item.maxScore) * 100)
      : item.score,
    comparison: showComparison && comparisonData 
      ? comparisonData.find(comp => comp.subject === item.subject)?.score || 0
      : undefined,
    maxValue: selectedMetric === 'percentage' ? 100 : item.maxScore
  }));

  const colors = {
    student: '#8884d8',
    comparison: '#82ca9d',
    grid: '#e0e4e7'
  };

  // Calculate performance insights
  const averageScore = data.length > 0 
    ? Math.round(data.reduce((sum, item) => sum + (item.score / item.maxScore * 100), 0) / data.length)
    : 0;

  const strongestArea = data.reduce((strongest, current) => 
    (current.score / current.maxScore) > (strongest.score / strongest.maxScore) ? current : strongest, data[0]
  );

  const weakestArea = data.reduce((weakest, current) => 
    (current.score / current.maxScore) < (weakest.score / weakest.maxScore) ? current : weakest, data[0]
  );

  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 90) return { label: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (percentage >= 80) return { label: 'Good', color: 'bg-blue-100 text-blue-800' };
    if (percentage >= 70) return { label: 'Satisfactory', color: 'bg-yellow-100 text-yellow-800' };
    if (percentage >= 60) return { label: 'Needs Improvement', color: 'bg-orange-100 text-orange-800' };
    return { label: 'Requires Support', color: 'bg-red-100 text-red-800' };
  };

  const performanceLevel = getPerformanceLevel(averageScore);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const studentScore = payload.find((p: any) => p.dataKey === 'student')?.value || 0;
      const comparisonScore = payload.find((p: any) => p.dataKey === 'comparison')?.value;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-blue-600">
            Student: {studentScore}{selectedMetric === 'percentage' ? '%' : ' points'}
          </p>
          {comparisonScore !== undefined && (
            <p className="text-sm text-green-600">
              Class Average: {comparisonScore}{selectedMetric === 'percentage' ? '%' : ' points'}
            </p>
          )}
          {onDrillDown && (
            <button 
              onClick={() => onDrillDown(label)}
              className="text-xs text-blue-500 hover:text-blue-700 mt-1"
            >
              Click for details →
            </button>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {title}
              <Badge className={performanceLevel.color}>
                {performanceLevel.label}
              </Badge>
            </CardTitle>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                data-testid="button-export-radar-chart"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Select value={selectedMetric} onValueChange={(value: 'score' | 'percentage') => setSelectedMetric(value)}>
              <SelectTrigger className="w-32" data-testid="select-radar-metric">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="score">Raw Score</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600" data-testid="text-average-score">
              {averageScore}%
            </div>
            <div className="text-sm text-gray-600">Overall Average</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600" data-testid="text-strongest-area">
              {strongestArea?.subject}
            </div>
            <div className="text-sm text-gray-600">Strongest Area</div>
            <div className="text-xs text-gray-500">
              {Math.round((strongestArea?.score / strongestArea?.maxScore * 100) || 0)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-orange-600" data-testid="text-weakest-area">
              {weakestArea?.subject}
            </div>
            <div className="text-sm text-gray-600">Focus Area</div>
            <div className="text-xs text-gray-500">
              {Math.round((weakestArea?.score / weakestArea?.maxScore * 100) || 0)}%
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div style={{ height }} data-testid="radar-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsRadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              {showGrid && <PolarGrid stroke={colors.grid} />}
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fontSize: 12, fill: '#374151' }}
                className="font-medium"
              />
              <PolarRadiusAxis 
                domain={[0, selectedMetric === 'percentage' ? 100 : 'dataMax']}
                tick={{ fontSize: 10, fill: '#6B7280' }}
                tickCount={6}
              />
              
              <Radar
                name="Student Performance"
                dataKey="student"
                stroke={colors.student}
                fill={colors.student}
                fillOpacity={0.3}
                strokeWidth={2}
                dot={{ fill: colors.student, strokeWidth: 2, r: 4 }}
              />
              
              {showComparison && comparisonData && (
                <Radar
                  name="Class Average"
                  dataKey="comparison"
                  stroke={colors.comparison}
                  fill={colors.comparison}
                  fillOpacity={0.1}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: colors.comparison, strokeWidth: 2, r: 3 }}
                />
              )}
              
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
            </RechartsRadarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Insights */}
        <div className="mt-6 space-y-3">
          <h4 className="font-medium text-gray-900">Performance Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <h5 className="font-medium text-green-800 mb-1">Strengths</h5>
              <ul className="text-sm text-green-700 space-y-1">
                {data
                  .filter(item => (item.score / item.maxScore) >= 0.8)
                  .map(item => (
                    <li key={item.subject} className="flex justify-between">
                      <span>{item.subject}</span>
                      <span className="font-medium">
                        {Math.round((item.score / item.maxScore) * 100)}%
                      </span>
                    </li>
                  ))
                }
                {data.filter(item => (item.score / item.maxScore) >= 0.8).length === 0 && (
                  <li className="text-gray-500 italic">Continue working to develop strengths</li>
                )}
              </ul>
            </div>
            
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <h5 className="font-medium text-orange-800 mb-1">Areas for Improvement</h5>
              <ul className="text-sm text-orange-700 space-y-1">
                {data
                  .filter(item => (item.score / item.maxScore) < 0.7)
                  .map(item => (
                    <li key={item.subject} className="flex justify-between">
                      <span>{item.subject}</span>
                      <span className="font-medium">
                        {Math.round((item.score / item.maxScore) * 100)}%
                      </span>
                    </li>
                  ))
                }
                {data.filter(item => (item.score / item.maxScore) < 0.7).length === 0 && (
                  <li className="text-gray-500 italic">All areas performing well!</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Action Items */}
        {data.some(item => (item.score / item.maxScore) < 0.7) && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h5 className="font-medium text-blue-800 mb-2">Recommended Actions</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              {weakestArea && (
                <li>• Focus additional practice time on {weakestArea.subject}</li>
              )}
              <li>• Schedule one-on-one review sessions for challenging areas</li>
              <li>• Provide supplementary materials for skill development</li>
              {showComparison && (
                <li>• Consider peer tutoring with students strong in weak areas</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentRadarChart;
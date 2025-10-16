import { useState, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Minus, Download, Target, Award } from 'lucide-react';

interface ProgressDataPoint {
  date: string;
  score: number;
  cumulativeScore: number;
  timeSpent: number;
  assignmentTitle?: string;
  assignmentType?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  milestone?: boolean;
  target?: number;
}

interface ProgressCurveProps {
  data: ProgressDataPoint[];
  title: string;
  description?: string;
  studentName?: string;
  height?: number;
  showTrendLine?: boolean;
  showTargets?: boolean;
  showMilestones?: boolean;
  onExport?: () => void;
  onDataPointClick?: (dataPoint: ProgressDataPoint) => void;
}

const ProgressCurve = ({
  data,
  title,
  description,
  studentName,
  height = 400,
  showTrendLine = true,
  showTargets = true,
  showMilestones = true,
  onExport,
  onDataPointClick
}: ProgressCurveProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [chartType, setChartType] = useState<'line' | 'area'>('line');
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(false);
  const [metricType, setMetricType] = useState<'score' | 'cumulative' | 'both'>('both');

  // Filter data based on selected period
  const filteredData = useMemo(() => {
    if (selectedPeriod === 'all') return data;
    
    const now = new Date();
    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90
    }[selectedPeriod];
    
    const cutoffDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));
    
    return data.filter(point => new Date(point.date) >= cutoffDate);
  }, [data, selectedPeriod]);

  // Calculate trend and statistics
  const trendAnalysis = useMemo(() => {
    if (filteredData.length < 2) {
      return { trend: 'stable', slope: 0, correlation: 0, prediction: 0 };
    }

    // Simple linear regression for trend
    const n = filteredData.length;
    const xValues = filteredData.map((_, index) => index);
    const yValues = filteredData.map(d => d.score);
    
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate correlation coefficient
    const meanX = sumX / n;
    const meanY = sumY / n;
    const numerator = xValues.reduce((sum, x, i) => sum + (x - meanX) * (yValues[i] - meanY), 0);
    const denomX = Math.sqrt(xValues.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0));
    const denomY = Math.sqrt(yValues.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0));
    const correlation = denomX && denomY ? numerator / (denomX * denomY) : 0;
    
    // Predict next score
    const prediction = intercept + slope * n;
    
    return {
      trend: slope > 1 ? 'improving' : slope < -1 ? 'declining' : 'stable',
      slope,
      correlation,
      prediction: Math.max(0, Math.min(100, prediction))
    };
  }, [filteredData]);

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    if (filteredData.length === 0) {
      return { 
        currentScore: 0, 
        averageScore: 0, 
        bestScore: 0, 
        improvement: 0,
        consistency: 0,
        totalTimeSpent: 0
      };
    }

    const scores = filteredData.map(d => d.score);
    const currentScore = scores[scores.length - 1];
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const bestScore = Math.max(...scores);
    
    // Calculate improvement (current vs first score)
    const firstScore = scores[0];
    const improvement = currentScore - firstScore;
    
    // Calculate consistency (inverse of standard deviation)
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - standardDeviation);
    
    const totalTimeSpent = filteredData.reduce((sum, d) => sum + d.timeSpent, 0);
    
    return {
      currentScore: Math.round(currentScore),
      averageScore: Math.round(averageScore),
      bestScore: Math.round(bestScore),
      improvement: Math.round(improvement),
      consistency: Math.round(consistency),
      totalTimeSpent: Math.round(totalTimeSpent)
    };
  }, [filteredData]);

  // Generate trend line data
  const trendLineData = useMemo(() => {
    if (!showTrendLine || filteredData.length < 2) return [];
    
    return filteredData.map((point, index) => ({
      ...point,
      trendValue: trendAnalysis.slope * index + (filteredData[0]?.score || 0)
    }));
  }, [filteredData, showTrendLine, trendAnalysis.slope]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-xs">
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
              <span>{entry.name}: {entry.value}%</span>
            </div>
          ))}
          
          {data.assignmentTitle && (
            <p className="text-sm text-gray-600 mt-2 font-medium">
              {data.assignmentTitle}
            </p>
          )}
          
          {data.assignmentType && (
            <Badge variant="outline" className="mt-1">
              {data.assignmentType}
            </Badge>
          )}
          
          {data.difficulty && (
            <Badge 
              variant={data.difficulty === 'hard' ? 'destructive' : 
                     data.difficulty === 'medium' ? 'secondary' : 'default'}
              className="mt-1 ml-1"
            >
              {data.difficulty}
            </Badge>
          )}
          
          <div className="text-xs text-gray-500 mt-2">
            Time spent: {data.timeSpent}min
          </div>
          
          {onDataPointClick && (
            <p className="text-xs text-blue-500 mt-2">Click for details →</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Get trend icon and color
  const getTrendDisplay = () => {
    const { trend, slope } = trendAnalysis;
    const absSlope = Math.abs(slope);
    
    switch (trend) {
      case 'improving':
        return {
          icon: <TrendingUp className="h-4 w-4" />,
          color: 'text-green-600',
          text: `Improving (+${absSlope.toFixed(1)}% per week)`,
          bgColor: 'bg-green-100'
        };
      case 'declining':
        return {
          icon: <TrendingDown className="h-4 w-4" />,
          color: 'text-red-600',
          text: `Declining (-${absSlope.toFixed(1)}% per week)`,
          bgColor: 'bg-red-100'
        };
      default:
        return {
          icon: <Minus className="h-4 w-4" />,
          color: 'text-gray-600',
          text: 'Stable performance',
          bgColor: 'bg-gray-100'
        };
    }
  };

  const trendDisplay = getTrendDisplay();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {title}
              {studentName && (
                <Badge variant="outline">{studentName}</Badge>
              )}
            </CardTitle>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={(value: '7d' | '30d' | '90d' | 'all') => setSelectedPeriod(value)}>
              <SelectTrigger className="w-24" data-testid="select-progress-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
                <SelectItem value="90d">90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                data-testid="button-export-progress"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Performance Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600" data-testid="text-current-score">
              {performanceMetrics.currentScore}%
            </div>
            <div className="text-sm text-gray-600">Current</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600" data-testid="text-average-score">
              {performanceMetrics.averageScore}%
            </div>
            <div className="text-sm text-gray-600">Average</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600" data-testid="text-best-score">
              {performanceMetrics.bestScore}%
            </div>
            <div className="text-sm text-gray-600">Best</div>
          </div>
          <div className="text-center">
            <div className={`text-xl font-bold ${performanceMetrics.improvement >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-improvement">
              {performanceMetrics.improvement > 0 ? '+' : ''}{performanceMetrics.improvement}%
            </div>
            <div className="text-sm text-gray-600">Improvement</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-orange-600" data-testid="text-consistency">
              {performanceMetrics.consistency}%
            </div>
            <div className="text-sm text-gray-600">Consistency</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-indigo-600" data-testid="text-total-time">
              {Math.round(performanceMetrics.totalTimeSpent / 60)}h
            </div>
            <div className="text-sm text-gray-600">Total Time</div>
          </div>
        </div>

        {/* Trend Analysis */}
        <div className={`flex items-center gap-3 p-3 rounded-lg mb-6 ${trendDisplay.bgColor}`}>
          <div className={`${trendDisplay.color}`}>
            {trendDisplay.icon}
          </div>
          <div>
            <div className={`font-medium ${trendDisplay.color}`}>
              {trendDisplay.text}
            </div>
            <div className="text-sm text-gray-600">
              Correlation strength: {Math.abs(trendAnalysis.correlation * 100).toFixed(0)}%
              {trendAnalysis.prediction && (
                <span className="ml-2">
                  • Predicted next: {Math.round(trendAnalysis.prediction)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Chart Controls */}
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="chart-type" className="text-sm">Chart Type:</Label>
            <Select value={chartType} onValueChange={(value: 'line' | 'area') => setChartType(value)}>
              <SelectTrigger className="w-20" data-testid="select-chart-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="area">Area</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="show-trend" className="text-sm">Trend Line:</Label>
            <Switch
              id="show-trend"
              checked={showTrendLine}
              onCheckedChange={setShowTrendLine}
              data-testid="switch-trend-line"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="metric-type" className="text-sm">Metrics:</Label>
            <Select value={metricType} onValueChange={(value: 'score' | 'cumulative' | 'both') => setMetricType(value)}>
              <SelectTrigger className="w-24" data-testid="select-metric-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Score</SelectItem>
                <SelectItem value="cumulative">Cumulative</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Progress Chart */}
        <div style={{ height }} data-testid="progress-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={trendLineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
                />
                
                {(metricType === 'score' || metricType === 'both') && (
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                    strokeWidth={2}
                    name="Score"
                    dot={{ fill: "#8884d8", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "#8884d8" }}
                  />
                )}
                
                {(metricType === 'cumulative' || metricType === 'both') && (
                  <Area
                    type="monotone"
                    dataKey="cumulativeScore"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name="Cumulative"
                    dot={{ fill: "#82ca9d", strokeWidth: 2, r: 3 }}
                  />
                )}
                
                {showTrendLine && (
                  <Area
                    type="monotone"
                    dataKey="trendValue"
                    stroke="#ff7300"
                    fill="none"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Trend"
                    dot={false}
                  />
                )}
                
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </AreaChart>
            ) : (
              <LineChart data={trendLineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
                />
                
                {(metricType === 'score' || metricType === 'both') && (
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#8884d8"
                    strokeWidth={3}
                    name="Score"
                    dot={{ fill: "#8884d8", strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, fill: "#8884d8" }}
                  />
                )}
                
                {(metricType === 'cumulative' || metricType === 'both') && (
                  <Line
                    type="monotone"
                    dataKey="cumulativeScore"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Cumulative"
                    dot={{ fill: "#82ca9d", strokeWidth: 2, r: 4 }}
                    strokeDasharray="3 3"
                  />
                )}
                
                {showTrendLine && (
                  <Line
                    type="monotone"
                    dataKey="trendValue"
                    stroke="#ff7300"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Trend"
                    dot={false}
                  />
                )}
                
                {/* Target lines */}
                {showTargets && (
                  <>
                    <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" label="Target (80%)" />
                    <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" label="Warning (60%)" />
                  </>
                )}
                
                {/* Milestone markers */}
                {showMilestones && filteredData.filter(d => d.milestone).map((milestone, index) => (
                  <ReferenceLine 
                    key={index}
                    x={milestone.date} 
                    stroke="#8b5cf6" 
                    strokeDasharray="2 2"
                    label={<Award className="h-4 w-4 text-purple-600" />}
                  />
                ))}
                
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Learning Insights */}
        {filteredData.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Performance Analysis
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Current performance: {performanceMetrics.currentScore}% (
                  {performanceMetrics.currentScore >= 80 ? 'Excellent' :
                   performanceMetrics.currentScore >= 70 ? 'Good' :
                   performanceMetrics.currentScore >= 60 ? 'Fair' : 'Needs Improvement'}
                )</li>
                <li>• Consistency level: {performanceMetrics.consistency}%</li>
                <li>• Learning velocity: {trendAnalysis.trend}</li>
                {performanceMetrics.improvement !== 0 && (
                  <li>• Overall improvement: {performanceMetrics.improvement > 0 ? '+' : ''}{performanceMetrics.improvement}%</li>
                )}
              </ul>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Next Steps
              </h4>
              <ul className="text-sm text-green-700 space-y-1">
                {trendAnalysis.trend === 'improving' ? (
                  <>
                    <li>• Maintain current study approach</li>
                    <li>• Consider advanced challenges</li>
                    <li>• Share success strategies with peers</li>
                  </>
                ) : trendAnalysis.trend === 'declining' ? (
                  <>
                    <li>• Review recent learning materials</li>
                    <li>• Schedule additional practice time</li>
                    <li>• Seek teacher support if needed</li>
                  </>
                ) : (
                  <>
                    <li>• Introduce variety to maintain engagement</li>
                    <li>• Set new challenge goals</li>
                    <li>• Track weekly improvement targets</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProgressCurve;
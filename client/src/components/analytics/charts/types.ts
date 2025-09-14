// Shared types for advanced analytics chart components

export interface RadarChartDataPoint {
  subject: string;
  score: number;
  maxScore: number;
  studentName?: string;
  className?: string;
}

export interface HeatmapDataPoint {
  id: string;
  rowLabel: string; // Student name or time period
  columnLabel: string; // Assignment type or subject
  value: number; // Performance score or time spent
  maxValue?: number;
  metadata?: {
    status?: string;
    timeSpent?: number;
    completedAt?: string;
    attempts?: number;
  };
}

export interface ProgressDataPoint {
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

export interface TreeMapDataItem {
  id: string;
  name: string;
  value: number;
  category: string;
  parent?: string;
  color?: string;
  performance?: number; // 0-100 score for color coding
  timeSpent?: number;
  studentCount?: number;
  metadata?: {
    difficulty?: 'easy' | 'medium' | 'hard';
    type?: string;
    completionRate?: number;
    averageScore?: number;
  };
}

export interface ChartExportOptions {
  format: 'png' | 'svg' | 'pdf';
  filename?: string;
  includeData?: boolean;
  resolution?: number;
}

export interface ChartInteractionEvent {
  type: 'click' | 'hover' | 'drill-down';
  dataPoint: any;
  metadata?: Record<string, any>;
}

// Common chart configuration interfaces
export interface BaseChartProps {
  title: string;
  description?: string;
  height?: number;
  width?: number;
  onExport?: () => void;
  className?: string;
}

export interface InteractiveChartProps extends BaseChartProps {
  onDataPointClick?: (dataPoint: any) => void;
  onDrillDown?: (category: string) => void;
  enableTooltips?: boolean;
  enableZoom?: boolean;
}

// Analytics-specific interfaces
export interface PerformanceMetrics {
  currentScore: number;
  averageScore: number;
  bestScore: number;
  improvement: number;
  consistency: number;
  totalTimeSpent: number;
}

export interface TrendAnalysis {
  trend: 'improving' | 'declining' | 'stable';
  slope: number;
  correlation: number;
  prediction: number;
}

export interface StudentInsight {
  type: 'strength' | 'challenge' | 'recommendation';
  category: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}
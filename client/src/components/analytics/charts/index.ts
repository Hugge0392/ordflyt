// Advanced Analytics Chart Components
export { default as StudentRadarChart } from './RadarChart';
export { default as PerformanceHeatmap } from './Heatmap';
export { default as ProgressCurve } from './ProgressCurve';
export { default as TreeMap } from './TreeMap';

// Chart types and interfaces for consistent usage across the application
export type {
  RadarChartDataPoint,
  HeatmapDataPoint,
  ProgressDataPoint,
  TreeMapDataItem
} from './types';

// Common chart utilities and color schemes
export const chartColorSchemes = {
  performance: {
    excellent: '#22c55e',
    good: '#3b82f6', 
    satisfactory: '#f59e0b',
    needsImprovement: '#f97316',
    requiresSupport: '#ef4444'
  },
  engagement: {
    high: '#8b5cf6',
    medium: '#a855f7',
    low: '#c084fc'
  },
  difficulty: {
    easy: '#22c55e',
    medium: '#f59e0b',
    hard: '#ef4444'
  }
};

export const formatters = {
  percentage: (value: number) => `${Math.round(value)}%`,
  score: (value: number, max?: number) => max ? `${value}/${max}` : `${value}`,
  time: (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  },
  date: (date: string) => new Date(date).toLocaleDateString('sv-SE', { 
    month: 'short', 
    day: 'numeric' 
  })
};
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, Info } from 'lucide-react';

interface HeatmapDataPoint {
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

interface HeatmapProps {
  data: HeatmapDataPoint[];
  title: string;
  description?: string;
  valueType: 'percentage' | 'score' | 'time' | 'attempts';
  colorScheme?: 'performance' | 'engagement' | 'difficulty';
  showLabels?: boolean;
  onCellClick?: (dataPoint: HeatmapDataPoint) => void;
  onExport?: () => void;
  height?: number;
  width?: number;
}

const PerformanceHeatmap = ({
  data,
  title,
  description,
  valueType,
  colorScheme = 'performance',
  showLabels = true,
  onCellClick,
  onExport,
  height = 400,
  width
}: HeatmapProps) => {
  const [filterValue, setFilterValue] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedMetric, setSelectedMetric] = useState<'value' | 'completion'>('value');

  // Extract unique row and column labels
  const rowLabels = useMemo(() => {
    return [...new Set(data.map(d => d.rowLabel))].sort();
  }, [data]);

  const columnLabels = useMemo(() => {
    return [...new Set(data.map(d => d.columnLabel))].sort();
  }, [data]);

  // Create matrix structure
  const matrix = useMemo(() => {
    const result = rowLabels.map(row => 
      columnLabels.map(column => {
        const point = data.find(d => d.rowLabel === row && d.columnLabel === column);
        return point || null;
      })
    );
    return result;
  }, [data, rowLabels, columnLabels]);

  // Calculate color intensity based on value
  const getColorIntensity = (value: number, maxValue: number = 100): number => {
    if (maxValue === 0) return 0;
    return Math.min(1, Math.max(0, value / maxValue));
  };

  // Get color based on scheme and intensity
  const getCellColor = (dataPoint: HeatmapDataPoint | null): string => {
    if (!dataPoint) return 'rgb(248, 250, 252)'; // Very light gray for empty cells

    const intensity = getColorIntensity(dataPoint.value, dataPoint.maxValue || 100);
    
    switch (colorScheme) {
      case 'performance':
        if (intensity >= 0.8) return `rgba(34, 197, 94, ${0.2 + intensity * 0.6})`; // Green
        if (intensity >= 0.6) return `rgba(59, 130, 246, ${0.2 + intensity * 0.6})`; // Blue
        if (intensity >= 0.4) return `rgba(245, 158, 11, ${0.2 + intensity * 0.6})`; // Yellow
        return `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`; // Red
      
      case 'engagement':
        return `rgba(147, 51, 234, ${0.1 + intensity * 0.7})`; // Purple scale
      
      case 'difficulty':
        return `rgba(249, 115, 22, ${0.1 + intensity * 0.7})`; // Orange scale
      
      default:
        return `rgba(59, 130, 246, ${0.1 + intensity * 0.7})`; // Blue scale
    }
  };

  // Get text color for readability
  const getTextColor = (dataPoint: HeatmapDataPoint | null): string => {
    if (!dataPoint) return '#9CA3AF';
    const intensity = getColorIntensity(dataPoint.value, dataPoint.maxValue || 100);
    return intensity > 0.6 ? '#FFFFFF' : '#374151';
  };

  // Format value for display
  const formatValue = (dataPoint: HeatmapDataPoint | null): string => {
    if (!dataPoint) return '';
    
    switch (valueType) {
      case 'percentage':
        return `${Math.round(dataPoint.value)}%`;
      case 'score':
        return dataPoint.maxValue ? `${dataPoint.value}/${dataPoint.maxValue}` : `${dataPoint.value}`;
      case 'time':
        const hours = Math.floor(dataPoint.value / 60);
        const minutes = dataPoint.value % 60;
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      case 'attempts':
        return `${dataPoint.value}x`;
      default:
        return `${dataPoint.value}`;
    }
  };

  // Filter data based on selected filter
  const getFilteredData = () => {
    if (filterValue === 'all') return data;
    
    const threshold = valueType === 'percentage' ? 100 : Math.max(...data.map(d => d.maxValue || d.value));
    
    return data.filter(d => {
      const percentage = (d.value / (d.maxValue || threshold)) * 100;
      switch (filterValue) {
        case 'high': return percentage >= 80;
        case 'medium': return percentage >= 60 && percentage < 80;
        case 'low': return percentage < 60;
        default: return true;
      }
    });
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const values = data.map(d => d.value);
    const validValues = values.filter(v => v !== null && v !== undefined);
    
    if (validValues.length === 0) {
      return { min: 0, max: 0, avg: 0, total: 0 };
    }
    
    return {
      min: Math.min(...validValues),
      max: Math.max(...validValues),
      avg: Math.round(validValues.reduce((sum, v) => sum + v, 0) / validValues.length),
      total: validValues.length
    };
  }, [data]);

  const cellSize = {
    width: Math.max(80, Math.min(120, (width || 800) / columnLabels.length)),
    height: 40
  };

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                {title}
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click on cells to view detailed information</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              {description && (
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterValue} onValueChange={(value: 'all' | 'high' | 'medium' | 'low') => setFilterValue(value)}>
                <SelectTrigger className="w-32" data-testid="select-heatmap-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Data</SelectItem>
                  <SelectItem value="high">High (80%+)</SelectItem>
                  <SelectItem value="medium">Medium (60-80%)</SelectItem>
                  <SelectItem value="low">Low (&lt;60%)</SelectItem>
                </SelectContent>
              </Select>
              {onExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExport}
                  data-testid="button-export-heatmap"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Statistics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600" data-testid="text-heatmap-avg">
                {valueType === 'percentage' ? `${stats.avg}%` : stats.avg}
              </div>
              <div className="text-sm text-gray-600">Average</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600" data-testid="text-heatmap-max">
                {valueType === 'percentage' ? `${stats.max}%` : stats.max}
              </div>
              <div className="text-sm text-gray-600">Highest</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-orange-600" data-testid="text-heatmap-min">
                {valueType === 'percentage' ? `${stats.min}%` : stats.min}
              </div>
              <div className="text-sm text-gray-600">Lowest</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600" data-testid="text-heatmap-total">
                {stats.total}
              </div>
              <div className="text-sm text-gray-600">Data Points</div>
            </div>
          </div>

          {/* Color Legend */}
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Performance:</span>
              <div className="flex space-x-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }}></div>
                <span className="text-xs">Low</span>
              </div>
              <div className="flex space-x-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(245, 158, 11, 0.8)' }}></div>
                <span className="text-xs">Medium</span>
              </div>
              <div className="flex space-x-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.8)' }}></div>
                <span className="text-xs">Good</span>
              </div>
              <div className="flex space-x-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.8)' }}></div>
                <span className="text-xs">Excellent</span>
              </div>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="overflow-auto" style={{ maxHeight: height }}>
            <div className="inline-block min-w-full">
              {/* Column Headers */}
              <div className="flex sticky top-0 bg-white z-10">
                <div style={{ width: cellSize.width, height: cellSize.height }} className="border-r border-gray-200" />
                {columnLabels.map((column, index) => (
                  <div
                    key={index}
                    style={{ width: cellSize.width, height: cellSize.height }}
                    className="border-r border-gray-200 bg-gray-50 flex items-center justify-center p-1"
                  >
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                      {column}
                    </span>
                  </div>
                ))}
              </div>

              {/* Data Rows */}
              {matrix.map((row, rowIndex) => (
                <div key={rowIndex} className="flex">
                  {/* Row Header */}
                  <div
                    style={{ width: cellSize.width, height: cellSize.height }}
                    className="border-r border-b border-gray-200 bg-gray-50 flex items-center justify-start p-2 sticky left-0 z-5"
                  >
                    <span className="text-xs font-medium text-gray-700 truncate">
                      {rowLabels[rowIndex]}
                    </span>
                  </div>

                  {/* Data Cells */}
                  {row.map((dataPoint, colIndex) => (
                    <Tooltip key={colIndex}>
                      <TooltipTrigger asChild>
                        <div
                          style={{
                            width: cellSize.width,
                            height: cellSize.height,
                            backgroundColor: getCellColor(dataPoint),
                            color: getTextColor(dataPoint)
                          }}
                          className={`border-r border-b border-gray-200 flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 hover:z-10 hover:shadow-lg ${
                            onCellClick && dataPoint ? 'hover:ring-2 hover:ring-blue-500' : ''
                          }`}
                          onClick={() => dataPoint && onCellClick?.(dataPoint)}
                          data-testid={`heatmap-cell-${rowIndex}-${colIndex}`}
                        >
                          {showLabels && dataPoint && (
                            <span className="text-xs font-medium">
                              {formatValue(dataPoint)}
                            </span>
                          )}
                        </div>
                      </TooltipTrigger>
                      {dataPoint && (
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-medium">
                              {rowLabels[rowIndex]} × {columnLabels[colIndex]}
                            </p>
                            <p className="text-sm">
                              Value: {formatValue(dataPoint)}
                            </p>
                            {dataPoint.metadata?.timeSpent && (
                              <p className="text-sm">
                                Time spent: {Math.round(dataPoint.metadata.timeSpent)}m
                              </p>
                            )}
                            {dataPoint.metadata?.attempts && (
                              <p className="text-sm">
                                Attempts: {dataPoint.metadata.attempts}
                              </p>
                            )}
                            {dataPoint.metadata?.status && (
                              <Badge variant={dataPoint.metadata.status === 'completed' ? 'default' : 'secondary'}>
                                {dataPoint.metadata.status}
                              </Badge>
                            )}
                            {onCellClick && (
                              <p className="text-xs text-gray-500 mt-2">
                                Click for details →
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Empty State */}
          {data.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-lg font-medium mb-2">No data available</div>
              <p className="text-sm">Data will appear here once students start completing assignments.</p>
            </div>
          )}

          {/* Performance Summary */}
          {data.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Analysis Summary</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  • <strong>{rowLabels.length}</strong> students/periods tracked across <strong>{columnLabels.length}</strong> subjects/assignments
                </p>
                <p>
                  • Average performance: <strong>{valueType === 'percentage' ? `${stats.avg}%` : stats.avg}</strong>
                </p>
                <p>
                  • Performance range: <strong>
                    {valueType === 'percentage' ? `${stats.min}% - ${stats.max}%` : `${stats.min} - ${stats.max}`}
                  </strong>
                </p>
                {colorScheme === 'performance' && (
                  <p>
                    • Students with high performance (80%+): <strong>
                      {data.filter(d => (d.value / (d.maxValue || 100)) >= 0.8).length}
                    </strong>
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default PerformanceHeatmap;
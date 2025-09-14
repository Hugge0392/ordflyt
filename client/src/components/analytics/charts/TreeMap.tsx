import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Download, ZoomIn, Filter, Layers } from 'lucide-react';

interface TreeMapDataItem {
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

interface TreeMapProps {
  data: TreeMapDataItem[];
  title: string;
  description?: string;
  width?: number;
  height?: number;
  colorScheme?: 'performance' | 'engagement' | 'difficulty' | 'category';
  onItemClick?: (item: TreeMapDataItem) => void;
  onExport?: () => void;
  showLabels?: boolean;
  valueType?: 'score' | 'time' | 'count' | 'percentage';
}

// Simple recursive treemap layout algorithm
const calculateTreeMapLayout = (
  items: TreeMapDataItem[],
  x: number,
  y: number,
  width: number,
  height: number
): Array<TreeMapDataItem & { x: number; y: number; width: number; height: number }> => {
  if (items.length === 0) return [];
  
  // Sort items by value (descending)
  const sortedItems = [...items].sort((a, b) => b.value - a.value);
  const totalValue = sortedItems.reduce((sum, item) => sum + item.value, 0);
  
  if (totalValue === 0) return [];
  
  const result: Array<TreeMapDataItem & { x: number; y: number; width: number; height: number }> = [];
  
  let currentX = x;
  let currentY = y;
  let remainingWidth = width;
  let remainingHeight = height;
  
  for (let i = 0; i < sortedItems.length; i++) {
    const item = sortedItems[i];
    const ratio = item.value / totalValue;
    
    if (i === sortedItems.length - 1) {
      // Last item takes remaining space
      result.push({
        ...item,
        x: currentX,
        y: currentY,
        width: remainingWidth,
        height: remainingHeight
      });
    } else {
      // Calculate dimensions based on aspect ratio
      let itemWidth: number, itemHeight: number;
      
      if (remainingWidth > remainingHeight) {
        // Split vertically
        itemWidth = remainingWidth * ratio;
        itemHeight = remainingHeight;
        currentX += itemWidth;
        remainingWidth -= itemWidth;
      } else {
        // Split horizontally
        itemWidth = remainingWidth;
        itemHeight = remainingHeight * ratio;
        currentY += itemHeight;
        remainingHeight -= itemHeight;
      }
      
      result.push({
        ...item,
        x: currentX - (remainingWidth > remainingHeight ? itemWidth : 0),
        y: currentY - (remainingWidth > remainingHeight ? 0 : itemHeight),
        width: itemWidth,
        height: itemHeight
      });
    }
  }
  
  return result;
};

const TreeMap = ({
  data,
  title,
  description,
  width = 800,
  height = 400,
  colorScheme = 'performance',
  onItemClick,
  onExport,
  showLabels = true,
  valueType = 'score'
}: TreeMapProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Filter data by category
  const filteredData = useMemo(() => {
    if (selectedCategory === 'all') return data;
    return data.filter(item => item.category === selectedCategory);
  }, [data, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    return ['all', ...new Set(data.map(item => item.category))];
  }, [data]);

  // Calculate layout
  const layoutData = useMemo(() => {
    return calculateTreeMapLayout(filteredData, 0, 0, width, height);
  }, [filteredData, width, height]);

  // Get color based on scheme and performance
  const getItemColor = (item: TreeMapDataItem): string => {
    const performance = item.performance ?? 50;
    
    switch (colorScheme) {
      case 'performance':
        if (performance >= 90) return '#22c55e'; // Green
        if (performance >= 80) return '#3b82f6'; // Blue
        if (performance >= 70) return '#f59e0b'; // Yellow
        if (performance >= 60) return '#f97316'; // Orange
        return '#ef4444'; // Red
      
      case 'engagement':
        const intensity = Math.min(100, item.timeSpent || 0) / 100;
        return `hsl(250, 70%, ${85 - intensity * 35}%)`;
      
      case 'difficulty':
        const difficulty = item.metadata?.difficulty;
        switch (difficulty) {
          case 'easy': return '#22c55e';
          case 'medium': return '#f59e0b';
          case 'hard': return '#ef4444';
          default: return '#6b7280';
        }
      
      case 'category':
        // Hash category name to consistent color
        const hash = item.category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const hue = hash % 360;
        return `hsl(${hue}, 60%, 65%)`;
      
      default:
        return '#6b7280';
    }
  };

  // Format value for display
  const formatValue = (item: TreeMapDataItem): string => {
    switch (valueType) {
      case 'percentage':
        return `${Math.round(item.value)}%`;
      case 'time':
        const hours = Math.floor(item.value / 60);
        const minutes = item.value % 60;
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      case 'count':
        return `${item.value}`;
      case 'score':
        return `${Math.round(item.value)}`;
      default:
        return `${item.value}`;
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const values = filteredData.map(item => item.value);
    const performances = filteredData.map(item => item.performance ?? 0);
    
    return {
      totalItems: filteredData.length,
      totalValue: values.reduce((sum, val) => sum + val, 0),
      averageValue: values.length > 0 ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length) : 0,
      averagePerformance: performances.length > 0 ? Math.round(performances.reduce((sum, perf) => sum + perf, 0) / performances.length) : 0,
      topPerformer: filteredData.reduce((top, current) => 
        (current.performance ?? 0) > (top.performance ?? 0) ? current : top, filteredData[0]
      )
    };
  }, [filteredData]);

  const handleItemClick = (item: TreeMapDataItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                {title}
                <Badge variant="outline">
                  {filteredData.length} items
                </Badge>
              </CardTitle>
              {description && (
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-32" data-testid="select-treemap-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {onExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExport}
                  data-testid="button-export-treemap"
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
              <div className="text-xl font-bold text-blue-600" data-testid="text-treemap-total">
                {stats.totalValue}
              </div>
              <div className="text-sm text-gray-600">Total Value</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600" data-testid="text-treemap-average">
                {stats.averageValue}
              </div>
              <div className="text-sm text-gray-600">Average</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600" data-testid="text-treemap-performance">
                {stats.averagePerformance}%
              </div>
              <div className="text-sm text-gray-600">Avg Performance</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-orange-600" data-testid="text-treemap-top">
                {stats.topPerformer?.name?.substring(0, 10)}...
              </div>
              <div className="text-sm text-gray-600">Top Performer</div>
            </div>
          </div>

          {/* Color Legend */}
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">Color coding:</span>
              {colorScheme === 'performance' && (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                    <span className="text-xs">Low (&lt;60%)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }}></div>
                    <span className="text-xs">Fair (60-70%)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                    <span className="text-xs">Good (70-80%)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                    <span className="text-xs">Very Good (80-90%)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
                    <span className="text-xs">Excellent (90%+)</span>
                  </div>
                </div>
              )}
              {colorScheme === 'difficulty' && (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
                    <span className="text-xs">Easy</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                    <span className="text-xs">Medium</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                    <span className="text-xs">Hard</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TreeMap Visualization */}
          <div className="flex justify-center">
            <div 
              className="relative border border-gray-200 rounded-lg overflow-hidden"
              style={{ width, height }}
              data-testid="treemap-container"
            >
              <svg width={width} height={height} className="absolute inset-0">
                {layoutData.map((item) => {
                  const isHovered = hoveredItem === item.id;
                  const itemColor = getItemColor(item);
                  
                  return (
                    <g key={item.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <rect
                            x={item.x}
                            y={item.y}
                            width={item.width}
                            height={item.height}
                            fill={itemColor}
                            stroke={isHovered ? "#374151" : "#e5e7eb"}
                            strokeWidth={isHovered ? 2 : 1}
                            opacity={isHovered ? 0.9 : 0.8}
                            className="cursor-pointer transition-all duration-200"
                            onMouseEnter={() => setHoveredItem(item.id)}
                            onMouseLeave={() => setHoveredItem(null)}
                            onClick={() => handleItemClick(item)}
                            data-testid={`treemap-item-${item.id}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm">Value: {formatValue(item)}</p>
                            <p className="text-sm">Category: {item.category}</p>
                            {item.performance !== undefined && (
                              <p className="text-sm">Performance: {Math.round(item.performance)}%</p>
                            )}
                            {item.studentCount && (
                              <p className="text-sm">Students: {item.studentCount}</p>
                            )}
                            {item.metadata?.completionRate && (
                              <p className="text-sm">Completion: {Math.round(item.metadata.completionRate)}%</p>
                            )}
                            {onItemClick && (
                              <p className="text-xs text-gray-500 mt-2">Click for details →</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                      
                      {/* Labels */}
                      {showLabels && item.width > 60 && item.height > 40 && (
                        <text
                          x={item.x + item.width / 2}
                          y={item.y + item.height / 2 - 5}
                          textAnchor="middle"
                          className="fill-white text-xs font-medium pointer-events-none"
                          style={{ 
                            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                            fontSize: Math.min(12, item.width / 8, item.height / 4)
                          }}
                        >
                          {item.name.length > 15 ? `${item.name.substring(0, 12)}...` : item.name}
                        </text>
                      )}
                      
                      {/* Value labels */}
                      {showLabels && item.width > 60 && item.height > 40 && (
                        <text
                          x={item.x + item.width / 2}
                          y={item.y + item.height / 2 + 10}
                          textAnchor="middle"
                          className="fill-white text-xs pointer-events-none"
                          style={{ 
                            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                            fontSize: Math.min(11, item.width / 10, item.height / 5)
                          }}
                        >
                          {formatValue(item)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Analysis Summary */}
          {filteredData.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Layers className="h-4 w-4" />
                TreeMap Analysis
              </h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  • Displaying <strong>{stats.totalItems}</strong> items across <strong>{categories.length - 1}</strong> categories
                </p>
                <p>
                  • Total value: <strong>{stats.totalValue}</strong> ({valueType})
                </p>
                <p>
                  • Average performance: <strong>{stats.averagePerformance}%</strong>
                </p>
                <p>
                  • Largest area represents: <strong>{layoutData[0]?.name}</strong> ({formatValue(layoutData[0])})
                </p>
                {colorScheme === 'performance' && (
                  <p>
                    • High performers (80%+): <strong>
                      {filteredData.filter(item => (item.performance ?? 0) >= 80).length}
                    </strong> items
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredData.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-lg font-medium mb-2">No data available</div>
              <p className="text-sm">Try selecting a different category or check your data filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default TreeMap;
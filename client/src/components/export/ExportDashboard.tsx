import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  BarChart3, 
  Users, 
  Calendar,
  Clock,
  Settings,
  History,
  Plus,
  Package,
  Send,
  Eye,
  FileSpreadsheet,
  PieChart
} from 'lucide-react';
import ExportWizard from './ExportWizard';
import ExportHistory from './ExportHistory';
import QuickExports from './QuickExports';
import ExportTemplates from './ExportTemplates';

interface ExportDashboardProps {
  teacherId?: string;
  className?: string;
}

interface ExportStats {
  totalExports: number;
  recentExports: number;
  templatesCount: number;
  pendingExports: number;
  exportsByType: {
    student_progress_report: number;
    parent_meeting_report: number;
    class_data_backup: number;
    administrative_report: number;
  };
  popularFormats: {
    pdf: number;
    csv: number;
    excel: number;
    json: number;
  };
}

export default function ExportDashboard({ teacherId, className = '' }: ExportDashboardProps) {
  const [activeTab, setActiveTab] = useState('quick');
  const [showWizard, setShowWizard] = useState(false);

  // Fetch export statistics
  const { data: exportStats, isLoading: statsLoading } = useQuery<ExportStats>({
    queryKey: ['/api/exports/stats'],
  });

  // Fetch recent export activity
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['/api/exports/recent', { limit: 5 }],
  });

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Dataexport
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Exportera elevdata för föräldramöten och administrativa rapporter
          </p>
        </div>
        <Button 
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2"
          data-testid="button-new-export"
        >
          <Plus className="h-4 w-4" />
          Ny Export
        </Button>
      </div>

      {/* Export Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-exports">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Totala Exporter
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {exportStats?.totalExports || 0}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-recent-exports">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Denna Vecka
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {exportStats?.recentExports || 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-templates">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Mallar
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {exportStats?.templatesCount || 0}
                </p>
              </div>
              <Settings className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-exports">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Pågående
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {exportStats?.pendingExports || 0}
                </p>
                {(exportStats?.pendingExports || 0) > 0 && (
                  <Badge variant="secondary" className="mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    Bearbetar
                  </Badge>
                )}
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-export-types">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Exporttyper
            </CardTitle>
            <CardDescription>
              Fördelning av dina exporter efter typ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {exportStats?.exportsByType && Object.entries(exportStats.exportsByType).map(([type, count]) => {
              const typeLabels = {
                student_progress_report: 'Elevframstegsrapporter',
                parent_meeting_report: 'Föräldramötesrapporter',
                class_data_backup: 'Klassdatabackup',
                administrative_report: 'Administrativa Rapporter'
              };
              
              const icons = {
                student_progress_report: Users,
                parent_meeting_report: FileText,
                class_data_backup: Package,
                administrative_report: BarChart3
              };
              
              const Icon = icons[type as keyof typeof icons];
              
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {typeLabels[type as keyof typeof typeLabels]}
                    </span>
                  </div>
                  <Badge variant="outline">{count}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card data-testid="card-export-formats">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Populära Format
            </CardTitle>
            <CardDescription>
              Mest använda exportformat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {exportStats?.popularFormats && Object.entries(exportStats.popularFormats).map(([format, count]) => {
              const formatLabels = {
                pdf: 'PDF-rapporter',
                csv: 'CSV-filer',
                excel: 'Excel-kalkylblad',
                json: 'JSON-data'
              };
              
              const formatColors = {
                pdf: 'text-red-600',
                csv: 'text-green-600',
                excel: 'text-blue-600',
                json: 'text-purple-600'
              };
              
              return (
                <div key={format} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${formatColors[format as keyof typeof formatColors].replace('text-', 'bg-')}`}></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {formatLabels[format as keyof typeof formatLabels]}
                    </span>
                  </div>
                  <Badge variant="outline">{count}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Export Interface Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quick" data-testid="tab-quick-exports">
            <Download className="h-4 w-4 mr-2" />
            Snabbexporter
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">
            <Settings className="h-4 w-4 mr-2" />
            Mallar
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <History className="h-4 w-4 mr-2" />
            Historik
          </TabsTrigger>
          <TabsTrigger value="scheduled" data-testid="tab-scheduled">
            <Calendar className="h-4 w-4 mr-2" />
            Schemalagda
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="space-y-6">
          <QuickExports onOpenWizard={() => setShowWizard(true)} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <ExportTemplates onOpenWizard={() => setShowWizard(true)} />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <ExportHistory />
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schemalagda Exporter
              </CardTitle>
              <CardDescription>
                Konfigurera automatiska exporter för återkommande rapporter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Inga schemalagda exporter än
                </p>
                <Button 
                  variant="outline"
                  onClick={() => setShowWizard(true)}
                  data-testid="button-schedule-export"
                >
                  Schemalägg Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Wizard Modal */}
      {showWizard && (
        <ExportWizard 
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}
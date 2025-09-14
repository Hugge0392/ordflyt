import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Users, 
  Package, 
  BarChart3,
  Download,
  Clock,
  Zap,
  Calendar,
  FileSpreadsheet,
  PieChart,
  Target,
  Building
} from 'lucide-react';

interface QuickExportsProps {
  onOpenWizard: () => void;
}

interface ClassData {
  id: string;
  name: string;
  studentCount: number;
}

interface QuickExportTemplate {
  id: string;
  name: string;
  description: string;
  exportType: string;
  format: string;
  icon: any;
  color: string;
  estimatedTime: string;
}

export default function QuickExports({ onOpenWizard }: QuickExportsProps) {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [loadingExport, setLoadingExport] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch teacher's classes
  const { data: classes, isLoading: classesLoading } = useQuery<ClassData[]>({
    queryKey: ['/api/teacher/classes'],
  });

  // Quick export templates
  const quickExportTemplates: QuickExportTemplate[] = [
    {
      id: 'student-progress-pdf',
      name: 'Elevframstegsrapporter (PDF)',
      description: 'Professionella rapporter för föräldramöten med grafer och kommentarer',
      exportType: 'student_progress_report',
      format: 'pdf',
      icon: FileText,
      color: 'bg-blue-500',
      estimatedTime: '2-5 min'
    },
    {
      id: 'parent-meeting-pdf',
      name: 'Föräldramötesrapporter',
      description: 'Detaljerade rapporter för individuella föräldramöten',
      exportType: 'parent_meeting_report',
      format: 'pdf',
      icon: Users,
      color: 'bg-green-500',
      estimatedTime: '3-8 min'
    },
    {
      id: 'class-backup-excel',
      name: 'Klassdatabackup (Excel)',
      description: 'Komplett klassdata med flera ark för administrativ användning',
      exportType: 'class_data_backup',
      format: 'excel',
      icon: Package,
      color: 'bg-purple-500',
      estimatedTime: '1-3 min'
    },
    {
      id: 'class-backup-csv',
      name: 'Klassdatabackup (CSV)',
      description: 'Enkel CSV-export för dataanalys och systemintegration',
      exportType: 'class_data_backup',
      format: 'csv',
      icon: FileSpreadsheet,
      color: 'bg-orange-500',
      estimatedTime: '30 sek - 2 min'
    },
    {
      id: 'analytics-report',
      name: 'Analysrapport',
      description: 'Detaljerad analytisk rapport med prestationsmetrik',
      exportType: 'administrative_report',
      format: 'pdf',
      icon: BarChart3,
      color: 'bg-red-500',
      estimatedTime: '2-4 min'
    },
    {
      id: 'weekly-summary',
      name: 'Veckosammanfattning',
      description: 'Snabb översikt av veckans aktiviteter och framsteg',
      exportType: 'administrative_report',
      format: 'pdf',
      icon: Calendar,
      color: 'bg-indigo-500',
      estimatedTime: '1-2 min'
    }
  ];

  // Quick export mutation
  const quickExportMutation = useMutation({
    mutationFn: async ({ templateId, classId }: { templateId: string; classId: string }) => {
      const template = quickExportTemplates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      return apiRequest('POST', '/api/exports/quick', {
        exportType: template.exportType,
        format: template.format,
        classIds: [classId],
        title: template.name,
        description: `Quick export: ${template.name} for class`,
        customization: {
          showCharts: true,
          showProgressGraphs: true,
          includeSummary: true,
          includeRecommendations: true,
          colorScheme: 'professional'
        }
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Export startad',
        description: 'Din export bearbetas och kommer att vara tillgänglig i historiken',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/exports'] });
      setLoadingExport(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Export misslyckades',
        description: error.message || 'Ett fel uppstod vid export',
        variant: 'destructive',
      });
      setLoadingExport(null);
    },
  });

  const handleQuickExport = async (templateId: string) => {
    if (!selectedClass) {
      toast({
        title: 'Välj klass',
        description: 'Du måste välja en klass för att starta exporten',
        variant: 'destructive',
      });
      return;
    }

    setLoadingExport(templateId);
    await quickExportMutation.mutateAsync({ templateId, classId: selectedClass });
  };

  return (
    <div className="space-y-6">
      {/* Class Selection */}
      <Card data-testid="card-class-selection">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Välj Klass
          </CardTitle>
          <CardDescription>
            Välj vilken klass du vill exportera data för
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger data-testid="select-class">
              <SelectValue placeholder="Välj en klass..." />
            </SelectTrigger>
            <SelectContent>
              {classes?.map((classItem) => (
                <SelectItem key={classItem.id} value={classItem.id}>
                  {classItem.name} ({classItem.studentCount} elever)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Quick Export Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickExportTemplates.map((template) => {
          const Icon = template.icon;
          const isLoading = loadingExport === template.id;
          
          return (
            <Card 
              key={template.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              data-testid={`card-quick-export-${template.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${template.color} text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {template.estimatedTime}
                  </Badge>
                </div>
                
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {template.name}
                </h3>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {template.description}
                </p>
                
                <Button 
                  onClick={() => handleQuickExport(template.id)}
                  disabled={!selectedClass || isLoading}
                  className="w-full"
                  data-testid={`button-export-${template.id}`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Startar...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Exportera
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Custom Export Card */}
      <Card className="border-dashed border-2 border-gray-300 dark:border-gray-600">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
              <Target className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Anpassad Export
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Behöver mer kontroll över exporten? Använd den avancerade exportguiden
              </p>
            </div>
            <Button 
              onClick={onOpenWizard} 
              variant="outline"
              data-testid="button-custom-export"
            >
              <Zap className="h-4 w-4 mr-2" />
              Öppna Exportguide
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
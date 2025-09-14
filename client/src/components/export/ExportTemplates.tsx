import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { 
  Settings,
  Plus,
  Eye,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  FileText,
  Users,
  Package,
  BarChart3,
  Star,
  Globe,
  Lock,
  Download,
  Search,
  Filter,
  SortAsc,
  Calendar
} from 'lucide-react';

interface ExportTemplate {
  id: string;
  name: string;
  description?: string;
  teacherId?: string;
  schoolId?: string;
  exportType: string;
  format: string;
  dataFields: string[];
  defaultFilters: any;
  layoutConfig: any;
  styling: any;
  isActive: boolean;
  isPublic: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ExportTemplatesProps {
  onOpenWizard: () => void;
}

const EXPORT_TYPE_LABELS = {
  student_progress_report: 'Elevframstegsrapporter',
  parent_meeting_report: 'Föräldramötesrapporter',
  class_data_backup: 'Klassdatabackup',
  administrative_report: 'Administrativa Rapporter',
  custom_report: 'Anpassad Rapport'
};

const EXPORT_TYPE_ICONS = {
  student_progress_report: Users,
  parent_meeting_report: FileText,
  class_data_backup: Package,
  administrative_report: BarChart3,
  custom_report: Settings
};

export default function ExportTemplates({ onOpenWizard }: ExportTemplatesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates, isLoading } = useQuery<ExportTemplate[]>({
    queryKey: ['/api/exports/templates'],
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest('DELETE', `/api/exports/templates/${templateId}`, {});
    },
    onSuccess: () => {
      toast({
        title: 'Mall borttagen',
        description: 'Exportmallen har tagits bort',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/exports/templates'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Borttagning misslyckades',
        description: error.message || 'Kunde inte ta bort mallen',
        variant: 'destructive',
      });
    },
  });

  // Duplicate template mutation
  const duplicateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest('POST', `/api/exports/templates/${templateId}/duplicate`, {});
    },
    onSuccess: () => {
      toast({
        title: 'Mall kopierad',
        description: 'En kopia av mallen har skapats',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/exports/templates'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Kopiering misslyckades',
        description: error.message || 'Kunde inte kopiera mallen',
        variant: 'destructive',
      });
    },
  });

  // Use template mutation
  const useTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      // This would trigger opening the export wizard with the template pre-loaded
      return { templateId };
    },
    onSuccess: (data) => {
      // Open export wizard with template
      onOpenWizard(); // We'll pass the template ID when we integrate
      toast({
        title: 'Mall laddad',
        description: 'Exportguiden öppnas med mallens inställningar',
      });
    },
  });

  // Filter templates
  const filteredTemplates = templates?.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || template.exportType === filterType;
    return matchesSearch && matchesType && template.isActive;
  }) || [];

  // Separate templates by ownership
  const myTemplates = filteredTemplates.filter(t => t.teacherId);
  const sharedTemplates = filteredTemplates.filter(t => !t.teacherId && t.isPublic);

  const handleDelete = async (templateId: string) => {
    await deleteMutation.mutateAsync(templateId);
  };

  const handleDuplicate = async (templateId: string) => {
    await duplicateMutation.mutateAsync(templateId);
  };

  const handleUseTemplate = async (templateId: string) => {
    await useTemplateMutation.mutateAsync(templateId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Laddar mallar...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const TemplateCard = ({ template, isOwned }: { template: ExportTemplate; isOwned: boolean }) => {
    const TypeIcon = EXPORT_TYPE_ICONS[template.exportType as keyof typeof EXPORT_TYPE_ICONS] || Settings;
    
    return (
      <Card className="hover:shadow-md transition-shadow" data-testid={`card-template-${template.id}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <TypeIcon className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {template.name}
                </h3>
                {template.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {template.description}
                  </p>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" data-testid={`button-template-actions-${template.id}`}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleUseTemplate(template.id)}
                  data-testid={`action-use-template-${template.id}`}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Använd mall
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={() => setSelectedTemplate(template)}
                  data-testid={`action-view-template-${template.id}`}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Visa detaljer
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={() => handleDuplicate(template.id)}
                  data-testid={`action-duplicate-template-${template.id}`}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Kopiera mall
                </DropdownMenuItem>

                {isOwned && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onOpenWizard()} // Edit functionality would go here
                      data-testid={`action-edit-template-${template.id}`}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Redigera
                    </DropdownMenuItem>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          className="text-red-600"
                          data-testid={`action-delete-template-${template.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Ta bort
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Ta bort mall</AlertDialogTitle>
                          <AlertDialogDescription>
                            Är du säker på att du vill ta bort "{template.name}"? 
                            Detta går inte att ångra.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(template.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Ta bort
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {EXPORT_TYPE_LABELS[template.exportType as keyof typeof EXPORT_TYPE_LABELS]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {template.format.toUpperCase()}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                <span>{template.usageCount} användningar</span>
              </div>
              {!isOwned && (
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  <span>Delad</span>
                </div>
              )}
              {isOwned && !template.isPublic && (
                <div className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  <span>Privat</span>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500">
              Skapad {format(new Date(template.createdAt), 'MMM d, yyyy', { locale: sv })}
              {template.lastUsedAt && (
                <span className="ml-2">
                  • Senast använd {format(new Date(template.lastUsedAt), 'MMM d', { locale: sv })}
                </span>
              )}
            </div>

            <Button 
              onClick={() => handleUseTemplate(template.id)}
              size="sm" 
              className="w-full"
              data-testid={`button-use-template-${template.id}`}
            >
              <Download className="h-4 w-4 mr-2" />
              Använd Mall
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Exportmallar
          </CardTitle>
          <CardDescription>
            Spara och återanvänd exportkonfigurationer för snabbare arbetsflöde
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Sök mallar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-templates"
                />
              </div>
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm bg-background"
              data-testid="select-template-type-filter"
            >
              <option value="all">Alla typer</option>
              {Object.entries(EXPORT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <Button 
              onClick={onOpenWizard}
              data-testid="button-create-template"
            >
              <Plus className="h-4 w-4 mr-2" />
              Skapa Mall
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* My Templates */}
      {myTemplates.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Mina Mallar
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myTemplates.map(template => (
              <TemplateCard 
                key={template.id} 
                template={template} 
                isOwned={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Shared Templates */}
      {sharedTemplates.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Delade Mallar
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedTemplates.map(template => (
              <TemplateCard 
                key={template.id} 
                template={template} 
                isOwned={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Settings className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {searchTerm || filterType !== 'all' 
                ? 'Inga mallar matchar dina filter'
                : 'Inga exportmallar ännu'
              }
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm || filterType !== 'all'
                ? 'Prova att ändra dina sökkriterier'
                : 'Skapa din första mall för att snabba upp framtida exporter'
              }
            </p>
            <Button onClick={onOpenWizard} data-testid="button-create-first-template">
              <Plus className="h-4 w-4 mr-2" />
              Skapa Din Första Mall
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template Details Dialog */}
      {selectedTemplate && (
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Malldetaljer
              </DialogTitle>
              <DialogDescription>
                {selectedTemplate.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Typ:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {EXPORT_TYPE_LABELS[selectedTemplate.exportType as keyof typeof EXPORT_TYPE_LABELS]}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium">Format:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedTemplate.format.toUpperCase()}
                  </p>
                </div>
              </div>

              {selectedTemplate.description && (
                <div>
                  <span className="text-sm font-medium">Beskrivning:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedTemplate.description}
                  </p>
                </div>
              )}

              <div>
                <span className="text-sm font-medium">Inkluderade datafält:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedTemplate.dataFields.map(field => (
                    <Badge key={field} variant="outline" className="text-xs">
                      {field.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Användningar:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedTemplate.usageCount} gånger
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium">Synlighet:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedTemplate.isPublic ? 'Delad med alla' : 'Privat'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Skapad:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(selectedTemplate.createdAt), 'PPP', { locale: sv })}
                  </p>
                </div>
                {selectedTemplate.lastUsedAt && (
                  <div>
                    <span className="text-sm font-medium">Senast använd:</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(selectedTemplate.lastUsedAt), 'PPP', { locale: sv })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                Stäng
              </Button>
              <Button 
                onClick={() => {
                  handleUseTemplate(selectedTemplate.id);
                  setSelectedTemplate(null);
                }}
                data-testid="button-use-template-detail"
              >
                <Download className="h-4 w-4 mr-2" />
                Använd Mall
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
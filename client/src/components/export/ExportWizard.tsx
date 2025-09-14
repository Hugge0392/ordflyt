import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Users, 
  Package, 
  BarChart3,
  Calendar,
  Settings,
  Eye,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Filter,
  Palette,
  FileSpreadsheet,
  Database
} from 'lucide-react';

const exportSchema = z.object({
  exportType: z.enum(['student_progress_report', 'parent_meeting_report', 'class_data_backup', 'administrative_report']),
  format: z.enum(['pdf', 'csv', 'excel', 'json']),
  title: z.string().min(1, 'Titel krävs'),
  description: z.string().optional(),
  classIds: z.array(z.string()).min(1, 'Minst en klass måste väljas'),
  studentIds: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  dataFields: z.array(z.string()),
  customization: z.object({
    showCharts: z.boolean().default(true),
    showProgressGraphs: z.boolean().default(true),
    includeSummary: z.boolean().default(true),
    includeRecommendations: z.boolean().default(true),
    colorScheme: z.enum(['default', 'professional', 'colorful', 'monochrome']).default('professional'),
    customTitle: z.string().optional(),
    customHeader: z.string().optional(),
    customFooter: z.string().optional(),
  }),
  filterCriteria: z.object({
    assignmentTypes: z.array(z.string()).optional(),
    progressStatus: z.array(z.string()).optional(),
    scoreThreshold: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
    includeInactive: z.boolean().default(false),
    includeFeedback: z.boolean().default(true),
    language: z.enum(['sv', 'en']).default('sv'),
  }),
});

type ExportFormData = z.infer<typeof exportSchema>;

interface ExportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  templateId?: string;
}

interface ClassData {
  id: string;
  name: string;
  studentCount: number;
  students?: { id: string; name: string; username: string }[];
}

const WIZARD_STEPS = [
  { id: 'type', title: 'Exporttyp', description: 'Välj vad du vill exportera' },
  { id: 'scope', title: 'Omfattning', description: 'Välj klasser och elever' },
  { id: 'filters', title: 'Filter', description: 'Filtrera data' },
  { id: 'customization', title: 'Anpassning', description: 'Utseende och innehåll' },
  { id: 'review', title: 'Granska', description: 'Granska och starta export' },
];

const EXPORT_TYPES = [
  {
    id: 'student_progress_report',
    title: 'Elevframstegsrapporter',
    description: 'Individuella rapporter för föräldramöten med prestationsdata',
    icon: Users,
    formats: ['pdf'],
    estimatedTime: '2-5 min per elev',
  },
  {
    id: 'parent_meeting_report',
    title: 'Föräldramötesrapporter',
    description: 'Detaljerade rapporter för strukturerade föräldramöten',
    icon: FileText,
    formats: ['pdf'],
    estimatedTime: '3-8 min per elev',
  },
  {
    id: 'class_data_backup',
    title: 'Klassdatabackup',
    description: 'Komplett backup av klassdata för administrativ användning',
    icon: Package,
    formats: ['csv', 'excel', 'json'],
    estimatedTime: '1-3 min per klass',
  },
  {
    id: 'administrative_report',
    title: 'Administrativa Rapporter',
    description: 'Sammanfattande rapporter för skoladministration',
    icon: BarChart3,
    formats: ['pdf', 'excel'],
    estimatedTime: '2-4 min',
  },
];

const DATA_FIELDS = {
  student_info: { label: 'Elevinformation', required: true },
  performance_metrics: { label: 'Prestationsmetrik', required: true },
  assignment_history: { label: 'Uppgiftshistorik', required: false },
  time_tracking: { label: 'Tidsspårning', required: false },
  feedback_history: { label: 'Feedbackhistorik', required: false },
  progress_trends: { label: 'Framstegstrender', required: false },
  teacher_comments: { label: 'Lärarkommentarer', required: false },
  learning_objectives: { label: 'Lärandemål', required: false },
};

export default function ExportWizard({ isOpen, onClose, templateId }: ExportWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ExportFormData>({
    resolver: zodResolver(exportSchema),
    defaultValues: {
      exportType: 'student_progress_report',
      format: 'pdf',
      title: '',
      description: '',
      classIds: [],
      studentIds: [],
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
      dataFields: ['student_info', 'performance_metrics'],
      customization: {
        showCharts: true,
        showProgressGraphs: true,
        includeSummary: true,
        includeRecommendations: true,
        colorScheme: 'professional',
      },
      filterCriteria: {
        includeInactive: false,
        includeFeedback: true,
        language: 'sv',
      },
    },
  });

  // Fetch teacher's classes
  const { data: classes, isLoading: classesLoading } = useQuery<ClassData[]>({
    queryKey: ['/api/teacher/classes'],
  });

  // Load template if provided
  const { data: template } = useQuery({
    queryKey: ['/api/exports/templates', templateId],
    enabled: !!templateId,
  });

  // Submit export request
  const exportMutation = useMutation({
    mutationFn: async (data: ExportFormData) => {
      return apiRequest('POST', '/api/exports', data);
    },
    onSuccess: () => {
      toast({
        title: 'Export startad',
        description: 'Din export bearbetas i bakgrunden. Du kommer att få en notifikation när den är klar.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/exports'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Export misslyckades',
        description: error.message || 'Ett fel uppstod vid export',
        variant: 'destructive',
      });
    },
  });

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (data: ExportFormData) => {
    setIsSubmitting(true);
    try {
      await exportMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedExportType = form.watch('exportType');
  const watchedFormat = form.watch('format');
  const watchedClassIds = form.watch('classIds');

  const selectedExportType = EXPORT_TYPES.find(type => type.id === watchedExportType);
  const availableFormats = selectedExportType?.formats || [];

  // Auto-update format if current format is not available for selected type
  if (watchedFormat && !availableFormats.includes(watchedFormat)) {
    form.setValue('format', availableFormats[0] as any);
  }

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Exportguide
          </DialogTitle>
          <DialogDescription>
            Steg {currentStep + 1} av {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep].title}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          {WIZARD_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${index <= currentStep 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }
              `}>
                {index < currentStep ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < WIZARD_STEPS.length - 1 && (
                <div className={`
                  w-12 h-0.5 mx-2
                  ${index < currentStep ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
                `} />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            
            {/* Step 1: Export Type */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Välj Exporttyp</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Vad vill du exportera? Olika typer har olika format och anpassningsmöjligheter.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="exportType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                          {EXPORT_TYPES.map((type) => {
                            const Icon = type.icon;
                            return (
                              <div key={type.id}>
                                <RadioGroupItem
                                  value={type.id}
                                  id={type.id}
                                  className="peer sr-only"
                                />
                                <Label
                                  htmlFor={type.id}
                                  className="flex flex-col space-y-2 rounded-lg border-2 border-gray-200 p-4 hover:bg-gray-50 peer-data-[state=checked]:border-blue-600 cursor-pointer dark:border-gray-700 dark:hover:bg-gray-800"
                                  data-testid={`option-export-type-${type.id}`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <Icon className="h-6 w-6 text-blue-600" />
                                    <div>
                                      <h4 className="font-semibold">{type.title}</h4>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {type.description}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center mt-2">
                                    <div className="flex gap-1">
                                      {type.formats.map(format => (
                                        <Badge key={format} variant="outline" className="text-xs">
                                          {format.toUpperCase()}
                                        </Badge>
                                      ))}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      <Clock className="h-3 w-3 inline mr-1" />
                                      {type.estimatedTime}
                                    </span>
                                  </div>
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedExportType && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle>Format</CardTitle>
                      <CardDescription>
                        Välj i vilket format du vill exportera data
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="format"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex gap-4"
                              >
                                {availableFormats.map((format) => (
                                  <div key={format} className="flex items-center space-x-2">
                                    <RadioGroupItem value={format} id={format} />
                                    <Label htmlFor={format} className="cursor-pointer">
                                      {format.toUpperCase()}
                                    </Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 2: Scope Selection */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Välj Omfattning</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Välj vilka klasser och elever som ska inkluderas i exporten
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titel</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="T.ex. Föräldramötesrapporter Vecka 12" 
                          {...field} 
                          data-testid="input-export-title"
                        />
                      </FormControl>
                      <FormDescription>
                        Ge din export en beskrivande titel
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beskrivning (valfritt)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Beskriv syftet med denna export..."
                          {...field}
                          data-testid="input-export-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="classIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Klasser</FormLabel>
                      <FormDescription>
                        Välj en eller flera klasser att exportera
                      </FormDescription>
                      <FormControl>
                        <div className="space-y-2" data-testid="checkbox-group-classes">
                          {classes?.map((classItem) => (
                            <div key={classItem.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={classItem.id}
                                checked={field.value.includes(classItem.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, classItem.id]);
                                  } else {
                                    field.onChange(field.value.filter(id => id !== classItem.id));
                                  }
                                }}
                              />
                              <Label htmlFor={classItem.id} className="cursor-pointer">
                                {classItem.name} ({classItem.studentCount} elever)
                              </Label>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dateRange.start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Startdatum</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            data-testid="input-date-start"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateRange.end"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slutdatum</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            data-testid="input-date-end"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Filters */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Filtrera Data</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Välj vilken data som ska inkluderas i exporten
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="dataFields"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Datafält</FormLabel>
                      <FormDescription>
                        Välj vilka datafält som ska inkluderas
                      </FormDescription>
                      <FormControl>
                        <div className="grid grid-cols-2 gap-2" data-testid="checkbox-group-data-fields">
                          {Object.entries(DATA_FIELDS).map(([key, config]) => (
                            <div key={key} className="flex items-center space-x-2">
                              <Checkbox
                                id={key}
                                checked={field.value.includes(key)}
                                disabled={config.required}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, key]);
                                  } else {
                                    field.onChange(field.value.filter(f => f !== key));
                                  }
                                }}
                              />
                              <Label htmlFor={key} className="cursor-pointer text-sm">
                                {config.label}
                                {config.required && (
                                  <Badge variant="outline" className="ml-1 text-xs">
                                    Krävs
                                  </Badge>
                                )}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="filterCriteria.includeInactive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Inkludera inaktiva elever</FormLabel>
                          <FormDescription className="text-xs">
                            Inkludera elever som inte varit aktiva nyligen
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="filterCriteria.includeFeedback"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Inkludera feedback</FormLabel>
                          <FormDescription className="text-xs">
                            Inkludera lärarfeedback och kommentarer
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Customization */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Anpassning</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Anpassa utseende och innehåll för din export
                  </p>
                </div>

                {watchedFormat === 'pdf' && (
                  <>
                    <FormField
                      control={form.control}
                      name="customization.colorScheme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Färgschema</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger data-testid="select-color-scheme">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="professional">Professionell</SelectItem>
                                <SelectItem value="colorful">Färgglad</SelectItem>
                                <SelectItem value="default">Standard</SelectItem>
                                <SelectItem value="monochrome">Svartvit</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customization.showCharts"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Visa diagram</FormLabel>
                              <FormDescription className="text-xs">
                                Inkludera prestationsdiagram
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customization.showProgressGraphs"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Visa framstegsgrafer</FormLabel>
                              <FormDescription className="text-xs">
                                Inkludera tidsbaserade framstegsgrafer
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customization.includeSummary"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Inkludera sammanfattning</FormLabel>
                              <FormDescription className="text-xs">
                                Lägg till sammanfattande sektion
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customization.includeRecommendations"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Inkludera rekommendationer</FormLabel>
                              <FormDescription className="text-xs">
                                Lägg till förbättringsförslag
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="customization.customTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Anpassad titel (valfritt)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="T.ex. Malmö Grundskola - Elevrapporter"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Anpassad titel som visas på rapporter
                            </FormDescription>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customization.customHeader"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Anpassad rubrik (valfritt)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Anpassad text som visas överst på varje sida..."
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 5: Review */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Granska och Starta</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Granska dina inställningar innan du startar exporten
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Exportsammanfattning
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium">Typ:</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedExportType?.title}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Format:</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {watchedFormat.toUpperCase()}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Klasser:</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {watchedClassIds.length} {watchedClassIds.length === 1 ? 'klass' : 'klasser'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Beräknad tid:</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedExportType?.estimatedTime}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <span className="text-sm font-medium">Valda datafält:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {form.watch('dataFields').map(field => (
                          <Badge key={field} variant="outline" className="text-xs">
                            {DATA_FIELDS[field as keyof typeof DATA_FIELDS]?.label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {form.watch('customization.showCharts') && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Diagram inkluderade
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium">Viktigt att komma ihåg:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1 text-gray-600 dark:text-gray-400">
                          <li>Exporten kommer att bearbetas i bakgrunden</li>
                          <li>Du får en notifikation när den är klar</li>
                          <li>Exportfiler raderas automatiskt efter 7 dagar</li>
                          <li>Stora exporter kan ta flera minuter att slutföra</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                data-testid="button-previous"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Föregående
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  data-testid="button-cancel"
                >
                  Avbryt
                </Button>

                {currentStep < WIZARD_STEPS.length - 1 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    data-testid="button-next"
                  >
                    Nästa
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    data-testid="button-start-export"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Startar...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Starta Export
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
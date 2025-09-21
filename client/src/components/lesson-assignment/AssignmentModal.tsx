import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { CalendarIcon, Users, User, Clock, Target, AlertCircle, BookOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  type: string;
  lessonType: string;
  category: string;
  difficulty?: string;
  estimatedDuration?: number;
}

interface ClassData {
  id: string;
  name: string;
  term?: string;
  description?: string;
  students: StudentData[];
}

interface StudentData {
  id: string;
  username: string;
  studentName: string;
  classId: string;
  className: string;
}

interface AssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessons: Lesson[];
}

interface AssignmentFormData {
  title: string;
  description?: string;
  assignmentType: 'practice' | 'test' | 'homework';
  assignmentTarget: 'class' | 'individual';
  classId?: string;
  studentIds?: string[];
  dueDate?: Date;
  timeLimit?: number;
  maxAttempts?: number;
  showProgress: boolean;
  allowLateSubmission: boolean;
  immediateCorrection: boolean;
  requireCompletion: boolean;
}

const ASSIGNMENT_TYPE_LABELS = {
  'practice': 'Övning',
  'test': 'Test',
  'homework': 'Hemläxa'
};

export function AssignmentModal({ open, onOpenChange, lessons }: AssignmentModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<AssignmentFormData>({
    title: '',
    description: '',
    assignmentType: 'practice',
    assignmentTarget: 'class',
    showProgress: true,
    allowLateSubmission: true,
    immediateCorrection: true,
    requireCompletion: false,
  });
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch teacher's classes
  const { data: classesData, isLoading: isLoadingClasses } = useQuery<{ classes: ClassData[] }>({
    queryKey: ['/api/license/classes'],
    initialData: { classes: [] },
    enabled: open,
  });

  const classes = classesData?.classes || [];
  const selectedClass = classes.find(c => c.id === formData.classId);

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (assignmentData: any) => {
      return apiRequest('POST', '/api/assignments', assignmentData);
    },
    onSuccess: () => {
      toast({
        title: 'Uppgift tilldelad',
        description: 'Lektionerna har tilldelats eleverna framgångsrikt.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Kunde inte tilldela uppgift',
        description: error.message || 'Ett fel uppstod vid tilldelning av uppgiften.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      title: '',
      description: '',
      assignmentType: 'practice',
      assignmentTarget: 'class',
      showProgress: true,
      allowLateSubmission: true,
      immediateCorrection: true,
      requireCompletion: false,
    });
    setSelectedStudents(new Set());
  };

  const updateFormData = (updates: Partial<AssignmentFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleStudentToggle = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSubmit = async () => {
    if (lessons.length === 0) {
      toast({
        title: 'Inga lektioner valda',
        description: 'Välj minst en lektion att tilldela.',
        variant: 'destructive',
      });
      return;
    }

    const assignmentData = {
      title: formData.title || `${lessons.map(l => l.title).join(', ')}`,
      description: formData.description,
      assignmentType: formData.assignmentType,
      
      // Target assignment
      ...(formData.assignmentTarget === 'class' ? 
        { classId: formData.classId } : 
        { studentIds: Array.from(selectedStudents) }
      ),
      
      // Lesson data
      lessonIds: lessons.map(l => l.id),
      lessonType: lessons[0]?.type || 'published_lesson',
      
      // Settings
      dueDate: formData.dueDate?.toISOString(),
      timeLimit: formData.timeLimit,
      maxAttempts: formData.maxAttempts,
      settings: {
        showProgress: formData.showProgress,
        allowLateSubmission: formData.allowLateSubmission,
        immediateCorrection: formData.immediateCorrection,
        requireCompletion: formData.requireCompletion,
      },
      
      isActive: true,
    };

    createAssignmentMutation.mutate(assignmentData);
  };

  const canProceedToStep2 = () => {
    if (formData.assignmentTarget === 'class') {
      return !!formData.classId;
    } else {
      return selectedStudents.size > 0;
    }
  };

  const canSubmit = () => {
    return canProceedToStep2() && lessons.length > 0;
  };

  const totalEstimatedTime = lessons.reduce((sum, lesson) => sum + (lesson.estimatedDuration || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-assignment">
        <DialogHeader>
          <DialogTitle data-testid="text-assignment-title">
            Tilldela lektioner
          </DialogTitle>
          <DialogDescription>
            Steg {currentStep} av 2: {currentStep === 1 ? 'Välj mottagare och grundinställningar' : 'Konfigurera uppgiftsinställningar'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Lessons Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Valda lektioner ({lessons.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-2">
                {lessons.map((lesson) => (
                  <Badge key={lesson.id} variant="secondary" className="text-xs">
                    {lesson.title}
                  </Badge>
                ))}
              </div>
              {totalEstimatedTime > 0 && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Beräknad tid: {totalEstimatedTime} minuter
                </p>
              )}
            </CardContent>
          </Card>

          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Assignment Target */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Tilldela till</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Card 
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      formData.assignmentTarget === 'class' && "ring-2 ring-primary border-primary"
                    )}
                    onClick={() => updateFormData({ assignmentTarget: 'class' })}
                    data-testid="card-target-class"
                  >
                    <CardHeader className="text-center">
                      <Users className="h-8 w-8 mx-auto text-muted-foreground" />
                      <CardTitle className="text-base">Hela klasser</CardTitle>
                      <CardDescription>Tilldela till alla elever i en eller flera klasser</CardDescription>
                    </CardHeader>
                  </Card>
                  
                  <Card 
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      formData.assignmentTarget === 'individual' && "ring-2 ring-primary border-primary"
                    )}
                    onClick={() => updateFormData({ assignmentTarget: 'individual' })}
                    data-testid="card-target-individual"
                  >
                    <CardHeader className="text-center">
                      <User className="h-8 w-8 mx-auto text-muted-foreground" />
                      <CardTitle className="text-base">Individuella elever</CardTitle>
                      <CardDescription>Tilldela till specifika elever från olika klasser</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </div>

              {/* Class/Student Selection */}
              {formData.assignmentTarget === 'class' ? (
                <div className="space-y-3">
                  <Label htmlFor="class-select">Välj klass</Label>
                  <Select value={formData.classId} onValueChange={(value) => updateFormData({ classId: value })}>
                    <SelectTrigger data-testid="select-class">
                      <SelectValue placeholder="Välj en klass..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((classData) => (
                        <SelectItem key={classData.id} value={classData.id}>
                          {classData.name} ({classData.students.length} elever)
                          {classData.term && ` - ${classData.term}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedClass && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Elever i {selectedClass.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {selectedClass.students.map((student) => (
                            <Badge key={student.id} variant="outline" className="text-xs">
                              {student.studentName}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Label>Välj elever</Label>
                  <div className="space-y-4">
                    {classes.map((classData) => (
                      <Card key={classData.id}>
                        <CardHeader>
                          <CardTitle className="text-sm flex justify-between items-center">
                            {classData.name}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const classStudents = new Set(classData.students.map(s => s.id));
                                const allSelected = classData.students.every(s => selectedStudents.has(s.id));
                                const newSelected = new Set(selectedStudents);
                                
                                if (allSelected) {
                                  classData.students.forEach(s => newSelected.delete(s.id));
                                } else {
                                  classData.students.forEach(s => newSelected.add(s.id));
                                }
                                
                                setSelectedStudents(newSelected);
                              }}
                              data-testid={`button-toggle-class-${classData.id}`}
                            >
                              {classData.students.every(s => selectedStudents.has(s.id)) ? 'Avmarkera alla' : 'Markera alla'}
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {classData.students.map((student) => (
                              <div key={student.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`student-${student.id}`}
                                  checked={selectedStudents.has(student.id)}
                                  onCheckedChange={() => handleStudentToggle(student.id)}
                                  data-testid={`checkbox-student-${student.id}`}
                                />
                                <Label htmlFor={`student-${student.id}`} className="text-sm">
                                  {student.studentName}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic Settings */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Grundinställningar</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assignment-type">Uppgiftstyp</Label>
                    <Select 
                      value={formData.assignmentType} 
                      onValueChange={(value: 'practice' | 'test' | 'homework') => 
                        updateFormData({ assignmentType: value })
                      }
                    >
                      <SelectTrigger data-testid="select-assignment-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="practice">Övning</SelectItem>
                        <SelectItem value="test">Test</SelectItem>
                        <SelectItem value="homework">Hemläxa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due-date">Slutdatum (valfritt)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.dueDate && "text-muted-foreground"
                          )}
                          data-testid="button-due-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dueDate ? format(formData.dueDate, 'PPP', { locale: sv }) : "Välj datum"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.dueDate}
                          onSelect={(date) => updateFormData({ dueDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Titel (valfri)</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateFormData({ title: e.target.value })}
                    placeholder="Ange en titel för uppgiften..."
                    data-testid="input-title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Beskrivning (valfri)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData({ description: e.target.value })}
                    placeholder="Lägg till instruktioner eller kommentarer för eleverna..."
                    rows={3}
                    data-testid="textarea-description"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Advanced Settings */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Avancerade inställningar</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="time-limit">Tidsgräns (minuter, valfri)</Label>
                    <Input
                      id="time-limit"
                      type="number"
                      value={formData.timeLimit || ''}
                      onChange={(e) => updateFormData({ timeLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Ingen tidsgräns"
                      min="1"
                      data-testid="input-time-limit"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-attempts">Max antal försök (valfri)</Label>
                    <Input
                      id="max-attempts"
                      type="number"
                      value={formData.maxAttempts || ''}
                      onChange={(e) => updateFormData({ maxAttempts: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Obegränsat"
                      min="1"
                      data-testid="input-max-attempts"
                    />
                  </div>
                </div>

                <Separator />

                {/* Feature Toggles */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-progress">Visa framsteg för eleverna</Label>
                      <p className="text-sm text-muted-foreground">Låt eleverna se sin framsteg under uppgiften</p>
                    </div>
                    <Switch
                      id="show-progress"
                      checked={formData.showProgress}
                      onCheckedChange={(checked) => updateFormData({ showProgress: checked })}
                      data-testid="switch-show-progress"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="allow-late">Tillåt sen inlämning</Label>
                      <p className="text-sm text-muted-foreground">Elever kan slutföra uppgiften även efter slutdatum</p>
                    </div>
                    <Switch
                      id="allow-late"
                      checked={formData.allowLateSubmission}
                      onCheckedChange={(checked) => updateFormData({ allowLateSubmission: checked })}
                      data-testid="switch-allow-late"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="immediate-correction">Omedelbar rättning</Label>
                      <p className="text-sm text-muted-foreground">Visa rätt svar direkt efter varje fråga</p>
                    </div>
                    <Switch
                      id="immediate-correction"
                      checked={formData.immediateCorrection}
                      onCheckedChange={(checked) => updateFormData({ immediateCorrection: checked })}
                      data-testid="switch-immediate-correction"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="require-completion">Kräv fullständig genomgång</Label>
                      <p className="text-sm text-muted-foreground">Elever måste slutföra alla delar för att få betyg</p>
                    </div>
                    <Switch
                      id="require-completion"
                      checked={formData.requireCompletion}
                      onCheckedChange={(checked) => updateFormData({ requireCompletion: checked })}
                      data-testid="switch-require-completion"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(currentStep - 1)}
                  data-testid="button-previous"
                >
                  Föregående
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Avbryt
              </Button>
              
              {currentStep === 1 ? (
                <Button 
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedToStep2()}
                  data-testid="button-next"
                >
                  Nästa
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={!canSubmit() || createAssignmentMutation.isPending}
                  data-testid="button-submit"
                >
                  {createAssignmentMutation.isPending ? 'Tilldelar...' : 'Tilldela uppgift'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Plus, Users, Download, Eye, Calendar, Key, Copy, CheckCircle, AlertCircle, ChevronDown, ChevronRight, Loader2, Edit2, Trash2, RotateCcw, Archive, Filter, Settings, UserPlus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

const createClassSchema = z.object({
  name: z.string().min(1, 'Klassnamn krävs').max(255, 'Klassnamn för långt'),
  term: z.string().optional(),
  description: z.string().optional(),
});

const addStudentsSchema = z.object({
  studentNames: z.array(z.string().min(1, 'Elevnamn krävs')).min(1, 'Minst en elev krävs'),
});

const editStudentSchema = z.object({
  name: z.string().min(1, 'Namn krävs').max(255, 'Namn för långt'),
});

const editClassSchema = z.object({
  name: z.string().min(1, 'Klassnamn krävs').max(255, 'Klassnamn för långt'),
});

type CreateClassForm = z.infer<typeof createClassSchema>;
type AddStudentsForm = z.infer<typeof addStudentsSchema>;
type EditStudentForm = z.infer<typeof editStudentSchema>;
type EditClassForm = z.infer<typeof editClassSchema>;

export default function TeacherClassesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddStudentsDialogOpen, setIsAddStudentsDialogOpen] = useState(false);
  const [isEditStudentDialogOpen, setIsEditStudentDialogOpen] = useState(false);
  const [isEditClassDialogOpen, setIsEditClassDialogOpen] = useState(false);
  const [generateCodeDialog, setGenerateCodeDialog] = useState<string | null>(null);
  const [createdClass, setCreatedClass] = useState<any>(null);
  
  // Form states
  const [studentNamesText, setStudentNamesText] = useState('');
  const [addStudentNamesText, setAddStudentNamesText] = useState('');
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  
  // UI states
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [showArchivedClasses, setShowArchivedClasses] = useState(false);

  // Kontrollera licensstatus först
  const { data: licenseStatus, isLoading: isCheckingLicense } = useQuery({
    queryKey: ['/api/license/status'],
    retry: false,
  });

  // Hämta lärarens klasser
  const { data: classesData, isLoading: isLoadingClasses } = useQuery({
    queryKey: ['/api/license/classes'],
    enabled: (licenseStatus as any)?.hasLicense === true,
  });

  // Hämta elever för expanderad klass
  const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['/api/license/classes', expandedClassId, 'students'],
    enabled: !!expandedClassId,
  });

  // Forms
  const form = useForm<CreateClassForm>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      name: '',
      term: '',
      description: '',
    },
  });

  const editStudentForm = useForm<EditStudentForm>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: {
      name: '',
    },
  });

  const editClassForm = useForm<EditClassForm>({
    resolver: zodResolver(editClassSchema),
    defaultValues: {
      name: '',
    },
  });

  // Mutations
  const createClassMutation = useMutation({
    mutationFn: async (data: CreateClassForm) => {
      return apiRequest('POST', '/api/license/classes', data);
    },
    onSuccess: (data) => {
      setCreatedClass(data);
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/license/classes'] });
      form.reset();
      setStudentNamesText('');
      toast({
        title: 'Klass skapad!',
        description: `Klass "${(data as any).class.name}" med ${(data as any).students.length} elever har skapats.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel vid skapande',
        description: error.message || 'Kunde inte skapa klassen. Försök igen.',
        variant: 'destructive',
      });
    },
  });

  const addStudentsMutation = useMutation({
    mutationFn: async ({ classId, studentNames }: { classId: string; studentNames: string[] }) => {
      return apiRequest('POST', `/api/license/classes/${classId}/students`, { studentNames });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/license/classes', variables.classId, 'students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/license/classes'] });
      setIsAddStudentsDialogOpen(false);
      setAddStudentNamesText('');
      setSelectedClassForStudents(null);
      toast({
        title: 'Elever tillagda!',
        description: `${(data as any).students.length} elever har lagts till i klassen.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel vid tillägg',
        description: error.message || 'Kunde inte lägga till eleverna. Försök igen.',
        variant: 'destructive',
      });
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: async ({ studentId, updates }: { studentId: string; updates: { name?: string; isActive?: boolean } }) => {
      return apiRequest('PATCH', `/api/license/students/${studentId}`, updates);
    },
    onSuccess: (data, variables) => {
      // Optimistic update
      const classId = expandedClassId;
      if (classId) {
        queryClient.setQueryData(['/api/license/classes', classId, 'students'], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            students: old.students.map((student: any) => 
              student.id === variables.studentId ? { ...student, ...variables.updates } : student
            )
          };
        });
      }
      
      setIsEditStudentDialogOpen(false);
      setSelectedStudent(null);
      editStudentForm.reset();
      toast({
        title: 'Elev uppdaterad!',
        description: 'Elevens information har uppdaterats.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel vid uppdatering',
        description: error.message || 'Kunde inte uppdatera eleven. Försök igen.',
        variant: 'destructive',
      });
    },
  });

  const generateSetupCodeMutation = useMutation({
    mutationFn: async (studentId: string) => {
      return apiRequest('POST', `/api/license/students/${studentId}/generate-setup-code`);
    },
    onSuccess: (data, studentId) => {
      setGenerateCodeDialog(null);
      toast({
        title: 'Ny engångskod genererad!',
        description: `Engångskod för eleven: ${(data as any).setupCode}`,
        duration: 10000,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel vid kodgenerering',
        description: error.message || 'Kunde inte generera ny engångskod. Försök igen.',
        variant: 'destructive',
      });
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: async ({ classId, updates }: { classId: string; updates: { name?: string; isArchived?: boolean } }) => {
      return apiRequest('PATCH', `/api/license/classes/${classId}`, updates);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/license/classes'] });
      setIsEditClassDialogOpen(false);
      setSelectedClass(null);
      editClassForm.reset();
      toast({
        title: 'Klass uppdaterad!',
        description: 'Klassens information har uppdaterats.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel vid uppdatering',
        description: error.message || 'Kunde inte uppdatera klassen. Försök igen.',
        variant: 'destructive',
      });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      return apiRequest('DELETE', `/api/license/students/${studentId}`);
    },
    onSuccess: (data, studentId) => {
      // Optimistic update
      const classId = expandedClassId;
      if (classId) {
        queryClient.setQueryData(['/api/license/classes', classId, 'students'], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            students: old.students.filter((student: any) => student.id !== studentId)
          };
        });
      }
      
      toast({
        title: 'Elev borttagen!',
        description: 'Eleven har tagits bort från klassen.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel vid borttagning',
        description: error.message || 'Kunde inte ta bort eleven. Försök igen.',
        variant: 'destructive',
      });
    },
  });

  const handleCreateClass = (data: CreateClassForm) => {
    // Konvertera text till array av namn
    const studentNames = studentNamesText
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (studentNames.length === 0) {
      toast({
        title: 'Inga elever',
        description: 'Du måste lägga till minst en elev.',
        variant: 'destructive',
      });
      return;
    }

    const formData = {
      ...data,
      studentNames,
    };

    createClassMutation.mutate(formData);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Kopierat!',
        description: 'Text kopierad till urklipp.',
      });
    } catch (error) {
      toast({
        title: 'Kunde inte kopiera',
        description: 'Markera och kopiera texten manuellt.',
        variant: 'destructive',
      });
    }
  };

  const toggleStudentsList = (classId: string) => {
    setExpandedClassId(expandedClassId === classId ? null : classId);
  };

  const downloadStudentCredentials = (classData: any) => {
    const csvContent = [
      ['Elevnamn', 'Användarnamn', 'Engångskod'],
      ...classData.students.map((student: any) => [
        student.studentName,
        student.username,
        student.setupCode,
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${classData.class.name}_elevuppgifter.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isCheckingLicense) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Kontrollerar licens...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!(licenseStatus as any)?.hasLicense) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-800">Licens krävs</CardTitle>
            </div>
            <CardDescription>
              Du behöver en aktiv lärarlicens för att hantera klasser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/license">
              <Button className="w-full">
                <Key className="h-4 w-4 mr-2" />
                Aktivera licens
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/teacher" className="hover:text-blue-600 flex items-center space-x-1">
              <ArrowLeft className="h-4 w-4" />
              <span>Tillbaka till lärarpanel</span>
            </Link>
          </div>
          <Link href="/license" className="text-sm text-blue-600 hover:underline">
            Licenshantering
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Klasshantering</h1>
          <p className="text-gray-600">Skapa och hantera dina klasser och elevers konton</p>
        </div>

        {/* Huvudinnehåll */}
        <div className="space-y-6">
          {/* Klass kontroller */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Licens aktiv
              </Badge>
              {(classesData as any)?.classes && (
                <div className="flex items-center space-x-4">
                  <p className="text-sm text-gray-600">
                    {(classesData as any).classes.filter((c: any) => !c.isArchived).length} aktiva klasser
                  </p>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={showArchivedClasses}
                      onCheckedChange={setShowArchivedClasses}
                      id="show-archived"
                      data-testid="switch-show-archived"
                    />
                    <label htmlFor="show-archived" className="text-sm text-gray-600">
                      Visa arkiverade
                    </label>
                  </div>
                </div>
              )}
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-class">
                  <Plus className="h-4 w-4 mr-2" />
                  Skapa ny klass
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Skapa ny klass</DialogTitle>
                  <DialogDescription>
                    Ange klassens information och lägg till eleverna. Användarnamn och engångskoder genereras automatiskt.
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateClass)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Klassnamn *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="t.ex. 5A, Ma3c, Svenska B"
                                {...field}
                                data-testid="input-class-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="term"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Termin (valfritt)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="t.ex. VT 2025, HT 2024"
                                {...field}
                                data-testid="input-term"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Beskrivning (valfritt)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Kort beskrivning av klassen..."
                              className="resize-none"
                              rows={2}
                              {...field}
                              data-testid="input-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <FormLabel>Elevlista *</FormLabel>
                      <Textarea
                        placeholder="Ange elevernas namn, en per rad:&#10;Anna Svensson&#10;Erik Johansson&#10;Maria Andersson"
                        value={studentNamesText}
                        onChange={(e) => setStudentNamesText(e.target.value)}
                        rows={8}
                        className="resize-none"
                        data-testid="input-student-names"
                      />
                      <FormDescription>
                        Ange ett elevnamn per rad. Användarnamn och engångskoder genereras automatiskt.
                      </FormDescription>
                      {studentNamesText && (
                        <p className="text-sm text-gray-600">
                          Antal elever: {studentNamesText.split('\n').filter(name => name.trim().length > 0).length}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Avbryt
                      </Button>
                      <Button
                        type="submit"
                        disabled={createClassMutation.isPending}
                        data-testid="button-submit-class"
                      >
                        {createClassMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Skapar...
                          </>
                        ) : (
                          'Skapa klass'
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Klasser */}
          {isLoadingClasses ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Laddar klasser...</p>
              </CardContent>
            </Card>
          ) : (classesData as any)?.classes?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Inga klasser än</h3>
                <p className="text-gray-600 mb-6">Skapa din första klass för att komma igång med att hantera elever.</p>
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-class">
                  <Plus className="h-4 w-4 mr-2" />
                  Skapa din första klass
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {(classesData as any)?.classes
                ?.filter((classItem: any) => showArchivedClasses || !classItem.isArchived)
                ?.map((classItem: any) => (
                <Card key={classItem.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-xl">{classItem.name}</CardTitle>
                          {classItem.isArchived && (
                            <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-600">
                              <Archive className="h-3 w-3 mr-1" />
                              Arkiverad
                            </Badge>
                          )}
                        </div>
                        <CardDescription>
                          {classItem.term && (
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{classItem.term}</span>
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          Elever
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedClass(classItem);
                            editClassForm.setValue('name', classItem.name);
                            setIsEditClassDialogOpen(true);
                          }}
                          data-testid={`button-edit-class-${classItem.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-archive-class-${classItem.id}`}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {classItem.isArchived ? 'Återställ klass' : 'Arkivera klass'}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {classItem.isArchived 
                                  ? `Är du säker på att du vill återställa klassen "${classItem.name}"? Den kommer att bli aktiv igen.`
                                  : `Är du säker på att du vill arkivera klassen "${classItem.name}"? Elever kan fortfarande logga in men klassen kommer att döljas som standard.`
                                }
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Avbryt</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => updateClassMutation.mutate({
                                  classId: classItem.id,
                                  updates: { isArchived: !classItem.isArchived }
                                })}
                                data-testid={`button-confirm-archive-${classItem.id}`}
                              >
                                {classItem.isArchived ? 'Återställ' : 'Arkivera'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {classItem.description && (
                      <p className="text-gray-600">{classItem.description}</p>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleStudentsList(classItem.id)}
                        data-testid={`button-toggle-students-${classItem.id}`}
                      >
                        {expandedClassId === classItem.id ? (
                          <ChevronDown className="h-4 w-4 mr-1" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mr-1" />
                        )}
                        {expandedClassId === classItem.id ? 'Dölj elever' : 'Visa elever'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedClassForStudents(classItem.id);
                          setIsAddStudentsDialogOpen(true);
                        }}
                        data-testid={`button-add-students-${classItem.id}`}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Lägg till elever
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadStudentCredentials({ class: classItem, students: [] })}
                        data-testid={`button-export-${classItem.id}`}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Exportera uppgifter
                      </Button>
                    </div>

                    {/* Elevlista - visas när klassen är expanderad */}
                    {expandedClassId === classItem.id && (
                      <div className="mt-4 border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">Elever i klassen</h4>
                          {isLoadingStudents && (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                          )}
                        </div>
                        
                        {isLoadingStudents ? (
                          <div className="text-center py-4">
                            <div className="inline-flex items-center space-x-2 text-gray-600">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Laddar elever...</span>
                            </div>
                          </div>
                        ) : (studentsData as any)?.students?.length === 0 ? (
                          <div className="text-center py-4 text-gray-500">
                            <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p>Inga elever i denna klass än</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {(studentsData as any)?.students?.map((student: any) => (
                              <div 
                                key={student.id} 
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                data-testid={`student-item-${student.id}`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    student.isActive !== false ? 'bg-blue-100' : 'bg-gray-100'
                                  }`}>
                                    <span className={`text-sm font-medium ${
                                      student.isActive !== false ? 'text-blue-600' : 'text-gray-400'
                                    }`}>
                                      {student.studentName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <p className={`font-medium ${
                                        student.isActive !== false ? 'text-gray-900' : 'text-gray-500'
                                      }`} data-testid={`student-name-${student.id}`}>
                                        {student.studentName}
                                      </p>
                                      {student.isActive === false && (
                                        <Badge variant="outline" className="text-gray-500 border-gray-300">
                                          Inaktiv
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-500" data-testid={`student-username-${student.id}`}>
                                      Användarnamn: {student.username}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="flex items-center space-x-1">
                                    {student.mustChangePassword && (
                                      <Badge variant="outline" className="text-amber-600 border-amber-200">
                                        Måste ändra lösenord
                                      </Badge>
                                    )}
                                    {student.lastLogin && (
                                      <span className="text-xs text-gray-500">
                                        Senast inloggad: {new Date(student.lastLogin).toLocaleDateString('sv-SE')}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedStudent(student);
                                            editStudentForm.setValue('name', student.studentName);
                                            setIsEditStudentDialogOpen(true);
                                          }}
                                          data-testid={`button-edit-student-${student.id}`}
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Redigera elevnamn</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setGenerateCodeDialog(student.id)}
                                          data-testid={`button-generate-code-${student.id}`}
                                        >
                                          <Key className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Generera ny engångskod för inloggning</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => updateStudentMutation.mutate({
                                            studentId: student.id,
                                            updates: { isActive: !student.isActive }
                                          })}
                                          disabled={updateStudentMutation.isPending}
                                          data-testid={`button-toggle-active-${student.id}`}
                                        >
                                          {updateStudentMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : student.isActive !== false ? (
                                            <Eye className="h-4 w-4" />
                                          ) : (
                                            <Users className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{student.isActive !== false ? 'Deaktivera elev' : 'Aktivera elev'}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <AlertDialog>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              data-testid={`button-delete-student-${student.id}`}
                                            >
                                              <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                          </AlertDialogTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Ta bort elev från klassen</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Ta bort elev</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Är du säker på att du vill ta bort eleven "{student.studentName}" från klassen? 
                                            Denna åtgärd kan inte ångras och eleven kommer att förlora tillgång till systemet.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteStudentMutation.mutate(student.id)}
                                            className="bg-red-600 hover:bg-red-700"
                                            data-testid={`button-confirm-delete-${student.id}`}
                                          >
                                            Ta bort
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm text-gray-600">
                                Totalt: {(studentsData as any)?.students?.length || 0} elever
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-xs text-gray-500">
                      Skapad: {new Date(classItem.createdAt).toLocaleDateString('sv-SE')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Dialog för nyskapad klass */}
        {createdClass && (
          <Dialog open={!!createdClass} onOpenChange={() => setCreatedClass(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-green-800">
                  <CheckCircle className="h-5 w-5 inline mr-2" />
                  Klass "{createdClass.class.name}" skapad!
                </DialogTitle>
                <DialogDescription>
                  Alla elevkonton har skapats automatiskt. Spara eller ladda ner uppgifterna innan du stänger detta fönster.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Viktigt:</strong> Elevernas engångskoder visas bara här en gång. 
                    Ladda ner eller kopiera uppgifterna innan du stänger fönstret.
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => downloadStudentCredentials(createdClass)}
                    data-testid="button-download-credentials"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Ladda ner CSV
                  </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Elevnamn</TableHead>
                        <TableHead>Användarnamn</TableHead>
                        <TableHead>Engångskod</TableHead>
                        <TableHead className="w-24">Kopiera</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {createdClass.students.map((student: any) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.studentName}</TableCell>
                          <TableCell className="font-mono">{student.username}</TableCell>
                          <TableCell className="font-mono">{student.setupCode}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(`${student.username} / ${student.setupCode}`)}
                              data-testid={`button-copy-${student.username}`}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button onClick={() => setCreatedClass(null)}>
                    Stäng
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Add Students Dialog */}
        <Dialog open={isAddStudentsDialogOpen} onOpenChange={setIsAddStudentsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Lägg till elever</DialogTitle>
              <DialogDescription>
                Lägg till nya elever till klassen. Användarnamn och engångskoder genereras automatiskt.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Elevlista</label>
                <Textarea
                  placeholder="Ange elevernas namn, en per rad:&#10;Anna Svensson&#10;Erik Johansson&#10;Maria Andersson"
                  value={addStudentNamesText}
                  onChange={(e) => setAddStudentNamesText(e.target.value)}
                  rows={8}
                  className="resize-none"
                  data-testid="input-add-student-names"
                />
                <p className="text-sm text-gray-600">
                  Ange ett elevnamn per rad. Användarnamn och engångskoder genereras automatiskt.
                </p>
                {addStudentNamesText && (
                  <p className="text-sm text-gray-600">
                    Antal elever: {addStudentNamesText.split('\n').filter(name => name.trim().length > 0).length}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddStudentsDialogOpen(false);
                  setAddStudentNamesText('');
                  setSelectedClassForStudents(null);
                }}
              >
                Avbryt
              </Button>
              <Button
                onClick={() => {
                  const studentNames = addStudentNamesText
                    .split('\n')
                    .map(name => name.trim())
                    .filter(name => name.length > 0);

                  if (studentNames.length === 0) {
                    toast({
                      title: 'Inga elever',
                      description: 'Du måste lägga till minst en elev.',
                      variant: 'destructive',
                    });
                    return;
                  }

                  if (selectedClassForStudents) {
                    addStudentsMutation.mutate({
                      classId: selectedClassForStudents,
                      studentNames
                    });
                  }
                }}
                disabled={addStudentsMutation.isPending}
                data-testid="button-submit-add-students"
              >
                {addStudentsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Lägger till...
                  </>
                ) : (
                  'Lägg till elever'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Student Dialog */}
        <Dialog open={isEditStudentDialogOpen} onOpenChange={setIsEditStudentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Redigera elev</DialogTitle>
              <DialogDescription>
                Uppdatera elevens information.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...editStudentForm}>
              <form onSubmit={editStudentForm.handleSubmit((data) => {
                if (selectedStudent) {
                  updateStudentMutation.mutate({
                    studentId: selectedStudent.id,
                    updates: { name: data.name }
                  });
                }
              })} className="space-y-4">
                <FormField
                  control={editStudentForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Elevnamn</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ange elevens namn"
                          {...field}
                          data-testid="input-edit-student-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditStudentDialogOpen(false);
                      setSelectedStudent(null);
                      editStudentForm.reset();
                    }}
                  >
                    Avbryt
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateStudentMutation.isPending}
                    data-testid="button-submit-edit-student"
                  >
                    {updateStudentMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uppdaterar...
                      </>
                    ) : (
                      'Spara ändringar'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Class Dialog */}
        <Dialog open={isEditClassDialogOpen} onOpenChange={setIsEditClassDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Redigera klass</DialogTitle>
              <DialogDescription>
                Uppdatera klassens namn.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...editClassForm}>
              <form onSubmit={editClassForm.handleSubmit((data) => {
                if (selectedClass) {
                  updateClassMutation.mutate({
                    classId: selectedClass.id,
                    updates: { name: data.name }
                  });
                }
              })} className="space-y-4">
                <FormField
                  control={editClassForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Klassnamn</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ange klassens namn"
                          {...field}
                          data-testid="input-edit-class-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditClassDialogOpen(false);
                      setSelectedClass(null);
                      editClassForm.reset();
                    }}
                  >
                    Avbryt
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateClassMutation.isPending}
                    data-testid="button-submit-edit-class"
                  >
                    {updateClassMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uppdaterar...
                      </>
                    ) : (
                      'Spara ändringar'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Generate Setup Code Confirmation Dialog */}
        {generateCodeDialog && (
          <AlertDialog open={!!generateCodeDialog} onOpenChange={() => setGenerateCodeDialog(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Generera ny engångskod</AlertDialogTitle>
                <AlertDialogDescription>
                  Är du säker på att du vill generera en ny engångskod för denna elev? 
                  Den gamla koden kommer att bli ogiltig och eleven kan använda den nya koden för att logga in och sätta ett nytt lösenord.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => generateSetupCodeMutation.mutate(generateCodeDialog)}
                  data-testid="button-confirm-generate-code"
                >
                  Generera ny kod
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}
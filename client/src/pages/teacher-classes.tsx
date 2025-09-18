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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Users, Download, Eye, Calendar, Key, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

const createClassSchema = z.object({
  name: z.string().min(1, 'Klassnamn krävs').max(255, 'Klassnamn för långt'),
  term: z.string().optional(),
  description: z.string().optional(),
  studentNames: z.array(z.string().min(1)).min(1, 'Minst en elev krävs'),
});

type CreateClassForm = z.infer<typeof createClassSchema>;

export default function TeacherClassesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createdClass, setCreatedClass] = useState<any>(null);
  const [studentNamesText, setStudentNamesText] = useState('');

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

  const form = useForm<CreateClassForm>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      name: '',
      term: '',
      description: '',
      studentNames: [],
    },
  });

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

  const downloadStudentCredentials = (classData: any) => {
    const csvContent = [
      ['Elevnamn', 'Användarnamn', 'Lösenord'],
      ...classData.students.map((student: any) => [
        student.studentName,
        student.username,
        student.clearPassword,
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
          {/* Skapa klass knapp */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Licens aktiv
              </Badge>
              {(classesData as any)?.classes && (
                <p className="text-sm text-gray-600">
                  {(classesData as any).classes.length} {(classesData as any).classes.length === 1 ? 'klass' : 'klasser'}
                </p>
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
                    Ange klassens information och lägg till eleverna. Användarnamn och lösenord genereras automatiskt.
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
                        Ange ett elevnamn per rad. Användarnamn och lösenord genereras automatiskt.
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
              {(classesData as any)?.classes?.map((classItem: any) => (
                <Card key={classItem.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{classItem.name}</CardTitle>
                        <CardDescription>
                          {classItem.term && (
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{classItem.term}</span>
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {/* TODO: Lägg till antal elever från studentAccounts */}
                        Elever
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {classItem.description && (
                      <p className="text-gray-600">{classItem.description}</p>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Visa elever
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Exportera uppgifter
                      </Button>
                    </div>

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
                    <strong>Viktigt:</strong> Elevernas lösenord visas bara här en gång. 
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
                        <TableHead>Lösenord</TableHead>
                        <TableHead className="w-24">Kopiera</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {createdClass.students.map((student: any) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.studentName}</TableCell>
                          <TableCell className="font-mono">{student.username}</TableCell>
                          <TableCell className="font-mono">{student.clearPassword}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(`${student.username} / ${student.clearPassword}`)}
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
      </div>
    </div>
  );
}
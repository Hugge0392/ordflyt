import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Mail, User, School, BookOpen, Phone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const teacherRegistrationSchema = z.object({
  email: z.string().email('Ogiltig email-adress'),
  firstName: z.string().min(1, 'Förnamn krävs').max(255, 'Förnamn för långt'),
  lastName: z.string().min(1, 'Efternamn krävs').max(255, 'Efternamn för långt'),
  schoolName: z.string().min(1, 'Skolnamn krävs').max(255, 'Skolnamn för långt'),
  subject: z.string().optional(),
  phoneNumber: z.string().optional(),
});

type TeacherRegistrationData = z.infer<typeof teacherRegistrationSchema>;

interface TeacherRegistrationProps {
  onSuccess?: () => void;
}

const COMMON_SUBJECTS = [
  'Svenska',
  'Matematik',
  'Engelska',
  'Historia',
  'Geografi',
  'Naturkunskap',
  'Biologi',
  'Kemi',
  'Fysik',
  'Idrott och hälsa',
  'Musik',
  'Bild',
  'Slöjd',
  'Hemkunskap',
  'Teknik',
  'Specialpedagogik',
  'Annet'
];

export default function TeacherRegistration({ onSuccess }: TeacherRegistrationProps) {
  const [registrationStatus, setRegistrationStatus] = useState<'form' | 'success' | 'error'>('form');
  const [successMessage, setSuccessMessage] = useState('');
  const { toast } = useToast();

  const form = useForm<TeacherRegistrationData>({
    resolver: zodResolver(teacherRegistrationSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      schoolName: '',
      subject: '',
      phoneNumber: '',
    }
  });

  const registrationMutation = useMutation({
    mutationFn: async (data: TeacherRegistrationData) => {
      return apiRequest('POST', '/api/auth/teacher/register', data);
    },
    onSuccess: (response: any) => {
      if (response.success) {
        setSuccessMessage(response.message || 'Registrering lyckades!');
        setRegistrationStatus('success');
        onSuccess?.();
        
        toast({
          title: 'Registrering skickad',
          description: 'Kolla din email för verifieringslänk.',
          duration: 5000,
        });
      }
    },
    onError: (error: any) => {
      setRegistrationStatus('error');
      const message = error.message || 'Ett fel uppstod vid registrering';
      
      toast({
        title: 'Registrering misslyckades',
        description: message,
        variant: 'destructive',
      });
    }
  });

  const onSubmit = async (data: TeacherRegistrationData) => {
    registrationMutation.mutate(data);
  };

  if (registrationStatus === 'success') {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-green-800">Registrering mottagen!</CardTitle>
          <CardDescription>Din lärarregistrering har skickats.</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              {successMessage}
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Nästa steg:</strong></p>
            <ol className="list-decimal list-inside text-left space-y-1">
              <li>Kolla din email för verifieringslänk</li>
              <li>Klicka på länken för att verifiera din email</li>
              <li>Få dina inloggningsuppgifter via email</li>
              <li>Logga in och aktivera din licens</li>
            </ol>
          </div>

          <Button 
            variant="outline" 
            onClick={() => setRegistrationStatus('form')}
            data-testid="button-back-to-form"
          >
            Tillbaka till formulär
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center">
          <User className="w-5 h-5" />
          Skapa lärarkonto
        </CardTitle>
        <CardDescription>
          Registrera dig som lärare för att komma igång med Ordflyt.se
        </CardDescription>
      </CardHeader>
      <CardContent>
        {registrationStatus === 'error' && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ett fel uppstod vid registrering. Försök igen.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email-adress *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="email" 
                      placeholder="din.email@skola.se"
                      data-testid="input-email"
                    />
                  </FormControl>
                  <FormDescription>
                    Vi skickar verifieringslänk till denna email
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Förnamn *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Anna"
                        data-testid="input-first-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Efternamn *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Andersson"
                        data-testid="input-last-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* School */}
            <FormField
              control={form.control}
              name="schoolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <School className="w-4 h-4" />
                    Skola *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Skolans namn"
                      data-testid="input-school-name"
                    />
                  </FormControl>
                  <FormDescription>
                    Ange namnet på skolan där du arbetar
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subject */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Ämne (valfritt)
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-subject">
                        <SelectValue placeholder="Välj ditt huvudämne" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COMMON_SUBJECTS.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Telefonnummer (valfritt)
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="tel" 
                      placeholder="070-123 45 67"
                      data-testid="input-phone-number"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={registrationMutation.isPending}
                data-testid="button-submit-registration"
              >
                {registrationMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Registrerar...
                  </>
                ) : (
                  'Skapa konto'
                )}
              </Button>
            </div>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Genom att registrera dig godkänner du våra{' '}
            <a href="/villkor" className="text-blue-600 hover:underline">
              användarvillkor
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Mail, User, School, Eye, EyeOff, Key } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const teacherRegistrationSchema = z.object({
  username: z.string()
    .min(3, 'Användarnamnet måste vara minst 3 tecken')
    .max(50, 'Användarnamnet får inte vara längre än 50 tecken')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Användarnamnet får bara innehålla bokstäver, siffror, _ och -'),
  password: z.string()
    .min(8, 'Lösenordet måste vara minst 8 tecken')
    .regex(/[a-z]/, 'Lösenordet måste innehålla minst en liten bokstav')
    .regex(/[A-Z]/, 'Lösenordet måste innehålla minst en stor bokstav')
    .regex(/[0-9]/, 'Lösenordet måste innehålla minst en siffra'),
  confirmPassword: z.string(),
  email: z.string().email('Ogiltig email-adress'),
  firstName: z.string().min(1, 'Förnamn krävs').max(255, 'Förnamn för långt'),
  lastName: z.string().min(1, 'Efternamn krävs').max(255, 'Efternamn för långt'),
  schoolName: z.string().min(1, 'Skolnamn krävs').max(255, 'Skolnamn för långt'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Lösenorden måste matcha',
  path: ['confirmPassword'],
});

type TeacherRegistrationData = z.infer<typeof teacherRegistrationSchema>;

interface TeacherRegistrationProps {
  onSuccess?: () => void;
}


export default function TeacherRegistration({ onSuccess }: TeacherRegistrationProps) {
  const [registrationStatus, setRegistrationStatus] = useState<'form' | 'success' | 'error'>('form');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<TeacherRegistrationData>({
    resolver: zodResolver(teacherRegistrationSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      email: '',
      firstName: '',
      lastName: '',
      schoolName: '',
    }
  });


  const registrationMutation = useMutation({
    mutationFn: async (data: TeacherRegistrationData) => {
      return apiRequest('POST', '/api/auth/register', data);
    },
    onSuccess: (response: any) => {
      if (response.success) {
        setSuccessMessage(response.message || 'Registrering lyckades!');
        setRegistrationStatus('success');
        onSuccess?.();
        
        toast({
          title: 'Konto skapat!',
          description: 'Du kan nu logga in med dina nya uppgifter.',
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
          <CardTitle className="text-green-800">Konto skapat!</CardTitle>
          <CardDescription>Ditt lärarkonto har skapats framgångsrikt.</CardDescription>
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
              <li>Logga in med ditt användarnamn och lösenord</li>
              <li>Om du har en licens, aktivera den i inställningarna</li>
              <li>Börja skapa lektioner och använda plattformen</li>
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
            {/* Username */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Användarnamn *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      data-testid="input-username"
                    />
                  </FormControl>
                  <FormDescription>
                    3-50 tecken, endast bokstäver, siffror, _ och -
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Lösenord *
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        {...field} 
                        type={showPassword ? "text" : "password"}
                        data-testid="input-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Minst 8 tecken med stor bokstav, liten bokstav och siffra
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm Password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bekräfta lösenord *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        {...field} 
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Upprepa lösenordet"
                        data-testid="input-confirm-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
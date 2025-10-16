import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, CheckCircle, AlertCircle, UserPlus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

const registerSchema = z.object({
  username: z.string()
    .min(3, 'Användarnamn måste vara minst 3 tecken')
    .max(50, 'Användarnamn kan vara max 50 tecken')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Användarnamn får bara innehålla bokstäver, siffror, _ och -'),
  email: z.string().email('Ogiltig e-postadress'),
  password: z.string()
    .min(8, 'Lösenord måste vara minst 8 tecken')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Lösenord måste innehålla minst en stor bokstav, en liten bokstav och en siffra'),
  confirmPassword: z.string(),
  code: z.string().min(1, 'Engångskod krävs'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Lösenorden matchar inte",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [codeFromUrl, setCodeFromUrl] = useState('');
  const { toast } = useToast();

  // Extrahera kod från URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('kod');
    if (code) {
      setCodeFromUrl(code);
    }
  }, []);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      code: codeFromUrl,
    },
  });

  // Uppdatera formuläret när koden från URL är tillgänglig
  useEffect(() => {
    if (codeFromUrl) {
      form.setValue('code', codeFromUrl);
    }
  }, [codeFromUrl, form]);

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const { confirmPassword, ...registerData } = data;
      return apiRequest('POST', '/api/auth/register', registerData);
    },
    onSuccess: () => {
      toast({
        title: 'Konto skapat!',
        description: 'Ditt lärarkonto har skapats framgångsrikt. Du loggas nu in automatiskt.',
      });
      // Vänta lite så användaren ser meddelandet, sedan omdirigera
      setTimeout(() => {
        setLocation('/teacher');
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: 'Registrering misslyckades',
        description: error.message || 'Ett oväntat fel inträffade',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Skapa lärarkonto
          </CardTitle>
          <CardDescription>
            Använd din engångskod för att skapa ditt lärarkonto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registerMutation.isError && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {(registerMutation.error as any)?.message || 'Ett fel inträffade vid registrering'}
              </AlertDescription>
            </Alert>
          )}

          {registerMutation.isSuccess && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Konto skapat! Du omdirigeras till lärarområdet...
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engångskod</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ange din engångskod"
                        {...field}
                        data-testid="input-code"
                      />
                    </FormControl>
                    <FormDescription>
                      Koden du fick från din administratör
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Användarnamn</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ditt användarnamn"
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

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-postadress</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="din.email@exempel.se"
                        {...field}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormDescription>
                      Din e-postadress för kontakt
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lösenord</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"}
                          placeholder="Ditt lösenord"
                          {...field}
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

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bekräfta lösenord</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Upprepa ditt lösenord"
                          {...field}
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

              <Button 
                type="submit" 
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={registerMutation.isPending}
                data-testid="button-register"
              >
                {registerMutation.isPending ? 'Skapar konto...' : 'Skapa konto'}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Har du redan ett konto?{' '}
              <Button 
                variant="link" 
                className="p-0 text-orange-600 hover:text-orange-700"
                onClick={() => setLocation('/login')}
              >
                Logga in här
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
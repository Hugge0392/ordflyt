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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Check, Key, Calendar, AlertCircle, User } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

const redeemCodeSchema = z.object({
  code: z.string()
    .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Koden ska ha formatet XXXX-XXXX-XXXX-XXXX')
    .transform(val => val.toUpperCase()),
});

type RedeemCodeForm = z.infer<typeof redeemCodeSchema>;

export default function LicensePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [redeemSuccess, setRedeemSuccess] = useState<any>(null);

  // Kontrollera licensstatus
  const { data: licenseStatus, isLoading: isCheckingLicense } = useQuery({
    queryKey: ['/api/license/status'],
    retry: false,
  });

  const form = useForm<RedeemCodeForm>({
    resolver: zodResolver(redeemCodeSchema),
    defaultValues: {
      code: '',
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async (data: RedeemCodeForm) => {
      return apiRequest('/api/license/redeem', 'POST', data);
    },
    onSuccess: (data) => {
      setRedeemSuccess(data);
      queryClient.invalidateQueries({ queryKey: ['/api/license/status'] });
      toast({
        title: 'Licens aktiverad!',
        description: 'Din licens har aktiverats framgångsrikt.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel vid inlösen',
        description: error.message || 'Kunde inte lösa in koden. Kontrollera att den är korrekt.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (data: RedeemCodeForm) => {
    redeemMutation.mutate(data);
  };

  const formatCode = (value: string) => {
    // Ta bort allt som inte är bokstäver eller siffror
    const cleaned = value.replace(/[^A-Z0-9]/g, '');
    
    // Lägg till bindestreck var 4:e tecken
    const formatted = cleaned.match(/.{1,4}/g)?.join('-') || cleaned;
    
    return formatted.slice(0, 19); // Max längd XXXX-XXXX-XXXX-XXXX
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Link href="/teacher" className="hover:text-blue-600 flex items-center space-x-1">
            <ArrowLeft className="h-4 w-4" />
            <span>Tillbaka till lärarpanel</span>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Licenshantering</h1>
          <p className="text-gray-600">Aktivera din lärarlicens för att komma igång</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Vänster kolumn - Licensstatus eller inlösen */}
          <div className="space-y-6">
            {(licenseStatus as any)?.hasLicense ? (
              /* Aktiv licens */
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Check className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-green-800">Aktiv licens</CardTitle>
                  </div>
                  <CardDescription className="text-green-700">
                    Din lärarlicens är aktiv och redo att användas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-green-800">Licensnyckel:</p>
                      <p className="text-green-700 font-mono text-xs break-all">
                        {(licenseStatus as any).license.key.slice(0, 16)}...
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-green-800">Status:</p>
                      <Badge variant="default" className="bg-green-600">
                        {(licenseStatus as any).license.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </div>
                    {(licenseStatus as any).license.expiresAt && (
                      <div className="col-span-2">
                        <p className="font-medium text-green-800">Går ut:</p>
                        <p className="text-green-700 flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date((licenseStatus as any).license.expiresAt).toLocaleDateString('sv-SE')}
                          </span>
                        </p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <p className="font-medium text-green-800">Aktiverad:</p>
                      <p className="text-green-700">
                        {new Date((licenseStatus as any).license.createdAt).toLocaleDateString('sv-SE')}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium text-green-800">Nästa steg:</h4>
                    <Link href="/teacher/classes">
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        <User className="h-4 w-4 mr-2" />
                        Hantera klasser och elever
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : redeemSuccess ? (
              /* Nyligen inlöst licens */
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Check className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-green-800">Licens aktiverad!</CardTitle>
                  </div>
                  <CardDescription className="text-green-700">
                    {redeemSuccess.message}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-2">
                    <div>
                      <p className="font-medium text-green-800">Licensnyckel:</p>
                      <p className="text-green-700 font-mono text-xs break-all">
                        {redeemSuccess.license.key.slice(0, 16)}...
                      </p>
                    </div>
                    {redeemSuccess.license.expiresAt && (
                      <div>
                        <p className="font-medium text-green-800">Går ut:</p>
                        <p className="text-green-700">
                          {new Date(redeemSuccess.license.expiresAt).toLocaleDateString('sv-SE')}
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <Link href="/teacher/classes">
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      <User className="h-4 w-4 mr-2" />
                      Skapa din första klass
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              /* Inlösen av kod */
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Key className="h-5 w-5 text-blue-600" />
                    <CardTitle>Lös in licens</CardTitle>
                  </div>
                  <CardDescription>
                    Ange din engångskod för att aktivera din lärarlicens
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Licenskod</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="XXXX-XXXX-XXXX-XXXX"
                                className="text-center font-mono uppercase tracking-wider"
                                {...field}
                                onChange={(e) => {
                                  const formatted = formatCode(e.target.value.toUpperCase());
                                  field.onChange(formatted);
                                }}
                                disabled={redeemMutation.isPending}
                                data-testid="input-license-code"
                              />
                            </FormControl>
                            <FormDescription>
                              Koden ska ha formatet XXXX-XXXX-XXXX-XXXX
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={redeemMutation.isPending}
                        data-testid="button-redeem-license"
                      >
                        {redeemMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Löser in...
                          </>
                        ) : (
                          <>
                            <Key className="h-4 w-4 mr-2" />
                            Lös in licens
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Höger kolumn - Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <span>Om lärarlicenser</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Vad ingår i licensen:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Skapa och hantera klasser</li>
                    <li>• Generera elevkonton automatiskt</li>
                    <li>• Följ elevers framsteg</li>
                    <li>• Skapa anpassade lektioner</li>
                    <li>• Exportera resultat och statistik</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Så fungerar det:</h4>
                  <ol className="space-y-1 text-gray-600">
                    <li>1. Lös in din engångskod</li>
                    <li>2. Skapa din första klass</li>
                    <li>3. Lägg till elever - användarnamn och lösenord genereras automatiskt</li>
                    <li>4. Eleverna kan logga in direkt med sina uppgifter</li>
                  </ol>
                </div>

                <Separator />

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Behöver du hjälp?</strong><br />
                    Kontakta din IT-ansvarige eller administratör om du behöver en licenskod 
                    eller har tekniska problem.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Key, Calendar, Crown, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const licenseActivationSchema = z.object({
  licenseCode: z.string()
    .min(1, 'Licenskod krävs')
    .regex(/^[A-Z0-9-]+$/, 'Licenskod får bara innehålla stora bokstäver, siffror och bindestreck')
    .min(10, 'Licenskod för kort')
    .max(50, 'Licenskod för lång'),
});

type LicenseActivationData = z.infer<typeof licenseActivationSchema>;

interface LicenseActivationProps {
  onSuccess?: () => void;
}

export default function LicenseActivation({ onSuccess }: LicenseActivationProps) {
  const [activationStatus, setActivationStatus] = useState<'form' | 'success' | 'error'>('form');
  const [licenseInfo, setLicenseInfo] = useState<{ expiresAt?: string; isActive?: boolean } | null>(null);
  const { toast } = useToast();

  const form = useForm<LicenseActivationData>({
    resolver: zodResolver(licenseActivationSchema),
    defaultValues: {
      licenseCode: '',
    }
  });

  // Get current license status
  const { data: currentLicense, isLoading: isLoadingLicense } = useQuery({
    queryKey: ['/api/license/status'],
    retry: false,
  });

  const activationMutation = useMutation({
    mutationFn: async (data: LicenseActivationData) => {
      return apiRequest('POST', '/api/auth/teacher/activate-license', data);
    },
    onSuccess: (response: any) => {
      if (response.success) {
        setLicenseInfo(response.license);
        setActivationStatus('success');
        onSuccess?.();
        
        toast({
          title: 'Licens aktiverad!',
          description: 'Din licens har aktiverats framgångsrikt.',
          duration: 5000,
        });
      }
    },
    onError: (error: any) => {
      setActivationStatus('error');
      const message = error.message || 'Ett fel uppstod vid licensaktivering';
      
      toast({
        title: 'Licensaktivering misslyckades',
        description: message,
        variant: 'destructive',
      });
    }
  });

  const onSubmit = async (data: LicenseActivationData) => {
    // Clean up the license code (remove spaces, convert to uppercase)
    const cleanCode = data.licenseCode.replace(/\s/g, '').toUpperCase();
    activationMutation.mutate({ licenseCode: cleanCode });
  };

  const formatLicenseCode = (value: string) => {
    // Remove all non-alphanumeric characters and convert to uppercase
    const clean = value.replace(/[^A-Z0-9]/g, '').toUpperCase();
    // Add dashes every 4 characters for readability
    return clean.replace(/(.{4})/g, '$1-').replace(/-$/, '');
  };

  const handleLicenseCodeChange = (value: string, onChange: (value: string) => void) => {
    const formatted = formatLicenseCode(value);
    onChange(formatted);
  };

  // Show current license status if user already has one
  if (currentLicense && !isLoadingLicense && activationStatus === 'form') {
    const isExpired = currentLicense.expiresAt && new Date() > new Date(currentLicense.expiresAt);
    
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            isExpired ? 'bg-orange-100' : 'bg-green-100'
          }`}>
            <Crown className={`w-6 h-6 ${isExpired ? 'text-orange-600' : 'text-green-600'}`} />
          </div>
          <CardTitle className={isExpired ? 'text-orange-800' : 'text-green-800'}>
            {isExpired ? 'Licens utgången' : 'Aktiv licens'}
          </CardTitle>
          <CardDescription>
            {isExpired ? 'Din licens har gått ut och behöver förnyas.' : 'Du har redan en aktiv licens.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className={isExpired ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}>
            <Info className={`h-4 w-4 ${isExpired ? 'text-orange-600' : 'text-green-600'}`} />
            <AlertDescription className={isExpired ? 'text-orange-800' : 'text-green-800'}>
              {currentLicense.expiresAt ? (
                <>
                  {isExpired ? 'Licensen gick ut' : 'Licensen är giltig till'}{' '}
                  <strong>
                    {format(new Date(currentLicense.expiresAt), 'dd MMMM yyyy', { locale: sv })}
                  </strong>
                </>
              ) : (
                'Du har en permanent licens.'
              )}
            </AlertDescription>
          </Alert>

          {isExpired && (
            <div className="pt-4">
              <Button 
                onClick={() => setActivationStatus('form')} 
                className="w-full"
                data-testid="button-activate-new-license"
              >
                Aktivera ny licens
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (activationStatus === 'success') {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-green-800">Licens aktiverad!</CardTitle>
          <CardDescription>Din licens har aktiverats framgångsrikt.</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <Alert className="bg-green-50 border-green-200">
            <Crown className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Du har nu full tillgång till alla funktioner i Ordflyt.se!
            </AlertDescription>
          </Alert>

          {licenseInfo?.expiresAt && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Calendar className="w-4 h-4" />
                <span><strong>Licensen gäller till:</strong></span>
              </div>
              <div className="text-lg font-semibold text-gray-800">
                {format(new Date(licenseInfo.expiresAt), 'dd MMMM yyyy', { locale: sv })}
              </div>
            </div>
          )}
          
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Vad du nu kan göra:</strong></p>
            <ul className="list-disc list-inside text-left space-y-1">
              <li>Skapa obegränsade klasser och elever</li>
              <li>Tilldela alla lektioner till dina elever</li>
              <li>Följa detaljerade framstegsrapporter</li>
              <li>Exportera elevdata för föräldramöten</li>
              <li>Använda alla analysverktyg</li>
            </ul>
          </div>

          <div className="pt-4">
            <Button 
              onClick={() => window.location.href = '/teacher'} 
              className="w-full"
              data-testid="button-go-to-dashboard"
            >
              Gå till lärardashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Form state
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center">
          <Key className="w-5 h-5" />
          Aktivera licens
        </CardTitle>
        <CardDescription>
          Ange din licenskod för att aktivera full tillgång till Ordflyt.se
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activationStatus === 'error' && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ett fel uppstod vid licensaktivering. Kontrollera koden och försök igen.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="licenseCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Licenskod *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      onChange={(e) => handleLicenseCodeChange(e.target.value, field.onChange)}
                      placeholder="ABCD-EFGH-IJKL-MNOP"
                      className="font-mono text-center text-lg tracking-wider"
                      data-testid="input-license-code"
                    />
                  </FormControl>
                  <FormDescription>
                    Ange licenskoden du fick när du köpte din licens
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={activationMutation.isPending}
                data-testid="button-submit-license"
              >
                {activationMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Aktiverar licens...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Aktivera licens
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">Har du ingen licenskod?</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Du kan använda systemet utan licens med begränsade funktioner</li>
                <li>Kontakta oss för att köpa en licens</li>
                <li>Licenser gäller vanligtvis i 12 månader</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/teacher'}
            className="text-sm"
            data-testid="button-skip-license"
          >
            Hoppa över (använd utan licens)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
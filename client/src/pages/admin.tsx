import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Shield,
  Key,
  Users,
  Activity,
  Plus,
  Trash2,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  LogOut,
} from 'lucide-react';

// Types
interface OneTimeCode {
  id: string;
  recipientEmail: string;
  createdAt: string;
  expiresAt: string;
  redeemedAt?: string;
  redeemedBy?: string;
}

interface LicenseStats {
  totalCodes: number;
  activeCodes: number;
  redeemedCodes: number;
  expiredCodes: number;
}

// Form schema
const generateCodeSchema = z.object({
  recipientEmail: z.string().email('Ange en giltig e-postadress'),
  validityDays: z.coerce.number().min(1, 'Minst 1 dag').max(365, 'Högst 365 dagar').default(30),
});

type GenerateCodeFormData = z.infer<typeof generateCodeSchema>;

// API functions
const fetchCodes = async (): Promise<OneTimeCode[]> => {
  const response = await fetch('/api/license/admin/codes', {
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to fetch codes');
  }
  const data = await response.json();
  return data.codes;
};

const generateCode = async (data: GenerateCodeFormData) => {
  return apiRequest('POST', '/api/license/admin/generate', data);
};

const deleteCode = async (codeId: string) => {
  return apiRequest('DELETE', `/api/license/admin/codes/${codeId}`);
};

// Helper functions
const getCodeStatus = (code: OneTimeCode) => {
  if (code.redeemedAt) return 'redeemed';
  if (new Date() > new Date(code.expiresAt)) return 'expired';
  return 'active';
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Aktiv</Badge>;
    case 'redeemed':
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Använd</Badge>;
    case 'expired':
      return <Badge variant="destructive">Utgången</Badge>;
    default:
      return <Badge variant="outline">Okänd</Badge>;
  }
};

const getLicenseStats = (codes: OneTimeCode[]): LicenseStats => {
  return {
    totalCodes: codes.length,
    activeCodes: codes.filter(code => getCodeStatus(code) === 'active').length,
    redeemedCodes: codes.filter(code => getCodeStatus(code) === 'redeemed').length,
    expiredCodes: codes.filter(code => getCodeStatus(code) === 'expired').length,
  };
};

// Components
function LicenseOverview({ codes }: { codes: OneTimeCode[] }) {
  const stats = getLicenseStats(codes);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Totala koder</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="stat-total-codes">{stats.totalCodes}</div>
          <p className="text-xs text-muted-foreground">
            Alla genererade licenskoder
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Aktiva koder</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600" data-testid="stat-active-codes">{stats.activeCodes}</div>
          <p className="text-xs text-muted-foreground">
            Redo att lösas in
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Använda koder</CardTitle>
          <Key className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600" data-testid="stat-redeemed-codes">{stats.redeemedCodes}</div>
          <p className="text-xs text-muted-foreground">
            Lyckade aktiveringar
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Utgångna koder</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600" data-testid="stat-expired-codes">{stats.expiredCodes}</div>
          <p className="text-xs text-muted-foreground">
            Inte längre giltiga
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function GenerateCodeForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<GenerateCodeFormData>({
    resolver: zodResolver(generateCodeSchema),
    defaultValues: {
      recipientEmail: '',
      validityDays: 30,
    },
  });

  const generateMutation = useMutation({
    mutationFn: generateCode,
    onSuccess: (data) => {
      toast({
        title: 'Kod genererad!',
        description: `Licenskod skickad till ${form.getValues('recipientEmail')}`,
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['license-codes'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel vid generering',
        description: error.message || 'Ett fel uppstod',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: GenerateCodeFormData) => {
    generateMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Generera ny licenskod
        </CardTitle>
        <CardDescription>
          Skapa en ny licenskod som skickas via e-post till läraren
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recipientEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-postadress</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="larare@skola.se" 
                      data-testid="input-recipient-email"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Licenskoden skickas till denna e-postadress
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="validityDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giltighetsperiod (dagar)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="30" 
                      data-testid="input-validity-days"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Antal dagar koden är giltig (1-365)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={generateMutation.isPending}
              data-testid="button-generate-code"
            >
              {generateMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
                  Genererar...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Generera kod
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ManageCodes({ codes, isLoading }: { codes: OneTimeCode[], isLoading: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteCode,
    onSuccess: () => {
      toast({
        title: 'Kod borttagen',
        description: 'Licenskoden har tagits bort',
      });
      queryClient.invalidateQueries({ queryKey: ['license-codes'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel vid borttagning',
        description: error.message || 'Ett fel uppstod',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Laddar koder...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Licenskoder ({codes.length})
        </CardTitle>
        <CardDescription>
          Alla genererade licenskoder och deras status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {codes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Inga licenskoder har genererats än</p>
          </div>
        ) : (
          <div className="space-y-4">
            {codes.map((code) => {
              const status = getCodeStatus(code);
              return (
                <div 
                  key={code.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`code-item-${code.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium" data-testid={`code-email-${code.id}`}>
                        {code.recipientEmail}
                      </span>
                      {getStatusBadge(status)}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Skapad {format(new Date(code.createdAt), 'PPP', { locale: sv })}
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Går ut {format(new Date(code.expiresAt), 'PPP', { locale: sv })}
                      </div>
                      {code.redeemedAt && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Använd {formatDistanceToNow(new Date(code.redeemedAt), { 
                            addSuffix: true, 
                            locale: sv 
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {status !== 'redeemed' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          data-testid={`button-delete-code-${code.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Ta bort licenskod?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Detta kommer att ta bort licenskoden för {code.recipientEmail}. 
                            Åtgärden kan inte ångras.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">
                            Avbryt
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(code.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid="button-confirm-delete"
                          >
                            Ta bort
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityFeed({ codes }: { codes: OneTimeCode[] }) {
  // Create activity feed from codes
  const activities = codes
    .flatMap((code) => {
      const items = [
        {
          type: 'generated',
          timestamp: code.createdAt,
          email: code.recipientEmail,
          id: `${code.id}-generated`,
        },
      ];
      
      if (code.redeemedAt) {
        items.push({
          type: 'redeemed',
          timestamp: code.redeemedAt,
          email: code.recipientEmail,
          id: `${code.id}-redeemed`,
        });
      }
      
      return items;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Senaste aktiviteter
        </CardTitle>
        <CardDescription>
          De senaste licensaktiviteterna i systemet
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Inga aktiviteter att visa</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                data-testid={`activity-${activity.type}-${activity.id}`}
              >
                {activity.type === 'generated' ? (
                  <Plus className="h-4 w-4 mt-0.5 text-blue-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                )}
                <div className="flex-1">
                  <p className="text-sm">
                    {activity.type === 'generated' 
                      ? `Ny licenskod genererad för ${activity.email}`
                      : `Licenskod aktiverad av ${activity.email}`
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), { 
                      addSuffix: true, 
                      locale: sv 
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch license codes
  const { data: codes = [], isLoading, error } = useQuery({
    queryKey: ['license-codes'],
    queryFn: fetchCodes,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Licenshantering
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Administrera licenskoder och användarkonton
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/api/auth/logout'}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logga ut
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Fel vid laddning</AlertTitle>
            <AlertDescription>
              Kunde inte hämta licensdata. Försök ladda om sidan.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Shield className="h-4 w-4 mr-2" />
              Översikt
            </TabsTrigger>
            <TabsTrigger value="generate" data-testid="tab-generate">
              <Plus className="h-4 w-4 mr-2" />
              Generera kod
            </TabsTrigger>
            <TabsTrigger value="manage" data-testid="tab-manage">
              <Key className="h-4 w-4 mr-2" />
              Hantera koder
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">
              <Activity className="h-4 w-4 mr-2" />
              Aktivitet
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview" className="space-y-6">
              <LicenseOverview codes={codes} />
              <div className="grid gap-6 lg:grid-cols-2">
                <ManageCodes codes={codes.slice(0, 5)} isLoading={isLoading} />
                <ActivityFeed codes={codes} />
              </div>
            </TabsContent>

            <TabsContent value="generate" className="space-y-6">
              <GenerateCodeForm />
            </TabsContent>

            <TabsContent value="manage" className="space-y-6">
              <ManageCodes codes={codes} isLoading={isLoading} />
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <ActivityFeed codes={codes} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
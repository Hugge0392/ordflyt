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
import { WelcomeGuide } from '@/components/ui/welcome-guide';
import { HelpTooltip, InfoTooltip } from '@/components/ui/help-tooltip';
import { HelpMenu, commonGuides } from '@/components/ui/help-menu';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, Link } from 'wouter';
import {
  Shield,
  Key,
  Users,
  Activity,
  BookOpen,
  Target,
  FileText,
  Brain,
  MessageSquare,
  Settings2,
  ExternalLink,
  Plus,
  Trash2,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  LogOut,
  Settings,
  BarChart3,
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
function LicenseOverview({ codes, setActiveTab }: { codes: OneTimeCode[], setActiveTab: (tab: string) => void }) {
  const stats = getLicenseStats(codes);

  // Empty state when no codes exist
  if (codes.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Inga licenskoder än
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          Börja med att skapa din första licenskod för lärare. De kan sedan aktivera sina konton och börja använda KlassKamp.
        </p>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setActiveTab('generate')} data-testid="button-create-first-license">
          <Key className="h-4 w-4 mr-2" />
          Skapa första licenskoden
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Totala koder</CardTitle>
            <InfoTooltip 
              content="Det totala antalet licenskoder som har genererats i systemet, oavsett status."
              testId="help-total-codes"
            />
          </div>
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
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Aktiva koder</CardTitle>
            <InfoTooltip 
              content="Licenskoder som är giltiga och kan aktiveras av lärare. Dessa har inte använts än och har inte gått ut."
              testId="help-active-codes"
            />
          </div>
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
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Använda koder</CardTitle>
            <InfoTooltip 
              content="Licenskoder som redan har aktiverats av lärare. Dessa koder har fullgjort sitt syfte och kan inte användas igen."
              testId="help-redeemed-codes"
            />
          </div>
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
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Utgångna koder</CardTitle>
            <InfoTooltip 
              content="Licenskoder som har passerat sitt utgångsdatum och inte längre kan aktiveras. Dessa behöver ersättas med nya koder."
              testId="help-expired-codes"
            />
          </div>
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Generera ny licenskod
            </CardTitle>
            <CardDescription>
              Skapa en ny licenskod som skickas via e-post till läraren
            </CardDescription>
          </div>
          <HelpTooltip 
            content="Här skapar du en ny licenskod som automatiskt skickas via e-post till den angivna läraren. Läraren kan sedan använda koden för att aktivera sitt konto."
            testId="help-generate-form"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recipientEmail"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>E-postadress</FormLabel>
                    <HelpTooltip 
                      content="Ange lärarens e-postadress. Licenskoden skickas automatiskt till denna adress med instruktioner för aktivering."
                      testId="help-email-field"
                    />
                  </div>
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
                  <div className="flex items-center gap-2">
                    <FormLabel>Giltighetsperiod (dagar)</FormLabel>
                    <HelpTooltip 
                      content="Bestäm hur länge licenskoden ska vara giltig. Efter denna period kan koden inte längre aktiveras. Rekommenderat: 30-90 dagar."
                      testId="help-validity-field"
                    />
                  </div>
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
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setLocation('/login');
    } catch (error) {
      toast({
        title: 'Utloggning misslyckades',
        description: 'Försök igen eller kontakta support.',
        variant: 'destructive',
      });
    }
  };

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
            <HelpMenu
              availableGuides={commonGuides.admin}
              userRole="admin"
              userId={user?.id}
              testId="admin-help-menu"
            />
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-red-200 hover:bg-red-50 hover:border-red-300 text-red-700 hover:text-red-800 dark:border-red-800 dark:hover:bg-red-900/20 dark:text-red-400 dark:hover:text-red-300"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
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

        {/* Admin Welcome Guide with improved scope and child-friendly copy */}
        <WelcomeGuide
          guideId="admin-dashboard"
          userRole="admin"
          userId={user?.id}
          title="Välkommen till Admin Panel"
          description="Här hanterar du licenser och följer systemet."
          badge="Administratör"
          icon={<Settings className="h-5 w-5" />}
          className="mb-6"
          steps={[
            {
              icon: <BarChart3 className="h-5 w-5 text-blue-600" />,
              title: "Se översikt",
              description: "Kolla statistik för alla licenskoder."
            },
            {
              icon: <Plus className="h-5 w-5 text-green-600" />,
              title: "Skapa koder",
              description: "Gör nya licenskoder för lärare."
            },
            {
              icon: <Key className="h-5 w-5 text-purple-600" />,
              title: "Hantera koder",
              description: "Se alla koder och ta bort dem."
            },
            {
              icon: <Activity className="h-5 w-5 text-orange-600" />,
              title: "Se aktivitet",
              description: "Följ vad som händer i systemet."
            }
          ]}
          data-testid="admin-welcome-guide"
        />
        
        {/* Show again button */}
        <div className="mb-6 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const globalFn = (window as any)[`showGuide_admin-dashboard_admin_${user?.id || 'default'}`];
              if (globalFn) globalFn();
            }}
            className="text-muted-foreground hover:text-foreground"
            data-testid="show-guide-again"
          >
            <Settings className="h-4 w-4 mr-2" />
            Visa guiden igen
          </Button>
        </div>

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
              <LicenseOverview codes={codes} setActiveTab={setActiveTab} />
              
              {/* Quick Access Admin Tools */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-blue-600" />
                    Snabbåtkomst - Admin verktyg
                  </CardTitle>
                  <CardDescription>
                    Hantera innehåll och systemfunktioner
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Vocabulary Builder */}
                    <Link href="/admin/vocabulary">
                      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group border-purple-200 hover:border-purple-300">
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                              <Brain className="w-6 h-6 text-purple-600" />
                            </div>
                            <h3 className="font-semibold text-sm">Ordförråd</h3>
                            <p className="text-xs text-gray-500">Skapa ordförrådsset</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>

                    {/* Lesson Builder */}
                    <Link href="/admin/lessons">
                      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group border-orange-200 hover:border-orange-300">
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                              <Target className="w-6 h-6 text-orange-600" />
                            </div>
                            <h3 className="font-semibold text-sm">Lektioner</h3>
                            <p className="text-xs text-gray-500">Skapa lektioner</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>

                    {/* Reading Admin */}
                    <Link href="/lasforstaelse/admin">
                      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group border-blue-200 hover:border-blue-300">
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                              <BookOpen className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="font-semibold text-sm">Läsförståelse</h3>
                            <p className="text-xs text-gray-500">Hantera texter</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>

                    {/* Lesson Templates */}
                    <Link href="/admin/lesson-templates">
                      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group border-green-200 hover:border-green-300">
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                              <FileText className="w-6 h-6 text-green-600" />
                            </div>
                            <h3 className="font-semibold text-sm">Mallar</h3>
                            <p className="text-xs text-gray-500">Lektionsmallar</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>

                    {/* Sentences */}
                    <Link href="/admin/sentences">
                      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group border-teal-200 hover:border-teal-300">
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                              <MessageSquare className="w-6 h-6 text-teal-600" />
                            </div>
                            <h3 className="font-semibold text-sm">Meningar</h3>
                            <p className="text-xs text-gray-500">Hantera meningar</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>

                    {/* Blog/Lektionsmaterial */}
                    <Link href="/admin/blog">
                      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group border-pink-200 hover:border-pink-300">
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                              <FileText className="w-6 h-6 text-pink-600" />
                            </div>
                            <h3 className="font-semibold text-sm">Blogg</h3>
                            <p className="text-xs text-gray-500">Lektionsmaterial</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>

                    {/* Accounts */}
                    <Link href="/admin/accounts">
                      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group border-indigo-200 hover:border-indigo-300">
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                              <Users className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h3 className="font-semibold text-sm">Konton</h3>
                            <p className="text-xs text-gray-500">Hantera användare</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>

                    {/* Grammar */}
                    <Link href="/admin/grammatik">
                      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group border-pink-200 hover:border-pink-300">
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                              <BookOpen className="w-6 h-6 text-pink-600" />
                            </div>
                            <h3 className="font-semibold text-sm">Grammatik</h3>
                            <p className="text-xs text-gray-500">Ordklasser</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>

                    {/* Email Test */}
                    <Link href="/admin/email-test">
                      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group border-gray-200 hover:border-gray-300">
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                              <ExternalLink className="w-6 h-6 text-gray-600" />
                            </div>
                            <h3 className="font-semibold text-sm">E-post</h3>
                            <p className="text-xs text-gray-500">Testa e-post</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                </CardContent>
              </Card>

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
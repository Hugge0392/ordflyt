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
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users, UserPlus, Key, Shield, Plus, Copy, CheckCircle, AlertCircle, Clock, Mail, Database, Settings, Trash2 } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import { apiRequest } from '@/lib/queryClient';

const generateCodeSchema = z.object({
  recipientEmail: z.string().email('Ogiltig e-postadress'),
  validityDays: z.number().min(1).max(365),
});

type GenerateCodeForm = z.infer<typeof generateCodeSchema>;

export default function AdminAccounts() {
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form för att generera engångskod
  const form = useForm<GenerateCodeForm>({
    resolver: zodResolver(generateCodeSchema),
    defaultValues: {
      recipientEmail: '',
      validityDays: 30,
    },
  });

  // Hämta alla engångskoder
  const { data: codesData, isLoading: isLoadingCodes } = useQuery({
    queryKey: ['/api/license/admin/codes'],
  });

  // Mutation för att generera kod
  const generateCodeMutation = useMutation({
    mutationFn: async (data: GenerateCodeForm) => {
      return apiRequest('POST', '/api/license/admin/generate', data);
    },
    onSuccess: (data) => {
      setGeneratedCode((data as any).code);
      queryClient.invalidateQueries({ queryKey: ['/api/license/admin/codes'] });
      form.reset();
      toast({
        title: 'Engångskod genererad!',
        description: `Koden har skapats för ${(data as any).code.recipientEmail}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel vid generering',
        description: error.message || 'Ett oväntat fel inträffade',
        variant: 'destructive',
      });
    },
  });

  // Mutation för att ta bort kod
  const deleteCodeMutation = useMutation({
    mutationFn: async (codeId: string) => {
      return apiRequest('DELETE', `/api/license/admin/codes/${codeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/license/admin/codes'] });
      toast({
        title: 'Kod borttagen',
        description: 'Engångskoden har tagits bort permanent',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fel vid borttagning',
        description: error.message || 'Ett oväntat fel inträffade',
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Kopierat!',
      description: 'Koden har kopierats till urklipp',
    });
  };

  const getStatusBadge = (code: any) => {
    if (code.redeemedAt) {
      return <Badge variant="default" className="bg-green-600">Inlöst</Badge>;
    }
    if (new Date() > new Date(code.expiresAt)) {
      return <Badge variant="destructive">Utgången</Badge>;
    }
    return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Aktiv</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="outline" size="sm" data-testid="button-back-admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till adminpanel
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-red-600" />
              Hantera konton
            </h1>
            <p className="text-gray-600">Administrera användare och systeminställningar</p>
          </div>
        </div>

        {/* Huvudsektion för engångskoder */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-orange-600" />
              Lärar-licenser och engångskoder
            </CardTitle>
            <CardDescription>
              Generera engångskoder för lärare att aktivera sina licenser
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-gray-600">
                  Skapa engångskoder som lärare kan använda för att aktivera sina licenser och börja skapa klasser.
                </p>
              </div>
              <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Generera kod
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Generera engångskod</DialogTitle>
                    <DialogDescription>
                      Skapa en engångskod för en lärare att aktivera sin licens
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => generateCodeMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="recipientEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lärarens e-post</FormLabel>
                            <FormControl>
                              <Input placeholder="larare@skolan.se" {...field} />
                            </FormControl>
                            <FormDescription>
                              E-postadressen till läraren som ska få koden
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
                            <FormLabel>Giltig i dagar</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                max="365" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Antal dagar koden ska vara giltig (1-365)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2">
                        <Button 
                          type="submit" 
                          disabled={generateCodeMutation.isPending}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          {generateCodeMutation.isPending ? 'Genererar...' : 'Generera kod'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                          Avbryt
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Visa genererad kod */}
            {generatedCode && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="space-y-3">
                  <div>
                    <strong>Kod genererad framgångsrikt!</strong>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-green-800">Mottagare:</p>
                      <p className="text-green-700">{generatedCode.recipientEmail}</p>
                    </div>
                    <div>
                      <p className="font-medium text-green-800">Giltig till:</p>
                      <p className="text-green-700">
                        {new Date(generatedCode.expiresAt).toLocaleDateString('sv-SE')}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-green-800 mb-2">Engångskod:</p>
                    <div className="flex items-center gap-2">
                      <code className="px-3 py-2 bg-white border rounded font-mono text-lg tracking-wider">
                        {generatedCode.code}
                      </code>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(generatedCode.code)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-green-600">
                    ⚠️ VIKTIGT: Koden visas bara här en gång! Skicka den säkert till läraren.
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setGeneratedCode(null)}
                    className="mt-2"
                  >
                    Stäng meddelandet
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Lista över alla koder */}
            <div>
              <h3 className="text-lg font-medium mb-4">Alla engångskoder</h3>
              {isLoadingCodes ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>E-post</TableHead>
                        <TableHead>Skapad</TableHead>
                        <TableHead>Går ut</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Inlöst av</TableHead>
                        <TableHead>Åtgärder</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(codesData as any)?.codes?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            Inga engångskoder har genererats än
                          </TableCell>
                        </TableRow>
                      ) : (
                        (codesData as any)?.codes?.map((code: any) => (
                          <TableRow key={code.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                {code.recipientEmail}
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(code.createdAt)}</TableCell>
                            <TableCell>{formatDate(code.expiresAt)}</TableCell>
                            <TableCell>{getStatusBadge(code)}</TableCell>
                            <TableCell>
                              {code.redeemedBy ? (
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="text-sm">Inlöst</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-500">Väntar</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Ta bort engångskod</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Är du säker på att du vill ta bort denna engångskod för{' '}
                                      <strong>{code?.recipientEmail || 'okänd mottagare'}</strong>?
                                      {code?.redeemedAt ? (
                                        <span className="block mt-2 text-amber-600">
                                          ⚠️ Koden har redan lösts in och är kopplad till en aktiv licens.
                                        </span>
                                      ) : (
                                        <span className="block mt-2 text-red-600">
                                          Denna åtgärd kan inte ångras.
                                        </span>
                                      )}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteCodeMutation.mutate(code?.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                      disabled={!code?.id}
                                    >
                                      Ta bort
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Andra administrativa funktioner */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Användarkonton</CardTitle>
              <CardDescription>
                Visa och hantera registrerade användare
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Admin</span>
                  </div>
                  <Badge variant="secondary">1</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium">Lärare</span>
                  </div>
                  <Badge variant="secondary">1</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm font-medium">Elev</span>
                  </div>
                  <Badge variant="secondary">1</Badge>
                </div>
              </div>
              <div className="mt-4">
                <Button className="w-full" disabled>
                  Hantera användare
                  <span className="ml-2 text-xs opacity-70">(Kommer snart)</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Säkerhetsloggar</CardTitle>
              <CardDescription>
                Granska inloggningar och säkerhetsaktivitet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Senaste inloggning:</span>
                  <span className="font-medium">Just nu</span>
                </div>
                <div className="flex justify-between">
                  <span>Misslyckade försök:</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between">
                  <span>Aktiva sessioner:</span>
                  <span className="font-medium">1</span>
                </div>
              </div>
              <div className="mt-4">
                <Button className="w-full" disabled>
                  Visa säkerhetsloggar
                  <span className="ml-2 text-xs opacity-70">(Kommer snart)</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Database className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Databasunderhåll</CardTitle>
              <CardDescription>
                Hantera databassäkerhetskopiering och underhåll
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Senaste backup:</span>
                  <span className="font-medium">Idag</span>
                </div>
                <div className="flex justify-between">
                  <span>Databasstorlek:</span>
                  <span className="font-medium">12 MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge variant="default" className="bg-green-600">Fungerar</Badge>
                </div>
              </div>
              <div className="mt-4">
                <Button className="w-full" disabled>
                  Databasverktyg
                  <span className="ml-2 text-xs opacity-70">(Kommer snart)</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
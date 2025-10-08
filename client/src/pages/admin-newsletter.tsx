import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getQueryFn } from '@/lib/queryClient';

interface NewsletterSubscriber {
  id: string;
  email: string;
  name?: string;
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt?: string;
  source?: string;
  totalEmailsSent?: number;
  lastEmailSent?: string;
}

export default function AdminNewsletter() {
  const { data: subscribers, isLoading } = useQuery<NewsletterSubscriber[]>({
    queryKey: ['/api/newsletter/subscribers'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });

  const activeSubscribers = subscribers?.filter(s => s.isActive) || [];
  const inactiveSubscribers = subscribers?.filter(s => !s.isActive) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nyhetsbrev</h1>
          <p className="text-muted-foreground">Hantera prenumeranter</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt prenumeranter</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscribers?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktiva</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscribers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inaktiva</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveSubscribers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Subscribers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Prenumeranter
          </CardTitle>
          <CardDescription>
            Alla som registrerat sig för nyhetsbrev
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Laddar...
            </div>
          ) : !subscribers || subscribers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Inga prenumeranter än
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-4 px-4 py-2 font-semibold text-sm border-b">
                <div className="col-span-4">E-post</div>
                <div className="col-span-2">Namn</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Källa</div>
                <div className="col-span-2">Registrerad</div>
              </div>
              {subscribers.map((subscriber) => (
                <div
                  key={subscriber.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 border-b hover:bg-gray-50 items-center"
                >
                  <div className="col-span-4 font-medium text-sm">
                    {subscriber.email}
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground">
                    {subscriber.name || '-'}
                  </div>
                  <div className="col-span-2">
                    {subscriber.isActive ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Aktiv
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inaktiv
                      </Badge>
                    )}
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground">
                    {subscriber.source || 'website'}
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(subscriber.subscribedAt), 'dd MMM yyyy', { locale: sv })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Copy Email Addresses */}
      {subscribers && subscribers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>E-postadresser för utskick</CardTitle>
            <CardDescription>
              Kopiera listan med aktiva e-postadresser
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="text-sm font-mono break-all">
                  {activeSubscribers.map(s => s.email).join(', ')}
                </div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeSubscribers.map(s => s.email).join(', '));
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Kopiera e-postadresser
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

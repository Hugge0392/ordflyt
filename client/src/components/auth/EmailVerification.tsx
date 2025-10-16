import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Mail, Loader2, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmailVerificationProps {
  token?: string;
}

export default function EmailVerification({ token: propToken }: EmailVerificationProps) {
  const params = useParams();
  const [, navigate] = useLocation();
  const token = propToken || params.token;
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'error' | 'expired'>('verifying');
  const [accountInfo, setAccountInfo] = useState<{ username?: string } | null>(null);
  const { toast } = useToast();

  const verificationMutation = useMutation({
    mutationFn: async (verificationToken: string) => {
      return apiRequest('POST', '/api/auth/teacher/verify-email', { token: verificationToken });
    },
    onSuccess: (response: any) => {
      if (response.success) {
        setVerificationStatus('success');
        setAccountInfo({ username: response.username });
        
        toast({
          title: 'Email verifierad!',
          description: 'Ditt lärarkonto har skapats framgångsrikt.',
          duration: 5000,
        });
      }
    },
    onError: (error: any) => {
      console.error('Email verification error:', error);
      
      if (error.message?.includes('gått ut') || error.message?.includes('expired')) {
        setVerificationStatus('expired');
      } else {
        setVerificationStatus('error');
      }
      
      toast({
        title: 'Verifiering misslyckades',
        description: error.message || 'Ett fel uppstod vid email-verifiering',
        variant: 'destructive',
      });
    }
  });

  useEffect(() => {
    if (token && token.length > 10) {
      // Automatically verify when component mounts with valid token
      verificationMutation.mutate(token);
    } else if (!token) {
      setVerificationStatus('error');
    }
  }, [token]);

  const handleRetryVerification = () => {
    if (token) {
      setVerificationStatus('verifying');
      verificationMutation.mutate(token);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  // Verifying state
  if (verificationStatus === 'verifying' || verificationMutation.isPending) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
          <CardTitle>Verifierar din email...</CardTitle>
          <CardDescription>
            Vi kontrollerar din verifieringslänk.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-sm text-gray-600">
            Detta kan ta några sekunder. Vänta medan vi verifierar din email-adress.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (verificationStatus === 'success') {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-green-800">Email verifierad!</CardTitle>
          <CardDescription>Ditt lärarkonto har skapats framgångsrikt.</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <Alert className="bg-green-50 border-green-200">
            <Mail className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Vi har skickat dina inloggningsuppgifter till din email. Kolla din inkorg för att få ditt användarnamn och tillfälliga lösenord.
            </AlertDescription>
          </Alert>

          {accountInfo?.username && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Ditt användarnamn:</strong>
              </p>
              <code className="bg-white px-2 py-1 rounded border text-sm font-mono">
                {accountInfo.username}
              </code>
            </div>
          )}
          
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Nästa steg:</strong></p>
            <ol className="list-decimal list-inside text-left space-y-1">
              <li>Kolla din email för inloggningsuppgifter</li>
              <li>Logga in med ditt nya konto</li>
              <li>Byt lösenord vid första inloggningen</li>
              <li>Aktivera din licens i lärardashboard</li>
            </ol>
          </div>

          <div className="pt-4 space-y-2">
            <Button 
              onClick={handleGoToLogin} 
              className="w-full"
              data-testid="button-go-to-login"
            >
              Gå till inloggning
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Expired state
  if (verificationStatus === 'expired') {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-orange-600" />
          </div>
          <CardTitle className="text-orange-800">Verifieringslänk utgången</CardTitle>
          <CardDescription>Denna verifieringslänk har gått ut.</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Verifieringslänkar är giltiga i 24 timmar. Denna länk har gått ut och kan inte längre användas.
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-gray-600">
            <p>För att slutföra registreringen måste du:</p>
            <ol className="list-decimal list-inside text-left space-y-1 mt-2">
              <li>Registrera dig igen med samma email</li>
              <li>Kontrollera din email för ny verifieringslänk</li>
              <li>Klicka på den nya länken inom 24 timmar</li>
            </ol>
          </div>

          <div className="pt-4 space-y-2">
            <Button 
              onClick={() => navigate('/registrera')} 
              className="w-full"
              data-testid="button-register-again"
            >
              Registrera igen
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="w-full"
              data-testid="button-back-home"
            >
              Tillbaka till startsidan
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <CardTitle className="text-red-800">Verifiering misslyckades</CardTitle>
        <CardDescription>Det gick inte att verifiera din email-adress.</CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Verifieringslänken är ogiltig eller har redan använts. Kontrollera att du klickade på rätt länk från emailet.
          </AlertDescription>
        </Alert>
        
        <div className="text-sm text-gray-600">
          <p><strong>Möjliga orsaker:</strong></p>
          <ul className="list-disc list-inside text-left space-y-1 mt-2">
            <li>Länken är skadad eller ofullständig</li>
            <li>Email redan verifierad tidigare</li>
            <li>Tekniskt fel på servern</li>
          </ul>
        </div>

        <div className="pt-4 space-y-2">
          {token && (
            <Button 
              onClick={handleRetryVerification} 
              variant="outline"
              className="w-full"
              disabled={verificationMutation.isPending}
              data-testid="button-retry-verification"
            >
              {verificationMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Försöker igen...
                </>
              ) : (
                'Försök igen'
              )}
            </Button>
          )}
          
          <Button 
            onClick={() => navigate('/registrera')} 
            className="w-full"
            data-testid="button-new-registration"
          >
            Ny registrering
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')} 
            className="w-full"
            data-testid="button-home"
          >
            Tillbaka till startsidan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
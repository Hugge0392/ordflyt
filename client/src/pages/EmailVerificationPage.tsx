import { useParams } from 'wouter';
import EmailVerification from '@/components/auth/EmailVerification';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { useLocation } from 'wouter';

export default function EmailVerificationPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const token = params.token;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="absolute left-4 top-4 sm:relative sm:left-0 sm:top-0"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Hem
            </Button>
            
            <div className="flex items-center gap-3">
              <Home className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold text-gray-900">Ordflyt.se</h1>
            </div>
          </div>
          
          <div className="max-w-md mx-auto text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Email-verifiering
            </h2>
            <p className="text-gray-600">
              Vi verifierar din email-adress för att slutföra registreringen.
            </p>
          </div>
        </div>

        {/* Email Verification Component */}
        <EmailVerification token={token} />

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            Behöver du hjälp?{' '}
            <a 
              href="mailto:support@ordflyt.se"
              className="text-green-600 hover:underline font-medium"
              data-testid="link-support"
            >
              Kontakta support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
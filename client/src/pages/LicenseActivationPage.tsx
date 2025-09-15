import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import LicenseActivation from '@/components/auth/LicenseActivation';
import { ArrowLeft, Crown } from 'lucide-react';

export default function LicenseActivationPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/teacher')}
              className="absolute left-4 top-4 sm:relative sm:left-0 sm:top-0"
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-orange-600" />
              <h1 className="text-3xl font-bold text-gray-900">Ordflyt.se</h1>
            </div>
          </div>
          
          <div className="max-w-md mx-auto text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Licensaktivering
            </h2>
            <p className="text-gray-600">
              Aktivera din licens för att få full tillgång till alla funktioner.
            </p>
          </div>
        </div>

        {/* License Activation Component */}
        <LicenseActivation 
          onSuccess={() => {
            // Navigate to dashboard after successful activation
            navigate('/teacher');
          }} 
        />

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            Har du problem med din licenskod?{' '}
            <a 
              href="mailto:support@ordflyt.se"
              className="text-orange-600 hover:underline font-medium"
              data-testid="link-license-support"
            >
              Kontakta support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
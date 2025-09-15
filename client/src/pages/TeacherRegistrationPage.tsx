import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import TeacherRegistration from '@/components/auth/TeacherRegistration';
import { ArrowLeft, Home } from 'lucide-react';

export default function TeacherRegistrationPage() {
  const [, navigate] = useLocation();
  
  // Get code from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const codeFromUrl = urlParams.get('code');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
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
              <Home className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Ordflyt.se</h1>
            </div>
          </div>
          
          <div className="max-w-md mx-auto text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Skapa ditt lärarkonto
            </h2>
            <p className="text-gray-600">
              Registrera dig för att komma igång med att undervisa svenska grammatik för dina elever.
            </p>
          </div>
        </div>

        {/* Registration Form */}
        <TeacherRegistration 
          initialCode={codeFromUrl || undefined}
          onSuccess={() => {
            // Optional: Navigate somewhere after successful registration
          }} 
        />

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            Har du redan ett konto?{' '}
            <button 
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:underline font-medium"
              data-testid="link-existing-account"
            >
              Logga in här
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
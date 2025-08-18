import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { X, Lock } from "lucide-react";

interface LoginPromptProps {
  title?: string;
  message?: string;
  onClose?: () => void;
  className?: string;
}

export function LoginPrompt({ 
  title = "Logga in för att fortsätta",
  message = "För att använda alla funktioner behöver du logga in eller skapa ett konto.",
  onClose,
  className = ""
}: LoginPromptProps) {
  const [, setLocation] = useLocation();
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const handleLogin = () => {
    setLocation("/login");
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 ${className}`}>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4"
              onClick={handleClose}
              data-testid="button-close-login-prompt"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          <div className="space-y-3">
            <Button 
              onClick={handleLogin} 
              className="w-full"
              data-testid="button-login-from-prompt"
            >
              Logga in
            </Button>
            
            <div className="text-sm text-muted-foreground">
              Har du inget konto?{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm"
                onClick={() => setLocation("/registrera")}
                data-testid="button-register-from-prompt"
              >
                Registrera dig här
              </Button>
            </div>
          </div>

          {onClose && (
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="w-full"
              data-testid="button-continue-browsing"
            >
              Fortsätt titta
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPrompt;
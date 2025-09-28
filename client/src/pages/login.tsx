import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, LogIn, UserPlus, AlertTriangle, Home } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const loginSchema = z.object({
  username: z.string().min(1, "Användarnamn eller e-post krävs"),
  password: z.string().min(1, "Lösenord krävs"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Caps Lock detection
  useEffect(() => {
    const detectCapsLock = (event: KeyboardEvent) => {
      // Safety check to ensure getModifierState exists and event is a proper KeyboardEvent
      if (event && typeof event.getModifierState === 'function') {
        setIsCapsLockOn(event.getModifierState('CapsLock'));
      }
    };

    // Add event listeners for caps lock detection
    document.addEventListener('keydown', detectCapsLock);
    document.addEventListener('keyup', detectCapsLock);

    return () => {
      document.removeEventListener('keydown', detectCapsLock);
      document.removeEventListener('keyup', detectCapsLock);
    };
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      // Normalize password and detect if it's a 6-character setup code (uppercase letters and numbers)
      const normalizedPassword = data.password.trim().toUpperCase();
      
      // Exclude hardcoded development credentials from setup code detection
      const isDevelopmentCredential = 
        (data.username === 'admin' && data.password === 'admin') ||
        (data.username === 'larare' && data.password === 'larare') ||
        (data.username === 'elev' && data.password === 'elev');
      
      const isSetupCode = !isDevelopmentCredential && /^[A-Z0-9]{6}$/.test(normalizedPassword);
      
      let result: any;
      let response: Response;
      
      if (isSetupCode) {
        // Use setup code endpoint for students
        response = await fetch("/api/student/login-with-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: data.username,
            setupCode: normalizedPassword
          }),
          credentials: "include",
        });
        result = await response.json();
      } else {
        // Try regular user login first
        response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
          credentials: "include",
        });
        result = await response.json();
        
        // If auth login fails, try student password login as fallback
        if (!response.ok && (response.status === 401 || response.status === 404)) {
          response = await fetch("/api/student/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
            credentials: "include",
          });
          result = await response.json();
        }
      }

      if (!response.ok) {
        setError(result.error || "Inloggning misslyckades");
        return;
      }

      // Store CSRF token
      if (result.csrfToken) {
        localStorage.setItem("csrfToken", result.csrfToken);
      }

      toast({
        title: "Inloggning lyckades",
        description: `Välkommen ${result.user?.username || result.student?.username}!`,
      });

      // Invalidate auth cache to trigger auth state update
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      // Determine redirect path based on role if not provided
      let redirectPath = result.redirectPath;
      
      // Handle must-change-password cases for students
      if ((result.student?.mustChangePassword || result.requirePasswordChange) && !redirectPath) {
        redirectPath = '/elev/password';
      } else if (!redirectPath) {
        const userRole = result.user?.role || result.student?.role || 'ELEV';
        switch (userRole.toUpperCase()) {
          case 'ELEV':
          case 'STUDENT':
            redirectPath = '/elev';
            break;
          case 'TEACHER':
          case 'LÄRARE':
            redirectPath = '/teacher';
            break;
          case 'ADMIN':
            redirectPath = '/admin';
            break;
          default:
            redirectPath = '/';
        }
      }

      // Redirect after successful login
      setTimeout(() => {
        setLocation(redirectPath);
      }, 500);
    } catch (err) {
      console.error("Login error:", err);
      setError("Ett fel uppstod vid inloggning. Försök igen senare.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      {/* Back to Home button */}
      <div className="fixed top-4 left-4 z-10">
        <Link href="/">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-all"
            data-testid="button-back-home"
          >
            <Home className="mr-2 h-4 w-4" />
            Huvudmeny
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Välkommen till Ordflyt
          </CardTitle>
          <CardDescription className="text-center">
            Logga in för att fortsätta till språkövningarna
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Användarnamn eller e-post</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="Ange användarnamn eller e-post"
                        autoComplete="username"
                        disabled={isLoading}
                        data-testid="input-username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lösenord</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Ange ditt lösenord"
                          autoComplete="current-password"
                          disabled={isLoading}
                          data-testid="input-password"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {isCapsLockOn && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Caps Lock är aktiverat</span>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <>
                    <span className="mr-2">Loggar in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Logga in
                  </>
                )}
              </Button>
            </form>
          </Form>

          {/* Forgot Password Link */}
          <div className="mt-4 text-center">
            <Link href="/forgot-password">
              <Button 
                variant="ghost" 
                className="text-sm text-muted-foreground hover:text-foreground"
                data-testid="link-forgot-password"
              >
                Glömt lösenord?
              </Button>
            </Link>
          </div>

          {/* Registration Links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Har du inget konto än?
            </p>
            <div className="space-y-2">
              <Link href="/registrera-larare">
                <Button 
                  variant="outline" 
                  className="w-full"
                  data-testid="button-register-teacher"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Skapa lärarkonto
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground">
                För lärare som vill använda Ordflyt i undervisningen
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Testanvändare:</strong>
            </p>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>• Elev: elev / elev</p>
              <p>• Lärare: larare / larare</p>
              <p>• Admin: admin / admin</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
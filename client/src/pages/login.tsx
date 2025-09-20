import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      // Detect if password is a 6-character setup code (uppercase letters and numbers)
      const isSetupCode = /^[A-Z0-9]{6}$/.test(data.password);
      
      let endpoint = "/api/auth/login";
      let requestBody: any = data;
      
      if (isSetupCode) {
        // Use setup code endpoint for students
        endpoint = "/api/student/login-with-code";
        requestBody = {
          username: data.username,
          setupCode: data.password
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

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

      // Redirect based on role or response
      setTimeout(() => {
        setLocation(result.redirectPath || "/");
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
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Ange ditt lösenord"
                          autoComplete="current-password"
                          disabled={isLoading}
                          data-testid="input-password"
                        />
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
                    </FormControl>
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
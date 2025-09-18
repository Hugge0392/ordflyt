import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, LogIn, BookOpen } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const studentLoginSchema = z.object({
  username: z.string().min(1, "Användarnamn krävs"),
  password: z.string().min(1, "Lösenord krävs"),
});

type StudentLoginFormData = z.infer<typeof studentLoginSchema>;

interface StudentLoginResponse {
  success: boolean;
  student: {
    id: string;
    username: string;
    studentName: string;
    classId: string;
    mustChangePassword: boolean;
    lastLogin: string | null;
  };
}

export default function StudentLoginPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<StudentLoginFormData>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: StudentLoginFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/student/login', data) as StudentLoginResponse;

      toast({
        title: "Inloggning lyckades",
        description: `Välkommen ${response.student.studentName}!`,
      });

      // Handle password change requirement
      if (response.student.mustChangePassword) {
        // Redirect to password change page
        setTimeout(() => {
          setLocation("/elev/password");
        }, 500);
      } else {
        // Redirect to student dashboard/game
        setTimeout(() => {
          setLocation("/spela");
        }, 500);
      }
    } catch (err: any) {
      console.error("Student login error:", err);
      setError(err.message || "Ett fel uppstod vid inloggning. Försök igen senare.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <BookOpen className="h-6 w-6 text-green-600" />
            Elevlogin
          </CardTitle>
          <CardDescription className="text-center">
            Logga in för att komma till dina språkövningar
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
                    <FormLabel>Användarnamn</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="Ange ditt användarnamn"
                        autoComplete="username"
                        disabled={isLoading}
                        data-testid="input-student-username"
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
                          data-testid="input-student-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                          data-testid="button-toggle-student-password"
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
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isLoading}
                data-testid="button-student-login"
              >
                {isLoading ? (
                  <>
                    <span className="mr-2">Loggar in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Logga in som elev
                  </>
                )}
              </Button>
            </form>
          </Form>

          {/* Back to home */}
          <div className="mt-6 text-center">
            <Link href="/">
              <Button 
                variant="ghost" 
                className="text-sm text-muted-foreground hover:text-foreground"
                data-testid="link-back-home"
              >
                ← Tillbaka till startsidan
              </Button>
            </Link>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              <strong>För elever:</strong>
            </p>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>Använd det användarnamn och lösenord som din lärare har gett dig.</p>
              <p>Om du glömt ditt lösenord, kontakta din lärare.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
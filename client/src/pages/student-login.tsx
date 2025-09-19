import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, LogIn, BookOpen, Key } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const studentLoginSchema = z.object({
  username: z.string().min(1, "Användarnamn krävs"),
  password: z.string().min(1, "Lösenord krävs"),
});

const studentSetupCodeSchema = z.object({
  username: z.string().min(1, "Användarnamn krävs"),
  setupCode: z.string().min(1, "Engångskod krävs"),
});

type StudentLoginFormData = z.infer<typeof studentLoginSchema>;
type StudentSetupCodeFormData = z.infer<typeof studentSetupCodeSchema>;

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
  message?: string;
  requirePasswordChange?: boolean;
}

export default function StudentLoginPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState<"password" | "setupCode">("setupCode");
  const { toast } = useToast();

  const loginForm = useForm<StudentLoginFormData>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const setupCodeForm = useForm<StudentSetupCodeFormData>({
    resolver: zodResolver(studentSetupCodeSchema),
    defaultValues: {
      username: "",
      setupCode: "",
    },
  });

  const onPasswordLogin = async (data: StudentLoginFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/student/login', data) as StudentLoginResponse;

      toast({
        title: "Inloggning lyckades",
        description: response.message || `Välkommen ${response.student.studentName}!`,
      });

      // Handle password change requirement
      if (response.student.mustChangePassword || response.requirePasswordChange) {
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

  const onSetupCodeLogin = async (data: StudentSetupCodeFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/student/login-with-code', data) as StudentLoginResponse;

      toast({
        title: "Första inloggning lyckades",
        description: response.message || `Välkommen ${response.student.studentName}! Du måste nu ändra ditt lösenord.`,
      });

      // Always redirect to password change after setup code login
      setTimeout(() => {
        setLocation("/elev/password");
      }, 500);
    } catch (err: any) {
      console.error("Student setup code login error:", err);
      setError(err.message || "Ett fel uppstod vid inloggning med engångskod. Försök igen senare.");
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
          <Tabs value={loginType} onValueChange={(value) => {
            setLoginType(value as "password" | "setupCode");
            setError(null); // Clear error when switching tabs
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="setupCode" data-testid="tab-setup-code">
                <Key className="h-4 w-4 mr-2" />
                Engångskod
              </TabsTrigger>
              <TabsTrigger value="password" data-testid="tab-password">
                <LogIn className="h-4 w-4 mr-2" />
                Lösenord
              </TabsTrigger>
            </TabsList>

            <TabsContent value="setupCode" className="mt-4">
              <Form {...setupCodeForm}>
                <form onSubmit={setupCodeForm.handleSubmit(onSetupCodeLogin)} className="space-y-4">
                  <FormField
                    control={setupCodeForm.control}
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
                            data-testid="input-student-username-setupcode"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={setupCodeForm.control}
                    name="setupCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Engångskod</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            placeholder="Ange din engångskod från läraren"
                            autoComplete="off"
                            disabled={isLoading}
                            data-testid="input-student-setupcode"
                          />
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
                    data-testid="button-student-login-setupcode"
                  >
                    {isLoading ? (
                      <>
                        <span className="mr-2">Loggar in...</span>
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        Logga in med engångskod
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="password" className="mt-4">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onPasswordLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
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
                            data-testid="input-student-username-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
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
                    data-testid="button-student-login-password"
                  >
                    {isLoading ? (
                      <>
                        <span className="mr-2">Loggar in...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Logga in med lösenord
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>

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
              {loginType === "setupCode" ? (
                <>
                  <p><strong>Första gången:</strong> Använd den engångskod som din lärare har gett dig.</p>
                  <p>Efter första inloggningen kan du använda ditt eget lösenord.</p>
                  <p>Om du fått en ny engångskod, använd fliken "Engångskod" ovan.</p>
                </>
              ) : (
                <>
                  <p>Använd det användarnamn och lösenord som du själv har valt.</p>
                  <p><strong>Första gången?</strong> Byt till fliken "Engångskod" ovan.</p>
                  <p>Om du glömt ditt lösenord, be din lärare om en ny engångskod.</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
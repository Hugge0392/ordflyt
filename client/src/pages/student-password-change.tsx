import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

// Schema for password change form
const passwordChangeSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Lösenordet måste vara minst 6 tecken långt"),
  confirmPassword: z.string().min(6, "Bekräftelsen måste vara minst 6 tecken lång"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Lösenorden matchar inte",
  path: ["confirmPassword"],
});

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

interface StudentMeResponse {
  student: {
    id: string;
    username: string;
    studentName: string;
    classId: string;
    mustChangePassword: boolean;
    lastLogin: string | null;
    createdAt: string;
  };
  session: {
    id: string;
    expiresAt: string;
  };
}

interface PasswordChangeResponse {
  success: boolean;
  message: string;
}

export default function StudentPasswordChangePage() {
  const [, setLocation] = useLocation();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Get current student information
  const { data: studentData, isLoading: isLoadingStudent, error: studentError } = useQuery<StudentMeResponse>({
    queryKey: ['/api/student/me'],
    retry: false,
  });

  // Redirect if not a student or doesn't need to change password
  useEffect(() => {
    if (studentError || (studentData && !studentData.student.mustChangePassword)) {
      // If not authenticated or doesn't need to change password, redirect
      setLocation('/elev/login');
    }
  }, [studentData, studentError, setLocation]);

  const mustChangePassword = studentData?.student?.mustChangePassword || false;

  const form = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: PasswordChangeFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const requestData: { currentPassword?: string; newPassword: string } = {
        newPassword: data.newPassword,
      };

      // Only include current password if it's required
      if (!mustChangePassword && data.currentPassword) {
        requestData.currentPassword = data.currentPassword;
      }

      const response = await apiRequest('POST', '/api/student/password', requestData) as PasswordChangeResponse;

      toast({
        title: "Lösenord ändrat",
        description: response.message || "Ditt lösenord har uppdaterats framgångsrikt!",
      });

      // Redirect to student home after successful password change
      setTimeout(() => {
        setLocation("/elev");
      }, 1000);

    } catch (err: any) {
      console.error("Password change error:", err);
      setError(err.message || "Ett fel uppstod vid lösenordsändring. Försök igen senare.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Laddar...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Lock className="h-6 w-6 text-orange-600" />
            Byt lösenord
          </CardTitle>
          <CardDescription className="text-center">
            {mustChangePassword 
              ? "Du måste byta lösenord vid första inloggningen"
              : "Ändra ditt lösenord"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Current password field - only show if password change is not forced */}
              {!mustChangePassword && (
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nuvarande lösenord</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Ange nuvarande lösenord"
                            autoComplete="current-password"
                            disabled={isLoading}
                            data-testid="input-current-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            disabled={isLoading}
                            data-testid="button-toggle-current-password"
                          >
                            {showCurrentPassword ? (
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
              )}

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nytt lösenord</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Ange nytt lösenord (minst 6 tecken)"
                          autoComplete="new-password"
                          disabled={isLoading}
                          data-testid="input-new-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          disabled={isLoading}
                          data-testid="button-toggle-new-password"
                        >
                          {showNewPassword ? (
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

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bekräfta nytt lösenord</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Ange nytt lösenord igen"
                          autoComplete="new-password"
                          disabled={isLoading}
                          data-testid="input-confirm-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={isLoading}
                          data-testid="button-toggle-confirm-password"
                        >
                          {showConfirmPassword ? (
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
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={isLoading}
                data-testid="button-change-password"
              >
                {isLoading ? (
                  <>
                    <span className="mr-2">Ändrar lösenord...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Byt lösenord
                  </>
                )}
              </Button>
            </form>
          </Form>

          {mustChangePassword && (
            <div className="mt-6 p-4 bg-orange-50 border-l-4 border-orange-400 rounded-lg">
              <p className="text-sm text-orange-700">
                <strong>Viktigt:</strong> Du måste byta lösenord för att kunna fortsätta använda systemet.
                Välj ett säkert lösenord som du kommer ihåg.
              </p>
            </div>
          )}

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Tips för ett säkert lösenord:</strong>
            </p>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>• Minst 6 tecken långt</p>
              <p>• Använd en blandning av bokstäver och siffror</p>
              <p>• Välj något du kommer ihåg</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
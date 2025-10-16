import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, "E-postadress krävs")
    .email("Ange en giltig e-postadress"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/auth/forgot-password", data);

      setIsSuccess(true);
      toast({
        title: "E-post skickad",
        description: "Om e-postadressen finns i vårt system har en återställningslänk skickats.",
      });
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("Ett fel uppstod. Försök igen senare.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-green-600">
              E-post skickad
            </CardTitle>
            <CardDescription className="text-center">
              Kontrollera din e-post för återställningsinstruktioner
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Om e-postadressen finns i vårt system har en återställningslänk skickats. 
                Länken är giltig i 1 timme.
              </AlertDescription>
            </Alert>
            
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Har du inte fått något e-brev? Kontrollera din skräppost.
              </p>
              
              <div className="space-y-2">
                <Link href="/login">
                  <Button variant="outline" className="w-full" data-testid="button-back-to-login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tillbaka till inloggning
                  </Button>
                </Link>
                
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => {
                    setIsSuccess(false);
                    form.reset();
                  }}
                  data-testid="button-try-again"
                >
                  Försök med annan e-postadress
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Glömt lösenord
          </CardTitle>
          <CardDescription className="text-center">
            Ange din e-postadress så skickar vi en återställningslänk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-postadress</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="din.epost@exempel.se"
                        autoComplete="email"
                        disabled={isLoading}
                        data-testid="input-email"
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
                className="w-full"
                disabled={isLoading}
                data-testid="button-send-reset"
              >
                {isLoading ? (
                  <>
                    <span className="mr-2">Skickar...</span>
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Skicka återställningslänk
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <Link href="/login">
              <Button 
                variant="ghost" 
                className="text-sm"
                data-testid="link-back-to-login"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tillbaka till inloggning
              </Button>
            </Link>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Säkerhetsinformation:</strong>
            </p>
            <p className="mt-2 text-xs text-muted-foreground text-center">
              Av säkerhetsskäl visar vi samma meddelande oavsett om e-postadressen 
              finns i vårt system eller inte.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
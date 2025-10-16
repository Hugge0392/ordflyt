import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Mail, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface EmailConfig {
  hasPostmarkToken: boolean;
  hasFromEmail: boolean;
  fromEmail: string;
  configValid: boolean;
  testResult: string | null;
}

interface TestEmailData {
  email: string;
  testType: 'registration_code' | 'confirmation' | 'custom';
  customMessage?: string;
  customSubject?: string;
}

export function EmailTestPanel() {
  const [email, setEmail] = useState("");
  const [testType, setTestType] = useState<'registration_code' | 'confirmation' | 'custom'>('registration_code');
  const [customMessage, setCustomMessage] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const { toast } = useToast();

  // Fetch email configuration
  const { data: emailConfig, isLoading: configLoading } = useQuery<{ config: EmailConfig }>({
    queryKey: ['/api/email/config'],
    retry: false
  });

  // Test email mutation
  const testEmailMutation = useMutation({
    mutationFn: async (data: TestEmailData) => {
      return apiRequest('POST', '/api/email/test', data);
    },
    onSuccess: (data) => {
      toast({
        title: "E-post skickad!",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Fel vid e-posttest",
        description: error.message || "Ett fel uppstod",
      });
    }
  });

  const handleTestEmail = () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "E-postadress krävs",
        description: "Ange en giltig e-postadress för att testa",
      });
      return;
    }

    // Check if email domain matches sender domain for pending approval accounts
    const emailDomain = email.split('@')[1];
    const senderDomain = config?.fromEmail?.split('@')[1];
    
    if (emailDomain !== senderDomain) {
      toast({
        variant: "destructive",
        title: "Domänvarning",
        description: `Om ditt Postmark-konto väntar på godkännande kan du bara skicka till ${senderDomain}-adresser. Försök ändå eller kontakta Postmark för fullständigt godkännande.`,
      });
    }

    testEmailMutation.mutate({ 
      email, 
      testType,
      ...(testType === 'custom' && {
        customMessage: customMessage || undefined,
        customSubject: customSubject || undefined
      })
    });
  };

  if (configLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            E-posttest
          </CardTitle>
          <CardDescription>Laddar konfiguration...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const config = emailConfig?.config;

  return (
    <div className="space-y-6">
      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            E-postkonfiguration
          </CardTitle>
          <CardDescription>Status för Postmark-integration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              {config?.hasPostmarkToken ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">
                Postmark API-nyckel: {config?.hasPostmarkToken ? 'Konfigurerad' : 'Saknas'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {config?.hasFromEmail ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">
                Avsändar-e-post: {config?.hasFromEmail ? 'Konfigurerad' : 'Saknas'}
              </span>
            </div>
          </div>
          
          {config?.fromEmail && (
            <div className="text-sm text-muted-foreground">
              <strong>Avsändaradress:</strong> {config.fromEmail}
            </div>
          )}

          {config?.testResult && (
            <Alert className={config.configValid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{config.testResult}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Email Test Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Testa e-postfunktion
          </CardTitle>
          <CardDescription>
            Skicka testmeddelanden för att verifiera att e-postfunktionen fungerar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-postadress</Label>
            <Input
              id="email"
              type="email"
              placeholder="test@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-test-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="testType">Typ av testmeddelande</Label>
            <Select value={testType} onValueChange={(value: any) => setTestType(value)}>
              <SelectTrigger data-testid="select-test-type">
                <SelectValue placeholder="Välj testtyp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="registration_code">Registreringskod för lärare</SelectItem>
                <SelectItem value="confirmation">Registreringsbekräftelse</SelectItem>
                <SelectItem value="custom">Anpassat meddelande</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {testType === 'custom' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="customSubject">Ämnesrad (valfritt)</Label>
                <Input
                  id="customSubject"
                  type="text"
                  placeholder="Test från Ordflyt.se"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  data-testid="input-custom-subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customMessage">Meddelande</Label>
                <textarea
                  id="customMessage"
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical min-h-[100px]"
                  placeholder="Skriv ditt testmeddelande här..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  data-testid="textarea-custom-message"
                />
                <p className="text-xs text-muted-foreground">
                  Du kan använda radbrytningar för formatering. HTML stöds inte.
                </p>
              </div>
            </>
          )}

          <Button 
            onClick={handleTestEmail} 
            disabled={testEmailMutation.isPending || !config?.configValid}
            className="w-full"
            data-testid="button-send-test-email"
          >
            {testEmailMutation.isPending ? "Skickar..." : "Skicka testmeddelande"}
          </Button>

          {!config?.configValid && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                E-postkonfiguration är inte komplett. Kontrollera att POSTMARK_API_TOKEN och FROM_EMAIL är korrekt konfigurerade.
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Viktigt:</strong> Om ditt Postmark-konto väntar på godkännande kan du bara skicka e-post till adresser med samma domän som avsändaradressen ({config?.fromEmail?.split('@')[1] || 'ordflyt.se'}). För att testa med andra domäner behöver kontot godkännas av Postmark först.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testEmailMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Testresultat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm"><strong>Meddelande:</strong> {testEmailMutation.data.message}</p>
              {testEmailMutation.data.testData && (
                <div className="text-sm text-muted-foreground">
                  <strong>Testdata:</strong>
                  <pre className="mt-1 text-xs bg-muted p-2 rounded">
                    {JSON.stringify(testEmailMutation.data.testData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
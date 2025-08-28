import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";
import { EmailTestPanel } from "@/components/EmailTestPanel";

export default function AdminEmailTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="outline" size="sm" data-testid="button-back-admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till adminpanel
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="w-8 h-8 text-blue-600" />
              E-posttest
            </h1>
            <p className="text-gray-600">Testa e-postfunktionalitet och Postmark-integration</p>
          </div>
        </div>

        <EmailTestPanel />
      </div>
    </div>
  );
}
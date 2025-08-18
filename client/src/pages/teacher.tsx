import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Users, BookOpen, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TeacherPage() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication
    fetch("/api/auth/me")
      .then(res => {
        if (!res.ok) {
          throw new Error("Not authenticated");
        }
        return res.json();
      })
      .then(data => {
        if (data.user.role !== "LARARE" && data.user.role !== "ADMIN") {
          throw new Error("Unauthorized");
        }
        setUser(data.user);
        // Store CSRF token
        if (data.csrfToken) {
          localStorage.setItem("csrfToken", data.csrfToken);
        }
      })
      .catch(() => {
        setLocation("/login");
      });
  }, [setLocation]);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": localStorage.getItem("csrfToken") || "",
        },
      });

      if (response.ok) {
        localStorage.removeItem("csrfToken");
        toast({
          title: "Utloggad",
          description: "Du har loggats ut från systemet",
        });
        setLocation("/login");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Fel",
        description: "Kunde inte logga ut",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Laddar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Lärarpanel</h1>
              <span className="ml-3 text-sm text-gray-500">
                Inloggad som: {user.username}
              </span>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logga ut
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Välkommen, {user.username}!
          </h2>
          <p className="text-gray-600">
            Detta är lärarpanelen där du kommer kunna hantera klasser och elever.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                Mina klasser
              </CardTitle>
              <CardDescription>
                Hantera dina klasser och elever
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Skapa nya klasser, lägg till elever och följ deras framsteg.
              </p>
              <Button variant="outline" className="w-full" disabled>
                Kommer snart
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-green-600" />
                Övningsresultat
              </CardTitle>
              <CardDescription>
                Se elevernas resultat och framsteg
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Få insikt i elevernas prestationer och identifiera utvecklingsområden.
              </p>
              <Button variant="outline" className="w-full" disabled>
                Kommer snart
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2 text-purple-600" />
                Inställningar
              </CardTitle>
              <CardDescription>
                Hantera dina kontoinställningar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Uppdatera din profil och anpassa dina preferenser.
              </p>
              <Button variant="outline" className="w-full" disabled>
                Kommer snart
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">
            📚 Lärarpanelen är under utveckling
          </h3>
          <p className="text-sm text-blue-800">
            Här kommer du snart kunna:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-blue-700 list-disc list-inside">
            <li>Skapa och hantera klasser</li>
            <li>Lägga till elever via CSV-import eller manuellt</li>
            <li>Generera inloggningskoder för elever</li>
            <li>Följa elevernas framsteg i realtid</li>
            <li>Exportera resultat och statistik</li>
            <li>Skapa egna övningar och uppgifter</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
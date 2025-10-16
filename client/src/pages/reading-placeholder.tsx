import { Link } from "wouter";
import { BookOpen, Search, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ReadingPlaceholderProps {
  type: 'deckargator' | 'admin';
}

export default function ReadingPlaceholder({ type }: ReadingPlaceholderProps) {
  const config = {
    deckargator: {
      title: "Deckargåtor",
      icon: Search,
      description: "Spännande mysterier att lösa",
      content: "Här kommer vi att ha interaktiva deckargåtor där eleverna tränar läsförståelse genom att lösa spännande mysterier. Funktionen är under utveckling."
    },
    admin: {
      title: "Admin",
      icon: Shield,
      description: "Hantera innehåll och inställningar",
      content: "Administratörspanelen för att lägga till nytt innehåll, konfigurera övningar och hantera läsförståelse-aktiviteter. Funktionen är under utveckling."
    }
  };

  const { title, icon: Icon, description, content } = config[type];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center gap-3">
            <Link href="/lasforstaelse" className="text-sm text-muted-foreground hover:text-foreground">
              ← Tillbaka till läsförståelse
            </Link>
            <div className="w-px h-6 bg-border"></div>
            <Icon className="w-6 h-6" />
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Icon className="w-10 h-10 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription className="text-base">{description}</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {content}
            </p>
            <div className="bg-muted/50 rounded-lg p-6">
              <h3 className="font-semibold mb-2">Kommer snart</h3>
              <p className="text-sm text-muted-foreground">
                Den här funktionen är under utveckling och kommer att vara tillgänglig inom kort.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
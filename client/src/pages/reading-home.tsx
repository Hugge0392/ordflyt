import { Link } from "wouter";
import { BookOpen, Search, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReadingHome() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                ← Tillbaka till startsidan
              </Link>
              <div className="w-px h-6 bg-border"></div>
              <BookOpen className="w-6 h-6" />
              <div>
                <h1 className="text-2xl font-bold">Läsförståelse</h1>
                <p className="text-sm text-muted-foreground">Välj övningstyp</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Läsförståelseövningar */}
          <Link href="/lasforstaelse/ovningar">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-xl">Läsförståelseövningar</CardTitle>
                <CardDescription>
                  Interaktiva texter med frågor och ordförklaringar
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Träna läsförståelse med guidade texter och frågor anpassade för olika årskurser.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Deckargåtor */}
          <Link href="/lasforstaelse/deckargator">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Search className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-xl">Deckargåtor</CardTitle>
                <CardDescription>
                  Lös mysterier genom läsning och logik
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Spännande mysterier där eleverna tränar läsförståelse genom att lösa gåtor.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Skapa lektion */}
          <Link href="/lasforstaelse/skapa">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-xl">Skapa lektion</CardTitle>
                <CardDescription>
                  Skapa nya läsförståelse-lektioner
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Använd det avancerade verktyget för att skapa interaktiva lektioner med bilder och frågor.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Lektioner */}
          <Link href="/lasforstaelse/lektioner">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-xl">Lektioner</CardTitle>
                <CardDescription>
                  Hantera publicerade lektioner
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Se, redigera och hantera alla publicerade läsförståelse-lektioner.
                </p>
              </CardContent>
            </Card>
          </Link>

        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold mb-3">Utveckla läsförståelse steg för steg</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Våra läsförståelseövningar hjälper eleverna att förbättra sin läsning genom interaktiva texter, 
              ordförklaringar och anpassade frågor. Välj mellan traditionella övningar eller spännande deckargåtor 
              som gör läsningen till en utmaning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, PenTool, BookOpen, Target, Users } from "lucide-react";

export default function AdminGrammatik() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="outline" size="sm" data-testid="button-back-admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till adminpanel
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <PenTool className="w-8 h-8 text-green-600" />
              Grammatik
            </h1>
            <p className="text-gray-600">Hantera ordklasser och grammatikövningar</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/lesson-builder">
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PenTool className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">Skapa Lektioner</CardTitle>
                <CardDescription>
                  Memory, Piratgräv, Korsord och alla dina grammatikspel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>• 🃏 Memory-spel</div>
                  <div>• 🏴‍☠️ Piratgräv</div>
                  <div>• 🔤 Korsord</div>
                  <div>• 🐉 Ordklassdrak & mer</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/grammatik">
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">Spela grammatikövningar</CardTitle>
                <CardDescription>
                  Testa publicerade lektioner och ordklassträning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>• Ordklassidentifiering</div>
                  <div>• Interaktiva meningar</div>
                  <div>• Progressionssystem</div>
                  <div>• Tidstester och quiz</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/klasskamp">
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">KlassKamp</CardTitle>
                <CardDescription>
                  Flerspelarspel för grammatikövningar i klassrummet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>• Tävlingsspel för klassen</div>
                  <div>• Realtidsresultat</div>
                  <div>• Lärarverktyg</div>
                  <div>• Gruppaktiviteter</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Snabbåtkomst</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-2">Senaste aktivitet</h3>
              <p className="text-gray-600 text-sm">Här visas senaste ändringar i grammatikövningarna</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-2">Statistik</h3>
              <p className="text-gray-600 text-sm">Översikt över användning av grammatikspelen</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
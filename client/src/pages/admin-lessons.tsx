import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Target, Gamepad2, BookOpen, PenTool, Settings, Plus } from "lucide-react";

export default function AdminLessons() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 p-6">
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
              <Target className="w-8 h-8 text-orange-600" />
              Skapa lektion
            </h1>
            <p className="text-gray-600">Bygg interaktiva lektioner och språkspel</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/lasforstaelse/admin">
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">Läsförståelse</CardTitle>
                <CardDescription>
                  Skapa läsförståelsetexter med frågor och definitioner
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>• Blog-stil editor med rik text</div>
                  <div>• Bild- och media-stöd</div>
                  <div>• Flera frågetyper</div>
                  <div>• Ordförklaringar</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/grammatik">
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PenTool className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">Grammatik</CardTitle>
                <CardDescription>
                  Hantera ordklasser och grammatikövningar
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

          <Link href="/admin/lesson-templates">
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Settings className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">Lesson Templates</CardTitle>
                <CardDescription>
                  Hantera lesson templates som lärare kan använda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>• Skapa återanvändbara mallar</div>
                  <div>• Kategorisera lektioner</div>
                  <div>• Anpassa svårighetsgrad</div>
                  <div>• Teacher-friendly innehåll</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group opacity-75">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Gamepad2 className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Interaktiva spel</CardTitle>
              <CardDescription>
                Avancerad spelbyggare för språkspel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <div>• Ordrace och tidsutmaningar</div>
                <div>• Korsord och ordpussel</div>
                <div>• Rimspel och synonymer</div>
                <div>• Interaktiva berättelser</div>
              </div>
              <div className="mt-4">
                <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                  Kommer snart
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Snabbåtkomst</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/lesson-builder">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Ny läsförståelselektion</h3>
                      <p className="text-sm text-gray-600">Skapa en ny text med frågor</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/sentences">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <PenTool className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Hantera meningar</h3>
                      <p className="text-sm text-gray-600">Lägg till ordklassmeningar</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
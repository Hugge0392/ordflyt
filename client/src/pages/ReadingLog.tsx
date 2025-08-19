import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import LoginPrompt from "@/components/LoginPrompt";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Plus, Calendar, Clock, Star } from "lucide-react";

export default function ReadingLog() {
  const { isAuthenticated } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleInteraction = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    // Handle authenticated interaction
  };

  // Demo reading log entries for browsing
  const demoEntries = [
    {
      id: '1',
      title: 'Astrid Lindgren - Pippi Långstrump',
      author: 'Astrid Lindgren',
      pages: 158,
      currentPage: 89,
      rating: 5,
      startDate: '2025-08-15',
      notes: 'Rolig bok om en stark flicka som vågar vara annorlunda.',
      category: 'Barnbok'
    },
    {
      id: '2',
      title: 'Selma Lagerlöf - Nils Holgerssons underbara resa',
      author: 'Selma Lagerlöf',
      pages: 245,
      currentPage: 245,
      rating: 4,
      startDate: '2025-08-10',
      finishDate: '2025-08-18',
      notes: 'Fantastisk berättelse om Sverige och dess landskap.',
      category: 'Klassiker'
    },
    {
      id: '3',
      title: 'Henning Mankell - Pojken som sov med snö i sin säng',
      author: 'Henning Mankell',
      pages: 189,
      currentPage: 45,
      rating: null,
      startDate: '2025-08-19',
      notes: '',
      category: 'Ungdomsbok'
    }
  ];

  const getProgressPercentage = (current: number, total: number) => {
    return Math.round((current / total) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-green-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/">
              <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors">
                <i className="fas fa-arrow-left"></i>
                <span>Tillbaka till startsidan</span>
              </button>
            </Link>
            
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 justify-center">
                <BookOpen className="h-8 w-8 text-green-600" />
                Läslogg
              </h1>
              <p className="text-gray-600 mt-2">Håll koll på dina läsäventyr</p>
            </div>
            
            <div className="w-32"> {/* Spacer for center alignment */}</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border-green-200">
            <CardContent className="p-6 text-center">
              <BookOpen className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900">3</h3>
              <p className="text-gray-600">Böcker i logg</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-green-200">
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900">1</h3>
              <p className="text-gray-600">Avslutade böcker</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-green-200">
            <CardContent className="p-6 text-center">
              <Star className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900">4.5</h3>
              <p className="text-gray-600">Genomsnittligt betyg</p>
            </CardContent>
          </Card>
        </div>

        {/* Add New Book Button */}
        <div className="mb-8 text-center">
          <Button 
            onClick={handleInteraction}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-semibold text-lg"
            data-testid="button-add-book"
          >
            <Plus className="h-5 w-5 mr-2" />
            Lägg till ny bok
          </Button>
        </div>

        {/* Reading List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Mina böcker</h2>
          
          {demoEntries.map((entry) => (
            <Card key={entry.id} className="bg-white border-green-100 hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl text-gray-900 mb-2">{entry.title}</CardTitle>
                    <p className="text-gray-600 mb-2">av {entry.author}</p>
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      {entry.category}
                    </span>
                  </div>
                  
                  <div className="text-right">
                    {entry.rating && (
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-4 w-4 ${i < entry.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    )}
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {entry.startDate}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Läsframsteg</span>
                      <span className="text-sm text-gray-500">
                        {entry.currentPage} / {entry.pages} sidor
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          entry.currentPage === entry.pages ? 'bg-green-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${getProgressPercentage(entry.currentPage, entry.pages)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      {getProgressPercentage(entry.currentPage, entry.pages)}% klar
                      {entry.finishDate && (
                        <span className="ml-2 text-green-600 font-medium">✓ Avslutad</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Notes */}
                  {entry.notes && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700 italic">"{entry.notes}"</p>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleInteraction}
                      data-testid={`button-edit-${entry.id}`}
                    >
                      Redigera
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleInteraction}
                      data-testid={`button-update-progress-${entry.id}`}
                    >
                      Uppdatera framsteg
                    </Button>
                    {!entry.finishDate && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleInteraction}
                        className="text-green-600 hover:text-green-700"
                        data-testid={`button-finish-${entry.id}`}
                      >
                        Markera som klar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State Message for Demo */}
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">
            Detta är en förhandstitt av läslogg-funktionen
          </p>
          <p className="text-gray-400">
            Logga in för att börja föra din egen läslogg
          </p>
        </div>
      </main>

      {/* Login Prompt */}
      {showLoginPrompt && (
        <LoginPrompt
          title="Logga in för att använda läsloggen"
          message="För att lägga till böcker och föra din egen läslogg behöver du logga in eller skapa ett konto."
          onClose={() => setShowLoginPrompt(false)}
        />
      )}
    </div>
  );
}
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Sentence, type WordClass, type Word } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface EditingSentence {
  content: string;
  level: number;
  wordClassType: string;
  difficulty: number;
  words: Word[];
}

export default function Admin() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingData, setEditingData] = useState<EditingSentence>({
    content: "",
    level: 1,
    wordClassType: "noun",
    difficulty: 1,
    words: []
  });
  const [filterWordClass, setFilterWordClass] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");

  const { data: sentences = [], isLoading: sentencesLoading } = useQuery<Sentence[]>({
    queryKey: ["/api/admin/sentences"],
  });

  const { data: wordClasses = [] } = useQuery<WordClass[]>({
    queryKey: ["/api/word-classes"],
  });

  // Create sentence mutation
  const createSentenceMutation = useMutation({
    mutationFn: async (sentence: Omit<EditingSentence, 'id'>) => {
      const response = await apiRequest("POST", "/api/admin/sentences", sentence);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sentences"] });
      toast({ title: "Framgång", description: "Mening skapad!" });
      setIsCreating(false);
      resetEditingData();
    },
    onError: () => {
      toast({ title: "Fel", description: "Kunde inte skapa mening", variant: "destructive" });
    }
  });

  // Update sentence mutation
  const updateSentenceMutation = useMutation({
    mutationFn: async ({ id, sentence }: { id: string, sentence: Partial<EditingSentence> }) => {
      const response = await apiRequest("PUT", `/api/admin/sentences/${id}`, sentence);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sentences"] });
      toast({ title: "Framgång", description: "Mening uppdaterad!" });
      setEditingId(null);
      resetEditingData();
    },
    onError: () => {
      toast({ title: "Fel", description: "Kunde inte uppdatera mening", variant: "destructive" });
    }
  });

  // Delete sentence mutation
  const deleteSentenceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/sentences/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sentences"] });
      toast({ title: "Framgång", description: "Mening borttagen!" });
    },
    onError: () => {
      toast({ title: "Fel", description: "Kunde inte ta bort mening", variant: "destructive" });
    }
  });

  const resetEditingData = () => {
    setEditingData({
      content: "",
      level: 1,
      wordClassType: "noun",
      difficulty: 1,
      words: []
    });
  };

  const startEditing = (sentence: Sentence) => {
    setEditingId(sentence.id);
    setEditingData({
      content: sentence.content,
      level: sentence.level,
      wordClassType: sentence.wordClassType || "noun",
      difficulty: sentence.difficulty,
      words: sentence.words
    });
  };

  const startCreating = () => {
    setIsCreating(true);
    resetEditingData();
  };

  const parseWordsFromContent = (content: string, wordClassType: string) => {
    // Simple parsing - split by spaces and assume one word of target class
    const words = content.split(' ').map(text => ({
      text,
      wordClass: text.toLowerCase() === 'och' ? 'conjunction' : 
                 text.toLowerCase() === 'på' ? 'preposition' :
                 text.toLowerCase() === 'är' ? 'verb' :
                 text.toLowerCase() === 'har' ? 'verb' :
                 text.toLowerCase() === 'ser' ? 'verb' :
                 text.toLowerCase() === 'ligger' ? 'verb' :
                 text.toLowerCase() === 'köper' ? 'verb' :
                 text.toLowerCase() === 'hon' ? 'pronoun' :
                 text.toLowerCase() === 'han' ? 'pronoun' :
                 text.toLowerCase() === 'jag' ? 'pronoun' :
                 text.toLowerCase() === 'vi' ? 'pronoun' :
                 text.toLowerCase() === 'de' ? 'pronoun' :
                 text.toLowerCase() === 'snabbt' ? 'adverb' :
                 text.toLowerCase() === 'högt' ? 'adverb' :
                 text.toLowerCase() === 'där' ? 'adverb' :
                 text.toLowerCase() === 'hem' ? 'adverb' :
                 text.toLowerCase() === 'gott' ? 'adverb' :
                 text.toLowerCase() === 'stor' ? 'adjective' :
                 text.toLowerCase() === 'stort' ? 'adjective' :
                 text.toLowerCase() === 'röd' ? 'adjective' :
                 text.toLowerCase() === 'snabb' ? 'adjective' :
                 text.toLowerCase() === 'trasig' ? 'adjective' :
                 text.toLowerCase() === 'mjuk' ? 'adjective' :
                 'noun' // Default to noun for most words
    }));

    return words;
  };

  const handleContentChange = (content: string) => {
    setEditingData(prev => ({
      ...prev,
      content,
      words: parseWordsFromContent(content, prev.wordClassType)
    }));
  };

  const handleSave = () => {
    if (isCreating) {
      createSentenceMutation.mutate(editingData);
    } else if (editingId) {
      updateSentenceMutation.mutate({ id: editingId, sentence: editingData });
    }
  };

  const filteredSentences = sentences.filter(sentence => {
    const wordClassMatch = filterWordClass === "all" || sentence.wordClassType === filterWordClass;
    const levelMatch = filterLevel === "all" || sentence.difficulty.toString() === filterLevel;
    return wordClassMatch && levelMatch;
  });

  const getWordClassInfo = (name: string) => wordClasses.find(wc => wc.name === name);

  const groupedSentences = filteredSentences.reduce((acc, sentence) => {
    const key = `${sentence.wordClassType}-${sentence.difficulty}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(sentence);
    return acc;
  }, {} as Record<string, Sentence[]>);

  if (sentencesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laddar adminpanel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-primary/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors">
                <i className="fas fa-arrow-left"></i>
                <span>Tillbaka till spel</span>
              </button>
            </Link>
            
            <h1 className="text-3xl font-bold text-gray-900">Adminpanel</h1>
            
            <Button onClick={startCreating} className="bg-green-600 hover:bg-green-700">
              <i className="fas fa-plus mr-2"></i>
              Ny mening
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Filter</h2>
          <div className="flex gap-4">
            <div>
              <Label htmlFor="wordclass-filter">Ordklass</Label>
              <Select value={filterWordClass} onValueChange={setFilterWordClass}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla ordklasser</SelectItem>
                  {wordClasses.map(wc => (
                    <SelectItem key={wc.name} value={wc.name}>{wc.swedishName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="level-filter">Nivå</Label>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla nivåer</SelectItem>
                  <SelectItem value="1">Nivå 1</SelectItem>
                  <SelectItem value="2">Nivå 2</SelectItem>
                  <SelectItem value="3">Nivå 3</SelectItem>
                  <SelectItem value="4">Nivå 4</SelectItem>
                  <SelectItem value="5">Nivå 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Totalt antal meningar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{sentences.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ordklasser</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">{wordClasses.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtrerade resultat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{filteredSentences.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Sentences grouped by word class and level */}
        <div className="space-y-8">
          {Object.entries(groupedSentences).map(([key, groupSentences]) => {
            const [wordClassType, difficulty] = key.split('-');
            const wordClassInfo = getWordClassInfo(wordClassType);
            
            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Badge 
                      style={{ backgroundColor: wordClassInfo?.color }}
                      className="text-white"
                    >
                      {wordClassInfo?.swedishName} - Nivå {difficulty}
                    </Badge>
                    <span className="text-sm text-gray-500">({groupSentences.length} meningar)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {groupSentences.map((sentence) => (
                      <div key={sentence.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{sentence.content}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            Ord: {sentence.words.map(w => `${w.text}(${w.wordClass})`).join(', ')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => startEditing(sentence)}
                            variant="outline" 
                            size="sm"
                          >
                            <i className="fas fa-edit mr-1"></i>
                            Redigera
                          </Button>
                          <Button 
                            onClick={() => deleteSentenceMutation.mutate(sentence.id)}
                            variant="destructive" 
                            size="sm"
                          >
                            <i className="fas fa-trash mr-1"></i>
                            Ta bort
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Edit/Create Dialog */}
      <Dialog open={editingId !== null || isCreating} onOpenChange={(open) => {
        if (!open) {
          setEditingId(null);
          setIsCreating(false);
          resetEditingData();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? "Skapa ny mening" : "Redigera mening"}
            </DialogTitle>
            <DialogDescription>
              Fyll i informationen nedan för att {isCreating ? "skapa" : "uppdatera"} meningen.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="content">Mening</Label>
              <Textarea
                id="content"
                value={editingData.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Skriv meningen här..."
                className="min-h-[80px]"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="wordClassType">Ordklass</Label>
                <Select 
                  value={editingData.wordClassType} 
                  onValueChange={(value) => setEditingData(prev => ({ ...prev, wordClassType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {wordClasses.map(wc => (
                      <SelectItem key={wc.name} value={wc.name}>{wc.swedishName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="level">Nivå</Label>
                <Select 
                  value={editingData.level.toString()} 
                  onValueChange={(value) => setEditingData(prev => ({ ...prev, level: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Nivå 1</SelectItem>
                    <SelectItem value="2">Nivå 2</SelectItem>
                    <SelectItem value="3">Nivå 3</SelectItem>
                    <SelectItem value="4">Nivå 4</SelectItem>
                    <SelectItem value="5">Nivå 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="difficulty">Svårighet</Label>
                <Select 
                  value={editingData.difficulty.toString()} 
                  onValueChange={(value) => setEditingData(prev => ({ ...prev, difficulty: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Förhandsvisning av ord</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-gray-50 min-h-[50px]">
                {editingData.words.map((word, index) => (
                  <Badge key={index} variant="outline">
                    {word.text} ({word.wordClass})
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Ord parsas automatiskt när du skriver meningen. Kontrollera att ordklasserna stämmer.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => {
                setEditingId(null);
                setIsCreating(false);
                resetEditingData();
              }}
              variant="outline"
            >
              Avbryt
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!editingData.content || createSentenceMutation.isPending || updateSentenceMutation.isPending}
            >
              {isCreating ? "Skapa" : "Spara"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
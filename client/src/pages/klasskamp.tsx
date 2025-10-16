import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Gamepad2, Users, Trophy, Clock, Play, Copy, Check } from "lucide-react";

interface WordClass {
  id: string;
  name: string;
  description: string;
  color: string;
}

export default function KlassKampPage() {
  const [teacherName, setTeacherName] = useState("");
  const [selectedWordClass, setSelectedWordClass] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: wordClasses = [] } = useQuery({
    queryKey: ["/api/word-classes"],
    queryFn: () => fetch("/api/word-classes").then((res) => res.json()) as Promise<WordClass[]>,
  });

  const createGameMutation = useMutation({
    mutationFn: async (gameData: { teacherName: string; wordClassId: string; questionCount: number }) => {
      const response = await fetch("/api/klasskamp/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameData),
      });
      if (!response.ok) throw new Error("Failed to create game");
      return response.json();
    },
    onSuccess: (data) => {
      setGameCode(data.code);
      queryClient.invalidateQueries({ queryKey: ["/api/klasskamp"] });
    },
  });

  const handleCreateGame = async () => {
    if (!teacherName.trim() || !selectedWordClass) return;

    createGameMutation.mutate({
      teacherName: teacherName.trim(),
      wordClassId: selectedWordClass,
      questionCount,
    });
  };

  const copyToClipboard = async () => {
    if (gameCode) {
      await navigator.clipboard.writeText(`${window.location.origin}/spela`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedWordClassData = wordClasses.find(wc => wc.id === selectedWordClass);

  if (gameCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-purple-800 mb-2">
              🎯 Klasskamp Skapad!
            </CardTitle>
            <p className="text-gray-600">Eleverna kan nu ansluta med koden</p>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="bg-purple-100 border-2 border-purple-300 rounded-xl p-8">
              <div className="text-6xl font-bold text-purple-800 mb-2">
                {gameCode}
              </div>
              <p className="text-purple-600 font-medium">Spelkod</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 rounded-lg p-4">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="font-semibold text-blue-800">Lärare</div>
                <div className="text-blue-600">{teacherName}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="font-semibold text-green-800">Ordklass</div>
                <div className="text-green-600">{selectedWordClassData?.name}</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <div className="font-semibold text-orange-800">Frågor</div>
                <div className="text-orange-600">{questionCount} st</div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 font-medium mb-2">
                📱 Eleverna ska gå till:
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="bg-yellow-100 px-3 py-1 rounded font-mono text-lg">
                  {window.location.origin}/spela
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex items-center gap-1"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Kopierad!" : "Kopiera"}
                </Button>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Link href={`/klasskamp/host/${gameCode}`}>
                <Button size="lg" className="bg-green-600 hover:bg-green-700">
                  <Play className="w-5 h-5 mr-2" />
                  Gå till värdpanel
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setGameCode(null)}>
                Skapa nytt spel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <Link href="/grammatik" className="inline-block mb-4">
            <Button variant="outline">← Tillbaka till grammatik</Button>
          </Link>
          <h1 className="text-4xl font-bold text-purple-800 mb-2">
            🏆 Klasskampen
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Skapa en multiplayer-tävling där eleverna tävlar i att hitta rätt ordklasser i meningar!
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="w-6 h-6 text-purple-600" />
                Skapa Klasskamp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teacher-name">Lärarens namn</Label>
                <Input
                  id="teacher-name"
                  placeholder="Ange ditt namn..."
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  data-testid="input-teacher-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="word-class">Välj ordklass att tävla med</Label>
                <Select value={selectedWordClass} onValueChange={setSelectedWordClass}>
                  <SelectTrigger data-testid="select-word-class">
                    <SelectValue placeholder="Välj ordklass..." />
                  </SelectTrigger>
                  <SelectContent>
                    {wordClasses.map((wordClass) => (
                      <SelectItem key={wordClass.id} value={wordClass.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: wordClass.color }}
                          />
                          {wordClass.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question-count">Antal frågor</Label>
                <Select 
                  value={questionCount.toString()} 
                  onValueChange={(value) => setQuestionCount(parseInt(value))}
                >
                  <SelectTrigger data-testid="select-question-count">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 frågor</SelectItem>
                    <SelectItem value="10">10 frågor</SelectItem>
                    <SelectItem value="15">15 frågor</SelectItem>
                    <SelectItem value="20">20 frågor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCreateGame}
                disabled={!teacherName.trim() || !selectedWordClass || createGameMutation.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
                data-testid="button-create-game"
              >
                {createGameMutation.isPending ? "Skapar spel..." : "Skapa Klasskamp"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { Gamepad2, Users } from "lucide-react";

export default function SpelaPage() {
  const [nickname, setNickname] = useState("");
  const [gameCode, setGameCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinGame = async () => {
    if (!nickname.trim() || !gameCode.trim()) return;

    setIsJoining(true);
    // We'll navigate to the game lobby component
    window.location.href = `/klasskamp/play/${gameCode}?nickname=${encodeURIComponent(nickname.trim())}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-blue-800 mb-2">
            🎮 Anslut till Klasskamp
          </CardTitle>
          <p className="text-gray-600">Ange spelkoden från din lärare</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">Ditt smeknamn</Label>
            <Input
              id="nickname"
              placeholder="Ange ditt smeknamn..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              data-testid="input-nickname"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="game-code">Spelkod (6 siffror)</Label>
            <Input
              id="game-code"
              placeholder="123456"
              value={gameCode}
              onChange={(e) => {
                // Only allow 6 digits
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setGameCode(value);
              }}
              className="text-center text-2xl font-mono tracking-widest"
              maxLength={6}
              data-testid="input-game-code"
            />
          </div>

          <Button
            onClick={handleJoinGame}
            disabled={!nickname.trim() || gameCode.length !== 6 || isJoining}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
            data-testid="button-join-game"
          >
            <Users className="w-5 h-5 mr-2" />
            {isJoining ? "Ansluter..." : "Anslut till spel"}
          </Button>

          <div className="text-center pt-4">
            <Link href="/">
              <Button variant="outline">Tillbaka till startsidan</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
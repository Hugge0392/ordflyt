import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Play, Trophy, Clock } from "lucide-react";

interface Player {
  id: string;
  nickname: string;
  score: number;
  correctAnswers: number;
  isConnected: boolean;
}

interface GameState {
  game: {
    id: string;
    code: string;
    teacherName: string;
    status: 'waiting' | 'playing' | 'finished';
    currentQuestionIndex: number;
    questionCount: number;
    startTime?: number;
  };
  players: Player[];
  leaderboard?: Player[];
  currentSentence?: any;
  timeRemaining?: number;
  gameDurationSeconds?: number;
}

export default function KlassKampHostPage() {
  const { code } = useParams<{ code: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [gameTimeRemaining, setGameTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!code) return;

    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/klasskamp-ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setConnectionStatus('connected');
      // Join as teacher
      socket.send(JSON.stringify({
        type: 'join',
        data: { gameCode: code, nickname: 'Teacher', isTeacher: true }
      }));
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    socket.onclose = () => {
      setConnectionStatus('disconnected');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('disconnected');
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [code]);

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'join_success':
        console.log('Joined successfully as teacher');
        break;
      case 'game_state_update':
      case 'room_update':
        setGameState(message.data);
        break;
      case 'game_started':
        setGameState(prev => prev ? { ...prev, game: { ...prev.game, startTime: message.data.startTime } } : null);
        setGameTimeRemaining(message.data.gameDurationSeconds);
        startGameTimer(message.data.gameDurationSeconds);
        break;
      case 'new_question':
        console.log('New question:', message.data);
        break;
      case 'game_finished':
        console.log('Game finished:', message.data);
        setGameTimeRemaining(0);
        break;
      case 'error':
        console.error('Game error:', message.data.message);
        break;
    }
  };

  const startGameTimer = (duration: number) => {
    const timer = setInterval(() => {
      setGameTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startGame = () => {
    if (ws && gameState && gameState.players.length > 0) {
      ws.send(JSON.stringify({
        type: 'start_game',
        data: {}
      }));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (connectionStatus === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-lg">Ansluter till spel...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (connectionStatus === 'disconnected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-800 mb-2">Anslutning bruten</h2>
            <p className="text-gray-600 mb-4">Kunde inte ansluta till spelservern</p>
            <Button onClick={() => window.location.reload()}>Försök igen</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-pulse w-8 h-8 bg-purple-300 rounded-full mx-auto mb-4"></div>
            <p className="text-lg">Laddar speldata...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-purple-800">
              🏆 Klasskamp Värdpanel
            </CardTitle>
            <div className="flex items-center justify-center gap-4 text-lg">
              <Badge variant="outline" className="text-2xl px-4 py-2">
                Kod: {gameState.game.code}
              </Badge>
              <Badge variant={gameState.game.status === 'waiting' ? 'secondary' : gameState.game.status === 'playing' ? 'default' : 'destructive'}>
                {gameState.game.status === 'waiting' && 'Väntar på start'}
                {gameState.game.status === 'playing' && 'Spelar'}
                {gameState.game.status === 'finished' && 'Avslutat'}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Players List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Anslutna spelare ({gameState.players.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {gameState.players.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Inga spelare har anslutit än</p>
                  <p className="text-sm mt-2">
                    Eleverna ska gå till <strong>ordflyt.se/spela</strong> och ange koden
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {gameState.players.map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-800 font-bold">
                          {index + 1}
                        </div>
                        <span className="font-medium">{player.nickname}</span>
                        {!player.isConnected && (
                          <Badge variant="secondary" className="text-xs">Frånkopplad</Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-800">{player.score} p</div>
                        <div className="text-xs text-gray-500">{player.correctAnswers} rätt</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Game Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                Spelkontroll
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {gameState.game.status === 'waiting' ? (
                <>
                  <div className="text-center py-4">
                    <p className="text-gray-600 mb-4">
                      Väntar på att spelare ska ansluta...
                    </p>
                    <div className="text-2xl mb-2">
                      {gameState.players.length} spelare anslutna
                    </div>
                  </div>
                  <Button
                    onClick={startGame}
                    disabled={gameState.players.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Starta spel
                  </Button>
                </>
              ) : gameState.game.status === 'playing' ? (
                <>
                  <div className="text-center py-4">
                    <div className="text-2xl font-bold text-red-600 mb-4">
                      <Clock className="w-8 h-8 inline mr-2" />
                      {gameTimeRemaining !== null ? formatTime(gameTimeRemaining) : '5:00'}
                    </div>
                    <div className="text-lg mb-2">
                      Fråga {gameState.game.currentQuestionIndex + 1}
                    </div>
                    <div className="text-sm text-gray-600 mb-4">
                      Eleverna svarar på så många frågor som möjligt!
                    </div>
                    {gameState.currentSentence && (
                      <div className="bg-blue-50 rounded-lg p-4 mb-4">
                        <div className="font-medium text-blue-800">Aktuell mening:</div>
                        <div className="text-lg">{gameState.currentSentence.sentence}</div>
                      </div>
                    )}
                  </div>
                  <div className="text-center text-sm text-gray-500">
                    Frågor byts automatiskt var 3:e sekund efter att elever svarat
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Spel avslutat!</h3>
                  <p className="text-gray-600">Bra jobbat alla!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        {gameState.leaderboard && gameState.leaderboard.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Resultatboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {gameState.leaderboard.slice(0, 10).map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      index === 0 ? 'bg-yellow-100 border-2 border-yellow-300' :
                      index === 1 ? 'bg-gray-100 border-2 border-gray-300' :
                      index === 2 ? 'bg-orange-100 border-2 border-orange-300' :
                      'bg-white border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-500 text-white' :
                        index === 2 ? 'bg-orange-500 text-white' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium">{player.nickname}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{player.score} p</div>
                      <div className="text-xs text-gray-500">{player.correctAnswers} rätt</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
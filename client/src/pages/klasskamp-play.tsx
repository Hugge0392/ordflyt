import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Trophy, Target } from "lucide-react";

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
  wordClassName?: string;
  gameDurationSeconds?: number;
}

export default function KlassKampPlayPage() {
  const { code } = useParams<{ code: string }>();
  const [location] = useLocation();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; points: number; correctWords: string[] } | null>(null);
  const [gameTimeRemaining, setGameTimeRemaining] = useState<number | null>(null);

  // Get nickname from URL parameters
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const nickname = urlParams.get('nickname') || 'Spelare';

  useEffect(() => {
    if (!code) return;

    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/klasskamp-ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setConnectionStatus('connected');
      // Join as player
      socket.send(JSON.stringify({
        type: 'join',
        data: { gameCode: code, nickname, isTeacher: false }
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
  }, [code, nickname]);

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'join_success':
        console.log('Joined successfully as player');
        break;
      case 'game_state_update':
      case 'room_update':
        setGameState(message.data);
        break;
      case 'game_started':
        setGameTimeRemaining(message.data.gameDurationSeconds);
        startGameTimer(message.data.gameDurationSeconds);
        break;
      case 'new_question':
        // Reset for new question
        setSelectedWords([]);
        setHasAnswered(false);
        setAnswerResult(null);
        console.log('New question:', message.data);
        break;
      case 'answer_result':
        setAnswerResult(message.data);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleWord = (word: string) => {
    if (hasAnswered) return;
    
    setSelectedWords(prev => 
      prev.includes(word) 
        ? prev.filter(w => w !== word)
        : [...prev, word]
    );
  };

  const submitAnswer = () => {
    if (!ws || hasAnswered || selectedWords.length === 0) return;
    
    setHasAnswered(true);
    const timeUsed = gameState?.timeRemaining ? (20 - gameState.timeRemaining) * 1000 : 0;
    
    ws.send(JSON.stringify({
      type: 'answer',
      data: {
        selectedWords,
        timeUsed
      }
    }));
  };

  if (connectionStatus === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-pulse w-8 h-8 bg-blue-300 rounded-full mx-auto mb-4"></div>
            <p className="text-lg">Laddar speldata...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get current player
  const currentPlayer = gameState.players.find(p => p.nickname === nickname);
  const playerRank = gameState.leaderboard?.findIndex(p => p.nickname === nickname) ?? -1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-blue-800">
              🎮 {nickname}
            </CardTitle>
            <div className="flex items-center justify-center gap-4 text-sm">
              <Badge variant="outline">Kod: {gameState.game.code}</Badge>
              <Badge variant="outline">
                <Users className="w-4 h-4 mr-1" />
                {gameState.players.length} spelare
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {gameState.game.status === 'waiting' && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-4">⏳</div>
              <h2 className="text-xl font-bold mb-2">Väntar på att spelet ska starta...</h2>
              <p className="text-gray-600 mb-4">Läraren kommer att starta spelet när alla är redo</p>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="font-semibold text-blue-800">Lärare</div>
                  <div className="text-blue-600">{gameState.game.teacherName}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="font-semibold text-green-800">Ordklass</div>
                  <div className="text-green-600">{gameState.wordClassName}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {gameState.game.status === 'playing' && (
          <>
            {/* Game Info */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-800">
                    {gameState.game.currentQuestionIndex + 1}
                  </div>
                  <div className="text-sm text-gray-600">Frågor besvarade</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    <Clock className="w-6 h-6 inline mr-1" />
                    {gameTimeRemaining !== null ? formatTime(gameTimeRemaining) : '5:00'}
                  </div>
                  <div className="text-sm text-gray-600">Tid kvar</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-800">
                    {currentPlayer?.score || 0}
                  </div>
                  <div className="text-sm text-gray-600">Dina poäng</div>
                </CardContent>
              </Card>
            </div>

            {/* Question */}
            {gameState.currentSentence && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Hitta alla {gameState.wordClassName} i meningen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg mb-4 p-4 bg-gray-50 rounded-lg font-medium text-center">
                    {gameState.currentSentence.sentence.split(' ').map((word: string, index: number) => {
                      const cleanWord = word.replace(/[.,!?;:]/g, '');
                      const isSelected = selectedWords.includes(cleanWord);
                      const isCorrect = answerResult?.correctWords.includes(cleanWord);
                      const isWrong = answerResult && selectedWords.includes(cleanWord) && !isCorrect;
                      
                      return (
                        <span
                          key={index}
                          onClick={() => toggleWord(cleanWord)}
                          className={`
                            cursor-pointer px-2 py-1 mx-1 rounded transition-colors
                            ${hasAnswered ? 
                              (isCorrect ? 'bg-green-200 text-green-800' :
                               isWrong ? 'bg-red-200 text-red-800' : 
                               'hover:bg-gray-200') :
                              (isSelected ? 'bg-blue-200 text-blue-800' : 'hover:bg-gray-200')
                            }
                          `}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </div>
                  
                  {!hasAnswered ? (
                    <div className="text-center">
                      <Button
                        onClick={submitAnswer}
                        disabled={selectedWords.length === 0}
                        className="bg-green-600 hover:bg-green-700"
                        size="lg"
                      >
                        Skicka svar ({selectedWords.length} ord valda)
                      </Button>
                    </div>
                  ) : answerResult ? (
                    <div className="text-center">
                      <div className={`text-lg font-bold mb-2 ${
                        answerResult.isCorrect ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {answerResult.isCorrect ? '✅ Rätt!' : '❌ Fel svar'}
                      </div>
                      <div className="text-purple-700 font-bold">
                        +{answerResult.points} poäng
                      </div>
                      {!answerResult.isCorrect && (
                        <div className="text-sm text-gray-600 mt-2">
                          Rätt svar: {answerResult.correctWords.join(', ')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      Väntar på resultat...
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {gameState.game.status === 'finished' && (
          <Card>
            <CardContent className="p-8 text-center">
              <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Spel avslutat!</h2>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-800">{currentPlayer?.score || 0}</div>
                  <div className="text-purple-600">Dina poäng</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-800">#{playerRank + 1}</div>
                  <div className="text-blue-600">Placering</div>
                </div>
              </div>
              <p className="text-gray-600">Bra jobbat!</p>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        {gameState.leaderboard && gameState.leaderboard.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Topplista
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {gameState.leaderboard.slice(0, 5).map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      player.nickname === nickname ? 'bg-blue-100 border-2 border-blue-300' :
                      index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-400 text-white' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {index + 1}
                      </div>
                      <span className={`font-medium ${player.nickname === nickname ? 'text-blue-800' : ''}`}>
                        {player.nickname}
                        {player.nickname === nickname && ' (Du)'}
                      </span>
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
import { WebSocket, WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http';
import { storage, db } from './storage';
import { klassKampGames, klassKampPlayers, klassKampAnswers, sentences, wordClasses } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

interface ConnectedClient {
  ws: WebSocket;
  gameId?: string;
  playerId?: string;
  isTeacher?: boolean;
}

interface GameMessage {
  type: 'join' | 'start_game' | 'answer' | 'next_question' | 'game_status';
  data: any;
}

export class KlassKampWebSocket {
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, ConnectedClient>();
  private gameStates = new Map<string, any>();

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/klasskamp-ws' 
    });
    
    this.wss.on('connection', this.handleConnection.bind(this));
    console.log('KlassKamp WebSocket server initialized on /klasskamp-ws');
  }

  private handleConnection(ws: WebSocket) {
    console.log('New KlassKamp client connected');
    
    const client: ConnectedClient = { ws };
    this.clients.set(ws, client);

    ws.on('message', async (data) => {
      try {
        const message: GameMessage = JSON.parse(data.toString());
        await this.handleMessage(ws, message);
      } catch (error) {
        console.error('Error handling message:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnect(ws);
    });
  }

  private async handleMessage(ws: WebSocket, message: GameMessage) {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case 'join':
        await this.handleJoinGame(ws, message);
        break;
      case 'start_game':
        await this.handleStartGame(ws, message);
        break;
      case 'answer':
        await this.handleAnswer(ws, message);
        break;
      case 'next_question':
        await this.handleNextQuestion(ws, message);
        break;
      case 'game_status':
        await this.handleGameStatus(ws, message);
        break;
    }
  }

  private async handleJoinGame(ws: WebSocket, message: GameMessage) {
    const { gameCode, nickname, isTeacher } = message.data;
    
    try {
      // Find game by code
      const game = await storage.getKlassKampGameByCode(gameCode);
      
      if (!game) {
        this.sendError(ws, 'Spel hittades inte');
        return;
      }

      if (game.status !== 'waiting' && !isTeacher) {
        this.sendError(ws, 'Spelet har redan startat');
        return;
      }

      const client = this.clients.get(ws)!;
      client.gameId = game.id;
      client.isTeacher = isTeacher;

      if (!isTeacher) {
        // Add player to game
        const player = await storage.addKlassKampPlayer({
          gameId: game.id,
          nickname
        });

        client.playerId = player.id;
      }

      await this.updateGameState(game.id);
      
      this.sendToClient(ws, {
        type: 'join_success',
        data: { gameId: game.id, playerId: client.playerId }
      });

      console.log(`${isTeacher ? 'Teacher' : 'Player'} ${nickname} joined game ${gameCode}`);
    } catch (error) {
      console.error('Error joining game:', error);
      this.sendError(ws, 'Kunde inte ansluta till spel');
    }
  }

  private async handleStartGame(ws: WebSocket, message: GameMessage) {
    const client = this.clients.get(ws);
    if (!client || !client.isTeacher || !client.gameId) {
      this.sendError(ws, 'Endast läraren kan starta spelet');
      return;
    }

    try {
      // Update game status and start time
      await storage.updateKlassKampGame(client.gameId, { 
        status: 'playing',
        startedAt: new Date(),
        currentQuestionIndex: 0
      });

      await this.updateGameState(client.gameId);
      
      // Start first question
      await this.sendNextQuestion(client.gameId);
      
      console.log(`Game ${client.gameId} started`);
    } catch (error) {
      console.error('Error starting game:', error);
      this.sendError(ws, 'Kunde inte starta spel');
    }
  }

  private async handleAnswer(ws: WebSocket, message: GameMessage) {
    const client = this.clients.get(ws);
    if (!client || !client.playerId || !client.gameId) {
      this.sendError(ws, 'Inte ansluten till spel');
      return;
    }

    const { selectedWords, timeUsed } = message.data;
    
    try {
      const gameState = this.gameStates.get(client.gameId);
      if (!gameState || !gameState.currentSentence) {
        this.sendError(ws, 'Ingen aktiv fråga');
        return;
      }

      const sentence = gameState.currentSentence;
      const targetWordClass = gameState.game.wordClassId;
      
      // Check if answer is correct by comparing selected words with target word class
      const correctWords = sentence.words.filter((w: any) => w.wordClass === targetWordClass).map((w: any) => w.word);
      const isCorrect = this.arraysEqual(selectedWords.sort(), correctWords.sort());
      
      // Calculate points (base 100, reduced by time)
      const points = isCorrect ? Math.max(100 - Math.floor(timeUsed / 1000) * 5, 10) : 0;

      // Save answer
      await storage.addKlassKampAnswer({
        gameId: client.gameId,
        playerId: client.playerId,
        sentenceId: sentence.id,
        selectedWords,
        isCorrect,
        timeUsed,
        points
      });

      // Update player score
      if (isCorrect) {
        const player = gameState.players.find(p => p.id === client.playerId);
        if (player) {
          await storage.updateKlassKampPlayer(client.playerId, {
            score: (player.score || 0) + points,
            correctAnswers: (player.correctAnswers || 0) + 1
          });
        }
      }

      await this.updateGameState(client.gameId);
      
      this.sendToClient(ws, {
        type: 'answer_result',
        data: { isCorrect, points, correctWords }
      });

      console.log(`Player ${client.playerId} answered ${isCorrect ? 'correctly' : 'incorrectly'} for ${points} points`);
    } catch (error) {
      console.error('Error handling answer:', error);
      this.sendError(ws, 'Kunde inte spara svar');
    }
  }

  private async handleNextQuestion(ws: WebSocket, message: GameMessage) {
    const client = this.clients.get(ws);
    if (!client || !client.isTeacher || !client.gameId) {
      this.sendError(ws, 'Endast läraren kan gå till nästa fråga');
      return;
    }

    try {
      const [game] = await db.select().from(klassKampGames).where(eq(klassKampGames.id, client.gameId));
      
      if (!game) return;

      const nextIndex = (game.currentQuestionIndex || 0) + 1;
      
      if (nextIndex >= game.questionCount) {
        // Game finished
        await db.update(klassKampGames)
          .set({ 
            status: 'finished',
            finishedAt: new Date()
          })
          .where(eq(klassKampGames.id, client.gameId));

        await this.updateGameState(client.gameId);
        
        this.broadcastToGame(client.gameId, {
          type: 'game_finished',
          data: { finalResults: this.gameStates.get(client.gameId)?.leaderboard }
        });
      } else {
        // Next question
        await db.update(klassKampGames)
          .set({ currentQuestionIndex: nextIndex })
          .where(eq(klassKampGames.id, client.gameId));

        await this.sendNextQuestion(client.gameId);
      }
    } catch (error) {
      console.error('Error advancing to next question:', error);
    }
  }

  private async handleGameStatus(ws: WebSocket, message: GameMessage) {
    const client = this.clients.get(ws);
    if (!client || !client.gameId) return;

    const gameState = this.gameStates.get(client.gameId);
    if (gameState) {
      this.sendToClient(ws, {
        type: 'game_state',
        data: gameState
      });
    }
  }

  private async sendNextQuestion(gameId: string) {
    try {
      const [game] = await db.select().from(klassKampGames).where(eq(klassKampGames.id, gameId));
      if (!game) return;

      // Get random sentence for the word class
      const sentences = await storage.getSentencesByWordClass(game.wordClassId!);
      const sentence = sentences[Math.floor(Math.random() * sentences.length)];

      if (!sentence) {
        console.error('No sentences found for word class');
        return;
      }

      // Update game state
      const gameState = this.gameStates.get(gameId) || {};
      gameState.currentSentence = sentence;
      this.gameStates.set(gameId, gameState);

      // Broadcast new question to all players
      this.broadcastToGame(gameId, {
        type: 'new_question',
        data: {
          questionIndex: game.currentQuestionIndex,
          totalQuestions: game.questionCount,
          sentence: sentence.sentence,
          targetWordClass: gameState.wordClassName
        }
      });
    } catch (error) {
      console.error('Error sending next question:', error);
    }
  }

  private async updateGameState(gameId: string) {
    try {
      const [game] = await db.select()
        .from(klassKampGames)
        .leftJoin(wordClasses, eq(klassKampGames.wordClassId, wordClasses.id))
        .where(eq(klassKampGames.id, gameId));

      if (!game) return;

      const players = await db.select()
        .from(klassKampPlayers)
        .where(eq(klassKampPlayers.gameId, gameId))
        .orderBy(sql`${klassKampPlayers.score} DESC`);

      const leaderboard = players.map((player: any, index: number) => ({
        ...player,
        rank: index + 1
      }));

      const gameState = {
        game: game.klasskamp_games,
        wordClassName: game.word_classes?.name || 'Okänd ordklass',
        players: players,
        leaderboard: leaderboard,
        currentSentence: this.gameStates.get(gameId)?.currentSentence
      };

      this.gameStates.set(gameId, gameState);

      // Broadcast updated state
      this.broadcastToGame(gameId, {
        type: 'game_state_update',
        data: gameState
      });
    } catch (error) {
      console.error('Error updating game state:', error);
    }
  }

  private broadcastToGame(gameId: string, message: any) {
    this.clients.forEach((client, ws) => {
      if (client.gameId === gameId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  private sendToClient(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.sendToClient(ws, {
      type: 'error',
      data: { message: error }
    });
  }

  private handleDisconnect(ws: WebSocket) {
    const client = this.clients.get(ws);
    if (client) {
      console.log(`KlassKamp client disconnected`);
      
      if (client.playerId) {
        // Mark player as disconnected
        storage.updateKlassKampPlayer(client.playerId, { isConnected: false })
          .catch(console.error);
      }

      if (client.gameId) {
        this.updateGameState(client.gameId);
      }
    }
    
    this.clients.delete(ws);
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }
}
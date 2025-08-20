import { WebSocket, WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http';
import { GameRoom, GameParticipant, GameAnswer, WebSocketMessage, GameState } from '@shared/multiplayer-schema';
import { db } from './storage';
import { gameRooms, gameParticipants, gameAnswers } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface ConnectedClient {
  ws: WebSocket;
  roomCode?: string;
  participantId?: string;
  nickname?: string;
}

export class MultiplayerGameServer {
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, ConnectedClient>();
  private rooms = new Map<string, GameState>();
  private roomTimers = new Map<string, NodeJS.Timeout>();

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/multiplayer-ws' 
    });
    
    this.wss.on('connection', this.handleConnection.bind(this));
    console.log('Multiplayer WebSocket server initialized on /multiplayer-ws');
  }

  private handleConnection(ws: WebSocket) {
    console.log('New multiplayer client connected');
    
    const client: ConnectedClient = { ws };
    this.clients.set(ws, client);

    ws.on('message', async (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
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

  private async handleMessage(ws: WebSocket, message: WebSocketMessage) {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case 'join':
        await this.handleJoinRoom(ws, message);
        break;
      case 'answer':
        await this.handleAnswer(ws, message);
        break;
      case 'next_question':
        await this.handleNextQuestion(ws, message);
        break;
      case 'game_start':
        await this.handleGameStart(ws, message);
        break;
      default:
        this.sendError(ws, 'Unknown message type');
    }
  }

  private async handleJoinRoom(ws: WebSocket, message: WebSocketMessage) {
    const { roomCode, nickname } = message.data;
    
    if (!roomCode || !nickname) {
      this.sendError(ws, 'Room code and nickname required');
      return;
    }

    try {
      // Find room in database
      const room = await db.select().from(gameRooms).where(eq(gameRooms.code, roomCode)).limit(1);
      
      if (room.length === 0) {
        this.sendError(ws, 'Room not found');
        return;
      }

      const gameRoom = room[0];

      // Check if game is joinable
      if (gameRoom.status === 'playing' && !gameRoom.settings.allowLateJoin) {
        this.sendError(ws, 'Game already in progress');
        return;
      }

      // Add participant to database
      const [participant] = await db.insert(gameParticipants).values({
        roomId: gameRoom.id,
        nickname,
        isHost: false
      }).returning();

      // Update client info
      const client = this.clients.get(ws)!;
      client.roomCode = roomCode;
      client.participantId = participant.id;
      client.nickname = nickname;

      // Update room state
      await this.updateRoomState(roomCode);
      
      this.sendToClient(ws, {
        type: 'join_success',
        data: { participantId: participant.id, roomCode }
      });

      console.log(`Player ${nickname} joined room ${roomCode}`);
    } catch (error) {
      console.error('Error joining room:', error);
      this.sendError(ws, 'Failed to join room');
    }
  }

  private async handleAnswer(ws: WebSocket, message: WebSocketMessage) {
    const client = this.clients.get(ws);
    if (!client || !client.roomCode || !client.participantId) {
      this.sendError(ws, 'Not in a room');
      return;
    }

    const { answer, timeUsed } = message.data;
    const roomState = this.rooms.get(client.roomCode);
    
    if (!roomState || !roomState.currentQuestion) {
      this.sendError(ws, 'No active question');
      return;
    }

    try {
      const isCorrect = parseInt(answer) === roomState.currentQuestion.correctAnswer;
      const points = isCorrect ? Math.max(100 - timeUsed * 2, 10) : 0; // Points decrease with time

      // Save answer to database
      await db.insert(gameAnswers).values({
        roomId: roomState.room.id,
        participantId: client.participantId,
        questionIndex: roomState.room.currentQuestion,
        answer,
        timeUsed,
        isCorrect,
        points
      });

      // Update participant score
      await db.update(gameParticipants)
        .set({ score: roomState.participants.find(p => p.id === client.participantId)?.score || 0 + points })
        .where(eq(gameParticipants.id, client.participantId));

      await this.updateRoomState(client.roomCode);

      console.log(`Player ${client.nickname} answered ${answer} (${isCorrect ? 'correct' : 'wrong'}) for ${points} points`);
    } catch (error) {
      console.error('Error handling answer:', error);
      this.sendError(ws, 'Failed to submit answer');
    }
  }

  private async handleNextQuestion(ws: WebSocket, message: WebSocketMessage) {
    const client = this.clients.get(ws);
    if (!client || !client.roomCode) return;

    const roomState = this.rooms.get(client.roomCode);
    if (!roomState) return;

    // Only host can advance questions
    const participant = roomState.participants.find(p => p.id === client.participantId);
    if (!participant?.isHost) {
      this.sendError(ws, 'Only host can advance questions');
      return;
    }

    try {
      const nextQuestionIndex = roomState.room.currentQuestion + 1;
      
      if (nextQuestionIndex >= roomState.room.questions.length) {
        // Game finished
        await db.update(gameRooms)
          .set({ status: 'finished', updatedAt: new Date() })
          .where(eq(gameRooms.id, roomState.room.id));
        
        await this.updateRoomState(client.roomCode);
        this.broadcastToRoom(client.roomCode, {
          type: 'game_end',
          data: { finalLeaderboard: roomState.leaderboard }
        });
      } else {
        // Next question
        await db.update(gameRooms)
          .set({ currentQuestion: nextQuestionIndex, updatedAt: new Date() })
          .where(eq(gameRooms.id, roomState.room.id));
        
        await this.updateRoomState(client.roomCode);
        this.startQuestionTimer(client.roomCode);
      }
    } catch (error) {
      console.error('Error advancing question:', error);
    }
  }

  private async handleGameStart(ws: WebSocket, message: WebSocketMessage) {
    const client = this.clients.get(ws);
    if (!client || !client.roomCode) return;

    const roomState = this.rooms.get(client.roomCode);
    if (!roomState) return;

    const participant = roomState.participants.find(p => p.id === client.participantId);
    if (!participant?.isHost) {
      this.sendError(ws, 'Only host can start the game');
      return;
    }

    try {
      await db.update(gameRooms)
        .set({ status: 'playing', updatedAt: new Date() })
        .where(eq(gameRooms.id, roomState.room.id));

      await this.updateRoomState(client.roomCode);
      this.startQuestionTimer(client.roomCode);
      
      console.log(`Game started in room ${client.roomCode}`);
    } catch (error) {
      console.error('Error starting game:', error);
    }
  }

  private startQuestionTimer(roomCode: string) {
    const roomState = this.rooms.get(roomCode);
    if (!roomState || !roomState.currentQuestion) return;

    // Clear existing timer
    const existingTimer = this.roomTimers.get(roomCode);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    let timeRemaining = roomState.currentQuestion.timeLimit;
    roomState.timeRemaining = timeRemaining;

    const timer = setInterval(() => {
      timeRemaining--;
      roomState.timeRemaining = timeRemaining;
      
      this.broadcastToRoom(roomCode, {
        type: 'timer_update',
        data: { timeRemaining }
      });

      if (timeRemaining <= 0) {
        clearInterval(timer);
        this.roomTimers.delete(roomCode);
        
        // Show results
        roomState.showResults = true;
        this.broadcastToRoom(roomCode, {
          type: 'show_results',
          data: { 
            correctAnswer: roomState.currentQuestion.correctAnswer,
            explanation: roomState.currentQuestion.explanation
          }
        });
      }
    }, 1000);

    this.roomTimers.set(roomCode, timer);
  }

  private async updateRoomState(roomCode: string) {
    try {
      // Fetch latest room data
      const [room] = await db.select().from(gameRooms).where(eq(gameRooms.code, roomCode));
      if (!room) return;

      const participants = await db.select().from(gameParticipants).where(eq(gameParticipants.roomId, room.id));
      
      // Calculate leaderboard
      const leaderboard = participants
        .sort((a, b) => b.score - a.score)
        .map((p, index) => ({
          nickname: p.nickname,
          score: p.score,
          rank: index + 1,
          correctAnswers: 0, // Would need to calculate from answers
          averageTime: 0,
          streak: 0
        }));

      const gameState: GameState = {
        room,
        participants,
        currentQuestion: room.questions[room.currentQuestion] || undefined,
        leaderboard
      };

      this.rooms.set(roomCode, gameState);

      // Broadcast updated state to all clients in room
      this.broadcastToRoom(roomCode, {
        type: 'room_update',
        data: gameState
      });
    } catch (error) {
      console.error('Error updating room state:', error);
    }
  }

  private broadcastToRoom(roomCode: string, message: any) {
    for (const [ws, client] of this.clients.entries()) {
      if (client.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
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
      console.log(`Client disconnected: ${client.nickname || 'Unknown'}`);
      
      if (client.participantId) {
        // Mark as disconnected in database
        db.update(gameParticipants)
          .set({ isConnected: false })
          .where(eq(gameParticipants.id, client.participantId))
          .catch(console.error);
      }

      if (client.roomCode) {
        this.updateRoomState(client.roomCode);
      }
    }
    
    this.clients.delete(ws);
  }

  // Helper method to create a new game room
  async createRoom(hostNickname: string, questions: any[], settings: any = {}): Promise<string> {
    const roomCode = this.generateRoomCode();
    
    const [room] = await db.insert(gameRooms).values({
      code: roomCode,
      name: `${hostNickname}'s Game`,
      hostId: 'temp-host-id',
      questions,
      settings: { questionTime: 20, showAnswers: true, allowLateJoin: false, ...settings }
    }).returning();

    const [host] = await db.insert(gameParticipants).values({
      roomId: room.id,
      nickname: hostNickname,
      isHost: true
    }).returning();

    // Update host ID
    await db.update(gameRooms)
      .set({ hostId: host.id })
      .where(eq(gameRooms.id, room.id));

    console.log(`Created room ${roomCode} hosted by ${hostNickname}`);
    return roomCode;
  }

  private generateRoomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
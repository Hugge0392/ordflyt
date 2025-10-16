import { WebSocket, WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http';
import { storage, db } from './storage';
import { 
  users, 
  studentAccounts,
  teacherClasses,
  sessions
} from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { validateSession } from './auth';

// WebSocket message types for classroom management
export type ClassroomMessageType = 
  | 'teacher_join'
  | 'student_join'
  | 'classroom_message'
  | 'timer_control'
  | 'screen_control' 
  | 'activity_control'
  | 'connection_status'
  | 'emergency_attention'
  | 'classroom_mode_change'
  | 'acknowledgment'
  | 'ping'
  | 'pong';

export interface ClassroomWebSocketMessage {
  type: ClassroomMessageType;
  data: any;
  timestamp?: number;
  messageId?: string;
  targetStudentIds?: string[];
  requiresAck?: boolean;
}

export interface ConnectedTeacher {
  ws: WebSocket;
  userId: string;
  sessionId: string;
  classId: string;
  className: string;
  connectionId: string;
  lastActivity: Date;
}

export interface ConnectedStudent {
  ws: WebSocket;
  studentId: string;
  studentName: string;
  classId: string;
  connectionId: string;
  lastActivity: Date;
  isLocked: boolean;
  currentActivity?: string;
}

export interface TimerState {
  id: string;
  name: string;
  type: 'countdown' | 'stopwatch' | 'break_timer' | 'exercise_timer';
  duration?: number; // milliseconds
  elapsed: number;
  status: 'stopped' | 'running' | 'paused' | 'completed';
  startTime?: number;
  pauseTime?: number;
}

export interface ClassroomState {
  sessionId: string;
  teacherId: string;
  classId: string;
  mode: 'instruction' | 'exercise' | 'test' | 'break' | 'group_work' | 'silent';
  isActive: boolean;
  connectedStudents: Map<string, ConnectedStudent>;
  timers: Map<string, TimerState>;
  lastActivity: Date;
}

export class ClassroomWebSocket {
  private wss: WebSocketServer;
  private connectedTeachers = new Map<string, ConnectedTeacher>();
  private connectedStudents = new Map<string, ConnectedStudent>();
  private classroomStates = new Map<string, ClassroomState>();
  private heartbeatInterval: NodeJS.Timeout;
  private cleanupInterval: NodeJS.Timeout;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/classroom-ws' 
    });
    
    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Setup heartbeat to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // Every 30 seconds

    // Setup cleanup for inactive connections
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections();
    }, 60000); // Every minute

    console.log('Classroom WebSocket server initialized on /classroom-ws');
  }

  private async handleConnection(ws: WebSocket, request: any) {
    console.log('New classroom client attempting to connect');
    
    try {
      // Extract session token only from cookies (secure approach)
      const sessionToken = request.headers.cookie?.split('sessionToken=')[1]?.split(';')[0];

      if (!sessionToken) {
        this.sendError(ws, 'Missing session token - please ensure you are logged in');
        ws.close();
        return;
      }

      // Validate session
      const session = await validateSession(sessionToken);
      if (!session) {
        this.sendError(ws, 'Invalid or expired session');
        ws.close();
        return;
      }

      // Get user details
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (!user || !user.isActive) {
        this.sendError(ws, 'User not found or inactive');
        ws.close();
        return;
      }

      // Handle teacher or student connection
      if (user.role === 'LARARE' || user.role === 'ADMIN') {
        await this.handleTeacherConnection(ws, user, session);
      } else if (user.role === 'ELEV') {
        await this.handleStudentConnection(ws, user, session);
      } else {
        this.sendError(ws, 'Invalid user role for classroom');
        ws.close();
        return;
      }

    } catch (error) {
      console.error('Error handling classroom connection:', error);
      this.sendError(ws, 'Connection error');
      ws.close();
    }
  }

  private async handleTeacherConnection(ws: WebSocket, user: any, session: any) {
    // Get teacher's classes
    const classes = await db
      .select({
        id: teacherClasses.id,
        name: teacherClasses.name,
      })
      .from(teacherClasses)
      .where(eq(teacherClasses.teacherId, user.id));

    if (classes.length === 0) {
      this.sendError(ws, 'No classes found for teacher');
      ws.close();
      return;
    }

    // For now, use the first class (could be enhanced to allow class selection)
    const primaryClass = classes[0];
    const connectionId = this.generateConnectionId();

    const connectedTeacher: ConnectedTeacher = {
      ws,
      userId: user.id,
      sessionId: session.id,
      classId: primaryClass.id,
      className: primaryClass.name,
      connectionId,
      lastActivity: new Date(),
    };

    this.connectedTeachers.set(connectionId, connectedTeacher);

    // Initialize or get classroom state
    if (!this.classroomStates.has(primaryClass.id)) {
      this.classroomStates.set(primaryClass.id, {
        sessionId: this.generateSessionId(),
        teacherId: user.id,
        classId: primaryClass.id,
        mode: 'instruction',
        isActive: true,
        connectedStudents: new Map(),
        timers: new Map(),
        lastActivity: new Date(),
      });
    }

    // Setup WebSocket event handlers
    this.setupWebSocketHandlers(ws, connectionId, 'teacher');

    // Send initial connection success
    this.sendToClient(ws, {
      type: 'teacher_join',
      data: {
        success: true,
        connectionId,
        classId: primaryClass.id,
        className: primaryClass.name,
        connectedStudents: Array.from(
          this.classroomStates.get(primaryClass.id)?.connectedStudents.values() || []
        ).map(s => ({
          studentId: s.studentId,
          studentName: s.studentName,
          isLocked: s.isLocked,
          lastActivity: s.lastActivity,
        })),
      },
    });

    console.log(`Teacher ${user.username} connected to classroom ${primaryClass.name}`);
  }

  private async handleStudentConnection(ws: WebSocket, user: any, session: any) {
    // Get student's class information
    const [studentAccount] = await db
      .select({
        id: studentAccounts.id,
        studentName: studentAccounts.studentName,
        classId: studentAccounts.classId,
      })
      .from(studentAccounts)
      .where(eq(studentAccounts.username, user.username))
      .limit(1);

    if (!studentAccount) {
      this.sendError(ws, 'Student account not found');
      ws.close();
      return;
    }

    const connectionId = this.generateConnectionId();

    const connectedStudent: ConnectedStudent = {
      ws,
      studentId: studentAccount.id,
      studentName: studentAccount.studentName,
      classId: studentAccount.classId,
      connectionId,
      lastActivity: new Date(),
      isLocked: false,
    };

    this.connectedStudents.set(connectionId, connectedStudent);

    // Add student to classroom state
    const classroomState = this.classroomStates.get(studentAccount.classId);
    if (classroomState) {
      classroomState.connectedStudents.set(studentAccount.id, connectedStudent);
    }

    // Setup WebSocket event handlers
    this.setupWebSocketHandlers(ws, connectionId, 'student');

    // Send initial connection success
    this.sendToClient(ws, {
      type: 'student_join',
      data: {
        success: true,
        connectionId,
        classId: studentAccount.classId,
        currentMode: classroomState?.mode || 'instruction',
        isLocked: false,
      },
    });

    // Notify teacher of new student connection
    this.notifyTeachersOfStudentConnection(studentAccount.classId, {
      studentId: studentAccount.id,
      studentName: studentAccount.studentName,
      connected: true,
    });

    console.log(`Student ${studentAccount.studentName} connected to classroom`);
  }

  private setupWebSocketHandlers(ws: WebSocket, connectionId: string, userType: 'teacher' | 'student') {
    ws.on('message', async (data) => {
      try {
        const message: ClassroomWebSocketMessage = JSON.parse(data.toString());
        await this.handleMessage(connectionId, message, userType);
      } catch (error) {
        console.error('Error handling message:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(connectionId, userType);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnect(connectionId, userType);
    });

    ws.on('pong', () => {
      // Update last activity on pong response
      if (userType === 'teacher') {
        const teacher = this.connectedTeachers.get(connectionId);
        if (teacher) {
          teacher.lastActivity = new Date();
        }
      } else {
        const student = this.connectedStudents.get(connectionId);
        if (student) {
          student.lastActivity = new Date();
        }
      }
    });
  }

  private async handleMessage(
    connectionId: string, 
    message: ClassroomWebSocketMessage, 
    userType: 'teacher' | 'student'
  ) {
    // Add timestamp and message ID if not present
    if (!message.timestamp) {
      message.timestamp = Date.now();
    }
    if (!message.messageId) {
      message.messageId = this.generateMessageId();
    }

    console.log(`Received ${userType} message:`, message.type, 'from:', connectionId);

    switch (message.type) {
      case 'ping':
        this.handlePing(connectionId, userType);
        break;
      
      case 'classroom_message':
        if (userType === 'teacher') {
          await this.handleClassroomMessage(connectionId, message);
        }
        break;
      
      case 'timer_control':
        if (userType === 'teacher') {
          await this.handleTimerControl(connectionId, message);
        }
        break;
      
      case 'screen_control':
        if (userType === 'teacher') {
          await this.handleScreenControl(connectionId, message);
        }
        break;
      
      case 'emergency_attention':
        if (userType === 'teacher') {
          await this.handleEmergencyAttention(connectionId, message);
        }
        break;
      
      case 'classroom_mode_change':
        if (userType === 'teacher') {
          await this.handleClassroomModeChange(connectionId, message);
        }
        break;
      
      case 'acknowledgment':
        await this.handleAcknowledgment(connectionId, message, userType);
        break;
      
      case 'connection_status':
        await this.handleConnectionStatus(connectionId, message, userType);
        break;
    }
  }

  private handlePing(connectionId: string, userType: 'teacher' | 'student') {
    const connection = userType === 'teacher' 
      ? this.connectedTeachers.get(connectionId)
      : this.connectedStudents.get(connectionId);
    
    if (connection) {
      this.sendToClient(connection.ws, { type: 'pong', data: { timestamp: Date.now() } });
      connection.lastActivity = new Date();
    }
  }

  private async handleClassroomMessage(connectionId: string, message: ClassroomWebSocketMessage) {
    const teacher = this.connectedTeachers.get(connectionId);
    if (!teacher) return;

    const { content, messageType, targetStudentIds, displayDuration, isUrgent } = message.data;

    // Broadcast message to targeted students or all students in class
    if (targetStudentIds && targetStudentIds.length > 0) {
      this.broadcastToSpecificStudents(teacher.classId, targetStudentIds, {
        type: 'classroom_message',
        data: {
          content,
          messageType: messageType || 'instruction',
          displayDuration,
          isUrgent: isUrgent || false,
          from: 'teacher',
        },
        messageId: message.messageId,
        timestamp: message.timestamp,
      });
    } else {
      this.broadcastToClass(teacher.classId, {
        type: 'classroom_message',
        data: {
          content,
          messageType: messageType || 'instruction',
          displayDuration,
          isUrgent: isUrgent || false,
          from: 'teacher',
        },
        messageId: message.messageId,
        timestamp: message.timestamp,
      });
    }

    // Send confirmation back to teacher
    this.sendToClient(teacher.ws, {
      type: 'classroom_message',
      data: { success: true, messageId: message.messageId },
    });
  }

  private async handleTimerControl(connectionId: string, message: ClassroomWebSocketMessage) {
    const teacher = this.connectedTeachers.get(connectionId);
    if (!teacher) return;

    const classroomState = this.classroomStates.get(teacher.classId);
    if (!classroomState) return;

    const { action, timerId, timerConfig } = message.data;

    switch (action) {
      case 'create':
        const newTimer: TimerState = {
          id: timerId || this.generateTimerId(),
          name: timerConfig.name,
          type: timerConfig.type,
          duration: timerConfig.duration,
          elapsed: 0,
          status: 'stopped',
        };
        classroomState.timers.set(newTimer.id, newTimer);
        break;
        
      case 'start':
        const startTimer = classroomState.timers.get(timerId);
        if (startTimer) {
          startTimer.status = 'running';
          startTimer.startTime = Date.now();
          if (startTimer.pauseTime) {
            // Resume from pause
            const pausedDuration = startTimer.pauseTime - (startTimer.startTime || 0);
            startTimer.elapsed += pausedDuration;
            startTimer.pauseTime = undefined;
          }
        }
        break;
        
      case 'pause':
        const pauseTimer = classroomState.timers.get(timerId);
        if (pauseTimer && pauseTimer.status === 'running') {
          pauseTimer.status = 'paused';
          pauseTimer.pauseTime = Date.now();
          pauseTimer.elapsed += Date.now() - (pauseTimer.startTime || 0);
        }
        break;
        
      case 'stop':
        const stopTimer = classroomState.timers.get(timerId);
        if (stopTimer) {
          stopTimer.status = 'stopped';
          stopTimer.elapsed = 0;
          stopTimer.startTime = undefined;
          stopTimer.pauseTime = undefined;
        }
        break;
        
      case 'delete':
        classroomState.timers.delete(timerId);
        break;
    }

    // Broadcast timer update to all students in class
    this.broadcastToClass(teacher.classId, {
      type: 'timer_control',
      data: {
        action,
        timerId,
        timerState: classroomState.timers.get(timerId),
      },
      messageId: message.messageId,
    });

    // Send confirmation to teacher
    this.sendToClient(teacher.ws, {
      type: 'timer_control',
      data: { success: true, timerId, action },
    });
  }

  private async handleScreenControl(connectionId: string, message: ClassroomWebSocketMessage) {
    const teacher = this.connectedTeachers.get(connectionId);
    if (!teacher) return;

    const { action, targetStudentIds, lockMessage } = message.data;

    const targetIds = targetStudentIds || [];

    switch (action) {
      case 'lock_all':
        this.broadcastToClass(teacher.classId, {
          type: 'screen_control',
          data: {
            action: 'lock',
            message: lockMessage || 'Skärmen är låst av läraren',
          },
          messageId: message.messageId,
        });
        // Update student states
        this.updateStudentLockStatus(teacher.classId, true);
        break;
        
      case 'unlock_all':
        this.broadcastToClass(teacher.classId, {
          type: 'screen_control',
          data: {
            action: 'unlock',
          },
          messageId: message.messageId,
        });
        this.updateStudentLockStatus(teacher.classId, false);
        break;
        
      case 'lock_students':
        if (targetIds.length > 0) {
          this.broadcastToSpecificStudents(teacher.classId, targetIds, {
            type: 'screen_control',
            data: {
              action: 'lock',
              message: lockMessage || 'Skärmen är låst av läraren',
            },
            messageId: message.messageId,
          });
          this.updateSpecificStudentLockStatus(targetIds, true);
        }
        break;
        
      case 'unlock_students':
        if (targetIds.length > 0) {
          this.broadcastToSpecificStudents(teacher.classId, targetIds, {
            type: 'screen_control',
            data: {
              action: 'unlock',
            },
            messageId: message.messageId,
          });
          this.updateSpecificStudentLockStatus(targetIds, false);
        }
        break;
    }

    // Send confirmation to teacher
    this.sendToClient(teacher.ws, {
      type: 'screen_control',
      data: { success: true, action, affectedStudents: targetIds.length || 'all' },
    });
  }

  private async handleEmergencyAttention(connectionId: string, message: ClassroomWebSocketMessage) {
    const teacher = this.connectedTeachers.get(connectionId);
    if (!teacher) return;

    const { urgentMessage } = message.data;

    // Send emergency attention message to all students
    this.broadcastToClass(teacher.classId, {
      type: 'emergency_attention',
      data: {
        message: urgentMessage || 'UPPMÄRKSAMHET: Läraren behöver allas fokus',
        isUrgent: true,
      },
      messageId: message.messageId,
    });

    // Send confirmation to teacher
    this.sendToClient(teacher.ws, {
      type: 'emergency_attention',
      data: { success: true },
    });

    console.log(`Emergency attention sent by teacher ${teacher.userId} to class ${teacher.classId}`);
  }

  private async handleClassroomModeChange(connectionId: string, message: ClassroomWebSocketMessage) {
    const teacher = this.connectedTeachers.get(connectionId);
    if (!teacher) return;

    const classroomState = this.classroomStates.get(teacher.classId);
    if (!classroomState) return;

    const { newMode } = message.data;
    classroomState.mode = newMode;

    // Broadcast mode change to all students
    this.broadcastToClass(teacher.classId, {
      type: 'classroom_mode_change',
      data: {
        newMode,
        timestamp: Date.now(),
      },
      messageId: message.messageId,
    });

    // Send confirmation to teacher
    this.sendToClient(teacher.ws, {
      type: 'classroom_mode_change',
      data: { success: true, newMode },
    });
  }

  private async handleAcknowledgment(
    connectionId: string, 
    message: ClassroomWebSocketMessage, 
    userType: 'teacher' | 'student'
  ) {
    const { originalMessageId, acknowledged } = message.data;

    if (userType === 'student') {
      const student = this.connectedStudents.get(connectionId);
      if (!student) return;

      // Notify teacher of student acknowledgment
      this.notifyTeachersInClass(student.classId, {
        type: 'acknowledgment',
        data: {
          studentId: student.studentId,
          studentName: student.studentName,
          messageId: originalMessageId,
          acknowledged,
          timestamp: Date.now(),
        },
      });
    }
  }

  private async handleConnectionStatus(
    connectionId: string, 
    message: ClassroomWebSocketMessage, 
    userType: 'teacher' | 'student'
  ) {
    if (userType === 'teacher') {
      const teacher = this.connectedTeachers.get(connectionId);
      if (!teacher) return;

      // Send current classroom status to teacher
      const classroomState = this.classroomStates.get(teacher.classId);
      if (classroomState) {
        this.sendToClient(teacher.ws, {
          type: 'connection_status',
          data: {
            connectedStudents: Array.from(classroomState.connectedStudents.values()).map(s => ({
              studentId: s.studentId,
              studentName: s.studentName,
              isLocked: s.isLocked,
              lastActivity: s.lastActivity,
              currentActivity: s.currentActivity,
            })),
            timers: Array.from(classroomState.timers.values()),
            currentMode: classroomState.mode,
          },
        });
      }
    }
  }

  // Helper methods for broadcasting messages
  private broadcastToClass(classId: string, message: ClassroomWebSocketMessage) {
    const classroomState = this.classroomStates.get(classId);
    if (!classroomState) return;

    classroomState.connectedStudents.forEach((student) => {
      if (student.ws.readyState === WebSocket.OPEN) {
        this.sendToClient(student.ws, message);
      }
    });
  }

  private broadcastToSpecificStudents(classId: string, studentIds: string[], message: ClassroomWebSocketMessage) {
    const classroomState = this.classroomStates.get(classId);
    if (!classroomState) return;

    studentIds.forEach((studentId) => {
      const student = classroomState.connectedStudents.get(studentId);
      if (student && student.ws.readyState === WebSocket.OPEN) {
        this.sendToClient(student.ws, message);
      }
    });
  }

  private notifyTeachersInClass(classId: string, message: ClassroomWebSocketMessage) {
    this.connectedTeachers.forEach((teacher) => {
      if (teacher.classId === classId && teacher.ws.readyState === WebSocket.OPEN) {
        this.sendToClient(teacher.ws, message);
      }
    });
  }

  private notifyTeachersOfStudentConnection(classId: string, studentInfo: any) {
    this.notifyTeachersInClass(classId, {
      type: 'connection_status',
      data: {
        type: 'student_connection_change',
        student: studentInfo,
      },
    });
  }

  private updateStudentLockStatus(classId: string, isLocked: boolean) {
    const classroomState = this.classroomStates.get(classId);
    if (!classroomState) return;

    classroomState.connectedStudents.forEach((student) => {
      student.isLocked = isLocked;
    });
  }

  private updateSpecificStudentLockStatus(studentIds: string[], isLocked: boolean) {
    this.connectedStudents.forEach((student) => {
      if (studentIds.includes(student.studentId)) {
        student.isLocked = isLocked;
      }
    });
  }

  private sendToClient(ws: WebSocket, message: ClassroomWebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.sendToClient(ws, {
      type: 'connection_status',
      data: { error },
    });
  }

  private sendHeartbeat() {
    // Send ping to all connected clients
    [...this.connectedTeachers.values(), ...this.connectedStudents.values()].forEach((connection) => {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.ping();
      }
    });
  }

  private cleanupInactiveConnections() {
    const now = new Date();
    const timeout = 5 * 60 * 1000; // 5 minutes

    // Clean up inactive teachers
    this.connectedTeachers.forEach((teacher, connectionId) => {
      if (now.getTime() - teacher.lastActivity.getTime() > timeout) {
        this.handleDisconnect(connectionId, 'teacher');
      }
    });

    // Clean up inactive students
    this.connectedStudents.forEach((student, connectionId) => {
      if (now.getTime() - student.lastActivity.getTime() > timeout) {
        this.handleDisconnect(connectionId, 'student');
      }
    });
  }

  private handleDisconnect(connectionId: string, userType: 'teacher' | 'student') {
    if (userType === 'teacher') {
      const teacher = this.connectedTeachers.get(connectionId);
      if (teacher) {
        console.log(`Teacher ${teacher.userId} disconnected from classroom`);
        this.connectedTeachers.delete(connectionId);
      }
    } else {
      const student = this.connectedStudents.get(connectionId);
      if (student) {
        console.log(`Student ${student.studentName} disconnected from classroom`);
        
        // Remove from classroom state
        const classroomState = this.classroomStates.get(student.classId);
        if (classroomState) {
          classroomState.connectedStudents.delete(student.studentId);
        }

        // Notify teacher of disconnection
        this.notifyTeachersOfStudentConnection(student.classId, {
          studentId: student.studentId,
          studentName: student.studentName,
          connected: false,
        });

        this.connectedStudents.delete(connectionId);
      }
    }
  }

  // Utility methods for generating IDs
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateTimerId(): string {
    return `timer_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  // Public methods for external access
  public getClassroomState(classId: string): ClassroomState | undefined {
    return this.classroomStates.get(classId);
  }

  public getConnectedStudents(classId: string): ConnectedStudent[] {
    const classroomState = this.classroomStates.get(classId);
    return classroomState ? Array.from(classroomState.connectedStudents.values()) : [];
  }

  public getConnectedTeachers(classId: string): ConnectedTeacher[] {
    return Array.from(this.connectedTeachers.values()).filter(t => t.classId === classId);
  }

  public cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.wss.close();
  }
}
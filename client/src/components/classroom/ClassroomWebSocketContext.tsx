import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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

export interface ConnectedStudent {
  studentId: string;
  studentName: string;
  isConnected: boolean;
  isLocked: boolean;
  lastActivity: Date;
  currentActivity?: string;
}

export interface ClassroomTimer {
  id: string;
  name: string;
  type: 'countdown' | 'stopwatch' | 'break_timer' | 'exercise_timer' | 'attention_timer';
  status: 'stopped' | 'running' | 'paused' | 'completed';
  elapsed: number;
  duration?: number;
  displayStyle?: 'digital' | 'progress_bar' | 'circular';
  showOnStudentScreens?: boolean;
  warningThresholds?: number[];
}

export interface ClassroomState {
  sessionId: string | null;
  classId: string | null;
  className: string | null;
  mode: 'instruction' | 'exercise' | 'test' | 'break' | 'group_work' | 'silent';
  isActive: boolean;
  connectedStudents: ConnectedStudent[];
  timers: ClassroomTimer[];
  lastActivity: Date | null;
}

interface ClassroomWebSocketContextType {
  isConnected: boolean;
  classroomState: ClassroomState;
  connect: (classId: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: Omit<ClassroomWebSocketMessage, 'timestamp' | 'messageId'>) => void;
  
  // Timer management
  createTimer: (config: {
    name: string;
    type: ClassroomTimer['type'];
    duration?: number;
    displayStyle?: ClassroomTimer['displayStyle'];
  }) => Promise<void>;
  controlTimer: (timerId: string, action: 'start' | 'pause' | 'stop' | 'delete') => Promise<void>;
  
  // Screen control
  lockAllScreens: (message?: string) => Promise<void>;
  unlockAllScreens: () => Promise<void>;
  lockStudentScreens: (studentIds: string[], message?: string) => Promise<void>;
  unlockStudentScreens: (studentIds: string[]) => Promise<void>;
  
  // Messaging
  sendClassroomMessage: (config: {
    content: string;
    messageType?: 'instruction' | 'announcement' | 'alert' | 'timer_warning' | 'break_time' | 'attention';
    title?: string;
    targetStudentIds?: string[];
    displayDuration?: number;
    isUrgent?: boolean;
  }) => Promise<void>;
  
  // Emergency controls
  sendEmergencyAttention: (message?: string) => Promise<void>;
  
  // Mode control
  changeClassroomMode: (mode: ClassroomState['mode']) => Promise<void>;
  
  // Classroom session
  createSession: (classId: string, sessionName: string) => Promise<void>;
  endSession: () => Promise<void>;
}

const ClassroomWebSocketContext = createContext<ClassroomWebSocketContextType | null>(null);

export function useClassroomWebSocket() {
  const context = useContext(ClassroomWebSocketContext);
  if (!context) {
    throw new Error('useClassroomWebSocket must be used within a ClassroomWebSocketProvider');
  }
  return context;
}

interface ClassroomWebSocketProviderProps {
  children: React.ReactNode;
}

export function ClassroomWebSocketProvider({ children }: ClassroomWebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [classroomState, setClassroomState] = useState<ClassroomState>({
    sessionId: null,
    classId: null,
    className: null,
    mode: 'instruction',
    isActive: false,
    connectedStudents: [],
    timers: [],
    lastActivity: null,
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = async (classId: string): Promise<void> => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      // WebSocket will automatically send cookies - no need to put sessionToken in URL (security risk)
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/classroom-ws`;
      
      console.log('Connecting to classroom WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Classroom WebSocket connected');
        setIsConnected(true);
        wsRef.current = ws;
        
        // Start heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', data: { timestamp: Date.now() } }));
          }
        }, 30000);

        toast({
          title: 'Klassrum anslutet',
          description: 'Du är nu ansluten till klassrumskontrollerna.',
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: ClassroomWebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('Classroom WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;
        
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Auto-reconnect if not a deliberate close
        if (event.code !== 1000 && event.code !== 1001) {
          scheduleReconnect(classId);
        }
      };

      ws.onerror = (error) => {
        console.error('Classroom WebSocket error:', error);
        toast({
          title: 'Anslutningsfel',
          description: 'Kunde inte ansluta till klassrumskontrollerna.',
          variant: 'destructive',
        });
      };

    } catch (error) {
      console.error('Error connecting to classroom WebSocket:', error);
      toast({
        title: 'Anslutningsfel',
        description: 'Kunde inte ansluta till klassrumskontrollerna.',
        variant: 'destructive',
      });
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Deliberate disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setClassroomState({
      sessionId: null,
      classId: null,
      className: null,
      mode: 'instruction',
      isActive: false,
      connectedStudents: [],
      timers: [],
      lastActivity: null,
    });
  };

  const scheduleReconnect = (classId: string) => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('Attempting to reconnect classroom WebSocket...');
      connect(classId);
    }, 3000); // Reconnect after 3 seconds
  };

  const sendMessage = (message: Omit<ClassroomWebSocketMessage, 'timestamp' | 'messageId'>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message');
      return;
    }

    const fullMessage: ClassroomWebSocketMessage = {
      ...message,
      timestamp: Date.now(),
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    };

    wsRef.current.send(JSON.stringify(fullMessage));
  };

  const handleWebSocketMessage = (message: ClassroomWebSocketMessage) => {
    console.log('Received classroom message:', message.type, message.data);

    switch (message.type) {
      case 'teacher_join':
        if (message.data.success) {
          setClassroomState(prev => ({
            ...prev,
            sessionId: message.data.sessionId || prev.sessionId,
            classId: message.data.classId || prev.classId,
            className: message.data.className || prev.className,
            connectedStudents: message.data.connectedStudents || [],
            isActive: true,
            lastActivity: new Date(),
          }));
        }
        break;

      case 'connection_status':
        if (message.data.type === 'student_connection_change') {
          setClassroomState(prev => {
            const updatedStudents = [...prev.connectedStudents];
            const existingIndex = updatedStudents.findIndex(s => s.studentId === message.data.student.studentId);
            
            if (message.data.student.connected) {
              const studentData = {
                studentId: message.data.student.studentId,
                studentName: message.data.student.studentName,
                isConnected: true,
                isLocked: false,
                lastActivity: new Date(),
              };
              
              if (existingIndex >= 0) {
                updatedStudents[existingIndex] = studentData;
              } else {
                updatedStudents.push(studentData);
              }
            } else {
              if (existingIndex >= 0) {
                updatedStudents.splice(existingIndex, 1);
              }
            }

            return {
              ...prev,
              connectedStudents: updatedStudents,
              lastActivity: new Date(),
            };
          });
        } else if (message.data.connectedStudents && message.data.timers) {
          // Full status update
          setClassroomState(prev => ({
            ...prev,
            connectedStudents: message.data.connectedStudents.map((s: any) => ({
              ...s,
              lastActivity: new Date(s.lastActivity),
            })),
            timers: message.data.timers,
            mode: message.data.currentMode || prev.mode,
            lastActivity: new Date(),
          }));
        }
        break;

      case 'timer_control':
        if (message.data.success) {
          // Timer operation confirmed
          toast({
            title: 'Timer uppdaterad',
            description: message.data.message || 'Timer operationen genomfördes framgångsrikt.',
          });
        }
        break;

      case 'screen_control':
        if (message.data.success) {
          toast({
            title: 'Skärmkontroll uppdaterad',
            description: message.data.message || 'Skärmkontroll tillämpades framgångsrikt.',
          });
        }
        break;

      case 'classroom_message':
        if (message.data.success) {
          toast({
            title: 'Meddelande skickat',
            description: 'Ditt meddelande har skickats till eleverna.',
          });
        }
        break;

      case 'emergency_attention':
        if (message.data.success) {
          toast({
            title: 'Nöduppmärksamhet skickad',
            description: 'Alla elever har fått uppmärksamhetsmeddelandet.',
          });
        }
        break;

      case 'classroom_mode_change':
        if (message.data.success) {
          setClassroomState(prev => ({
            ...prev,
            mode: message.data.newMode || prev.mode,
            lastActivity: new Date(),
          }));
          toast({
            title: 'Klassrumsläge ändrat',
            description: `Klassrumet är nu i ${message.data.newMode}-läge.`,
          });
        }
        break;

      case 'acknowledgment':
        // Student acknowledged a message
        toast({
          title: 'Elevbekräftelse',
          description: `${message.data.studentName} bekräftade meddelandet.`,
        });
        break;

      case 'pong':
        // Heartbeat response received
        break;

      default:
        console.log('Unhandled classroom message type:', message.type);
    }
  };

  // API integration functions
  const createTimer = async (config: {
    name: string;
    type: ClassroomTimer['type'];
    duration?: number;
    displayStyle?: ClassroomTimer['displayStyle'];
  }) => {
    if (!classroomState.sessionId) {
      throw new Error('No active classroom session');
    }

    try {
      const response = await fetch('/api/classroom/timers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': localStorage.getItem('csrfToken') || '',
        },
        body: JSON.stringify({
          sessionId: classroomState.sessionId,
          ...config,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Could not create timer');
      }

      const result = await response.json();
      if (result.success) {
        // Update local timer state
        setClassroomState(prev => ({
          ...prev,
          timers: [...prev.timers, result.timer],
        }));
      }
    } catch (error: any) {
      toast({
        title: 'Fel vid skapande av timer',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const controlTimer = async (timerId: string, action: 'start' | 'pause' | 'stop' | 'delete') => {
    try {
      const response = await fetch(`/api/classroom/timers/${timerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': localStorage.getItem('csrfToken') || '',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Could not control timer');
      }

      const result = await response.json();
      if (result.success) {
        // Update local timer state
        setClassroomState(prev => ({
          ...prev,
          timers: action === 'delete' 
            ? prev.timers.filter(t => t.id !== timerId)
            : prev.timers.map(t => t.id === timerId ? result.timer : t),
        }));
      }
    } catch (error: any) {
      toast({
        title: 'Fel vid kontroll av timer',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const lockAllScreens = async (message?: string) => {
    if (!classroomState.sessionId) {
      throw new Error('No active classroom session');
    }

    try {
      const response = await fetch('/api/classroom/screen-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': localStorage.getItem('csrfToken') || '',
        },
        body: JSON.stringify({
          sessionId: classroomState.sessionId,
          action: 'lock_all',
          lockMessage: message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Could not lock screens');
      }

      // Update local state
      setClassroomState(prev => ({
        ...prev,
        connectedStudents: prev.connectedStudents.map(s => ({
          ...s,
          isLocked: true,
        })),
      }));
    } catch (error: any) {
      toast({
        title: 'Fel vid låsning av skärmar',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const unlockAllScreens = async () => {
    if (!classroomState.sessionId) {
      throw new Error('No active classroom session');
    }

    try {
      const response = await fetch('/api/classroom/screen-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': localStorage.getItem('csrfToken') || '',
        },
        body: JSON.stringify({
          sessionId: classroomState.sessionId,
          action: 'unlock_all',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Could not unlock screens');
      }

      // Update local state
      setClassroomState(prev => ({
        ...prev,
        connectedStudents: prev.connectedStudents.map(s => ({
          ...s,
          isLocked: false,
        })),
      }));
    } catch (error: any) {
      toast({
        title: 'Fel vid upplåsning av skärmar',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const lockStudentScreens = async (studentIds: string[], message?: string) => {
    if (!classroomState.sessionId) {
      throw new Error('No active classroom session');
    }

    try {
      const response = await fetch('/api/classroom/screen-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': localStorage.getItem('csrfToken') || '',
        },
        body: JSON.stringify({
          sessionId: classroomState.sessionId,
          action: 'lock_students',
          targetStudentIds: studentIds,
          lockMessage: message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Could not lock student screens');
      }

      // Update local state
      setClassroomState(prev => ({
        ...prev,
        connectedStudents: prev.connectedStudents.map(s => ({
          ...s,
          isLocked: studentIds.includes(s.studentId) ? true : s.isLocked,
        })),
      }));
    } catch (error: any) {
      toast({
        title: 'Fel vid låsning av elevskärmar',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const unlockStudentScreens = async (studentIds: string[]) => {
    if (!classroomState.sessionId) {
      throw new Error('No active classroom session');
    }

    try {
      const response = await fetch('/api/classroom/screen-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': localStorage.getItem('csrfToken') || '',
        },
        body: JSON.stringify({
          sessionId: classroomState.sessionId,
          action: 'unlock_students',
          targetStudentIds: studentIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Could not unlock student screens');
      }

      // Update local state
      setClassroomState(prev => ({
        ...prev,
        connectedStudents: prev.connectedStudents.map(s => ({
          ...s,
          isLocked: studentIds.includes(s.studentId) ? false : s.isLocked,
        })),
      }));
    } catch (error: any) {
      toast({
        title: 'Fel vid upplåsning av elevskärmar',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const sendClassroomMessage = async (config: {
    content: string;
    messageType?: 'instruction' | 'announcement' | 'alert' | 'timer_warning' | 'break_time' | 'attention';
    title?: string;
    targetStudentIds?: string[];
    displayDuration?: number;
    isUrgent?: boolean;
  }) => {
    if (!classroomState.sessionId) {
      throw new Error('No active classroom session');
    }

    try {
      const response = await fetch('/api/classroom/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': localStorage.getItem('csrfToken') || '',
        },
        body: JSON.stringify({
          sessionId: classroomState.sessionId,
          ...config,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Could not send message');
      }
    } catch (error: any) {
      toast({
        title: 'Fel vid skicka meddelande',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const sendEmergencyAttention = async (message?: string) => {
    if (!classroomState.sessionId) {
      throw new Error('No active classroom session');
    }

    try {
      const response = await fetch('/api/classroom/emergency-attention', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': localStorage.getItem('csrfToken') || '',
        },
        body: JSON.stringify({
          sessionId: classroomState.sessionId,
          message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Could not send emergency attention');
      }
    } catch (error: any) {
      toast({
        title: 'Fel vid nöduppmärksamhet',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const changeClassroomMode = async (mode: ClassroomState['mode']) => {
    if (!classroomState.sessionId) {
      throw new Error('No active classroom session');
    }

    try {
      const response = await fetch(`/api/classroom/sessions/${classroomState.sessionId}/mode`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': localStorage.getItem('csrfToken') || '',
        },
        body: JSON.stringify({ mode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Could not change classroom mode');
      }
    } catch (error: any) {
      toast({
        title: 'Fel vid ändring av klassrumsläge',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const createSession = async (classId: string, sessionName: string) => {
    try {
      const response = await fetch('/api/classroom/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': localStorage.getItem('csrfToken') || '',
        },
        body: JSON.stringify({
          classId,
          sessionName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Could not create classroom session');
      }

      const result = await response.json();
      if (result.success) {
        // Connect to WebSocket after session is created
        await connect(classId);
      }
    } catch (error: any) {
      toast({
        title: 'Fel vid skapande av klassrumssession',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const endSession = async () => {
    // End current session and disconnect
    disconnect();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const value: ClassroomWebSocketContextType = {
    isConnected,
    classroomState,
    connect,
    disconnect,
    sendMessage,
    createTimer,
    controlTimer,
    lockAllScreens,
    unlockAllScreens,
    lockStudentScreens,
    unlockStudentScreens,
    sendClassroomMessage,
    sendEmergencyAttention,
    changeClassroomMode,
    createSession,
    endSession,
  };

  return (
    <ClassroomWebSocketContext.Provider value={value}>
      {children}
    </ClassroomWebSocketContext.Provider>
  );
}
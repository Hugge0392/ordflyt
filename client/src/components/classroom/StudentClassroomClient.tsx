import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Lock, 
  Clock, 
  MessageCircle, 
  AlertTriangle, 
  Volume2,
  X,
  Check,
  Activity
} from 'lucide-react';

// Types for student classroom functionality
export interface StudentClassroomMessage {
  type: 'screen_control' | 'timer_control' | 'classroom_message' | 'classroom_mode_change' | 'connection_status' | 'emergency_attention' | 'ping' | 'pong';
  data: any;
  timestamp?: number;
  messageId?: string;
}

export interface StudentTimer {
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

export interface StudentClassroomState {
  isConnected: boolean;
  isScreenLocked: boolean;
  lockMessage: string;
  activeTimers: StudentTimer[];
  classroomMode: 'instruction' | 'exercise' | 'test' | 'break' | 'group_work' | 'silent';
  lastMessage: {
    title?: string;
    content: string;
    messageType: 'instruction' | 'announcement' | 'alert' | 'timer_warning' | 'break_time' | 'attention';
    isUrgent: boolean;
    timestamp: number;
    displayDuration?: number;
  } | null;
}

interface StudentClassroomContextType {
  classroomState: StudentClassroomState;
  connect: () => Promise<void>;
  disconnect: () => void;
  acknowledgeMessage: (messageId: string) => void;
}

const StudentClassroomContext = createContext<StudentClassroomContextType | null>(null);

export function useStudentClassroom() {
  const context = useContext(StudentClassroomContext);
  if (!context) {
    throw new Error('useStudentClassroom must be used within a StudentClassroomProvider');
  }
  return context;
}

interface StudentClassroomProviderProps {
  children: React.ReactNode;
}

export function StudentClassroomProvider({ children }: StudentClassroomProviderProps) {
  const [classroomState, setClassroomState] = useState<StudentClassroomState>({
    isConnected: false,
    isScreenLocked: false,
    lockMessage: '',
    activeTimers: [],
    classroomMode: 'instruction',
    lastMessage: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const connect = useCallback(async (): Promise<void> => {
    // Only connect if user is a student
    if (!user || user.role !== 'ELEV') {
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('Student classroom WebSocket already connected');
      return;
    }

    try {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/classroom-ws`;
      
      console.log('Student connecting to classroom WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Student classroom WebSocket connected');
        setClassroomState(prev => ({ ...prev, isConnected: true }));
        wsRef.current = ws;
      };

      ws.onmessage = (event) => {
        try {
          const message: StudentClassroomMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing student WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('Student classroom WebSocket closed:', event.code, event.reason);
        setClassroomState(prev => ({ ...prev, isConnected: false }));
        wsRef.current = null;
        
        // Clear all timer intervals
        timerIntervalsRef.current.forEach(interval => clearInterval(interval));
        timerIntervalsRef.current.clear();

        // Auto-reconnect if not a deliberate close
        if (event.code !== 1000 && event.code !== 1001) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error('Student classroom WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error connecting student to classroom WebSocket:', error);
    }
  }, [user]); // Only depend on user, other functions will be stable

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    timerIntervalsRef.current.forEach(interval => clearInterval(interval));
    timerIntervalsRef.current.clear();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Student disconnect');
      wsRef.current = null;
    }
    
    setClassroomState({
      isConnected: false,
      isScreenLocked: false,
      lockMessage: '',
      activeTimers: [],
      classroomMode: 'instruction',
      lastMessage: null,
    });
  }, []); // No dependencies needed

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('Attempting to reconnect student classroom WebSocket...');
      connect();
    }, 5000); // Reconnect after 5 seconds
  }, [connect]);

  const handleWebSocketMessage = useCallback((message: StudentClassroomMessage) => {
    console.log('Student received classroom message:', message.type, message.data);

    switch (message.type) {
      case 'screen_control':
        handleScreenControl(message);
        break;

      case 'timer_control':
        handleTimerControl(message);
        break;

      case 'classroom_message':
        handleClassroomMessage(message);
        break;

      case 'classroom_mode_change':
        handleModeChange(message);
        break;

      case 'emergency_attention':
        handleEmergencyAttention(message);
        break;

      case 'ping':
        // Respond to ping with pong
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ 
            type: 'pong', 
            data: { timestamp: Date.now() } 
          }));
        }
        break;

      default:
        console.log('Unknown student message type:', message.type);
    }
  }, []);

  const handleScreenControl = useCallback((message: StudentClassroomMessage) => {
    const { action, message: lockMsg } = message.data;
    
    if (action === 'lock') {
      setClassroomState(prev => ({
        ...prev,
        isScreenLocked: true,
        lockMessage: lockMsg || 'Skärmen är låst av läraren',
      }));
      
      toast({
        title: 'Skärm låst',
        description: lockMsg || 'Skärmen är låst av läraren',
        variant: 'destructive',
      });
    } else if (action === 'unlock') {
      setClassroomState(prev => ({
        ...prev,
        isScreenLocked: false,
        lockMessage: '',
      }));
      
      toast({
        title: 'Skärm upplåst',
        description: 'Du kan nu fortsätta arbeta.',
      });
    }
  }, [toast]);

  const handleTimerControl = useCallback((message: StudentClassroomMessage) => {
    const { timer, action } = message.data;
    
    if (!timer.showOnStudentScreens) return;

    setClassroomState(prev => {
      const updatedTimers = [...prev.activeTimers];
      const existingIndex = updatedTimers.findIndex(t => t.id === timer.id);

      if (action === 'delete' || action === 'stop') {
        if (existingIndex >= 0) {
          updatedTimers.splice(existingIndex, 1);
        }
        // Clear timer interval
        const interval = timerIntervalsRef.current.get(timer.id);
        if (interval) {
          clearInterval(interval);
          timerIntervalsRef.current.delete(timer.id);
        }
      } else {
        const updatedTimer = { ...timer };
        
        if (existingIndex >= 0) {
          updatedTimers[existingIndex] = updatedTimer;
        } else {
          updatedTimers.push(updatedTimer);
        }

        // Start timer interval for visual updates
        if (action === 'start' && timer.status === 'running') {
          const interval = timerIntervalsRef.current.get(timer.id);
          if (interval) clearInterval(interval);

          const newInterval = setInterval(() => {
            setClassroomState(current => {
              const timers = [...current.activeTimers];
              const timerIndex = timers.findIndex(t => t.id === timer.id);
              if (timerIndex >= 0 && timers[timerIndex].status === 'running') {
                timers[timerIndex] = {
                  ...timers[timerIndex],
                  elapsed: timers[timerIndex].elapsed + 1000, // Add 1000ms (1 second)
                };
                return { ...current, activeTimers: timers };
              }
              return current;
            });
          }, 1000);
          
          timerIntervalsRef.current.set(timer.id, newInterval);
        }
      }

      return {
        ...prev,
        activeTimers: updatedTimers,
      };
    });
  }, []);

  const handleClassroomMessage = useCallback((message: StudentClassroomMessage) => {
    const { title, content, messageType, isUrgent, displayDuration } = message.data;
    
    setClassroomState(prev => ({
      ...prev,
      lastMessage: {
        title,
        content,
        messageType: messageType || 'instruction',
        isUrgent: isUrgent || false,
        timestamp: Date.now(),
        displayDuration,
      },
    }));

    // Show toast notification
    toast({
      title: title || 'Meddelande från läraren',
      description: content,
      variant: isUrgent ? 'destructive' : 'default',
    });
  }, [toast]);

  const handleModeChange = useCallback((message: StudentClassroomMessage) => {
    const { newMode } = message.data;
    
    setClassroomState(prev => ({
      ...prev,
      classroomMode: newMode,
    }));

    toast({
      title: 'Klassrumsläge ändrat',
      description: `Nytt läge: ${getModeDisplayName(newMode)}`,
    });
  }, [toast]);

  const handleEmergencyAttention = useCallback((message: StudentClassroomMessage) => {
    const { message: urgentMsg } = message.data;
    
    setClassroomState(prev => ({
      ...prev,
      lastMessage: {
        content: urgentMsg || 'UPPMÄRKSAMHET! Titta på läraren.',
        messageType: 'attention',
        isUrgent: true,
        timestamp: Date.now(),
      },
    }));

    toast({
      title: '🚨 UPPMÄRKSAMHET!',
      description: urgentMsg || 'Titta på läraren omedelbart.',
      variant: 'destructive',
    });
  }, [toast]);

  const acknowledgeMessage = useCallback((messageId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'acknowledgment',
        data: { messageId, timestamp: Date.now() },
      }));
    }
  }, []);

  const getModeDisplayName = (mode: string) => {
    const modeNames: Record<string, string> = {
      'instruction': 'Undervisning',
      'exercise': 'Övning',
      'test': 'Test',
      'break': 'Rast',
      'group_work': 'Grupparbete',
      'silent': 'Tyst arbete',
    };
    return modeNames[mode] || mode;
  };

  // Auto-connect when user is available and is a student
  useEffect(() => {
    if (user && user.role === 'ELEV') {
      connect();
    }
    
    // Only disconnect on unmount, not on dependency changes
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount');
        wsRef.current = null;
      }
    };
  }, [user?.id, user?.role]); // Only depend on user id and role, not the whole user object

  return (
    <StudentClassroomContext.Provider value={{
      classroomState,
      connect,
      disconnect,
      acknowledgeMessage,
    }}>
      {children}
      <StudentClassroomOverlays />
    </StudentClassroomContext.Provider>
  );
}

// Component that renders overlays for screen lock, timers, messages
function StudentClassroomOverlays() {
  const { classroomState, acknowledgeMessage } = useStudentClassroom();
  const [dismissedMessage, setDismissedMessage] = useState<number | null>(null);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimerProgress = (timer: StudentTimer) => {
    if (!timer.duration) return 0;
    return Math.min((timer.elapsed / timer.duration) * 100, 100);
  };

  // Screen lock overlay
  if (classroomState.isScreenLocked) {
    return (
      <div 
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center"
        data-testid="screen-lock-overlay"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-xl max-w-md mx-4 text-center">
          <Lock className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Skärm låst
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {classroomState.lockMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Timer displays */}
      {classroomState.activeTimers.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2" data-testid="timer-display">
          {classroomState.activeTimers.map((timer) => (
            <Card key={timer.id} className="bg-white/95 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {timer.name}
                  <Badge variant={timer.status === 'running' ? 'default' : 'secondary'}>
                    {timer.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-mono font-bold text-center">
                  {formatTime(timer.elapsed)}
                </div>
                {timer.duration && timer.displayStyle === 'progress_bar' && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${getTimerProgress(timer)}%` }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Message display */}
      {classroomState.lastMessage && 
       dismissedMessage !== classroomState.lastMessage.timestamp && (
        <div className="fixed top-4 left-4 z-40 max-w-md" data-testid="classroom-message">
          <Card className={`shadow-lg ${
            classroomState.lastMessage.isUrgent 
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
              : 'bg-white/95 backdrop-blur-sm'
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {classroomState.lastMessage.messageType === 'attention' ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
                {classroomState.lastMessage.title || 'Meddelande'}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 w-6 p-0"
                  onClick={() => setDismissedMessage(classroomState.lastMessage!.timestamp)}
                  data-testid="dismiss-message"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{classroomState.lastMessage.content}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Classroom mode indicator */}
      <div className="fixed bottom-4 left-4 z-30" data-testid="classroom-mode">
        <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm shadow-md">
          <Activity className="h-3 w-3 mr-1" />
          {classroomState.classroomMode === 'instruction' && 'Undervisning'}
          {classroomState.classroomMode === 'exercise' && 'Övning'}
          {classroomState.classroomMode === 'test' && 'Test'}
          {classroomState.classroomMode === 'break' && 'Rast'}
          {classroomState.classroomMode === 'group_work' && 'Grupparbete'}
          {classroomState.classroomMode === 'silent' && 'Tyst arbete'}
        </Badge>
      </div>
    </>
  );
}

// Simple hook for pages that just need to know if screen is locked
export function useStudentScreenLock() {
  const { classroomState } = useStudentClassroom();
  return {
    isScreenLocked: classroomState.isScreenLocked,
    lockMessage: classroomState.lockMessage,
  };
}
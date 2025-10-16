import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClassroomWebSocket } from './ClassroomWebSocketContext';
import { useToast } from '@/hooks/use-toast';
import {
  Monitor,
  Clock,
  MessageCircle,
  Users,
  Lock,
  Unlock,
  AlertTriangle,
  Play,
  Pause,
  Square,
  Trash2,
  Plus,
  Send,
  Volume2,
  Timer,
  Settings,
  Zap,
  Eye,
  Activity,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface ClassroomControlPanelProps {
  classId: string;
  className: string;
}

export default function ClassroomControlPanel({ classId, className }: ClassroomControlPanelProps) {
  const {
    isConnected,
    classroomState,
    connect,
    createSession,
    createTimer,
    controlTimer,
    lockAllScreens,
    unlockAllScreens,
    lockStudentScreens,
    unlockStudentScreens,
    sendClassroomMessage,
    sendEmergencyAttention,
    changeClassroomMode,
  } = useClassroomWebSocket();
  
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(false);
  const [showTimerDialog, setShowTimerDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [lockMessage, setLockMessage] = useState('Skärmen är låst av läraren');
  
  // Timer creation form
  const [timerForm, setTimerForm] = useState({
    name: '',
    type: 'countdown' as const,
    duration: 300, // 5 minutes in seconds
    displayStyle: 'digital' as const,
  });
  
  // Message form
  const [messageForm, setMessageForm] = useState({
    title: '',
    content: '',
    messageType: 'instruction' as const,
    targetSpecific: false,
    displayDuration: 0,
    isUrgent: false,
  });

  const handleInitializeClassroom = async () => {
    setIsInitializing(true);
    try {
      const sessionName = `${className} - ${new Date().toLocaleString('sv-SE')}`;
      await createSession(classId, sessionName);
      
      toast({
        title: 'Klassrum initierat',
        description: `Klassrumskontroller aktiverade för ${className}`,
      });
    } catch (error: any) {
      toast({
        title: 'Fel vid initiering',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleCreateTimer = async () => {
    try {
      await createTimer({
        name: timerForm.name || `Timer ${classroomState.timers.length + 1}`,
        type: timerForm.type,
        duration: timerForm.type === 'countdown' ? timerForm.duration * 1000 : undefined, // Convert to milliseconds
        displayStyle: timerForm.displayStyle,
      });
      
      setShowTimerDialog(false);
      setTimerForm({
        name: '',
        type: 'countdown',
        duration: 300,
        displayStyle: 'digital',
      });
    } catch (error) {
      // Error handled by context
    }
  };

  const handleSendMessage = async () => {
    try {
      await sendClassroomMessage({
        title: messageForm.title || undefined,
        content: messageForm.content,
        messageType: messageForm.messageType,
        targetStudentIds: messageForm.targetSpecific ? selectedStudents : undefined,
        displayDuration: messageForm.displayDuration || undefined,
        isUrgent: messageForm.isUrgent,
      });
      
      setShowMessageDialog(false);
      setMessageForm({
        title: '',
        content: '',
        messageType: 'instruction',
        targetSpecific: false,
        displayDuration: 0,
        isUrgent: false,
      });
    } catch (error) {
      // Error handled by context
    }
  };

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTimerDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isConnected && !classroomState.isActive) {
    return (
      <div className="space-y-6">
        {/* Initialize Classroom */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-3">
              <Monitor className="h-6 w-6 text-blue-600" />
              <span>Klassrumsskärm</span>
            </CardTitle>
            <CardDescription>
              Aktivera klassrumskontroller för {className}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Settings className="h-8 w-8 text-blue-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-blue-900">Klassrumskontroller</h3>
                  <p className="text-sm text-blue-700">Real-tid kontroll över elevskärmar och aktiviteter</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-sm font-medium">Timers</div>
                  <div className="text-xs text-gray-600">Klassrumsaktiviteter</div>
                </div>
                <div className="text-center">
                  <Lock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-sm font-medium">Skärmlås</div>
                  <div className="text-xs text-gray-600">Kontrollera fokus</div>
                </div>
                <div className="text-center">
                  <MessageCircle className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-sm font-medium">Meddelanden</div>
                  <div className="text-xs text-gray-600">Direktkommunikation</div>
                </div>
                <div className="text-center">
                  <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-sm font-medium">Elevöversikt</div>
                  <div className="text-xs text-gray-600">Real-tid status</div>
                </div>
              </div>

              <Button
                onClick={handleInitializeClassroom}
                disabled={isInitializing}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-initialize-classroom"
              >
                {isInitializing ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Initierar...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Aktivera klassrumskontroller
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Classroom Status Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-3">
                <Monitor className="h-6 w-6" />
                <span>{className} - Klassrumskontroll</span>
              </CardTitle>
              <CardDescription className="text-blue-100">
                Aktiv session • {classroomState.connectedStudents.length} elever anslutna
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-2">
                {isConnected ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-300" />
                    <span className="text-sm">Ansluten</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-orange-300" />
                    <span className="text-sm">Ansluter...</span>
                  </>
                )}
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {classroomState.mode}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="controls" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="controls">Snabbkontroller</TabsTrigger>
          <TabsTrigger value="timers">Timers</TabsTrigger>
          <TabsTrigger value="messages">Meddelanden</TabsTrigger>
          <TabsTrigger value="students">Elever</TabsTrigger>
        </TabsList>

        {/* Quick Controls */}
        <TabsContent value="controls" className="space-y-6">
          {/* Emergency Controls */}
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-600">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Nödkontroller
              </CardTitle>
              <CardDescription>
                Snabba åtgärder för klassrumshantering
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                size="lg"
                className="h-16 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => sendEmergencyAttention('UPPMÄRKSAMHET: Läraren behöver allas fokus nu!')}
                data-testid="button-emergency-attention"
              >
                <Zap className="h-6 w-6 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Nöduppmärksamhet</div>
                  <div className="text-sm opacity-75">Få alla elevers fokus</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-16 border-orange-200 text-orange-600 hover:bg-orange-50"
                onClick={() => lockAllScreens('Pausar för instruktion - lyssna på läraren')}
                data-testid="button-pause-for-instruction"
              >
                <Lock className="h-6 w-6 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Pausa för instruktion</div>
                  <div className="text-sm opacity-75">Lås alla skärmar</div>
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Screen Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Monitor className="h-5 w-5 mr-2" />
                Skärmkontroll
              </CardTitle>
              <CardDescription>
                Kontrollera elevernas skärmtillgång
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                size="lg"
                className="h-16 flex-col"
                onClick={() => lockAllScreens(lockMessage)}
                data-testid="button-lock-all-screens"
              >
                <Lock className="h-6 w-6 mb-2 text-red-500" />
                <span>Lås alla skärmar</span>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-16 flex-col"
                onClick={() => unlockAllScreens()}
                data-testid="button-unlock-all-screens"
              >
                <Unlock className="h-6 w-6 mb-2 text-green-500" />
                <span>Lås upp alla skärmar</span>
              </Button>
            </CardContent>
            <CardContent className="border-t">
              <Label htmlFor="lock-message">Meddelande vid låsning</Label>
              <Input
                id="lock-message"
                value={lockMessage}
                onChange={(e) => setLockMessage(e.target.value)}
                placeholder="Meddelande som visas när skärmar låses"
                className="mt-2"
              />
            </CardContent>
          </Card>

          {/* Mode Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Klassrumsläge
              </CardTitle>
              <CardDescription>
                Ändra klassrumets aktuella läge
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { mode: 'instruction' as const, label: 'Instruktion', color: 'blue' },
                { mode: 'exercise' as const, label: 'Övning', color: 'green' },
                { mode: 'test' as const, label: 'Test', color: 'orange' },
                { mode: 'break' as const, label: 'Rast', color: 'purple' },
                { mode: 'group_work' as const, label: 'Grupparbete', color: 'indigo' },
                { mode: 'silent' as const, label: 'Tyst arbete', color: 'gray' },
              ].map(({ mode, label, color }) => (
                <Button
                  key={mode}
                  variant={classroomState.mode === mode ? 'default' : 'outline'}
                  onClick={() => changeClassroomMode(mode)}
                  className={classroomState.mode === mode ? '' : `border-${color}-200 text-${color}-600 hover:bg-${color}-50`}
                >
                  {label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timer Management */}
        <TabsContent value="timers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Klassrumstimers
                  </CardTitle>
                  <CardDescription>
                    Hantera timers för aktiviteter och övningar
                  </CardDescription>
                </div>
                <Dialog open={showTimerDialog} onOpenChange={setShowTimerDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-timer">
                      <Plus className="h-4 w-4 mr-2" />
                      Skapa timer
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Skapa ny timer</DialogTitle>
                      <DialogDescription>
                        Konfigurera en timer för klassrumsaktiviteter
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="timer-name">Namn</Label>
                        <Input
                          id="timer-name"
                          value={timerForm.name}
                          onChange={(e) => setTimerForm({ ...timerForm, name: e.target.value })}
                          placeholder="t.ex. Läsövning, Diskussion, Paus"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="timer-type">Typ</Label>
                        <Select 
                          value={timerForm.type} 
                          onValueChange={(value: any) => setTimerForm({ ...timerForm, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Välj timer-typ" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="countdown">Nedräkning</SelectItem>
                            <SelectItem value="stopwatch">Stoppur</SelectItem>
                            <SelectItem value="break_timer">Rasttimer</SelectItem>
                            <SelectItem value="exercise_timer">Övningstimer</SelectItem>
                            <SelectItem value="attention_timer">Uppmärksamhetstimer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {timerForm.type === 'countdown' && (
                        <div className="grid gap-2">
                          <Label htmlFor="timer-duration">Tid (sekunder)</Label>
                          <Input
                            id="timer-duration"
                            type="number"
                            value={timerForm.duration}
                            onChange={(e) => setTimerForm({ ...timerForm, duration: Number(e.target.value) })}
                            min="1"
                            step="1"
                          />
                          <div className="text-sm text-gray-500">
                            {formatTimerDuration(timerForm.duration)}
                          </div>
                        </div>
                      )}
                      <div className="grid gap-2">
                        <Label htmlFor="display-style">Visningsstil</Label>
                        <Select 
                          value={timerForm.displayStyle} 
                          onValueChange={(value: any) => setTimerForm({ ...timerForm, displayStyle: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="digital">Digital</SelectItem>
                            <SelectItem value="progress_bar">Framstegsindikator</SelectItem>
                            <SelectItem value="circular">Cirkulär</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowTimerDialog(false)}>
                        Avbryt
                      </Button>
                      <Button onClick={handleCreateTimer}>Skapa timer</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {classroomState.timers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Timer className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Inga timers skapade än</p>
                  <p className="text-sm mt-1">Skapa en timer för att komma igång</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {classroomState.timers.map((timer) => (
                    <Card key={timer.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{timer.name}</h4>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Badge variant="outline">{timer.type}</Badge>
                              <span>{timer.displayStyle}</span>
                              {timer.duration && (
                                <span>• {formatTime(timer.duration)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-right mr-4">
                              <div className="font-mono text-lg">
                                {formatTime(timer.elapsed)}
                              </div>
                              <Badge 
                                variant={
                                  timer.status === 'running' ? 'default' : 
                                  timer.status === 'completed' ? 'secondary' : 'outline'
                                }
                                className={
                                  timer.status === 'running' ? 'bg-green-500' :
                                  timer.status === 'paused' ? 'bg-yellow-500' :
                                  timer.status === 'completed' ? 'bg-blue-500' : ''
                                }
                              >
                                {timer.status === 'running' ? 'Körs' :
                                 timer.status === 'paused' ? 'Pausad' :
                                 timer.status === 'completed' ? 'Klar' : 'Stoppad'}
                              </Badge>
                            </div>
                            <div className="flex space-x-1">
                              {timer.status === 'running' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => controlTimer(timer.id, 'pause')}
                                >
                                  <Pause className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => controlTimer(timer.id, 'start')}
                                  className="text-green-600 border-green-300"
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => controlTimer(timer.id, 'stop')}
                              >
                                <Square className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => controlTimer(timer.id, 'delete')}
                                className="text-red-600 border-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Message Management */}
        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Klassrumsmeddelanden
                  </CardTitle>
                  <CardDescription>
                    Skicka meddelanden och instruktioner till elever
                  </CardDescription>
                </div>
                <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-send-message">
                      <Send className="h-4 w-4 mr-2" />
                      Skicka meddelande
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Skicka klassrumsmeddelande</DialogTitle>
                      <DialogDescription>
                        Skicka instruktioner eller meddelanden till elever
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="message-title">Titel (valfritt)</Label>
                        <Input
                          id="message-title"
                          value={messageForm.title}
                          onChange={(e) => setMessageForm({ ...messageForm, title: e.target.value })}
                          placeholder="t.ex. Viktigt meddelande, Nästa uppgift"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="message-content">Meddelande</Label>
                        <Textarea
                          id="message-content"
                          value={messageForm.content}
                          onChange={(e) => setMessageForm({ ...messageForm, content: e.target.value })}
                          placeholder="Skriv ditt meddelande här..."
                          rows={4}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="message-type">Typ</Label>
                          <Select 
                            value={messageForm.messageType} 
                            onValueChange={(value: any) => setMessageForm({ ...messageForm, messageType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="instruction">Instruktion</SelectItem>
                              <SelectItem value="announcement">Meddelande</SelectItem>
                              <SelectItem value="alert">Varning</SelectItem>
                              <SelectItem value="timer_warning">Timer-varning</SelectItem>
                              <SelectItem value="break_time">Rasttid</SelectItem>
                              <SelectItem value="attention">Uppmärksamhet</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="display-duration">Visningstid (sekunder, 0 = permanent)</Label>
                          <Input
                            id="display-duration"
                            type="number"
                            value={messageForm.displayDuration}
                            onChange={(e) => setMessageForm({ ...messageForm, displayDuration: Number(e.target.value) })}
                            min="0"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is-urgent"
                          checked={messageForm.isUrgent}
                          onChange={(e) => setMessageForm({ ...messageForm, isUrgent: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="is-urgent">Markera som brådskande</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="target-specific"
                          checked={messageForm.targetSpecific}
                          onChange={(e) => setMessageForm({ ...messageForm, targetSpecific: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="target-specific">Skicka till specifika elever</Label>
                      </div>
                      {messageForm.targetSpecific && (
                        <div className="grid gap-2">
                          <Label>Välj elever</Label>
                          <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                            {classroomState.connectedStudents.map((student) => (
                              <div key={student.studentId} className="flex items-center space-x-2 mb-2">
                                <input
                                  type="checkbox"
                                  id={`student-${student.studentId}`}
                                  checked={selectedStudents.includes(student.studentId)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedStudents([...selectedStudents, student.studentId]);
                                    } else {
                                      setSelectedStudents(selectedStudents.filter(id => id !== student.studentId));
                                    }
                                  }}
                                  className="h-4 w-4"
                                />
                                <Label htmlFor={`student-${student.studentId}`} className="flex items-center space-x-2">
                                  <span>{student.studentName}</span>
                                  {student.isConnected ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-gray-400" />
                                  )}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
                        Avbryt
                      </Button>
                      <Button onClick={handleSendMessage} disabled={!messageForm.content.trim()}>
                        Skicka meddelande
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Quick message templates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-16 justify-start"
                  onClick={() => sendClassroomMessage({
                    content: 'Titta på tavlan för nästa instruktion.',
                    messageType: 'instruction',
                  })}
                >
                  <Eye className="h-5 w-5 mr-3 text-blue-500" />
                  <div className="text-left">
                    <div className="font-medium">Uppmärksamhet tavla</div>
                    <div className="text-sm text-gray-600">Standard instruktion</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-16 justify-start"
                  onClick={() => sendClassroomMessage({
                    content: 'Dags för paus! Stäng av era skärmar och ta en kort rast.',
                    messageType: 'break_time',
                  })}
                >
                  <RefreshCw className="h-5 w-5 mr-3 text-green-500" />
                  <div className="text-left">
                    <div className="font-medium">Pausmeddelande</div>
                    <div className="text-sm text-gray-600">Rasttid</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-16 justify-start"
                  onClick={() => sendClassroomMessage({
                    content: 'Spara ert arbete nu innan vi fortsätter.',
                    messageType: 'instruction',
                  })}
                >
                  <Activity className="h-5 w-5 mr-3 text-orange-500" />
                  <div className="text-left">
                    <div className="font-medium">Spara arbete</div>
                    <div className="text-sm text-gray-600">Säkerhetspåminnelse</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-16 justify-start"
                  onClick={() => sendClassroomMessage({
                    content: 'Bra jobbat idag! Fortsätt så där.',
                    messageType: 'announcement',
                  })}
                >
                  <CheckCircle className="h-5 w-5 mr-3 text-purple-500" />
                  <div className="text-left">
                    <div className="font-medium">Positiv bekräftelse</div>
                    <div className="text-sm text-gray-600">Uppmuntran</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Student Overview */}
        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Anslutna elever ({classroomState.connectedStudents.length})
              </CardTitle>
              <CardDescription>
                Real-tid översikt över elevernas aktivitet och status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {classroomState.connectedStudents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Inga elever anslutna än</p>
                  <p className="text-sm mt-1">Elever kommer att visas här när de ansluter till lektionen</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {classroomState.connectedStudents.map((student) => (
                    <Card key={student.studentId} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              {student.isConnected ? (
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              ) : (
                                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                              )}
                              <span className="font-medium">{student.studentName}</span>
                            </div>
                            <div className="flex space-x-2">
                              {student.isLocked && (
                                <Badge variant="outline" className="text-red-600 border-red-200">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Låst
                                </Badge>
                              )}
                              {student.currentActivity && (
                                <Badge variant="outline" className="text-blue-600 border-blue-200">
                                  {student.currentActivity}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">
                              Aktiv: {student.lastActivity ? 
                                new Date(student.lastActivity).toLocaleTimeString('sv-SE', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                }) : 'Okänd'
                              }
                            </span>
                            <div className="flex space-x-1">
                              {student.isLocked ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => unlockStudentScreens([student.studentId])}
                                  className="text-green-600 border-green-300"
                                >
                                  <Unlock className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => lockStudentScreens([student.studentId], 'Skärmen låst av läraren')}
                                  className="text-red-600 border-red-300"
                                >
                                  <Lock className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedStudents([student.studentId]);
                                  setMessageForm({ ...messageForm, targetSpecific: true });
                                  setShowMessageDialog(true);
                                }}
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
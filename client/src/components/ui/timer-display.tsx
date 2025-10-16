import { useEffect, useState } from "react";

interface TimerDisplayProps {
  timeElapsed: number;
  isRunning: boolean;
  className?: string;
}

export default function TimerDisplay({ timeElapsed, isRunning, className = "" }: TimerDisplayProps) {
  const [displayTime, setDisplayTime] = useState(timeElapsed);

  useEffect(() => {
    setDisplayTime(timeElapsed);
  }, [timeElapsed]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl ${
        isRunning ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
      }`}>
        <i className={`fas fa-clock ${isRunning ? 'animate-pulse' : ''}`}></i>
        <span className="font-mono text-lg font-bold" data-testid="timer-display">
          {formatTime(displayTime)}
        </span>
      </div>
      {isRunning && (
        <div className="flex items-center text-orange-600">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
          <span className="ml-2 text-sm">Pågår</span>
        </div>
      )}
    </div>
  );
}
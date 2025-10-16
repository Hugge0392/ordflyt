import { HelpCircle, Info, AlertCircle, Lightbulb } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
  /** The help content to display */
  content: string;
  /** Type of help tooltip affecting styling and icon */
  type?: 'info' | 'help' | 'warning' | 'tip';
  /** Whether this is for children (simpler language and colorful styling) */
  forChildren?: boolean;
  /** Custom trigger element - if not provided, uses default help icon */
  trigger?: React.ReactNode;
  /** Position of the tooltip */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Additional CSS classes for the trigger */
  className?: string;
  /** Test ID for the tooltip trigger */
  testId?: string;
  /** Whether to show as inline text instead of icon */
  asText?: boolean;
}

export function HelpTooltip({
  content,
  type = 'help',
  forChildren = false,
  trigger,
  side = 'top',
  className,
  testId,
  asText = false,
}: HelpTooltipProps) {
  const getIcon = () => {
    const iconClass = forChildren 
      ? "h-4 w-4" 
      : "h-3.5 w-3.5";
    
    switch (type) {
      case 'info':
        return <Info className={iconClass} />;
      case 'warning':
        return <AlertCircle className={iconClass} />;
      case 'tip':
        return <Lightbulb className={iconClass} />;
      default:
        return <HelpCircle className={iconClass} />;
    }
  };

  const getColors = () => {
    if (forChildren) {
      switch (type) {
        case 'info':
          return "text-blue-500 hover:text-blue-600";
        case 'warning':
          return "text-orange-500 hover:text-orange-600";
        case 'tip':
          return "text-yellow-500 hover:text-yellow-600";
        default:
          return "text-purple-500 hover:text-purple-600";
      }
    } else {
      switch (type) {
        case 'info':
          return "text-blue-500 hover:text-blue-600";
        case 'warning':
          return "text-orange-500 hover:text-orange-600";
        case 'tip':
          return "text-yellow-500 hover:text-yellow-600";
        default:
          return "text-muted-foreground hover:text-foreground";
      }
    }
  };

  const getTooltipStyle = () => {
    if (forChildren) {
      switch (type) {
        case 'info':
          return "bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-100";
        case 'warning':
          return "bg-orange-50 dark:bg-orange-900 border-orange-200 dark:border-orange-700 text-orange-900 dark:text-orange-100";
        case 'tip':
          return "bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100";
        default:
          return "bg-purple-50 dark:bg-purple-900 border-purple-200 dark:border-purple-700 text-purple-900 dark:text-purple-100";
      }
    }
    return "";
  };

  const defaultTrigger = asText ? (
    <Button
      variant="link"
      size="sm"
      className={cn(
        "h-auto p-0 text-xs underline",
        getColors(),
        className
      )}
      data-testid={testId}
    >
      {forChildren ? "Vad betyder detta?" : "Hjälp"}
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-6 w-6 p-0 rounded-full",
        getColors(),
        className
      )}
      data-testid={testId}
    >
      {getIcon()}
    </Button>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {trigger || defaultTrigger}
        </TooltipTrigger>
        <TooltipContent 
          side={side}
          className={cn(
            "max-w-xs text-sm",
            forChildren && "text-xs leading-relaxed p-3",
            getTooltipStyle()
          )}
          data-testid={testId ? `${testId}-content` : undefined}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Specialized components for common use cases
export function InfoTooltip(props: Omit<HelpTooltipProps, 'type'>) {
  return <HelpTooltip {...props} type="info" />;
}

export function WarningTooltip(props: Omit<HelpTooltipProps, 'type'>) {
  return <HelpTooltip {...props} type="warning" />;
}

export function TipTooltip(props: Omit<HelpTooltipProps, 'type'>) {
  return <HelpTooltip {...props} type="tip" />;
}

// Component specifically for children with simpler interface
export function KidsHelpTooltip({
  content,
  type = 'help',
  className,
  testId,
}: {
  content: string;
  type?: 'help' | 'tip' | 'info';
  className?: string;
  testId?: string;
}) {
  const emojis = {
    help: "🤔",
    tip: "💡",
    info: "ℹ️",
  };

  return (
    <HelpTooltip
      content={content}
      type={type}
      forChildren={true}
      className={className}
      testId={testId}
      trigger={
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 rounded-full text-lg hover:scale-110 transition-transform",
            "bg-gradient-to-br from-blue-100 to-purple-100 hover:from-blue-200 hover:to-purple-200",
            "dark:from-blue-900 dark:to-purple-900 dark:hover:from-blue-800 dark:hover:to-purple-800",
            className
          )}
          data-testid={testId}
        >
          {emojis[type]}
        </Button>
      }
    />
  );
}
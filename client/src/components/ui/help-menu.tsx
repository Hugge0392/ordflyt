import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { 
  HelpCircle, 
  BookOpen, 
  Lightbulb, 
  RefreshCw, 
  Sparkles,
  LifeBuoy
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpMenuProps {
  /** Available guides for this page/role */
  availableGuides?: Array<{
    id: string;
    title: string;
    description?: string;
    icon?: React.ReactNode;
  }>;
  /** User role for guide scoping */
  userRole?: string;
  /** User ID for guide scoping */
  userId?: string;
  /** Whether this is for children (affects styling) */
  forChildren?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID */
  testId?: string;
}

export function HelpMenu({
  availableGuides = [],
  userRole,
  userId,
  forChildren = false,
  className,
  testId = 'help-menu',
}: HelpMenuProps) {
  const { toast } = useToast();

  const showGuide = (guideId: string, title: string) => {
    const globalFn = (window as any)[`showGuide_${guideId}_${userRole || 'default'}_${userId || 'default'}`];
    
    if (globalFn) {
      globalFn();
      toast({
        title: forChildren ? '🎯 Guide öppnad!' : 'Guide öppnad',
        description: forChildren 
          ? `Nu visas guiden "${title}" igen. Följ stegen för att lära dig!` 
          : `Visar guiden: ${title}`,
      });
    } else {
      toast({
        title: 'Kunde inte öppna guide',
        description: `Guiden "${title}" är inte tillgänglig just nu.`,
        variant: 'destructive',
      });
    }
  };

  if (availableGuides.length === 0) {
    return null;
  }

  const buttonStyle = forChildren 
    ? "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
    : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={forChildren ? "default" : "ghost"}
          size="sm"
          className={cn(
            "flex items-center gap-2",
            buttonStyle,
            className
          )}
          data-testid={`${testId}-trigger`}
        >
          {forChildren ? (
            <>
              <Lightbulb className="h-4 w-4" />
              Hjälp
            </>
          ) : (
            <>
              <HelpCircle className="h-4 w-4" />
              Hjälp & Guider
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className={cn(
          "w-56",
          forChildren && "border-blue-200 dark:border-blue-700"
        )}
        data-testid={`${testId}-content`}
      >
        <DropdownMenuLabel className={forChildren ? "text-blue-900 dark:text-blue-100" : undefined}>
          {forChildren ? '🎯 Få hjälp' : 'Tillgänglig hjälp'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {availableGuides.map((guide) => (
          <DropdownMenuItem
            key={guide.id}
            onClick={() => showGuide(guide.id, guide.title)}
            className={cn(
              "flex items-center gap-3 cursor-pointer",
              forChildren && "hover:bg-blue-50 dark:hover:bg-blue-900/20"
            )}
            data-testid={`${testId}-guide-${guide.id}`}
          >
            <div className="flex-shrink-0">
              {guide.icon || <BookOpen className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{guide.title}</div>
              {guide.description && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {guide.description}
                </div>
              )}
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className={cn(
            "text-muted-foreground",
            forChildren && "hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
          data-testid={`${testId}-support`}
        >
          <LifeBuoy className="h-4 w-4 mr-2" />
          {forChildren ? 'Fråga din lärare' : 'Kontakta support'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Quick helper for common guide configurations
export const commonGuides = {
  admin: [
    {
      id: 'admin-welcome',
      title: 'Admin välkomstguide',
      description: 'Grundläggande administration',
      icon: <Sparkles className="h-4 w-4" />,
    },
  ],
  teacher: [
    {
      id: 'teacher-welcome',
      title: 'Lärare välkomstguide',
      description: 'Komma igång som lärare',
      icon: <BookOpen className="h-4 w-4" />,
    },
  ],
  student: [
    {
      id: 'student-welcome',
      title: 'Välkommen till KlassKamp!',
      description: 'Lär dig använda plattformen',
      icon: <Sparkles className="h-4 w-4" />,
    },
  ],
};
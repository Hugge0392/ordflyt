import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeGuideProps {
  /** Unique identifier for this guide (used for localStorage) */
  guideId: string;
  /** User role for scoped storage (admin, teacher, student) */
  userRole?: string;
  /** User ID for scoped storage */
  userId?: string;
  /** Title of the welcome guide */
  title: string;
  /** Description text for the guide */
  description?: string;
  /** Badge text to show guide type */
  badge?: string;
  /** Steps to show in the guide */
  steps?: Array<{
    icon?: React.ReactNode;
    title: string;
    description: string;
  }>;
  /** Whether to show as alert instead of card */
  variant?: 'card' | 'alert';
  /** Whether this is for children (changes styling and language) */
  forChildren?: boolean;
  /** Custom icon for the guide header */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show automatically or require manual trigger */
  autoShow?: boolean;
  /** Callback when guide is dismissed */
  onDismiss?: () => void;
  /** Callback when guide is completed */
  onComplete?: () => void;
}

export function WelcomeGuide({
  guideId,
  title,
  description,
  badge,
  steps = [],
  variant = 'card',
  forChildren = false,
  icon = <Sparkles className="h-5 w-5" />,
  className,
  autoShow = true,
  onDismiss,
  onComplete,
  userRole,
  userId,
}: WelcomeGuideProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Create scoped storage key with role and user ID for shared device support
  const storageKey = `welcome-guide-${guideId}${userRole ? `-${userRole}` : ''}${userId ? `-${userId}` : ''}`;

  useEffect(() => {
    if (autoShow) {
      const hasSeenGuide = localStorage.getItem(storageKey);
      if (!hasSeenGuide) {
        setIsVisible(true);
      }
    }
  }, [autoShow, storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'dismissed');
    setIsVisible(false);
    onDismiss?.();
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'completed');
    setIsVisible(false);
    onComplete?.();
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const showGuide = () => {
    setIsVisible(true);
    setCurrentStep(0);
  };

  // Reset guide (useful for development/testing)
  const resetGuide = () => {
    localStorage.removeItem(storageKey);
    setCurrentStep(0);
    setIsVisible(true);
  };

  // Expose function to manually show guide (for help buttons)
  const showGuideAgain = () => {
    setCurrentStep(0);
    setIsVisible(true);
  };

  // Expose showGuideAgain function globally for help menu access
  useEffect(() => {
    (window as any)[`showGuide_${guideId}_${userRole || 'default'}_${userId || 'default'}`] = showGuideAgain;
    return () => {
      delete (window as any)[`showGuide_${guideId}_${userRole || 'default'}_${userId || 'default'}`];
    };
  }, [guideId, userRole, userId]);

  if (!isVisible) {
    return null;
  }

  const childrenStyle = forChildren ? {
    header: "bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900",
    border: "border-blue-200 dark:border-blue-700",
    button: "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white",
  } : {};

  const content = (
    <div className="space-y-4">
      {/* Header */}
      <div className={cn(
        "flex items-start justify-between gap-3",
        forChildren && "p-3 rounded-lg",
        childrenStyle.header
      )}>
        <div className="flex items-start gap-3 flex-1">
          {icon && (
            <div className={cn(
              "flex-shrink-0 mt-0.5",
              forChildren ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
            )}>
              {icon}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn(
                "font-semibold",
                forChildren ? "text-lg text-blue-900 dark:text-blue-100" : "text-base"
              )} data-testid={`welcome-guide-title-${guideId}`}>
                {title}
              </h3>
              {badge && (
                <Badge variant="secondary" className="text-xs" data-testid={`welcome-guide-badge-${guideId}`}>
                  {badge}
                </Badge>
              )}
            </div>
            {description && (
              <p className={cn(
                "text-sm leading-relaxed",
                forChildren ? "text-blue-800 dark:text-blue-200" : "text-muted-foreground"
              )} data-testid={`welcome-guide-description-${guideId}`}>
                {description}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="flex-shrink-0 h-8 w-8 p-0"
          data-testid={`welcome-guide-close-${guideId}`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Steps */}
      {steps.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg transition-all",
                  index === currentStep 
                    ? forChildren 
                      ? "bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700" 
                      : "bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-700"
                    : index < currentStep 
                      ? "bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-700" 
                      : "bg-gray-50 border border-gray-200 dark:bg-gray-900/20 dark:border-gray-700 opacity-60"
                )}
                data-testid={`welcome-guide-step-${guideId}-${index}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {index < currentStep ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : step.icon ? (
                    step.icon
                  ) : (
                    <div className={cn(
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs font-bold",
                      index === currentStep 
                        ? forChildren 
                          ? "border-yellow-400 bg-yellow-100 text-yellow-700" 
                          : "border-blue-400 bg-blue-100 text-blue-700"
                        : "border-gray-300 bg-gray-100 text-gray-500"
                    )}>
                      {index + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={cn(
                    "font-medium text-sm mb-1",
                    index === currentStep 
                      ? forChildren ? "text-yellow-900 dark:text-yellow-100" : "text-blue-900 dark:text-blue-100"
                      : index < currentStep 
                        ? "text-green-900 dark:text-green-100" 
                        : "text-gray-600 dark:text-gray-400"
                  )}>
                    {step.title}
                  </h4>
                  <p className={cn(
                    "text-xs leading-relaxed",
                    index === currentStep 
                      ? forChildren ? "text-yellow-800 dark:text-yellow-200" : "text-blue-800 dark:text-blue-200"
                      : index < currentStep 
                        ? "text-green-800 dark:text-green-200" 
                        : "text-gray-500 dark:text-gray-500"
                  )}>
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
              Steg {currentStep + 1} av {steps.length}
            </div>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevStep}
                  data-testid={`welcome-guide-prev-${guideId}`}
                >
                  Föregående
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleNextStep}
                className={forChildren ? childrenStyle.button : undefined}
                data-testid={`welcome-guide-next-${guideId}`}
              >
                {currentStep === steps.length - 1 ? (
                  forChildren ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Klar! 🎉
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Slutför
                    </>
                  )
                ) : (
                  <>
                    Nästa
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Single action button if no steps */}
      {steps.length === 0 && (
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={handleComplete}
            className={forChildren ? childrenStyle.button : undefined}
            data-testid={`welcome-guide-complete-${guideId}`}
          >
            {forChildren ? "Okej, jag förstår! 👍" : "Förstått"}
          </Button>
        </div>
      )}
    </div>
  );

  if (variant === 'alert') {
    return (
      <Alert className={cn(className, forChildren && childrenStyle.border)} data-testid={`welcome-guide-${guideId}`}>
        {content}
      </Alert>
    );
  }

  return (
    <Card className={cn(className, forChildren && childrenStyle.border)} data-testid={`welcome-guide-${guideId}`}>
      <CardContent className="p-4">
        {content}
      </CardContent>
    </Card>
  );
}

// Hook for manual guide control
export function useWelcomeGuide(guideId: string, userRole?: string, userId?: string) {
  const [hasSeenGuide, setHasSeenGuide] = useState(false);
  const storageKey = `welcome-guide-${guideId}${userRole ? `-${userRole}` : ''}${userId ? `-${userId}` : ''}`;

  useEffect(() => {
    const status = localStorage.getItem(storageKey);
    setHasSeenGuide(!!status);
  }, [storageKey]);

  const showGuide = () => {
    localStorage.removeItem(storageKey);
    setHasSeenGuide(false);
    // Trigger global function if available
    const globalFn = (window as any)[`showGuide_${guideId}_${userRole || 'default'}_${userId || 'default'}`];
    if (globalFn) {
      globalFn();
    }
  };

  const hideGuide = () => {
    localStorage.setItem(storageKey, 'dismissed');
    setHasSeenGuide(true);
  };

  const resetGuide = () => {
    localStorage.removeItem(storageKey);
    setHasSeenGuide(false);
  };

  return {
    hasSeenGuide,
    showGuide,
    hideGuide,
    resetGuide,
  };
}
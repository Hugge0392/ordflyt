import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Custom hook that listens for preview mutation blocked events
 * and shows appropriate toast notifications
 */
export function usePreviewToastListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePreviewMutationBlocked = (event: CustomEvent) => {
      const { title, message, variant } = event.detail;
      toast({
        title,
        description: message,
        variant: variant || 'destructive',
      });
    };

    // Listen for preview mutation blocked events
    window.addEventListener('previewMutationBlocked', handlePreviewMutationBlocked as EventListener);

    return () => {
      window.removeEventListener('previewMutationBlocked', handlePreviewMutationBlocked as EventListener);
    };
  }, [toast]);
}
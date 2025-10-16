import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Student {
  id: string;
  username: string;
  studentName: string;
  classId: string;
  className: string;
}

interface PreviewContextType {
  isPreviewMode: boolean;
  previewStudent: Student | null;
  setPreviewMode: (enabled: boolean, student?: Student) => void;
  exitPreviewMode: () => void;
}

const PreviewContext = createContext<PreviewContextType | undefined>(undefined);

interface PreviewProviderProps {
  children: ReactNode;
}

export function PreviewProvider({ children }: PreviewProviderProps) {
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Helper function to check if user has required role
  const hasRequiredRole = useCallback(() => {
    return isAuthenticated && user && (user.role === 'LARARE' || user.role === 'ADMIN');
  }, [isAuthenticated, user]);

  // Helper function to clear preview mode and cleanup storage
  const clearPreviewMode = useCallback(() => {
    setIsPreviewMode(false);
    setPreviewStudent(null);
    sessionStorage.removeItem('previewMode');
    sessionStorage.removeItem('previewStudent');
    
    // Remove CSS class from document element
    document.documentElement.classList.remove('preview-mode');
  }, []);

  const setPreviewMode = useCallback((enabled: boolean, student?: Student) => {
    // Security check: only allow TEACHER or ADMIN roles to activate preview mode
    if (enabled && !hasRequiredRole()) {
      toast({
        title: 'Åtkomst nekad',
        description: 'Endast lärare och administratörer kan aktivera elevperspektiv.',
        variant: 'destructive',
      });
      return;
    }

    if (enabled && student) {
      setIsPreviewMode(true);
      setPreviewStudent(student);
      // Store in sessionStorage to persist during navigation
      sessionStorage.setItem('previewMode', 'true');
      sessionStorage.setItem('previewStudent', JSON.stringify(student));
      
      // Add CSS class to document element for styling
      document.documentElement.classList.add('preview-mode');
    } else {
      clearPreviewMode();
    }
  }, [hasRequiredRole, clearPreviewMode, toast]);

  const exitPreviewMode = useCallback(() => {
    setPreviewMode(false);
  }, [setPreviewMode]);

  // Monitor auth changes and auto-clear preview mode when user loses required role
  useEffect(() => {
    if (!isLoading && isPreviewMode && !hasRequiredRole()) {
      clearPreviewMode();
      
      if (isAuthenticated) {
        // User is authenticated but doesn't have required role
        toast({
          title: 'Elevperspektiv avbruten',
          description: 'Otillräcklig behörighet för elevperspektiv.',
          variant: 'destructive',
        });
      }
    }
  }, [isLoading, isPreviewMode, hasRequiredRole, clearPreviewMode, isAuthenticated, toast]);

  // Initialize from sessionStorage on mount, but only if user has required role
  useEffect(() => {
    if (isLoading) return; // Wait for auth to load
    
    const storedPreviewMode = sessionStorage.getItem('previewMode');
    const storedStudent = sessionStorage.getItem('previewStudent');
    
    if (storedPreviewMode === 'true' && storedStudent) {
      if (hasRequiredRole()) {
        try {
          const student = JSON.parse(storedStudent) as Student;
          setIsPreviewMode(true);
          setPreviewStudent(student);
          
          // Add CSS class to document element
          document.documentElement.classList.add('preview-mode');
        } catch (error) {
          // Clear invalid data
          clearPreviewMode();
        }
      } else {
        // User doesn't have required role, clear stored preview mode
        clearPreviewMode();
      }
    }
  }, [isLoading, hasRequiredRole, clearPreviewMode]);

  const contextValue: PreviewContextType = {
    isPreviewMode,
    previewStudent,
    setPreviewMode,
    exitPreviewMode,
  };

  return (
    <PreviewContext.Provider value={contextValue}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview() {
  const context = useContext(PreviewContext);
  if (context === undefined) {
    throw new Error('usePreview must be used within a PreviewProvider');
  }
  return context;
}

export default PreviewContext;
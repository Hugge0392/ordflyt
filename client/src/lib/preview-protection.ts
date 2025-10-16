/**
 * Utility functions for protecting mutations in preview mode
 * This module provides hook-free functions that work with sessionStorage directly
 */

/**
 * Interface for preview mode data stored in sessionStorage
 */
interface PreviewModeData {
  isActive: boolean;
  studentName?: string;
  studentId?: string;
}

/**
 * Check if the app is currently in preview mode
 * Uses sessionStorage directly to avoid hook dependencies
 */
export function isInPreviewMode(): boolean {
  try {
    const previewData = sessionStorage.getItem('preview-mode');
    return previewData ? JSON.parse(previewData).isActive : false;
  } catch {
    return false;
  }
}

/**
 * Get the current preview student data
 */
export function getPreviewStudent(): { studentName?: string; studentId?: string } | null {
  try {
    const previewData = sessionStorage.getItem('preview-mode');
    if (previewData) {
      const data: PreviewModeData = JSON.parse(previewData);
      return {
        studentName: data.studentName,
        studentId: data.studentId
      };
    }
  } catch {
    // Ignore JSON parse errors
  }
  return null;
}

/**
 * Guard function to protect mutations during preview mode
 * Call this before any API mutation that affects student data
 * 
 * @param options - Configuration options for the guard
 * @returns true if mutation should be blocked, false if it should proceed
 */
export function guardMutation(options?: {
  action?: string;
  showToast?: boolean;
  customMessage?: string;
  onPreviewBlock?: (message: string) => void;
}): boolean {
  const { 
    action = 'ändring',
    showToast = true,
    customMessage,
    onPreviewBlock
  } = options || {};

  if (isInPreviewMode()) {
    if (showToast || onPreviewBlock) {
      const previewStudent = getPreviewStudent();
      const studentName = previewStudent?.studentName || 'eleven';
      const message = customMessage || 
        `Du är i elevperspektiv som ${studentName}. ${action.charAt(0).toUpperCase() + action.slice(1)} sparas inte.`;
      
      if (onPreviewBlock) {
        onPreviewBlock(message);
      } else {
        // Dispatch a custom event that components can listen to for showing toasts
        window.dispatchEvent(new CustomEvent('previewMutationBlocked', {
          detail: {
            title: 'Elevperspektiv aktivt',
            message,
            variant: 'destructive'
          }
        }));
      }
    }
    return true; // Block the mutation
  }
  
  return false; // Allow the mutation
}

/**
 * Wrapper function for API requests that should be protected in preview mode
 * Use this for student progress, lesson completion, and other student-specific mutations
 */
export async function protectedApiRequest<T>(
  method: 'POST' | 'PATCH' | 'DELETE' | 'PUT',
  url: string,
  data?: any,
  options?: {
    action?: string;
    showToast?: boolean;
    customMessage?: string;
  }
): Promise<T | null> {
  const shouldBlock = guardMutation(options);
  
  if (shouldBlock) {
    return null; // Return null instead of making the request
  }

  // If not blocked, make the actual API request
  // Import dynamically to avoid circular dependencies
  const { apiRequest } = await import('@/lib/queryClient');
  return apiRequest(method, url, data);
}

/**
 * Utility to check if a URL is a student progress endpoint that should be protected
 */
export function isStudentProgressEndpoint(url: string): boolean {
  const protectedPatterns = [
    /^\/api\/student-progress/,
    /^\/api\/lesson-progress/,
    /^\/api\/assignments\/.*\/submit/,
    /^\/api\/reading-progress/,
    /^\/api\/game-progress/,
  ];
  
  return protectedPatterns.some(pattern => pattern.test(url));
}

/**
 * Extended API request wrapper that automatically protects student progress endpoints
 * Can be used as a drop-in replacement for apiRequest in components that might be in preview mode
 */
export async function safeApiRequest<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT',
  url: string,
  data?: any
): Promise<T> {
  // For GET requests or non-student endpoints, use regular apiRequest
  if (method === 'GET' || !isStudentProgressEndpoint(url)) {
    const { apiRequest } = await import('@/lib/queryClient');
    return apiRequest(method, url, data);
  }

  // For student progress endpoints, check preview mode
  if (isInPreviewMode()) {
    const previewStudent = getPreviewStudent();
    const studentName = previewStudent?.studentName || 'eleven';
    
    // Dispatch event for toast notification
    window.dispatchEvent(new CustomEvent('previewMutationBlocked', {
      detail: {
        title: 'Elevperspektiv aktivt',
        message: `Du är i elevperspektiv som ${studentName}. Ändringar sparas inte.`,
        variant: 'destructive'
      }
    }));
    
    // Return a mock successful response for preview mode
    return null as T;
  }

  // If not in preview mode, proceed with regular request
  const { apiRequest } = await import('@/lib/queryClient');
  return apiRequest(method, url, data);
}
import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle 401 Unauthorized - clear auth state and redirect to login
    if (res.status === 401) {
      // Skip redirect if dev bypass is active
      const isDevBypass = !import.meta.env.PROD && localStorage.getItem('devBypass') === 'true';
      if (isDevBypass) {
        console.log('Dev bypass active, skipping 401 redirect');
        // Still throw error but don't redirect
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }

      // Clear stored CSRF token
      localStorage.removeItem('csrfToken');

      // Clear any cached auth state in query client
      queryClient.setQueryData(["/api/auth/me"], null);

      // Redirect to login page if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Function to refresh CSRF token from /api/auth/me
export async function refreshCsrfToken(): Promise<string | null> {
  try {
    // Check for dev bypass mode
    const isDevBypass = !import.meta.env.PROD && localStorage.getItem('devBypass') === 'true';
    if (isDevBypass) {
      console.log('[refreshCsrfToken] Dev bypass active, using mock CSRF token');
      const mockToken = 'dev-csrf-token';
      localStorage.setItem('csrfToken', mockToken);
      return mockToken;
    }

    console.log('[refreshCsrfToken] Fetching CSRF token from /api/auth/me...');
    const res = await fetch('/api/auth/me', {
      credentials: "include",
    });

    if (!res.ok) {
      console.warn('[refreshCsrfToken] Failed to refresh CSRF token:', res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    console.log('[refreshCsrfToken] Response data keys:', Object.keys(data));

    if (data.csrfToken) {
      // Update localStorage with the new token
      localStorage.setItem('csrfToken', data.csrfToken);
      console.log('[refreshCsrfToken] CSRF token refreshed successfully:', data.csrfToken.substring(0, 8) + '...');
      return data.csrfToken;
    } else {
      console.warn('[refreshCsrfToken] No csrfToken in response data');
    }

    return null;
  } catch (error) {
    console.error('[refreshCsrfToken] Error refreshing CSRF token:', error);
    return null;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  // Build headers
  const headers: Record<string, string> = {};

  // Add development bypass headers if active
  const isDevBypass = !import.meta.env.PROD && localStorage.getItem('devBypass') === 'true';
  if (isDevBypass) {
    const devRole = localStorage.getItem('devRole');
    headers['X-Dev-Bypass'] = 'true';
    if (devRole) {
      headers['X-Dev-Role'] = devRole;
    }
  }
  
  // Add Content-Type for requests with data
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add CSRF token for mutating operations with automatic refresh
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (mutatingMethods.includes(method.toUpperCase())) {
    console.log(`[apiRequest] Performing ${method} request to ${url}. Refreshing CSRF token...`);
    
    // Always refresh CSRF token before mutating operations to ensure it's valid
    const csrfToken = await refreshCsrfToken();
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
      console.log(`[apiRequest] CSRF token obtained: ${csrfToken.substring(0, 8)}...`);
    } else {
      console.warn(`[apiRequest] Failed to refresh CSRF token, trying stored token...`);
      // Fallback to stored token if refresh fails
      const storedToken = localStorage.getItem('csrfToken');
      if (storedToken) {
        headers["X-CSRF-Token"] = storedToken;
        console.log(`[apiRequest] Using stored CSRF token: ${storedToken.substring(0, 8)}...`);
      } else {
        console.error(`[apiRequest] No CSRF token available - request may fail`);
      }
    }
  }

  console.log(`[apiRequest] Making ${method} request to ${url} with headers:`, Object.keys(headers));

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log(`[apiRequest] Response status: ${res.status}`);

  await throwIfResNotOk(res);
  
  // Handle 204 No Content responses (like DELETE operations)
  if (res.status === 204) {
    return null;
  }
  
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // AGGRESSIVE DEV OVERRIDE - Force test data for development
    const isDevBypass = !import.meta.env.PROD && localStorage.getItem('devBypass') === 'true';
    const devRole = localStorage.getItem('devRole');

    if (isDevBypass && devRole === 'LARARE') {
      const url = queryKey.join("/") as string;

      // Force hardcoded class data for teacher dashboard
      if (url === '/api/license/classes') {
        console.log('🚀 AGGRESSIV DEV OVERRIDE: Forcing test class data!');
        return {
          classes: [
            {
              id: 'c071ce49-ebf1-49ca-a939-833ccb5fb5fd',
              name: 'Test Klass',
              term: 'Dev Term',
              description: 'Development test class',
              createdAt: new Date().toISOString(),
              students: [
                {
                  id: 'a78c06fe-815a-4feb-adeb-1177699f4913',
                  username: 'testelev',
                  studentName: 'Test Elev',
                  classId: 'c071ce49-ebf1-49ca-a939-833ccb5fb5fd',
                  className: 'Test Klass',
                  lastLogin: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  mustChangePassword: false,
                  failedLoginAttempts: 0
                }
              ]
            }
          ]
        };
      }

      // Force dashboard stats
      if (url === '/api/teacher/dashboard-stats') {
        console.log('🚀 AGGRESSIV DEV OVERRIDE: Forcing dashboard stats!');
        return {
          totalStudents: 1,
          totalClasses: 1,
          activeAssignments: 3,
          completedLessons: 12,
          averageProgress: 85,
          totalSchoolHours: 24
        };
      }

      // Force lesson bank data
      if (url === '/api/lesson-categories') {
        console.log('🚀 AGGRESSIV DEV OVERRIDE: Forcing lesson categories!');
        return [
          { id: '1', name: 'reading', displayName: 'Läsförståelse', color: '#3B82F6' },
          { id: '2', name: 'vocabulary', displayName: 'Ordförråd', color: '#10B981' },
          { id: '3', name: 'grammar', displayName: 'Grammatik', color: '#8B5CF6' }
        ];
      }

      if (url === '/api/lesson-templates') {
        console.log('🚀 AGGRESSIV DEV OVERRIDE: Forcing lesson templates!');
        return [
          {
            id: 'reading-1',
            title: 'Den sista matchen',
            description: 'Läsförståelse om fotboll',
            category: 'reading',
            difficulty: 'Medium',
            estimatedTime: 15,
            isPublished: true
          }
        ];
      }

      if (url === '/api/reading-lessons/published') {
        console.log('🚀 AGGRESSIV DEV OVERRIDE: Forcing reading lessons!');
        return [
          {
            id: 'reading-1',
            title: 'Den sista matchen',
            description: 'Läsförståelse om fotboll',
            category: 'reading',
            difficulty: 'Medium',
            estimatedTime: 15,
            isPublished: true,
            content: 'Här är texten om den sista matchen...'
          }
        ];
      }

      if (url === '/api/vocabulary/sets/published') {
        console.log('🚀 AGGRESSIV DEV OVERRIDE: Forcing vocabulary sets!');
        return [
          {
            id: 'vocab-1',
            title: 'Grundläggande ord',
            description: 'Vanliga svenska ord',
            wordCount: 50,
            isPublished: true
          }
        ];
      }

      if (url === '/api/teacher-lesson-customizations') {
        console.log('🚀 AGGRESSIV DEV OVERRIDE: Forcing customizations!');
        return [];
      }
    }

    // Build headers for development bypass
    const headers: Record<string, string> = {};
    if (isDevBypass) {
      headers['X-Dev-Bypass'] = 'true';
      if (devRole) {
        headers['X-Dev-Role'] = devRole;
      }
    }

    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// AGGRESSIVE DEV MODE: Force refresh all data when dev bypass is active
if (!import.meta.env.PROD && localStorage.getItem('devBypass') === 'true') {
  console.log('🚀 AGGRESSIV DEV MODE: Clearing all cache and forcing refresh!');

  // Clear all query cache
  queryClient.clear();

  // Force aggressive refresh settings for dev mode
  queryClient.setDefaultOptions({
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Enable for dev mode
      staleTime: 0, // Make everything stale immediately
      retry: false,
      cacheTime: 0, // Don't cache anything
    },
    mutations: {
      retry: false,
    },
  });
}

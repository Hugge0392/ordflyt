import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Function to refresh CSRF token from /api/auth/me
export async function refreshCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/me', {
      credentials: "include",
    });

    if (!res.ok) {
      console.warn('Failed to refresh CSRF token:', res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    if (data.csrfToken) {
      // Update localStorage with the new token
      localStorage.setItem('csrfToken', data.csrfToken);
      return data.csrfToken;
    }
    
    return null;
  } catch (error) {
    console.warn('Error refreshing CSRF token:', error);
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
  
  // Add Content-Type for requests with data
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add CSRF token for mutating operations with automatic refresh
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (mutatingMethods.includes(method.toUpperCase())) {
    // Always refresh CSRF token before mutating operations to ensure it's valid
    const csrfToken = await refreshCsrfToken();
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    } else {
      // Fallback to stored token if refresh fails
      const storedToken = localStorage.getItem('csrfToken');
      if (storedToken) {
        headers["X-CSRF-Token"] = storedToken;
      }
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

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
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
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

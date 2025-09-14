import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  username: string;
  role: string;
  email?: string;
}

interface TeacherContext {
  schoolId?: string;
  schoolName?: string;
  isTeacher: boolean;
  licenseId?: string;
}

interface School {
  id: string;
  name: string;
  district?: string;
  municipality?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
}

interface AuthData {
  user: User;
  csrfToken?: string;
  teacherContext?: TeacherContext;
  school?: School;
}

export function useAuth() {
  const { data, isLoading, error } = useQuery<AuthData | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include"
        });
        
        if (!response.ok) {
          return null; // Not authenticated
        }
        
        const data = await response.json();
        
        // Store CSRF token if provided
        if (data.csrfToken) {
          localStorage.setItem("csrfToken", data.csrfToken);
        }
        
        return data;
      } catch {
        return null; // Not authenticated
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user: data?.user || null,
    isAuthenticated: !!data?.user,
    isLoading,
    error,
    csrfToken: data?.csrfToken || localStorage.getItem("csrfToken"),
    teacherContext: data?.teacherContext || null,
    school: data?.school || null,
    isTeacher: data?.teacherContext?.isTeacher || false,
    hasSchoolAccess: !!(data?.teacherContext?.schoolId && data?.school)
  };
}

export function useRequireAuth(redirectTo = "/login") {
  const auth = useAuth();
  
  return {
    ...auth,
    requireAuth: () => {
      if (!auth.isAuthenticated && !auth.isLoading) {
        window.location.href = redirectTo;
        return false;
      }
      return true;
    }
  };
}

export function useHasRole(...allowedRoles: string[]) {
  const { user, isAuthenticated } = useAuth();
  
  return {
    hasRole: isAuthenticated && user && allowedRoles.includes(user.role),
    isAuthenticated,
    user
  };
}
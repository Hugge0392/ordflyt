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
  // Check for dev bypass mode BEFORE running the query
  const isDevBypass = import.meta.env.DEV && localStorage.getItem('devBypass') === 'true';
  const devRole = isDevBypass ? localStorage.getItem('devRole') : null;

  // Create mock data based on dev role
  let devMockData: AuthData | null = null;
  if (isDevBypass && devRole) {
    if (devRole === 'LARARE') {
      devMockData = {
        user: {
          id: 'dev-teacher-id',
          username: 'dev.teacher',
          role: 'LARARE',
          email: 'teacher@dev.test'
        },
        csrfToken: 'dev-csrf-token',
        teacherContext: {
          schoolId: 'dev-school-id',
          schoolName: 'Dev Test School',
          isTeacher: true,
          licenseId: 'dev-license-id'
        },
        school: {
          id: 'dev-school-id',
          name: 'Dev Test School',
          district: 'Dev District',
          municipality: 'Dev Municipality',
          address: 'Dev Street 123',
          contactEmail: 'school@dev.test',
          contactPhone: '123-456789',
          isActive: true
        }
      };
    } else if (devRole === 'ADMIN') {
      devMockData = {
        user: {
          id: 'dev-admin-id',
          username: 'dev.admin',
          role: 'ADMIN',
          email: 'admin@dev.test'
        },
        csrfToken: 'dev-csrf-token',
        teacherContext: {
          isTeacher: false
        }
      };
    } else if (devRole === 'ELEV') {
      devMockData = {
        user: {
          id: 'dev-student-id',
          username: 'dev.student',
          role: 'ELEV',
          email: 'student@dev.test'
        },
        csrfToken: 'dev-csrf-token'
      };
    }
  }

  const { data, isLoading, error } = useQuery<AuthData | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      // If dev bypass is active, return mock data immediately
      if (devMockData) {
        console.log('Dev bypass active, using mock auth for role:', devRole);
        return devMockData;
      }

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
    staleTime: 30 * 60 * 1000, // 30 minutes - matches backend session duration
    gcTime: 60 * 60 * 1000, // 1 hour - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on every window focus
    refetchOnMount: false, // Only refetch if data is stale
    // If we have dev mock data, mark as not loading
    enabled: !isDevBypass || !!devMockData,
    initialData: devMockData || undefined
  });

  // If dev bypass is active and we have mock data, override loading state
  const finalIsLoading = isDevBypass && devMockData ? false : isLoading;
  const finalData = isDevBypass && devMockData ? devMockData : data;

  return {
    user: finalData?.user || null,
    isAuthenticated: !!finalData?.user,
    isLoading: finalIsLoading,
    error: isDevBypass ? null : error,
    csrfToken: finalData?.csrfToken || localStorage.getItem("csrfToken"),
    teacherContext: finalData?.teacherContext || null,
    school: finalData?.school || null,
    isTeacher: finalData?.teacherContext?.isTeacher || false,
    hasSchoolAccess: !!(finalData?.teacherContext?.schoolId && finalData?.school)
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
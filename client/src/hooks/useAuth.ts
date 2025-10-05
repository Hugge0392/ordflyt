import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  username: string;
  role: string;
  email?: string;
  studentName?: string;
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
          id: '550e8400-e29b-41d4-a716-446655440002', // Real teacher ID from database who has Test Klass
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
          id: 'a78c06fe-815a-4feb-adeb-1177699f4913', // Real student ID from database
          username: 'testelev',
          role: 'ELEV',
          email: 'testelev@dev.test'
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
        // First try regular user auth
        const response = await fetch("/api/auth/me", {
          credentials: "include"
        });

        if (response.ok) {
          const data = await response.json();

          // Store CSRF token if provided
          if (data.csrfToken) {
            localStorage.setItem("csrfToken", data.csrfToken);
          }

          return data;
        }

        // Only try student auth if we're on a student route or have a student session cookie
        const isStudentRoute = window.location.pathname.startsWith('/elev');
        const hasStudentCookie = document.cookie.includes('studentSessionToken');

        if (isStudentRoute || hasStudentCookie) {
          const studentResponse = await fetch("/api/student/me", {
            credentials: "include"
          });

          if (studentResponse.ok) {
            const studentData = await studentResponse.json();

            // Transform student data to match AuthData format
            return {
              user: {
                id: studentData.student.id,
                username: studentData.student.username,
                role: 'ELEV',
                studentName: studentData.student.studentName,
              },
              csrfToken: undefined // Students don't use CSRF tokens
            };
          }
        }

        return null; // Not authenticated
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
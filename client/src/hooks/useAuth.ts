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
  const { data, isLoading, error } = useQuery<AuthData | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
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

        // Only try student auth if we're on a student route
        const isStudentRoute = window.location.pathname.startsWith('/elev');

        if (isStudentRoute) {
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
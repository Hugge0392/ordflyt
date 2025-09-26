import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // In development mode, bypass authentication completely
  const isDevelopment = !import.meta.env.PROD;

  // Check if we have a dev bypass flag in localStorage
  const devBypass = isDevelopment && localStorage.getItem('devBypass') === 'true';

  useEffect(() => {
    // If dev bypass is enabled, skip authentication
    if (devBypass) {
      console.log('Dev bypass enabled - skipping authentication');
      setIsAuthorized(true);
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        // Check if we need to look for student or regular auth
        const isStudentRoute = window.location.pathname.startsWith('/elev');

        // Try appropriate auth endpoint based on route
        if (isStudentRoute) {
          // For student routes, check student auth first
          const studentResponse = await fetch("/api/student/me", { credentials: "include" });

          if (studentResponse.ok) {
            const studentData = await studentResponse.json();

            // Check role authorization
            if (allowedRoles && allowedRoles.length > 0) {
              if (!allowedRoles.includes("ELEV")) {
                throw new Error("Unauthorized - students not allowed");
              }
            }

            setIsAuthorized(true);
            setIsLoading(false);
            return;
          }
        }

        // Try regular auth (for admin/teacher or as fallback)
        const authResponse = await fetch("/api/auth/me", { credentials: "include" });

        if (authResponse.ok) {
          const data = await authResponse.json();

          // Store CSRF token
          if (data.csrfToken) {
            localStorage.setItem("csrfToken", data.csrfToken);
          }

          // Check role authorization
          if (allowedRoles && allowedRoles.length > 0) {
            if (!allowedRoles.includes(data.user.role)) {
              throw new Error("Unauthorized");
            }
          }

          setIsAuthorized(true);
          setIsLoading(false);
          return;
        }

        // If not a student route but student auth wasn't tried, try it now
        if (!isStudentRoute) {
          const studentResponse = await fetch("/api/student/me", { credentials: "include" });

          if (studentResponse.ok) {
            const studentData = await studentResponse.json();

            // Check if this route allows students
            if (allowedRoles && allowedRoles.length > 0) {
              if (!allowedRoles.includes("ELEV")) {
                throw new Error("Unauthorized - students not allowed");
              }
            }

            setIsAuthorized(true);
            setIsLoading(false);
            return;
          }
        }

        // If all auth methods fail, redirect to login
        throw new Error("Not authenticated");

      } catch (error) {
        console.log("ProtectedRoute: Auth failed:", error);
        setLocation("/login");
      }
    };

    checkAuth();
  }, [setLocation, allowedRoles, devBypass]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Kontrollerar behörighet...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
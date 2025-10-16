import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Skip auth check if still loading
    if (isLoading) {
      return;
    }

    // If not authenticated, redirect to appropriate login page
    if (!isAuthenticated) {
      const isStudentRoute = window.location.pathname.startsWith('/elev');
      const loginPath = isStudentRoute ? '/elev/login' : '/login';
      console.log('ProtectedRoute: Not authenticated, redirecting to', loginPath);
      setLocation(loginPath);
      return;
    }

    // Check role authorization if roles are specified
    if (allowedRoles && allowedRoles.length > 0 && user) {
      if (!allowedRoles.includes(user.role)) {
        console.log('ProtectedRoute: Unauthorized role:', user.role, 'allowed:', allowedRoles);
        setLocation('/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, allowedRoles, setLocation]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Kontrollerar behörighet...</p>
        </div>
      </div>
    );
  }

  // Only render if authenticated and authorized
  if (!isAuthenticated) {
    return null;
  }

  // Check role authorization
  if (allowedRoles && allowedRoles.length > 0 && user) {
    if (!allowedRoles.includes(user.role)) {
      return null;
    }
  }

  return <>{children}</>;
}
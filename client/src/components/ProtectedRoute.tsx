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

  // In development mode, bypass authentication completely
  const isDevelopment = !import.meta.env.PROD;
  const devBypass = isDevelopment && localStorage.getItem('devBypass') === 'true';

  useEffect(() => {
    // Skip auth check if dev bypass is enabled or still loading
    if (devBypass || isLoading) {
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
  }, [isAuthenticated, isLoading, user, allowedRoles, devBypass, setLocation]);

  // Show loading state while checking authentication
  if (isLoading && !devBypass) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Kontrollerar behörighet...</p>
        </div>
      </div>
    );
  }

  // If dev bypass is enabled, always render
  if (devBypass) {
    return <>{children}</>;
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
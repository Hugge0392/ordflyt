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

  useEffect(() => {
    // Check authentication and authorization
    fetch("/api/auth/me")
      .then(res => {
        if (!res.ok) {
          throw new Error("Not authenticated");
        }
        return res.json();
      })
      .then(data => {
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
      })
      .catch(() => {
        setLocation("/login");
      });
  }, [setLocation, allowedRoles]);

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
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, User, GraduationCap, Shield, LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient, useQuery } from '@tanstack/react-query';

export default function DevRoleSwitcher() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [switching, setSwitching] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  // Check for student authentication using standard fetcher
  const { data: student } = useQuery({
    queryKey: ['/api/student/me'],
    retry: false,
    staleTime: 30 * 60 * 1000,
  });
  
  // Determine current auth state (regular user or student)
  const currentUser = user || (student ? { role: 'ELEV', username: student.username } : null);
  const currentlyAuthenticated = isAuthenticated || !!student;

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  const handleRoleSwitch = async (role: 'ADMIN' | 'LARARE' | 'ELEV') => {
    setSwitching(true);
    try {
      const response = await fetch('/api/dev/quick-login', {
        method: 'POST',
        body: JSON.stringify({ role }),
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('DevRoleSwitcher: Quick-login response:', data);
        
        // Store CSRF token if provided
        if (data.csrfToken) {
          localStorage.setItem('csrfToken', data.csrfToken);
        }

        // Invalidate auth cache to force refresh (both regular users and students)
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        queryClient.invalidateQueries({ queryKey: ['/api/student/me'] });
        
        // Navigate to the appropriate page
        console.log('DevRoleSwitcher: Redirecting to:', data.redirectPath);
        
        // Give a small delay to ensure cookies are set before redirect
        setTimeout(() => {
          window.location.href = data.redirectPath;
        }, 100);
      } else {
        console.error('DevRoleSwitcher: Quick-login failed with status:', response.status);
        const errorData = await response.text();
        console.error('DevRoleSwitcher: Error response:', errorData);
      }
    } catch (error) {
      console.error('Role switch failed:', error);
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Clear CSRF token
      localStorage.removeItem('csrfToken');
      
      // Invalidate auth cache
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      // Navigate to home
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return <Shield className="h-3 w-3" />;
      case 'LARARE': return <GraduationCap className="h-3 w-3" />;
      case 'ELEV': return <User className="h-3 w-3" />;
      default: return <User className="h-3 w-3" />;
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Admin';
      case 'LARARE': return 'Lärare';
      case 'ELEV': return 'Elev';
      default: return role;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* DEV Badge */}
      <div className="mb-2 flex justify-end">
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
          DEV MODE
        </Badge>
      </div>

      {/* Role Switcher */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg min-w-[140px]">
        {/* Current User Display / Toggle */}
        <div 
          className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid="dev-role-switcher-toggle"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-600" />
            {currentlyAuthenticated && currentUser ? (
              <div className="flex items-center gap-1">
                {getRoleIcon(currentUser.role)}
                <span className="text-sm font-medium">{getRoleText(currentUser.role)}</span>
              </div>
            ) : (
              <span className="text-sm text-gray-500">Ej inloggad</span>
            )}
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>

        {/* Expanded Options */}
        {isExpanded && (
          <div className="border-t border-gray-200">
            <div className="p-2 space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-8"
                onClick={() => handleRoleSwitch('ADMIN')}
                disabled={switching}
                data-testid="dev-switch-admin"
              >
                <Shield className="h-3 w-3" />
                Admin
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-8"
                onClick={() => handleRoleSwitch('LARARE')}
                disabled={switching}
                data-testid="dev-switch-larare"
              >
                <GraduationCap className="h-3 w-3" />
                Lärare
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-8"
                onClick={() => handleRoleSwitch('ELEV')}
                disabled={switching}
                data-testid="dev-switch-elev"
              >
                <User className="h-3 w-3" />
                Elev
              </Button>

              {currentlyAuthenticated && (
                <>
                  <hr className="my-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleLogout}
                    data-testid="dev-logout"
                  >
                    <LogOut className="h-3 w-3" />
                    Logga ut
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {switching && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-sm text-gray-600">Växlar...</div>
          </div>
        )}
      </div>
    </div>
  );
}
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Home, 
  Store, 
  User, 
  Settings,
  Gem,
  Trophy,
  BookOpen
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { StudentCurrency } from '@shared/schema';

// Mock student data - denna kommer senare från auth context
const mockStudent = {
  id: "student123",
  name: "Anna Andersson",
  level: 3,
};

export default function StudentNavigation() {
  const [location] = useLocation();
  
  // Fetch student currency
  const { data: currency } = useQuery<StudentCurrency>({
    queryKey: [`/api/students/${mockStudent.id}/currency`],
    enabled: true,
  });

  const currentCoins = currency?.currentCoins ?? 0;

  const navItems = [
    {
      href: '/elev',
      icon: Home,
      label: 'Hem',
      description: 'Startsida'
    },
    {
      href: '/elev/butik',
      icon: Store,
      label: 'Butiken',
      description: 'Köp items'
    },
    {
      href: '/elev/avatar',
      icon: User,
      label: 'Avatar',
      description: 'Anpassa'
    },
    {
      href: '/elev/rum',
      icon: Settings,
      label: 'Mitt Rum',
      description: 'Dekorera'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/elev') {
      return location === href;
    }
    return location.startsWith(href);
  };

  return (
    <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Student Info */}
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-lg">
              {mockStudent.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-bold text-gray-800">{mockStudent.name}</h2>
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="text-gray-600">Nivå {mockStudent.level}</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={active ? 'default' : 'ghost'}
                    size="sm"
                    className={`flex flex-col h-auto py-2 px-3 gap-1 ${
                      active 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'hover:bg-blue-100 text-gray-700'
                    }`}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Currency Display */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white rounded-full px-3 py-2 border border-yellow-200">
              <Gem className="h-4 w-4 text-yellow-500" />
              <span className="font-semibold text-gray-800">{currentCoins}</span>
              <span className="text-sm text-gray-600">mynt</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
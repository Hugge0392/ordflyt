import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Eye,
  Share2,
  Download,
  Clock,
  Calendar,
  Users,
  MessageCircle,
} from 'lucide-react';

interface BlogAnalyticsProps {
  viewCount: number;
  shareCount: number;
  downloadCount: number;
  commentCount: number;
  averageTimeOnPage: number; // in seconds
  publishedAt?: string | null;
  lastUpdated?: string;
}

export default function BlogAnalytics({
  viewCount = 0,
  shareCount = 0,
  downloadCount = 0,
  commentCount = 0,
  averageTimeOnPage = 0,
  publishedAt,
  lastUpdated,
}: BlogAnalyticsProps) {
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Ej publicerad';
    return new Date(date).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysSincePublished = () => {
    if (!publishedAt) return 0;
    const published = new Date(publishedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - published.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysSincePublished = getDaysSincePublished();
  const avgViewsPerDay = daysSincePublished > 0 ? (viewCount / daysSincePublished).toFixed(1) : '0';

  const stats = [
    {
      label: 'Totala visningar',
      value: viewCount,
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      badge: daysSincePublished > 0 ? `${avgViewsPerDay}/dag` : null,
    },
    {
      label: 'Delningar',
      value: shareCount,
      icon: Share2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      badge: viewCount > 0 ? `${((shareCount / viewCount) * 100).toFixed(1)}%` : null,
    },
    {
      label: 'Nedladdningar',
      value: downloadCount,
      icon: Download,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      badge: viewCount > 0 ? `${((downloadCount / viewCount) * 100).toFixed(1)}%` : null,
    },
    {
      label: 'Kommentarer',
      value: commentCount,
      icon: MessageCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      badge: null,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-base">
          <TrendingUp className="h-5 w-5 mr-2" />
          Analys & Statistik
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Prestanda och engagemang för detta bloggininlägg
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`p-3 rounded-lg border ${stat.bgColor} border-gray-200`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                  {stat.badge && (
                    <Badge variant="outline" className="text-xs">
                      {stat.badge}
                    </Badge>
                  )}
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 mt-1">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Additional Metrics */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Genomsnittlig lästid</span>
            </div>
            <span className="font-semibold">
              {averageTimeOnPage > 0 ? formatDuration(averageTimeOnPage) : 'Ingen data'}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Publicerad</span>
            </div>
            <span className="font-semibold text-right text-xs">
              {formatDate(publishedAt)}
            </span>
          </div>

          {daysSincePublished > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-4 w-4" />
                <span>Dagar sedan publicering</span>
              </div>
              <span className="font-semibold">{daysSincePublished}</span>
            </div>
          )}
        </div>

        {/* Performance Indicators */}
        {publishedAt && viewCount > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium mb-2">Prestanda</p>
            <div className="space-y-2">
              {viewCount >= 100 && (
                <div className="flex items-center gap-2 text-xs">
                  <Badge className="bg-green-600">🎉 Populärt</Badge>
                  <span className="text-gray-600">Över 100 visningar</span>
                </div>
              )}
              {shareCount / Math.max(viewCount, 1) > 0.05 && (
                <div className="flex items-center gap-2 text-xs">
                  <Badge className="bg-blue-600">📢 Mycket delat</Badge>
                  <span className="text-gray-600">Hög delningsgrad</span>
                </div>
              )}
              {commentCount > 5 && (
                <div className="flex items-center gap-2 text-xs">
                  <Badge className="bg-purple-600">💬 Engagerat</Badge>
                  <span className="text-gray-600">Många kommentarer</span>
                </div>
              )}
              {averageTimeOnPage > 180 && (
                <div className="flex items-center gap-2 text-xs">
                  <Badge className="bg-orange-600">📖 Djup läsning</Badge>
                  <span className="text-gray-600">Lång lästid</span>
                </div>
              )}
            </div>
          </div>
        )}

        {!publishedAt && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <p className="text-sm text-gray-600">
              📊 Statistik kommer visas när inlägget är publicerat
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

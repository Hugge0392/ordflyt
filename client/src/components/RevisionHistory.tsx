import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import {
  History,
  Clock,
  User,
  RotateCcw,
  ChevronRight,
  FileText,
} from 'lucide-react';

interface Revision {
  id: string;
  revisionNumber: number;
  title: string;
  content: any;
  excerpt: string | null;
  authorName: string;
  changeDescription: string | null;
  createdAt: string;
}

interface RevisionHistoryProps {
  postId?: string;
  currentRevision: number;
  onRestore?: (revision: Revision) => void;
}

export default function RevisionHistory({
  postId,
  currentRevision,
  onRestore,
}: RevisionHistoryProps) {
  const [expandedRevision, setExpandedRevision] = useState<string | null>(null);

  const { data: revisions, isLoading } = useQuery<Revision[]>({
    queryKey: [`/api/blog/posts/${postId}/revisions`],
    queryFn: () => apiRequest('GET', `/api/blog/posts/${postId}/revisions`),
    enabled: !!postId,
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m sedan`;
    if (diffHours < 24) return `${diffHours}h sedan`;
    if (diffDays === 1) return 'Igår';
    if (diffDays < 7) return `${diffDays} dagar sedan`;
    return formatDate(date);
  };

  if (!postId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <History className="h-5 w-5 mr-2" />
            Versionshistorik
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Spara inlägget för att se versionshistorik</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center">
            <History className="h-5 w-5 mr-2" />
            Versionshistorik
          </div>
          <Badge variant="outline">
            v{currentRevision}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Automatisk versionshantering av dina ändringar
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Laddar revisioner...
          </div>
        ) : !revisions || revisions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Inga tidigare versioner</p>
            <p className="text-xs mt-1">Versioner skapas automatiskt vid varje spara</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {revisions.map((revision, index) => {
              const isExpanded = expandedRevision === revision.id;
              const isCurrent = revision.revisionNumber === currentRevision;

              return (
                <div
                  key={revision.id}
                  className={`
                    border rounded-lg p-3 transition-all
                    ${isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                  `}
                >
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setExpandedRevision(isExpanded ? null : revision.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={isCurrent ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          v{revision.revisionNumber}
                        </Badge>
                        {isCurrent && (
                          <Badge variant="default" className="text-xs bg-green-600">
                            Aktuell
                          </Badge>
                        )}
                        {index === 0 && !isCurrent && (
                          <Badge variant="outline" className="text-xs">
                            Senaste
                          </Badge>
                        )}
                      </div>

                      <div className="font-medium text-sm truncate">
                        {revision.title}
                      </div>

                      {revision.changeDescription && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {revision.changeDescription}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{revision.authorName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(revision.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight
                      className={`h-4 w-4 text-gray-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {revision.excerpt && (
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">
                            Utdrag:
                          </p>
                          <p className="text-xs text-gray-600 italic">
                            {revision.excerpt}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRestore && onRestore(revision)}
                          disabled={isCurrent}
                          className="text-xs"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Återställ denna version
                        </Button>
                      </div>

                      <div className="text-xs text-gray-500">
                        <p>Fullständig tidsstämpel: {formatDate(revision.createdAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900">
            💡 <strong>Tips:</strong> Revisioner sparas automatiskt varje gång du uppdaterar inlägget. Du kan återställa till vilken tidigare version som helst.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

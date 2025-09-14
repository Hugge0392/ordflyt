import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { 
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Trash2,
  RotateCcw,
  Calendar,
  FileText,
  Users,
  Package,
  BarChart3,
  FileSpreadsheet,
  Database,
  RefreshCw
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ExportJob {
  id: string;
  title: string;
  description?: string;
  exportType: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';
  progress: number;
  processingMessage?: string;
  errorMessage?: string;
  outputPath?: string;
  fileSize?: number;
  downloadCount: number;
  expiresAt: string;
  estimatedRecords?: number;
  actualRecords?: number;
  processingStartedAt?: string;
  processingCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const EXPORT_TYPE_LABELS = {
  student_progress_report: 'Elevframstegsrapporter',
  parent_meeting_report: 'Föräldramötesrapporter',
  class_data_backup: 'Klassdatabackup',
  administrative_report: 'Administrativa Rapporter',
  custom_report: 'Anpassad Rapport'
};

const EXPORT_TYPE_ICONS = {
  student_progress_report: Users,
  parent_meeting_report: FileText,
  class_data_backup: Package,
  administrative_report: BarChart3,
  custom_report: Database
};

const STATUS_LABELS = {
  pending: 'Väntar',
  processing: 'Bearbetar',
  completed: 'Klar',
  failed: 'Misslyckad',
  cancelled: 'Avbruten',
  expired: 'Utgången'
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
};

const STATUS_ICONS = {
  pending: Clock,
  processing: Clock,
  completed: CheckCircle2,
  failed: XCircle,
  cancelled: XCircle,
  expired: AlertCircle
};

export default function ExportHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedExport, setSelectedExport] = useState<ExportJob | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch export history
  const { data: exports, isLoading, refetch } = useQuery<ExportJob[]>({
    queryKey: ['/api/exports/history'],
    refetchInterval: 5000, // Auto-refresh every 5 seconds for active exports
  });

  // Download export mutation
  const downloadMutation = useMutation({
    mutationFn: async (exportId: string) => {
      const response = await fetch(`/api/exports/${exportId}/download`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Download failed');
      }
      return response.blob();
    },
    onSuccess: (blob, exportId) => {
      const exportItem = exports?.find(e => e.id === exportId);
      if (!exportItem) return;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportItem.title}.${exportItem.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export nedladdad',
        description: `${exportItem.title} har laddats ner`,
      });

      // Refresh to update download count
      queryClient.invalidateQueries({ queryKey: ['/api/exports/history'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Nedladdning misslyckades',
        description: error.message || 'Kunde inte ladda ner export',
        variant: 'destructive',
      });
    },
  });

  // Delete export mutation
  const deleteMutation = useMutation({
    mutationFn: async (exportId: string) => {
      return apiRequest('DELETE', `/api/exports/${exportId}`, {});
    },
    onSuccess: () => {
      toast({
        title: 'Export borttagen',
        description: 'Exporten har tagits bort',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/exports/history'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Borttagning misslyckades',
        description: error.message || 'Kunde inte ta bort export',
        variant: 'destructive',
      });
    },
  });

  // Retry export mutation
  const retryMutation = useMutation({
    mutationFn: async (exportId: string) => {
      return apiRequest('POST', `/api/exports/${exportId}/retry`, {});
    },
    onSuccess: () => {
      toast({
        title: 'Export startas om',
        description: 'Exporten försöker igen',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/exports/history'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Kunde inte starta om',
        description: error.message || 'Kunde inte starta om export',
        variant: 'destructive',
      });
    },
  });

  // Filter exports based on search and filters
  const filteredExports = exports?.filter(exp => {
    const matchesSearch = exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exp.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exp.status === statusFilter;
    const matchesType = typeFilter === 'all' || exp.exportType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  const handleDownload = async (exportId: string) => {
    await downloadMutation.mutateAsync(exportId);
  };

  const handleDelete = async (exportId: string) => {
    await deleteMutation.mutateAsync(exportId);
  };

  const handleRetry = async (exportId: string) => {
    await retryMutation.mutateAsync(exportId);
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getProcessingTime = (started?: string, completed?: string): string => {
    if (!started) return 'N/A';
    const start = new Date(started);
    const end = completed ? new Date(completed) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSec = Math.round(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHour = Math.round(diffMin / 60);
    return `${diffHour}h`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Laddar exporthistorik...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Exporthistorik
          </CardTitle>
          <CardDescription>
            Hantera och ladda ner dina tidigare exporter
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Sök exporter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-exports"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filtrera status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla statusar</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-type-filter">
                <SelectValue placeholder="Filtrera typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla typer</SelectItem>
                {Object.entries(EXPORT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => refetch()}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export List */}
      <Card>
        <CardContent className="p-0">
          {filteredExports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                  ? 'Inga exporter matchar dina filter'
                  : 'Inga exporter än'
                }
              </p>
              <p className="text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Prova att ändra dina sökkriterier'
                  : 'Starta din första export med snabbexporter eller exportguiden'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titel</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Storlek</TableHead>
                  <TableHead>Skapad</TableHead>
                  <TableHead>Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExports.map((exportItem) => {
                  const TypeIcon = EXPORT_TYPE_ICONS[exportItem.exportType as keyof typeof EXPORT_TYPE_ICONS] || Database;
                  const StatusIcon = STATUS_ICONS[exportItem.status as keyof typeof STATUS_ICONS];
                  const statusColor = STATUS_COLORS[exportItem.status as keyof typeof STATUS_COLORS];
                  
                  return (
                    <TableRow key={exportItem.id} data-testid={`row-export-${exportItem.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium">{exportItem.title}</p>
                            {exportItem.description && (
                              <p className="text-sm text-gray-500 truncate max-w-[200px]">
                                {exportItem.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {EXPORT_TYPE_LABELS[exportItem.exportType as keyof typeof EXPORT_TYPE_LABELS]}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {exportItem.format.toUpperCase()}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4" />
                          <Badge className={`${statusColor} text-xs`}>
                            {STATUS_LABELS[exportItem.status as keyof typeof STATUS_LABELS]}
                          </Badge>
                          {exportItem.status === 'processing' && exportItem.progress > 0 && (
                            <span className="text-xs text-gray-500">
                              {exportItem.progress}%
                            </span>
                          )}
                        </div>
                        {exportItem.status === 'failed' && exportItem.errorMessage && (
                          <p className="text-xs text-red-600 mt-1">
                            {exportItem.errorMessage}
                          </p>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {formatFileSize(exportItem.fileSize)}
                          {exportItem.actualRecords && (
                            <p className="text-xs text-gray-500">
                              {exportItem.actualRecords} poster
                            </p>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(exportItem.createdAt), 'MMM d, HH:mm', { locale: sv })}
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(exportItem.createdAt), { locale: sv, addSuffix: true })}
                          </p>
                          {exportItem.status === 'completed' && (
                            <p className="text-xs text-gray-500">
                              Bearbetningstid: {getProcessingTime(exportItem.processingStartedAt, exportItem.processingCompletedAt)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-actions-${exportItem.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setSelectedExport(exportItem)}
                              data-testid={`action-view-${exportItem.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Visa detaljer
                            </DropdownMenuItem>
                            
                            {exportItem.status === 'completed' && exportItem.outputPath && (
                              <DropdownMenuItem
                                onClick={() => handleDownload(exportItem.id)}
                                disabled={downloadMutation.isPending}
                                data-testid={`action-download-${exportItem.id}`}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Ladda ner ({exportItem.downloadCount})
                              </DropdownMenuItem>
                            )}
                            
                            {exportItem.status === 'failed' && (
                              <DropdownMenuItem
                                onClick={() => handleRetry(exportItem.id)}
                                disabled={retryMutation.isPending}
                                data-testid={`action-retry-${exportItem.id}`}
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Försök igen
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-red-600"
                                  data-testid={`action-delete-${exportItem.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Ta bort
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Ta bort export</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Är du säker på att du vill ta bort "{exportItem.title}"? 
                                    Detta går inte att ångra.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(exportItem.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Ta bort
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Export Details Dialog */}
      {selectedExport && (
        <Dialog open={!!selectedExport} onOpenChange={() => setSelectedExport(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Exportdetaljer
              </DialogTitle>
              <DialogDescription>
                {selectedExport.title}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Typ:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {EXPORT_TYPE_LABELS[selectedExport.exportType as keyof typeof EXPORT_TYPE_LABELS]}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium">Format:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedExport.format.toUpperCase()}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium">Status:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={STATUS_COLORS[selectedExport.status as keyof typeof STATUS_COLORS]}>
                      {STATUS_LABELS[selectedExport.status as keyof typeof STATUS_LABELS]}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">Filstorlek:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatFileSize(selectedExport.fileSize)}
                  </p>
                </div>
              </div>

              {selectedExport.description && (
                <div>
                  <span className="text-sm font-medium">Beskrivning:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedExport.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Skapad:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(selectedExport.createdAt), 'PPP HH:mm', { locale: sv })}
                  </p>
                </div>
                {selectedExport.status === 'completed' && selectedExport.processingCompletedAt && (
                  <div>
                    <span className="text-sm font-medium">Slutförd:</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(selectedExport.processingCompletedAt), 'PPP HH:mm', { locale: sv })}
                    </p>
                  </div>
                )}
              </div>

              {selectedExport.status === 'completed' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Nedladdningar:</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedExport.downloadCount} gånger
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Förfaller:</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(selectedExport.expiresAt), 'PPP', { locale: sv })}
                    </p>
                  </div>
                </div>
              )}

              {selectedExport.actualRecords && (
                <div>
                  <span className="text-sm font-medium">Antal poster:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedExport.actualRecords} {selectedExport.estimatedRecords && selectedExport.estimatedRecords !== selectedExport.actualRecords && 
                      `(beräknat: ${selectedExport.estimatedRecords})`
                    }
                  </p>
                </div>
              )}

              {selectedExport.status === 'failed' && selectedExport.errorMessage && (
                <div>
                  <span className="text-sm font-medium text-red-600">Felmeddelande:</span>
                  <p className="text-sm text-red-600 mt-1 p-2 bg-red-50 rounded dark:bg-red-900/20">
                    {selectedExport.errorMessage}
                  </p>
                </div>
              )}

              {selectedExport.status === 'processing' && selectedExport.processingMessage && (
                <div>
                  <span className="text-sm font-medium">Pågående bearbetning:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedExport.processingMessage}
                  </p>
                  {selectedExport.progress > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Framsteg</span>
                        <span>{selectedExport.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${selectedExport.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setSelectedExport(null)}>
                Stäng
              </Button>
              {selectedExport.status === 'completed' && selectedExport.outputPath && (
                <Button 
                  onClick={() => handleDownload(selectedExport.id)}
                  disabled={downloadMutation.isPending}
                  data-testid="button-download-detail"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Ladda ner
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
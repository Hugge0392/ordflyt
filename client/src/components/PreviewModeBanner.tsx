import { usePreview } from '@/contexts/PreviewContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Eye, X, AlertTriangle } from 'lucide-react';

export function PreviewModeBanner() {
  const { isPreviewMode, previewStudent, exitPreviewMode } = usePreview();

  if (!isPreviewMode || !previewStudent) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-white/20 rounded-lg px-3 py-2">
              <Eye className="h-5 w-5" />
              <span className="font-medium">ELEVPERSPEKTIV AKTIVT</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-100" />
              <span>Du ser systemet som:</span>
              <span className="font-bold text-white bg-white/20 px-3 py-1 rounded-full">
                {previewStudent.studentName}
              </span>
              <span className="text-orange-100">({previewStudent.className})</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-orange-100 hidden sm:block">
              Framsteg och svar sparas inte
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={exitPreviewMode}
              className="text-white hover:bg-white/20 hover:text-white"
              data-testid="banner-exit-preview"
            >
              <X className="h-4 w-4 mr-1" />
              Avsluta elevperspektiv
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PreviewModeBanner;
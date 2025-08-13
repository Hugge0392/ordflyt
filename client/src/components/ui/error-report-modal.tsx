import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle } from "lucide-react";
import { type Sentence } from "@shared/schema";

interface ErrorReportModalProps {
  sentence: Sentence;
  reportedWord?: string;
  expectedWordClass?: string;
  actualWordClass?: string;
}

export default function ErrorReportModal({ 
  sentence, 
  reportedWord, 
  expectedWordClass, 
  actualWordClass 
}: ErrorReportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reportType, setReportType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [playerEmail, setPlayerEmail] = useState("");
  const { toast } = useToast();

  const reportMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/error-reports", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rapport skickad",
        description: "Tack för din feedback! Vi kommer granska rapporten.",
      });
      setIsOpen(false);
      setReportType("");
      setDescription("");
      setPlayerEmail("");
    },
    onError: () => {
      toast({
        title: "Fel",
        description: "Kunde inte skicka rapporten. Försök igen.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!reportType || !description) {
      toast({
        title: "Fyll i alla fält",
        description: "Välj typ av fel och beskriv problemet.",
        variant: "destructive",
      });
      return;
    }

    reportMutation.mutate({
      sentenceId: sentence.id,
      sentenceText: sentence.content,
      reportType,
      description,
      reportedWord: reportedWord || "",
      expectedWordClass: expectedWordClass || "",
      actualWordClass: actualWordClass || "",
      playerEmail: playerEmail || null,
      status: "pending",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-orange-600 border-orange-300 hover:bg-orange-50"
          data-testid="button-report-error"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Rapportera fel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rapportera fel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="sentence">Mening:</Label>
            <div className="p-2 bg-gray-50 rounded border text-sm" data-testid="text-sentence">
              {sentence.content}
            </div>
          </div>

          {reportedWord && (
            <div>
              <Label>Markerat ord:</Label>
              <div className="p-2 bg-yellow-50 rounded border text-sm font-medium" data-testid="text-reported-word">
                {reportedWord}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="reportType">Typ av fel:</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger data-testid="select-report-type">
                <SelectValue placeholder="Välj typ av fel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wrong_word_class">Fel ordklass</SelectItem>
                <SelectItem value="missing_word">Saknat ord</SelectItem>
                <SelectItem value="spelling_error">Stavfel</SelectItem>
                <SelectItem value="other">Annat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Beskrivning:</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beskriv problemet..."
              className="min-h-[80px]"
              data-testid="textarea-description"
            />
          </div>

          <div>
            <Label htmlFor="email">E-post (valfritt):</Label>
            <Input
              id="email"
              type="email"
              value={playerEmail}
              onChange={(e) => setPlayerEmail(e.target.value)}
              placeholder="din@epost.se"
              data-testid="input-email"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              data-testid="button-cancel"
            >
              Avbryt
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={reportMutation.isPending}
              data-testid="button-submit-report"
            >
              {reportMutation.isPending ? "Skickar..." : "Skicka rapport"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
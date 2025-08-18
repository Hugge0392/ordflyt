import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Sentence, type WordClass, type Word, type ErrorReport } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

interface EditingSentence {
  content: string;
  level: number;
  wordClassType: string;
  words: Word[];
}

interface BulkSentence {
  content: string;
  words: Word[];
}

export default function AdminSentences() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const [editingData, setEditingData] = useState<EditingSentence>({
    content: "",
    level: 1,
    wordClassType: "noun",
    words: []
  });
  const [bulkData, setBulkData] = useState({
    sentences: [] as BulkSentence[],
    level: 1,
    wordClassType: "noun",
  });
  const [bulkText, setBulkText] = useState("");
  const [quickCodeText, setQuickCodeText] = useState("");
  const [bulkMode, setBulkMode] = useState<"manual" | "code">("manual");
  const [filterWordClass, setFilterWordClass] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");

  const { data: sentences = [], isLoading: sentencesLoading } = useQuery<Sentence[]>({
    queryKey: ["/api/admin/sentences"],
  });

  const { data: wordClasses = [] } = useQuery<WordClass[]>({
    queryKey: ["/api/word-classes"],
  });

  const { data: errorReports = [], isLoading: errorReportsLoading } = useQuery<ErrorReport[]>({
    queryKey: ["/api/admin/error-reports"],
  });

  const { data: publishedLessons = [], isLoading: lessonsLoading } = useQuery<any[]>({
    queryKey: ["/api/lessons/published"],
  });

  // Create sentence mutation
  const createSentenceMutation = useMutation({
    mutationFn: async (sentence: Omit<EditingSentence, 'id'>) => {
      const response = await apiRequest("POST", "/api/admin/sentences", sentence);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sentences"] });
      toast({ title: "Framgång", description: "Mening skapad!" });
      setIsCreating(false);
      setEditingData({ content: "", level: 1, wordClassType: "noun", words: [] });
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/accounts">
            <Button variant="outline" size="sm" data-testid="button-back-admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Meningshanterare
            </h1>
            <p className="text-gray-600">Hantera grammatikmeningar och ordklasser</p>
          </div>
        </div>

        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Snabb översikt</CardTitle>
              <CardDescription>Aktuell status för innehållet</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{sentences.length}</div>
                  <div className="text-sm text-gray-600">Meningar totalt</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{wordClasses.length}</div>
                  <div className="text-sm text-gray-600">Ordklasser</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{publishedLessons.length}</div>
                  <div className="text-sm text-gray-600">Publicerade lektioner</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{errorReports.length}</div>
                  <div className="text-sm text-gray-600">Felrapporter</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder for sentence management interface */}
        <Card>
          <CardHeader>
            <CardTitle>Meningshantering</CardTitle>
            <CardDescription>
              Här kommer det detaljerade gränssnittet för att hantera grammatikmeningar. 
              Denna funktionalitet kommer från den ursprungliga admin-sidan och kommer att integreras här.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Denna sida är under utveckling</p>
              <Link href="/admin">
                <Button>Tillbaka till adminpanel</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
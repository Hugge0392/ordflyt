import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Sentence, type WordClass, type Word } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface EditingSentence {
  content: string;
  level: number;
  wordClassType: string;
  difficulty: number;
  words: Word[];
}

interface BulkSentence {
  content: string;
  words: Word[];
}

export default function Admin() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const [editingData, setEditingData] = useState<EditingSentence>({
    content: "",
    level: 1,
    wordClassType: "noun",
    difficulty: 1,
    words: []
  });
  const [bulkData, setBulkData] = useState({
    sentences: [] as BulkSentence[],
    level: 1,
    wordClassType: "noun",
    difficulty: 1,
  });
  const [bulkText, setBulkText] = useState("");
  const [filterWordClass, setFilterWordClass] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");

  const { data: sentences = [], isLoading: sentencesLoading } = useQuery<Sentence[]>({
    queryKey: ["/api/admin/sentences"],
  });

  const { data: wordClasses = [] } = useQuery<WordClass[]>({
    queryKey: ["/api/word-classes"],
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
      resetEditingData();
    },
    onError: () => {
      toast({ title: "Fel", description: "Kunde inte skapa mening", variant: "destructive" });
    }
  });

  // Bulk create sentences mutation
  const bulkCreateMutation = useMutation({
    mutationFn: async (sentences: Omit<EditingSentence, 'id'>[]) => {
      const results = await Promise.all(
        sentences.map(sentence => 
          apiRequest("POST", "/api/admin/sentences", sentence).then(r => r.json())
        )
      );
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sentences"] });
      toast({ title: "Framgång", description: `${results.length} meningar skapade!` });
      setIsBulkCreating(false);
      setBulkText("");
      setBulkData(prev => ({ ...prev, sentences: [] }));
    },
    onError: () => {
      toast({ title: "Fel", description: "Kunde inte skapa meningar", variant: "destructive" });
    }
  });

  // Update sentence mutation
  const updateSentenceMutation = useMutation({
    mutationFn: async ({ id, sentence }: { id: string, sentence: Partial<EditingSentence> }) => {
      const response = await apiRequest("PUT", `/api/admin/sentences/${id}`, sentence);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sentences"] });
      toast({ title: "Framgång", description: "Mening uppdaterad!" });
      setEditingId(null);
      resetEditingData();
    },
    onError: () => {
      toast({ title: "Fel", description: "Kunde inte uppdatera mening", variant: "destructive" });
    }
  });

  // Delete sentence mutation
  const deleteSentenceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/sentences/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sentences"] });
      toast({ title: "Framgång", description: "Mening borttagen!" });
    },
    onError: () => {
      toast({ title: "Fel", description: "Kunde inte ta bort mening", variant: "destructive" });
    }
  });

  const resetEditingData = () => {
    setEditingData({
      content: "",
      level: 1,
      wordClassType: "noun",
      difficulty: 1,
      words: []
    });
  };

  const startEditing = (sentence: Sentence) => {
    setEditingId(sentence.id);
    setEditingData({
      content: sentence.content,
      level: sentence.level,
      wordClassType: sentence.wordClassType || "noun",
      difficulty: sentence.difficulty,
      words: sentence.words
    });
  };

  const startCreating = () => {
    setIsCreating(true);
    resetEditingData();
  };

  const startBulkCreating = () => {
    setIsBulkCreating(true);
    setBulkText("");
    setBulkData(prev => ({ ...prev, sentences: [] }));
  };

  const processBulkText = () => {
    const lines = bulkText.split('\n').filter(line => line.trim() !== '');
    const sentences = lines.map(line => ({
      content: line.trim(),
      words: parseWordsFromContent(line.trim(), bulkData.wordClassType)
    }));
    setBulkData(prev => ({ ...prev, sentences }));
  };

  const updateWordClass = (sentenceIndex: number, wordIndex: number, newWordClass: string) => {
    if (isBulkCreating) {
      setBulkData(prev => ({
        ...prev,
        sentences: prev.sentences.map((sentence, sIdx) => 
          sIdx === sentenceIndex 
            ? {
                ...sentence,
                words: sentence.words.map((word, wIdx) => 
                  wIdx === wordIndex ? { ...word, wordClass: newWordClass } : word
                )
              }
            : sentence
        )
      }));
    } else {
      setEditingData(prev => ({
        ...prev,
        words: prev.words.map((word, wIdx) => 
          wIdx === wordIndex ? { ...word, wordClass: newWordClass } : word
        )
      }));
    }
  };

  const parseWordsFromContent = (content: string, wordClassType: string) => {
    // Enhanced parsing with better Swedish word recognition
    const commonWords: Record<string, string> = {
      // Pronomen
      'jag': 'pronoun', 'du': 'pronoun', 'han': 'pronoun', 'hon': 'pronoun', 'det': 'pronoun', 'den': 'pronoun',
      'vi': 'pronoun', 'ni': 'pronoun', 'de': 'pronoun', 'dem': 'pronoun', 'denna': 'pronoun', 'detta': 'pronoun',
      'min': 'pronoun', 'mitt': 'pronoun', 'mina': 'pronoun', 'din': 'pronoun', 'ditt': 'pronoun', 'dina': 'pronoun',
      'sin': 'pronoun', 'sitt': 'pronoun', 'sina': 'pronoun', 'vår': 'pronoun', 'vårt': 'pronoun', 'våra': 'pronoun',
      'er': 'pronoun', 'ert': 'pronoun', 'era': 'pronoun', 'deras': 'pronoun',
      
      // Verb (omfattande lista med böjningar)
      // Vanliga hjälpverb
      'är': 'verb', 'var': 'verb', 'varit': 'verb', 'vare': 'verb', 'bli': 'verb', 'blir': 'verb', 'blev': 'verb', 'blivit': 'verb',
      'ha': 'verb', 'har': 'verb', 'hade': 'verb', 'haft': 'verb', 'have': 'verb',
      
      // Modalverb
      'kan': 'verb', 'kunde': 'verb', 'kunnat': 'verb', 'vill': 'verb', 'ville': 'verb', 'velat': 'verb',
      'ska': 'verb', 'skulle': 'verb', 'skolat': 'verb', 'må': 'verb', 'måste': 'verb', 'bör': 'verb', 'borde': 'verb',
      
      // Rörelse och position
      'går': 'verb', 'gick': 'verb', 'gått': 'verb', 'gå': 'verb', 'kommer': 'verb', 'kom': 'verb', 'kommit': 'verb', 'komma': 'verb',
      'springer': 'verb', 'sprang': 'verb', 'sprungit': 'verb', 'springa': 'verb', 'hoppar': 'verb', 'hoppade': 'verb', 'hoppat': 'verb', 'hoppa': 'verb',
      'cyklar': 'verb', 'cyklade': 'verb', 'cyklat': 'verb', 'cykla': 'verb', 'kör': 'verb', 'körde': 'verb', 'kört': 'verb', 'köra': 'verb',
      'åker': 'verb', 'åkte': 'verb', 'åkt': 'verb', 'åka': 'verb', 'flyger': 'verb', 'flög': 'verb', 'flugit': 'verb', 'flyga': 'verb',
      'står': 'verb', 'stod': 'verb', 'stått': 'verb', 'stå': 'verb', 'sitter': 'verb', 'satt': 'verb', 'sitta': 'verb',
      'ligger': 'verb', 'låg': 'verb', 'legat': 'verb', 'ligga': 'verb', 'bor': 'verb', 'bodde': 'verb', 'bott': 'verb', 'bo': 'verb',
      
      // Aktiviteter och handlingar
      'arbetar': 'verb', 'arbetade': 'verb', 'arbetat': 'verb', 'arbeta': 'verb', 'studerar': 'verb', 'studerade': 'verb', 'studerat': 'verb', 'studera': 'verb',
      'leker': 'verb', 'lekte': 'verb', 'lekt': 'verb', 'leka': 'verb', 'spelar': 'verb', 'spelade': 'verb', 'spelat': 'verb', 'spela': 'verb',
      'tränar': 'verb', 'tränade': 'verb', 'tränat': 'verb', 'träna': 'verb', 'vilar': 'verb', 'vilade': 'verb', 'vilat': 'verb', 'vila': 'verb',
      
      // Kommunikation och sinnen
      'säger': 'verb', 'sa': 'verb', 'sagt': 'verb', 'säga': 'verb', 'pratar': 'verb', 'pratade': 'verb', 'pratat': 'verb', 'prata': 'verb',
      'talar': 'verb', 'talade': 'verb', 'talat': 'verb', 'tala': 'verb', 'berättar': 'verb', 'berättade': 'verb', 'berättat': 'verb', 'berätta': 'verb',
      'lyssnar': 'verb', 'lyssnade': 'verb', 'lyssnat': 'verb', 'lyssna': 'verb', 'hör': 'verb', 'hörde': 'verb', 'hört': 'verb', 'höra': 'verb',
      'ser': 'verb', 'såg': 'verb', 'sett': 'verb', 'se': 'verb', 'tittar': 'verb', 'tittade': 'verb', 'tittat': 'verb', 'titta': 'verb',
      'känner': 'verb', 'kände': 'verb', 'känt': 'verb', 'känna': 'verb', 'luktar': 'verb', 'luktade': 'verb', 'luktat': 'verb', 'lukta': 'verb',
      
      // Handlingar med händer
      'tar': 'verb', 'tog': 'verb', 'tagit': 'verb', 'ta': 'verb', 'ger': 'verb', 'gav': 'verb', 'gett': 'verb', 'ge': 'verb',
      'får': 'verb', 'fick': 'verb', 'fått': 'verb', 'få': 'verb', 'gör': 'verb', 'gjorde': 'verb', 'gjort': 'verb', 'göra': 'verb',
      'håller': 'verb', 'höll': 'verb', 'hållit': 'verb', 'hålla': 'verb', 'kastar': 'verb', 'kastade': 'verb', 'kastat': 'verb', 'kasta': 'verb',
      'bygger': 'verb', 'byggde': 'verb', 'byggt': 'verb', 'bygga': 'verb', 'ritar': 'verb', 'ritade': 'verb', 'ritat': 'verb', 'rita': 'verb',
      
      // Mat och dryck
      'äter': 'verb', 'åt': 'verb', 'ätit': 'verb', 'äta': 'verb', 'dricker': 'verb', 'drack': 'verb', 'druckit': 'verb', 'dricka': 'verb',
      'lagar': 'verb', 'lagade': 'verb', 'lagat': 'verb', 'laga': 'verb', 'bakar': 'verb', 'bakade': 'verb', 'bakat': 'verb', 'baka': 'verb',
      'köper': 'verb', 'köpte': 'verb', 'köpt': 'verb', 'köpa': 'verb', 'säljer': 'verb', 'sålde': 'verb', 'sålt': 'verb', 'sälja': 'verb',
      
      // Vardagsaktiviteter
      'sover': 'verb', 'sov': 'verb', 'sovit': 'verb', 'sova': 'verb', 'vaknar': 'verb', 'vaknade': 'verb', 'vaknat': 'verb', 'vakna': 'verb',
      'tvättar': 'verb', 'tvättade': 'verb', 'tvättat': 'verb', 'tvätta': 'verb', 'städar': 'verb', 'städade': 'verb', 'städat': 'verb', 'städa': 'verb',
      'duschar': 'verb', 'duschade': 'verb', 'duschat': 'verb', 'duscha': 'verb', 'kammar': 'verb', 'kammade': 'verb', 'kammat': 'verb', 'kamma': 'verb',
      
      // Läsning och lärande
      'läser': 'verb', 'läste': 'verb', 'läst': 'verb', 'läsa': 'verb', 'skriver': 'verb', 'skrev': 'verb', 'skrivit': 'verb', 'skriva': 'verb',
      'räknar': 'verb', 'räknade': 'verb', 'räknat': 'verb', 'räkna': 'verb', 'lär': 'verb', 'lärde': 'verb', 'lärt': 'verb', 'lära': 'verb',
      'förstår': 'verb', 'förstod': 'verb', 'förstått': 'verb', 'förstå': 'verb', 'minns': 'verb', 'mindes': 'verb', 'mints': 'verb', 'minnas': 'verb',
      
      // Känslor och tillstånd
      'tycker': 'verb', 'tyckte': 'verb', 'tyckt': 'verb', 'tycka': 'verb', 'älskar': 'verb', 'älskade': 'verb', 'älskat': 'verb', 'älska': 'verb',
      'hatar': 'verb', 'hatade': 'verb', 'hatat': 'verb', 'hata': 'verb', 'gillar': 'verb', 'gillade': 'verb', 'gillat': 'verb', 'gilla': 'verb',
      'tror': 'verb', 'trodde': 'verb', 'trott': 'verb', 'tro': 'verb', 'vet': 'verb', 'visste': 'verb', 'vetat': 'verb', 'veta': 'verb',
      
      // Prepositioner (utökad lista)
      'på': 'preposition', 'i': 'preposition', 'till': 'preposition', 'från': 'preposition', 'med': 'preposition', 
      'av': 'preposition', 'för': 'preposition', 'utan': 'preposition', 'över': 'preposition', 'under': 'preposition', 
      'mellan': 'preposition', 'genom': 'preposition', 'mot': 'preposition', 'hos': 'preposition', 'vid': 'preposition',
      'efter': 'preposition', 'före': 'preposition', 'innan': 'preposition', 'bakom': 'preposition', 'framför': 'preposition',
      'bredvid': 'preposition', 'utanför': 'preposition', 'inuti': 'preposition', 'omkring': 'preposition', 'runt': 'preposition',
      'längs': 'preposition', 'uppför': 'preposition', 'nerför': 'preposition', 'utmed': 'preposition', 'enligt': 'preposition',
      'trots': 'preposition', 'angående': 'preposition', 'beträffande': 'preposition', 'gällande': 'preposition',
      
      // Konjunktioner (utökad lista)
      'och': 'conjunction', 'eller': 'conjunction', 'men': 'conjunction', 'utan': 'conjunction', 'för': 'conjunction',
      'att': 'conjunction', 'om': 'conjunction', 'när': 'conjunction', 'medan': 'conjunction', 'eftersom': 'conjunction', 
      'därför': 'conjunction', 'så': 'conjunction', 'fast': 'conjunction', 'fastän': 'conjunction', 'även': 'conjunction',
      'dock': 'conjunction', 'samt': 'conjunction', 'plus': 'conjunction', 'minus': 'conjunction', 'varken': 'conjunction',
      'både': 'conjunction', 'antingen': 'conjunction', 'innan': 'conjunction', 'sedan': 'conjunction', 'tills': 'conjunction',
      'där': 'conjunction', 'som': 'conjunction', 'vilket': 'conjunction', 'vilken': 'conjunction', 'vars': 'conjunction',
      
      // Adverb (kraftigt utökad lista)
      // Nekation och frekvens
      'inte': 'adverb', 'ej': 'adverb', 'icke': 'adverb', 'aldrig': 'adverb', 'alltid': 'adverb', 'ofta': 'adverb', 'sällan': 'adverb',
      'ibland': 'adverb', 'stundom': 'adverb', 'ständigt': 'adverb', 'vanligtvis': 'adverb', 'normalt': 'adverb', 'brukar': 'adverb',
      
      // Plats och riktning
      'här': 'adverb', 'där': 'adverb', 'var': 'adverb', 'varsomhelst': 'adverb', 'någonstans': 'adverb', 'ingenstans': 'adverb',
      'överallt': 'adverb', 'hem': 'adverb', 'hemifrån': 'adverb', 'dit': 'adverb', 'därifrån': 'adverb', 'härifrån': 'adverb',
      'bort': 'adverb', 'fram': 'adverb', 'tillbaka': 'adverb', 'upp': 'adverb', 'ner': 'adverb', 'ned': 'adverb',
      'in': 'adverb', 'ut': 'adverb', 'inne': 'adverb', 'ute': 'adverb', 'uppe': 'adverb', 'nere': 'adverb',
      
      // Tid
      'nu': 'adverb', 'då': 'adverb', 'igår': 'adverb', 'idag': 'adverb', 'imorgon': 'adverb', 'förut': 'adverb', 'tidigare': 'adverb',
      'senare': 'adverb', 'snart': 'adverb', 'genast': 'adverb', 'direkt': 'adverb', 'omedelbart': 'adverb', 'strax': 'adverb',
      'redan': 'adverb', 'ännu': 'adverb', 'fortfarande': 'adverb', 'nyss': 'adverb', 'precis': 'adverb',
      
      // Sätt och grad
      'snabbt': 'adverb', 'långsamt': 'adverb', 'fort': 'adverb', 'sakta': 'adverb', 'tyst': 'adverb', 'högt': 'adverb', 'lågt': 'adverb',
      'mjukt': 'adverb', 'hårt': 'adverb', 'försiktigt': 'adverb', 'varsamt': 'adverb', 'kraftigt': 'adverb', 'lätt': 'adverb',
      'mycket': 'adverb', 'lite': 'adverb', 'litet': 'adverb', 'mer': 'adverb', 'mest': 'adverb', 'mindre': 'adverb', 'minst': 'adverb',
      'väldigt': 'adverb', 'ganska': 'adverb', 'riktigt': 'adverb', 'rätt': 'adverb', 'ziemligt': 'adverb', 'extremt': 'adverb',
      'helt': 'adverb', 'delvis': 'adverb', 'nästan': 'adverb', 'ungefär': 'adverb', 'cirka': 'adverb', 'omkring': 'adverb',
      
      // Begränsning och fokus
      'bara': 'adverb', 'endast': 'adverb', 'blott': 'adverb', 'just': 'adverb', 'faktiskt': 'adverb', 'verkligen': 'adverb',
      'naturligtvis': 'adverb', 'självklart': 'adverb', 'givetvis': 'adverb', 'förstås': 'adverb', 'tydligen': 'adverb',
      'uppenbarligen': 'adverb', 'kanske': 'adverb', 'möjligen': 'adverb', 'troligen': 'adverb', 'säkert': 'adverb',
      
      // Adjektiv (kraftigt utökad lista med böjningar)
      // Storlek
      'stor': 'adjective', 'stort': 'adjective', 'stora': 'adjective', 'större': 'adjective', 'störst': 'adjective', 'största': 'adjective',
      'liten': 'adjective', 'litet': 'adjective', 'lilla': 'adjective', 'små': 'adjective', 'mindre': 'adjective', 'minst': 'adjective', 'minsta': 'adjective',
      'hög': 'adjective', 'högt': 'adjective', 'höga': 'adjective', 'högre': 'adjective', 'högst': 'adjective', 'högsta': 'adjective',
      'låg': 'adjective', 'lågt': 'adjective', 'låga': 'adjective', 'lägre': 'adjective', 'lägst': 'adjective', 'lägsta': 'adjective',
      'bred': 'adjective', 'brett': 'adjective', 'breda': 'adjective', 'bredare': 'adjective', 'bredast': 'adjective',
      'smal': 'adjective', 'smalt': 'adjective', 'smala': 'adjective', 'smalare': 'adjective', 'smalast': 'adjective',
      'tjock': 'adjective', 'tjockt': 'adjective', 'tjocka': 'adjective', 'tjockare': 'adjective', 'tjockast': 'adjective',
      'tunn': 'adjective', 'tunt': 'adjective', 'tunna': 'adjective', 'tunnare': 'adjective', 'tunnast': 'adjective',
      
      // Kvalitet och värdering
      'bra': 'adjective', 'god': 'adjective', 'gott': 'adjective', 'goda': 'adjective', 'bättre': 'adjective', 'bäst': 'adjective', 'bästa': 'adjective',
      'dålig': 'adjective', 'dåligt': 'adjective', 'dåliga': 'adjective', 'sämre': 'adjective', 'sämst': 'adjective', 'sämsta': 'adjective',
      'fin': 'adjective', 'fint': 'adjective', 'fina': 'adjective', 'finare': 'adjective', 'finast': 'adjective',
      'ful': 'adjective', 'fult': 'adjective', 'fula': 'adjective', 'fulare': 'adjective', 'fulast': 'adjective',
      'vacker': 'adjective', 'vackert': 'adjective', 'vackra': 'adjective', 'vackrare': 'adjective', 'vackrast': 'adjective',
      'rik': 'adjective', 'rikt': 'adjective', 'rika': 'adjective', 'rikare': 'adjective', 'rikast': 'adjective',
      'fattig': 'adjective', 'fattigt': 'adjective', 'fattiga': 'adjective', 'fattigare': 'adjective', 'fattigast': 'adjective',
      
      // Ålder och tid
      'ny': 'adjective', 'nytt': 'adjective', 'nya': 'adjective', 'nyare': 'adjective', 'nyast': 'adjective',
      'gammal': 'adjective', 'gammalt': 'adjective', 'gamla': 'adjective', 'äldre': 'adjective', 'äldst': 'adjective', 'äldsta': 'adjective',
      'ung': 'adjective', 'ungt': 'adjective', 'unga': 'adjective', 'yngre': 'adjective', 'yngst': 'adjective',
      'färsk': 'adjective', 'färskt': 'adjective', 'färska': 'adjective', 'färskare': 'adjective', 'färskast': 'adjective',
      
      // Färger
      'röd': 'adjective', 'rött': 'adjective', 'röda': 'adjective', 'rödare': 'adjective', 'rödast': 'adjective',
      'blå': 'adjective', 'blått': 'adjective', 'blåa': 'adjective', 'blåare': 'adjective', 'blåast': 'adjective',
      'grön': 'adjective', 'grönt': 'adjective', 'gröna': 'adjective', 'grönare': 'adjective', 'grönast': 'adjective',
      'gul': 'adjective', 'gult': 'adjective', 'gula': 'adjective', 'gulare': 'adjective', 'gulast': 'adjective',
      'svart': 'adjective', 'svarta': 'adjective', 'svartare': 'adjective', 'svartast': 'adjective',
      'vit': 'adjective', 'vitt': 'adjective', 'vita': 'adjective', 'vitare': 'adjective', 'vitast': 'adjective',
      'grå': 'adjective', 'grått': 'adjective', 'grå': 'adjective', 'gråare': 'adjective', 'gråast': 'adjective',
      'orange': 'adjective', 'lila': 'adjective', 'rosa': 'adjective', 'brun': 'adjective', 'brunt': 'adjective', 'bruna': 'adjective',
      
      // Känslor och tillstånd
      'glad': 'adjective', 'glatt': 'adjective', 'glada': 'adjective', 'gladare': 'adjective', 'gladast': 'adjective',
      'ledsen': 'adjective', 'ledset': 'adjective', 'ledsna': 'adjective', 'ledsnare': 'adjective', 'ledsnast': 'adjective',
      'arg': 'adjective', 'argt': 'adjective', 'arga': 'adjective', 'argare': 'adjective', 'argast': 'adjective',
      'rädd': 'adjective', 'rätt': 'adjective', 'rädda': 'adjective', 'räddare': 'adjective', 'räddast': 'adjective',
      'trött': 'adjective', 'trötta': 'adjective', 'tröttare': 'adjective', 'tröttast': 'adjective',
      'pigg': 'adjective', 'piggt': 'adjective', 'pigga': 'adjective', 'piggare': 'adjective', 'piggast': 'adjective',
      
      // Fysiska egenskaper
      'varm': 'adjective', 'varmt': 'adjective', 'varma': 'adjective', 'varmare': 'adjective', 'varmast': 'adjective',
      'kall': 'adjective', 'kallt': 'adjective', 'kalla': 'adjective', 'kallare': 'adjective', 'kallast': 'adjective',
      'het': 'adjective', 'hett': 'adjective', 'heta': 'adjective', 'hetare': 'adjective', 'hetast': 'adjective',
      'sval': 'adjective', 'svalt': 'adjective', 'svala': 'adjective', 'svalare': 'adjective', 'svalast': 'adjective',
      'mjuk': 'adjective', 'mjukt': 'adjective', 'mjuka': 'adjective', 'mjukare': 'adjective', 'mjukast': 'adjective',
      'hård': 'adjective', 'hårt': 'adjective', 'hårda': 'adjective', 'hårdare': 'adjective', 'hårdast': 'adjective',
      'våt': 'adjective', 'vått': 'adjective', 'våta': 'adjective', 'våtare': 'adjective', 'våtast': 'adjective',
      'torr': 'adjective', 'torrt': 'adjective', 'torra': 'adjective', 'torrare': 'adjective', 'torrast': 'adjective',
      
      // Räkneord (utökad lista)
      // Grundtal
      'noll': 'numeral', 'en': 'numeral', 'ett': 'numeral', 'två': 'numeral', 'tre': 'numeral', 'fyra': 'numeral', 'fem': 'numeral',
      'sex': 'numeral', 'sju': 'numeral', 'åtta': 'numeral', 'nio': 'numeral', 'tio': 'numeral', 'elva': 'numeral', 'tolv': 'numeral',
      'tretton': 'numeral', 'fjorton': 'numeral', 'femton': 'numeral', 'sexton': 'numeral', 'sjutton': 'numeral', 'arton': 'numeral',
      'nitton': 'numeral', 'tjugo': 'numeral', 'trettio': 'numeral', 'fyrtio': 'numeral', 'femtio': 'numeral',
      'sextio': 'numeral', 'sjuttio': 'numeral', 'åttio': 'numeral', 'nittio': 'numeral', 'hundra': 'numeral', 'tusen': 'numeral',
      
      // Ordningstal
      'första': 'numeral', 'andra': 'numeral', 'tredje': 'numeral', 'fjärde': 'numeral', 'femte': 'numeral', 'sjätte': 'numeral',
      'sjunde': 'numeral', 'åttonde': 'numeral', 'nionde': 'numeral', 'tionde': 'numeral', 'elfte': 'numeral', 'tolfte': 'numeral',
      'sista': 'numeral', 'nästa': 'numeral', 'förra': 'numeral',
      
      // Mängdord
      'många': 'numeral', 'få': 'numeral', 'flera': 'numeral', 'alla': 'numeral', 'inga': 'numeral', 'några': 'numeral',
      'båda': 'numeral', 'hälften': 'numeral', 'dubbel': 'numeral', 'dubbelt': 'numeral', 'tredubbel': 'numeral',
      
      // Interjektioner (utökad lista)
      // Hälsningar
      'hej': 'interjection', 'hejdå': 'interjection', 'adjö': 'interjection', 'ha': 'interjection', 'hallå': 'interjection',
      'tjena': 'interjection', 'tjo': 'interjection', 'tjabba': 'interjection', 'morsning': 'interjection',
      
      // Känslor och reaktioner
      'oj': 'interjection', 'ah': 'interjection', 'åh': 'interjection', 'oh': 'interjection', 'aha': 'interjection',
      'wow': 'interjection', 'uff': 'interjection', 'puh': 'interjection', 'fyyy': 'interjection', 'usch': 'interjection',
      'ack': 'interjection', 'aj': 'interjection', 'au': 'interjection', 'ow': 'interjection', 'ouch': 'interjection',
      
      // Artighet och kommunikation
      'tack': 'interjection', 'tackar': 'interjection', 'tusen': 'interjection', 'ursäkta': 'interjection', 'förlåt': 'interjection',
      'beklagar': 'interjection', 'pardon': 'interjection', 'snälla': 'interjection', 'varsågod': 'interjection',
      
      // Uppmuntran och bekräftelse
      'ja': 'interjection', 'nej': 'interjection', 'jo': 'interjection', 'okej': 'interjection', 'ok': 'interjection',
      'bra': 'interjection', 'super': 'interjection', 'toppen': 'interjection', 'fantastiskt': 'interjection',
      'bravo': 'interjection', 'hurra': 'interjection', 'jippi': 'interjection',
      
      // Djurläten och ljud
      'vov': 'interjection', 'miau': 'interjection', 'mu': 'interjection', 'bää': 'interjection', 'oinkoink': 'interjection',
      'tick': 'interjection', 'tack': 'interjection', 'pang': 'interjection', 'bang': 'interjection', 'bom': 'interjection',
      'plask': 'interjection', 'plums': 'interjection', 'puff': 'interjection'
    };

    const words = content.split(' ').map(text => {
      const cleanText = text.toLowerCase().replace(/[.,!?;:]/g, '');
      return {
        text,
        wordClass: commonWords[cleanText] || 'noun' // Default to noun
      };
    });

    return words;
  };

  const handleContentChange = (content: string) => {
    setEditingData(prev => ({
      ...prev,
      content,
      words: parseWordsFromContent(content, prev.wordClassType)
    }));
  };

  const handleSave = () => {
    if (isCreating) {
      createSentenceMutation.mutate(editingData);
    } else if (editingId) {
      updateSentenceMutation.mutate({ id: editingId, sentence: editingData });
    }
  };

  const handleBulkSave = () => {
    const sentences = bulkData.sentences.map(sentence => ({
      content: sentence.content,
      words: sentence.words,
      level: bulkData.level,
      wordClassType: bulkData.wordClassType,
      difficulty: bulkData.difficulty
    }));
    bulkCreateMutation.mutate(sentences);
  };

  const filteredSentences = sentences.filter(sentence => {
    const wordClassMatch = filterWordClass === "all" || sentence.wordClassType === filterWordClass;
    const levelMatch = filterLevel === "all" || sentence.difficulty.toString() === filterLevel;
    return wordClassMatch && levelMatch;
  });

  const getWordClassInfo = (name: string) => wordClasses.find(wc => wc.name === name);

  const groupedSentences = filteredSentences.reduce((acc, sentence) => {
    const key = `${sentence.wordClassType}-${sentence.difficulty}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(sentence);
    return acc;
  }, {} as Record<string, Sentence[]>);

  if (sentencesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laddar adminpanel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-primary/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors">
                <i className="fas fa-arrow-left"></i>
                <span>Tillbaka till spel</span>
              </button>
            </Link>
            
            <h1 className="text-3xl font-bold text-gray-900">Adminpanel</h1>
            
            <div className="flex gap-2">
              <Button onClick={startCreating} className="bg-green-600 hover:bg-green-700">
                <i className="fas fa-plus mr-2"></i>
                Ny mening
              </Button>
              <Button onClick={startBulkCreating} className="bg-blue-600 hover:bg-blue-700">
                <i className="fas fa-list mr-2"></i>
                Flera meningar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Filter</h2>
          <div className="flex gap-4">
            <div>
              <Label htmlFor="wordclass-filter">Ordklass</Label>
              <Select value={filterWordClass} onValueChange={setFilterWordClass}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla ordklasser</SelectItem>
                  {wordClasses.map(wc => (
                    <SelectItem key={wc.name} value={wc.name}>{wc.swedishName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="level-filter">Nivå</Label>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla nivåer</SelectItem>
                  <SelectItem value="1">Nivå 1</SelectItem>
                  <SelectItem value="2">Nivå 2</SelectItem>
                  <SelectItem value="3">Nivå 3</SelectItem>
                  <SelectItem value="4">Nivå 4</SelectItem>
                  <SelectItem value="5">Nivå 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Totalt antal meningar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{sentences.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ordklasser</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">{wordClasses.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtrerade resultat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{filteredSentences.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Sentences grouped by word class and level */}
        <div className="space-y-8">
          {Object.entries(groupedSentences).map(([key, groupSentences]) => {
            const [wordClassType, difficulty] = key.split('-');
            const wordClassInfo = getWordClassInfo(wordClassType);
            
            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Badge 
                      style={{ backgroundColor: wordClassInfo?.color }}
                      className="text-white"
                    >
                      {wordClassInfo?.swedishName} - Nivå {difficulty}
                    </Badge>
                    <span className="text-sm text-gray-500">({groupSentences.length} meningar)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {groupSentences.map((sentence) => (
                      <div key={sentence.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{sentence.content}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            Ord: {sentence.words.map(w => `${w.text}(${w.wordClass})`).join(', ')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => startEditing(sentence)}
                            variant="outline" 
                            size="sm"
                          >
                            <i className="fas fa-edit mr-1"></i>
                            Redigera
                          </Button>
                          <Button 
                            onClick={() => deleteSentenceMutation.mutate(sentence.id)}
                            variant="destructive" 
                            size="sm"
                          >
                            <i className="fas fa-trash mr-1"></i>
                            Ta bort
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Edit/Create Dialog */}
      <Dialog open={editingId !== null || isCreating} onOpenChange={(open) => {
        if (!open) {
          setEditingId(null);
          setIsCreating(false);
          resetEditingData();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? "Skapa ny mening" : "Redigera mening"}
            </DialogTitle>
            <DialogDescription>
              Fyll i informationen nedan för att {isCreating ? "skapa" : "uppdatera"} meningen.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="content">Mening</Label>
              <Textarea
                id="content"
                value={editingData.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Skriv meningen här..."
                className="min-h-[80px]"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="wordClassType">Ordklass</Label>
                <Select 
                  value={editingData.wordClassType} 
                  onValueChange={(value) => setEditingData(prev => ({ ...prev, wordClassType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {wordClasses.map(wc => (
                      <SelectItem key={wc.name} value={wc.name}>{wc.swedishName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="level">Nivå</Label>
                <Select 
                  value={editingData.level.toString()} 
                  onValueChange={(value) => setEditingData(prev => ({ ...prev, level: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Nivå 1</SelectItem>
                    <SelectItem value="2">Nivå 2</SelectItem>
                    <SelectItem value="3">Nivå 3</SelectItem>
                    <SelectItem value="4">Nivå 4</SelectItem>
                    <SelectItem value="5">Nivå 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="difficulty">Svårighet</Label>
                <Select 
                  value={editingData.difficulty.toString()} 
                  onValueChange={(value) => setEditingData(prev => ({ ...prev, difficulty: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Ordklasser för varje ord</Label>
              <div className="grid gap-2 p-3 border rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                {editingData.words.map((word, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="min-w-[100px] font-medium">{word.text}</span>
                    <Select 
                      value={word.wordClass} 
                      onValueChange={(value) => updateWordClass(-1, index, value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {wordClasses.map(wc => (
                          <SelectItem key={wc.name} value={wc.name}>{wc.swedishName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Ord parsas automatiskt, men du kan ändra ordklasserna manuellt ovan.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => {
                setEditingId(null);
                setIsCreating(false);
                resetEditingData();
              }}
              variant="outline"
            >
              Avbryt
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!editingData.content || createSentenceMutation.isPending || updateSentenceMutation.isPending}
            >
              {isCreating ? "Skapa" : "Spara"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Create Dialog */}
      <Dialog open={isBulkCreating} onOpenChange={(open) => {
        if (!open) {
          setIsBulkCreating(false);
          setBulkText("");
          setBulkData(prev => ({ ...prev, sentences: [] }));
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Skapa flera meningar samtidigt</DialogTitle>
            <DialogDescription>
              Skriv en mening per rad. Du kan sedan redigera ordklasserna för varje ord.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Global settings */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bulkWordClassType">Ordklass</Label>
                <Select 
                  value={bulkData.wordClassType} 
                  onValueChange={(value) => setBulkData(prev => ({ ...prev, wordClassType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {wordClasses.map(wc => (
                      <SelectItem key={wc.name} value={wc.name}>{wc.swedishName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="bulkLevel">Nivå</Label>
                <Select 
                  value={bulkData.level.toString()} 
                  onValueChange={(value) => setBulkData(prev => ({ ...prev, level: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Nivå 1</SelectItem>
                    <SelectItem value="2">Nivå 2</SelectItem>
                    <SelectItem value="3">Nivå 3</SelectItem>
                    <SelectItem value="4">Nivå 4</SelectItem>
                    <SelectItem value="5">Nivå 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="bulkDifficulty">Svårighet</Label>
                <Select 
                  value={bulkData.difficulty.toString()} 
                  onValueChange={(value) => setBulkData(prev => ({ ...prev, difficulty: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Text input */}
            <div>
              <Label htmlFor="bulkText">Meningar (en per rad)</Label>
              <Textarea
                id="bulkText"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Skriv en mening per rad här..."
                className="min-h-[120px]"
              />
              <div className="flex gap-2 mt-2">
                <Button onClick={processBulkText} variant="outline" size="sm">
                  <i className="fas fa-cogs mr-2"></i>
                  Parsa meningar
                </Button>
                <span className="text-sm text-gray-500 self-center">
                  {bulkText.split('\n').filter(line => line.trim() !== '').length} meningar
                </span>
              </div>
            </div>

            {/* Parsed sentences with editable word classes */}
            {bulkData.sentences.length > 0 && (
              <div>
                <Label>Ordklasser per mening</Label>
                <div className="space-y-4 max-h-60 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                  {bulkData.sentences.map((sentence, sentenceIndex) => (
                    <div key={sentenceIndex} className="bg-white p-3 rounded border">
                      <div className="font-medium text-sm mb-2 text-gray-700">
                        {sentenceIndex + 1}. {sentence.content}
                      </div>
                      <div className="grid gap-2">
                        {sentence.words.map((word, wordIndex) => (
                          <div key={wordIndex} className="flex items-center gap-2">
                            <span className="min-w-[80px] text-sm">{word.text}</span>
                            <Select 
                              value={word.wordClass} 
                              onValueChange={(value) => updateWordClass(sentenceIndex, wordIndex, value)}
                            >
                              <SelectTrigger className="w-40 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {wordClasses.map(wc => (
                                  <SelectItem key={wc.name} value={wc.name}>{wc.swedishName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => {
                setIsBulkCreating(false);
                setBulkText("");
                setBulkData(prev => ({ ...prev, sentences: [] }));
              }}
              variant="outline"
            >
              Avbryt
            </Button>
            <Button 
              onClick={handleBulkSave}
              disabled={bulkData.sentences.length === 0 || bulkCreateMutation.isPending}
            >
              Skapa {bulkData.sentences.length} meningar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
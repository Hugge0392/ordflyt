import React, { useMemo, useState } from "react";
import { v4 as uuid } from "uuid";
import {
  Button,
} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Play, Plus, Save, Upload, Download, ArrowDown, ArrowUp, Trash2, Eye, EyeOff, MoreHorizontal, ChevronRight, CheckCircle2, XCircle } from "lucide-react";

/**
 * ------------------------------------------------------
 * Datamodell
 * ------------------------------------------------------
 */

type DialogueBlock = {
  id: string;
  type: "dialogue";
  speaker: string; // t.ex. "Pirat"
  text: string; // markdown-stöd kan läggas senare
};

type QuizAnswer = {
  id: string;
  text: string;
  correct: boolean;
  feedback?: string;
};

type QuizBlock = {
  id: string;
  type: "quiz";
  question: string;
  answers: QuizAnswer[];
  requireAllCorrect?: boolean; // om false: ett rätt räcker
  allowRetry?: boolean; // om true: eleven kan försöka igen
};

type PauseBlock = {
  id: string;
  type: "pause"; // ett litet stopp mellan textblock
  label?: string; // text på knappen
};

type Block = DialogueBlock | QuizBlock | PauseBlock;

type Section = {
  id: string;
  title: string;
  blocks: Block[];
};

type Story = {
  id: string;
  title: string;
  description?: string;
  character: string; // url eller emoji
  sections: Section[];
};

/**
 * ------------------------------------------------------
 * CharacterLibrary (din kod – lätt justerad till denna fil)
 * ------------------------------------------------------
 */

import piratImage from "@assets/Pirat höger_1755326212023.png"; // justera sökväg vid behov

interface CharacterLibraryProps {
  onCharacterSelect: (imageUrlOrEmoji: string) => void;
  currentImage?: string;
}

const CHARACTER_LIBRARY = [
  {
    id: "pirat",
    name: "Pirat",
    image: piratImage,
    description: "Trevlig pirat som kan hjälpa med substantivlektioner",
  },
  { id: "teacher", name: "Lärare", emoji: "👨‍🏫", description: "Klassisk lärare som förklarar grammatik" },
  { id: "student", name: "Elev", emoji: "👩‍🎓", description: "Nyfiken elev som lär sig" },
  { id: "scientist", name: "Forskare", emoji: "👩‍🔬", description: "Smart forskare för avancerade ämnen" },
  { id: "artist", name: "Konstnär", emoji: "👩‍🎨", description: "Kreativ konstnär för språkövningar" },
  { id: "robot", name: "Robot", emoji: "🤖", description: "Hjälpsam robot för digitalt lärande" },
  { id: "wizard", name: "Trollkarl", emoji: "🧙‍♂️", description: "Magisk trollkarl för fantasifulla lektioner" },
  { id: "cat", name: "Katt", emoji: "🐱", description: "Söt katt som pratar om djur" },
  { id: "bear", name: "Björn", emoji: "🐻", description: "Snäll björn för naturämnen" },
  { id: "fairy", name: "Älva", emoji: "🧚‍♀️", description: "Magisk älva för sagor och berättelser" },
] as const;

function CharacterLibrary({ onCharacterSelect, currentImage }: CharacterLibraryProps) {
  const [customUrl, setCustomUrl] = useState("");
  const [showCustomDialog, setShowCustomDialog] = useState(false);

  const handleCharacterClick = (character: any) => {
    if (character.image) onCharacterSelect(character.image as string);
    else if (character.emoji) onCharacterSelect(character.emoji as string);
  };

  const handleCustomUrl = () => {
    if (customUrl.trim()) {
      onCharacterSelect(customUrl.trim());
      setCustomUrl("");
      setShowCustomDialog(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-medium">Välj figur</Label>
        <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">Egen URL</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lägg till egen bild-URL</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Bild-URL</Label>
                <Input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://example.com/image.png" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCustomDialog(false)}>Avbryt</Button>
                <Button onClick={handleCustomUrl}>Använd</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {CHARACTER_LIBRARY.map((character) => (
          <Card
            key={character.id}
            className={`cursor-pointer transition-all hover:shadow-md ${currentImage === (character as any).image || currentImage === (character as any).emoji ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}
            onClick={() => handleCharacterClick(character)}
          >
            <CardContent className="p-3 text-center">
              <div className="mb-2 flex justify-center">
                {(character as any).image ? (
                  <img src={(character as any).image} alt={(character as any).name} className="w-12 h-12 object-contain" />
                ) : (
                  <div className="text-3xl">{(character as any).emoji}</div>
                )}
              </div>
              <div className="text-xs font-medium">{(character as any).name}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {currentImage && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <Label className="text-sm font-medium mb-2 block">Vald figur:</Label>
          <div className="flex items-center gap-3">
            {currentImage.startsWith("http") || currentImage.startsWith("/") ? (
              <img src={currentImage} alt="Vald figur" className="w-10 h-10 object-contain rounded" />
            ) : (
              <div className="text-2xl">{currentImage}</div>
            )}
            <div className="text-sm text-gray-600 flex-1 truncate">
              {currentImage.length > 50 ? currentImage.substring(0, 50) + "..." : currentImage}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ------------------------------------------------------
 * Blockredigerare
 * ------------------------------------------------------
 */

function DialogueEditor({ block, onChange }: { block: DialogueBlock; onChange: (b: DialogueBlock) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        <Label>Talare</Label>
        <div className="md:col-span-2">
          <Input value={block.speaker} onChange={(e) => onChange({ ...block, speaker: e.target.value })} placeholder="t.ex. Piraten" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Replik / text</Label>
        <Textarea rows={4} value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="Skriv figurens replik här…" />
      </div>
    </div>
  );
}

function QuizEditor({ block, onChange }: { block: QuizBlock; onChange: (b: QuizBlock) => void }) {
  const updateAnswer = (id: string, patch: Partial<QuizAnswer>) => {
    onChange({ ...block, answers: block.answers.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  };
  const addAnswer = () => onChange({ ...block, answers: [...block.answers, { id: uuid(), text: "", correct: false }] });
  const removeAnswer = (id: string) => onChange({ ...block, answers: block.answers.filter((a) => a.id !== id) });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Fråga</Label>
        <Textarea rows={2} value={block.question} onChange={(e) => onChange({ ...block, question: e.target.value })} placeholder="Skriv quizfrågan här…" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="font-medium">Svarsalternativ</Label>
          <Button size="sm" variant="outline" onClick={addAnswer}>
            <Plus className="w-4 h-4 mr-1" /> Lägg till svar
          </Button>
        </div>
        {block.answers.map((ans, idx) => (
          <Card key={ans.id} className="">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={ans.correct ? "default" : "secondary"}>{idx + 1}</Badge>
                <Input value={ans.text} onChange={(e) => updateAnswer(ans.id, { text: e.target.value })} placeholder={`Alternativ ${idx + 1}`} />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" size="icon" variant={ans.correct ? "default" : "outline"} onClick={() => updateAnswer(ans.id, { correct: !ans.correct })}>
                        {ans.correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{ans.correct ? "Markerad som rätt" : "Markera som rätt"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button type="button" size="icon" variant="ghost" onClick={() => removeAnswer(ans.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Input value={ans.feedback ?? ""} onChange={(e) => updateAnswer(ans.id, { feedback: e.target.value })} placeholder="Återkoppling (valfritt)" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <Label className="font-medium">Kräv alla rätt</Label>
            <p className="text-xs text-muted-foreground">Om av – ett rätt svar räcker.</p>
          </div>
          <Switch checked={!!block.requireAllCorrect} onCheckedChange={(v) => onChange({ ...block, requireAllCorrect: v })} />
        </div>
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <Label className="font-medium">Tillåt nytt försök</Label>
            <p className="text-xs text-muted-foreground">Eleven kan försöka igen vid fel.</p>
          </div>
          <Switch checked={!!block.allowRetry} onCheckedChange={(v) => onChange({ ...block, allowRetry: v })} />
        </div>
      </div>
    </div>
  );
}

function PauseEditor({ block, onChange }: { block: PauseBlock; onChange: (b: PauseBlock) => void }) {
  return (
    <div className="space-y-2">
      <Label>Knapptext</Label>
      <Input value={block.label ?? "Fortsätt"} onChange={(e) => onChange({ ...block, label: e.target.value })} />
    </div>
  );
}

/**
 * ------------------------------------------------------
 * Hjälpfunktioner
 * ------------------------------------------------------
 */

const createDialogue = (): DialogueBlock => ({ id: uuid(), type: "dialogue", speaker: "Pirat", text: "…" });
const createQuiz = (): QuizBlock => ({ id: uuid(), type: "quiz", question: "", answers: [{ id: uuid(), text: "", correct: true }], requireAllCorrect: false, allowRetry: true });
const createPause = (): PauseBlock => ({ id: uuid(), type: "pause", label: "Fortsätt" });

const createSection = (title = "Avsnitt") => ({ id: uuid(), title, blocks: [createDialogue(), createPause()] as Block[] });

function move<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/**
 * ------------------------------------------------------
 * Förhandsvisning / spelare
 * ------------------------------------------------------
 */

function StoryPlayer({ story }: { story: Story }) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [blockIndex, setBlockIndex] = useState(0);
  const [quizState, setQuizState] = useState<Record<string, { chosen: string[]; finished: boolean; correct: boolean }>>({});

  const section = story.sections[sectionIndex];
  const block = section?.blocks[blockIndex];

  const goNextBlock = () => {
    if (!section) return;
    if (blockIndex < section.blocks.length - 1) setBlockIndex((i) => i + 1);
    else if (sectionIndex < story.sections.length - 1) {
      setSectionIndex((s) => s + 1);
      setBlockIndex(0);
    }
  };

  const restart = () => {
    setSectionIndex(0);
    setBlockIndex(0);
    setQuizState({});
  };

  if (!section) return <p>Inget innehåll.</p>;

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center gap-3">
          {story.character && (story.character.startsWith("http") || story.character.startsWith("/")) ? (
            <img src={story.character} alt="figur" className="w-10 h-10 rounded object-contain" />
          ) : (
            <div className="text-3xl">{story.character}</div>
          )}
          <div>
            <CardTitle>{story.title || "Förhandsvisning"}</CardTitle>
            <CardDescription>{section.title}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 min-h-[200px]">
        {block?.type === "dialogue" && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">{block.speaker} säger:</div>
            <div className="p-3 rounded-xl bg-muted/50 leading-relaxed whitespace-pre-wrap">{block.text}</div>
          </div>
        )}

        {block?.type === "pause" && (
          <div className="text-center py-6">
            <Button onClick={goNextBlock}>
              <ChevronRight className="w-4 h-4 mr-1" /> {block.label || "Fortsätt"}
            </Button>
          </div>
        )}

        {block?.type === "quiz" && (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-1">Fråga</div>
              <div className="p-3 rounded-xl bg-muted/50 whitespace-pre-wrap">{block.question}</div>
            </div>

            <div className="grid gap-2">
              {block.answers.map((a) => {
                const st = quizState[block.id] || { chosen: [], finished: false, correct: false };
                const chosen = st.chosen.includes(a.id);
                const disabled = st.finished;
                return (
                  <Button
                    key={a.id}
                    variant={chosen ? "default" : "outline"}
                    className="justify-start"
                    disabled={disabled}
                    onClick={() => {
                      const nextChosen = block.requireAllCorrect ? (chosen ? st.chosen.filter((x) => x !== a.id) : [...st.chosen, a.id]) : [a.id];
                      setQuizState({
                        ...quizState,
                        [block.id]: { ...st, chosen: nextChosen },
                      });
                    }}
                  >
                    {a.text}
                  </Button>
                );
              })}
            </div>

            <div className="flex gap-2">
              {!quizState[block.id]?.finished ? (
                <Button
                  onClick={() => {
                    const st = quizState[block.id] || { chosen: [], finished: false, correct: false };
                    const chosenSet = new Set(st.chosen);
                    const allCorrectIds = new Set(block.answers.filter((a) => a.correct).map((a) => a.id));
                    const anyCorrect = block.answers.some((a) => a.correct && chosenSet.has(a.id));
                    const exactlyAll = st.chosen.length === allCorrectIds.size && st.chosen.every((id) => allCorrectIds.has(id));
                    const isCorrect = block.requireAllCorrect ? exactlyAll : anyCorrect;
                    setQuizState({ ...quizState, [block.id]: { ...st, finished: true, correct: isCorrect } });
                  }}
                >
                  Rätta
                </Button>
              ) : (
                <>
                  {quizState[block.id]?.correct ? (
                    <Alert className="border-green-600/30">
                      <AlertTitle>Rätt! 🎉</AlertTitle>
                      <AlertDescription>Bra jobbat!</AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-red-600/30">
                      <AlertTitle>Nästan!</AlertTitle>
                      <AlertDescription>Försök igen.</AlertDescription>
                    </Alert>
                  )}
                  {(!quizState[block.id]?.correct && block.allowRetry) && (
                    <Button variant="outline" onClick={() => setQuizState({ ...quizState, [block.id]: { chosen: [], finished: false, correct: false } })}>
                      Försök igen
                    </Button>
                  )}
                  {quizState[block.id]?.correct && (
                    <Button onClick={goNextBlock}>
                      Fortsätt
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-between text-xs text-muted-foreground">
        <div>Avsnitt {sectionIndex + 1} av {story.sections.length}</div>
        <div>Block {blockIndex + 1} av {section.blocks.length}</div>
        <Button variant="ghost" size="sm" onClick={restart}><EyeOff className="w-4 h-4 mr-1"/>Börja om</Button>
      </CardFooter>
    </Card>
  );
}

/**
 * ------------------------------------------------------
 * Huvudkomponent: LessonAdmin
 * ------------------------------------------------------
 */

export default function LessonAdmin() {
  const [story, setStory] = useState<Story>({
    id: uuid(),
    title: "Min lektion",
    description: "",
    character: "🤖",
    sections: [createSection("Introduktion")],
  });

  const [selectedSection, setSelectedSection] = useState(0);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const currentSection = story.sections[selectedSection];
  const currentBlock = currentSection?.blocks[selectedBlockIndex];

  const validation = useMemo(() => validateStory(story), [story]);

  const addSection = () => {
    const s = createSection(`Avsnitt ${story.sections.length + 1}`);
    setStory({ ...story, sections: [...story.sections, s] });
    setSelectedSection(story.sections.length);
    setSelectedBlockIndex(0);
  };

  const removeSection = (idx: number) => {
    const copy = [...story.sections];
    copy.splice(idx, 1);
    setStory({ ...story, sections: copy });
    setSelectedSection(Math.max(0, idx - 1));
    setSelectedBlockIndex(0);
  };

  const addBlock = (type: Block["type"], position?: number) => {
    const blk = type === "dialogue" ? createDialogue() : type === "quiz" ? createQuiz() : createPause();
    const sec = story.sections[selectedSection];
    const blocks = [...sec.blocks];
    const insertAt = typeof position === "number" ? position : blocks.length;
    blocks.splice(insertAt, 0, blk);
    updateSectionBlocks(selectedSection, blocks);
    setSelectedBlockIndex(insertAt);
  };

  const updateSectionBlocks = (secIdx: number, newBlocks: Block[]) => {
    const next = story.sections.map((s, i) => (i === secIdx ? { ...s, blocks: newBlocks } : s));
    setStory({ ...story, sections: next });
  };

  const updateBlock = (idx: number, patch: Block) => {
    const sec = story.sections[selectedSection];
    const blocks = sec.blocks.map((b, i) => (i === idx ? patch : b));
    updateSectionBlocks(selectedSection, blocks);
  };

  const removeBlock = (idx: number) => {
    const sec = story.sections[selectedSection];
    const blocks = sec.blocks.filter((_, i) => i !== idx);
    updateSectionBlocks(selectedSection, blocks);
    setSelectedBlockIndex(Math.max(0, idx - 1));
  };

  const moveBlock = (from: number, to: number) => {
    const sec = story.sections[selectedSection];
    const blocks = move(sec.blocks, from, to);
    updateSectionBlocks(selectedSection, blocks);
    setSelectedBlockIndex(to);
  };

  const exportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(story, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `${story.title || "lektion"}.json`;
    a.click();
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setStory(parsed);
        setSelectedSection(0);
        setSelectedBlockIndex(0);
      } catch (e) {
        alert("Kunde inte läsa filen (ogiltig JSON)");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="container mx-auto max-w-6xl py-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Vänsterkolumn: Metadata + sektioner */}
        <div className="md:w-1/3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Allmänt</CardTitle>
              <CardDescription>Grundinställningar för lektionen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input value={story.title} onChange={(e) => setStory({ ...story, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Beskrivning</Label>
                <Textarea rows={2} value={story.description} onChange={(e) => setStory({ ...story, description: e.target.value })} />
              </div>
              <CharacterLibrary currentImage={story.character} onCharacterSelect={(val) => setStory({ ...story, character: val })} />
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={exportJson}><Download className="w-4 h-4 mr-1"/>Exportera JSON</Button>
              <label className="inline-flex items-center">
                <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files && importJson(e.target.files[0])} />
                <Button variant="outline"><Upload className="w-4 h-4 mr-1"/>Importera</Button>
              </label>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sektioner</CardTitle>
              <CardDescription>Bygg upp berättelsen i hanterbara avsnitt.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {story.sections.map((s, i) => (
                <div key={s.id} className={`p-3 rounded-lg border flex items-center gap-2 ${i === selectedSection ? "bg-muted" : ""}`}>
                  <Button size="icon" variant="ghost" onClick={() => i > 0 && setStory({ ...story, sections: move(story.sections, i, i - 1) })}><ArrowUp className="w-4 h-4"/></Button>
                  <Button size="icon" variant="ghost" onClick={() => i < story.sections.length - 1 && setStory({ ...story, sections: move(story.sections, i, i + 1) })}><ArrowDown className="w-4 h-4"/></Button>
                  <Input value={s.title} onChange={(e) => setStory({ ...story, sections: story.sections.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x) })} />
                  <Button size="icon" variant={i === selectedSection ? "default" : "outline"} onClick={() => { setSelectedSection(i); setSelectedBlockIndex(0); }}>
                    <Eye className="w-4 h-4"/>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => removeSection(i)}>
                    <Trash2 className="w-4 h-4"/>
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addSection}><Plus className="w-4 h-4 mr-1"/>Lägg till sektion</Button>
            </CardContent>
          </Card>

          {validation.errors.length > 0 && (
            <Alert>
              <AlertTitle>Kontrollera innehållet</AlertTitle>
              <AlertDescription>
                <ul className="list-disc ml-5 space-y-1">
                  {validation.errors.map((e, i) => (<li key={i}>{e}</li>))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Högerkolumn: Blocklista + redigerare + preview */}
        <div className="md:w-2/3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{currentSection?.title || "(ingen sektion)"}</CardTitle>
              <CardDescription>Block i vald sektion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {currentSection?.blocks.map((b, i) => (
                  <div key={b.id} className={`p-3 rounded-lg border flex items-center gap-2 ${i === selectedBlockIndex ? "bg-muted" : ""}`}>
                    <Badge variant="secondary" className="w-20 justify-center capitalize">{b.type}</Badge>
                    <div className="flex-1 text-sm truncate">
                      {b.type === "dialogue" && (<span><strong>{(b as DialogueBlock).speaker}:</strong> {(b as DialogueBlock).text.slice(0, 60) || "(tom)"}</span>)}
                      {b.type === "quiz" && (<span>Fråga: {(b as QuizBlock).question.slice(0, 60) || "(tom)"}</span>)}
                      {b.type === "pause" && (<span>Paus – {(b as PauseBlock).label || "Fortsätt"}</span>)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => i > 0 && moveBlock(i, i - 1)}><ArrowUp className="w-4 h-4"/></Button>
                      <Button size="icon" variant="ghost" onClick={() => i < (currentSection?.blocks.length ?? 1) - 1 && moveBlock(i, i + 1)}><ArrowDown className="w-4 h-4"/></Button>
                      <Button size="icon" variant={i === selectedBlockIndex ? "default" : "outline"} onClick={() => setSelectedBlockIndex(i)}><Eye className="w-4 h-4"/></Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost"><MoreHorizontal className="w-4 h-4"/></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => addBlock("dialogue", i + 1)}>Infoga dialog under</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addBlock("quiz", i + 1)}>Infoga quiz under</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addBlock("pause", i + 1)}>Infoga paus under</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => removeBlock(i)}>Ta bort block</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <Button variant="outline" onClick={() => addBlock("dialogue")}><Plus className="w-4 h-4 mr-1"/>Lägg till dialog</Button>
                <Button variant="outline" onClick={() => addBlock("quiz")}><Plus className="w-4 h-4 mr-1"/>Lägg till quiz</Button>
                <Button variant="outline" onClick={() => addBlock("pause")}><Plus className="w-4 h-4 mr-1"/>Lägg till paus</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Redigera block</CardTitle>
              <CardDescription>Justera innehåll och inställningar.</CardDescription>
            </CardHeader>
            <CardContent>
              {!currentBlock && <p>Välj ett block i listan.</p>}
              {currentBlock && (
                <Tabs defaultValue={currentBlock.type} value={currentBlock.type}>
                  <TabsList>
                    <TabsTrigger value="dialogue">Dialog</TabsTrigger>
                    <TabsTrigger value="quiz">Quiz</TabsTrigger>
                    <TabsTrigger value="pause">Paus</TabsTrigger>
                  </TabsList>

                  <TabsContent value="dialogue">
                    {currentBlock.type === "dialogue" && (
                      <DialogueEditor block={currentBlock} onChange={(b) => updateBlock(selectedBlockIndex, b)} />
                    )}
                  </TabsContent>

                  <TabsContent value="quiz">
                    {currentBlock.type === "quiz" && (
                      <QuizEditor block={currentBlock} onChange={(b) => updateBlock(selectedBlockIndex, b)} />
                    )}
                  </TabsContent>

                  <TabsContent value="pause">
                    {currentBlock.type === "pause" && (
                      <PauseEditor block={currentBlock} onChange={(b) => updateBlock(selectedBlockIndex, b)} />
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <StoryPlayer story={story} />
            <Card>
              <CardHeader>
                <CardTitle>JSON-output</CardTitle>
                <CardDescription>Kan sparas i backend/databas.</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[360px]">{JSON.stringify(story, null, 2)}</pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ------------------------------------------------------
 * Validering
 * ------------------------------------------------------
 */

function validateStory(story: Story): { errors: string[] } {
  const errors: string[] = [];
  if (!story.title.trim()) errors.push("Lektion saknar titel.");
  story.sections.forEach((s, si) => {
    if (!s.title.trim()) errors.push(`Sektion ${si + 1} saknar titel.`);
    if (s.blocks.length === 0) errors.push(`Sektion ${si + 1} har inga block.`);
    s.blocks.forEach((b, bi) => {
      if (b.type === "dialogue") {
        const d = b as DialogueBlock;
        if (!d.speaker.trim()) errors.push(`Sektion ${si + 1}, block ${bi + 1}: Talare saknas.`);
        if (!d.text.trim()) errors.push(`Sektion ${si + 1}, block ${bi + 1}: Dialogtext saknas.`);
      }
      if (b.type === "quiz") {
        const q = b as QuizBlock;
        if (!q.question.trim()) errors.push(`Sektion ${si + 1}, block ${bi + 1}: Frågetext saknas.`);
        if (q.answers.length === 0) errors.push(`Sektion ${si + 1}, block ${bi + 1}: Minst ett svar krävs.`);
        if (!q.answers.some((a) => a.correct)) errors.push(`Sektion ${si + 1}, block ${bi + 1}: Markera minst ett rätt svar.`);
      }
    });
  });
  return { errors };
}

// Export the CharacterLibrary function for backward compatibility
export { CharacterLibrary };
import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Download, Upload, Settings, Sun, Moon, CheckCircle2, XCircle, Info } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// -----------------------------
// INNEHÅLL & FRÅGOR (åk 4–6)
// -----------------------------

const SECTIONS = [
  {
    id: 1,
    title: "Hamsun jämförs med andra författare",
    text: `Since the death of Ibsen and Strindberg, Hamsun is undoubtedly the foremost creative writer of the Scandinavian countries. Those approaching most nearly to his position are probably Selma Lagerlöf in Sweden and Henrik Pontoppidan in Denmark. Both these, however, seem to have less than he of that width of outlook, validity of interpretation and authority of tone that made the greater masters what they were.`,
    vocab: [
      { w: "foremost", se: "främst; viktigast" },
      { w: "approaching", se: "närmar sig (nivån)" },
      { w: "validity", se: "giltighet" },
      { w: "interpretation", se: "tolkning" },
      { w: "authority of tone", se: "auktoritativ ton" },
    ],
    questions: [
      {
        id: "1-1",
        type: "mcq",
        prompt: "Vilka två författare nämns som nästan lika viktiga som Hamsun?",
        options: [
          "Selma Lagerlöf och Henrik Pontoppidan",
          "August Strindberg och Leo Tolstoj",
          "Henrik Ibsen och Fjodor Dostojevskij",
          "Astrid Lindgren och Karen Blixen",
        ],
        correctIndex: 0,
      },
      {
        id: "1-2",
        type: "open",
        prompt: "Vad tror du att ordet 'foremost' betyder i sammanhanget? Förklara med egna ord på svenska.",
      },
    ],
  },
  {
    id: 2,
    title: "Ryktet utanför Skandinavien",
    text: `His reputation is not confined to his own country or the two Scandinavian sister nations. It spread long ago over the rest of Europe, taking deepest roots in Russia, where several editions of his collected works have already appeared, and where he is spoken of as the equal of Tolstoy and Dostoyevski. The enthusiasm of this approval is a characteristic symptom that throws interesting light on Russia as well as on Hamsun.`,
    vocab: [
      { w: "reputation", se: "rykte" },
      { w: "confined", se: "begränsat" },
      { w: "collected works", se: "samlade verk" },
      { w: "enthusiasm", se: "entusiasm" },
    ],
    questions: [
      {
        id: "2-1",
        type: "mcq",
        prompt: "I vilket land slog Hamsuns böcker särskilt igenom?",
        options: ["Ryssland", "Spanien", "Norge", "Italien"],
        correctIndex: 0,
      },
      {
        id: "2-2",
        type: "open",
        prompt: "Varför kan det vara betydelsefullt att Hamsun jämförs med Tolstoj och Dostojevskij?",
      },
    ],
  },
  {
    id: 3,
    title: "En annorlunda personlighet",
    text: `Hearing of it, one might expect him to prove a man of the masses, full of keen social consciousness. Instead, he must be classed as an individualistic romanticist and a highly subjective aristocrat, whose foremost passion in life is violent, defiant deviation from everything average and ordinary. He fears and flouts the dominance of the many, and his heroes, who are nothing but slightly varied images of himself, are invariably marked by an originality of speech and action that borders on the eccentric.`,
    vocab: [
      { w: "masses", se: "massan (folket)" },
      { w: "individualistic", se: "individualistisk" },
      { w: "aristocrat", se: "aristokrat" },
      { w: "deviation", se: "avvikelse" },
      { w: "eccentric", se: "excentrisk; udda" },
    ],
    questions: [
      {
        id: "3-1",
        type: "mcq",
        prompt: "Hur beskrivs Hamsuns attityd till 'det vanliga'?",
        options: [
          "Han gillar allt som är vanligt",
          "Han avviker och trotsar det vanliga",
          "Han bryr sig inte om skrivande",
          "Han följer alltid massan",
        ],
        correctIndex: 1,
      },
      {
        id: "3-2",
        type: "open",
        prompt: "Vad innebär det att en hjälte är 'excentrisk'? Ge ett eget exempel.",
      },
    ],
  },
  {
    id: 4,
    title: "En själ som vågar vara sig själv",
    text: `In all the literature known to me, there is no writer who appears more ruthlessly and fearlessly himself, and the self thus presented to us is as paradoxical and rebellious as it is poetic and picturesque. Such a nature, one would think, must be the final blossoming of powerful hereditary tendencies, converging silently through numerous generations to its predestined climax. All we know is that Hamsun's forebears were sturdy Norwegian peasant folk, said only to be differentiated from their environment by a certain independence of character that showed itself in a dislike to authority and a reluctance to follow the crowd.`,
    vocab: [
      { w: "ruthlessly", se: "hänsynslöst" },
      { w: "fearlessly", se: "orädd; modigt" },
      { w: "hereditary", se: "ärftlig" },
      { w: "forebears", se: "förfäder" },
      { w: "environment", se: "miljö" },
    ],
    questions: [
      {
        id: "4-1",
        type: "mcq",
        prompt: "Vad sägs om Hamsuns familjebakgrund?",
        options: [
          "De var norska bönder",
          "De var kungligheter",
          "De var stadsbor från Paris",
          "Det står inget alls om dem",
        ],
        correctIndex: 0,
      },
      { id: "4-2", type: "open", prompt: "Hur kan miljö och uppväxt påverka en författare?" },
    ],
  },
  {
    id: 5,
    title: "Födelse och Nordland",
    text: `Hamsun was born on Aug. 4, 1860, in one of the sunny valleys of central Norway. From there his parents moved when he was only four to settle in the far northern district of Lofoden--that land of extremes, where the year, and not the day, is evenly divided between darkness and light; where winter is a long dreamless sleep, and summer a passionate dream without sleep; where land and sea meet and intermingle so gigantically that man is all but crushed between the two--or else lifted by them to titanic dreams and titanic self-assertion.`,
    vocab: [
      { w: "settle", se: "slå sig ner" },
      { w: "extremes", se: "ytterligheter" },
      { w: "intermingle", se: "blandas samman" },
      { w: "titanic", se: "oerhört stor; väldig" },
    ],
    questions: [
      {
        id: "5-1",
        type: "mcq",
        prompt: "Vilket område flyttade familjen till när Hamsun var liten?",
        options: ["Lofoten i norr", "Stockholm", "Köpenhamn", "Island"],
        correctIndex: 0,
      },
      {
        id: "5-2",
        type: "open",
        prompt: "Hur beskrivs skillnaden mellan sommar och vinter i Nordland?",
      },
    ],
  },
  {
    id: 6,
    title: "Nordland i hans verk",
    text: `The Northland, with its glaring lights and black shadows, its unearthly joys and abysmal despairs, is present and dominant in every line that Hamsun ever wrote. In that country his best tales and dramas are laid. By that country his heroes are stamped wherever they roam. Out of that country they draw their principal claims to probability. Only in that country do they seem quite at home. Today we know, however, that the pathological case represents nothing but an extension of traits that exist in normal proportion in the average human being.`,
    vocab: [
      { w: "dominant", se: "dominerande" },
      { w: "roam", se: "vandra; röra sig omkring" },
      { w: "traits", se: "drag; egenskaper" },
      { w: "proportion", se: "proportion; förhållande" },
    ],
    questions: [
      {
        id: "6-1",
        type: "mcq",
        prompt: "Vad betyder att Nordland 'finns i varje rad' Hamsun skrev?",
        options: [
          "Att han bara skrev fakta",
          "Att platsen påverkar nästan allt i hans berättelser",
          "Att han inte gillade Nordland",
          "Att han skrev på ryska",
        ],
        correctIndex: 1,
      },
      { id: "6-2", type: "open", prompt: "Varför kan en plats ge 'egenskaper' åt karaktärer i en bok?" },
    ],
  },
  {
    id: 7,
    title: "Konstnären och vagabonden",
    text: `The artist and the vagabond seem equally to have been in the blood of Hamsun from the very start. Apprenticed to a shoemaker, he used his scant savings to arrange for the private printing of a long poem and a short novel produced at the age of eighteen, when he was still signing himself Knud Pedersen Hamsund. This done, he abruptly quit his apprenticeship and entered on that period of restless roving through trades and continents which lasted until his first real artistic success was achieved with "Hunger" at the age of thirty.`,
    vocab: [
      { w: "apprenticed", se: "i lärlingstid" },
      { w: "scant", se: "knapp; liten" },
      { w: "abruptly", se: "tvärt; plötsligt" },
      { w: "roving", se: "kringflackande" },
    ],
    questions: [
      {
        id: "7-1",
        type: "mcq",
        prompt: "Vad heter Hamsuns genombrottsverk?",
        options: ["Hunger", "Svält", "Nordland", "Ibsen"],
        correctIndex: 0,
      },
      { id: "7-2", type: "open", prompt: "Varför kan en författare skriva många hjältar i samma ålder som hen själv?" },
    ],
  },
  {
    id: 8,
    title: "USA och tidiga yrken",
    text: `Before he reached those heights, he had tried life as coal-heaver and school teacher, as road-mender and surveyor's attendant, as farm hand and street-car conductor, as lecturer and free-lance journalist, as tourist and emigrant. Twice he visited this country during the middle eighties, working chiefly on the plains of North Dakota and in the streets of Chicago. Twice during that time he returned to his own country and passed through the experiences pictured in "Hunger." The America of that period he utterly failed to understand, and his distorted impressions of it have furnished him with material for some of his most powerful and most disagreeable books.`,
    vocab: [
      { w: "emigrant", se: "utvandrare" },
      { w: "surveyor", se: "lantmätare" },
      { w: "utterly", se: "fullständigt" },
      { w: "distorted", se: "förvrängd" },
    ],
    questions: [
      {
        id: "8-1",
        type: "mcq",
        prompt: "Vilka två platser i USA nämns i texten?",
        options: [
          "North Dakota och Chicago",
          "New York och Los Angeles",
          "Boston och Miami",
          "Texas och Seattle",
        ],
        correctIndex: 0,
      },
      {
        id: "8-2",
        type: "open",
        prompt: "Varför tror du att Hamsun inte 'fick kontakt' med det nya landet?",
      },
    ],
  },
];

// -----------------------------
// Hjälpfunktioner
// -----------------------------

const STORAGE_KEY = "hamsun_reader_v1";

function useLocalState(key: string, initial: any) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

function highlightVocab(text: string, vocab: any[], showHints: boolean, onWordClick: (item: any) => void) {
  if (!showHints || !vocab?.length) return text;
  const words = vocab.map((v) => v.w).sort((a, b) => b.length - a.length);
  const regex = new RegExp(`\\b(${words.map((w) => w.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|")})\\b`, "gi");
  const parts: any[] = [];
  let lastIndex = 0;
  text.replace(regex, (match, p1, offset) => {
    if (lastIndex < offset) parts.push(text.slice(lastIndex, offset));
    const item = vocab.find((v) => v.w.toLowerCase() === match.toLowerCase());
    parts.push(
      <Popover key={offset}>
        <PopoverTrigger asChild>
          <button
            className="underline decoration-dotted underline-offset-4 focus:outline-none rounded px-1 hover:bg-muted"
            onClick={() => onWordClick?.(item)}
          >
            {match}
          </button>
        </PopoverTrigger>
        <PopoverContent className="max-w-xs text-sm">{item?.se || "(ingen förklaring)"}</PopoverContent>
      </Popover>
    );
    lastIndex = offset + match.length;
    return match;
  });
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// -----------------------------
// UI-KOMPONENTER
// -----------------------------

function Header({ progress, theme, setTheme }: { progress: number, theme: string, setTheme: (theme: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 border-b bg-background sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <Link href="/lasforstaelse" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <span>←</span> Tillbaka till läsförståelse
        </Link>
        <div className="w-px h-6 bg-border"></div>
        <BookOpen className="w-6 h-6" />
        <div>
          <div className="text-lg font-semibold leading-none">Hamsun – Läsförståelse (åk 4–6)</div>
          <div className="text-xs text-muted-foreground">E‑reader med frågor, ordförklaringar och sparad progression</div>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-4 min-w-[280px]">
        <Progress value={progress} className="w-48" />
        <span className="text-sm text-muted-foreground whitespace-nowrap">{Math.round(progress)}% klar</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant={theme === "light" ? "secondary" : "outline"} size="icon" onClick={() => setTheme("light")} title="Ljust läge">
          <Sun className="w-4 h-4" />
        </Button>
        <Button variant={theme === "sepia" ? "secondary" : "outline"} size="sm" onClick={() => setTheme("sepia")} title="Sepia">
          Sepia
        </Button>
        <Button variant={theme === "dark" ? "secondary" : "outline"} size="icon" onClick={() => setTheme("dark")} title="Mörkt läge">
          <Moon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function Controls({ sectionIndex, setSectionIndex, total, prefs, setPrefs, onExport, onImport }: any) {
  const canPrev = sectionIndex > 0;
  const canNext = sectionIndex < total - 1;
  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Inställningar</CardTitle>
        <CardDescription>Justera läsläge och navigera mellan avsnitt</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSectionIndex((i: number) => Math.max(0, i - 1))} disabled={!canPrev}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Föregående
          </Button>
          <div className="text-sm text-muted-foreground">Avsnitt {sectionIndex + 1} / {total}</div>
          <Button variant="default" size="sm" onClick={() => setSectionIndex((i: number) => Math.min(total - 1, i + 1))} disabled={!canNext}>
            Nästa <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center justify-between gap-2 p-2 rounded border">
            <div>
              <div className="text-sm font-medium">Visa ordförklaringar</div>
              <div className="text-xs text-muted-foreground">Klicka på understrukna ord</div>
            </div>
            <Switch checked={prefs.showVocab} onCheckedChange={(v: boolean) => setPrefs({ ...prefs, showVocab: v })} />
          </div>
          <div className="flex items-center justify-between gap-2 p-2 rounded border">
            <div>
              <div className="text-sm font-medium">Större text</div>
              <div className="text-xs text-muted-foreground">{prefs.fontSize}%</div>
            </div>
            <div className="w-40"><Slider value={[prefs.fontSize]} min={90} max={140} step={5} onValueChange={(v: number[]) => setPrefs({ ...prefs, fontSize: v[0] })} /></div>
          </div>
          <div className="flex items-center justify-between gap-2 p-2 rounded border">
            <div>
              <div className="text-sm font-medium">Ökat radavstånd</div>
              <div className="text-xs text-muted-foreground">{prefs.lineHeight}%</div>
            </div>
            <div className="w-40"><Slider value={[prefs.lineHeight]} min={100} max={200} step={10} onValueChange={(v: number[]) => setPrefs({ ...prefs, lineHeight: v[0] })} /></div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="w-4 h-4 mr-1" /> Exportera svar
          </Button>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <Upload className="w-4 h-4" /> Importera
            <input type="file" accept="application/json" className="hidden" onChange={onImport} />
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

function Question({ q, value, setValue }: { q: any, value: any, setValue: (value: any) => void }) {
  const [checked, setChecked] = useState<boolean | null>(null);

  useEffect(() => {
    setChecked(null);
  }, [q?.id]);

  if (q.type === "mcq") {
    return (
      <Card className="">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{q.prompt}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {q.options.map((opt: string, idx: number) => {
            const selected = value === idx;
            const correct = q.correctIndex === idx;
            const show = checked !== null;
            return (
              <button
                key={idx}
                className={`w-full text-left p-2 rounded border hover:bg-accent ${selected ? "border-primary" : ""} ${show && correct ? "bg-green-50" : ""} ${show && selected && !correct ? "bg-red-50" : ""}`}
                onClick={() => setValue(idx)}
              >
                <div className="flex items-center justify-between">
                  <span>{opt}</span>
                  {show && correct && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  {show && selected && !correct && <XCircle className="w-4 h-4 text-red-600" />}
                </div>
              </button>
            );
          })}
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="secondary" onClick={() => setChecked(true)}>Kolla svar</Button>
            {checked !== null && (
              <Badge variant={checked && value === q.correctIndex ? "default" : "destructive"}>
                {value === q.correctIndex ? "Rätt!" : "Försök igen"}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  // Open question
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{q.prompt}</CardTitle>
        <CardDescription>Skriv ditt svar med hela meningar.</CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          value={value || ""}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Skriv ditt svar här…"
        />
      </CardContent>
    </Card>
  );
}

function Sidebar({ section, answers, setAnswers }: { section: any, answers: any, setAnswers: (fn: (prev: any) => any) => void }) {
  return (
    <div className="space-y-3">
      {section.questions.map((q: any) => (
        <Question
          key={q.id}
          q={q}
          value={answers[q.id]}
          setValue={(v: any) => setAnswers((prev: any) => ({ ...prev, [q.id]: v }))}
        />
      ))}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tips</CardTitle>
          <CardDescription>Använd texten till vänster för att hitta ledtrådar.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div className="flex items-start gap-2"><Info className="w-4 h-4 mt-0.5" />
            <span>Markera nyckelord när du läser. Svara sedan på frågorna.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------
// Huvudkomponent
// -----------------------------

export default function ReadingComprehension() {
  const [sectionIndex, setSectionIndex] = useLocalState("sectionIndex", 0);
  const [answers, setAnswers] = useLocalState("answers", {});
  const [prefs, setPrefs] = useLocalState("prefs", { showVocab: true, fontSize: 100, lineHeight: 140 });
  const [theme, setTheme] = useLocalState("theme", "light");

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("theme-light", "theme-sepia", "theme-dark");
    html.classList.add(`theme-${theme}`);
  }, [theme]);

  const section = SECTIONS[sectionIndex];

  const progress = useMemo(() => {
    const total = SECTIONS.reduce((acc, s) => acc + s.questions.length, 0);
    const answered = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== "").length;
    return (answered / total) * 100;
  }, [answers]);

  function handleExport() {
    const payload = { answers, prefs, sectionIndex, timestamp: new Date().toISOString() };
    download("hamsun_svar.json", JSON.stringify(payload, null, 2));
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data.answers) setAnswers(data.answers);
        if (data.prefs) setPrefs(data.prefs);
        if (typeof data.sectionIndex === "number") setSectionIndex(data.sectionIndex);
      } catch (err) {
        alert("Kunde inte läsa filen. Kontrollera att det är en giltig JSON.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <TooltipProvider>
      <div className={`min-h-screen ${theme === "dark" ? "bg-neutral-900 text-neutral-100" : theme === "sepia" ? "bg-amber-50 text-stone-900" : "bg-background"}`}>
        <Header progress={progress} theme={theme} setTheme={setTheme} />

        <div className="max-w-6xl mx-auto p-4">
          <Controls
            sectionIndex={sectionIndex}
            setSectionIndex={setSectionIndex}
            total={SECTIONS.length}
            prefs={prefs}
            setPrefs={setPrefs}
            onExport={handleExport}
            onImport={handleImport}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Läsrutan */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{section.title}</CardTitle>
                <CardDescription>Avsnitt {sectionIndex + 1} av {SECTIONS.length}</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="prose max-w-none leading-relaxed"
                  style={{ fontSize: `${prefs.fontSize}%`, lineHeight: `${prefs.lineHeight}%` }}
                >
                  <p className="whitespace-pre-wrap">
                    {highlightVocab(section.text, section.vocab, prefs.showVocab, () => {})}
                  </p>
                </div>

                {section.vocab?.length ? (
                  <div className="mt-4">
                    <div className="text-sm font-semibold mb-2">Ordlista i avsnittet</div>
                    <div className="flex flex-wrap gap-2">
                      {section.vocab.map((v: any, i: number) => (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="cursor-help">{v.w}</Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-sm">{v.se}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex justify-between items-center mt-6">
                  <Button variant="outline" size="sm" onClick={() => setSectionIndex((i: number) => Math.max(0, i - 1))} disabled={sectionIndex === 0}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Föregående
                  </Button>
                  <div className="text-xs text-muted-foreground">Läs noga och använd ordförklaringarna</div>
                  <Button variant="default" size="sm" onClick={() => setSectionIndex((i: number) => Math.min(SECTIONS.length - 1, i + 1))} disabled={sectionIndex === SECTIONS.length - 1}>
                    Nästa <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Frågor */}
            <div>
              <Sidebar section={section} answers={answers} setAnswers={setAnswers} />
            </div>
          </div>

          {/* Sammanställning */}
          <div className="mt-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Din progression</CardTitle>
                <CardDescription>Överblick över hur många frågor du svarat på</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 text-sm">
                  {SECTIONS.map((s, idx) => {
                    const total = s.questions.length;
                    const done = s.questions.filter((q: any) => answers[q.id] !== undefined && answers[q.id] !== "").length;
                    const pct = Math.round((done / total) * 100);
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSectionIndex(idx)}
                        className={`p-2 rounded border text-left hover:bg-accent ${idx === sectionIndex ? "border-primary" : ""}`}
                      >
                        <div className="font-medium truncate">{s.title}</div>
                        <div className="text-xs text-muted-foreground">{done}/{total} frågor • {pct}%</div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style>{`
        .theme-sepia .prose :where(p, li, h1,h2,h3){ color: #1f2937; }
        .theme-dark .prose :where(p, li, h1,h2,h3){ color: #e5e7eb; }
      `}</style>
    </TooltipProvider>
  );
}
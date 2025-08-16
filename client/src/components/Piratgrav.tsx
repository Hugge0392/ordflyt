import React, { useMemo, useState } from "react";

// Piratgräv – Enkel nivå
// Ändringar:
// - Hinkar ersatta med skattkista (💰)
// - Parasolliconer borttagna
// - Endast en svårighetsgrad
// - Regler borttagna

const shuffle = (arr: any[]) => arr
  .map((a) => [Math.random(), a])
  .sort((a, b) => a[0] - b[0])
  .map(([, a]) => a);

// true => substantiv, false => inte substantiv
const BASE_WORDS = [
  { w: "pirat", n: true },
  { w: "karta", n: true },
  { w: "skatt", n: true },
  { w: "spade", n: true },
  { w: "hatt", n: true },
  { w: "strand", n: true },
  { w: "skepp", n: true },
  { w: "papegoja", n: true },
  { w: "kompass", n: true },
  { w: "kapten", n: true },
  { w: "tunna", n: true },
  { w: "guld", n: true },
  { w: "ö", n: true },
  { w: "flaska", n: true },
  { w: "sandslott", n: true },
  { w: "kikare", n: true },
  { w: "ananas", n: true },

  { w: "springa", n: false },
  { w: "simma", n: false },
  { w: "segla", n: false },
  { w: "sjunga", n: false },
  { w: "hoppa", n: false },
  { w: "snabb", n: false },
  { w: "röd", n: false },
  { w: "blå", n: false },
  { w: "liten", n: false },
  { w: "glad", n: false },
  { w: "stark", n: false },
  { w: "vakna", n: false },
  { w: "under", n: false },
  { w: "på", n: false },
  { w: "nära", n: false },
];

const makeWordDeck = () => {
  const base = [...BASE_WORDS];
  const factor = 3;
  const deck = [];
  for (let i = 0; i < factor; i++) deck.push(...shuffle(base));
  return deck;
};

interface PiratgravProps {
  moment?: any;
  onNext?: () => void;
}

export default function Piratgrav({ moment, onNext }: PiratgravProps) {
  // Use custom words from moment config if available, otherwise fall back to BASE_WORDS
  const customWords = moment?.config?.words || [];
  const wordsToUse = customWords.length > 0 ? customWords : BASE_WORDS;
  
  const [deck] = useState(() => {
    const base = [...wordsToUse];
    const factor = 3;
    const deck = [];
    for (let i = 0; i < factor; i++) deck.push(...shuffle(base));
    return deck;
  });
  
  const [cursor, setCursor] = useState(0);
  const [revealedWord, setRevealedWord] = useState<any>(null);
  const [dug, setDug] = useState(Array(12).fill(false));
  const [coins, setCoins] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [streak, setStreak] = useState(0);
  const [message, setMessage] = useState("Klicka på en sandhög för att gräva!");
  const [round, setRound] = useState(1);
  const [gameCompleted, setGameCompleted] = useState(false);

  const tiles = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  function resetBoard(keepScore = false) {
    setDug(Array(12).fill(false));
    setRevealedWord(null);
    setMessage("Klicka på en sandhög för att gräva!");
    if (!keepScore) {
      setCoins(0);
      setHearts(3);
      setStreak(0);
      setRound(1);
      setGameCompleted(false);
    }
  }

  function nextWord() {
    const next = deck[cursor % deck.length];
    setCursor((c) => c + 1);
    return next;
  }

  function onTileClick(i: number) {
    if (revealedWord || dug[i] || hearts <= 0) return;
    const next = nextWord();
    const newDug = [...dug];
    newDug[i] = true;
    setDug(newDug);
    setRevealedWord(next);
    setMessage("Är det ett substantiv?");
  }

  function answer(isNoun: boolean) {
    if (!revealedWord) return;
    const correct = revealedWord.n === isNoun;

    if (correct) {
      const bonus = 1 + Math.floor(streak / 3);
      setCoins((c) => c + 1 + bonus);
      setStreak((s) => s + 1);
      setMessage("Rätt! 💰 +" + (1 + bonus));
    } else {
      setHearts((h) => Math.max(0, h - 1));
      setStreak(0);
      setMessage("Oj! Inte riktigt. Försök igen.");
    }

    setRevealedWord(null);

    const done = dug.every(Boolean);
    if (done) {
      if (round >= 3 || coins >= 10) {
        setGameCompleted(true);
        setMessage("Grattis! Du har klarat piratgrävspelet!");
      } else {
        setRound((r) => r + 1);
        setDug(Array(12).fill(false));
        setMessage("Ny runda! Gräv vidare efter fler ord.");
      }
    }
  }

  const gameOver = hearts <= 0;

  const Heart = ({ filled }: { filled: boolean }) => (
    <span aria-label={filled ? "hjärta" : "tomt hjärta"} title={filled ? "Liv" : "Inget liv"}>
      {filled ? "❤️" : "🤍"}
    </span>
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-200 via-sky-300 to-amber-100 text-slate-800">
      {/* Header */}
      <header className="mx-auto max-w-5xl px-4 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <span>🏴‍☠️</span>
            <span>Piratgräv</span>
          </h1>
          <div className="flex items-center gap-4 text-lg">
            <div className="flex items-center gap-2" aria-label="poäng">
              <span role="img" aria-label="skattkista">💰</span> <span className="font-bold">{coins}</span>
            </div>
            <div className="flex items-center gap-1" aria-label="liv">
              <Heart filled={hearts >= 1} />
              <Heart filled={hearts >= 2} />
              <Heart filled={hearts >= 3} />
            </div>
            <div className="hidden sm:flex items-center gap-2" aria-label="streak">
              <span>🔥</span>
              <span className="font-bold">{streak}</span>
            </div>
          </div>
        </div>
        <p className="mt-1 text-slate-700">Klicka på sandhögarna för att gräva fram ord. Svara om ordet är ett substantiv.</p>
      </header>

      {/* Kontrollrad */}
      <div className="mx-auto max-w-5xl px-4 pb-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <button
              className="rounded-2xl px-4 py-2 bg-amber-400 hover:bg-amber-300 shadow font-bold"
              onClick={() => resetBoard(false)}
            >
              🔄 Börja om
            </button>
          </div>
        </div>
      </div>

      {/* Spelyta */}
      <main className="mx-auto max-w-5xl px-4 pb-16">
        <div className="relative rounded-3xl p-4 sm:p-6 bg-gradient-to-b from-amber-100 to-amber-200 shadow-inner">
          <div className="absolute -top-6 right-4 text-3xl select-none">🏝️</div>
          <div className="absolute -bottom-5 left-3 text-3xl select-none">🧭</div>
          <div className="absolute -bottom-6 right-6 text-3xl select-none">💰</div>

          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Runda {round}</div>
            <div className="text-sm italic text-slate-700">{message}</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {tiles.map((i) => (
              <button
                key={i}
                onClick={() => onTileClick(i)}
                disabled={dug[i] || gameOver}
                className={
                  "relative h-28 sm:h-32 rounded-3xl shadow-inner transition transform active:scale-95 " +
                  (dug[i]
                    ? "bg-amber-300/70 border border-amber-400 cursor-default"
                    : "bg-amber-200 hover:bg-amber-300 border border-amber-300 cursor-pointer")
                }
                aria-label={dug[i] ? "Grävd sandhög" : "Sandhög – klicka för att gräva"}
              >
                <div className="absolute inset-0 flex items-end justify-center p-3">
                  <div className="text-5xl select-none">{dug[i] ? "💰" : "🏝️"}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6">
            {gameCompleted ? (
              <div className="rounded-2xl bg-white p-4 shadow text-center">
                <div className="text-3xl mb-2">🏆</div>
                <h3 className="text-xl font-extrabold mb-1">Grattis!</h3>
                <p className="mb-3">Du klarade piratgrävspelet och samlade {coins} skattkistor!</p>
                {onNext && (
                  <button
                    className="rounded-2xl px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white shadow font-bold mr-2"
                    onClick={onNext}
                  >
                    Fortsätt till nästa moment
                  </button>
                )}
                <button
                  className="rounded-2xl px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white shadow font-bold"
                  onClick={() => resetBoard(false)}
                >
                  Spela igen
                </button>
              </div>
            ) : gameOver ? (
              <div className="rounded-2xl bg-white p-4 shadow text-center">
                <div className="text-3xl mb-2">☠️</div>
                <h3 className="text-xl font-extrabold mb-1">Slut på liv!</h3>
                <p className="mb-3">Du samlade {coins} skattkistor. Vill du försöka igen?</p>
                <button
                  className="rounded-2xl px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white shadow font-bold"
                  onClick={() => resetBoard(false)}
                >
                  Spela igen
                </button>
              </div>
            ) : revealedWord ? (
              <div className="rounded-2xl bg-white p-4 shadow flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <div className="text-sm uppercase tracking-wide text-slate-500">Du grävde upp</div>
                  <div className="text-3xl font-extrabold mt-1">"{revealedWord.w}"</div>
                  <div className="mt-1 text-slate-600">Är det ett substantiv?</div>
                </div>
                <div className="flex gap-3">
                  <button
                    className="rounded-2xl px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold shadow"
                    onClick={() => answer(true)}
                  >
                    Ja
                  </button>
                  <button
                    className="rounded-2xl px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold shadow"
                    onClick={() => answer(false)}
                  >
                    Nej
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white/70 p-4 text-center italic text-slate-700">
                Gräv upp ett ord för att fortsätta!
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 text-center text-xs text-slate-600">
        <p>Tips: Anpassa orden i moment-konfigurationen för att passa din lektion.</p>
      </footer>
    </div>
  );
}
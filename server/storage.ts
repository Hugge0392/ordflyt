import { type WordClass, type Sentence, type GameProgress, type Word } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getWordClasses(): Promise<WordClass[]>;
  getSentences(): Promise<Sentence[]>;
  getSentencesByLevel(level: number): Promise<Sentence[]>;
  getSentencesByWordClassAndLevel(wordClass: string, level: number): Promise<Sentence[]>;
  getGameProgress(): Promise<GameProgress>;
  updateGameProgress(progress: Partial<GameProgress>): Promise<GameProgress>;
  resetGameProgress(): Promise<GameProgress>;
}

export class MemStorage implements IStorage {
  private wordClasses: Map<string, WordClass>;
  private sentences: Map<string, Sentence>;
  private gameProgress: GameProgress;

  constructor() {
    this.wordClasses = new Map();
    this.sentences = new Map();
    this.gameProgress = {
      id: randomUUID(),
      score: 0,
      level: 1,
      correctAnswers: 0,
      wrongAnswers: 0,
      currentSentenceIndex: 0,
      completedSentences: [],
      completedLevels: {},
      correctAnswersByWordClass: {},
    };
    this.initializeData();
  }

  private initializeData() {
    // Initialize word classes
    const wordClassesData: Omit<WordClass, 'id'>[] = [
      { name: "noun", swedishName: "Substantiv", description: "ting, namn, personer", color: "#10B981" },
      { name: "verb", swedishName: "Verb", description: "handlingsord", color: "#4F46E5" },
      { name: "adjective", swedishName: "Adjektiv", description: "beskrivande ord", color: "#F59E0B" },
      { name: "adverb", swedishName: "Adverb", description: "beskriver verb", color: "#8B5CF6" },
      { name: "pronoun", swedishName: "Pronomen", description: "jag, du, han", color: "#EC4899" },
      { name: "preposition", swedishName: "Preposition", description: "till, från, på", color: "#6B7280" },
      { name: "conjunction", swedishName: "Konjunktion", description: "och, men, eller", color: "#EF4444" },
      { name: "interjection", swedishName: "Interjektion", description: "oj, ah, hej", color: "#F97316" },
      { name: "numeral", swedishName: "Räkneord", description: "ett, två, första", color: "#06B6D4" },
    ];

    wordClassesData.forEach(data => {
      const id = randomUUID();
      this.wordClasses.set(id, { ...data, id });
    });

    // Initialize sentences with different difficulty levels
    const sentencesData: Omit<Sentence, 'id'>[] = [
      // ======= LEVEL 1 - GRUNDLÄGGANDE (Custom questions from PDF) =======
      
      // Substantiv Nivå 1
      {
        content: "Hunden springer snabbt",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Hunden", wordClass: "noun" },
          { text: "springer", wordClass: "verb" },
          { text: "snabbt", wordClass: "adverb" },
        ],
      },
      {
        content: "Hon köper äpple",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Hon", wordClass: "pronoun" },
          { text: "köper", wordClass: "verb" },
          { text: "äpple", wordClass: "noun" },
        ],
      },
      {
        content: "Boken ligger där",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Boken", wordClass: "noun" },
          { text: "ligger", wordClass: "verb" },
          { text: "där", wordClass: "adverb" },
        ],
      },
      {
        content: "Vi ser huset",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Vi", wordClass: "pronoun" },
          { text: "ser", wordClass: "verb" },
          { text: "huset", wordClass: "noun" },
        ],
      },
      {
        content: "Flickan har katt",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Flickan", wordClass: "noun" },
          { text: "har", wordClass: "verb" },
          { text: "katt", wordClass: "noun" },
        ],
      },
      {
        content: "Stolen är trasig",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Stolen", wordClass: "noun" },
          { text: "är", wordClass: "verb" },
          { text: "trasig", wordClass: "adjective" },
        ],
      },
      {
        content: "Jag gillar glass",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "gillar", wordClass: "verb" },
          { text: "glass", wordClass: "noun" },
        ],
      },
      {
        content: "Pojken hittar boll",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Pojken", wordClass: "noun" },
          { text: "hittar", wordClass: "verb" },
          { text: "boll", wordClass: "noun" },
        ],
      },
      {
        content: "Bordet är stort",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Bordet", wordClass: "noun" },
          { text: "är", wordClass: "verb" },
          { text: "stort", wordClass: "adjective" },
        ],
      },
      {
        content: "Vi planterar träd",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Vi", wordClass: "pronoun" },
          { text: "planterar", wordClass: "verb" },
          { text: "träd", wordClass: "noun" },
        ],
      },
      {
        content: "Katten fångar mus",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Katten", wordClass: "noun" },
          { text: "fångar", wordClass: "verb" },
          { text: "mus", wordClass: "noun" },
        ],
      },
      {
        content: "De bygger bro",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "De", wordClass: "pronoun" },
          { text: "bygger", wordClass: "verb" },
          { text: "bro", wordClass: "noun" },
        ],
      },
      {
        content: "Han köper tidning",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Han", wordClass: "pronoun" },
          { text: "köper", wordClass: "verb" },
          { text: "tidning", wordClass: "noun" },
        ],
      },
      {
        content: "Blomman doftar gott",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Blomman", wordClass: "noun" },
          { text: "doftar", wordClass: "verb" },
          { text: "gott", wordClass: "adverb" },
        ],
      },
      {
        content: "Jag äter banan",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "äter", wordClass: "verb" },
          { text: "banan", wordClass: "noun" },
        ],
      },
      {
        content: "Fågeln flyger högt",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Fågeln", wordClass: "noun" },
          { text: "flyger", wordClass: "verb" },
          { text: "högt", wordClass: "adverb" },
        ],
      },
      {
        content: "Hon hittar nyckel",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Hon", wordClass: "pronoun" },
          { text: "hittar", wordClass: "verb" },
          { text: "nyckel", wordClass: "noun" },
        ],
      },
      {
        content: "Barnen leker boll",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Barnen", wordClass: "noun" },
          { text: "leker", wordClass: "verb" },
          { text: "boll", wordClass: "noun" },
        ],
      },
      {
        content: "Sängen är mjuk",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Sängen", wordClass: "noun" },
          { text: "är", wordClass: "verb" },
          { text: "mjuk", wordClass: "adjective" },
        ],
      },
      {
        content: "Vi ser fågel",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Vi", wordClass: "pronoun" },
          { text: "ser", wordClass: "verb" },
          { text: "fågel", wordClass: "noun" },
        ],
      },
      {
        content: "Han öppnar bok",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Han", wordClass: "pronoun" },
          { text: "öppnar", wordClass: "verb" },
          { text: "bok", wordClass: "noun" },
        ],
      },
      {
        content: "Flickan håller blomma",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Flickan", wordClass: "noun" },
          { text: "håller", wordClass: "verb" },
          { text: "blomma", wordClass: "noun" },
        ],
      },
      {
        content: "Pojken hittar sten",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Pojken", wordClass: "noun" },
          { text: "hittar", wordClass: "verb" },
          { text: "sten", wordClass: "noun" },
        ],
      },
      {
        content: "De läser tidning",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "De", wordClass: "pronoun" },
          { text: "läser", wordClass: "verb" },
          { text: "tidning", wordClass: "noun" },
        ],
      },
      {
        content: "Vi köper kaffe",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Vi", wordClass: "pronoun" },
          { text: "köper", wordClass: "verb" },
          { text: "kaffe", wordClass: "noun" },
        ],
      },

      // Verb Nivå 1
      {
        content: "Hunden jagar katten",
        level: 1,
        wordClassType: "verb",
        difficulty: 1,
        words: [
          { text: "Hunden", wordClass: "noun" },
          { text: "jagar", wordClass: "verb" },
          { text: "katten", wordClass: "noun" },
        ],
      },
      {
        content: "Vi äter frukost",
        level: 1,
        wordClassType: "verb",
        difficulty: 1,
        words: [
          { text: "Vi", wordClass: "pronoun" },
          { text: "äter", wordClass: "verb" },
          { text: "frukost", wordClass: "noun" },
        ],
      },
      {
        content: "Blommor doftar gott",
        level: 1,
        wordClassType: "verb",
        difficulty: 1,
        words: [
          { text: "Blommor", wordClass: "noun" },
          { text: "doftar", wordClass: "verb" },
          { text: "gott", wordClass: "adverb" },
        ],
      },
      {
        content: "Hon läser böcker",
        level: 1,
        wordClassType: "verb",
        difficulty: 1,
        words: [
          { text: "Hon", wordClass: "pronoun" },
          { text: "läser", wordClass: "verb" },
          { text: "böcker", wordClass: "noun" },
        ],
      },
      {
        content: "Pojken ritar hus",
        level: 1,
        wordClassType: "verb",
        difficulty: 1,
        words: [
          { text: "Pojken", wordClass: "noun" },
          { text: "ritar", wordClass: "verb" },
          { text: "hus", wordClass: "noun" },
        ],
      },

      // Adjektiv nivå 1
      {
        content: "Hunden är snabb",
        level: 1,
        wordClassType: "adjective",
        difficulty: 1,
        words: [
          { text: "Hunden", wordClass: "noun" },
          { text: "är", wordClass: "verb" },
          { text: "snabb", wordClass: "adjective" },
        ],
      },
      {
        content: "Hon har röd",
        level: 1,
        wordClassType: "adjective",
        difficulty: 1,
        words: [
          { text: "Hon", wordClass: "pronoun" },
          { text: "har", wordClass: "verb" },
          { text: "röd", wordClass: "adjective" },
        ],
      },
      {
        content: "Bilen är stor",
        level: 1,
        wordClassType: "adjective",
        difficulty: 1,
        words: [
          { text: "Bilen", wordClass: "noun" },
          { text: "är", wordClass: "verb" },
          { text: "stor", wordClass: "adjective" },
        ],
      },

      // Adverb nivå 1
      {
        content: "Han springer snabbt",
        level: 1,
        wordClassType: "adverb",
        difficulty: 1,
        words: [
          { text: "Han", wordClass: "pronoun" },
          { text: "springer", wordClass: "verb" },
          { text: "snabbt", wordClass: "adverb" },
        ],
      },
      {
        content: "Hon pratar högt",
        level: 1,
        wordClassType: "adverb",
        difficulty: 1,
        words: [
          { text: "Hon", wordClass: "pronoun" },
          { text: "pratar", wordClass: "verb" },
          { text: "högt", wordClass: "adverb" },
        ],
      },

      // Pronomen nivå 1
      {
        content: "Han går hem",
        level: 1,
        wordClassType: "pronoun",
        difficulty: 1,
        words: [
          { text: "Han", wordClass: "pronoun" },
          { text: "går", wordClass: "verb" },
          { text: "hem", wordClass: "adverb" },
        ],
      },
      {
        content: "Jag äter äpple",
        level: 1,
        wordClassType: "pronoun",
        difficulty: 1,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "äter", wordClass: "verb" },
          { text: "äpple", wordClass: "noun" },
        ],
      },

      // Preposition nivå 1
      {
        content: "Boken ligger på bord",
        level: 1,
        wordClassType: "preposition",
        difficulty: 1,
        words: [
          { text: "Boken", wordClass: "noun" },
          { text: "ligger", wordClass: "verb" },
          { text: "på", wordClass: "preposition" },
          { text: "bord", wordClass: "noun" },
        ],
      },
      {
        content: "Katten sitter under stolen",
        level: 1,
        wordClassType: "preposition",
        difficulty: 1,
        words: [
          { text: "Katten", wordClass: "noun" },
          { text: "sitter", wordClass: "verb" },
          { text: "under", wordClass: "preposition" },
          { text: "stolen", wordClass: "noun" },
        ],
      },

      // Interjektion nivå 1
      {
        content: "Hej, hur mår",
        level: 1,
        wordClassType: "interjection",
        difficulty: 1,
        words: [
          { text: "Hej", wordClass: "interjection" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "hur", wordClass: "adverb" },
          { text: "mår", wordClass: "verb" },
        ],
      },
      {
        content: "Oj, vad händer",
        level: 1,
        wordClassType: "interjection",
        difficulty: 1,
        words: [
          { text: "Oj", wordClass: "interjection" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "vad", wordClass: "pronoun" },
          { text: "händer", wordClass: "verb" },
        ],
      },

      // Räkneord nivå 1
      {
        content: "Jag har två äpplen",
        level: 1,
        wordClassType: "numeral",
        difficulty: 1,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "har", wordClass: "verb" },
          { text: "två", wordClass: "numeral" },
          { text: "äpplen", wordClass: "noun" },
        ],
      },
      {
        content: "Hon såg tre fåglar",
        level: 1,
        wordClassType: "numeral",
        difficulty: 1,
        words: [
          { text: "Hon", wordClass: "pronoun" },
          { text: "såg", wordClass: "verb" },
          { text: "tre", wordClass: "numeral" },
          { text: "fåglar", wordClass: "noun" },
        ],
      },

      // ======= LEVEL 2 - MEDEL (Medium difficulty, 2 target words per sentence) =======
      
      // Verb Level 2 - Sentences with 2 verbs each
      {
        content: "Jag springer och hoppar i parken.",
        level: 2,
        wordClassType: "verb",
        difficulty: 2,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "springer", wordClass: "verb" },
          { text: "och", wordClass: "conjunction" },
          { text: "hoppar", wordClass: "verb" },
          { text: "i", wordClass: "preposition" },
          { text: "parken", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "Hon läser och skriver sina läxor.",
        level: 2,
        wordClassType: "verb",
        difficulty: 2,
        words: [
          { text: "Hon", wordClass: "pronoun" },
          { text: "läser", wordClass: "verb" },
          { text: "och", wordClass: "conjunction" },
          { text: "skriver", wordClass: "verb" },
          { text: "sina", wordClass: "pronoun" },
          { text: "läxor", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Noun Level 2 - Sentences with 2 nouns each
      {
        content: "Pojken och flickan leker i trädgården.",
        level: 2,
        wordClassType: "noun",
        difficulty: 2,
        words: [
          { text: "Pojken", wordClass: "noun" },
          { text: "och", wordClass: "conjunction" },
          { text: "flickan", wordClass: "noun" },
          { text: "leker", wordClass: "verb" },
          { text: "i", wordClass: "preposition" },
          { text: "trädgården", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "Katten och hunden sover på mattan.",
        level: 2,
        wordClassType: "noun",
        difficulty: 2,
        words: [
          { text: "Katten", wordClass: "noun" },
          { text: "och", wordClass: "conjunction" },
          { text: "hunden", wordClass: "noun" },
          { text: "sover", wordClass: "verb" },
          { text: "på", wordClass: "preposition" },
          { text: "mattan", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Adjective Level 2 - Sentences with 2 adjectives each
      {
        content: "Den stora och vackra bilen är röd.",
        level: 2,
        wordClassType: "adjective",
        difficulty: 2,
        words: [
          { text: "Den", wordClass: "pronoun" },
          { text: "stora", wordClass: "adjective" },
          { text: "och", wordClass: "conjunction" },
          { text: "vackra", wordClass: "adjective" },
          { text: "bilen", wordClass: "noun" },
          { text: "är", wordClass: "verb" },
          { text: "röd", wordClass: "adjective" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Adverb Level 2 - Sentences with 2 adverbs each
      {
        content: "Hon sjunger vackert och dansar graciöst.",
        level: 2,
        wordClassType: "adverb",
        difficulty: 2,
        words: [
          { text: "Hon", wordClass: "pronoun" },
          { text: "sjunger", wordClass: "verb" },
          { text: "vackert", wordClass: "adverb" },
          { text: "och", wordClass: "conjunction" },
          { text: "dansar", wordClass: "verb" },
          { text: "graciöst", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Pronoun Level 2 - Sentences with 2 pronouns each
      {
        content: "Jag ser dig när du kommer hem.",
        level: 2,
        wordClassType: "pronoun",
        difficulty: 2,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "ser", wordClass: "verb" },
          { text: "dig", wordClass: "pronoun" },
          { text: "när", wordClass: "conjunction" },
          { text: "du", wordClass: "pronoun" },
          { text: "kommer", wordClass: "verb" },
          { text: "hem", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Preposition Level 2 - Sentences with 2 prepositions each
      {
        content: "Katten springer från huset till trädgården.",
        level: 2,
        wordClassType: "preposition",
        difficulty: 2,
        words: [
          { text: "Katten", wordClass: "noun" },
          { text: "springer", wordClass: "verb" },
          { text: "från", wordClass: "preposition" },
          { text: "huset", wordClass: "noun" },
          { text: "till", wordClass: "preposition" },
          { text: "trädgården", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Conjunction Level 2 - Sentences with 2 conjunctions each
      {
        content: "Jag vill äta men du vill sova så vi måste bestämma.",
        level: 2,
        wordClassType: "conjunction",
        difficulty: 2,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "vill", wordClass: "verb" },
          { text: "äta", wordClass: "verb" },
          { text: "men", wordClass: "conjunction" },
          { text: "du", wordClass: "pronoun" },
          { text: "vill", wordClass: "verb" },
          { text: "sova", wordClass: "verb" },
          { text: "så", wordClass: "conjunction" },
          { text: "vi", wordClass: "pronoun" },
          { text: "måste", wordClass: "verb" },
          { text: "bestämma", wordClass: "verb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Interjection Level 2 - Sentences with 2 interjections each
      {
        content: "Oj, det var kallt! Brr, jag fryser.",
        level: 2,
        wordClassType: "interjection",
        difficulty: 2,
        words: [
          { text: "Oj", wordClass: "interjection" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "det", wordClass: "pronoun" },
          { text: "var", wordClass: "verb" },
          { text: "kallt", wordClass: "adjective" },
          { text: "!", isPunctuation: true, wordClass: "punctuation" },
          { text: "Brr", wordClass: "interjection" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "jag", wordClass: "pronoun" },
          { text: "fryser", wordClass: "verb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Numeral Level 2 - Sentences with 2 numerals each
      {
        content: "Första dagen såg jag fem hundar.",
        level: 2,
        wordClassType: "numeral",
        difficulty: 2,
        words: [
          { text: "Första", wordClass: "numeral" },
          { text: "dagen", wordClass: "noun" },
          { text: "såg", wordClass: "verb" },
          { text: "jag", wordClass: "pronoun" },
          { text: "fem", wordClass: "numeral" },
          { text: "hundar", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // ======= LEVEL 5 SENTENCES FOR ALL WORD CLASSES (Final test level with timing) =======
      
      // Verb Level 5 - Very complex sentences for final test
      {
        content: "När vi sprang, hoppade och dansade på scenen medan publiken applåderade och jublade högt.",
        level: 5,
        wordClassType: "verb",
        difficulty: 5,
        words: [
          { text: "När", wordClass: "conjunction" },
          { text: "vi", wordClass: "pronoun" },
          { text: "sprang", wordClass: "verb" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "hoppade", wordClass: "verb" },
          { text: "och", wordClass: "conjunction" },
          { text: "dansade", wordClass: "verb" },
          { text: "på", wordClass: "preposition" },
          { text: "scenen", wordClass: "noun" },
          { text: "medan", wordClass: "conjunction" },
          { text: "publiken", wordClass: "noun" },
          { text: "applåderade", wordClass: "verb" },
          { text: "och", wordClass: "conjunction" },
          { text: "jublade", wordClass: "verb" },
          { text: "högt", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Noun Level 5 - Very complex sentences for final test
      {
        content: "Läraren, eleverna, föräldrarna och rektorn diskuterade skolans framtidsplaner i det stora klassrummet.",
        level: 5,
        wordClassType: "noun",
        difficulty: 5,
        words: [
          { text: "Läraren", wordClass: "noun" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "eleverna", wordClass: "noun" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "föräldrarna", wordClass: "noun" },
          { text: "och", wordClass: "conjunction" },
          { text: "rektorn", wordClass: "noun" },
          { text: "diskuterade", wordClass: "verb" },
          { text: "skolans", wordClass: "noun" },
          { text: "framtidsplaner", wordClass: "noun" },
          { text: "i", wordClass: "preposition" },
          { text: "det", wordClass: "pronoun" },
          { text: "stora", wordClass: "adjective" },
          { text: "klassrummet", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Adjective Level 5 - Very complex sentences for final test
      {
        content: "Den stora, vackra, dyra och snabba bilen var röd, blank, modern och elegant.",
        level: 5,
        wordClassType: "adjective",
        difficulty: 5,
        words: [
          { text: "Den", wordClass: "pronoun" },
          { text: "stora", wordClass: "adjective" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "vackra", wordClass: "adjective" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "dyra", wordClass: "adjective" },
          { text: "och", wordClass: "conjunction" },
          { text: "snabba", wordClass: "adjective" },
          { text: "bilen", wordClass: "noun" },
          { text: "var", wordClass: "verb" },
          { text: "röd", wordClass: "adjective" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "blank", wordClass: "adjective" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "modern", wordClass: "adjective" },
          { text: "och", wordClass: "conjunction" },
          { text: "elegant", wordClass: "adjective" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Adverb Level 5 - Very complex sentences for final test
      {
        content: "Han sprang snabbt, hoppade högt, landade mjukt och rörde sig elegant genom rummet.",
        level: 5,
        wordClassType: "adverb",
        difficulty: 5,
        words: [
          { text: "Han", wordClass: "pronoun" },
          { text: "sprang", wordClass: "verb" },
          { text: "snabbt", wordClass: "adverb" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "hoppade", wordClass: "verb" },
          { text: "högt", wordClass: "adverb" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "landade", wordClass: "verb" },
          { text: "mjukt", wordClass: "adverb" },
          { text: "och", wordClass: "conjunction" },
          { text: "rörde", wordClass: "verb" },
          { text: "sig", wordClass: "pronoun" },
          { text: "elegant", wordClass: "adverb" },
          { text: "genom", wordClass: "preposition" },
          { text: "rummet", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Pronoun Level 5 - Very complex sentences for final test
      {
        content: "Jag såg dig när du tittade på honom medan han pratade med henne om vad vi skulle göra.",
        level: 5,
        wordClassType: "pronoun",
        difficulty: 5,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "såg", wordClass: "verb" },
          { text: "dig", wordClass: "pronoun" },
          { text: "när", wordClass: "conjunction" },
          { text: "du", wordClass: "pronoun" },
          { text: "tittade", wordClass: "verb" },
          { text: "på", wordClass: "preposition" },
          { text: "honom", wordClass: "pronoun" },
          { text: "medan", wordClass: "conjunction" },
          { text: "han", wordClass: "pronoun" },
          { text: "pratade", wordClass: "verb" },
          { text: "med", wordClass: "preposition" },
          { text: "henne", wordClass: "pronoun" },
          { text: "om", wordClass: "preposition" },
          { text: "vad", wordClass: "pronoun" },
          { text: "vi", wordClass: "pronoun" },
          { text: "skulle", wordClass: "verb" },
          { text: "göra", wordClass: "verb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Preposition Level 5 - Very complex sentences for final test
      {
        content: "Katten sprang från huset, genom trädgården, över staketet, under bron till grannen.",
        level: 5,
        wordClassType: "preposition",
        difficulty: 5,
        words: [
          { text: "Katten", wordClass: "noun" },
          { text: "sprang", wordClass: "verb" },
          { text: "från", wordClass: "preposition" },
          { text: "huset", wordClass: "noun" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "genom", wordClass: "preposition" },
          { text: "trädgården", wordClass: "noun" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "över", wordClass: "preposition" },
          { text: "staketet", wordClass: "noun" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "under", wordClass: "preposition" },
          { text: "bron", wordClass: "noun" },
          { text: "till", wordClass: "preposition" },
          { text: "grannen", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Conjunction Level 5 - Very complex sentences for final test
      {
        content: "Jag ville gå men du ville stanna, så vi bestämde att vi skulle kompromissa eller be om hjälp.",
        level: 5,
        wordClassType: "conjunction",
        difficulty: 5,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "ville", wordClass: "verb" },
          { text: "gå", wordClass: "verb" },
          { text: "men", wordClass: "conjunction" },
          { text: "du", wordClass: "pronoun" },
          { text: "ville", wordClass: "verb" },
          { text: "stanna", wordClass: "verb" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "så", wordClass: "conjunction" },
          { text: "vi", wordClass: "pronoun" },
          { text: "bestämde", wordClass: "verb" },
          { text: "att", wordClass: "conjunction" },
          { text: "vi", wordClass: "pronoun" },
          { text: "skulle", wordClass: "verb" },
          { text: "kompromissa", wordClass: "verb" },
          { text: "eller", wordClass: "conjunction" },
          { text: "be", wordClass: "verb" },
          { text: "om", wordClass: "preposition" },
          { text: "hjälp", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Interjection Level 5 - Very complex sentences for final test
      {
        content: "Aj! Oj, det gjorde ont! Uff, det var jobbigt! Åh, nu blir det bättre!",
        level: 5,
        wordClassType: "interjection",
        difficulty: 5,
        words: [
          { text: "Aj", wordClass: "interjection" },
          { text: "!", isPunctuation: true, wordClass: "punctuation" },
          { text: "Oj", wordClass: "interjection" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "det", wordClass: "pronoun" },
          { text: "gjorde", wordClass: "verb" },
          { text: "ont", wordClass: "adverb" },
          { text: "!", isPunctuation: true, wordClass: "punctuation" },
          { text: "Uff", wordClass: "interjection" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "det", wordClass: "pronoun" },
          { text: "var", wordClass: "verb" },
          { text: "jobbigt", wordClass: "adjective" },
          { text: "!", isPunctuation: true, wordClass: "punctuation" },
          { text: "Åh", wordClass: "interjection" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "nu", wordClass: "adverb" },
          { text: "blir", wordClass: "verb" },
          { text: "det", wordClass: "pronoun" },
          { text: "bättre", wordClass: "adjective" },
          { text: "!", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Numeral Level 5 - Very complex sentences for final test
      {
        content: "Första gången såg jag tre hundar, andra gången fem katter, tredje gången tio fåglar och fjärde gången tolv fiskar.",
        level: 5,
        wordClassType: "numeral",
        difficulty: 5,
        words: [
          { text: "Första", wordClass: "numeral" },
          { text: "gången", wordClass: "noun" },
          { text: "såg", wordClass: "verb" },
          { text: "jag", wordClass: "pronoun" },
          { text: "tre", wordClass: "numeral" },
          { text: "hundar", wordClass: "noun" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "andra", wordClass: "numeral" },
          { text: "gången", wordClass: "noun" },
          { text: "fem", wordClass: "numeral" },
          { text: "katter", wordClass: "noun" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "tredje", wordClass: "numeral" },
          { text: "gången", wordClass: "noun" },
          { text: "tio", wordClass: "numeral" },
          { text: "fåglar", wordClass: "noun" },
          { text: "och", wordClass: "conjunction" },
          { text: "fjärde", wordClass: "numeral" },
          { text: "gången", wordClass: "noun" },
          { text: "tolv", wordClass: "numeral" },
          { text: "fiskar", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      // Verb Level 2 - Medium sentences with multiple verbs
      {
        content: "Barnen leker och skrattar.",
        level: 2,
        wordClassType: "verb",
        difficulty: 2,
        words: [
          { text: "Barnen", wordClass: "noun" },
          { text: "leker", wordClass: "verb" },
          { text: "och", wordClass: "conjunction" },
          { text: "skrattar", wordClass: "verb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      // Verb Level 3 - Complex sentences with multiple verbs
      {
        content: "Flickan som sprang snabbt hoppade över staketet och landade mjukt.",
        level: 3,
        wordClassType: "verb",
        difficulty: 3,
        words: [
          { text: "Flickan", wordClass: "noun" },
          { text: "som", wordClass: "pronoun" },
          { text: "sprang", wordClass: "verb" },
          { text: "snabbt", wordClass: "adverb" },
          { text: "hoppade", wordClass: "verb" },
          { text: "över", wordClass: "preposition" },
          { text: "staketet", wordClass: "noun" },
          { text: "och", wordClass: "conjunction" },
          { text: "landade", wordClass: "verb" },
          { text: "mjukt", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      
      // Additional Verb Level 2 sentences
      {
        content: "Hunden springer och katten sover.",
        level: 2,
        wordClassType: "verb",
        difficulty: 2,
        words: [
          { text: "Hunden", wordClass: "noun" },
          { text: "springer", wordClass: "verb" },
          { text: "och", wordClass: "conjunction" },
          { text: "katten", wordClass: "noun" },
          { text: "sover", wordClass: "verb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      
      // Additional Verb Level 3 sentences
      {
        content: "Pojken äter lunch, dricker mjölk och tittar på TV.",
        level: 3,
        wordClassType: "verb",
        difficulty: 3,
        words: [
          { text: "Pojken", wordClass: "noun" },
          { text: "äter", wordClass: "verb" },
          { text: "lunch", wordClass: "noun" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "dricker", wordClass: "verb" },
          { text: "mjölk", wordClass: "noun" },
          { text: "och", wordClass: "conjunction" },
          { text: "tittar", wordClass: "verb" },
          { text: "på", wordClass: "preposition" },
          { text: "TV", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Noun Level 1 - Simple sentences with clear nouns
      {
        content: "Katten sover.",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Katten", wordClass: "noun" },
          { text: "sover", wordClass: "verb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "Boken är blå.",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Boken", wordClass: "noun" },
          { text: "är", wordClass: "verb" },
          { text: "blå", wordClass: "adjective" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      // Noun Level 2 - Multiple nouns
      {
        content: "Hunden jagar katten genom trädgården.",
        level: 2,
        wordClassType: "noun",
        difficulty: 2,
        words: [
          { text: "Hunden", wordClass: "noun" },
          { text: "jagar", wordClass: "verb" },
          { text: "katten", wordClass: "noun" },
          { text: "genom", wordClass: "preposition" },
          { text: "trädgården", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Adjective Level 1 - Simple adjectives
      {
        content: "Den blå himlen.",
        level: 1,
        wordClassType: "adjective",
        difficulty: 1,
        words: [
          { text: "Den", wordClass: "pronoun" },
          { text: "blå", wordClass: "adjective" },
          { text: "himlen", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      // Additional Noun Level 2 sentences
      {
        content: "Läraren ser eleven och föräldrarna.",
        level: 2,
        wordClassType: "noun",
        difficulty: 2,
        words: [
          { text: "Läraren", wordClass: "noun" },
          { text: "ser", wordClass: "verb" },
          { text: "eleven", wordClass: "noun" },
          { text: "och", wordClass: "conjunction" },
          { text: "föräldrarna", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Noun Level 3 sentences
      {
        content: "Barnen leker med bollarna i parken medan föräldrarna dricker kaffe på caféet.",
        level: 3,
        wordClassType: "noun",
        difficulty: 3,
        words: [
          { text: "Barnen", wordClass: "noun" },
          { text: "leker", wordClass: "verb" },
          { text: "med", wordClass: "preposition" },
          { text: "bollarna", wordClass: "noun" },
          { text: "i", wordClass: "preposition" },
          { text: "parken", wordClass: "noun" },
          { text: "medan", wordClass: "conjunction" },
          { text: "föräldrarna", wordClass: "noun" },
          { text: "dricker", wordClass: "verb" },
          { text: "kaffe", wordClass: "noun" },
          { text: "på", wordClass: "preposition" },
          { text: "caféet", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Adjective Level 1 - Simple adjectives
      {
        content: "Den blå himlen.",
        level: 1,
        wordClassType: "adjective",
        difficulty: 1,
        words: [
          { text: "Den", wordClass: "pronoun" },
          { text: "blå", wordClass: "adjective" },
          { text: "himlen", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Adjective Level 2 - Multiple adjectives
      {
        content: "En stor, grön och vacker trädgård.",
        level: 2,
        wordClassType: "adjective",
        difficulty: 2,
        words: [
          { text: "En", wordClass: "article" },
          { text: "stor", wordClass: "adjective" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "grön", wordClass: "adjective" },
          { text: "och", wordClass: "conjunction" },
          { text: "vacker", wordClass: "adjective" },
          { text: "trädgård", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Adjective Level 3 sentences
      {
        content: "Den gamla, krokiga trädet med sina långa, mörka grenar såg mystiskt ut.",
        level: 3,
        wordClassType: "adjective",
        difficulty: 3,
        words: [
          { text: "Den", wordClass: "pronoun" },
          { text: "gamla", wordClass: "adjective" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "krokiga", wordClass: "adjective" },
          { text: "trädet", wordClass: "noun" },
          { text: "med", wordClass: "preposition" },
          { text: "sina", wordClass: "pronoun" },
          { text: "långa", wordClass: "adjective" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "mörka", wordClass: "adjective" },
          { text: "grenar", wordClass: "noun" },
          { text: "såg", wordClass: "verb" },
          { text: "mystiskt", wordClass: "adjective" },
          { text: "ut", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Adverb Level 1 sentences
      {
        content: "Han springer snabbt.",
        level: 1,
        wordClassType: "adverb",
        difficulty: 1,
        words: [
          { text: "Han", wordClass: "pronoun" },
          { text: "springer", wordClass: "verb" },
          { text: "snabbt", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Adverb Level 2 sentences
      {
        content: "Barnet talar tyst och går försiktigt.",
        level: 2,
        wordClassType: "adverb",
        difficulty: 2,
        words: [
          { text: "Barnet", wordClass: "noun" },
          { text: "talar", wordClass: "verb" },
          { text: "tyst", wordClass: "adverb" },
          { text: "och", wordClass: "conjunction" },
          { text: "går", wordClass: "verb" },
          { text: "försiktigt", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Adverb Level 3 sentences  
      {
        content: "Flickan dansade graciöst medan pojken sjöng vackert och alla applåderade högt.",
        level: 3,
        wordClassType: "adverb",
        difficulty: 3,
        words: [
          { text: "Flickan", wordClass: "noun" },
          { text: "dansade", wordClass: "verb" },
          { text: "graciöst", wordClass: "adverb" },
          { text: "medan", wordClass: "conjunction" },
          { text: "pojken", wordClass: "noun" },
          { text: "sjöng", wordClass: "verb" },
          { text: "vackert", wordClass: "adverb" },
          { text: "och", wordClass: "conjunction" },
          { text: "alla", wordClass: "pronoun" },
          { text: "applåderade", wordClass: "verb" },
          { text: "högt", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Pronoun Level 1 sentences
      {
        content: "Hon läser en bok.",
        level: 1,
        wordClassType: "pronoun",
        difficulty: 1,
        words: [
          { text: "Hon", wordClass: "pronoun" },
          { text: "läser", wordClass: "verb" },
          { text: "en", wordClass: "article" },
          { text: "bok", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Pronoun Level 2 sentences
      {
        content: "Jag ser dig och du ser mig.",
        level: 2,
        wordClassType: "pronoun",
        difficulty: 2,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "ser", wordClass: "verb" },
          { text: "dig", wordClass: "pronoun" },
          { text: "och", wordClass: "conjunction" },
          { text: "du", wordClass: "pronoun" },
          { text: "ser", wordClass: "verb" },
          { text: "mig", wordClass: "pronoun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Pronoun Level 3 sentences
      {
        content: "Vi som bor här vet att de som kommer dit måste ta med sig detta.",
        level: 3,
        wordClassType: "pronoun",
        difficulty: 3,
        words: [
          { text: "Vi", wordClass: "pronoun" },
          { text: "som", wordClass: "pronoun" },
          { text: "bor", wordClass: "verb" },
          { text: "här", wordClass: "adverb" },
          { text: "vet", wordClass: "verb" },
          { text: "att", wordClass: "conjunction" },
          { text: "de", wordClass: "pronoun" },
          { text: "som", wordClass: "pronoun" },
          { text: "kommer", wordClass: "verb" },
          { text: "dit", wordClass: "adverb" },
          { text: "måste", wordClass: "verb" },
          { text: "ta", wordClass: "verb" },
          { text: "med", wordClass: "preposition" },
          { text: "sig", wordClass: "pronoun" },
          { text: "detta", wordClass: "pronoun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      // Adjective Level 3 - Complex adjectives
      {
        content: "Den gamla, krokiga trädet med sina långa, mörka grenar såg mystiskt ut.",
        level: 3,
        wordClassType: "adjective",
        difficulty: 3,
        words: [
          { text: "Den", wordClass: "pronoun" },
          { text: "gamla", wordClass: "adjective" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "krokiga", wordClass: "adjective" },
          { text: "trädet", wordClass: "noun" },
          { text: "med", wordClass: "preposition" },
          { text: "sina", wordClass: "pronoun" },
          { text: "långa", wordClass: "adjective" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "mörka", wordClass: "adjective" },
          { text: "grenar", wordClass: "noun" },
          { text: "såg", wordClass: "verb" },
          { text: "mystiskt", wordClass: "adjective" },
          { text: "ut", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Additional Adjective Level 1
      {
        content: "Den stora hunden.",
        level: 1,
        wordClassType: "adjective",
        difficulty: 1,
        words: [
          { text: "Den", wordClass: "pronoun" },
          { text: "stora", wordClass: "adjective" },
          { text: "hunden", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Adverb Level 1 - Simple adverbs
      {
        content: "Hon läser tyst.",
        level: 1,
        wordClassType: "adverb",
        difficulty: 1,
        words: [
          { text: "Hon", wordClass: "pronoun" },
          { text: "läser", wordClass: "verb" },
          { text: "tyst", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "Vi går hem nu.",
        level: 1,
        wordClassType: "adverb",
        difficulty: 1,
        words: [
          { text: "Vi", wordClass: "pronoun" },
          { text: "går", wordClass: "verb" },
          { text: "hem", wordClass: "adverb" },
          { text: "nu", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      // Adverb Level 2 - Multiple adverbs
      {
        content: "Barnen leker glatt utomhus idag.",
        level: 2,
        wordClassType: "adverb",
        difficulty: 2,
        words: [
          { text: "Barnen", wordClass: "noun" },
          { text: "leker", wordClass: "verb" },
          { text: "glatt", wordClass: "adverb" },
          { text: "utomhus", wordClass: "adverb" },
          { text: "idag", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      
      // Adverb Level 3 - Complex adverbs
      {
        content: "Flickan dansade graciöst medan pojken sjöng vackert och alla applåderade högt.",
        level: 3,
        wordClassType: "adverb",
        difficulty: 3,
        words: [
          { text: "Flickan", wordClass: "noun" },
          { text: "dansade", wordClass: "verb" },
          { text: "graciöst", wordClass: "adverb" },
          { text: "medan", wordClass: "conjunction" },
          { text: "pojken", wordClass: "noun" },
          { text: "sjöng", wordClass: "verb" },
          { text: "vackert", wordClass: "adverb" },
          { text: "och", wordClass: "conjunction" },
          { text: "alla", wordClass: "pronoun" },
          { text: "applåderade", wordClass: "verb" },
          { text: "högt", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Pronoun Level 1 - Simple pronouns
      {
        content: "Jag ser dig.",
        level: 1,
        wordClassType: "pronoun",
        difficulty: 1,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "ser", wordClass: "verb" },
          { text: "dig", wordClass: "pronoun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "Han kommer hit.",
        level: 1,
        wordClassType: "pronoun",
        difficulty: 1,
        words: [
          { text: "Han", wordClass: "pronoun" },
          { text: "kommer", wordClass: "verb" },
          { text: "hit", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      // Pronoun Level 2 - Multiple pronouns
      {
        content: "Vi ser dem när de kommer.",
        level: 2,
        wordClassType: "pronoun",
        difficulty: 2,
        words: [
          { text: "Vi", wordClass: "pronoun" },
          { text: "ser", wordClass: "verb" },
          { text: "dem", wordClass: "pronoun" },
          { text: "när", wordClass: "adverb" },
          { text: "de", wordClass: "pronoun" },
          { text: "kommer", wordClass: "verb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Preposition Level 1 - Simple prepositions
      {
        content: "Boken ligger på bordet.",
        level: 1,
        wordClassType: "preposition",
        difficulty: 1,
        words: [
          { text: "Boken", wordClass: "noun" },
          { text: "ligger", wordClass: "verb" },
          { text: "på", wordClass: "preposition" },
          { text: "bordet", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "Han går till skolan.",
        level: 1,
        wordClassType: "preposition",
        difficulty: 1,
        words: [
          { text: "Han", wordClass: "pronoun" },
          { text: "går", wordClass: "verb" },
          { text: "till", wordClass: "preposition" },
          { text: "skolan", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      // Preposition Level 2 - Multiple prepositions
      {
        content: "Katten hoppar från stolen till sängen.",
        level: 2,
        wordClassType: "preposition",
        difficulty: 2,
        words: [
          { text: "Katten", wordClass: "noun" },
          { text: "hoppar", wordClass: "verb" },
          { text: "från", wordClass: "preposition" },
          { text: "stolen", wordClass: "noun" },
          { text: "till", wordClass: "preposition" },
          { text: "sängen", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Conjunction Level 1 - Simple conjunctions
      {
        content: "Jag och du.",
        level: 1,
        wordClassType: "conjunction",
        difficulty: 1,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "och", wordClass: "conjunction" },
          { text: "du", wordClass: "pronoun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "Hon läser men jag skriver.",
        level: 1,
        wordClassType: "conjunction",
        difficulty: 1,
        words: [
          { text: "Hon", wordClass: "pronoun" },
          { text: "läser", wordClass: "verb" },
          { text: "men", wordClass: "conjunction" },
          { text: "jag", wordClass: "pronoun" },
          { text: "skriver", wordClass: "verb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      // Conjunction Level 2 - Multiple conjunctions
      {
        content: "Vi kan gå eller stanna, men inte både och.",
        level: 2,
        wordClassType: "conjunction",
        difficulty: 2,
        words: [
          { text: "Vi", wordClass: "pronoun" },
          { text: "kan", wordClass: "verb" },
          { text: "gå", wordClass: "verb" },
          { text: "eller", wordClass: "conjunction" },
          { text: "stanna", wordClass: "verb" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "men", wordClass: "conjunction" },
          { text: "inte", wordClass: "adverb" },
          { text: "både", wordClass: "conjunction" },
          { text: "och", wordClass: "conjunction" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Interjection Level 1 - Simple interjections
      {
        content: "Oj, vad fint!",
        level: 1,
        wordClassType: "interjection",
        difficulty: 1,
        words: [
          { text: "Oj", wordClass: "interjection" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "vad", wordClass: "pronoun" },
          { text: "fint", wordClass: "adjective" },
          { text: "!", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "Hej, hur mår du?",
        level: 1,
        wordClassType: "interjection",
        difficulty: 1,
        words: [
          { text: "Hej", wordClass: "interjection" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "hur", wordClass: "adverb" },
          { text: "mår", wordClass: "verb" },
          { text: "du", wordClass: "pronoun" },
          { text: "?", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Numeral Level 1 - Simple numerals
      {
        content: "Jag har två äpplen.",
        level: 1,
        wordClassType: "numeral",
        difficulty: 1,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "har", wordClass: "verb" },
          { text: "två", wordClass: "numeral" },
          { text: "äpplen", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "Den första bilen är röd.",
        level: 1,
        wordClassType: "numeral",
        difficulty: 1,
        words: [
          { text: "Den", wordClass: "pronoun" },
          { text: "första", wordClass: "numeral" },
          { text: "bilen", wordClass: "noun" },
          { text: "är", wordClass: "verb" },
          { text: "röd", wordClass: "adjective" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      // Numeral Level 2 - Multiple numerals
      {
        content: "Det första, andra och tredje priset.",
        level: 2,
        wordClassType: "numeral",
        difficulty: 2,
        words: [
          { text: "Det", wordClass: "pronoun" },
          { text: "första", wordClass: "numeral" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "andra", wordClass: "numeral" },
          { text: "och", wordClass: "conjunction" },
          { text: "tredje", wordClass: "numeral" },
          { text: "priset", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Mixed levels for general practice and drag-drop game
      {
        content: "Jag sprang snabbt till skolan igår.",
        level: 1,
        wordClassType: null,
        difficulty: 2,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "sprang", wordClass: "verb" },
          { text: "snabbt", wordClass: "adverb" },
          { text: "till", wordClass: "preposition" },
          { text: "skolan", wordClass: "noun" },
          { text: "igår", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "Oj, den stora röda bilen kör fort och högt!",
        level: 2,
        wordClassType: null,
        difficulty: 3,
        words: [
          { text: "Oj", wordClass: "interjection" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "den", wordClass: "pronoun" },
          { text: "stora", wordClass: "adjective" },
          { text: "röda", wordClass: "adjective" },
          { text: "bilen", wordClass: "noun" },
          { text: "kör", wordClass: "verb" },
          { text: "fort", wordClass: "adverb" },
          { text: "och", wordClass: "conjunction" },
          { text: "högt", wordClass: "adverb" },
          { text: "!", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Additional comprehensive sentences for all word classes and levels
      // Noun Level 1 - More sentences
      {
        content: "Pojken spelar fotboll.",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Pojken", wordClass: "noun" },
          { text: "spelar", wordClass: "verb" },
          { text: "fotboll", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "Bilen kör på vägen.",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Bilen", wordClass: "noun" },
          { text: "kör", wordClass: "verb" },
          { text: "på", wordClass: "preposition" },
          { text: "vägen", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "Flickan har en docka.",
        level: 1,
        wordClassType: "noun",
        difficulty: 1,
        words: [
          { text: "Flickan", wordClass: "noun" },
          { text: "har", wordClass: "verb" },
          { text: "en", wordClass: "article" },
          { text: "docka", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Noun Level 2 - More complex
      {
        content: "Läraren och eleverna studerar böcker.",
        level: 2,
        wordClassType: "noun",
        difficulty: 2,
        words: [
          { text: "Läraren", wordClass: "noun" },
          { text: "och", wordClass: "conjunction" },
          { text: "eleverna", wordClass: "noun" },
          { text: "studerar", wordClass: "verb" },
          { text: "böcker", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Noun Level 3 - No nouns
      {
        content: "Han springer snabbt.",
        level: 3,
        wordClassType: "noun",
        difficulty: 3,
        words: [
          { text: "Han", wordClass: "pronoun" },
          { text: "springer", wordClass: "verb" },
          { text: "snabbt", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Verb Level 2 - More sentences
      {
        content: "Jag läser och skriver hemma.",
        level: 2,
        wordClassType: "verb",
        difficulty: 2,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "läser", wordClass: "verb" },
          { text: "och", wordClass: "conjunction" },
          { text: "skriver", wordClass: "verb" },
          { text: "hemma", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "Hon cyklar och promenerar dagligen.",
        level: 2,
        wordClassType: "verb",
        difficulty: 2,
        words: [
          { text: "Hon", wordClass: "pronoun" },
          { text: "cyklar", wordClass: "verb" },
          { text: "och", wordClass: "conjunction" },
          { text: "promenerar", wordClass: "verb" },
          { text: "dagligen", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Verb Level 3 - No verbs
      {
        content: "Den röda boken.",
        level: 3,
        wordClassType: "verb",
        difficulty: 3,
        words: [
          { text: "Den", wordClass: "pronoun" },
          { text: "röda", wordClass: "adjective" },
          { text: "boken", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Adjective Level 1 - More sentences
      {
        content: "Det gula huset är stort.",
        level: 1,
        wordClassType: "adjective",
        difficulty: 1,
        words: [
          { text: "Det", wordClass: "pronoun" },
          { text: "gula", wordClass: "adjective" },
          { text: "huset", wordClass: "noun" },
          { text: "är", wordClass: "verb" },
          { text: "stort", wordClass: "adjective" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "En liten katt är söt.",
        level: 1,
        wordClassType: "adjective",
        difficulty: 1,
        words: [
          { text: "En", wordClass: "article" },
          { text: "liten", wordClass: "adjective" },
          { text: "katt", wordClass: "noun" },
          { text: "är", wordClass: "verb" },
          { text: "söt", wordClass: "adjective" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Adverb Level 3 - No adverbs
      {
        content: "Den stora bilen.",
        level: 3,
        wordClassType: "adverb",
        difficulty: 3,
        words: [
          { text: "Den", wordClass: "pronoun" },
          { text: "stora", wordClass: "adjective" },
          { text: "bilen", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Pronoun Level 3 - No pronouns
      {
        content: "Den gröna boken ligger på bordet.",
        level: 3,
        wordClassType: "pronoun",
        difficulty: 3,
        words: [
          { text: "Den", wordClass: "article" },
          { text: "gröna", wordClass: "adjective" },
          { text: "boken", wordClass: "noun" },
          { text: "ligger", wordClass: "verb" },
          { text: "på", wordClass: "preposition" },
          { text: "bordet", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Preposition Level 3 - No prepositions
      {
        content: "Barnen leker glatt.",
        level: 3,
        wordClassType: "preposition",
        difficulty: 3,
        words: [
          { text: "Barnen", wordClass: "noun" },
          { text: "leker", wordClass: "verb" },
          { text: "glatt", wordClass: "adverb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Conjunction Level 3 - No conjunctions
      {
        content: "Den snabba hunden springer.",
        level: 3,
        wordClassType: "conjunction",
        difficulty: 3,
        words: [
          { text: "Den", wordClass: "pronoun" },
          { text: "snabba", wordClass: "adjective" },
          { text: "hunden", wordClass: "noun" },
          { text: "springer", wordClass: "verb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Interjection Level 3 - No interjections
      {
        content: "Katten sitter på mattan.",
        level: 3,
        wordClassType: "interjection",
        difficulty: 3,
        words: [
          { text: "Katten", wordClass: "noun" },
          { text: "sitter", wordClass: "verb" },
          { text: "på", wordClass: "preposition" },
          { text: "mattan", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Numeral Level 3 - No numerals
      {
        content: "Den gula blomman är vacker.",
        level: 3,
        wordClassType: "numeral",
        difficulty: 3,
        words: [
          { text: "Den", wordClass: "pronoun" },
          { text: "gula", wordClass: "adjective" },
          { text: "blomman", wordClass: "noun" },
          { text: "är", wordClass: "verb" },
          { text: "vacker", wordClass: "adjective" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // LEVEL 4 SENTENCES FOR ALL WORD CLASSES (Final test level)
      
      // Verb Level 4 - Complex sentences with multiple verbs
      {
        content: "Hon springer, hoppar och dansar på scenen medan publiken applåderar.",
        level: 4,
        wordClassType: "verb",
        difficulty: 4,
        words: [
          { text: "Hon", wordClass: "pronoun" },
          { text: "springer", wordClass: "verb" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "hoppar", wordClass: "verb" },
          { text: "och", wordClass: "conjunction" },
          { text: "dansar", wordClass: "verb" },
          { text: "på", wordClass: "preposition" },
          { text: "scenen", wordClass: "noun" },
          { text: "medan", wordClass: "conjunction" },
          { text: "publiken", wordClass: "noun" },
          { text: "applåderar", wordClass: "verb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Noun Level 4 - Complex sentences with many nouns
      {
        content: "Läraren, eleverna och föräldrarna diskuterar skolans framtid i klassrummet.",
        level: 4,
        wordClassType: "noun",
        difficulty: 4,
        words: [
          { text: "Läraren", wordClass: "noun" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "eleverna", wordClass: "noun" },
          { text: "och", wordClass: "conjunction" },
          { text: "föräldrarna", wordClass: "noun" },
          { text: "diskuterar", wordClass: "verb" },
          { text: "skolans", wordClass: "noun" },
          { text: "framtid", wordClass: "noun" },
          { text: "i", wordClass: "preposition" },
          { text: "klassrummet", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Adjective Level 4 - Complex sentences with multiple adjectives
      {
        content: "Den stora, vackra och dyra bilen var röd, blank och snabb.",
        level: 4,
        wordClassType: "adjective",
        difficulty: 4,
        words: [
          { text: "Den", wordClass: "pronoun" },
          { text: "stora", wordClass: "adjective" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "vackra", wordClass: "adjective" },
          { text: "och", wordClass: "conjunction" },
          { text: "dyra", wordClass: "adjective" },
          { text: "bilen", wordClass: "noun" },
          { text: "var", wordClass: "verb" },
          { text: "röd", wordClass: "adjective" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "blank", wordClass: "adjective" },
          { text: "och", wordClass: "conjunction" },
          { text: "snabb", wordClass: "adjective" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Adverb Level 4 - Complex sentences with multiple adverbs
      {
        content: "Han sprang snabbt, hoppade högt och landade mjukt på marken.",
        level: 4,
        wordClassType: "adverb",
        difficulty: 4,
        words: [
          { text: "Han", wordClass: "pronoun" },
          { text: "sprang", wordClass: "verb" },
          { text: "snabbt", wordClass: "adverb" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "hoppade", wordClass: "verb" },
          { text: "högt", wordClass: "adverb" },
          { text: "och", wordClass: "conjunction" },
          { text: "landade", wordClass: "verb" },
          { text: "mjukt", wordClass: "adverb" },
          { text: "på", wordClass: "preposition" },
          { text: "marken", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Pronoun Level 4 - Complex sentences with multiple pronouns
      {
        content: "Jag såg dig när du tittade på honom medan han pratade med henne.",
        level: 4,
        wordClassType: "pronoun",
        difficulty: 4,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "såg", wordClass: "verb" },
          { text: "dig", wordClass: "pronoun" },
          { text: "när", wordClass: "conjunction" },
          { text: "du", wordClass: "pronoun" },
          { text: "tittade", wordClass: "verb" },
          { text: "på", wordClass: "preposition" },
          { text: "honom", wordClass: "pronoun" },
          { text: "medan", wordClass: "conjunction" },
          { text: "han", wordClass: "pronoun" },
          { text: "pratade", wordClass: "verb" },
          { text: "med", wordClass: "preposition" },
          { text: "henne", wordClass: "pronoun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Preposition Level 4 - Complex sentences with many prepositions
      {
        content: "Katten sprang från huset, genom trädgården, över staketet till grannen.",
        level: 4,
        wordClassType: "preposition",
        difficulty: 4,
        words: [
          { text: "Katten", wordClass: "noun" },
          { text: "sprang", wordClass: "verb" },
          { text: "från", wordClass: "preposition" },
          { text: "huset", wordClass: "noun" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "genom", wordClass: "preposition" },
          { text: "trädgården", wordClass: "noun" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "över", wordClass: "preposition" },
          { text: "staketet", wordClass: "noun" },
          { text: "till", wordClass: "preposition" },
          { text: "grannen", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Conjunction Level 4 - Complex sentences with multiple conjunctions
      {
        content: "Jag ville gå men du ville stanna, så vi bestämde att vi skulle kompromissa.",
        level: 4,
        wordClassType: "conjunction",
        difficulty: 4,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "ville", wordClass: "verb" },
          { text: "gå", wordClass: "verb" },
          { text: "men", wordClass: "conjunction" },
          { text: "du", wordClass: "pronoun" },
          { text: "ville", wordClass: "verb" },
          { text: "stanna", wordClass: "verb" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "så", wordClass: "conjunction" },
          { text: "vi", wordClass: "pronoun" },
          { text: "bestämde", wordClass: "verb" },
          { text: "att", wordClass: "conjunction" },
          { text: "vi", wordClass: "pronoun" },
          { text: "skulle", wordClass: "verb" },
          { text: "kompromissa", wordClass: "verb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Interjection Level 4 - Complex sentences with multiple interjections
      {
        content: "Aj! Oj, det gjorde ont när jag slog mig! Uff, det var jobbigt!",
        level: 4,
        wordClassType: "interjection",
        difficulty: 4,
        words: [
          { text: "Aj", wordClass: "interjection" },
          { text: "!", isPunctuation: true, wordClass: "punctuation" },
          { text: "Oj", wordClass: "interjection" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "det", wordClass: "pronoun" },
          { text: "gjorde", wordClass: "verb" },
          { text: "ont", wordClass: "adverb" },
          { text: "när", wordClass: "conjunction" },
          { text: "jag", wordClass: "pronoun" },
          { text: "slog", wordClass: "verb" },
          { text: "mig", wordClass: "pronoun" },
          { text: "!", isPunctuation: true, wordClass: "punctuation" },
          { text: "Uff", wordClass: "interjection" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "det", wordClass: "pronoun" },
          { text: "var", wordClass: "verb" },
          { text: "jobbigt", wordClass: "adjective" },
          { text: "!", isPunctuation: true, wordClass: "punctuation" },
        ],
      },

      // Numeral Level 4 - Complex sentences with multiple numerals
      {
        content: "Första gången såg jag tre hundar, andra gången fem katter och tredje gången tio fåglar.",
        level: 4,
        wordClassType: "numeral",
        difficulty: 4,
        words: [
          { text: "Första", wordClass: "numeral" },
          { text: "gången", wordClass: "noun" },
          { text: "såg", wordClass: "verb" },
          { text: "jag", wordClass: "pronoun" },
          { text: "tre", wordClass: "numeral" },
          { text: "hundar", wordClass: "noun" },
          { text: ",", isPunctuation: true, wordClass: "punctuation" },
          { text: "andra", wordClass: "numeral" },
          { text: "gången", wordClass: "noun" },
          { text: "fem", wordClass: "numeral" },
          { text: "katter", wordClass: "noun" },
          { text: "och", wordClass: "conjunction" },
          { text: "tredje", wordClass: "numeral" },
          { text: "gången", wordClass: "noun" },
          { text: "tio", wordClass: "numeral" },
          { text: "fåglar", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
    ];

    sentencesData.forEach(data => {
      const id = randomUUID();
      this.sentences.set(id, { ...data, id });
    });
  }

  async getWordClasses(): Promise<WordClass[]> {
    return Array.from(this.wordClasses.values());
  }

  async getSentences(): Promise<Sentence[]> {
    return Array.from(this.sentences.values());
  }

  async getSentencesByLevel(level: number): Promise<Sentence[]> {
    return Array.from(this.sentences.values()).filter(sentence => sentence.level === level);
  }

  async getSentencesByWordClassAndLevel(wordClass: string, level: number): Promise<Sentence[]> {
    let filteredSentences = Array.from(this.sentences.values()).filter(sentence => 
      sentence.wordClassType === wordClass && sentence.difficulty === level
    );
    
    // Shuffle the sentences for random order
    filteredSentences = this.shuffleArray(filteredSentences);
    
    // For level 1, limit to 10 questions
    if (level === 1) {
      filteredSentences = filteredSentences.slice(0, 10);
    }
    
    return filteredSentences;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async getGameProgress(): Promise<GameProgress> {
    return { ...this.gameProgress };
  }

  async updateGameProgress(progress: Partial<GameProgress>): Promise<GameProgress> {
    this.gameProgress = { ...this.gameProgress, ...progress };
    return { ...this.gameProgress };
  }

  async resetGameProgress(): Promise<GameProgress> {
    this.gameProgress = {
      id: randomUUID(),
      score: 0,
      level: 1,
      correctAnswers: 0,
      wrongAnswers: 0,
      currentSentenceIndex: 0,
      completedSentences: [],
      completedLevels: {},
      correctAnswersByWordClass: {},
    };
    return { ...this.gameProgress };
  }
}

export const storage = new MemStorage();

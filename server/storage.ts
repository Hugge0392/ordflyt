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
      // Verb Level 1 - Simple sentences with 3-4 words
      {
        content: "Jag springer.",
        level: 1,
        wordClassType: "verb",
        difficulty: 1,
        words: [
          { text: "Jag", wordClass: "pronoun" },
          { text: "springer", wordClass: "verb" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "Hon läser boken.",
        level: 1,
        wordClassType: "verb",
        difficulty: 1,
        words: [
          { text: "Hon", wordClass: "pronoun" },
          { text: "läser", wordClass: "verb" },
          { text: "boken", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      // Verb Level 2 - Medium sentences with multiple verbs
      {
        content: "Barnen leker och skrattar.",
        level: 1,
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
      // Verb Level 3 - Complex sentences with no verbs (test case)
      {
        content: "En stor grön bok.",
        level: 1,
        wordClassType: "verb",
        difficulty: 3,
        words: [
          { text: "En", wordClass: "article" },
          { text: "stor", wordClass: "adjective" },
          { text: "grön", wordClass: "adjective" },
          { text: "bok", wordClass: "noun" },
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
        level: 1,
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
      // Adjective Level 2 - Multiple adjectives
      {
        content: "En stor, grön och vacker trädgård.",
        level: 1,
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
      // Adjective Level 3 - No adjectives
      {
        content: "Hunden springer fort.",
        level: 1,
        wordClassType: "adjective",
        difficulty: 3,
        words: [
          { text: "Hunden", wordClass: "noun" },
          { text: "springer", wordClass: "verb" },
          { text: "fort", wordClass: "adverb" },
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
        content: "Barnen leker glatt utomhus igår.",
        level: 1,
        wordClassType: "adverb",
        difficulty: 2,
        words: [
          { text: "Barnen", wordClass: "noun" },
          { text: "leker", wordClass: "verb" },
          { text: "glatt", wordClass: "adverb" },
          { text: "utomhus", wordClass: "adverb" },
          { text: "igår", wordClass: "adverb" },
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
        level: 1,
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
        level: 1,
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
        level: 1,
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
        level: 1,
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
    return Array.from(this.sentences.values()).filter(sentence => 
      sentence.wordClassType === wordClass && sentence.difficulty === level
    );
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
    };
    return { ...this.gameProgress };
  }
}

export const storage = new MemStorage();

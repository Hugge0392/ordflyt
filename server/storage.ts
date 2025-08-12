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
      { name: "verb", swedishName: "Verb", description: "handlingsord", color: "#4F46E5" },
      { name: "noun", swedishName: "Substantiv", description: "ting, namn", color: "#10B981" },
      { name: "adjective", swedishName: "Adjektiv", description: "beskrivande", color: "#F59E0B" },
      { name: "adverb", swedishName: "Adverb", description: "beskriver verb", color: "#8B5CF6" },
      { name: "pronoun", swedishName: "Pronomen", description: "jag, du, han", color: "#EC4899" },
      { name: "preposition", swedishName: "Preposition", description: "till, från, på", color: "#6B7280" },
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

      // Mixed levels for general practice
      {
        content: "Jag sprang snabbt till skolan igår.",
        level: 1,
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

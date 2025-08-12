import { type WordClass, type Sentence, type GameProgress, type Word } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getWordClasses(): Promise<WordClass[]>;
  getSentences(): Promise<Sentence[]>;
  getSentencesByLevel(level: number): Promise<Sentence[]>;
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

    // Initialize sentences
    const sentencesData: Omit<Sentence, 'id'>[] = [
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
      {
        content: "Den gröna bilen står utanför huset.",
        level: 1,
        words: [
          { text: "Den", wordClass: "pronoun" },
          { text: "gröna", wordClass: "adjective" },
          { text: "bilen", wordClass: "noun" },
          { text: "står", wordClass: "verb" },
          { text: "utanför", wordClass: "preposition" },
          { text: "huset", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "Hon läser en intressant bok varje kväll.",
        level: 1,
        words: [
          { text: "Hon", wordClass: "pronoun" },
          { text: "läser", wordClass: "verb" },
          { text: "en", wordClass: "pronoun" },
          { text: "intressant", wordClass: "adjective" },
          { text: "bok", wordClass: "noun" },
          { text: "varje", wordClass: "adjective" },
          { text: "kväll", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "Barnen leker glatt på den stora gården.",
        level: 2,
        words: [
          { text: "Barnen", wordClass: "noun" },
          { text: "leker", wordClass: "verb" },
          { text: "glatt", wordClass: "adverb" },
          { text: "på", wordClass: "preposition" },
          { text: "den", wordClass: "pronoun" },
          { text: "stora", wordClass: "adjective" },
          { text: "gården", wordClass: "noun" },
          { text: ".", isPunctuation: true, wordClass: "punctuation" },
        ],
      },
      {
        content: "Vi åker snabbt med det blå tåget imorgon.",
        level: 2,
        words: [
          { text: "Vi", wordClass: "pronoun" },
          { text: "åker", wordClass: "verb" },
          { text: "snabbt", wordClass: "adverb" },
          { text: "med", wordClass: "preposition" },
          { text: "det", wordClass: "pronoun" },
          { text: "blå", wordClass: "adjective" },
          { text: "tåget", wordClass: "noun" },
          { text: "imorgon", wordClass: "adverb" },
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
    };
    return { ...this.gameProgress };
  }
}

export const storage = new MemStorage();

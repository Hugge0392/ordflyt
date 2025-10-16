import { db } from "./db";
import { wordClasses, sentences } from "@shared/schema";
import { randomUUID } from "crypto";

async function migrate() {
  console.log("Starting migration...");

  // Clear existing data
  await db.delete(sentences);
  await db.delete(wordClasses);

  // Insert word classes
  const wordClassesData = [
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

  await db.insert(wordClasses).values(wordClassesData);
  console.log("Inserted word classes");

  // Insert sentences - Level 1 from PDF
  const sentencesData = [
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
    
   
    // Add more sentences here following the same pattern...
  ];

  // Insert sentences in chunks for better performance
  const chunkSize = 100;
  for (let i = 0; i < sentencesData.length; i += chunkSize) {
    const chunk = sentencesData.slice(i, i + chunkSize);
    await db.insert(sentences).values(chunk);
    console.log(`Inserted sentences chunk ${Math.floor(i / chunkSize) + 1}`);
  }

  console.log("Migration completed!");
  process.exit(0);
}

migrate().catch(console.error);
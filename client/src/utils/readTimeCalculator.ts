// Calculate reading time based on word count
// Average reading speed: 200-250 words per minute (we use 225)

export interface ReadTimeResult {
  minutes: number;
  words: number;
  text: string;
}

export function calculateReadTime(content: any): ReadTimeResult {
  if (!content) {
    return { minutes: 0, words: 0, text: '0 min läsning' };
  }

  let text = '';

  // Extract text from HTML content
  if (content.html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content.html, 'text/html');
    text = doc.body.textContent || '';
  } else if (typeof content === 'string') {
    text = content;
  } else if (content.blocks) {
    // If content is in blocks format
    text = content.blocks
      .map((block: any) => block.text || '')
      .join(' ');
  }

  // Count words
  const words = text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;

  // Calculate minutes (225 words per minute)
  const minutes = Math.ceil(words / 225);

  // Format text
  let readTimeText = '';
  if (minutes < 1) {
    readTimeText = '< 1 min läsning';
  } else if (minutes === 1) {
    readTimeText = '1 min läsning';
  } else {
    readTimeText = `${minutes} min läsning`;
  }

  return {
    minutes,
    words,
    text: readTimeText,
  };
}

// Calculate readability score (Flesch Reading Ease adapted for Swedish)
export function calculateReadability(text: string): number {
  if (!text || text.length < 100) return 0;

  // Count sentences (approximation)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

  // Count words
  const words = text.trim().split(/\s+/).length;

  // Count syllables (simplified for Swedish)
  const syllables = countSyllables(text);

  if (sentences === 0 || words === 0) return 0;

  // Flesch Reading Ease formula (adapted)
  // Score: 206.835 - 1.015(words/sentences) - 84.6(syllables/words)
  const avgWordsPerSentence = words / sentences;
  const avgSyllablesPerWord = syllables / words;

  let score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

  // Normalize to 0-100
  score = Math.max(0, Math.min(100, score));

  return Math.round(score);
}

function countSyllables(text: string): number {
  // Simplified syllable counter for Swedish
  const words = text.toLowerCase().split(/\s+/);
  let syllableCount = 0;

  for (const word of words) {
    // Count vowel groups (a, e, i, o, u, y, å, ä, ö)
    const vowelGroups = word.match(/[aeiouyåäö]+/g);
    if (vowelGroups) {
      syllableCount += vowelGroups.length;
    } else {
      // If no vowels, count as 1 syllable
      syllableCount += 1;
    }
  }

  return syllableCount;
}

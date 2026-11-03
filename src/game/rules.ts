import { DifficultyLevel, WordItem } from '../types/game';

/**
 * Normalizes a character for matching in Spanish hangman.
 * Converts to uppercase and removes accents (Á->A, É->E, Í->I, Ó->O, Ú->U, Ü->U),
 * while preserving Ñ as an independent Spanish letter.
 */
export function normalizeChar(char: string): string {
  if (!char) return '';
  const upper = char.toUpperCase();
  if (upper === 'Ñ') return 'Ñ';
  
  return upper
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Checks whether a given guess matches any character in the secret word,
 * considering Spanish diacritics equivalence.
 */
export function isLetterInWord(guess: string, secretWord: string): boolean {
  if (!guess || !secretWord) return false;
  const normGuess = normalizeChar(guess);
  
  for (const char of secretWord) {
    if (normalizeChar(char) === normGuess) {
      return true;
    }
  }
  return false;
}

/**
 * Generates the array of characters to display:
 * Shows guessed letters (with original accents), spaces as spaces, and '_' for hidden letters.
 */
export function getDisplayMask(secretWord: string, guessedLetters: Set<string>): string[] {
  const normGuessed = new Set(Array.from(guessedLetters).map(l => normalizeChar(l)));
  
  return Array.from(secretWord).map(char => {
    if (char === ' ' || char === '-' || char === '\'') {
      return char;
    }
    const norm = normalizeChar(char);
    if (normGuessed.has(norm)) {
      return char; // Return original char (e.g. preserves 'Ó' if guessed 'O' or 'Ó')
    }
    return '_';
  });
}

/**
 * Checks whether the player has won the game.
 * All letters in the secret word must be discovered (or be spaces/punctuation).
 */
export function checkWinCondition(secretWord: string, guessedLetters: Set<string>): boolean {
  if (!secretWord || secretWord.trim() === '') return false;
  const normGuessed = new Set(Array.from(guessedLetters).map(l => normalizeChar(l)));
  
  for (const char of secretWord) {
    if (char === ' ' || char === '-' || char === '\'') continue;
    const norm = normalizeChar(char);
    if (!normGuessed.has(norm)) {
      return false;
    }
  }
  return true;
}

/**
 * Checks whether the player has lost based on mistakes made.
 */
export function checkLossCondition(mistakes: number, maxMistakes: number): boolean {
  return mistakes >= maxMistakes;
}

/**
 * Calculates score earned for a round based on:
 * - Base points for correct letters: +10 each
 * - Word discovery bonus: +50
 * - Mistakes penalty deduction
 * - Bonus for not using hints: +25
 * - Difficulty multiplier (facil: 1x, normal: 1.2x, dificil: 1.5x, experto: 2.0x)
 */
export function calculateRoundScore(
  distinctLettersFound: number,
  mistakes: number,
  maxMistakes: number,
  hintUsed: boolean,
  difficulty: DifficultyLevel = 'normal'
): number {
  const letterScore = distinctLettersFound * 10;
  const wordBonus = 50;
  const remainingLifeBonus = Math.max(0, (maxMistakes - mistakes) * 5);
  const noHintBonus = hintUsed ? 0 : 25;

  const difficultyMultiplier: Record<DifficultyLevel, number> = {
    facil: 1.0,
    normal: 1.2,
    dificil: 1.5,
    experto: 2.0,
  };

  const rawScore = letterScore + wordBonus + remainingLifeBonus + noHintBonus;
  return Math.round(rawScore * (difficultyMultiplier[difficulty] || 1.0));
}

/**
 * Validates a custom or secret word input:
 * - Must be at least 3 letters
 * - Must not exceed 25 characters
 * - Only alphabetic characters and single spaces allowed
 */
export function validateCustomWord(word: string, hint?: string): { valid: boolean; error?: string } {
  const trimmed = (word || '').trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'La palabra debe tener al menos 3 letras.' };
  }
  if (trimmed.length > 25) {
    return { valid: false, error: 'La palabra no debe superar los 25 caracteres.' };
  }
  // Allow letters (including accents and ñ) and spaces
  const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s-]+$/;
  if (!regex.test(trimmed)) {
    return { valid: false, error: 'Solo se permiten letras en español, espacios o guiones.' };
  }
  if (hint && hint.toLowerCase().includes(trimmed.toLowerCase())) {
    return { valid: false, error: 'La pista no debe contener la palabra secreta.' };
  }
  return { valid: true };
}

/**
 * Filters a word collection by category, difficulty, search query and favorite status.
 */
export function filterWordCollection(
  words: WordItem[],
  options: {
    category?: string;
    difficulty?: string;
    search?: string;
    favoritesOnly?: boolean;
  }
): WordItem[] {
  return words.filter(item => {
    if (options.category && options.category !== 'all' && item.category.toLowerCase() !== options.category.toLowerCase()) {
      return false;
    }
    if (options.difficulty && options.difficulty !== 'all' && item.difficulty !== options.difficulty) {
      return false;
    }
    if (options.favoritesOnly && !item.isFavorite) {
      return false;
    }
    if (options.search) {
      const q = options.search.toLowerCase().trim();
      const matchWord = item.word.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchHint = item.hint.toLowerCase().includes(q);
      if (!matchWord && !matchCategory && !matchHint) {
        return false;
      }
    }
    return true;
  });
}

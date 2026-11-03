export type DifficultyLevel = 'facil' | 'normal' | 'dificil' | 'experto';

export interface WordItem {
  id: string;
  word: string;
  category: string;
  difficulty: DifficultyLevel;
  hint: string;
  length: number;
  language: string;
  isFavorite?: boolean;
  createdAt: string;
  source: 'preset' | 'ai' | 'custom';
}

export type GameMode = 
  | 'solo' 
  | 'local_secret' 
  | 'local_duel' 
  | 'online' 
  | 'generator' 
  | 'library' 
  | 'stats' 
  | 'changelog';

export interface GameSettings {
  category: string;
  difficulty: DifficultyLevel;
  source: 'preset' | 'ai' | 'library';
  roundCount: number | 'infinite';
  hintsEnabled: boolean;
  maxAttempts: number; // 6, 7, 8
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  wordsDiscovered: number;
  bestStreak: number;
  currentStreak: number;
  correctLetters: number;
  incorrectLetters: number;
  favoriteCategories: Record<string, number>;
  difficultyPlayed: Record<DifficultyLevel, number>;
  totalTimeSeconds: number;
}

export interface OnlineRoomState {
  code: string;
  mode: 'duel' | 'turns' | 'secret_word';
  hostName: string;
  guestName?: string;
  hostReady: boolean;
  guestReady: boolean;
  status: 'waiting' | 'in_progress' | 'round_over' | 'finished';
  currentRound: number;
  totalRounds: number;
  currentTurn: 'host' | 'guest';
  scores: {
    host: number;
    guest: number;
  };
  // The word is kept masked from guest if secret word or in progress
  displayWord: string[];
  wordLength: number;
  category: string;
  hint?: string;
  guessedLetters: string[];
  mistakes: number;
  maxMistakes: number;
  winner?: 'host' | 'guest' | 'draw' | null;
  secretWordRevealed?: string; // only revealed when round concludes
  lastActivity: number;
}

export interface ModuleAuditStatus {
  id: string;
  name: string;
  version: string;
  status: 'passed' | 'warning' | 'pending';
  description: string;
  features: string[];
}

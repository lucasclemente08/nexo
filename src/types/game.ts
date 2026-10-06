export type GameStatus = 'NOT_STARTED' | 'PLAYING' | 'WON' | 'LOST';

export interface SolvedContact {
  position: number;
  answer: string;
  clue: string;
}

export interface GameState {
  puzzleId: number;
  status: GameStatus;
  revealedPrefix: string;
  currentContactIndex: number;
  solvedContacts: SolvedContact[];
  secretAttempts: string[];
  lives: number;
  maxLives: number;
  startedAt: number | null;
  finishedAt: number | null;
  durationSeconds: number;
}

export interface GameStats {
  played: number;
  won: number;
  currentStreak: number;
  bestStreak: number;
  contactsDistribution: { [key: number]: number }; // ej: { 1: 3, 2: 8, 3: 12, 4: 5 }
  lastPlayedDate: string | null;
}

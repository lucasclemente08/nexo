import { GameState, GameStats } from '../types/game';

const STATS_KEY = 'nexo_player_stats_v1';
const TUTORIAL_KEY = 'nexo_tutorial_seen_v1';
const STATE_PREFIX = 'nexo_game_state_p';

export const defaultStats: GameStats = {
  played: 0,
  won: 0,
  currentStreak: 0,
  bestStreak: 0,
  contactsDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  lastPlayedDate: null,
};

export function loadGameStats(): GameStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...defaultStats };
    return { ...defaultStats, ...JSON.parse(raw) };
  } catch {
    return { ...defaultStats };
  }
}

export function saveGameStats(stats: GameStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (err) {
    console.error('Error saving stats to localStorage', err);
  }
}

export function loadSavedGameState(puzzleId: number): GameState | null {
  try {
    const raw = localStorage.getItem(`${STATE_PREFIX}${puzzleId}`);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(`${STATE_PREFIX}${state.puzzleId}`, JSON.stringify(state));
  } catch (err) {
    console.error('Error saving game state', err);
  }
}

export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markTutorialAsSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, 'true');
  } catch {
    // ignore
  }
}

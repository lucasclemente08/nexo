import { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { NexoPuzzle } from '../types/puzzle';
import { GameState, GameStats, SolvedContact } from '../types/game';
import { normalizeWord, matchesPrefix } from '../utils/normalizeWord';
import {
  loadSavedGameState,
  saveGameState,
  loadGameStats,
  saveGameStats,
} from '../utils/storage';
import { getTodayPuzzle } from '../data/puzzles';

export function useNexoGame(initialPuzzleId?: number) {
  const [puzzle, setPuzzle] = useState<NexoPuzzle>(() => getTodayPuzzle(initialPuzzleId));
  const [stats, setStats] = useState<GameStats>(() => loadGameStats());

  // Estado inicial de la partida
  const initGameState = (p: NexoPuzzle): GameState => ({
    puzzleId: p.id,
    status: 'NOT_STARTED',
    revealedPrefix: p.initialPrefix,
    currentContactIndex: 0,
    solvedContacts: [],
    secretAttempts: [],
    lives: 3,
    maxLives: 3,
    startedAt: null,
    finishedAt: null,
    durationSeconds: 0,
  });

  const [state, setState] = useState<GameState>(() => {
    const saved = loadSavedGameState(puzzle.id);
    return saved || initGameState(puzzle);
  });

  // Guardar estado cada vez que cambia
  useEffect(() => {
    saveGameState(state);
  }, [state]);

  // Si cambia de puzzle seleccionado
  const selectPuzzle = (puzzleId: number) => {
    const newPuzzle = getTodayPuzzle(puzzleId);
    setPuzzle(newPuzzle);
    const saved = loadSavedGameState(newPuzzle.id);
    setState(saved || initGameState(newPuzzle));
  };

  const startPlaying = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'NOT_STARTED') return prev;
      return {
        ...prev,
        status: 'PLAYING',
        startedAt: Date.now(),
      };
    });
  }, []);

  // Lanzar confeti al ganar
  const triggerWinCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899'],
      });
    } catch {
      // ignore
    }
  };

  // Actualizar estadísticas al finalizar partida
  const updateStatsOnFinish = (won: boolean, contactsUsed: number) => {
    setStats((prev) => {
      const newPlayed = prev.played + 1;
      const newWon = won ? prev.won + 1 : prev.won;
      const newStreak = won ? prev.currentStreak + 1 : 0;
      const newBestStreak = Math.max(prev.bestStreak, newStreak);
      const newDist = { ...prev.contactsDistribution };
      
      if (won) {
        newDist[contactsUsed] = (newDist[contactsUsed] || 0) + 1;
      }

      const updated: GameStats = {
        played: newPlayed,
        won: newWon,
        currentStreak: newStreak,
        bestStreak: newBestStreak,
        contactsDistribution: newDist,
        lastPlayedDate: puzzle.date,
      };

      saveGameStats(updated);
      return updated;
    });
  };

  // Enviar intento para el contacto actual
  const submitContactGuess = (
    guess: string
  ): {
    success: boolean;
    error?: string;
    newPrefix?: string;
    newLetter?: string;
  } => {
    if (state.status !== 'PLAYING') {
      return { success: false, error: 'La partida no está activa.' };
    }

    const currentClue = puzzle.contacts[state.currentContactIndex];
    if (!currentClue) {
      return { success: false, error: 'No quedan más contactos disponibles.' };
    }

    const normGuess = normalizeWord(guess);
    const expectedPrefix = normalizeWord(currentClue.prefix);

    // 1. Validar que comience con el prefijo obligatorio
    if (!matchesPrefix(guess, expectedPrefix)) {
      return {
        success: false,
        error: `Debe comenzar con "${currentClue.prefix}".`,
      };
    }

    // 2. Comprobar contra la respuesta canónica y variantes aceptadas
    const normAnswer = normalizeWord(currentClue.answer);
    const normAccepted = (currentClue.accepted || []).map(normalizeWord);
    const isCorrect = normGuess === normAnswer || normAccepted.includes(normGuess);

    if (!isCorrect) {
      return {
        success: false,
        error: 'No hay contacto. Probá otra palabra.',
      };
    }

    // ¡Acierto de contacto!
    // Calcular siguiente letra de la palabra secreta a revelar
    const currentPrefixLength = state.revealedPrefix.length;
    const nextPrefixLength = currentPrefixLength + 1;
    const nextPrefix = puzzle.secretWord.slice(0, nextPrefixLength);
    const newlyRevealedLetter = puzzle.secretWord[currentPrefixLength] || '';

    const newSolved: SolvedContact = {
      position: currentClue.position,
      answer: currentClue.answer,
      clue: currentClue.clue,
    };

    setState((prev) => ({
      ...prev,
      revealedPrefix: nextPrefix,
      currentContactIndex: prev.currentContactIndex + 1,
      solvedContacts: [...prev.solvedContacts, newSolved],
    }));

    return {
      success: true,
      newPrefix: nextPrefix,
      newLetter: newlyRevealedLetter,
    };
  };

  // Enviar intento para resolver el NEXO (palabra secreta)
  const submitSecretGuess = (
    guess: string,
    currentDuration: number
  ): {
    success: boolean;
    gameOver: boolean;
    error?: string;
    livesLeft: number;
  } => {
    if (state.status !== 'PLAYING') {
      return { success: false, gameOver: false, error: 'Partida inactiva.', livesLeft: state.lives };
    }

    const normGuess = normalizeWord(guess);
    const normSecret = normalizeWord(puzzle.secretWord);

    if (normGuess === normSecret) {
      // ¡Victoria!
      triggerWinCelebration();
      const finalContactsUsed = state.solvedContacts.length;

      setState((prev) => ({
        ...prev,
        status: 'WON',
        revealedPrefix: puzzle.secretWord,
        finishedAt: Date.now(),
        durationSeconds: currentDuration,
      }));

      updateStatsOnFinish(true, finalContactsUsed);

      return {
        success: true,
        gameOver: true,
        livesLeft: state.lives,
      };
    } else {
      // Intento fallido -> Pierde una vida
      const newLives = state.lives - 1;
      const isGameOver = newLives <= 0;

      setState((prev) => ({
        ...prev,
        lives: Math.max(0, newLives),
        secretAttempts: [...prev.secretAttempts, guess.trim().toUpperCase()],
        status: isGameOver ? 'LOST' : prev.status,
        finishedAt: isGameOver ? Date.now() : prev.finishedAt,
        durationSeconds: isGameOver ? currentDuration : prev.durationSeconds,
      }));

      if (isGameOver) {
        updateStatsOnFinish(false, state.solvedContacts.length);
      }

      return {
        success: false,
        gameOver: isGameOver,
        error: isGameOver
          ? `Te quedaste sin vidas. El Nexo era: ${puzzle.secretWord}`
          : 'No es el Nexo.',
        livesLeft: Math.max(0, newLives),
      };
    }
  };

  const restartCurrentPuzzle = () => {
    const fresh = initGameState(puzzle);
    saveGameState(fresh);
    setState(fresh);
  };

  return {
    puzzle,
    state,
    stats,
    selectPuzzle,
    startPlaying,
    submitContactGuess,
    submitSecretGuess,
    restartCurrentPuzzle,
  };
}

import React, { useState, useEffect } from 'react';
import { useNexoGame } from './hooks/useNexoGame';
import { useTimer } from './hooks/useTimer';
import { Header } from './components/Header';
import { WordProgress } from './components/WordProgress';
import { Lives } from './components/Lives';
import { ContactCard } from './components/ContactCard';
import { SecretGuessModal } from './components/SecretGuessModal';
import { ResultModal } from './components/ResultModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { StatsModal } from './components/StatsModal';
import { formatTime } from './utils/normalizeWord';
import { hasSeenTutorial, markTutorialAsSeen } from './utils/storage';
import { Target, Clock, Play, Flame, Trophy, Sparkles } from 'lucide-react';

export function App() {
  const {
    puzzle,
    state,
    stats,
    selectPuzzle,
    startPlaying,
    submitContactGuess,
    submitSecretGuess,
    restartCurrentPuzzle,
  } = useNexoGame();

  const isGameActive = state.status === 'PLAYING';
  const { seconds: timerSeconds, reset: resetTimer } = useTimer(
    isGameActive,
    state.durationSeconds
  );

  // Modales
  const [showTutorial, setShowTutorial] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  // Mostrar tutorial la primera vez automáticamente
  useEffect(() => {
    if (!hasSeenTutorial()) {
      setShowTutorial(true);
      markTutorialAsSeen();
    }
  }, []);

  // Mostrar modal de resultado al ganar o perder
  useEffect(() => {
    if (state.status === 'WON' || state.status === 'LOST') {
      const timer = setTimeout(() => {
        setShowResultModal(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [state.status]);

  const handleStartGame = () => {
    resetTimer(0);
    startPlaying();
  };

  const handleRestart = () => {
    resetTimer(0);
    restartCurrentPuzzle();
    setShowResultModal(false);
    setShowSecretModal(false);
  };

  const handleGuessSecret = (guess: string) => {
    return submitSecretGuess(guess, timerSeconds);
  };

  const currentContactClue = puzzle.contacts[state.currentContactIndex];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between py-6 px-4 sm:px-6 bg-[#FBF9F5] text-[#1A1A18] antialiased">
      {/* Contenedor central acotado (mobile first: 390px - 440px) */}
      <div className="w-full max-w-[420px] flex flex-col flex-1 items-center justify-between">
        {/* Cabecera general */}
        <Header
          puzzle={puzzle}
          onOpenTutorial={() => setShowTutorial(true)}
          onOpenStats={() => setShowStats(true)}
          onReset={handleRestart}
          onSelectPuzzle={selectPuzzle}
        />

        {/* ======================================================== */}
        {/* PANTALLA 1: NOT_STARTED (Hero de bienvenida según Punto 10) */}
        {/* ======================================================== */}
        {state.status === 'NOT_STARTED' && (
          <div className="flex-1 w-full flex flex-col items-center justify-center text-center py-6 animate-in fade-in duration-300">
            <span className="text-xs font-mono tracking-widest uppercase text-[#8C867A] mb-2">
              Desafío diario #{puzzle.id}
            </span>
            <h2 className="font-editorial text-4xl sm:text-5xl font-bold tracking-tight text-[#1A1A18] mb-3">
              Encontrá la palabra.
            </h2>

            {/* Muestra previa de la palabra inicial */}
            <div className="my-6">
              <WordProgress
                secretWord={puzzle.secretWord}
                revealedPrefix={puzzle.initialPrefix}
              />
            </div>

            <p className="text-sm text-[#736F66] max-w-xs mb-8 leading-relaxed">
              Un contacto revela una letra. Adiviná el <strong>NEXO</strong> antes
              de agotar tus contactos.
            </p>

            <button
              onClick={handleStartGame}
              className="w-full py-4 px-6 bg-[#1A1A18] hover:bg-[#333330] active:scale-[0.99] text-white font-bold text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play size={18} fill="currentColor" />
              <span>Jugar NEXO</span>
            </button>

            {/* Fila inferior de métricas rápidas */}
            <div className="w-full flex items-center justify-around border-t border-[#EAE5DA] pt-6 mt-8 text-xs font-mono text-[#736F66]">
              <div className="flex items-center gap-1.5">
                <Flame size={16} className="text-orange-500" />
                <span>{stats.currentStreak} días de racha</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy size={16} className="text-amber-500" />
                <span>
                  {stats.played > 0
                    ? `${Math.round((stats.won / stats.played) * 100)}% victorias`
                    : 'Primer intento'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PANTALLA 2: JUEGO ACTIVO (PLAYING / WON / LOST) */}
        {/* ======================================================== */}
        {state.status !== 'NOT_STARTED' && (
          <div className="flex-1 w-full flex flex-col justify-between animate-in fade-in duration-300">
            {/* 1. Mosaico de la palabra secreta */}
            <div>
              <WordProgress
                secretWord={puzzle.secretWord}
                revealedPrefix={state.revealedPrefix}
                isCompleted={state.status === 'WON'}
              />

              {/* 2. Barra de estado en partida: Vidas + Cronómetro */}
              <div className="flex items-center justify-between bg-[#F4F0E8] py-2 px-3.5 rounded-xl border border-[#E8E2D5] my-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase text-[#787368] font-semibold">
                    Vidas:
                  </span>
                  <Lives lives={state.lives} maxLives={state.maxLives} />
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#1A1A18]">
                  <Clock size={14} className="text-[#8C867A]" />
                  <span>
                    {formatTime(
                      state.status === 'PLAYING'
                        ? timerSeconds
                        : state.durationSeconds
                    )}
                  </span>
                </div>
              </div>

              {/* 3. Botón de Arriesgar NEXO (Tensión constante de la decisión estratégica) */}
              {state.status === 'PLAYING' && (
                <div className="my-2">
                  <button
                    onClick={() => setShowSecretModal(true)}
                    className="w-full py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500/20 active:scale-[0.99] border border-amber-500/30 text-amber-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Target size={15} className="text-amber-700" />
                    <span>¿Ya sabés la palabra? Resolver NEXO</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Tarjeta del Contacto activo */}
            <div className="my-2 flex-1 flex flex-col justify-center">
              <ContactCard
                currentClue={currentContactClue}
                totalContacts={puzzle.contacts.length}
                solvedContacts={state.solvedContacts}
                onGuess={submitContactGuess}
                disabled={state.status !== 'PLAYING'}
              />
            </div>

            {/* 5. Footer con acceso rápido a resultados si ya terminó */}
            {(state.status === 'WON' || state.status === 'LOST') && (
              <div className="pt-2">
                <button
                  onClick={() => setShowResultModal(true)}
                  className="w-full py-3 bg-[#1A1A18] text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-[#333330] transition-colors"
                >
                  Ver resultado y compartir
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer discreto */}
        <footer className="w-full text-center pt-4 border-t border-[#EAE5DA] mt-4">
          <p className="text-[11px] font-mono text-[#A8A295]">
            NEXO — Un juego diario en español
          </p>
        </footer>
      </div>

      {/* ================= Modales ================= */}
      <SecretGuessModal
        isOpen={showSecretModal}
        onClose={() => setShowSecretModal(false)}
        onSubmit={handleGuessSecret}
        lives={state.lives}
        maxLives={state.maxLives}
        secretWordLength={puzzle.secretWord.length}
        revealedPrefix={state.revealedPrefix}
        pastAttempts={state.secretAttempts}
      />

      <ResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        puzzle={puzzle}
        state={{
          ...state,
          durationSeconds:
            state.durationSeconds > 0 ? state.durationSeconds : timerSeconds,
        }}
        stats={stats}
        onRestart={handleRestart}
        onOpenStats={() => {
          setShowResultModal(false);
          setShowStats(true);
        }}
      />

      <HowToPlayModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      <StatsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
      />
    </div>
  );
}
export default App;

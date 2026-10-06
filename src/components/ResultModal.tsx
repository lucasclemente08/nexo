import React, { useState, useEffect } from 'react';
import { NexoPuzzle } from '../types/puzzle';
import { GameState, GameStats } from '../types/game';
import { formatTime } from '../utils/normalizeWord';
import { shareResult, generateShareText } from '../utils/shareResult';
import { Zap, Heart, Clock, Flame, Share2, Check, X, RotateCcw } from 'lucide-react';

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  puzzle: NexoPuzzle;
  state: GameState;
  stats: GameStats;
  onRestart: () => void;
  onOpenStats: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  onClose,
  puzzle,
  state,
  stats,
  onRestart,
  onOpenStats,
}) => {
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState('');

  // Cuenta regresiva hasta medianoche (00:00)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diffMs = tomorrow.getTime() - now.getTime();

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

      setCountdown(
        `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  const isWon = state.status === 'WON';
  const contactsCount = state.solvedContacts.length;

  // Cálculo estimativo del percentil para el feedback competitivo
  const calculatePercentile = () => {
    if (!isWon) return null;
    if (contactsCount === 1) return 'TOP 4%';
    if (contactsCount === 2) return 'TOP 18%';
    if (contactsCount === 3) return 'Mejor que el 64%';
    return 'Mejor que el 45%';
  };

  const percentileText = calculatePercentile();

  const handleShare = async () => {
    const res = await shareResult({
      puzzleNumber: puzzle.id,
      won: isWon,
      contactsSolved: contactsCount,
      livesRemaining: state.lives,
      maxLives: state.maxLives,
      durationSeconds: state.durationSeconds,
      currentStreak: stats.currentStreak,
    });

    if (res.copied) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#FBF9F5] rounded-3xl border border-[#E6E1D8] shadow-2xl p-6 relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#8C867A] hover:text-[#1A1A18] hover:bg-[#EFECE6] rounded-full transition-colors cursor-pointer"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        {/* Emblema superior */}
        <div className="inline-flex p-3 rounded-full mb-3 text-3xl">
          {isWon ? '🎯' : '💔'}
        </div>

        <h2 className="font-editorial text-3xl font-bold text-[#1A1A18] tracking-tight">
          {isWon ? 'NEXO RESUELTO' : 'FIN DE PARTIDA'}
        </h2>

        {/* Palabra revelada */}
        <div className="my-4 py-2 px-4 bg-[#F2EEE4] rounded-2xl border border-[#E4DDD0] inline-block">
          <div className="text-[10px] font-mono tracking-widest text-[#8C867A] uppercase">
            Palabra del día
          </div>
          <div className="text-2xl font-mono-tile font-extrabold tracking-wider text-[#1A1A18]">
            {puzzle.secretWord}
          </div>
        </div>

        {/* Mensaje de percentil / desempeño */}
        {percentileText && (
          <div className="text-sm font-semibold text-emerald-800 bg-emerald-50/80 border border-emerald-200/80 rounded-xl py-2 px-3 mb-4">
            Hoy estás en el <strong>{percentileText}</strong>
          </div>
        )}

        {/* Tarjetas de estadísticas de la partida */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <div className="bg-white p-2.5 rounded-xl border border-[#EAE5DA] shadow-2xs">
            <div className="flex justify-center text-amber-500 mb-1">
              <Zap size={16} fill="currentColor" />
            </div>
            <div className="text-lg font-mono font-bold text-[#1A1A18]">
              {contactsCount}
            </div>
            <div className="text-[10px] text-[#8C867A] leading-tight">
              Contactos
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-[#EAE5DA] shadow-2xs">
            <div className="flex justify-center text-rose-500 mb-1">
              <Heart size={16} fill="currentColor" />
            </div>
            <div className="text-lg font-mono font-bold text-[#1A1A18]">
              {state.lives}/{state.maxLives}
            </div>
            <div className="text-[10px] text-[#8C867A] leading-tight">
              Vidas
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-[#EAE5DA] shadow-2xs">
            <div className="flex justify-center text-blue-500 mb-1">
              <Clock size={16} />
            </div>
            <div className="text-sm font-mono font-bold text-[#1A1A18] pt-0.5">
              {formatTime(state.durationSeconds)}
            </div>
            <div className="text-[10px] text-[#8C867A] leading-tight mt-0.5">
              Tiempo
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-[#EAE5DA] shadow-2xs">
            <div className="flex justify-center text-orange-500 mb-1">
              <Flame size={16} fill="currentColor" />
            </div>
            <div className="text-lg font-mono font-bold text-[#1A1A18]">
              {stats.currentStreak}
            </div>
            <div className="text-[10px] text-[#8C867A] leading-tight">
              Racha
            </div>
          </div>
        </div>

        {/* Botón de Compartir */}
        <button
          onClick={handleShare}
          className="w-full py-3.5 px-4 bg-[#1A1A18] hover:bg-[#333330] active:scale-[0.99] text-white text-sm font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md mb-3"
        >
          {copied ? (
            <>
              <Check size={18} className="text-emerald-400" />
              <span>¡Copiado al portapapeles!</span>
            </>
          ) : (
            <>
              <Share2 size={18} />
              <span>Compartir resultado</span>
            </>
          )}
        </button>

        {/* Cuenta regresiva para el siguiente NEXO */}
        <div className="py-2.5 text-xs text-[#8C867A] font-mono border-t border-[#EAE5DA] mt-2 flex items-center justify-between px-1">
          <span>Nuevo NEXO en:</span>
          <span className="font-bold text-[#1A1A18] bg-[#F2EEE4] px-2 py-0.5 rounded">
            {countdown}
          </span>
        </div>

        <div className="flex items-center justify-center gap-3 mt-3 text-xs text-[#6B665C]">
          <button
            onClick={onOpenStats}
            className="hover:underline cursor-pointer"
          >
            Ver estadísticas
          </button>
          <span>•</span>
          <button
            onClick={() => {
              onRestart();
              onClose();
            }}
            className="hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Reintentar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Target, AlertTriangle } from 'lucide-react';
import { Lives } from './Lives';

interface SecretGuessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (guess: string) => { success: boolean; gameOver: boolean; error?: string };
  lives: number;
  maxLives: number;
  secretWordLength: number;
  revealedPrefix: string;
  pastAttempts: string[];
}

export const SecretGuessModal: React.FC<SecretGuessModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  lives,
  maxLives,
  secretWordLength,
  revealedPrefix,
  pastAttempts,
}) => {
  const [guess, setGuess] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setGuess('');
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim()) return;

    const res = onSubmit(guess.trim());
    if (!res.success) {
      setErrorMsg(res.error || 'No es el Nexo.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      if (res.gameOver) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#FBF9F5] rounded-3xl border border-[#E6E1D8] shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#8C867A] hover:text-[#1A1A18] hover:bg-[#EFECE6] rounded-full transition-colors cursor-pointer"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-4">
          <div className="inline-flex p-2.5 bg-amber-100/70 text-amber-800 rounded-full mb-2">
            <Target size={22} strokeWidth={2.5} />
          </div>
          <h2 className="font-editorial text-2xl font-bold text-[#1A1A18]">
            Resolver el NEXO
          </h2>
          <p className="text-xs text-[#736F66] mt-1">
            Palabra de {secretWordLength} letras. Si fallás, perdés 1 vida.
          </p>

          <div className="flex items-center justify-center mt-3">
            <Lives lives={lives} maxLives={maxLives} />
          </div>
        </div>

        {/* Intentos fallidos previos */}
        {pastAttempts.length > 0 && (
          <div className="mb-4 p-2.5 bg-rose-50/70 border border-rose-200/80 rounded-xl text-center">
            <div className="text-[10px] font-mono uppercase tracking-wider text-rose-700 font-bold mb-1">
              Intentos incorrectos
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {pastAttempts.map((att, i) => (
                <span
                  key={i}
                  className="font-mono text-xs px-2 py-0.5 bg-rose-100 text-rose-800 rounded line-through decoration-rose-500 font-semibold"
                >
                  {att}
                </span>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="text"
              autoFocus
              value={guess}
              onChange={(e) => {
                setGuess(e.target.value.toUpperCase());
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder={`Palabra de ${secretWordLength} letras`}
              maxLength={secretWordLength + 4}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              className={`w-full py-3.5 px-4 text-center text-xl font-mono font-bold uppercase tracking-widest bg-white border rounded-xl outline-none transition-all ${
                shake
                  ? 'animate-shake border-rose-500 bg-rose-50/40 text-rose-700'
                  : 'border-[#D4CEC2] focus:border-[#1A1A18]'
              }`}
            />
          </div>

          {errorMsg && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 py-1.5 px-3 rounded-lg border border-rose-200">
              <AlertTriangle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 text-xs font-semibold text-[#5A554A] bg-[#EFECE6] hover:bg-[#E5E0D5] rounded-xl transition-colors cursor-pointer"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={!guess.trim()}
              className="w-2/3 py-3 bg-[#1A1A18] hover:bg-[#333330] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all disabled:opacity-40 cursor-pointer shadow-sm"
            >
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

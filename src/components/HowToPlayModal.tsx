import React from 'react';
import { X, ArrowRight, Zap, Target, Heart } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

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

        <div className="text-center mb-5">
          <h2 className="font-editorial text-3xl font-bold text-[#1A1A18] tracking-tight">
            ¿Cómo se juega?
          </h2>
          <p className="text-xs text-[#8C867A] mt-1 font-mono uppercase tracking-wider">
            Reglas del juego
          </p>
        </div>

        <div className="space-y-4 text-xs text-[#4A463D] leading-relaxed">
          {/* Paso 1 */}
          <div className="flex gap-3 items-start bg-white p-3.5 rounded-2xl border border-[#EAE5DA]">
            <div className="w-7 h-7 rounded-full bg-[#1A1A18] text-white flex items-center justify-center font-mono font-bold shrink-0 text-xs">
              1
            </div>
            <div>
              <p className="font-bold text-[#1A1A18] text-sm mb-1">
                Encontrá la palabra secreta
              </p>
              <p>
                Empezás únicamente con su primera letra revelada.
              </p>
              <div className="flex items-center gap-1 font-mono font-bold text-sm text-[#1A1A18] mt-1.5 bg-[#F4F0E8] px-2 py-1 rounded w-fit">
                <span>C</span> <span>_</span> <span>_</span> <span>_</span> <span>_</span> <span>_</span>
              </div>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="flex gap-3 items-start bg-white p-3.5 rounded-2xl border border-[#EAE5DA]">
            <div className="w-7 h-7 rounded-full bg-[#1A1A18] text-white flex items-center justify-center font-mono font-bold shrink-0 text-xs">
              2
            </div>
            <div>
              <p className="font-bold text-[#1A1A18] text-sm mb-1">
                Resolvé CONTACTOS
              </p>
              <p>
                Cada contacto correcto desbloquea una nueva letra de la palabra secreta.
              </p>
              <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-800 font-bold mt-1.5 bg-emerald-50 px-2 py-1 rounded w-fit border border-emerald-200">
                <span>C _ _ _</span>
                <ArrowRight size={12} />
                <span>C A _ _ _</span>
              </div>
            </div>
          </div>

          {/* Paso 3 */}
          <div className="flex gap-3 items-start bg-white p-3.5 rounded-2xl border border-[#EAE5DA]">
            <div className="w-7 h-7 rounded-full bg-[#1A1A18] text-white flex items-center justify-center font-mono font-bold shrink-0 text-xs">
              3
            </div>
            <div>
              <p className="font-bold text-[#1A1A18] text-sm mb-1 flex items-center gap-1">
                <span>Arriesgá cuando sepas</span>
                <Target size={14} className="text-amber-600" />
              </p>
              <p>
                No necesitás todos los contactos. Podés intentar resolver el NEXO en cualquier momento.
              </p>
              <p className="font-semibold text-rose-700 mt-1 flex items-center gap-1">
                <Heart size={12} fill="currentColor" />
                <span>Tenés 3 vidas para adivinar la palabra secreta.</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 text-center">
          <div className="text-[11px] font-mono text-[#8C867A] mb-3">
            ⚡ Menos contactos necesitás, mejor es tu resultado.
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#1A1A18] hover:bg-[#333330] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Entendido, a jugar
          </button>
        </div>
      </div>
    </div>
  );
};

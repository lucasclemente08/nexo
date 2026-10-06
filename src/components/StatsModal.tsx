import React from 'react';
import { GameStats } from '../types/game';
import { X, Flame, Trophy, CheckCircle, BarChart3 } from 'lucide-react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GameStats;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  stats,
}) => {
  if (!isOpen) return null;

  const winRate =
    stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;

  // Encontrar el máximo de la distribución para calcular porcentajes de barra
  const counts = Object.values(stats.contactsDistribution);
  const maxCount = Math.max(...counts, 1);

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
          <div className="inline-flex p-2 bg-[#EFECE6] rounded-full text-[#1A1A18] mb-1">
            <BarChart3 size={20} />
          </div>
          <h2 className="font-editorial text-2xl font-bold text-[#1A1A18] tracking-tight">
            Estadísticas
          </h2>
        </div>

        {/* Resumen numérico */}
        <div className="grid grid-cols-4 gap-2 text-center mb-6">
          <div className="bg-white p-2.5 rounded-xl border border-[#EAE5DA]">
            <div className="text-xl font-mono font-bold text-[#1A1A18]">
              {stats.played}
            </div>
            <div className="text-[10px] text-[#8C867A]">Jugados</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-[#EAE5DA]">
            <div className="text-xl font-mono font-bold text-[#1A1A18]">
              {winRate}%
            </div>
            <div className="text-[10px] text-[#8C867A]">Victorias</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-[#EAE5DA]">
            <div className="flex items-center justify-center gap-0.5 text-xl font-mono font-bold text-orange-600">
              <Flame size={16} fill="currentColor" />
              <span>{stats.currentStreak}</span>
            </div>
            <div className="text-[10px] text-[#8C867A]">Racha</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-[#EAE5DA]">
            <div className="flex items-center justify-center gap-0.5 text-xl font-mono font-bold text-amber-600">
              <Trophy size={16} />
              <span>{stats.bestStreak}</span>
            </div>
            <div className="text-[10px] text-[#8C867A]">Mejor</div>
          </div>
        </div>

        {/* Gráfico de distribución de contactos */}
        <div>
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#8C867A] mb-2.5">
            Contactos necesarios
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            {[1, 2, 3, 4, 5].map((num) => {
              const val = stats.contactsDistribution[num] || 0;
              const widthPct = Math.max(8, (val / maxCount) * 100);

              return (
                <div key={num} className="flex items-center gap-2">
                  <span className="w-3 text-right text-[#8C867A] font-bold">
                    {num}
                  </span>
                  <div className="flex-1 bg-[#EFECE6] rounded-md h-5.5 overflow-hidden flex items-center px-1">
                    <div
                      className={`h-4 rounded flex items-center justify-end px-2 text-[11px] font-bold transition-all duration-500 ${
                        val > 0
                          ? 'bg-[#1A1A18] text-white'
                          : 'bg-transparent text-[#8C867A]'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    >
                      {val}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 bg-[#EFECE6] hover:bg-[#E5E0D5] text-[#1A1A18] text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

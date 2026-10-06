import React from 'react';
import { HelpCircle, BarChart2, RotateCcw } from 'lucide-react';
import { NexoPuzzle } from '../types/puzzle';

interface HeaderProps {
  puzzle: NexoPuzzle;
  onOpenTutorial: () => void;
  onOpenStats: () => void;
  onReset: () => void;
  onSelectPuzzle: (id: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  puzzle,
  onOpenTutorial,
  onOpenStats,
  onReset,
  onSelectPuzzle,
}) => {
  return (
    <header className="w-full flex items-center justify-between border-b border-[#E6E1D8] pb-3 mb-4 select-none">
      <div className="flex items-center gap-1">
        <button
          onClick={onOpenTutorial}
          className="p-2 text-[#736F66] hover:text-[#1A1A18] hover:bg-[#EFECE6] rounded-full transition-colors"
          title="Cómo jugar"
          aria-label="Cómo jugar"
        >
          <HelpCircle size={20} strokeWidth={2} />
        </button>
        <button
          onClick={onReset}
          className="p-2 text-[#736F66] hover:text-[#1A1A18] hover:bg-[#EFECE6] rounded-full transition-colors"
          title="Reiniciar desafío de hoy"
          aria-label="Reiniciar"
        >
          <RotateCcw size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <h1 className="font-editorial text-3xl tracking-tight font-normal text-[#1A1A18]">
            NEXO
          </h1>
          <select
            value={puzzle.id}
            onChange={(e) => onSelectPuzzle(Number(e.target.value))}
            className="text-xs bg-[#EFECE6] text-[#524E46] border border-[#DDD8CE] rounded px-1.5 py-0.5 font-mono cursor-pointer outline-none hover:bg-[#E6E2D8] transition-colors"
            title="Seleccionar desafío"
          >
            <option value={142}>#142</option>
            <option value={143}>#143</option>
            <option value={144}>#144</option>
            <option value={145}>#145</option>
          </select>
        </div>
        <p className="text-[11px] font-mono tracking-widest uppercase text-[#8C867A]">
          {puzzle.difficulty}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onOpenStats}
          className="p-2 text-[#736F66] hover:text-[#1A1A18] hover:bg-[#EFECE6] rounded-full transition-colors"
          title="Estadísticas"
          aria-label="Estadísticas"
        >
          <BarChart2 size={20} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
};

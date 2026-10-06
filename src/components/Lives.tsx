import React from 'react';
import { Heart } from 'lucide-react';

interface LivesProps {
  lives: number;
  maxLives: number;
}

export const Lives: React.FC<LivesProps> = ({ lives, maxLives }) => {
  return (
    <div className="flex items-center gap-1.5" title={`${lives} de ${maxLives} intentos para el Nexo`}>
      {Array.from({ length: maxLives }).map((_, i) => {
        const isAlive = i < lives;
        return (
          <span
            key={i}
            className={`transition-all duration-300 transform ${
              isAlive ? 'scale-100 text-rose-500' : 'scale-90 text-[#D4CEC2]'
            }`}
          >
            <Heart
              size={18}
              fill={isAlive ? 'currentColor' : 'none'}
              strokeWidth={2}
            />
          </span>
        );
      })}
    </div>
  );
};

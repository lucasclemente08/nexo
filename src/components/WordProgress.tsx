import React from 'react';

interface WordProgressProps {
  secretWord: string;
  revealedPrefix: string;
  isCompleted?: boolean;
}

export const WordProgress: React.FC<WordProgressProps> = ({
  secretWord,
  revealedPrefix,
  isCompleted = false,
}) => {
  const letters = secretWord.split('');

  return (
    <div className="w-full flex flex-col items-center justify-center my-4">
      <div className="text-[11px] font-mono tracking-widest text-[#8C867A] uppercase mb-2">
        Palabra Secreta ({secretWord.length} letras)
      </div>

      <div className="flex items-center justify-center gap-2 max-w-full overflow-x-auto py-1 px-2">
        {letters.map((char, index) => {
          const isRevealed = index < revealedPrefix.length;
          const letterToShow = isRevealed ? revealedPrefix[index] : '';

          return (
            <div
              key={index}
              className={`w-11 h-14 sm:w-12 sm:h-16 flex items-center justify-center text-2xl sm:text-3xl font-bold font-mono-tile rounded-lg border-2 transition-all duration-300 ${
                isCompleted
                  ? 'bg-[#15803D] text-white border-[#166534] shadow-sm'
                  : isRevealed
                  ? 'bg-white text-[#1A1A18] border-[#1A1A18] shadow-sm animate-letter-pop'
                  : 'bg-[#F2EFE9] text-transparent border-[#DCD6C9]'
              }`}
            >
              {letterToShow || '·'}
            </div>
          );
        })}
      </div>
    </div>
  );
};

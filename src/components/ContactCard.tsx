import React, { useState, useEffect } from 'react';
import { ContactClue } from '../types/puzzle';
import { SolvedContact } from '../types/game';
import { Check, ArrowRight, AlertCircle } from 'lucide-react';

interface ContactCardProps {
  currentClue?: ContactClue;
  totalContacts: number;
  solvedContacts: SolvedContact[];
  onGuess: (guess: string) => { success: boolean; error?: string };
  disabled?: boolean;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  currentClue,
  totalContacts,
  solvedContacts,
  onGuess,
  disabled = false,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  // Limpiar input y mensaje cuando cambia la pista
  useEffect(() => {
    if (currentClue) {
      setInputVal('');
      setErrorMessage(null);
    }
  }, [currentClue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || disabled || !currentClue) return;

    const res = onGuess(inputVal);
    if (!res.success) {
      setErrorMessage(res.error || 'No hay contacto.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } else {
      setErrorMessage(null);
      setInputVal('');
    }
  };

  return (
    <div className="w-full bg-[#FFFFFF] border border-[#E6E1D8] rounded-2xl p-5 shadow-xs transition-all">
      {/* Lista de contactos anteriores ya resueltos */}
      {solvedContacts.length > 0 && (
        <div className="space-y-2 mb-4 pb-4 border-b border-[#F0EBE1]">
          <div className="text-[11px] font-mono tracking-widest uppercase text-[#8C867A]">
            Contactos resueltos ({solvedContacts.length}/{totalContacts})
          </div>
          <div className="flex flex-col gap-1.5">
            {solvedContacts.map((c) => (
              <div
                key={c.position}
                className="flex items-center justify-between text-xs py-1 px-2.5 bg-[#F6F4EE] rounded-lg border border-[#EBE6DC]"
              >
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                    <Check size={11} strokeWidth={3} />
                  </span>
                  <span className="font-mono font-bold text-[#1A1A18] uppercase">
                    {c.answer}
                  </span>
                </div>
                <span className="text-[11px] text-[#787368] truncate max-w-[180px]">
                  {c.clue}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contacto activo */}
      {currentClue ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8C867A]">
              Contacto #{currentClue.position}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 bg-[#F2EFE9] text-[#5A554A] rounded-full border border-[#E4DFD5]">
              Empieza con <strong>{currentClue.prefix}</strong> ({currentClue.length} letras)
            </span>
          </div>

          {/* Pista editorial */}
          <div className="my-3 text-center">
            <p className="font-editorial text-xl sm:text-2xl text-[#1A1A18] italic leading-snug px-2">
              "{currentClue.clue}"
            </p>
          </div>

          {/* Formulario de respuesta */}
          <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
            <div className="relative">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value.toUpperCase());
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={disabled}
                placeholder={`Comienza con ${currentClue.prefix}...`}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                maxLength={currentClue.length + 4}
                className={`w-full py-3 px-4 text-center text-lg font-mono font-bold uppercase tracking-widest bg-[#FAF8F5] border rounded-xl outline-none transition-all ${
                  shake ? 'animate-shake border-rose-400 bg-rose-50/50' : 'border-[#D9D3C7] focus:border-[#1A1A18] focus:bg-white'
                }`}
              />
            </div>

            {/* Error o Feedback */}
            {errorMessage && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-rose-600 bg-rose-50 py-1.5 px-3 rounded-lg border border-rose-200">
                <AlertCircle size={14} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={disabled || !inputVal.trim()}
              className="w-full py-3 px-4 bg-[#1A1A18] hover:bg-[#333330] active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Probar contacto</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="inline-flex p-3 bg-emerald-50 text-emerald-700 rounded-full mb-2">
            <Check size={24} strokeWidth={2.5} />
          </div>
          <h3 className="font-editorial text-xl font-bold text-[#1A1A18]">
            Todos los contactos resueltos
          </h3>
          <p className="text-xs text-[#736F66] mt-1 max-w-xs mx-auto">
            Tenés la información máxima disponible. Arriesgá la palabra secreta para terminar el desafío.
          </p>
        </div>
      )}
    </div>
  );
};

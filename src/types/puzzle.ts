export interface ContactClue {
  position: number;           // 1, 2, 3...
  prefix: string;             // Prefijo exigido para este contacto (ej: "C", "CA", "CAM")
  length: number;             // Cantidad de letras de la respuesta (ej: 4 para CASA)
  clue: string;               // Pista descriptiva
  answer: string;             // Respuesta canónica
  accepted?: string[];        // Sinónimos o variantes aceptadas
  answerHash?: string;        // SHA-256 de normalizeWord(answer)
}

export interface NexoPuzzle {
  id: number;
  date: string;               // YYYY-MM-DD
  secretWord: string;         // Palabra objetivo (ej: "CAMINO")
  secretWordHash?: string;
  initialPrefix: string;      // Primera letra (ej: "C")
  difficulty: 'Fácil' | 'Media' | 'Difícil';
  contacts: ContactClue[];
}

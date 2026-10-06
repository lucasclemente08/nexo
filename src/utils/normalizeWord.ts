/**
 * Normaliza una palabra según las reglas de NEXO:
 * - Elimina espacios exteriores
 * - Pasa a minúsculas
 * - Remueve tildes y diéresis (á, é, í, ó, ú, ü)
 * - CONSERVA la letra Ñ / ñ como carácter independiente (n !== ñ)
 */
export function normalizeWord(word: string): string {
  if (!word) return '';
  return word
    .trim()
    .toLowerCase()
    .replace(/[áäàâ]/g, 'a')
    .replace(/[éëèê]/g, 'e')
    .replace(/[íïìî]/g, 'i')
    .replace(/[óöòô]/g, 'o')
    .replace(/[úüùû]/g, 'u');
}

/**
 * Valida si la palabra ingresada comienza con el prefijo esperado (normalizados)
 */
export function matchesPrefix(word: string, prefix: string): boolean {
  return normalizeWord(word).startsWith(normalizeWord(prefix));
}

/**
 * Formatea segundos a MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

import { formatTime } from './normalizeWord';

interface ShareOptions {
  puzzleNumber: number;
  won: boolean;
  contactsSolved: number;
  livesRemaining: number;
  maxLives: number;
  durationSeconds: number;
  currentStreak?: number;
}

export function generateShareText({
  puzzleNumber,
  won,
  contactsSolved,
  livesRemaining,
  maxLives,
  durationSeconds,
  currentStreak,
}: ShareOptions): string {
  // Construir visualización de contactos: 🟢 por cada contacto resuelto, 🎯 si ganó o ❌ si perdió
  const contactEmojis: string[] = [];
  for (let i = 0; i < contactsSolved; i++) {
    contactEmojis.push('🟢');
  }
  contactEmojis.push(won ? '🎯' : '❌');
  const progressLine = contactEmojis.join(' ');

  // Corazones
  const hearts = won
    ? '❤️'.repeat(livesRemaining) + '🤍'.repeat(maxLives - livesRemaining)
    : '💔 0/3 vidas';

  const timeStr = formatTime(durationSeconds);
  const streakLine = currentStreak && currentStreak > 0 ? `\n🔥 ${currentStreak} racha` : '';

  return `NEXO #${puzzleNumber} 🧩

${progressLine}
${hearts}
⚡ ${contactsSolved} contacto${contactsSolved === 1 ? '' : 's'}
⏱ ${timeStr}${streakLine}

¿Lo resolvés con menos?
https://nexo.ar`;
}

export async function shareResult(options: ShareOptions): Promise<{ copied: boolean; shared: boolean }> {
  const text = generateShareText(options);

  if (navigator.share) {
    try {
      await navigator.share({
        title: `NEXO #${options.puzzleNumber}`,
        text: text,
      });
      return { copied: false, shared: true };
    } catch (e) {
      // Si el usuario canceló el share sheet o falló, intentamos copiar al portapapeles
      if ((e as Error).name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(text);
          return { copied: true, shared: false };
        } catch {
          // ignore
        }
      }
      return { copied: false, shared: false };
    }
  }

  // Fallback: Clipboard
  try {
    await navigator.clipboard.writeText(text);
    return { copied: true, shared: false };
  } catch (err) {
    console.error('Error al copiar al portapapeles:', err);
    return { copied: false, shared: false };
  }
}

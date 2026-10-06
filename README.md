# NEXO

> Una palabra. Una pista inicial. Encontrá los contactos que te lleven hasta ella.

Juego de palabras diario en español. Empezás con la primera letra de la palabra secreta; cada **contacto** resuelto revela una letra más. Podés arriesgar el NEXO cuando quieras — tenés 3 vidas. Menos contactos = mejor resultado.

## Stack

React 19 · Vite · TypeScript · Tailwind CSS v4 · LocalStorage (V0.1, sin backend)

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc + vite build → dist/
```

## Estructura

```
src/
  components/   Header, WordProgress, ContactCard, Lives, modales (guess, result, stats, tutorial)
  hooks/        useNexoGame (lógica), useTimer
  data/         puzzles.ts (banco de desafíos)
  utils/        normalizeWord (tildes fuera, Ñ se conserva), shareResult, storage
  types/        puzzle.ts, game.ts
```

## Limitaciones conocidas de V0.1

- Las respuestas viven en el bundle del cliente (`src/data/puzzles.ts`). En V0.2 la validación pasa a Supabase Edge Functions.
- El desafío del día no rota automáticamente por fecha todavía (selector manual `#142–#145`).

import { NexoPuzzle } from '../types/puzzle';

export const PUZZLES: NexoPuzzle[] = [
  {
    id: 142,
    date: '2026-10-06',
    secretWord: 'CAMINO',
    initialPrefix: 'C',
    difficulty: 'Fácil',
    contacts: [
      {
        position: 1,
        prefix: 'C',
        length: 4,
        clue: 'Construcción o edificación destinada a vivienda habitual de una persona o familia.',
        answer: 'CASA',
        accepted: ['casa'],
      },
      {
        position: 2,
        prefix: 'CA',
        length: 6,
        clue: 'Institución o edificio penitenciario donde cumplen condena judicial los presos.',
        answer: 'CÁRCEL',
        accepted: ['carcel', 'cárcel'],
      },
      {
        position: 3,
        prefix: 'CAM',
        length: 6,
        clue: 'Vehículo automotor de gran tamaño diseñado para el transporte terrestre de cargas pesadas.',
        answer: 'CAMIÓN',
        accepted: ['camion', 'camión'],
      },
      {
        position: 4,
        prefix: 'CAMI',
        length: 8,
        clue: 'Prenda de vestir informal y ligera que cubre el torso, generalmente de cuello redondo o en V.',
        answer: 'CAMISETA',
        accepted: ['camiseta', 'remera'],
      },
    ],
  },
  {
    id: 143,
    date: '2026-10-07',
    secretWord: 'PUENTE',
    initialPrefix: 'P',
    difficulty: 'Media',
    contacts: [
      {
        position: 1,
        prefix: 'P',
        length: 5,
        clue: 'Superficie de terreno llano o pavimento acondicionada para el despegue y aterrizaje de aviones o carreras.',
        answer: 'PISTA',
        accepted: ['pista'],
      },
      {
        position: 2,
        prefix: 'PU',
        length: 6,
        clue: 'Población pequeña o comunidad vecinal, generalmente en zona rural y con menor cantidad de habitantes que una ciudad.',
        answer: 'PUEBLO',
        accepted: ['pueblo'],
      },
      {
        position: 3,
        prefix: 'PUE',
        length: 6,
        clue: 'Abertura en una pared provista de un bastidor y una hoja móvil que permite el acceso a una habitación o vivienda.',
        answer: 'PUERTA',
        accepted: ['puerta'],
      },
    ],
  },
  {
    id: 144,
    date: '2026-10-08',
    secretWord: 'SOMBRA',
    initialPrefix: 'S',
    difficulty: 'Media',
    contacts: [
      {
        position: 1,
        prefix: 'S',
        length: 4,
        clue: 'Alimento líquido y caliente que se prepara hirviendo en agua carne, huesos o verduras.',
        answer: 'SOPA',
        accepted: ['sopa', 'caldo'],
      },
      {
        position: 2,
        prefix: 'SO',
        length: 8,
        clue: 'Prenda de vestir que se lleva en la cabeza con copa y ala circular para protegerse del sol.',
        answer: 'SOMBRERO',
        accepted: ['sombrero'],
      },
      {
        position: 3,
        prefix: 'SOM',
        length: 9,
        clue: 'Armazón plegable de varillas con tela que se clava en la arena de la playa o en jardines para dar sombra.',
        answer: 'SOMBRILLA',
        accepted: ['sombrilla', 'quitasol'],
      },
    ],
  },
  {
    id: 145,
    date: '2026-10-09',
    secretWord: 'PLANTA',
    initialPrefix: 'P',
    difficulty: 'Fácil',
    contacts: [
      {
        position: 1,
        prefix: 'P',
        length: 5,
        clue: 'Zona llana a orillas del mar, un río o lago cubierta de arena o piedras finas.',
        answer: 'PLAYA',
        accepted: ['playa'],
      },
      {
        position: 2,
        prefix: 'PL',
        length: 5,
        clue: 'Recipiente circular y plano de la vajilla doméstica donde se sirve la comida.',
        answer: 'PLATO',
        accepted: ['plato'],
      },
      {
        position: 3,
        prefix: 'PLA',
        length: 5,
        clue: 'Lugar ancho y espacioso dentro de una ciudad o pueblo adonde suelen acudir los vecinos a pasear.',
        answer: 'PLAZA',
        accepted: ['plaza'],
      },
    ],
  },
];

/**
 * Obtiene el puzzle de hoy (o por ID)
 */
export function getTodayPuzzle(idOverride?: number): NexoPuzzle {
  if (idOverride !== undefined) {
    const found = PUZZLES.find(p => p.id === idOverride);
    if (found) return found;
  }
  
  // Por defecto entregamos el puzzle insignia #142 (CAMINO)
  return PUZZLES[0];
}

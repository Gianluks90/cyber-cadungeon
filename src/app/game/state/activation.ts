import { Board } from '../board/board';
import { Piece } from '../pieces/piece';
import { GameState } from './game-state';

/**
 * Lo stato di attivazione di un nemico nel turno del Maligno (docs/REGOLE.md, sezione 9), per il pallino sulla miniatura:
 * - `ready` (verde): da attivare;
 * - `blocked` (giallo): non attivabile in questo turno, in un'area già rivelata (un nemico normale stordito perde il turno);
 * - `done` (grigio): l'attivazione è finita (`Piece.done`, che torna falso a ogni nuovo round).
 * Nessun pallino (null) per chi non è un nemico in gioco, per i nemici inattivi (già "spenti": fermi, a volte desaturati) e per chi dorme in un'area non ancora rivelata.
 */
export type ActivationState = 'ready' | 'blocked' | 'done';

export function activationOf(state: GameState, board: Board | null, enemy: Piece): ActivationState | null {
  if (enemy.team !== 'enemy' || enemy.city || enemy.inactive) return null;
  const area = board?.areaAt(enemy.cell);
  if (!enemy.awake && area && !state.exploration.areas.has(area)) return null; // dorme: la sua area non è rivelata
  if (enemy.done) return 'done';
  if ((enemy.stunned || enemy.status.stun > 0) && !enemy.enhanced) return 'blocked'; // uno potenziato stordito può ancora muoversi o attaccare
  return 'ready';
}

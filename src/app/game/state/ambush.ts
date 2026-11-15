import { Piece } from '../pieces/piece';
import { canSeeTarget } from './combat';
import { effectsOf } from './effects';
import type { GameState } from './game-state';

/**
 * Colpo a tradimento (Gjöffrid): i suoi attacchi fanno più danno contro chi non lo vedeva all'inizio del turno. Qui si ricorda, per ogni eroe che ha un effetto `attack` con `ifUnseenByTarget`,
 * quali nemici l'avevano nella loro linea di vista (solo la loro, non quella degli alleati) quando comincia il round: `Piece.seenByAtStart`. Si chiama a inizio partita e a ogni nuovo round.
 */
export function snapshotSeen(state: GameState): void {
  const board = state.board;
  if (!board) return;
  for (const mercenary of state.pieces) {
    if (mercenary.team !== 'mercenary' || mercenary.city) continue;
    if (!effectsOf(state, mercenary).some((x) => x.effect.kind === 'attack' && x.effect['ifUnseenByTarget'])) continue;
    mercenary.seenByAtStart = state.pieces.filter((p: Piece) => p.team === 'enemy' && !p.city && canSeeTarget(state, board, p, mercenary)).map((p) => p.id);
  }
}

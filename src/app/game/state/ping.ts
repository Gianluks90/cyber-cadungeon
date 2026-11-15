import { tr } from '../../i18n/catalog-text';
import type { Board } from '../board/board';
import type { Piece } from '../pieces/piece';
import { canSeeTarget } from './combat';
import { hasRule } from './effects';
import type { GameState } from './game-state';

const PING_SKILL = 'ping';

/** Ha l'abilità Ping (Halo) e non l'ha già usata in questo turno? */
export function canPing(state: GameState, piece: Piece): boolean {
  return piece.team === 'mercenary' && !piece.city && hasRule(state, piece, 'ping') && !piece.usedSkills?.includes(PING_SKILL);
}

/** I nemici che può Segnalare adesso: quelli che vede con la sua linea di vista e che non sono già Segnalati da lei. */
export function pingTargets(state: GameState, board: Board, piece: Piece): Piece[] {
  if (!canPing(state, piece)) return [];
  return state.pieces.filter((p) => p.team === 'enemy' && !p.city && p.markedBy !== piece.id && canSeeTarget(state, board, piece, p));
}

/** Segnala un nemico: la marca dura fino all'inizio del round dopo (`startRound` la toglie). Un solo Segnalato per volta, e una volta per turno. */
export function ping(state: GameState, board: Board, piece: Piece, targetId: string): { ok: boolean; reason?: string } {
  const target = pingTargets(state, board, piece).find((p) => p.id === targetId);
  if (!target) return { ok: false, reason: tr('Non puoi Segnalare questo nemico') };
  for (const p of state.pieces) if (p.markedBy === piece.id) p.markedBy = undefined;
  target.markedBy = piece.id;
  (piece.usedSkills ??= []).push(PING_SKILL);
  return { ok: true };
}

import type { ItemProgram } from '../items/item';
import type { Piece } from '../pieces/piece';
import { hasRule } from './effects';
import type { GameState } from './game-state';

/** La regola di Glitch («Ottimizzazione») e il nome con cui si segna in `usedSkills` che lo sconto di questo turno è già stato usato. Non c'entra con la carta abilità Zero-Day (Regolazione 1). */
const OPTIMIZATION = 'optimization';

/** Quanti overclock costa adesso un programma del cyberdeck: con Ottimizzazione il primo di ogni turno costa 1 in meno (mai sotto zero). */
export function programCost(state: GameState, piece: Piece, program: ItemProgram): number {
  const discount = hasRule(state, piece, OPTIMIZATION) && !piece.usedSkills?.includes(OPTIMIZATION) ? 1 : 0;
  return Math.max(0, program.cost - discount);
}

/** Paga un programma: toglie l'overclock (con lo sconto, se c'è) e, se lo sconto è stato dato, lo segna come usato fino al turno dopo. */
export function payProgram(state: GameState, piece: Piece, program: ItemProgram): void {
  const cost = programCost(state, piece, program);
  if (cost < program.cost) (piece.usedSkills ??= []).push(OPTIMIZATION);
  piece.overclock = Math.max(0, piece.overclock - cost);
}

import { cellKey } from '../board/board';
import type { Board } from '../board/board';
import type { ItemDef } from '../items/item';
import type { Marker } from '../board/marker';
import type { PawnBehavior } from '../pieces/pawn-behavior';
import { Piece, footprint } from '../pieces/piece';
import type { GameState } from './game-state';

/**
 * I comportamenti di un nemico: il suo (`Piece.behavior`, da Personalizza o da un evento) più quelli globali dell'avventura (`GameState.behaviors`) che valgono per il suo tipo di nemico
 * (senza un elenco di tipi valgono per tutti), a meno che il nemico li ignori (`Piece.ignoreGlobal`).
 */
export function behaviorsOf(state: GameState, enemy: Piece): PawnBehavior[] {
  const own = enemy.behavior ? [enemy.behavior] : [];
  if (enemy.team !== 'enemy' || enemy.ignoreGlobal) return own;
  const global = (state.behaviors ?? []).filter((g) => !g.enemies?.length || (!!enemy.enemy && g.enemies.includes(enemy.enemy))).map((g) => g.behavior);
  return [...own, ...global];
}

/** Una moneta per round e per nemico: sempre uguale per gli stessi valori (nessuno stato da salvare). */
function roundCoin(id: string, round: number): boolean {
  let h = 2166136261;
  for (const ch of `${id}:${round}`) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return ((h >>> 0) & 1) === 1;
}

/** L'oggetto con cui questo nemico attacca come un eroe (`useItem`) e i dadi competenza che ha per i tre attacchi, o null. Se ce ne sono più d'uno vale il primo. */
export function usedItem(state: GameState, enemy: Piece): { itemId: string; dice: { melee: number; ranged: number; intrusion: number } } | null {
  const b = behaviorsOf(state, enemy).find((x): x is Extract<PawnBehavior, { kind: 'useItem' }> => x.kind === 'useItem' && !!state.items.get(x.itemId)?.attack);
  if (!b) return null;
  // Se ha un attacco suo, l'oggetto lo usa sempre o solo in certi round (stesso risultato per tutto il round, così l'anteprima e l'attacco coincidono).
  if (b.mode && enemy.attackType) {
    const useIt = b.mode === 'alternate' ? state.round % 2 === 1 : roundCoin(enemy.id, state.round);
    if (!useIt) return null;
  }
  return b ? { itemId: b.itemId, dice: { melee: b.melee ?? 0, ranged: b.ranged ?? 0, intrusion: b.intrusion ?? 0 } } : null;
}

/** Quali oggetti trasportabili questo nemico vuole prendere (`carry`: con un `itemId` solo quello, senza qualsiasi), o null se non ha il comportamento. */
export function carryWants(state: GameState, enemy: Piece): ((itemId: string) => boolean) | null {
  const carries = behaviorsOf(state, enemy).flatMap((b) => (b.kind === 'carry' ? [b] : []));
  if (!carries.length) return null;
  if (carries.some((b) => !b.itemId)) return () => true;
  const ids = new Set(carries.map((b) => b.itemId));
  return (id) => ids.has(id);
}

/** Gli oggetti trasportabili (`ItemDef.carried`) che stanno a terra (un segnalino non ancora raccolto), se `wants` li ammette. */
export function carriedOnGround(state: GameState, wants: (itemId: string) => boolean = () => true): Extract<Marker, { type: 'item' }>[] {
  return state.markers.filter((m): m is Extract<Marker, { type: 'item' }> => m.type === 'item' && !m.collected && !!state.items.get(m.itemId)?.carried && wants(m.itemId));
}

/** Il nemico può prendere un oggetto trasportabile: ha il comportamento `carry`, sta sulla mappa e non ne porta già uno. */
export function canCarry(state: GameState, enemy: Piece): boolean {
  if (enemy.team !== 'enemy' || enemy.city) return false;
  if ((enemy.equipped ?? []).some((id) => state.items.get(id)?.carried)) return false;
  return carryWants(state, enemy) !== null;
}

/**
 * Un nemico che si ferma sulla casella di un oggetto trasportabile lo prende (solo chi ha il comportamento `carry`): l'oggetto sparisce dalla mappa e va nel suo equipaggiamento, dove
 * conta come per gli eroi (1 punto movimento in meno a ogni turno). Restituisce la carta dell'oggetto preso, o null.
 */
export function enemyTakesItem(state: GameState, board: Board, enemy: Piece): ItemDef | null {
  if (!canCarry(state, enemy)) return null;
  const cells = new Set(footprint(enemy).map(cellKey));
  const marker = carriedOnGround(state, carryWants(state, enemy) ?? undefined).find((m) => cells.has(cellKey(m)));
  if (!marker) return null;
  const item = state.items.get(marker.itemId);
  if (!item) return null;
  marker.collected = true;
  board.removeMarker(marker);
  (enemy.equipped ??= []).push(marker.itemId);
  return item;
}

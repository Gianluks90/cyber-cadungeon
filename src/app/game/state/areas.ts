import { Board, Cell, cellKey } from '../board/board';
import { Piece, createPieces, footprint } from '../pieces/piece';
import { GameState } from './game-state';
import { newEnemyId } from './adversary-deck';

/**
 * Le aree (docs/REGOLE.md, sezione 9): un'area è un gruppo di tile con lo stesso id `area` (una stanza, o i corridoi fra un gruppo di porte).
 * Quando gli eroi vedono per la prima volta almeno una sua casella l'area è rivelata: i suoi nemici, che fin lì dormivano, si svegliano
 * (il Maligno li muove anche se gli eroi non li vedono ancora) e scattano le carte Potere "quando riveli una nuova area".
 */

/** Il nemico dorme? Sì finché è in un'area non ancora rivelata. Un nemico senza area, o già sveglio, agisce sempre. */
export function isDormant(state: GameState, board: Board, enemy: Piece): boolean {
  if (enemy.awake) return false;
  const area = board.areaAt(enemy.cell);
  if (!area || state.exploration.areas.has(area)) {
    enemy.awake = true;
    return false;
  }
  return true;
}

/** I nemici che stanno (con la casella d'origine) in questa area. */
export function enemiesIn(state: GameState, board: Board, area: string): Piece[] {
  return state.pieces.filter((p) => p.team === 'enemy' && !p.city && board.areaAt(p.cell) === area);
}

export interface AreaResult {
  /** I nemici apparsi (Orda di Creature): la scena ne crea la grafica. */
  spawned: Piece[];
  /** I nemici diventati potenziati (Abile comandante): la scena ridisegna la pedina. */
  upgraded: Piece[];
}

/** I tipi che l'Orda di Creature può aggiungere. */
export const HORDE_TYPES = ['thug', 'surveillance-drone', 'netrunner'];

/** I nemici di un'area che Abile comandante può potenziare: non unici, non già potenziati, di un tipo del catalogo. */
export function upgradeOptions(state: GameState, inArea: readonly Piece[]): Piece[] {
  return inArea.filter((m) => m.enemy && !m.enhanced && !m.unique && state.enemies.has(m.enemy));
}

/** Il nemico diventa potenziato, dello stesso tipo: mantiene id, casella, bottino e immagini. */
export function upgradeEnemy(state: GameState, old: Piece): void {
  const mercenaries = state.pieces.filter((p) => p.team === 'mercenary').length;
  const [fresh] = createPieces([{ id: old.id, team: 'enemy', enemy: old.enemy!, enhanced: true, x: old.cell.x, y: old.cell.y }], new Map(), state.items, state.enemies, mercenaries);
  Object.assign(old, { ...fresh, cell: old.cell, size: old.size, awake: true, drop: old.drop, chestTier: old.chestTier, portrait: old.portrait, portraitFull: old.portraitFull });
}

/** Un'area si rivela: i suoi nemici si svegliano e agiscono le carte Potere in gioco (con il Maligno a mano, `adversaryManual`, le sceglie lui: la scena chiede). */
export function revealArea(state: GameState, board: Board, area: string): AreaResult {
  const result: AreaResult = { spawned: [], upgraded: [] };
  const inArea = enemiesIn(state, board, area);
  for (const m of inArea) m.awake = true;
  if (!inArea.length || state.adversaryManual) return result;
  const mercenaries = state.pieces.filter((p) => p.team === 'mercenary').length;
  const make = (enemy: string, enhanced: boolean, id: string, cell: Cell) =>
    createPieces([{ id, team: 'enemy', enemy, enhanced, x: cell.x, y: cell.y }], new Map(), state.items, state.enemies, mercenaries)[0];

  // Abile comandante: un nemico qualunque dell'area (non unico, non già potenziato) diventa potenziato, dello stesso tipo.
  if (state.adversary.inPlay.includes('able-commander')) {
    const options = upgradeOptions(state, inArea);
    if (options.length) {
      const old = options[Math.floor(state.random() * options.length)];
      upgradeEnemy(state, old);
      result.upgraded.push(old);
    }
  }

  // Orda di Creature: 2 nemici in più di un tipo a scelta, accanto a un nemico dell'area.
  if (state.adversary.inPlay.includes('horde')) {
    const enemy = HORDE_TYPES[Math.floor(state.random() * HORDE_TYPES.length)];
    const def = state.enemies.get(enemy);
    if (def) {
      for (let n = 0; n < 2; n++) {
        const cell = hordeCell(state, board, def.size, inArea);
        if (!cell) break;
        const piece = make(enemy, false, newEnemyId(state, enemy), cell);
        piece.awake = true;
        state.pieces.push(piece);
        result.spawned.push(piece);
      }
    }
  }
  return result;
}

/** Una casella libera dove sta un nemico di questa dimensione, adiacente a uno dei nemici dell'area (a caso). */
function hordeCell(state: GameState, board: Board, size: { w: number; h: number }, near: readonly Piece[]): Cell | null {
  const options = hordeAnchors(state, board, size, near);
  return options.length ? options[Math.floor(state.random() * options.length)] : null;
}

/** Tutte le caselle (in alto a sinistra) dove può stare un nemico di questa dimensione, libere e adiacenti a uno dei nemici dell'area: dove il Maligno può piazzare l'Orda di Creature. */
export function hordeAnchors(state: GameState, board: Board, size: { w: number; h: number }, near: readonly Piece[]): Cell[] {
  const taken = new Set(state.pieces.filter((p) => !p.city).flatMap((p) => footprint(p).map(cellKey)));
  const anchors = near.flatMap((m) => footprint(m));
  const options: Cell[] = [];
  for (const a of anchors) {
    for (let dx = -size.w; dx <= 1; dx++) {
      for (let dy = -size.h; dy <= 1; dy++) {
        const cell = { x: a.x + dx, y: a.y + dy };
        const cells = footprint({ cell, size });
        if (options.some((o) => o.x === cell.x && o.y === cell.y)) continue;
        const ok = cells.every((c) => board.isWalkable(c) && !taken.has(cellKey(c)) && !board.obstacleAt(c) && !board.markerAt(c));
        const touches = cells.some((c) => anchors.some((m) => Math.max(Math.abs(c.x - m.x), Math.abs(c.y - m.y)) <= 1));
        if (ok && touches) options.push(cell);
      }
    }
  }
  return options;
}

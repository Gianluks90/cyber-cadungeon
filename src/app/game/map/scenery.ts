import { Container, Graphics } from 'pixi.js';
import { graphics } from '../graphics-settings';
import { CELL_SIZE, SCENERY, WALL_WIDTH_PX } from '../constants';
import { LINE, theme } from '../theme';
import { PlacedTile } from './map-data';
import { mixSeed, mulberry32 } from './rng';
import { tileCells } from './tile';

/** Quali bordi della cella sono interni al tile (true) e quali sono sul contorno, dove c'è il muro. */
export interface CellEdges {
  n: boolean;
  e: boolean;
  s: boolean;
  w: boolean;
}

const rand = (rng: () => number, lo: number, hi: number) => lo + rng() * (hi - lo);

/** Ciò che i dettagli scenici devono sapere della mappa (celle in "x,y" assolute). */
export interface SceneryContext {
  /** Caselle senza dettagli di pavimento: glifi, segnalini, ostacoli. */
  skip?: ReadonlySet<string>;
  /** Le caselle occupate da rocce (macerie): intorno a loro cadono sassi e detriti. */
  rocks?: ReadonlySet<string>;
  /** Le caselle dove non cadono sassi: acqua, buche e glifi. */
  noPebbles?: ReadonlySet<string>;
}

/**
 * I dettagli scenici di un tile (docs/style-guide.md, "Dettagli scenici"), solo a linee sottili grigie, sopra il pavimento e sotto muri e oggetti.
 * Per ora c'è un solo dettaglio: i sassi e detriti caduti intorno alle rocce. Sono solo
 * estetica: il seme della mappa e la posizione della casella decidono cosa c'è e dove, così ogni client vede le stesse cose senza sincronizzarle.
 */
export function drawScenery(tile: PlacedTile, seed: number, ctx: SceneryContext = {}): Container {
  const layer = new Container();
  if (!graphics().scenery) return layer;
  const lines = new Graphics();
  const stones = new Graphics();
  stones.alpha = SCENERY.pebbleAlpha; // i sassi sono scenici: più tenui di quelli delle rocce
  layer.addChild(stones, lines);
  layer.position.set(tile.x * CELL_SIZE, tile.y * CELL_SIZE);

  const cells = tileCells(tile.def);
  const debris: { x: number; y: number; r: number }[] = [];
  for (const key of cells) {
    const [cx, cy] = key.split(',').map(Number);
    const abs = `${tile.x + cx},${tile.y + cy}`;
    const edges: CellEdges = {
      n: cells.has(`${cx},${cy - 1}`),
      s: cells.has(`${cx},${cy + 1}`),
      w: cells.has(`${cx - 1},${cy}`),
      e: cells.has(`${cx + 1},${cy}`),
    };
    const ox = cx * CELL_SIZE;
    const oy = cy * CELL_SIZE;

    // Sassi e detriti: nelle caselle vicine a una roccia (non in acqua, buche o glifi; possono stare sotto un oggetto).
    if (ctx.rocks?.size && !ctx.rocks.has(abs) && !ctx.noPebbles?.has(abs)) {
      const toward = rockSide(ctx.rocks, tile.x + cx, tile.y + cy);
      if (toward) {
        const rng = mulberry32(mixSeed(seed ^ SCENERY.pebbleSalt, tile.x + cx, tile.y + cy));
        if (rng() < SCENERY.pebbleChance) pebbles(stones, debris, rng, edges, toward, ox, oy);
      }
    }
  }

  for (const d of debris) lines.circle(d.x, d.y, d.r).fill({ color: theme.color.stone.line, alpha: theme.alpha.stoneDebris * SCENERY.pebbleAlpha });
  return layer;
}

/** Da che parte (somma dei versi) stanno le rocce vicine, o null se non ce ne sono accanto. */
function rockSide(rocks: ReadonlySet<string>, x: number, y: number): { dx: number; dy: number } | null {
  let dx = 0, dy = 0, any = false;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      if ((i || j) && rocks.has(`${x + i},${y + j}`)) {
        dx += i;
        dy += j;
        any = true;
      }
    }
  }
  return any ? { dx: Math.sign(dx), dy: Math.sign(dy) } : null;
}

/** Quanto spazio ha un punto di raggio `radius` nella casella: lontano dai muri (lati di contorno). */
function room(e: CellEdges, radius: number) {
  const wall = WALL_WIDTH_PX / 2 + 3;
  const lo = (open: boolean) => (open ? 3 : wall) + radius;
  return { x0: lo(e.w), x1: CELL_SIZE - lo(e.e), y0: lo(e.n), y1: CELL_SIZE - lo(e.s) };
}

/** Un contorno irregolare e un po' squadrato, come i sassi delle rocce (stesso stile di `obstacle-view`). */
function outline(cx: number, cy: number, r: number, rng: () => number, n: number): number[] {
  const pts: number[] = [];
  const start = rng() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = start + (i / n) * Math.PI * 2;
    const k = 0.78 + 0.22 * rng();
    const sx = Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** 0.7;
    const sy = Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** 0.7;
    pts.push(cx + r * sx * k, cy + r * sy * k);
  }
  return pts;
}

/** Qualche sasso (contorno e riempimento come le rocce) e dei detriti piccoli, più fitti verso la roccia. */
function pebbles(g: Graphics, debris: { x: number; y: number; r: number }[], rng: () => number, e: CellEdges, toward: { dx: number; dy: number }, ox: number, oy: number) {
  const bias = (d: number) => (d === 0 ? rng() : d > 0 ? 1 - (1 - rng()) ** 2 : rng() ** 2); // verso la roccia
  const spot = (r: number) => {
    const a = room(e, r);
    return { x: ox + (a.x0 >= a.x1 ? CELL_SIZE / 2 : a.x0 + bias(toward.dx) * (a.x1 - a.x0)), y: oy + (a.y0 >= a.y1 ? CELL_SIZE / 2 : a.y0 + bias(toward.dy) * (a.y1 - a.y0)) };
  };
  const count = 1 + Math.floor(rng() * SCENERY.pebbleMax);
  const placed: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < count; i++) {
    const r = rand(rng, SCENERY.pebbleMinPx, SCENERY.pebbleMaxPx);
    for (let tries = 0; tries < 12; tries++) {
      const p = spot(r);
      if (placed.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= (q.r + r) * 1.2)) {
        placed.push({ ...p, r });
        g.poly(outline(p.x, p.y, r, rng, 7)).fill(theme.color.stone.fill).stroke({ width: LINE.hairline, color: theme.color.stone.line, join: 'round', pixelLine: true });
        break;
      }
    }
  }
  for (let i = 0; i < SCENERY.debrisMax; i++) {
    if (rng() < 0.6) {
      const p = spot(1);
      debris.push({ x: p.x, y: p.y, r: rand(rng, SCENERY.debrisMinPx, SCENERY.debrisMaxPx) });
    }
  }
}

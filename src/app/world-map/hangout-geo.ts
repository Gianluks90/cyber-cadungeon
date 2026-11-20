/**
 * La geometria del ritrovo, senza mappa: quali luoghi sono pubblici, come si riconosce un edificio e quando due edifici sono vicini. Le coordinate sono [lng, lat];
 * le distanze si calcolano in metri su un piano locale (basta su qualche centinaio di metri).
 */

/** Quanti edifici sceglie il giocatore per imporre la sua influenza attorno al ritrovo (un punto per edificio). */
export const INFLUENCE_POINTS = 3;
/** Gli edifici scelti si cercano prima entro INFLUENCE_START_M dal luogo; se non bastano il raggio cresce di INFLUENCE_STEP_M alla volta, fino a INFLUENCE_MAX_M. */
export const INFLUENCE_START_M = 50;
export const INFLUENCE_STEP_M = 25;
export const INFLUENCE_MAX_M = 500;
/** Quanto può distare dal giocatore un luogo pubblico per scegliere lì il ritrovo, in metri. */
export const HANGOUT_PICK_RANGE_M = 100
/** Quanto può distare un edificio da quelli già dell'area per poterlo aggiungere (strade e cortili compresi), in metri. */
export const EXPAND_REACH_M = 25;

/**
 * I tipi di luogo (`kind` del layer `pois`) dove si può fissare il ritrovo: solo cose pubbliche, mai attività o servizi. Una lista bianca: un tipo nuovo nei dati resta escluso finché
 * non lo ammettiamo. Panchine e alberi sono fuori apposta (ce ne sono ovunque).
 */
export const PUBLIC_POI_KINDS: readonly string[] = [
  'library', 'memorial', 'monument', 'clock', 'artwork', 'attraction', 'viewpoint',
  'park', 'playground', 'garden', 'dog_park', 'public_bookcase', 'toilets', 'ruins', 'castle', 'city_gate', 'lavoir',
];

/** Le aree d'uso del suolo (`kind` del layer `landuse`) dove nessun edificio entra nell'area del ritrovo. */
export const BLOCKED_LANDUSE: readonly string[] = ['school', 'college', 'university', 'hospital', 'military', 'cemetery', 'industrial', 'prison'];

export type Ring = readonly (readonly number[])[];

/** Un edificio com'è nei tasselli: l'identificativo e i contorni (un edificio a cavallo di due tasselli arriva in pezzi, qui riuniti). */
export interface Footprint {
  id: number;
  rings: Ring[];
}

interface GeoFeature {
  id?: number | string;
  properties?: Record<string, unknown> | null;
  geometry: { type: string; coordinates: unknown };
}

/** I contorni esterni dei poligoni di una geometria GeoJSON (i buchi non servono). */
function outerRings(geometry: GeoFeature['geometry']): Ring[] {
  if (geometry.type === 'Polygon') return [(geometry.coordinates as number[][][])[0]];
  if (geometry.type === 'MultiPolygon') return (geometry.coordinates as number[][][][]).map((p) => p[0]);
  return [];
}

/** Gli edifici veri (non le loro parti, non i numeri civici) dai pezzi letti dai tasselli, uniti per identificativo. */
export function footprintsFrom(features: readonly GeoFeature[]): Map<number, Footprint> {
  const out = new Map<number, Footprint>();
  const seen = new Set<string>();
  for (const f of features) {
    if (f.properties?.['kind'] !== 'building' || typeof f.id !== 'number') continue;
    const rings = outerRings(f.geometry);
    const entry = out.get(f.id) ?? { id: f.id, rings: [] };
    for (const r of rings) {
      const key = `${f.id}:${r.length}:${r[0]?.[0]}:${r[0]?.[1]}`; // lo stesso pezzo letto due volte (tasselli sovrapposti) conta una volta
      if (seen.has(key)) continue;
      seen.add(key);
      entry.rings.push(r);
    }
    out.set(f.id, entry);
  }
  return out;
}

/** I poligoni (contorno esterno) delle aree d'uso del suolo vietate. */
export function blockedLandFrom(features: readonly GeoFeature[]): Ring[] {
  return features.filter((f) => BLOCKED_LANDUSE.includes(String(f.properties?.['kind']))).flatMap((f) => outerRings(f.geometry));
}

/** Il centro dell'edificio (il centro del rettangolo che lo contiene). */
export function centerOf(fp: Footprint): [number, number] {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const r of fp.rings) for (const [x, y] of r) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

export function pointInRing(p: readonly number[], ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Un edificio è escluso se il suo centro cade in un'area vietata (scuola, ospedale, caserma…). */
export function isBlocked(fp: Footprint, blocked: readonly Ring[]): boolean {
  const c = centerOf(fp);
  return blocked.some((r) => pointInRing(c, r));
}

type FlatRings = (readonly (readonly [number, number])[])[];

/** I contorni su un piano in metri (x verso est, y verso nord) rispetto a una latitudine di riferimento. */
function flatten(rings: readonly Ring[], originLat: number): FlatRings {
  const kx = Math.cos((originLat * Math.PI) / 180) * 111_320;
  const ky = 110_574;
  return rings.map((r) => r.map(([x, y]) => [x * kx, y * ky] as const));
}

/** Distanza minima in metri tra due insiemi di contorni già sul piano (un punto è un contorno di un solo vertice). */
function distanceFlat(fa: FlatRings, fb: FlatRings): number {
  let best = Infinity;
  const against = (from: FlatRings, to: FlatRings) => {
    for (const ra of from) for (const [px, py] of ra) for (const rb of to) {
      for (let i = 0; i < rb.length; i++) {
        const [x1, y1] = rb[i];
        const [x2, y2] = rb[(i + 1) % rb.length];
        const dx = x2 - x1, dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
        const d = Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
        if (d < best) best = d;
      }
    }
  };
  against(fa, fb);
  against(fb, fa);
  return best;
}

function boxOf(rings: readonly Ring[]): [number, number, number, number] {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const r of rings) for (const [x, y] of r) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return [minX, minY, maxX, maxY];
}

/** Gli edifici (non già presi) a non più di `maxM` metri dai contorni di partenza, solo quelli esclusi (`blockedOnly`) oppure solo quelli ammessi. */
function nearby(
  sources: readonly Ring[],
  buildings: ReadonlyMap<number, Footprint>,
  blocked: readonly Ring[],
  taken: ReadonlySet<number>,
  maxM: number,
  blockedOnly: boolean,
): Footprint[] {
  if (!sources.length) return [];
  const [sx0, sy0, sx1, sy1] = boxOf(sources);
  const originLat = (sy0 + sy1) / 2;
  const padY = maxM / 110_574;
  const padX = maxM / (Math.cos((originLat * Math.PI) / 180) * 111_320);
  const flatSources = flatten(sources, originLat);
  const out: Footprint[] = [];
  for (const fp of buildings.values()) {
    if (taken.has(fp.id) || !fp.rings.length) continue;
    const [x0, y0, x1, y1] = boxOf(fp.rings);
    if (x1 < sx0 - padX || x0 > sx1 + padX || y1 < sy0 - padY || y0 > sy1 + padY) continue; // fuori dal rettangolo: troppo lontano, inutile misurare
    if (isBlocked(fp, blocked) !== blockedOnly) continue;
    if (distanceFlat(flatSources, flatten(fp.rings, originLat)) <= maxM) out.push(fp);
  }
  return out;
}

/**
 * Gli edifici (non esclusi, non già presi) che distano al massimo `maxM` metri dai contorni di partenza: sono l'area di partenza attorno a un punto, o i candidati all'espansione
 * attorno agli edifici già dell'area.
 */
export function buildingsWithin(
  sources: readonly Ring[],
  buildings: ReadonlyMap<number, Footprint>,
  blocked: readonly Ring[],
  taken: ReadonlySet<number>,
  maxM: number,
): number[] {
  return nearby(sources, buildings, blocked, taken, maxM, false).map((fp) => fp.id);
}

/** Gli edifici esclusi (dentro scuole, ospedali, caserme…) entro `maxM` metri dai contorni di partenza: quelli che il giocatore non può scegliere. Con il loro centro, per segnarli. */
export function blockedBuildingsWithin(
  sources: readonly Ring[],
  buildings: ReadonlyMap<number, Footprint>,
  blocked: readonly Ring[],
  maxM: number,
): { id: number; center: [number, number] }[] {
  return nearby(sources, buildings, blocked, new Set(), maxM, true).map((fp) => ({ id: fp.id, center: centerOf(fp) }));
}

/** Un cerchio sulla mappa: centro e raggio in metri. */
export interface Circle {
  lng: number;
  lat: number;
  r: number;
}

/** Raggio dell'area che il ritrovo proietta attorno al suo luogo, e quello di ogni edificio dell'influenza, in metri. */
export const ZONE_PLACE_M = 100;
export const ZONE_BUILDING_M = 50;

/**
 * L'unione di più cerchi come poligoni GeoJSON (MultiPolygon: per ogni poligono il contorno esterno e gli eventuali buchi, in [lng, lat]). Le aree si sommano: dove due cerchi si
 * sovrappongono resta un solo pezzo, quindi disegnata con un po' di trasparenza non si scurisce mai due volte. Si calcola sui bordi: per ogni cerchio si tengono gli archi che non
 * stanno dentro altri cerchi e li si concatena in anelli (esterni in senso antiorario, buchi in senso orario). `stepDeg` è la finezza dei bordi.
 */
export function unionOfCircles(circles: readonly Circle[], stepDeg = 6): number[][][][] {
  if (!circles.length) return [];
  const lat0 = circles.reduce((s, c) => s + c.lat, 0) / circles.length;
  const kx = Math.cos((lat0 * Math.PI) / 180) * 111_320;
  const ky = 110_574;
  const all = circles.map((c) => ({ x: c.lng * kx, y: c.lat * ky, r: c.r }));
  // Un cerchio tutto dentro un altro non conta (a parità, ne resta uno).
  const alive = all.filter((a, i) => !all.some((b, j) => j !== i && (b.r > a.r || (b.r === a.r && j < i)) && Math.hypot(a.x - b.x, a.y - b.y) + a.r <= b.r + 1e-6));
  const TAU = Math.PI * 2;
  const norm = (a: number) => ((a % TAU) + TAU) % TAU;
  const at = (c: { x: number; y: number; r: number }, a: number): [number, number] => [c.x + c.r * Math.cos(a), c.y + c.r * Math.sin(a)];
  const pointsOf = (c: { x: number; y: number; r: number }, a0: number, a1: number): [number, number][] => {
    const n = Math.max(2, Math.ceil((a1 - a0) / ((stepDeg * Math.PI) / 180)));
    return Array.from({ length: n + 1 }, (_, k) => at(c, a0 + ((a1 - a0) * k) / n));
  };

  const arcs: { c: (typeof alive)[number]; a0: number; a1: number }[] = [];
  const rings: [number, number][][] = [];
  alive.forEach((a, i) => {
    const angles: number[] = [];
    alive.forEach((b, j) => {
      if (j === i) return;
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d >= a.r + b.r || d <= Math.abs(a.r - b.r)) return; // non si incrociano
      const base = Math.atan2(b.y - a.y, b.x - a.x);
      const half = Math.acos(Math.max(-1, Math.min(1, (a.r * a.r + d * d - b.r * b.r) / (2 * a.r * d))));
      angles.push(norm(base - half), norm(base + half));
    });
    if (!angles.length) {
      rings.push(pointsOf(a, 0, TAU)); // un cerchio che non tocca nessuno: un anello a sé
      return;
    }
    angles.sort((p, q) => p - q);
    angles.forEach((a0, k) => {
      const a1 = k + 1 < angles.length ? angles[k + 1] : angles[0] + TAU;
      const mid = at(a, (a0 + a1) / 2);
      if (!alive.some((b, j) => j !== i && Math.hypot(mid[0] - b.x, mid[1] - b.y) < b.r - 1e-6)) arcs.push({ c: a, a0, a1 });
    });
  });

  // Gli archi si concatenano: la fine di uno è l'inizio del successivo.
  const used = new Array<boolean>(arcs.length).fill(false);
  const near = (p: [number, number], q: [number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.05;
  arcs.forEach((first, i) => {
    if (used[i]) return;
    used[i] = true;
    const ring: [number, number][] = pointsOf(first.c, first.a0, first.a1);
    for (;;) {
      const end = ring[ring.length - 1];
      const next = arcs.findIndex((arc, k) => !used[k] && near(at(arc.c, arc.a0), end));
      if (next === -1) break;
      used[next] = true;
      ring.push(...pointsOf(arcs[next].c, arcs[next].a0, arcs[next].a1).slice(1));
    }
    rings.push(ring);
  });

  const area = (r: [number, number][]) => r.reduce((s, p, k) => { const q = r[(k + 1) % r.length]; return s + (p[0] * q[1] - q[0] * p[1]); }, 0) / 2;
  const inside = (p: [number, number], r: [number, number][]) => pointInRing(p, r);
  const outers = rings.filter((r) => area(r) > 0).map((ring) => ({ ring, holes: [] as [number, number][][] }));
  for (const hole of rings.filter((r) => area(r) <= 0)) {
    const owner = outers.filter((o) => inside(hole[0], o.ring)).sort((p, q) => area(p.ring) - area(q.ring))[0];
    owner?.holes.push(hole);
  }
  const back = (r: [number, number][]) => [...r, r[0]].map(([x, y]) => [x / kx, y / ky]);
  return outers.map((o) => [back(o.ring), ...o.holes.map(back)]);
}

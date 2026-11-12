import { UNLOCK_RADIUS_M } from '../constants';
import type { Contract } from './contract';

/** Una posizione sulla Terra, con la precisione del GPS in metri (se la si conosce). */
export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy?: number;
}

const EARTH_RADIUS_M = 6_371_008.8;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Distanza in metri fra due punti (formula di haversine). */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Il contratto si sblocca da qui? Vale `distanza − precisione ≤ UNLOCK_RADIUS_M` (docs/DESIGN-MOD-CONTRATTI.md, §2.7b): una posizione poco precisa non può mai far
 * sbloccare da lontano più di quanto la sua incertezza ammette, e non penalizza chi è davvero vicino. Si calcola solo sul dispositivo: la posizione non esce mai.
 */
export function canUnlock(contract: Pick<Contract, 'lat' | 'lng'>, position: GeoPoint): boolean {
  return distanceMeters(contract, position) - Math.max(0, position.accuracy ?? 0) <= UNLOCK_RADIUS_M;
}

/** Un punto a `meters` metri a nord di `from` (per i contratti di prova). */
export function northOf(from: GeoPoint, meters: number): GeoPoint {
  return { lat: from.lat + (meters / EARTH_RADIUS_M) * (180 / Math.PI), lng: from.lng };
}

/** Id dei contratti di prova generati in sviluppo: non stanno in `index.json` e non si salvano. */
export const DEV_CONTRACT_PREFIX = 'dev-';

/** I due contratti di prova, uno a ~30 m e uno a ~5 km da `here`, sulla stessa missione di prova. Solo in sviluppo. */
export function devContracts(here: GeoPoint): Contract[] {
  const make = (id: string, number: number, title: string, meters: number): Contract => ({
    id: DEV_CONTRACT_PREFIX + id,
    number,
    title,
    caption: 'Generato rispetto alla tua posizione, solo in sviluppo.',
    mapId: 'test',
    ...northOf(here, meters),
    visibility: 'visible',
    fixer: 'app',
  });
  return [make('near', 9001, 'Prova: contratto vicino', 30), make('far', 9002, 'Prova: contratto lontano', 5000)];
}

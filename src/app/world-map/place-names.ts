import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles } from 'pmtiles';
import { LABEL_LANGUAGE, PMTILES_URL } from './map-config';

/** Quartiere e città di un punto, dai nomi dei luoghi nei dati della mappa. */
export interface Locality {
  neighborhood: string | null;
  city: string | null;
}

/** Un luogo con nome letto da un tassello. */
interface NamedPlace {
  kind: string;
  detail: string;
  name: string;
  lng: number;
  lat: number;
}

/** Lo zoom dei tasselli da cui si leggono i quartieri (a zoom 12 ci sono quelli grandi e piccoli) e le città (a zoom 10 ci sono sempre le città grandi). */
const NEIGHBORHOOD_ZOOM = 12;
const CITY_ZOOM = 10;
/** Quanto lontano può stare la città (o, in mancanza, il paese) dal punto, in metri: i villaggi non contano, perché sono spesso un altro comune. */
const CITY_MAX_M = 30_000;
const TOWN_MAX_M = 15_000;

let archive: PMTiles | null = null;

/** Il tassello che contiene il punto a quello zoom. */
function tileOf(lng: number, lat: number, z: number): [number, number] {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  return [Math.floor(((lng + 180) / 360) * n), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)];
}

/**
 * I luoghi con nome del tassello a quello zoom, letti direttamente dal file dei dati (la stessa fonte della mappa) senza passare dalla mappa: così non dipendono da cosa è caricato
 * a schermo, dallo zoom in cui si trova né dai filtri. Si scarica un tassello di un centinaio di KB; se la richiesta fallisce si riprova un paio di volte.
 */
async function placesAt(lng: number, lat: number, z: number): Promise<NamedPlace[]> {
  archive ??= new PMTiles(PMTILES_URL);
  const [x, y] = tileOf(lng, lat, z);
  let data: Uint8Array | null = null;
  for (let attempt = 0; attempt < 3 && !data; attempt++) {
    try {
      const tile = await archive.getZxy(z, x, y);
      data = tile ? new Uint8Array(tile.data) : null;
      if (!tile) break; // il tassello non esiste (mare, zona vuota): inutile riprovare
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }
  if (!data) return [];
  const layer = new VectorTile(new PbfReader(data)).layers['places'];
  const out: NamedPlace[] = [];
  for (let i = 0; layer && i < layer.length; i++) {
    const f = layer.feature(i);
    const raw = f.properties[`name:${LABEL_LANGUAGE}`] ?? f.properties['name'];
    const geometry = f.toGeoJSON(x, y, z).geometry;
    if (typeof raw !== 'string' || !raw || geometry.type !== 'Point') continue;
    out.push({ kind: String(f.properties['kind']), detail: String(f.properties['kind_detail']), name: raw, lng: geometry.coordinates[0], lat: geometry.coordinates[1] });
  }
  return out;
}

/**
 * Il quartiere e la città di un punto. Quartiere: il più vicino fra quelli grandi (`suburb`), altrimenti fra i più piccoli. Città: la più vicina entro 30 km, altrimenti il paese più
 * vicino entro 15 km. Null per ciò che non si trova (o se la rete non risponde).
 */
export async function localityAt(lng: number, lat: number): Promise<Locality & { debug: Record<string, number | null> }> {
  const [near, wide] = await Promise.all([placesAt(lng, lat, NEIGHBORHOOD_ZOOM), placesAt(lng, lat, CITY_ZOOM)]);
  const cos = Math.cos((lat * Math.PI) / 180);
  const meters = (p: NamedPlace) => Math.hypot((p.lng - lng) * cos, p.lat - lat) * 111_320;
  const closest = (list: NamedPlace[]): NamedPlace | null => list.reduce<NamedPlace | null>((best, p) => (!best || meters(p) < meters(best) ? p : best), null);

  const suburb = closest(near.filter((p) => p.kind === 'neighbourhood' && p.detail === 'suburb'));
  const smaller = closest(near.filter((p) => p.kind === 'neighbourhood' && p.detail !== 'suburb'));
  const all = [...near, ...wide].filter((p) => p.kind === 'locality');
  const city = closest(all.filter((p) => p.detail === 'city'));
  const town = closest(all.filter((p) => p.detail === 'town'));
  const cityName = city && meters(city) <= CITY_MAX_M ? city.name : town && meters(town) <= TOWN_MAX_M ? town.name : null;
  return {
    neighborhood: (suburb ?? smaller)?.name ?? null,
    city: cityName,
    debug: { luoghiZoom12: near.length, luoghiZoom10: wide.length, cittaPiuVicinaM: city ? Math.round(meters(city)) : null, paesePiuVicinoM: town ? Math.round(meters(town)) : null },
  };
}

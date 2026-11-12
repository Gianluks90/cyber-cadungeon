import type { GeoPoint } from '../game/contracts/unlock-rule';

/** Il livello di un'allerta meteo della Protezione Civile (dal più leggero al più grave). */
export type AlertLevel = 'yellow' | 'orange' | 'red';

/** L'allerta in corso nella zona dove si trova il giocatore: il livello e il nome ufficiale della zona di allerta. */
export interface WeatherAlert {
  level: AlertLevel;
  zone: string;
}

/**
 * Chi dice se c'è un'allerta meteo. Sta dietro un'interfaccia come gli altri servizi della mappa: oggi i bollettini pubblici della Protezione Civile, domani una fonte
 * regionale o un nostro riassunto senza toccare la mappa. La posizione non esce mai dal dispositivo: il bollettino si scarica intero e la zona si cerca qui.
 */
export interface WeatherAlertService {
  /** L'allerta in corso (adesso) nel punto, o null se non ce n'è o non si riesce a saperlo. Non lancia mai. */
  at(point: GeoPoint, now: Date): Promise<WeatherAlert | null>;
}

// ---- TopoJSON: solo ciò che serve a trovare la zona che contiene un punto

interface Topology {
  arcs: [number, number][][];
  transform: { scale: [number, number]; translate: [number, number] };
  objects: Record<string, { geometries: ZoneGeometry[] }>;
}

interface ZoneGeometry {
  type: string;
  arcs?: number[][] | number[][][];
  properties?: Record<string, unknown>;
}

type Point = [number, number];

/** Il punto è dentro l'anello (regola pari-dispari). */
function inRing(ring: Point[], p: GeoPoint): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Le zone di allerta (con i loro dati) che contengono il punto. Le coordinate del TopoJSON sono intere a scatti: si riportano in gradi solo per gli archi che servono. */
export function zonesAt(topology: Topology, p: GeoPoint): Record<string, unknown>[] {
  const { scale, translate } = topology.transform;
  const decoded = new Map<number, Point[]>();
  const arc = (index: number): Point[] => {
    let points = decoded.get(index);
    if (!points) {
      let x = 0;
      let y = 0;
      points = topology.arcs[index].map(([dx, dy]) => {
        x += dx;
        y += dy;
        return [x * scale[0] + translate[0], y * scale[1] + translate[1]] as Point;
      });
      decoded.set(index, points);
    }
    return points;
  };
  // Un anello è una fila di archi; un indice negativo (~i) è l'arco i percorso al contrario. Ogni arco riparte dall'ultimo punto del precedente.
  const ring = (arcIds: number[]): Point[] => {
    const points: Point[] = [];
    for (const id of arcIds) {
      const a = id >= 0 ? arc(id) : [...arc(~id)].reverse();
      points.push(...(points.length ? a.slice(1) : a));
    }
    return points;
  };
  const inPolygon = (rings: number[][]): boolean => rings.length > 0 && inRing(ring(rings[0]), p) && !rings.slice(1).some((hole) => inRing(ring(hole), p));

  const found: Record<string, unknown>[] = [];
  for (const object of Object.values(topology.objects)) {
    for (const g of object.geometries) {
      if (!g.arcs || !g.properties) continue;
      const inside = g.type === 'Polygon' ? inPolygon(g.arcs as number[][]) : g.type === 'MultiPolygon' ? (g.arcs as number[][][]).some(inPolygon) : false;
      if (inside) found.push(g.properties);
    }
  }
  return found;
}

const LEVELS: readonly { re: RegExp; level: AlertLevel; rank: number }[] = [
  { re: /ALLERTA\s+GIALLA/i, level: 'yellow', rank: 1 },
  { re: /ALLERTA\s+ARANCIONE/i, level: 'orange', rank: 2 },
  { re: /ALLERTA\s+ROSSA/i, level: 'red', rank: 3 },
];

/** Il livello più alto tra le zone trovate (nessuna allerta = null). Il campo «Rappresentata nella mappa» dice il livello più grave tra i rischi della zona, ad es. «Moderata per rischio idraulico / ALLERTA ARANCIONE». */
export function alertFrom(zones: Record<string, unknown>[]): WeatherAlert | null {
  let best: { rank: number; alert: WeatherAlert } | null = null;
  for (const z of zones) {
    const text = String(z['Rappresentata nella mappa'] ?? '');
    const match = LEVELS.find((l) => l.re.test(text));
    if (match && (!best || match.rank > best.rank)) best = { rank: match.rank, alert: { level: match.level, zone: String(z['Nome zona'] ?? '') } };
  }
  return best?.alert ?? null;
}

// ---- Protezione Civile (GitHub)

const REPO = 'pcm-dpc/DPC-Bollettini-Criticita-Idrogeologica-Idraulica';
const RAW = `https://raw.githubusercontent.com/${REPO}/master/files/`;
const API = `https://api.github.com/repos/${REPO}/commits`;
const RESULT_KEY = 'cad-weather-result';
/** Al massimo un controllo in rete all'ora per utente (l'API di GitHub è a uso equo, circa 60 richieste all'ora per indirizzo): per un'ora si usa l'ultimo esito salvato. */
export const WEATHER_CHECK_EVERY_MS = 60 * 60 * 1000;

const readJson = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // niente storage: si ricalcola alla prossima
  }
};

/** Il giorno di calendario (locale) come numero di giorni, per confrontare due date senza ore e fusi. */
const dayNumber = (y: number, m: number, d: number): number => Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);

/**
 * I bollettini di criticità idrogeologica e idraulica del Dipartimento della Protezione Civile (licenza CC BY 4.0, da citare nei crediti). Ogni bollettino esce di solito entro le 16
 * e vale per il giorno stesso («today») e per il successivo («tomorrow»): chi guarda al mattino usa quindi il «tomorrow» di ieri. Non c'è un file «ultimo»: si ricava dall'ultimo
 * commit che ha aggiunto le anteprime. Tutto in rete è a uso equo e senza garanzie: se qualcosa non risponde, semplicemente non si mostra nulla.
 */
export class DpcWeatherAlertService implements WeatherAlertService {
  /**
   * L'ultimo esito è nel localStorage con l'ora del controllo: se è passata meno di un'ora lo si restituisce senza chiamare la rete (anche dopo aver ricaricato la pagina).
   * Anche un controllo fallito conta come fatto (si tiene l'esito di prima): così la rete non viene martellata se qualcosa non risponde.
   */
  async at(point: GeoPoint, now: Date): Promise<WeatherAlert | null> {
    const saved = readJson<{ at: number; alert: WeatherAlert | null }>(RESULT_KEY);
    if (saved && now.getTime() - saved.at >= 0 && now.getTime() - saved.at < WEATHER_CHECK_EVERY_MS) return saved.alert ?? null;
    let alert: WeatherAlert | null;
    try {
      alert = await this.fetchAlert(point, now);
    } catch {
      alert = saved?.alert ?? null; // rete assente, GitHub a corto di richieste o dati cambiati: si tiene l'esito di prima, il resto della mappa funziona lo stesso
    }
    writeJson(RESULT_KEY, { at: now.getTime(), alert });
    return alert;
  }

  private async fetchAlert(point: GeoPoint, now: Date): Promise<WeatherAlert | null> {
    const id = await this.latestId();
    if (!id) return null;
    const issued = dayNumber(Number(id.slice(0, 4)), Number(id.slice(4, 6)), Number(id.slice(6, 8)));
    const age = dayNumber(now.getFullYear(), now.getMonth() + 1, now.getDate()) - issued;
    const layer = age === 0 ? 'today' : age === 1 ? 'tomorrow' : null; // un bollettino più vecchio non copre oggi
    if (!layer) return null;
    const index = (await this.json(`${RAW}${id}.json`)) as Record<string, { topo_json?: string }>;
    const url = index[layer]?.topo_json;
    if (typeof url !== 'string' || !url.startsWith(RAW)) return null; // si scarica solo dal repository della Protezione Civile
    return alertFrom(zonesAt((await this.json(url)) as Topology, point));
  }

  private async json(url: string): Promise<unknown> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }

  /** L'id (AAAAMMGG_HHMM) dell'ultimo bollettino. */
  private async latestId(): Promise<string | null> {
    const commits = (await this.json(`${API}?path=files/preview&per_page=1`)) as { sha?: string }[];
    const sha = commits[0]?.sha;
    if (!sha) return null;
    const commit = (await this.json(`${API}/${sha}`)) as { files?: { filename?: string }[] };
    for (const f of commit.files ?? []) {
      const id = /^files\/preview\/(\d{8}_\d{4})_/.exec(f.filename ?? '')?.[1];
      if (id) return id;
    }
    return null;
  }
}

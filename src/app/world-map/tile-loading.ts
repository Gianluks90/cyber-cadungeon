import type { Map as MapLibreMap, MapSourceDataEvent } from 'maplibre-gl';
import { Marker } from 'maplibre-gl';

/** Quanti tasselli al massimo si segnalano (i più vicini al centro): la griglia è fitta e in 3D se ne vedono molti, anche lontani. */
const MAX_SHOWN = 6;
/** Un tassello si segnala solo se ci mette più di così: i caricamenti rapidi non devono far lampeggiare tutto. */
const SHOW_AFTER_MS = 250;
/** Un tassello che non dà più notizie (errore di rete senza evento) smette di essere segnalato dopo questo tempo. */
const GIVE_UP_MS = 20_000;
const SEGMENTS = 6;

interface Pending {
  z: number;
  x: number;
  y: number;
  since: number;
}

const key = (z: number, x: number, y: number) => `${z}/${x}/${y}`;
const lng = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
const lat = (y: number, z: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;

/**
 * I tasselli della mappa che stanno arrivando: ognuno (fra i più vicini al centro) ha, al centro, un piccolo loader a segmenti. Niente bordi attorno al tassello: la griglia è fitta e ne comparirebbero troppi.
 * Si basa sugli eventi di MapLibre che portano le coordinate del tassello (`sourcedataloading`, `sourcedata`, `sourcedataabort`) solo per la sorgente dei dati della mappa;
 * il rilievo del 3D non conta. I tasselli dei livelli di zoom più bassi, che MapLibre scarica in anticipo, non si mostrano: solo quelli del livello più alto in arrivo.
 * Non crea nulla finché non arriva un tassello lento, e `destroy()` toglie tutto.
 */
export class TileLoadingView {
  private readonly pending = new Map<string, Pending>();
  private readonly markers = new Map<string, Marker>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private frame = 0;

  private readonly onStart = (e: MapSourceDataEvent) => {
    if (e.sourceId !== this.sourceId || !e.coord) return;
    const { z, x, y } = e.coord.canonical;
    this.pending.set(key(z, x, y), { z, x, y, since: performance.now() });
    this.refresh();
  };
  private readonly onDone = (e: MapSourceDataEvent) => {
    if (e.sourceId !== this.sourceId || !e.coord) return;
    const { z, x, y } = e.coord.canonical;
    if (this.pending.delete(key(z, x, y))) this.refresh();
  };
  private readonly onIdle = () => {
    this.pending.clear();
    this.refresh();
  };
  private readonly onMove = () => {
    if (this.pending.size && !this.frame) this.frame = requestAnimationFrame(() => { this.frame = 0; this.refresh(); });
  };

  constructor(private readonly map: MapLibreMap, private readonly sourceId: string) {
    map.on('sourcedataloading', this.onStart);
    map.on('sourcedata', this.onDone);
    map.on('sourcedataabort', this.onDone);
    map.on('idle', this.onIdle);
    map.on('move', this.onMove);
  }

  destroy(): void {
    const m = this.map;
    m.off('sourcedataloading', this.onStart);
    m.off('sourcedata', this.onDone);
    m.off('sourcedataabort', this.onDone);
    m.off('idle', this.onIdle);
    m.off('move', this.onMove);
    if (this.timer) clearTimeout(this.timer);
    if (this.frame) cancelAnimationFrame(this.frame);
    for (const mk of this.markers.values()) mk.remove();
    this.markers.clear();
  }

  /** Ridisegna: sceglie i tasselli da segnalare e aggiorna i loader. */
  private refresh(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const now = performance.now();
    for (const [k, p] of this.pending) if (now - p.since > GIVE_UP_MS) this.pending.delete(k);

    // Solo il livello di zoom più alto in arrivo (gli altri sono tasselli scaricati in anticipo, fuori dalla vista), e solo quelli lenti.
    const zmax = Math.max(-1, ...[...this.pending.values()].map((p) => p.z));
    const slow = [...this.pending.values()].filter((p) => p.z === zmax && now - p.since >= SHOW_AFTER_MS);
    const waiting = [...this.pending.values()].some((p) => p.z === zmax && now - p.since < SHOW_AFTER_MS);

    // I più vicini al centro della vista.
    const c = this.map.getCenter();
    const n = 2 ** Math.max(zmax, 0);
    const cx = ((c.lng + 180) / 360) * n;
    const cy = ((1 - Math.log(Math.tan((c.lat * Math.PI) / 180) + 1 / Math.cos((c.lat * Math.PI) / 180)) / Math.PI) / 2) * n;
    const shown = slow.sort((a, b) => Math.hypot(a.x + 0.5 - cx, a.y + 0.5 - cy) - Math.hypot(b.x + 0.5 - cx, b.y + 0.5 - cy)).slice(0, MAX_SHOWN);

    const wanted = new Set(shown.map((p) => key(p.z, p.x, p.y)));
    for (const [k, mk] of this.markers) {
      if (!wanted.has(k)) {
        mk.remove();
        this.markers.delete(k);
      }
    }
    for (const p of shown) {
      const k = key(p.z, p.x, p.y);
      if (this.markers.has(k)) continue;
      this.markers.set(k, new Marker({ element: this.loaderElement() }).setLngLat([lng(p.x + 0.5, p.z), lat(p.y + 0.5, p.z)]).addTo(this.map));
    }

    // Se c'è ancora un tassello che non ha aspettato abbastanza, si riguarda appena succede.
    if (waiting) this.timer = setTimeout(() => this.refresh(), SHOW_AFTER_MS);
  }

  /** Il loader a segmenti (stile in `src/styles.css`, `.cad-tile-loader`): un segmento alla volta si accende, in loop. */
  private loaderElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'cad-tile-loader';
    el.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < SEGMENTS; i++) {
      const s = document.createElement('span');
      s.style.animationDelay = `${i * 90}ms`;
      el.append(s);
    }
    return el;
  }
}

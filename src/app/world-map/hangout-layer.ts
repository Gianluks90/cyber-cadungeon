import { Marker, type FilterSpecification, type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import type { HangoutPlace } from '../game/hangout/hangout-store';
import { translate } from '../i18n/i18n.service';
import { BASEMAP_SOURCE_ID } from './map-config';
import { EXPAND_REACH_M, INFLUENCE_MAX_M, INFLUENCE_POINTS, INFLUENCE_START_M, INFLUENCE_STEP_M, PUBLIC_POI_KINDS, blockedLandFrom, ZONE_BUILDING_M, ZONE_PLACE_M, blockedBuildingsWithin, buildingsWithin, centerOf, footprintsFrom, unionOfCircles, type Circle, type Ring } from './hangout-geo';

const AREA_FILL = 'hangout-area-fill';
const AREA_LINE = 'hangout-area-line';
const REACH_FILL = 'hangout-reach-fill';
const REACH_LINE = 'hangout-reach-line';
const ZONE_SOURCE = 'hangout-zone';
const ZONE_FILL = 'hangout-zone-fill';
const ZONE_LINE = 'hangout-zone-line';
const BLOCKED_FILL = 'hangout-blocked-fill';
const BLOCKED_LINE = 'hangout-blocked-line';
/** L'immagine delle righe a 45 gradi (id nelle immagini della mappa). */
const HATCH = 'hangout-hatch';
/** Il livello dei tasselli che contiene gli edifici. */
const BUILDINGS = 'buildings';

/** Un luogo pubblico dove si può fissare il ritrovo. */
export type Candidate = HangoutPlace;

/** Un edificio che il giocatore non può scegliere, con il suo centro (dove sta il segno di avviso). */
export interface BlockedBuilding {
  id: number;
  center: [number, number];
}

/** Le righe a 45 gradi del colore dato, come immagine che si ripete (16 px). */
function hatchImage(color: string): ImageData {
  const size = 16;
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const pctx = probe.getContext('2d', { willReadFrequently: true })!;
  pctx.fillStyle = color;
  pctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = pctx.getImageData(0, 0, 1, 1).data;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if ((x + y) % size < 2) data.set([r, g, b, 255], (y * size + x) * 4);
    }
  }
  return new ImageData(data, size, size);
}

/** Come si riconosce un luogo (i luoghi non hanno un identificativo nostro: bastano le coordinate). */
const placeKey = (p: { lng: number; lat: number }): string => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`;

/** Un filtro che lascia solo gli edifici con questi identificativi (con la lista vuota, nessuno). */
function idFilter(ids: readonly number[]): FilterSpecification {
  return ['in', ['id'], ['literal', ids.length ? ids : [-1]]] as FilterSpecification;
}

/**
 * Il ritrovo sulla mappa: l'area (edifici del giocatore, colorati), i candidati all'espansione, i luoghi pubblici tra cui scegliere e il segnaposto del ritrovo. Disegna soltanto
 * e legge i tasselli; le scelte stanno nel componente. Vive fuori da NgZone come la mappa. Gli edifici si colorano con un filtro per identificativo sul livello `buildings` dei
 * tasselli, quindi non serve ricalcolare le forme: ci pensa la mappa. `render()` si può richiamare quando si vuole, anche dopo un cambio di stile.
 */
export class HangoutLayer {
  private areaIds: readonly number[] = [];
  private reachIds: readonly number[] = [];
  private places: readonly Candidate[] = [];
  private home: HangoutPlace | null = null;
  private marker: Marker | null = null;
  private placeMarkers: Marker[] = [];
  private placeButtons: { key: string; button: HTMLButtonElement; hover: boolean }[] = [];
  private selectedKey: string | null = null;
  private blocked: readonly BlockedBuilding[] = [];
  private zone: readonly Circle[] = [];
  private blockedMarkers: Marker[] = [];

  constructor(private readonly map: MapLibreMap) {}

  setArea(ids: readonly number[]): void {
    this.areaIds = ids;
    this.render();
  }

  setReach(ids: readonly number[]): void {
    this.reachIds = ids;
    this.render();
  }

  /** Le aree rotonde dell'influenza (l'occhio del profilo Fixer): l'unione dei cerchi come un'unica area; vuoto = nascoste. */
  setZone(circles: readonly Circle[]): void {
    this.zone = circles;
    this.render();
  }

  /** I cerchi dell'area: uno di ZONE_PLACE_M attorno al luogo del ritrovo e uno di ZONE_BUILDING_M attorno a ogni edificio dell'influenza (quelli di cui i tasselli caricati hanno la forma). */
  zoneCircles(place: HangoutPlace, ids: readonly number[]): Circle[] {
    const buildings = this.readBuildings();
    const circles: Circle[] = [{ lng: place.lng, lat: place.lat, r: ZONE_PLACE_M }];
    for (const id of ids) {
      const fp = buildings.get(id);
      if (!fp?.rings.length) continue;
      const [lng, lat] = centerOf(fp);
      circles.push({ lng, lat, r: ZONE_BUILDING_M });
    }
    return circles;
  }

  /** Gli edifici non selezionabili: righe a 45 gradi rosse e, al centro, un box rosso con l'icona di avviso e la scritta «Vietato» («Off limits»). */
  setBlocked(list: readonly BlockedBuilding[]): void {
    this.blocked = list;
    this.blockedMarkers.forEach((m) => m.remove());
    const iconUrl = new URL('icons/warning.svg', document.baseURI).href;
    const text = translate('worldMap.hangout.blocked');
    this.blockedMarkers = list.map((b) => {
      // L'elemento del marker lo muove MapLibre: lo stile sta su un figlio. Non prende i tocchi, che passano alla mappa.
      const el = document.createElement('div');
      el.style.cssText = 'pointer-events:none';
      const box = document.createElement('div');
      box.style.cssText = 'display:flex;align-items:center;gap:4px;box-sizing:border-box;padding:3px 7px 3px 4px;white-space:nowrap;border-radius:var(--radius-1);background:var(--c-danger);border:1px solid var(--c-surface);color:var(--c-surface);font:700 10px/1 var(--font-ui);letter-spacing:var(--label-tracking);text-transform:uppercase';
      const glyph = document.createElement('span');
      glyph.style.cssText = `flex:none;width:14px;height:14px;background-color:var(--c-surface);-webkit-mask:url("${iconUrl}") center / contain no-repeat;mask:url("${iconUrl}") center / contain no-repeat`;
      const label = document.createElement('span');
      label.textContent = text;
      box.append(glyph, label);
      el.append(box);
      return new Marker({ element: el }).setLngLat(b.center).addTo(this.map);
    });
    this.render();
  }

  /**
   * I luoghi tra cui scegliere, come tanti cerchi con dentro una casetta (marker della mappa), con i colori dei contratti: sfondo scuro, casetta e bordo azzurri. Un po' spenti;
   * pieni e luminosi quando ci si passa sopra, e il luogo scelto (`setSelected`) resta acceso. `onPick` dice quale è stato toccato.
   * Sono marker HTML (non un livello della mappa) per avere il passaggio del mouse e il tocco gratis.
   */
  setPlaces(places: readonly Candidate[], onPick: (place: Candidate) => void = () => {}): void {
    this.places = places;
    this.placeMarkers.forEach((m) => m.remove());
    this.placeButtons = [];
    const iconUrl = new URL('icons/home.svg', document.baseURI).href;
    this.placeMarkers = places.map((place) => {
      // L'elemento del marker lo posiziona MapLibre con la sua `transform` (e nient'altro: niente `position`, niente transition): lo stile sta su un figlio.
      const el = document.createElement('div');
      el.style.cssText = 'width:32px;height:32px';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cad-pick'; // il cursore «da scegliere» (vedi styles.css)
      button.title = place.name ?? '';
      button.setAttribute('aria-label', place.name ?? place.kind);
      const glyph = document.createElement('span');
      glyph.style.cssText = `position:absolute;inset:5px;background-color:var(--c-interact);-webkit-mask:url("${iconUrl}") center / contain no-repeat;mask:url("${iconUrl}") center / contain no-repeat`;
      button.append(glyph);
      const entry = { key: placeKey(place), button, hover: false };
      this.placeButtons.push(entry);
      this.paintPlace(entry);
      button.addEventListener('mouseenter', () => { entry.hover = true; this.paintPlace(entry); });
      button.addEventListener('mouseleave', () => { entry.hover = false; this.paintPlace(entry); });
      button.addEventListener('focus', () => { entry.hover = true; this.paintPlace(entry); });
      button.addEventListener('blur', () => { entry.hover = false; this.paintPlace(entry); });
      button.addEventListener('click', (e) => { e.stopPropagation(); onPick(place); }); // il tocco non arriva alla mappa
      el.append(button);
      return new Marker({ element: el }).setLngLat([place.lng, place.lat]).addTo(this.map);
    });
  }

  /** Il luogo aperto nel pannello: la sua casetta resta evidenziata (null: nessuno). */
  setSelected(place: Candidate | null): void {
    this.selectedKey = place ? placeKey(place) : null;
    this.placeButtons.forEach((e) => this.paintPlace(e));
  }

  private paintPlace(entry: { key: string; button: HTMLButtonElement; hover: boolean }): void {
    const lit = entry.hover || entry.key === this.selectedKey;
    entry.button.style.cssText =
      'position:relative;display:block;box-sizing:border-box;width:100%;height:100%;padding:0;border-radius:50%;background:var(--c-surface);border:2px solid var(--c-interact);' +
      'transition:opacity 120ms,transform 120ms,box-shadow 120ms;' +
      (lit ? 'opacity:1;transform:scale(1.25);box-shadow:0 0 8px var(--c-interact)' : 'opacity:0.6;transform:scale(1);box-shadow:none');
  }
  setHome(place: HangoutPlace | null): void {
    this.home = place;
    this.render();
  }

  /** Mette (o aggiorna) livelli, sorgente e segnaposto. Se lo stile non è pronto non fa nulla: lo richiama `style.load`. */
  render(): void {
    const map = this.map;
    try {
      const css = getComputedStyle(document.documentElement);
      const you = css.getPropertyValue('--c-you').trim();
      const interact = css.getPropertyValue('--c-interact').trim();
      // Sopra gli edifici e sotto le scritte.
      const before = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
      // Le aree rotonde: l'unione dei cerchi (il luogo e ogni edificio) come un'unica area, verde con il contorno tratteggiato; dove i cerchi si sovrappongono non si scurisce due volte e il contorno segue solo il bordo esterno.
      const zoneData = { type: 'FeatureCollection' as const, features: this.zone.length ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'MultiPolygon' as const, coordinates: unionOfCircles(this.zone) } }] : [] };
      const zoneSource = map.getSource(ZONE_SOURCE);
      if (zoneSource && 'setData' in zoneSource) (zoneSource as GeoJSONSource).setData(zoneData);
      else {
        map.addSource(ZONE_SOURCE, { type: 'geojson', data: zoneData });
        map.addLayer({ id: ZONE_FILL, type: 'fill', source: ZONE_SOURCE, paint: { 'fill-color': you, 'fill-opacity': 0.08 } }, before);
        map.addLayer({ id: ZONE_LINE, type: 'line', source: ZONE_SOURCE, paint: { 'line-color': you, 'line-width': 1.5, 'line-dasharray': [3, 2], 'line-opacity': 0.9 } }, before);
      }      const fill = (id: string, ids: readonly number[], color: string, opacity: number) => {
        if (map.getLayer(id)) map.setFilter(id, idFilter(ids));
        else map.addLayer({ id, type: 'fill', source: BASEMAP_SOURCE_ID, 'source-layer': BUILDINGS, filter: idFilter(ids), paint: { 'fill-color': color, 'fill-opacity': opacity } }, before);
      };
      const line = (id: string, ids: readonly number[], color: string, width: number) => {
        if (map.getLayer(id)) map.setFilter(id, idFilter(ids));
        else map.addLayer({ id, type: 'line', source: BASEMAP_SOURCE_ID, 'source-layer': BUILDINGS, filter: idFilter(ids), paint: { 'line-color': color, 'line-width': width } }, before);
      };
      fill(AREA_FILL, this.areaIds, you, 0.4);
      line(AREA_LINE, this.areaIds, you, 1.2);
      fill(REACH_FILL, this.reachIds, interact, 0.35);
      line(REACH_LINE, this.reachIds, interact, 1.6);
      // Gli edifici non selezionabili: righe a 45 gradi rosse (l'immagine va rimessa dopo un cambio di stile) e un contorno rosso.
      const danger = css.getPropertyValue('--c-danger').trim();
      if (!map.hasImage(HATCH)) map.addImage(HATCH, hatchImage(danger), { pixelRatio: 2 });
      const blockedIds = this.blocked.map((b) => b.id);
      if (map.getLayer(BLOCKED_FILL)) map.setFilter(BLOCKED_FILL, idFilter(blockedIds));
      else map.addLayer({ id: BLOCKED_FILL, type: 'fill', source: BASEMAP_SOURCE_ID, 'source-layer': BUILDINGS, filter: idFilter(blockedIds), paint: { 'fill-pattern': HATCH, 'fill-opacity': 0.9 } }, before);
      line(BLOCKED_LINE, blockedIds, danger, 1.2);

      this.renderHome();
    } catch {
      /* stile non ancora pronto (cambio di tema o primi tasselli) */
    }
  }

  private renderHome(): void {
    if (!this.home) {
      this.marker?.remove();
      this.marker = null;
      return;
    }
    if (!this.marker) {
      const iconUrl = new URL('icons/home.svg', document.baseURI).href;
      const el = document.createElement('div');
      el.style.cssText = 'width:28px;height:28px;pointer-events:none';
      // La maschera ritaglia anche l'ombra, quindi il bagliore sta su un contenitore a parte (come la freccia del giocatore).
      const glow = document.createElement('div');
      glow.style.cssText = 'width:100%;height:100%;filter:drop-shadow(0 0 6px var(--c-you))';
      const icon = document.createElement('div');
      icon.style.cssText = `width:100%;height:100%;background-color:var(--c-you);-webkit-mask:url("${iconUrl}") center / contain no-repeat;mask:url("${iconUrl}") center / contain no-repeat`;
      glow.append(icon);
      el.append(glow);
      this.marker = new Marker({ element: el });
    }
    this.marker.setLngLat([this.home.lng, this.home.lat]).addTo(this.map);
  }

  destroy(): void {
    this.marker?.remove();
    this.marker = null;
    this.placeMarkers.forEach((m) => m.remove());
    this.placeMarkers = [];
    this.blockedMarkers.forEach((m) => m.remove());
    this.blockedMarkers = [];
  }

  /** L'identificativo dell'edificio candidato toccato in questo punto, o null. */
  reachAt(point: { x: number; y: number }): number | null {
    const f = this.map.queryRenderedFeatures([point.x, point.y] as [number, number], { layers: [REACH_FILL] })[0];
    return typeof f?.id === 'number' ? f.id : null;
  }

  /** I luoghi pubblici dei tasselli caricati (solo i tipi ammessi). Ogni luogo compare una volta. */
  readPlaces(): Candidate[] {
    const found = new Map<string, Candidate>();
    for (const f of this.map.querySourceFeatures(BASEMAP_SOURCE_ID, { sourceLayer: 'pois', filter: ['in', ['get', 'kind'], ['literal', PUBLIC_POI_KINDS]] as FilterSpecification })) {
      if (f.geometry.type !== 'Point') continue;
      const [lng, lat] = f.geometry.coordinates as [number, number];
      const name = typeof f.properties['name'] === 'string' && f.properties['name'] ? (f.properties['name'] as string) : null;
      found.set(`${lng.toFixed(6)},${lat.toFixed(6)}`, { name, kind: String(f.properties['kind']), lng, lat });
    }
    return [...found.values()];
  }

  private readBuildings() {
    return footprintsFrom(this.map.querySourceFeatures(BASEMAP_SOURCE_ID, { sourceLayer: BUILDINGS, filter: ['==', ['get', 'kind'], 'building'] as FilterSpecification }));
  }

  private readBlocked(): Ring[] {
    return blockedLandFrom(this.map.querySourceFeatures(BASEMAP_SOURCE_ID, { sourceLayer: 'landuse' }));
  }

  /**
   * Gli edifici dove si può imporre l'influenza attorno al luogo (esclusi quelli dentro scuole, ospedali, caserme…): entro INFLUENCE_START_M; se sono meno di INFLUENCE_POINTS il raggio
   * cresce di INFLUENCE_STEP_M alla volta finché ce ne sono abbastanza (o si arriva a INFLUENCE_MAX_M). Dice anche con che raggio si è trovato.
   */
  eligibleAround(place: HangoutPlace): { ids: number[]; radius: number; blocked: BlockedBuilding[] } {
    const buildings = this.readBuildings();
    const blocked = this.readBlocked();
    const source: Ring[] = [[[place.lng, place.lat]]];
    let radius = INFLUENCE_START_M;
    let ids = buildingsWithin(source, buildings, blocked, new Set(), radius);
    while (ids.length < INFLUENCE_POINTS && radius < INFLUENCE_MAX_M) {
      radius += INFLUENCE_STEP_M;
      ids = buildingsWithin(source, buildings, blocked, new Set(), radius);
    }
    return { ids, radius, blocked: blockedBuildingsWithin(source, buildings, blocked, radius) };
  }

  /**
   * Il rettangolo [ovest, sud, est, nord] che contiene tutti questi edifici, letto dai tasselli caricati. Con `requireAll` se manca la forma di uno (tassello non ancora caricato)
   * restituisce null, perché il rettangolo sarebbe incompleto; senza, usa quelli trovati. Null anche se non se ne trova nessuno.
   */
  boundsOf(ids: readonly number[], requireAll: boolean): [number, number, number, number] | null {
    const buildings = this.readBuildings();
    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
    let found = 0;
    for (const id of ids) {
      const fp = buildings.get(id);
      if (!fp?.rings.length) continue;
      found++;
      for (const ring of fp.rings) for (const [x, y] of ring) {
        west = Math.min(west, x); east = Math.max(east, x);
        south = Math.min(south, y); north = Math.max(north, y);
      }
    }
    if (!found || (requireAll && found < ids.length)) return null;
    return [west, south, east, north];
  }

  /** L'identificativo dell'edificio dell'area (già scelto) toccato in questo punto, o null. */
  areaAt(point: { x: number; y: number }): number | null {
    const f = this.map.queryRenderedFeatures([point.x, point.y] as [number, number], { layers: [AREA_FILL] })[0];
    return typeof f?.id === 'number' ? f.id : null;
  }

  /** Gli edifici che si possono aggiungere: quelli a non più di EXPAND_REACH_M dall'area. Se la mappa non ha ancora caricato la forma degli edifici dell'area, nessuno. */
  reachFrom(ownedIds: readonly number[]): { ids: number[]; blocked: BlockedBuilding[] } {
    const buildings = this.readBuildings();
    const owned = new Set(ownedIds);
    const sources = ownedIds.flatMap((id) => buildings.get(id)?.rings ?? []);
    const land = this.readBlocked();
    return { ids: buildingsWithin(sources, buildings, land, owned, EXPAND_REACH_M), blocked: blockedBuildingsWithin(sources, buildings, land, EXPAND_REACH_M) };
  }
}

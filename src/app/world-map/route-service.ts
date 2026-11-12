import type { GeoPoint } from '../game/contracts/unlock-rule';

/** Un percorso a piedi: la linea (lng, lat), la lunghezza in metri e il tempo stimato in secondi. */
export interface WalkingRoute {
  coordinates: [number, number][];
  distanceM: number;
  durationS: number;
}

/**
 * Chi calcola i percorsi a piedi. Sta dietro un'interfaccia come gli archivi (CLAUDE.md, "Stack"): oggi un servizio pubblico gratuito, domani un Valhalla o un OSRM nostro senza
 * toccare la mappa. Per calcolare il percorso la posizione di partenza esce dal dispositivo (deciso: l'utente è avvisato nei termini; vedi docs/DESIGN-MOD-CONTRATTI.md, §2.7b).
 * Lo sblocco dei contratti non passa di qui: resta locale.
 */
export interface RouteService {
  /** Il percorso a piedi da `from` a `to`, o null se non c'è (nessuna strada, servizio non raggiungibile, risposta strana). Non lancia mai. */
  walk(from: GeoPoint, to: GeoPoint): Promise<WalkingRoute | null>;
}

/**
 * OSRM con il profilo a piedi di openstreetmap.de (FOSSGIS): gratuito, senza chiave, con CORS aperto, ma a uso equo e senza garanzie, quindi buono per provare e non per molti utenti.
 * (Nel percorso dell'URL la parola "driving" è un segnaposto: quel server serve solo il profilo a piedi.)
 */
export class OsrmFootRouteService implements RouteService {
  private static readonly BASE = 'https://routing.openstreetmap.de/routed-foot/route/v1/driving';

  async walk(from: GeoPoint, to: GeoPoint): Promise<WalkingRoute | null> {
    try {
      const url = `${OsrmFootRouteService.BASE}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = (await res.json()) as { code?: string; routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[] };
      const route = data.code === 'Ok' ? data.routes?.[0] : undefined;
      if (!route || !Array.isArray(route.geometry?.coordinates) || route.geometry.coordinates.length < 2) return null;
      return { coordinates: route.geometry.coordinates, distanceM: route.distance, durationS: route.duration };
    } catch {
      return null; // rete assente o servizio giù: niente percorso, il resto della mappa funziona lo stesso
    }
  }
}

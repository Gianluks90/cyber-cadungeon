/** Il luogo pubblico su cui il giocatore ha fissato il suo ritrovo. */
export interface HangoutPlace {
  /** Il nome del luogo, se ne ha uno (molti oggetti pubblici, come le fontanelle, non ce l'hanno). */
  name: string | null;
  /** Il tipo di luogo nei dati della mappa (`library`, `fountain`…). */
  kind: string;
  lng: number;
  lat: number;
}

/**
 * Il ritrovo del giocatore: il luogo pubblico di partenza e l'area che ne deriva, fatta di edifici. Gli edifici sono riconosciuti dall'identificativo che hanno nei dati della
 * mappa; la loro forma non si salva, si rilegge dai tasselli. Come gli altri stati del giocatore, oggi sta nel localStorage e poi andrà su Firestore, sempre dietro questa interfaccia.
 */
export interface Hangout {
  place: HangoutPlace;
  buildings: number[];
}

export interface HangoutStore {
  /** Il ritrovo salvato, o null se il giocatore non ne ha. */
  get(): Hangout | null;
  /** Salva il ritrovo (sostituisce il precedente). Restituisce false se il browser non lascia scrivere. */
  save(hangout: Hangout): boolean;
  /** Toglie il ritrovo e tutta la sua area. */
  clear(): void;
}

const KEY = 'cad-hangout';

export class LocalHangoutStore implements HangoutStore {
  get(): Hangout | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as Partial<Hangout> | null;
      const p = data?.place;
      if (!p || typeof p.kind !== 'string' || typeof p.lng !== 'number' || typeof p.lat !== 'number' || !Array.isArray(data?.buildings)) return null;
      return {
        place: { name: typeof p.name === 'string' ? p.name : null, kind: p.kind, lng: p.lng, lat: p.lat },
        buildings: data.buildings.filter((id): id is number => typeof id === 'number'),
      };
    } catch {
      return null; // niente storage o dati rovinati: nessun ritrovo
    }
  }

  save(hangout: Hangout): boolean {
    try {
      localStorage.setItem(KEY, JSON.stringify(hangout));
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // niente storage: niente da cancellare
    }
  }
}

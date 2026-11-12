/**
 * Quali contratti il giocatore ha sbloccato. È lo stato del giocatore (docs/DESIGN-MOD-CONTRATTI.md, §2.7b), separato dal contratto: oggi il localStorage, poi Firestore,
 * sempre dietro questa interfaccia. Un contratto sbloccato resta del giocatore.
 */
export interface UnlockStore {
  /** Gli id dei contratti sbloccati. */
  unlocked(): ReadonlySet<string>;
  /** Sblocca un contratto (se non lo era già). Restituisce false se il browser non lascia scrivere. */
  unlock(id: string): boolean;
  /** Dimentica tutti gli sblocchi (per ricominciare da capo in sviluppo). */
  clear(): void;
}

const KEY = 'cad-contracts-unlocked';

export class LocalUnlockStore implements UnlockStore {
  unlocked(): ReadonlySet<string> {
    try {
      const raw = localStorage.getItem(KEY);
      const ids: unknown = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []);
    } catch {
      return new Set(); // niente storage o dati rovinati: tutto bloccato
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // niente storage: niente da cancellare
    }
  }

  unlock(id: string): boolean {
    try {
      localStorage.setItem(KEY, JSON.stringify([...new Set([...this.unlocked(), id])]));
      return true;
    } catch {
      return false;
    }
  }
}

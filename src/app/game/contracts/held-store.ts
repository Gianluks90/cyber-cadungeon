/**
 * I contratti che il giocatore ha accettato e tiene con sé (al massimo `CONTRACT_SLOTS`). È lo stato del giocatore (docs/DESIGN-MOD-CONTRATTI.md, §2.7b), separato dal contratto e dallo
 * sblocco: oggi il localStorage, poi Firestore, sempre dietro questa interfaccia.
 */
export interface HeldStore {
  /** Gli id dei contratti accettati, nell'ordine in cui sono stati presi. */
  held(): readonly string[];
  /** Mette un contratto fra quelli accettati (se non c'era già). Restituisce false se il browser non lascia scrivere. */
  add(id: string): boolean;
  /** Toglie un contratto da quelli accettati (annullarlo): il posto torna libero. Restituisce false se il browser non lascia scrivere. */
  remove(id: string): boolean;
}

const KEY = 'cad-contracts-held';

export class LocalHeldStore implements HeldStore {
  held(): readonly string[] {
    try {
      const raw = localStorage.getItem(KEY);
      const ids: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(ids) ? [...new Set(ids.filter((x): x is string => typeof x === 'string'))] : [];
    } catch {
      return []; // niente storage o dati rovinati: nessun contratto
    }
  }

  remove(id: string): boolean {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.held().filter((x) => x !== id)));
      return true;
    } catch {
      return false;
    }
  }

  add(id: string): boolean {
    try {
      localStorage.setItem(KEY, JSON.stringify([...new Set([...this.held(), id])]));
      return true;
    } catch {
      return false;
    }
  }
}

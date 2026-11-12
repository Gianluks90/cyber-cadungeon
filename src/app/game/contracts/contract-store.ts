import type { Contract, ContractIndex } from './contract';

/** Dove si trovano i contratti: oggi un file in `public/contracts/`, domani Firestore (CLAUDE.md, "Stack": sempre dietro un'interfaccia). */
export interface ContractStore {
  /** Tutte le intestazioni, in ordine di numero. Se il file manca o è rovinato, elenco vuoto. */
  list(): Promise<Contract[]>;
  get(id: string): Promise<Contract | null>;
}

export class JsonContractStore implements ContractStore {
  private cache: Promise<Contract[]> | null = null;

  list(): Promise<Contract[]> {
    this.cache ??= this.load();
    return this.cache;
  }

  async get(id: string): Promise<Contract | null> {
    return (await this.list()).find((c) => c.id === id) ?? null;
  }

  private async load(): Promise<Contract[]> {
    try {
      const res = await fetch('contracts/index.json');
      if (!res.ok) throw new Error(String(res.status));
      const { contracts }: ContractIndex = await res.json();
      return contracts.filter(isContract).filter((c) => c.visibility === 'visible').sort((a, b) => a.number - b.number);
    } catch {
      console.warn('Elenco dei contratti non trovato');
      this.cache = null; // al prossimo giro si riprova
      return [];
    }
  }
}

function isContract(c: Contract): boolean {
  const ok = !!c && typeof c.id === 'string' && typeof c.number === 'number' && typeof c.title === 'string' && typeof c.mapId === 'string' && Number.isFinite(c.lng) && Number.isFinite(c.lat);
  if (!ok) console.warn('Contratto non valido, saltato', c);
  return ok;
}

import { localizeName } from '../../i18n/catalog-text';
import { AttackType, DieColor } from '../items/item';

/** I valori di un mostro in una delle sue due versioni (la sezione beige e quella rossa della carta). */
export interface MonsterTier {
  /** Le ferite per scaglione di giocatori (eroi + il Maligno): "2-3", "4" o "5". */
  wounds: Record<PlayersKey, number>;
  speed: number;
  armor: number;
  /** I dadi d'attacco, per colore (il nero è il dado competenza). */
  dice: DieColor[];
  /** Abilità speciali, a parole (Perforare 1, Veleno, Aura...). Perforare, +Gittata, +danno, Veleno, Ragnatela, Stordire, Bruciare, Aura, Paura e Presa hanno effetto; Immortale pure. */
  abilities: string[];
  /** A cosa è immune: `burn`, `web`, `stun`, `poison`, `aura`, `fear`, `grip`, `knockback`. */
  immune?: string[];
  /** Armatura digitale contro l'Intrusione (v2, docs/NEMICI.md §2b). Per ora solo dato: il motore non la legge ancora. */
  ice?: number;
  /** Raggio in caselle con cui nota i Mercenari (v2). Per ora solo dato. */
  vigilance?: number;
}

/** Lo scaglione della carta: 2-3, 4 o 5 giocatori (il Maligno conta come giocatore). */
export type PlayersKey = '2-3' | '4' | '5';

/** Un mostro del catalogo (public/monsters/catalog.json). Si aggiungono mostri solo aggiungendo voci al file. */
export interface MonsterDef {
  id: string;
  name: string;
  /** Il percorso delle immagini senza estensione: `<image>-token.webp` per la pedina e `<image>-portrait.webp` per la scheda. */
  image: string;
  /** Le caselle che occupa (1×1, 1×2, 2×2 o 2×3). */
  size: { w: number; h: number };
  /** Un mostro fa un solo tipo di attacco. */
  attack: AttackType;
  /** Famiglia (v2): `humanoid` o `machine`. Per ora solo dato. */
  family?: 'humanoid' | 'machine';
  /** Gittata fissa in caselle (v2: non viene più dai dadi). Per ora solo dato: il motore usa ancora quella dei dadi. */
  range?: number;
  /**
   * Quante miniature ci sono nella scatola, normali e potenziate (docs/cards/monsters-count.md). Vale solo per il piazzamento (le evocazioni): quelli già in mappa
   * possono eccedere per le regole speciali di un'avventura. Senza, nessun limite (il Mimic è legato a una carta).
   */
  limit?: { normal: number; enhanced: number };
  normal: MonsterTier;
  /** La versione potenziata (la sezione rossa della carta). */
  enhanced: MonsterTier;
}

/** Lo scaglione da usare con questo numero di eroi: i giocatori sono gli eroi più il Maligno. */
export function playersKey(mercenaries: number): PlayersKey {
  const players = mercenaries + 1;
  return players <= 3 ? '2-3' : players === 4 ? '4' : '5';
}

/** Carica il catalogo dei mostri: un solo file, public/monsters/catalog.json (`{ monsters: [...] }`). Se manca, è vuoto. */
export async function loadMonsterCatalog(): Promise<Map<string, MonsterDef>> {
  const monsters = new Map<string, MonsterDef>();
  try {
    const res = await fetch('monsters/catalog.json');
    if (!res.ok) return monsters;
    const file: { monsters: MonsterDef[] } = await res.json();
    for (const m of file.monsters) monsters.set(m.id, localizeName('monster', m));
  } catch {
    console.warn('Catalogo dei mostri non trovato');
  }
  return monsters;
}

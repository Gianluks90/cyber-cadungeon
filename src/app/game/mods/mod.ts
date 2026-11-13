import { localizeName } from '../../i18n/catalog-text';
import { SELL_STEP_COINS } from '../constants';
import type { AttackType, ItemDef } from '../items/item';
import type { SkillEffect } from '../skills/skill';
/** In che tipo di oggetto va la mod: arma, armatura-cromo o cyberdeck (docs/DESIGN-MOD-CONTRATTI.md, §2.1). */
export type ModSlot = 'weapon' | 'armor' | 'deck';

export const MOD_SLOTS: readonly ModSlot[] = ['weapon', 'armor', 'deck'];

/** Le fasce delle mod: la base del Briefing e le tre dei tesori in partita. */
export type ModTier = 'base' | 'copper' | 'silver' | 'gold';

/** Si compra al Briefing? Solo le mod base. */
export function isBriefingMod(mod: { tier?: ModTier }): boolean {
  return (mod.tier ?? 'base') === 'base';
}

/** Un effetto attivo di una mod: si paga in scintille (le saette dei dadi neri), mai in Overclock. */
export interface ModActive {
  sparks: number;
  /** A parole, come gli effetti a scintille degli oggetti (es. "Perforare +1"). */
  effect: string;
}

/** Una mod (public/mods/catalog.json): cambia il comportamento di un oggetto, non solo i numeri. Passiva (basta l'oggetto equipaggiato), attiva (scintille) o entrambe. */
export interface ModDef {
  id: string;
  name: string;
  /** In che tipo di oggetto si monta. */
  slot: ModSlot;
  /** Le categorie della mod (es. `hacking`): un oggetto con `modTags` accetta solo le mod che ne hanno una. */
  tags?: string[];
  /** I tipi di attacco dell'oggetto che la accettano (es. `melee`): se manca va bene ogni oggetto di quel tipo (arma, armatura o deck), così cambiando oggetto la mod resta valida. */
  attack?: AttackType[];
  /** Gli id degli oggetti che la accettano, solo per i casi rari: di norma si usa `attack`. */
  compatible?: string[];
  /**
   * La fascia di rarità (docs/DESIGN-MOD-CONTRATTI.md, §2.8). Senza, è `base`: l'unica che si compra al Briefing. Rame, argento e oro (legacy: tesori da 250/500/750) si vendono solo
   * ai terminali in partita, dopo aver trovato in mappa una cassa di quella fascia.
   */
  tier?: ModTier;
  /** Quante unità ha il negozio per squadra; senza, nessun limite. Solo per le mod base (1-2). Non ancora applicato dal Briefing. */
  stock?: number;
  /** Il prezzo in eurodollari: al Briefing per le mod base, ai terminali per le altre fasce. */
  cost: number;
  /** Cosa fa, in breve. */
  text: string;
  /** Effetti passivi: `rules` è il testo che si mostra ("Perforare 1"), `effects` è ciò che legge il combattimento (vocabolario delle carte abilità: `attack`, `stat`; un `attack` può avere `pierce`), `ice` è l'ICE in più. */
  passive?: { rules?: string[]; effects?: SkillEffect[]; ice?: number };
  /** Effetti attivi a scintille (sotto-passo 4). */
  active?: ModActive[];
}

/** Gli slot per le mod di un oggetto base (`ItemDef.slots`) nel prototipo. */
export const BASE_MOD_SLOTS = 2;

/** Carica il catalogo delle mod: un solo file, public/mods/catalog.json (`{ mods: [...] }`). Se manca, è vuoto. */
export async function loadModCatalog(): Promise<Map<string, ModDef>> {
  const mods = new Map<string, ModDef>();
  try {
    const res = await fetch('mods/catalog.json');
    if (!res.ok) return mods;
    const file: { mods: ModDef[] } = await res.json();
    for (const m of file.mods) mods.set(m.id, localizeName('mod', m));
  } catch {
    console.warn('Catalogo delle mod non trovato');
  }
  return mods;
}

/**
 * Le mod scelte nel Briefing, per oggetto portato: la chiave è quella dell'oggetto (`itemKeys`), il valore gli id delle mod, al massimo `slots` per oggetto.
 * Le mod stanno sull'oggetto, non sulla categoria: un'arma nello zaino si può moddare ed equipaggiare dopo.
 */
export type ModLoadout = Record<string, string[]>;

/** Una chiave per ogni oggetto portato, nell'ordine dato: l'id la prima volta e `id#2`, `id#3`… per le copie (due oggetti uguali hanno mod diverse). */
export function itemKeys(ids: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return ids.map((id) => {
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    return n === 1 ? id : `${id}#${n}`;
  });
}

/** Quanto costano in tutto le mod scelte (quelle sconosciute non contano). */
export function modsCost(mods: ModLoadout | undefined, catalog: ReadonlyMap<string, ModDef>): number {
  return Object.values(mods ?? {}).flat().reduce((n, id) => n + (catalog.get(id)?.cost ?? 0), 0);
}

/** Le mod scelte sono valide? `carried` sono gli oggetti portati per chiave (`itemKeys`): ognuno con abbastanza slot, mod compatibili e senza doppioni, costo entro il budget. */
export function validMods(mods: ModLoadout | undefined, catalog: ReadonlyMap<string, ModDef>, carried: ReadonlyMap<string, ModItem>, budget: number): boolean {
  if (mods === undefined) return true;
  if (typeof mods !== 'object' || mods === null) return false;
  let cost = 0;
  for (const [key, ids] of Object.entries(mods)) {
    if (!Array.isArray(ids)) return false;
    const base = carried.get(key);
    if (!base || ids.length > (base.slots ?? 0) || new Set(ids).size !== ids.length) return false;
    for (const id of ids) {
      const mod = catalog.get(id);
      if (!mod || !isBriefingMod(mod) || !modFits(mod, base)) return false;
      cost += mod.cost;
    }
  }
  return cost <= budget;
}

/**
 * Gli effetti passivi delle mod scelte, nel vocabolario delle carte abilità (`state/effects.ts`), ognuno col nome della mod (`name`: chi lo dà, per le finestre).
 * Si risolvono a inizio partita e restano sulla pedina (`Piece.mercenaryEffects`), così non serve il catalogo delle mod durante la partita.
 * L'ICE di una mod diventa un bonus `stat` "ice", che vale contro l'Intrusione.
 */
export function passiveEffects(mods: ModLoadout | undefined, catalog: ReadonlyMap<string, ModDef>): SkillEffect[] {
  const out: SkillEffect[] = [];
  for (const id of Object.values(mods ?? {}).flat()) {
    const mod = catalog.get(id);
    if (!mod?.passive) continue;
    for (const e of mod.passive.effects ?? []) out.push({ ...e, name: mod.name });
    if (mod.passive.ice) out.push({ kind: 'stat', stat: 'ice', amount: mod.passive.ice, name: mod.name });
  }
  return out;
}

/**
 * Le scintille attive di queste mod, come le scintille di un'arma (costo ed effetto a parole): si pagano negli attacchi con l'oggetto su cui stanno. Le mod del deck non hanno scintille: il Driver Berserk è passivo (erserkDuration).
 */
export function activeSparks(mods: ModLoadout | undefined, catalog: ReadonlyMap<string, ModDef>): { cost: number; effect: string }[] {
  return Object.values(mods ?? {}).flat().flatMap((id) => (catalog.get(id)?.active ?? []).map((a) => ({ cost: a.sparks, effect: a.effect })));
}

/** Quanto una mod aggiunge al prezzo di vendita in città dell'oggetto su cui sta: metà del suo costo, arrotondata al multiplo di `SELL_STEP_COINS` più vicino. */
export function modSalePrice(cost: number): number {
  return Math.round(cost / 2 / SELL_STEP_COINS) * SELL_STEP_COINS;
}

/**
 * Il riferimento a un oggetto con le sue mod: l'id e gli id delle mod, per esempio `voss-sr90+vibro-edge`. Senza mod è l'id dell'oggetto. È l'id con cui l'oggetto moddato sta
 * nel catalogo della partita (`registerModdedItems`), quindi nell'equipaggiamento, nello zaino, a terra e nei salvataggi: le mod seguono l'oggetto ovunque vada.
 */
export function moddedRef(itemId: string, modIds: readonly string[]): string {
  return modIds.length ? [itemId, ...modIds].join('+') : itemId;
}

/** Per ogni oggetto portato con mod (chiave di `itemKeys`), il riferimento dell'oggetto moddato. */
export function moddedRefs(mods: ModLoadout | undefined): Record<string, string> {
  return Object.fromEntries(Object.entries(mods ?? {}).filter(([, ids]) => ids.length).map(([key, ids]) => [key, moddedRef(key.split('#')[0], ids)]));
}

/**
 * L'oggetto `base` con le mod `modIds` montate, come oggetto a sé (`id` = `moddedRef`): gli effetti passivi delle mod entrano negli effetti dell'oggetto (i bonus d'attacco sono
 * `itemBound`: valgono solo attaccando con lui) e le scintille attive si aggiungono in coda alle sue. Il testo delle regole non cambia (altrimenti "Perforare" si conterebbe due volte).
 */
export function moddedItem(base: ItemDef, modIds: readonly string[], catalog: ReadonlyMap<string, ModDef>): ItemDef {
  const known = modIds.filter((id) => catalog.has(id));
  const modsSaleValue = known.reduce((n, id) => n + modSalePrice(catalog.get(id)!.cost), 0);
  const effects = [...(base.effects ?? []), ...passiveEffects({ [base.id]: known }, catalog).map((e) => ({ ...e, itemBound: true }))];
  const spark = [...(base.spark ?? []), ...activeSparks({ [base.id]: known }, catalog)];
  return { ...base, id: moddedRef(base.id, known), moddedFrom: base.id, mods: known.map((id) => ({ id, name: catalog.get(id)!.name, text: catalog.get(id)!.text })), modsSaleValue, ...(effects.length ? { effects } : {}), ...(spark.length ? { spark } : {}) };
}

/** Mette nel catalogo `items` gli oggetti moddati di questi riferimenti (`id+mod+mod`), se non ci sono già. Un riferimento che non si capisce (oggetto o mod sconosciuti) si salta. */
export function registerModdedItems(items: Map<string, ItemDef>, catalog: ReadonlyMap<string, ModDef>, refs: Iterable<string>): void {
  for (const ref of refs) {
    if (items.has(ref)) continue;
    const [itemId, ...modIds] = ref.split('+');
    const base = items.get(itemId);
    if (base && modIds.length && modIds.every((id) => catalog.has(id))) items.set(ref, moddedItem(base, modIds, catalog));
  }
}

/** I riferimenti a oggetti moddati che compaiono in un testo (per esempio un salvataggio in JSON): così si ricostruiscono prima di riprendere la partita. */
export function moddedRefsIn(text: string): string[] {
  return [...new Set([...text.matchAll(/"([a-z0-9-]+(?:\+[a-z0-9-]+)+)"/g)].map((m) => m[1]))];
}

/** Un oggetto come lo vedono le mod: l'id, il tipo (arma, armatura, deck), il tipo di attacco, gli slot e le categorie di mod che accetta. */
export type ModItem = Pick<ItemDef, 'id' | 'kind' | 'attack' | 'slots' | 'modTags'>;

/** In che slot di mod va l'oggetto: le armi in `weapon`, le armature in `armor`, i cyberdeck in `deck`; scudi e altro non hanno mod. */
export function modSlotOf(item: Pick<ItemDef, 'kind'>): ModSlot | null {
  return item.kind === 'weapon' ? 'weapon' : item.kind === 'armor' ? 'armor' : item.kind === 'deck' ? 'deck' : null;
}

/**
 * La mod `mod` si può montare su `item`? Serve che il tipo corrisponda (arma, armatura, deck), che il tipo di attacco sia ammesso se la mod lo elenca (`attack`),
 * che l'oggetto ci sia se la mod ha un elenco di id e che la categoria sia ammessa se l'oggetto ne chiede una (`modTags`).
 */
export function modFits(mod: ModDef, item: ModItem): boolean {
  if (mod.slot !== modSlotOf(item)) return false;
  if (mod.attack && !(item.attack && mod.attack.includes(item.attack))) return false;
  if (mod.compatible && !mod.compatible.includes(item.id)) return false;
  return !item.modTags || item.modTags.some((t) => mod.tags?.includes(t));
}

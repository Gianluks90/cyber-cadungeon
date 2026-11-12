import { localizeName } from '../../i18n/catalog-text';
import type { SkillEffect } from '../skills/skill';
/** In che tipo di oggetto va la mod: arma, armatura-cromo o cyberdeck (docs/DESIGN-MOD-CONTRATTI.md, §2.1). */
export type ModSlot = 'weapon' | 'armor' | 'deck';

export const MOD_SLOTS: readonly ModSlot[] = ['weapon', 'armor', 'deck'];

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
  /** Gli id degli oggetti base che la accettano; se manca va bene ogni oggetto di quel tipo. */
  compatible?: string[];
  /** Il prezzo in eurodollari (il budget del Briefing). */
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

/** Le mod scelte nel Briefing, per tipo di oggetto: gli id, al massimo `slots` per oggetto. */
export type ModLoadout = Partial<Record<ModSlot, string[]>>;

/**
 * Gli oggetti base di ogni mercenario, provvisori: nel prototipo (un Picchiatore) sono uguali per tutti. Quando i mercenari avranno l'equipaggiamento di base
 * per archetipo (§2.1) questo passa nella scheda.
 */
export const BASE_KIT: Readonly<Record<ModSlot, string>> = { weapon: 'mono-blade', armor: 'ballistic-vest', deck: 'street-deck' };

/** Quanto costano in tutto le mod scelte (quelle sconosciute non contano). */
export function modsCost(mods: ModLoadout | undefined, catalog: ReadonlyMap<string, ModDef>): number {
  return Object.values(mods ?? {}).flat().reduce((n, id) => n + (catalog.get(id)?.cost ?? 0), 0);
}

/** Le mod scelte sono valide? Oggetto base con abbastanza slot, mod compatibili e senza doppioni, costo entro il budget. */
export function validMods(mods: ModLoadout | undefined, catalog: ReadonlyMap<string, ModDef>, items: ReadonlyMap<string, { id: string; slots?: number }>, budget: number): boolean {
  if (mods === undefined) return true;
  if (typeof mods !== 'object' || mods === null) return false;
  let cost = 0;
  for (const [slot, ids] of Object.entries(mods)) {
    if (!MOD_SLOTS.includes(slot as ModSlot) || !Array.isArray(ids)) return false;
    const base = items.get(BASE_KIT[slot as ModSlot]);
    if (!base || ids.length > (base.slots ?? 0) || new Set(ids).size !== ids.length) return false;
    for (const id of ids) {
      const mod = catalog.get(id);
      if (!mod || !modFits(mod, base, slot as ModSlot)) return false;
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
 * Le scintille attive delle mod dell'arma, come le scintille di un'arma (costo ed effetto a parole). Le mod del deck non hanno scintille: il Driver Berserk è passivo (erserkDuration).
 */
export function activeSparks(mods: ModLoadout | undefined, catalog: ReadonlyMap<string, ModDef>): { cost: number; effect: string }[] {
  return (mods?.weapon ?? []).flatMap((id) => (catalog.get(id)?.active ?? []).map((a) => ({ cost: a.sparks, effect: a.effect })));
}

/** La mod `mod` si può montare su `item` (un oggetto base con gli slot)? Serve che il tipo corrisponda e, se la mod ha un elenco, che l'oggetto ci sia. */
export function modFits(mod: ModDef, item: { id: string }, itemSlot: ModSlot): boolean {
  return mod.slot === itemSlot && (!mod.compatible || mod.compatible.includes(item.id));
}

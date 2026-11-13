import { ChestTier, PotionKind } from '../board/marker';
import { ModDef, ModLoadout, itemKeys, loadModCatalog, modFits, modsCost, validMods } from '../mods/mod';
import { BACKPACK_LIMIT, BRIEFING_BUDGET, POTION_LIMIT, POTION_PRICES, TREASURE_PRICES } from '../constants';
import type { AdventureSetup } from '../map/map-data';
import { SKILL_SCHOOLS, SkillSchool } from '../skills/skill';
import { StartingSkills } from './mercenary-sheet';
import { ItemDef, loadItemCatalog, loadShopStock, placeGear } from '../items/item';

/** Ciò che un eroe ha comprato prima di partire: oggetti (id del catalogo) e pozioni. Le monete rimaste sono 300 meno il costo. */
export interface Loadout {
  items: string[];
  potions: PotionKind[];
  /** I tesori comprati (uno per carta, del tipo del mazzo): la carta si pesca dal mazzo vero quando la partita comincia. Solo se l'avventura li vende in preparazione. */
  treasures?: ChestTier[];
  /** Le mod del Briefing, per oggetto portato (chiavi di `carriedItems`). Si pagano con il budget del Briefing, non con le monete. */
  mods?: ModLoadout;
  /** Gli id della fornitura iniziale (`MercenarySheet.startingGear`) venduti in preparazione: non partono equipaggiati e il loro valore di vendita torna al budget. */
  soldGear?: string[];
}

/** Le chiavi di traduzione dei nomi dei tesori comprabili in preparazione. */
export const TREASURE_KEYS = { copper: 'shop.treasureCopper', silver: 'shop.treasureSilver', gold: 'shop.treasureGold' } as const;

export const emptyLoadout = (): Loadout => ({ items: [], potions: [] });

/** Il negozio di prima della partita: il catalogo degli oggetti e le copie in vendita (comuni a tutti gli eroi della squadra). */
export interface ShopData {
  items: ReadonlyMap<string, ItemDef>;
  stock: Readonly<Record<string, number>>;
  /** I tipi di tesoro in vendita in preparazione (variante dell'avventura, `AdventureSetup.pregameTreasures`). */
  treasureTiers: readonly ChestTier[];
  /** Il catalogo delle mod e il budget in eurodollari del Briefing. */
  mods: ReadonlyMap<string, ModDef>;
  budget: number;
}

export async function loadPregameShop(setup?: AdventureSetup): Promise<ShopData> {
  const [items, stock, mods] = await Promise.all([loadItemCatalog(), loadShopStock('briefing'), loadModCatalog()]);
  return { items, stock, treasureTiers: setup?.pregameTreasures ?? [], mods, budget: briefingBudget(setup) };
}

/** Il budget del Briefing: quello dell'avventura, o `BRIEFING_BUDGET`. */
export function briefingBudget(setup?: AdventureSetup): number {
  return Math.max(0, setup?.budget ?? BRIEFING_BUDGET);
}

/** La variante di preparazione di un'avventura, letta dal file della mappa (vuota se manca o non si legge). */
export async function loadAdventureSetup(map: string): Promise<AdventureSetup> {
  try {
    const res = await fetch(new URL(`maps/${map}.json`, document.baseURI));
    if (!res.ok) return {};
    return ((await res.json()) as { setup?: AdventureSetup }).setup ?? {};
  } catch {
    return {};
  }
}

/** Le monete di un eroe in preparazione: quelle della scheda più il bonus dell'avventura (anche negativo), mai sotto 0. */
export function coinsWithSetup(base: number, setup?: AdventureSetup): number {
  return Math.max(0, base + (setup?.extraCoins ?? 0));
}

/** Posti per i tesori: uno zaino ha BACKPACK_LIMIT posti e ogni tesoro, senza sapere quale carta uscirà, ne occupa uno nel caso peggiore. */
export function treasureRoom(l: Loadout, shop: ShopData, startingGear: readonly string[]): boolean {
  const placed = placeItems(l.items, shop, startingKit(startingGear, l, shop));
  return !!placed && placed.backpack.length + (l.treasures?.length ?? 0) < BACKPACK_LIMIT;
}

/** Quanto costa tutto ciò che c'è nel `loadout`. */
export function loadoutCost(l: Loadout, shop: ShopData): number {
  return l.items.reduce((n, id) => n + (shop.items.get(id)?.price ?? 0), 0) + l.potions.reduce((n, k) => n + POTION_PRICES[k], 0) + (l.treasures ?? []).reduce((n, t) => n + TREASURE_PRICES[t], 0);
}

/** Le copie ancora in vendita, tolte quelle già comprate da tutti gli `loadouts`. */
export function stockLeft(shop: ShopData, loadouts: readonly Loadout[]): Record<string, number> {
  const left: Record<string, number> = { ...shop.stock };
  for (const l of loadouts) for (const id of l.items) if (id in left) left[id] -= 1;
  return left;
}

/** Le copie ancora in vendita delle mod con una scorta (`ModDef.stock`), tolte quelle già montate da tutti gli `loadouts`. Le mod senza scorta non compaiono: non hanno limite. */
export function modStockLeft(shop: ShopData, loadouts: readonly Loadout[]): Record<string, number> {
  const left: Record<string, number> = {};
  for (const m of shop.mods.values()) if (m.stock !== undefined) left[m.id] = m.stock;
  for (const l of loadouts) for (const id of Object.values(l.mods ?? {}).flat()) if (id in left) left[id] -= 1;
  return left;
}

/** Quanto vale in E$ vendere un oggetto della fornitura iniziale: metà del suo prezzo, arrotondata al multiplo di 25 più vicino, almeno 25. */
export function gearSalePrice(price: number): number {
  return Math.max(25, Math.round(price / 2 / 25) * 25);
}

/** Gli oggetti della fornitura iniziale che l'eroe ha ancora (non venduti), come schede; quelli che non sono nel catalogo si saltano. */
export function startingKit(startingGear: readonly string[], l: Loadout, shop: ShopData): ItemDef[] {
  const sold = new Set(l.soldGear ?? []);
  return startingGear.filter((id) => !sold.has(id)).flatMap((id) => shop.items.get(id) ?? []);
}

/** Quanti E$ ha ricavato vendendo parte della fornitura iniziale. */
export function gearSales(startingGear: readonly string[], l: Loadout, shop: ShopData): number {
  return startingGear.filter((id) => (l.soldGear ?? []).includes(id)).reduce((n, id) => n + gearSalePrice(shop.items.get(id)?.price ?? 0), 0);
}

/** Il budget che resta: un solo conto per mod, oggetti, consumabili e tesori, più quanto si è ricavato vendendo la fornitura iniziale. */
export function budgetLeft(startingGear: readonly string[], l: Loadout, shop: ShopData): number {
  return shop.budget - modsCost(l.mods, shop.mods) - loadoutCost(l, shop) + gearSales(startingGear, l, shop);
}

/** Gli oggetti che il mercenario porta in partenza, nell'ordine: la fornitura iniziale non venduta e poi ciò che ha comprato. `key` è la chiave dell'oggetto (per le mod: `itemKeys`). */
export function carriedItems(startingGear: readonly string[], l: Loadout, shop: ShopData): { key: string; def: ItemDef }[] {
  const defs = [...startingKit(startingGear, l, shop), ...l.items.flatMap((id) => shop.items.get(id) ?? [])];
  const keys = itemKeys(defs.map((d) => d.id));
  return defs.map((def, i) => ({ key: keys[i], def }));
}

/** Le schede degli oggetti equipaggiati in partenza: la fornitura e poi gli acquisti, ognuno equipaggiato finché ci sta (mani, armatura, deck…); il resto va nello zaino. */
export function equippedDefs(l: Loadout, shop: ShopData, startingGear: readonly string[]): ItemDef[] {
  return placeGear(carriedItems(startingGear, l, shop)).equipped.map((e) => e.def);
}

/**
 * Dove va ciò che si compra dopo la fornitura `kit`: si equipaggia se ci sta, altrimenti nello zaino (BACKPACK_LIMIT posti). Null se qualcosa non è nel catalogo, non si può portare
 * o nello zaino non c'è posto.
 */
export function placeItems(ids: readonly string[], shop: ShopData, kit: readonly ItemDef[] = []): { equipped: string[]; backpack: string[] } | null {
  const bought: ItemDef[] = [];
  for (const id of ids) {
    const def = shop.items.get(id);
    if (!def || def.carried) return null;
    bought.push(def);
  }
  const placed = placeGear([...kit, ...bought].map((def) => ({ def })));
  if (placed.backpack.length > BACKPACK_LIMIT) return null;
  return { equipped: placed.equipped.map((e) => e.def.id), backpack: placed.backpack.map((e) => e.def.id) };
}

/** Toglie le mod che non stanno più sull'oggetto: oggetto venduto o rimborsato, mod non più compatibile o slot in meno. Il loro prezzo torna al budget da solo (si paga solo ciò che resta). */
export function pruneMods(l: Loadout, startingGear: readonly string[], shop: ShopData): Loadout {
  if (!l.mods) return l;
  const carried = new Map(carriedItems(startingGear, l, shop).map((c) => [c.key, c.def]));
  const mods: ModLoadout = {};
  for (const [key, ids] of Object.entries(l.mods)) {
    const def = carried.get(key);
    if (!def) continue;
    const kept = ids.filter((id) => { const m = shop.mods.get(id); return !!m && modFits(m, def); }).slice(0, def.slots ?? 0);
    if (kept.length) mods[key] = kept;
  }
  return { ...l, mods };
}

/** Il `loadout` è valido? Oggetti in vendita, copie sufficienti (`others`: ciò che hanno già comprato gli altri eroi), pozioni nei limiti, posto per tutto e budget sufficiente (contando le vendite). */
export function validLoadout(l: Loadout, startingGear: readonly string[], shop: ShopData, others: readonly Loadout[]): boolean {
  if (!Array.isArray(l?.items) || !Array.isArray(l?.potions)) return false;
  const sold = l.soldGear ?? [];
  if (!Array.isArray(sold) || new Set(sold).size !== sold.length || sold.some((id) => !startingGear.includes(id))) return false;
  if (l.potions.length > POTION_LIMIT || l.potions.some((k) => !(k in POTION_PRICES))) return false;
  const treasures = l.treasures ?? [];
  if (!Array.isArray(treasures) || treasures.some((t) => !shop.treasureTiers.includes(t))) return false;
  const kit = startingKit(startingGear, l, shop);
  if (treasures.length && (placeItems(l.items, shop, kit)?.backpack.length ?? BACKPACK_LIMIT) + treasures.length > BACKPACK_LIMIT) return false;
  const left = stockLeft(shop, others);
  for (const id of l.items) {
    if (!(id in left) || !shop.items.has(id) || left[id] <= 0) return false;
    left[id] -= 1;
  }
  if (!validMods(l.mods, shop.mods, new Map(carriedItems(startingGear, l, shop).map((c) => [c.key, c.def])), shop.budget)) return false;
  if (Object.values(modStockLeft(shop, [...others, l])).some((n) => n < 0)) return false;
  return !!placeItems(l.items, shop, kit) && budgetLeft(startingGear, l, shop) >= 0;
}

/** I dati passati dalla scelta degli eroi alla partita: per ogni eroe ciò che ha comprato e le monete che gli restano. */
export type PartySetup = Record<string, Loadout & { coins: number; skillCards: string[] }>;

/** Una carta abilità del mazzo, per pescare. */
export interface SkillPoolCard {
  id: string;
  school: SkillSchool;
}

/** Assegna a un eroe le sue carte abilità secondarie: una a caso per ogni punto di attributo, dal mazzo del ramo, senza carte già date a `taken` (altri eroi della squadra). */
export function drawSkillCards(points: StartingSkills, pool: readonly SkillPoolCard[], taken: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const school of SKILL_SCHOOLS) {
    const avail = pool.filter((c) => c.school === school && !taken.has(c.id));
    for (let i = avail.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [avail[i], avail[j]] = [avail[j], avail[i]];
    }
    out.push(...avail.slice(0, points[school]).map((c) => c.id));
  }
  return out;
}

const KEY = 'cad-party-setup';

/** Passa gli acquisti alla partita che sta per aprirsi (sessionStorage: valgono per questa scheda e una volta sola). */
export const partySetupStore = {
  save(setup: PartySetup) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(setup));
    } catch {
      /* senza archivio la partita parte con la dotazione di base */
    }
  },
  /** Legge e cancella gli acquisti: un refresh della partita non li rimette. */
  take(): PartySetup {
    try {
      const raw = sessionStorage.getItem(KEY);
      sessionStorage.removeItem(KEY);
      return raw ? (JSON.parse(raw) as PartySetup) : {};
    } catch {
      return {};
    }
  },
};

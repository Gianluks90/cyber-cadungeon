import { localizeName } from '../../i18n/catalog-text';
/** Il genere di una Carta del Male (docs/cards/adversary.md). */
export type AdversaryCardKind = 'power' | 'event' | 'trap' | 'summon';

/** Chi o cosa prende di mira una trappola quando viene armata. */
export type TrapTarget = 'cell' | 'door' | 'chest' | 'hero';

/** Una carta del Mazzo del Male (public/adversary/catalog.json). */
export interface AdversaryCardDef {
  id: string;
  name: string;
  kind: AdversaryCardKind;
  /** Quante copie ci sono nel mazzo. */
  copies: number;
  /** Quanto Odio costa giocarla. */
  cost: number;
  /** Quanto Odio si prende scartandola. */
  value: number;
  /** Il testo della carta. */
  text: string;
  /** Le trappole: dove vanno armate. */
  target?: TrapTarget;
  /** Le evocazioni: quali mostri (e quanti) fanno apparire. */
  summon?: { monster: string; count: number; enhanced?: boolean }[];
  /** Vero se la carta ha già i suoi effetti nel gioco: nel mazzo entrano solo queste (le altre arrivano a poco a poco). */
  ready?: boolean;
}

/** Carica il catalogo delle Carte del Male: un solo file, public/adversary/catalog.json (`{ cards: [...] }`). Se manca, è vuoto. */
export async function loadAdversaryCatalog(): Promise<Map<string, AdversaryCardDef>> {
  const cards = new Map<string, AdversaryCardDef>();
  try {
    const res = await fetch('adversary/catalog.json');
    if (!res.ok) return cards;
    const file: { cards: AdversaryCardDef[] } = await res.json();
    for (const c of file.cards) cards.set(c.id, localizeName('adversary', c));
  } catch {
    console.warn('Catalogo delle Carte del Male non trovato');
  }
  return cards;
}

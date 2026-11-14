import { tr } from '../../i18n/catalog-text';
import type { PotionKind } from '../board/marker';
import { POTION_DRINK_COST, POTION_HEAL, POTION_PRICES } from '../constants';
import { POTION_NAMES } from '../markers/marker-rules';
import type { ItemDef } from './item';

/**
 * Il consumabile (la pozione) scritto come un oggetto: lo usano il negozio del Briefing, il catalogo e il catalogo in partita, così hanno lo stesso nome, lo stesso testo e la stessa card.
 * I valori hanno icona e colore (salute, movimento, overclock); sotto, «Uso singolo (costa 1 movimento utilizzarlo)».
 */
export function potionDef(kind: PotionKind): ItemDef {
  const mov = `{mov:${POTION_DRINK_COST}}`;
  const effect =
    kind === 'heal'
      ? tr('Recupera {potionHeal}.', { potionHeal: `{health:${POTION_HEAL}|${tr('Salute')}}` })
      : tr('Riporta l\'overclock {overclock} al massimo.');
  return { id: `potion-${kind}`, name: POTION_NAMES[kind], kind: 'other', hands: 0, price: POTION_PRICES[kind], rules: [effect, tr('Uso singolo (costa {mov} utilizzarlo).', { mov })], consumable: true };
}

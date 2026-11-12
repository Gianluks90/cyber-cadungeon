import { tr } from '../../i18n/catalog-text';
import { BERSERK_COST, BERSERK_DAMAGE, BERSERK_ICE_LOSS, BERSERK_ARMOR_LOSS, BERSERK_ROUNDS } from '../constants';
import type { Piece } from '../pieces/piece';
import type { SkillDef } from '../skills/skill';
import { canActOnMap } from './actions';
import { ruleAmount } from './effects';
import type { GameState } from './game-state';
import type { SkillAction, SkillResult } from './skills';

/**
 * Il Berserk: la funzione base del cyberdeck del Picchiatore (docs/DESIGN-MOD-CONTRATTI.md, §2.5). Si accende pagando Overclock; finché dura dà più danno in mischia
 * ma toglie Armatura e ICE (il prezzo, così non è sempre acceso). I valori sono da provare (§3). Gli effetti sul combattimento stanno dove si calcolano:
 * `attackBonus` (danno) e `armorOf` (Armatura e ICE); a inizio round `startRound` toglie un round.
 */

/** L'id con cui compare fra le abilità dell'eroe (non è una carta del catalogo). */
export const BERSERK_ID = 'deck:berserk';

export const hasBerserk = (piece: Piece): boolean => piece.deck === 'berserk';
export const berserkOn = (piece: Piece): boolean => (piece.berserk ?? 0) > 0;

/** La "carta" del Berserk per la scheda dell'eroe: stessa forma delle carte abilità, ma non sta nel catalogo (non si pesca). I testi seguono la lingua. */
export function berserkCard(): SkillDef {
  return {
    id: BERSERK_ID,
    name: tr('Berserk'),
    school: 'combat',
    text: tr('Cyberdeck. Per alcuni round hai +{damage} danno in mischia, ma perdi {loss} Armatura e {ice} ICE.', { damage: BERSERK_DAMAGE, loss: BERSERK_ARMOR_LOSS, ice: BERSERK_ICE_LOSS }),
    effects: [],
  };
}

/** Quanti round dura quando si accende: quelli base e uno in più per ogni mod che lo allunga. */
export function berserkRounds(state: GameState, piece: Piece): number {
  return BERSERK_ROUNDS + ruleAmount(state, piece, 'berserkDuration');
}

/** Il bottone del Berserk, se l'eroe ha il deck col Berserk. */
export function berserkAction(state: GameState, piece: Piece): SkillAction | null {
  if (!hasBerserk(piece)) return null;
  let reason: string | undefined;
  if (!canActOnMap(state, piece)) reason = tr('Ora non puoi');
  else if (piece.toad) reason = tr('Un rospo non usa abilità');
  else if (berserkOn(piece)) reason = tr('Il Berserk è già acceso');
  else if (piece.overclock < BERSERK_COST) reason = tr('Non hai abbastanza overclock');
  return { id: BERSERK_ID, cardId: BERSERK_ID, kind: 'trigger', cost: `{overclock:${BERSERK_COST}}`, enabled: !reason, reason };
}

/** Accende il Berserk: paga l'Overclock e parte il conto dei round. */
export function activateBerserk(state: GameState, piece: Piece): SkillResult {
  const action = berserkAction(state, piece);
  if (!action) return { ok: false, reason: tr('Non hai questa abilità') };
  if (!action.enabled) return { ok: false, reason: action.reason ?? tr('Non è possibile') };
  piece.overclock -= BERSERK_COST;
  piece.berserk = berserkRounds(state, piece);
  return { ok: true, notice: tr('Berserk acceso: +{damage} danno in mischia, −{loss} Armatura e −{ice} ICE', { damage: BERSERK_DAMAGE, loss: BERSERK_ARMOR_LOSS, ice: BERSERK_ICE_LOSS }) };
}

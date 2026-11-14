import { tr } from '../../i18n/catalog-text';
import type { AttackType } from '../items/item';
import { Piece } from '../pieces/piece';
import type { GameState } from './game-state';
import { ruleAmount } from './effects';

/**
 * Le reazioni alle ferite ricevute (docs/cards/abilities.md, sezione 8, livello 2): effetti `react` con `on: "wounds"` degli oggetti equipaggiati e dell'abilità
 * dell'eroe. Quando un attacco sta per togliere ferite a un eroe si applicano prima di toglierle: quelle automatiche tirano dei dadi (i Mantelli: un dado competenza per
 * ogni ferita, ne annullano una per faccia vuota o per scintilla), quelle a scelta (gli Scudi che si esauriscono, Pelle di corteccia di Ferdinand) vengono proposte al giocatore.
 * Valgono per le ferite degli attacchi (che l'armatura può ridurre); le ferite che la ignorano (buche, fiamme, trappole) non si possono annullare così.
 */
export interface WoundReaction {
  /** Un nome stabile: `<id oggetto>:<posizione>` o `mercenary:<posizione>` (serve per ricordare che è già usata). */
  id: string;
  name: string;
  /** Automatica (i dadi) o a scelta. */
  auto: boolean;
  /** Cosa annulla: un numero di ferite, oppure una per faccia `blank` (vuota) o `spark` (scintilla) dei dadi. */
  cancel: number | 'blank' | 'spark';
  /** Si esaurisce (fino al round dopo) quando si usa. */
  exhaust: boolean;
  /** È lo scudo di un oggetto (Ambidestro ne annulla 1 in più). */
  shield: boolean;
  /** Vale solo contro questo tipo di attacco (la mod da mischia solo contro la mischia). */
  attack?: AttackType;
  /** `competence`: si tirano i dadi competenza che l'eroe ha per quel tipo di attacco (tanti quanti ne ha); `perWound`: uno per ogni danno. */
  dice?: 'perWound' | 'competence';
}

interface ReactEffect {
  kind?: string;
  on?: string;
  name?: string;
  auto?: boolean;
  cancel?: number | 'blank' | 'spark';
  cost?: { exhaust?: boolean };
  attack?: AttackType;
  dice?: 'perWound' | 'competence';
}

/** Le reazioni alle ferite dell'eroe (di oggetti equipaggiati e dell'abilità dell'eroe). */
export function woundReactions(state: GameState, mercenary: Piece): WoundReaction[] {
  const out: WoundReaction[] = [];
  for (const itemId of mercenary.equipped) {
    const def = state.items.get(itemId);
    ((def?.effects ?? []) as ReactEffect[]).forEach((e, i) => {
      if (e.kind === 'react' && e.on === 'wounds') out.push({ id: `${itemId}:${i}`, name: def!.name, auto: !!e.auto, cancel: e.cancel ?? 1, exhaust: !!e.cost?.exhaust, shield: def!.kind === 'shield', attack: e.attack, dice: e.dice });
    });
  }
  (mercenary.mercenaryEffects as ReactEffect[] | undefined)?.forEach((e, i) => {
    if (e.kind === 'react' && e.on === 'wounds') out.push({ id: `mercenary:${i}`, name: e.name ?? tr('Abilità'), auto: !!e.auto, cancel: e.cancel ?? 1, exhaust: !!e.cost?.exhaust, shield: false, attack: e.attack, dice: e.dice });
  });
  return out;
}

/** Perché una reazione non si può usare adesso (già usata nel turno), o undefined. */
export function reactionBlock(mercenary: Piece, r: WoundReaction): string | undefined {
  return r.exhaust && mercenary.exhausted?.includes(r.id) ? tr('Già usata in questo turno') : undefined;
}

/** Quante ferite annulla una reazione a numero fisso: quelle scritte, più 1 con Ambidestro se è uno scudo. */
export function cancelAmount(state: GameState, mercenary: Piece, r: WoundReaction): number {
  if (typeof r.cancel !== 'number') return 0;
  return r.cancel + (r.shield ? ruleAmount(state, mercenary, 'shieldBlock') : 0);
}

/** La reazione è stata usata: se si esaurisce, resta tale fino al round dopo. */
export function markReactionUsed(mercenary: Piece, r: WoundReaction): void {
  if (r.exhaust) (mercenary.exhausted ??= []).push(r.id);
}

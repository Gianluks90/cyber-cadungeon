import { tr } from '../i18n/catalog-text';
import { TrPipe } from '../i18n/tr.pipe';
import { CatalogTextPipe } from '../i18n/catalog-text.pipe';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PotionKind } from '../game/board/marker';
import { AttackDice, StartingSkills } from '../game/mercenaries/mercenary-sheet';
import { InventoryView } from '../game/state/actions';
import { CityView } from '../game/state/city';
import { SkillDef } from '../game/skills/skill';
import { SkillAction } from '../game/state/skills';
import { AttackDiceComponent } from './attack-dice.component';
import { FamiliarDef } from '../game/familiars/familiar';
import { FamiliarCardComponent } from './familiar-card.component';
import { CostTextComponent } from './cost-text.component';
import { IconComponent } from './icon.component';
import { SkillCardComponent } from './skill-card.component';

/** Tutto ciò che la scheda completa di un eroe mostra. */
export interface MercenaryDetails {
  name: string;
  /** La classe (druido, ranger, ...): il sottotitolo, in maiuscolo. */
  mercenaryClass: string;
  portrait?: string;
  /** L'immagine a figura intera, per la cornice dei pannelli. */
  portraitFull?: string;
  wounds: number;
  maxWounds: number;
  overclock: number;
  armor: number;
  speed: number;
  value: number;
  /** Le pozioni che porta. */
  potions: PotionKind[];
  /** Le monete dell'eroe, e il suo inventario (oggetti equipaggiati e zaino, con ciò che si può fare): si vedono nel pannello dell'inventario. */
  coins: number;
  inventory: InventoryView;
  /** È in città (la sua pedina non è sulla mappa): allora c'è il pannello Città. */
  inCity: boolean;
  /** C'è il pannello Città: è in città e non deve ancora tornare (dal turno dopo l'arrivo il ritorno parte da solo). */
  cityPanel: boolean;
  city: CityView | null;
  dice: AttackDice;
  /** Gli stati che ha adesso, a parole ("Fiamma ×2"), e i segnalini veleno (i cuori verdi). */
  states: string[];
  poison: number;
  skills: StartingSkills;
  /** Le carte abilità secondarie che possiede (pescate a inizio partita, più quelle comprate al campo di addestramento). */
  skillCards: SkillDef[];
  /** Le abilità che si possono usare con un bottone (e se adesso si può). */
  skillActions: SkillAction[];
  /** I famigli dell'eroe. */
  familiars?: FamiliarDef[];
  ability: string;
  /** Il nome dell'abilità primaria. */
  abilityName?: string;
}

/**
 * Il pannello "Informazioni" di un eroe: parametri (cuori e salute, velocità, overclock, armatura, valore), attributi (una sezione ancora vuota:
 * le quattro caratteristiche sono in pausa, docs/REGOLE.md sezione 4), dadi d'attacco, abilità primaria (quella stampata sulla scheda) e abilità secondarie (le carte pescate). È il contenuto della cornice `app-mercenary-panel`, che gli dà posizione, altezza, immagine ed etichette; l'equipaggiamento sta
 * nel pannello dell'inventario (`app-inventory-panel`).
 */
@Component({
  selector: 'app-mercenary-sheet',
  imports: [CostTextComponent, FamiliarCardComponent, TrPipe, CatalogTextPipe, AttackDiceComponent, IconComponent, SkillCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mercenary(); as h) {
      <h3 class="first">{{ 'Parametri' | tr }}</h3>
      <div class="row stats">
        <span class="stat life" [title]="'Salute rimasta' | tr"><app-icon name="favorite" [size]="18" /><span class="v">{{ h.wounds }}<small>{{ 'Salute' | tr }}</small></span></span>
        <span class="stat speed" [title]="'Velocità: punti movimento a inizio turno' | tr"><app-icon name="footprint" [size]="18" /><span class="v">{{ h.speed }}<small>{{ 'Velocità' | tr }}</small></span></span>
        <span class="stat overclock" [title]="'Overclock' | tr"><app-icon name="speed" [size]="18" /><span class="v">{{ h.overclock }}<small>{{ 'Overclock' | tr }}</small></span></span>
        <span class="stat" [title]="'Armatura: si sottrae al danno' | tr"><app-icon name="shield" [size]="18" /><span class="v">{{ h.armor }}<small>{{ 'Armatura' | tr }}</small></span></span>
      </div>

      @if (h.states.length) {
        <h3>{{ 'Stati' | tr }}</h3>
        <p class="states">{{ h.states.join(' · ') }}</p>
      }

      <h3>{{ 'Attributi' | tr }}</h3>
      <p class="soon">{{ 'Presto disponibile' | tr }}</p>

      <h3>{{ 'Dadi competenza' | tr }}</h3>
      <app-attack-dice [dice]="h.dice" />

      @if (h.ability) {
        <h3>{{ 'Abilità primaria' | tr }}@if (h.abilityName) { <span class="aname">: {{ h.abilityName | ct }}</span> }</h3>
        <div class="ability"><app-cost-text [text]="h.ability | ct" /></div>
        <!-- Se l'abilità primaria si usa (un trigger dell'eroe), il bottone sta qui, come sulle carte abilità. -->
        @if (actionOf(h, 'mercenary'); as a) {
          <div class="useRow">
            <button type="button" class="use" [class.off]="!a.enabled" [attr.aria-disabled]="!a.enabled" [title]="a.enabled ? ('Usa questa abilità' | tr) : (a.reason ?? '')" (click)="a.enabled ? skillUse.emit(a.id) : denied.emit(a.reason ?? notPossible())">{{ 'Usa' | tr }}</button>
            @if (!a.enabled && a.reason) { <small>{{ a.reason }}</small> }
          </div>
        }
      }

      @if (h.familiars?.length) {
        <h3>{{ 'Famigli' | tr }}</h3>
        <div class="familiars">
          @for (f of h.familiars; track f.id) { <app-familiar-card [familiar]="f" /> }
        </div>
      }

      <h3>{{ 'Abilità secondarie' | tr }}</h3>
      <div class="cards">
        @for (c of h.skillCards; track c.id) { <app-skill-card [skill]="c" [action]="actionOf(h, c.id)" (use)="skillUse.emit(actionOf(h, c.id)!.id)" (denied)="denied.emit($event)" /> }
        @empty { <p class="soon">{{ 'Nessuna' | tr }}</p> }
      </div>
    }
  `,
  styles: `
    :host { counter-reset: sec; display: block; color: var(--c-text); font: 13px/1.35 var(--font-ui); }
    h3::before { counter-increment: sec; content: counter(sec, decimal-leading-zero) ' — '; color: var(--c-text-faint); }
    h3 { margin: 14px 0 6px; font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    h3.first { margin-top: 0; }
    /* I cuori a sinistra, il valore della salute a destra, e in mezzo una riga a puntini quasi invisibile: si allunga quanto serve in base ai cuori. */
    .row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 16px; }
    .row.stats { margin-top: 10px; }
    .stat { display: inline-flex; align-items: center; gap: 5px; font-variant-numeric: tabular-nums; font-weight: 600; }
    /* Numero ed etichetta sulla stessa linea di base, con un po' di spazio; l'icona resta centrata sul riquadro. */
    .stat .v { display: inline-flex; align-items: baseline; gap: 6px; }
    small { font-weight: 400; color: var(--c-text-dim); }
    .stat.life { color: var(--c-life); }
    .stat.speed { color: var(--c-move); }
    .stat.overclock { color: var(--c-overclock); }
    .cards { display: flex; flex-direction: column; gap: 6px; }
    .states { margin: 0; display: flex; flex-wrap: wrap; gap: 4px 12px; font-weight: 600; }
    .soon { margin: 0; color: var(--c-text-dim); font-size: 12px; font-style: italic; }
    .ability { margin: 0; color: var(--c-text); }
    .useRow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .useRow small { color: var(--c-text-dim); font-size: 11px; }
    .use { display: inline-flex; align-items: center; justify-content: center; padding: 7px 16px; border-radius: var(--radius-1); background: none; color: var(--c-text); cursor: pointer; border: 1px solid var(--c-line-strong); font: 13px/1.2 var(--font-ui); transition: border-color 0.15s, background-color 0.15s; }
    .use:hover:not(.off), .use:focus-visible:not(.off) { border-color: var(--c-interact); background: color-mix(in srgb, var(--c-interact) 8%, transparent); outline: none; }
    .use.off { opacity: 0.45; cursor: default; }
    .familiars { display: flex; flex-direction: column; gap: 8px; }
    /* Il nome dell'abilità accanto all'etichetta: in minuscolo e normale, nel colore del testo. */
    .aname { text-transform: none; letter-spacing: 0; font: 600 13px/1 var(--font-ui); color: var(--c-text); }
  `,
})
export class MercenarySheetComponent {
  /** L'eroe da mostrare. */
  readonly mercenary = input<MercenaryDetails | null>(null);
  /** Si usa un'abilità (l'id viene da `skillActions`). */
  readonly skillUse = output<string>();
  readonly denied = output<string>();

  /** Il motivo di riserva quando un'azione spenta non ne dà uno. */
  protected readonly notPossible = () => tr('Non è possibile');

  protected actionOf(h: MercenaryDetails, cardId: string): SkillAction | null {
    return h.skillActions.find((a) => a.cardId === cardId) ?? null;
  }
}

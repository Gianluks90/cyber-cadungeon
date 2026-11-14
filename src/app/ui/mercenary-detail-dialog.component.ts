import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MercenarySheet } from '../game/mercenaries/mercenary-sheet';
import { SKILL_SCHOOLS, SKILL_SCHOOL_NAMES, SkillSchool } from '../game/skills/skill';
import { CatalogTextPipe } from '../i18n/catalog-text.pipe';
import { TranslatePipe } from '../i18n/translate.pipe';
import { AttackDiceComponent } from './attack-dice.component';
import { DialogComponent } from './dialog.component';
import { MarkdownPipe } from './markdown.pipe';
import { IconComponent } from './icon.component';
import { MercenaryFaceComponent } from './mercenary-face.component';

/** Se la card è solo in parte dentro l'elenco la porta in vista (e dice di sì), ma solo su mobile (fino a 900px): un tocco sulla card seminascosta fa scorrere l'elenco fin lì, senza scegliere. */
export const scrollIfPartial = (card: HTMLElement): boolean => {
  if (!matchMedia('(max-width: 900px)').matches) return false; // solo mobile: su desktop un click sceglie sempre
  const row = card.parentElement;
  if (!row) return false;
  const c = card.getBoundingClientRect();
  const r = row.getBoundingClientRect();
  if (c.left >= r.left && c.right <= r.right) return false;
  card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  return true;
};

/**
 * La scheda di un eroe nella scelta della squadra: solo ciò che è fisso, cioè i parametri, i dadi competenza, l'abilità primaria e gli attributi (i punti nei tre rami) che decidono le
 * 3 abilità secondarie: a inizio partita l'eroe pesca a caso una carta per ogni punto, dal mazzo di quel ramo. Le carte vere non si vedono qui perché non sono ancora state pescate.
 */
@Component({
  selector: 'app-mercenary-detail-dialog',
  imports: [AttackDiceComponent, CatalogTextPipe, MarkdownPipe, DialogComponent, IconComponent, MercenaryFaceComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mercenary(); as h) {
      <app-dialog [kicker]="h.class | ct" [title]="h.name" (closed)="closed.emit()">
        <!-- A sinistra la carta dell'eroe con i suoi parametri, a destra la sua storia: inclinate e infilate sotto il pannello. -->
        <figure dialogSide class="card left"><app-mercenary-face [mercenary]="h" /></figure>
        <figure dialogSide class="card right">
          <figcaption class="head">{{ 'detail.story' | t }}</figcaption>
          <div class="story"><p>{{ h.story || ('detail.storyPlaceholder' | t) }}</p></div>
        </figure>

        <h3>{{ 'detail.params' | t }}</h3>
        <div class="stats">
          <span class="stat life" [title]="'stats.healthHint' | t"><app-icon name="favorite" [size]="18" /><span class="v">{{ h.wounds }}<small>{{ 'stats.health' | t }}</small></span></span>
          <span class="stat speed" [title]="'stats.speed' | t"><app-icon name="footprint" [size]="18" /><span class="v">{{ h.speed }}<small>{{ 'detail.speed' | t }}</small></span></span>
          <span class="stat overclock" [title]="'stats.overclock' | t"><app-icon name="speed" [size]="18" /><span class="v">{{ h.overclock }}<small>{{ 'stats.overclock' | t }}</small></span></span>
          <span class="stat" [title]="'detail.armorHint' | t"><app-icon name="shield" [size]="18" /><span class="v">{{ h.armor }}<small>{{ 'detail.armor' | t }}</small></span></span>
        </div>

        <h3>{{ 'detail.dice' | t }}</h3>
        <app-attack-dice [dice]="h.dice" />

        <h3>{{ 'detail.primary' | t }}@if (h.abilityName) { <span class="aname">: {{ h.abilityName | ct }}</span> }</h3>
        @if (h.ability) { <div class="ability md" [innerHTML]="h.ability | ct | markdown"></div> } @else { <p class="soon">{{ 'detail.soon' | t }}</p> }

        <h3>{{ 'detail.attributes' | t }}</h3>
        <div class="soon" [innerHTML]="'detail.attributesHint' | t: { n: total() } | markdown"></div>
        <div class="slots">
          @for (s of slots(); track $index) {
            <div class="slot" [attr.data-school]="s.school"><b>{{ s.name }}</b></div>
          }
        </div>
        <!-- Dove le carte laterali non ci stanno (telefono e schermi stretti) la storia segue le abilità secondarie. -->
        <section class="story-inline">
          <h3>{{ 'detail.story' | t }}</h3>
          <p>{{ h.story || ('detail.storyPlaceholder' | t) }}</p>
        </section>
        <!-- «Scegli» al posto di «Chiudi»: chiude la scheda e sceglie il mercenario in un solo tocco (la X resta per chiudere e basta). -->
        <ng-container dialogFooter><button type="button" class="dlg-btn primary" [class.on]="chosen()" [attr.aria-pressed]="chosen()" [attr.aria-disabled]="canChoose() ? null : 'true'" (click)="canChoose() && choose.emit(h)">{{ (chosen() ? 'detail.chosen' : 'detail.choose') | t }}</button></ng-container>
      </app-dialog>
    }
  `,
  styles: `
    h3 { margin: 6px 0 0; font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    h3:first-of-type { margin-top: 0; }
    /* I quattro parametri in una griglia 2x2, ognuno nel suo riquadro. */
    .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .stat { display: inline-flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: var(--c-bg); font-weight: 600; font-variant-numeric: tabular-nums; }
    /* Numero ed etichetta sulla stessa linea di base, con un po' di spazio; l'icona resta centrata sul riquadro. */
    .stat .v { display: inline-flex; align-items: baseline; gap: 6px; }
    .stat.life { color: var(--c-life); }
    .stat.speed { color: var(--c-move); }
    .stat.overclock { color: var(--c-overclock); }
    small { font-weight: 400; color: var(--c-text-dim); }
    .ability { margin: 0; }
    .aname { text-transform: none; letter-spacing: 0; font: 600 13px/1 var(--font-ui); color: var(--c-text); }
    .soon { margin: 0; color: var(--c-text-dim); font-size: 12px; }
    .soon :is(p) { margin: 0; }
    .slots { display: flex; gap: 10px; }
    .slot { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 14px 8px; text-align: center; border-radius: var(--radius-1); border: 1px dashed var(--c-line-strong); background: var(--c-bg); color: var(--c-text-dim); }
    .slot b { font: 600 12px/1.2 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text); }
    /* Le due carte laterali (alte al massimo 484 px, centrate in verticale), inclinate e infilate di 14 px sotto il pannello. */
    .card { position: absolute; z-index: 0; top: 0; bottom: 0; margin-block: auto; margin-inline: 0; height: min(484px, calc(100% - 16px)); width: 220px; overflow: hidden; border-radius: var(--radius-1); border: 1px solid var(--c-line-strong); background: var(--c-tile); box-shadow: 0 8px 22px rgba(0, 0, 0, 0.55); }
    .card.left { --face-inset: 14px; right: calc(100% - 14px); transform: rotate(-4deg); transform-origin: 70% 100%; }
    .card.right { left: calc(100% - 14px); transform: rotate(4deg); transform-origin: 30% 100%; display: flex; flex-direction: column; background: var(--c-surface); }
    /* Già scelto: il tasto è «Scelto», acceso come le carte selezionate; un tocco toglie la scelta. */
    .dlg-btn.on { border-color: var(--c-ok); color: var(--c-ok); }
    .story-inline { display: none; flex-direction: column; gap: 8px; }
    .story-inline p { margin: 0; font-size: 13px; line-height: 1.5; color: var(--c-text-dim); }
    .card .head { flex: none; padding: 10px 10px 8px 14px; border-bottom: 1px solid var(--c-line-strong); font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    .story { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 10px 12px 14px; scrollbar-width: none; }
    .story::-webkit-scrollbar { display: none; }
    .story p { margin: 0; font-size: 13px; line-height: 1.5; color: var(--c-text-dim); }
    /* Sotto i 1000px le carte laterali non ci stanno: attenzione, \`.card.right\` ha \`display: flex\` e vince su \`.card\`, quindi vanno nominate tutte e due. */
    @media (max-width: 1000px) { .card, .card.left, .card.right { display: none; } .story-inline { display: flex; } }
    /* Su telefono i tre slot delle abilità secondarie stanno uno sotto l'altro. */
    @media (max-width: 900px) { .slots { flex-direction: column; } }
  `,
})
export class MercenaryDetailDialogComponent {
  readonly mercenary = input<MercenarySheet | null>(null);
  /** Il tasto «Scegli»: chi apre la scheda sceglie il mercenario e la chiude. */
  readonly choose = output<MercenarySheet>();
  /** Se si può ancora scegliere (per esempio non se la squadra è piena o il mercenario è di un altro). */
  readonly canChoose = input(true);
  /** Il mercenario è già scelto: il tasto diventa «Scelto» e un tocco lo toglie. */
  readonly chosen = input(false);
  readonly closed = output<void>();

  protected readonly total = computed(() => SKILL_SCHOOLS.reduce((n, s) => n + (this.mercenary()?.skills[s] ?? 0), 0));
  /** Una carta segnaposto per ogni punto di attributo, ramo per ramo. */
  protected readonly slots = computed(() => {
    const h = this.mercenary();
    if (!h) return [];
    return SKILL_SCHOOLS.flatMap((school: SkillSchool) => Array.from({ length: h.skills[school] }, () => ({ school, name: SKILL_SCHOOL_NAMES[school] })));
  });
}

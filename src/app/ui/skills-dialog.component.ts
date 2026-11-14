import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MercenarySheet } from '../game/mercenaries/mercenary-sheet';
import { money } from '../game/money';
import { SkillDef } from '../game/skills/skill';
import { translate } from '../i18n/i18n.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { DialogComponent } from './dialog.component';
import { IconComponent } from './icon.component';
import { SkillCardComponent } from './skill-card.component';

/**
 * Le abilità secondarie di un mercenario, generate nel Briefing: le card affiancate, tutte alte uguali, e sotto ognuna «Cambia per 25 E$» che la sostituisce con un'altra dello stesso ramo
 * (i soldi escono dal budget del mercenario). La stilizzazione delle card si rivede dopo.
 */
@Component({
  selector: 'app-skills-dialog',
  imports: [DialogComponent, IconComponent, SkillCardComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <app-dialog [title]="'detail.secondary' | t" [accent]="mercenary().name" width="min(980px, 100%)" (closed)="closed.emit()">
        <div class="grid" [style.--n]="skills().length">
          @for (s of skills(); track s.id; let i = $index) {
            <div class="slot">
              <app-skill-card [skill]="s" />
              <button type="button" class="reroll" [class.off]="!!blocked(i)" [attr.aria-disabled]="!!blocked(i)" [title]="blocked(i)" (click)="!blocked(i) && reroll.emit(i)"><app-icon name="sync" [size]="16" />{{ 'skills.change' | t }}</button>
            </div>
          }
        </div>
        <!-- Cosa costa cambiare un'abilità, a sinistra del piede: il primo cambio è gratis, poi 25 E$. Gialla, come il badge «cambia» sulle card. -->
        <span dialogFooterStart class="rule"><app-icon name="sync" [size]="16" />{{ (rerollCost() === 0 ? 'skills.freeChange' : 'skills.paidChange') | t: { price: money(rerollCost()) } }}</span>
        <ng-container dialogFooter><button type="button" class="dlg-btn primary" (click)="closed.emit()">{{ 'shop.confirm' | t }}</button></ng-container>
      </app-dialog>
    }
  `,
  styles: `
    /* Le card affiancate, tutte alte quanto la più alta; su telefono una sotto l'altra. */
    .grid { display: grid; grid-template-columns: repeat(var(--n, 3), minmax(0, 1fr)); gap: 14px; align-items: stretch; }
    /* «Cambia per 25 E$» è un badge giallo a cavallo del bordo in basso a destra della card, con gli angoli arrotondati in alto a destra e in basso a sinistra. */
    .slot { position: relative; display: flex; flex-direction: column; min-width: 0; padding-bottom: 14px; }
    .slot app-skill-card { flex: 1; }
    .reroll { position: absolute; right: 14px; bottom: 0; display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; background: var(--c-bg); color: var(--c-money); border: 1px solid var(--c-money); border-radius: 0 var(--radius-2) 0 var(--radius-2); font: 600 13px/1 var(--font-ui); cursor: pointer; transition: background-color 0.15s; }
    .reroll:hover:not(.off), .reroll:focus-visible:not(.off) { background: color-mix(in srgb, var(--c-money) 14%, var(--c-bg)); outline: none; }
    .rule { display: inline-flex; align-items: center; gap: 6px; color: var(--c-money); font-size: 13px; }
    .reroll.off { opacity: 0.45; cursor: default; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class SkillsDialogComponent {
  readonly open = input(false);
  readonly mercenary = input.required<MercenarySheet>();
  readonly skills = input<readonly SkillDef[]>([]);
  /** Per ogni card, se non si può cambiare perché nel suo ramo non ci sono alternative (`noAlt`); vuoto se si può. */
  readonly rerollReasons = input<readonly ('' | 'noAlt')[]>([]);
  /** Quanto budget resta al mercenario. */
  readonly budget = input(0);
  /** Quanto costa il prossimo cambio (0: il primo è gratis; poi 25 in più a ogni cambio). */
  readonly rerollCost = input(0);
  readonly reroll = output<number>();
  readonly closed = output<void>();
  protected readonly money = money;

  /** Perché non si può cambiare la card `i` (vuoto se si può). */
  protected blocked(i: number): string {
    if (this.rerollReasons()[i]) return translate('skills.noAlt');
    return this.rerollCost() > this.budget() ? translate('briefing.noBudget') : '';
  }
}

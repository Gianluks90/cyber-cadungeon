import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from './icon.component';

/** Una pillola con la salute (cuore, rosso, se c'è), la velocità (impronte, verde), l'overclock (speed, verde) e, se c'è, l'armatura (scudo) di un mercenario, come nei tab della partita. Chi la usa la posiziona (di solito sopra il piede di una carta). */
@Component({
  selector: 'app-mercenary-stats-pill',
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (health() !== null) {
      <span class="v health" [title]="'stats.healthHint' | t"><app-icon name="favorite" [size]="16" />{{ health() }}</span>
    }
    <span class="v speed" [title]="'stats.speed' | t"><app-icon name="footprint" [size]="16" />{{ speed() }}</span>
    <span class="v overclock" [title]="'stats.overclock' | t"><app-icon name="speed" [size]="16" />{{ overclock() }}</span>
    @if (armor() !== null) {
      <span class="v armor" [title]="'shop.armor' | t" [attr.aria-label]="('shop.armor' | t) + ' ' + armor()"><app-icon name="shield" [size]="16" />{{ armor() }}</span>
    }
  `,
  styles: `
    /* Gli angoli smussati solo in alto a destra e in basso a sinistra, come il logo. */
    :host { display: inline-flex; align-items: center; justify-content: center; gap: 12px; box-sizing: border-box; height: 40px; padding: 0 12px; border-radius: 0 var(--radius-2) 0 var(--radius-2); background: var(--c-bg); border: 1px solid var(--c-line-strong); font: 700 14px/1 var(--font-mono); letter-spacing: 0; text-transform: none; }
    .v { display: inline-flex; align-items: center; gap: 4px; }
    .health { color: var(--c-life); }
    .speed { color: var(--c-move); }
    .overclock { color: var(--c-overclock); }
    .armor { color: var(--c-armor); }
  `,
})
export class MercenaryStatsPillComponent {
  /** La salute (le ferite): se c'è, è il primo dei parametri, prima della velocità. */
  readonly health = input<number | null>(null);
  readonly speed = input.required<number>();
  readonly overclock = input.required<number>();
  /** L'armatura: senza, la pillola mostra solo velocità e overclock. */
  readonly armor = input<number | null>(null);
}

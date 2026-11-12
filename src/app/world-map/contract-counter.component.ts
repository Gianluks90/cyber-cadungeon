import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CONTRACT_SLOTS } from '../game/constants';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from '../ui/icon.component';

/**
 * Il contatore dei contratti, in alto a destra accanto al tasto del menu: un rettangolo alto come il tasto con `CONTRACT_SLOTS` marker del contratto (la stessa icona della mappa),
 * uno per contratto che il giocatore può tenere: spenti se vuoti, accesi se occupati. Non conosce i contratti: riceve solo quanti sono.
 */
@Component({
  selector: 'app-contract-counter',
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar" role="img" [attr.aria-label]="'contract.counter' | t: { n: shown(), max: max() }" [title]="'contract.counter' | t: { n: shown(), max: max() }">
      @for (full of slots(); track $index) {
        <span class="slot" [class.full]="full"><app-icon name="contract" [size]="24" /></span>
      }
    </div>
  `,
  styles: `
    /* A sinistra del tasto del menu (10px dal bordo + 36px di tasto + 10px di spazio). */
    :host { position: absolute; top: 10px; right: 56px; z-index: 2; pointer-events: none; }
    .bar { box-sizing: border-box; height: 36px; display: flex; align-items: center; gap: 4px; padding: 0 5px; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); background: var(--c-surface); }
    .slot { display: flex; width: 24px; height: 24px; color: var(--c-line-strong); }
    .slot.full { color: var(--c-interact); }
  `,
})
export class ContractCounterComponent {
  /** Quanti contratti ha il giocatore (oltre il massimo non si mostrano). */
  readonly count = input(0);
  readonly max = input(CONTRACT_SLOTS);
  protected readonly shown = computed(() => Math.min(this.count(), this.max()));
  protected readonly slots = computed(() => Array.from({ length: this.max() }, (_, i) => i < this.shown()));
}

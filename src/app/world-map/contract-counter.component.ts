import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CONTRACT_SLOTS } from '../game/constants';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from '../ui/icon.component';

/**
 * Il contatore dei contratti, in alto a destra accanto al tasto del menu: un rettangolo alto come il tasto con `CONTRACT_SLOTS` spazi,
 * uno per contratto che il giocatore può tenere: uno spazio vuoto è un quadrato tratteggiato, uno occupato diventa il marker del contratto. Non conosce i contratti: riceve solo quanti sono.
 */
@Component({
  selector: 'app-contract-counter',
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar">
      <span class="label">{{ 'contract.label' | t }}</span>
      <div class="slots" role="img" [attr.aria-label]="'contract.counter' | t: { n: shown(), max: max() }" [title]="'contract.counter' | t: { n: shown(), max: max() }">
        @for (full of slots(); track $index) {
          @if (full) { <app-icon class="marker" name="contract" [size]="24" /> } @else { <span class="empty"></span> }
        }
      </div>
      <!-- Aprirà il pannello dei contratti raccolti: per ora non c'è. -->
      <button type="button" class="key" aria-disabled="true" [attr.aria-label]="'contract.listOpen' | t" [title]="'common.soon' | t">C</button>
    </div>
  `,
  styles: `
    /* A sinistra del tasto del menu (10px dal bordo + 36px di tasto + 10px di spazio). */
    :host { position: absolute; top: 10px; right: 56px; z-index: 2; pointer-events: none; }
    .bar { box-sizing: border-box; height: 36px; display: flex; align-items: center; gap: 8px; padding: 0 6px 0 10px; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); background: var(--c-surface); }
    /* Vuoto: un quadrato tratteggiato. Occupato: al suo posto il marker del contratto, come sulla mappa. */
    .label { font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    .slots { display: flex; gap: 4px; }
    /* La lettera del tasto che aprirà l'elenco dei contratti raccolti: piccola, in un quadratino; spenta finché il pannello non c'è. */
    .key { pointer-events: auto; width: 20px; height: 20px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: none; color: var(--c-text-dim); font: 600 11px/1 var(--font-mono); cursor: default; opacity: 0.6; }
    /* Su telefono l'etichetta si toglie: non c'è posto accanto al logo. */
    @media (max-width: 640px) { .label { display: none; } }
    .empty { box-sizing: border-box; width: 24px; height: 24px; border: 1px dashed var(--c-line-strong); border-radius: var(--radius-1); }
    .marker { color: var(--c-interact); }
  `,
})
export class ContractCounterComponent {
  /** Quanti contratti ha il giocatore (oltre il massimo non si mostrano). */
  readonly count = input(0);
  readonly max = input(CONTRACT_SLOTS);
  protected readonly shown = computed(() => Math.min(this.count(), this.max()));
  protected readonly slots = computed(() => Array.from({ length: this.max() }, (_, i) => i < this.shown()));
}

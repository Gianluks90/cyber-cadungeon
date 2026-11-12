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
      <!-- La lettera del tasto che aprirà il pannello dei contratti raccolti (per ora non c'è): piccola in basso a destra, come sugli altri tasti. -->
      <kbd>C</kbd>
    </div>
  `,
  styles: `
    /* A sinistra del tasto del menu (10px dal bordo + 36px di tasto + 10px di spazio). */
    :host { position: absolute; top: 10px; right: 56px; z-index: 2; pointer-events: none; }
    .bar { position: relative; box-sizing: border-box; height: 36px; display: flex; align-items: center; gap: 8px; padding: 0 18px 0 10px; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); background: var(--c-surface); }
    /* Vuoto: un quadrato tratteggiato. Occupato: al suo posto il marker del contratto, come sulla mappa. */
    .label { font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    .slots { display: flex; gap: 4px; }
    /* La lettera del tasto, piccola e grigia in basso a destra, solo dove c'è una tastiera (come sui tasti dei filtri e del menu). Il margine a destra della barra le lascia posto accanto all'ultimo spazio. */
    kbd { display: none; position: absolute; right: 4px; bottom: 2px; font: 600 9px/1 var(--font-mono); text-transform: uppercase; color: var(--c-text-dim); }
    @media (pointer: fine) { kbd { display: block; } }
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

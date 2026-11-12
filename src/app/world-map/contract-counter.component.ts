import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CONTRACT_SLOTS } from '../game/constants';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from '../ui/icon.component';

/**
 * Il contatore dei contratti, in alto a destra accanto al tasto del menu: un rettangolo alto come il tasto con `CONTRACT_SLOTS` spazi, uno per contratto che il giocatore può tenere.
 * Uno spazio vuoto è un quadrato tratteggiato, uno occupato diventa il marker del contratto. È anche il tasto che apre l'elenco dei contratti accettati (la lettera C in basso a destra
 * dice la scorciatoia; la tastiera la gestisce il pannello dell'elenco). Non conosce i contratti: riceve solo quanti sono e dice quando lo si tocca.
 */
@Component({
  selector: 'app-contract-counter',
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="bar" [class.on]="open()" [attr.aria-expanded]="open()" [attr.aria-label]="'contract.listOpen' | t" [title]="'contract.counter' | t: { n: shown(), max: max() }" (click)="toggle.emit()">
      <span class="label">{{ 'contract.label' | t }}</span>
      <span class="slots">
        @for (full of slots(); track $index) {
          @if (full) { <app-icon class="marker" name="contract" [size]="24" /> } @else { <span class="empty"></span> }
        }
      </span>
      <!-- La lettera del tasto, piccola in basso a destra, come sugli altri tasti. -->
      <kbd>C</kbd>
    </button>
  `,
  styles: `
    /* A sinistra del tasto del menu (10px dal bordo + 36px di tasto + 10px di spazio). */
    :host { position: absolute; top: 10px; right: 56px; z-index: 2; }
    .bar { position: relative; box-sizing: border-box; height: 36px; display: flex; align-items: center; gap: 8px; padding: 0 18px 0 10px; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); background: var(--c-surface); color: var(--c-text-dim); font: inherit; cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast); }
    .bar:hover, .bar:focus-visible, .bar.on { border-color: var(--c-interact); outline: none; }
    .label { font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; }
    .slots { display: flex; gap: 4px; }
    .bar:hover .label, .bar:focus-visible .label, .bar.on .label { color: var(--c-interact); }
    /* La lettera del tasto, piccola e grigia in basso a destra, solo dove c'è una tastiera (come sui tasti dei filtri e del menu). Il margine a destra della barra le lascia posto accanto all'ultimo spazio. */
    kbd { display: none; position: absolute; right: 4px; bottom: 2px; font: 600 9px/1 var(--font-mono); text-transform: uppercase; color: var(--c-text-dim); pointer-events: none; }
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
  /** L'elenco è aperto (per l'aspetto del tasto). */
  readonly open = input(false);
  readonly toggle = output<void>();
  protected readonly shown = computed(() => Math.min(this.count(), this.max()));
  protected readonly slots = computed(() => Array.from({ length: this.max() }, (_, i) => i < this.shown()));
}

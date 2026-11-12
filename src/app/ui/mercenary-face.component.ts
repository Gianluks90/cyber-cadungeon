import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MercenarySheet } from '../game/mercenaries/mercenary-sheet';
import { MercenaryStats } from '../game/mercenaries/mercenary-stats';
import { CatalogTextPipe } from '../i18n/catalog-text.pipe';
import { MercenaryStatsPillComponent } from './mercenary-stats-pill.component';
import { ValueStarComponent } from './value-star.component';

/**
 * La faccia di una carta eroe con i soliti parametri stampati: immagine a figura intera, cuori in alto a destra e, sopra il piede (nome e classe), la pillola di velocità, overclock e armatura a sinistra
 * e il Valore a destra. Riempie il contenitore che la ospita (che la ritaglia e la inclina). `armor` sostituisce l'armatura base (con gli oggetti comprati).
 */
@Component({
  selector: 'app-mercenary-face',
  imports: [CatalogTextPipe, MercenaryStatsPillComponent, ValueStarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mercenary(); as h) {
      <img [src]="h.portraitFull" [alt]="h.name" />
      <app-value-star class="value" [value]="h.value" />
      <div class="cap">
        <app-mercenary-stats-pill class="stats" [health]="shown().wounds" [speed]="shown().speed" [overclock]="shown().overclock" [armor]="shown().armor" />
        <b>{{ h.name }}</b><span>{{ h.class | ct }}</span>
      </div>
    }
  `,
  styles: `
    :host { position: absolute; inset: 0; display: block; }
    img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .cap { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; gap: 2px; padding: 8px 12px 10px; background: var(--c-surface); border-top: 1px solid var(--c-line-strong); text-align: left; }
    .cap b { font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.04em; }
    .cap span { color: var(--c-text-dim); font-size: 11px; font-weight: 600; letter-spacing: var(--label-tracking); text-transform: uppercase; }
    .stats { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(100% + 6px); }
    /* --face-inset: quanto la carta è infilata sotto un pannello sul lato destro (le cose a destra si spostano di tanto, per restare visibili). */
    .value { position: absolute; right: calc(8px + var(--face-inset, 0px)); top: 8px; }
  `,
})
export class MercenaryFaceComponent {
  readonly mercenary = input.required<MercenarySheet>();
  /** I parametri con abilità e oggetti (`mercenaryStats`); senza, quelli base della scheda. */
  readonly stats = input<MercenaryStats | null>(null);
  protected readonly shown = computed<MercenaryStats>(() => this.stats() ?? { wounds: this.mercenary().wounds, overclock: this.mercenary().overclock, speed: this.mercenary().speed, armor: this.mercenary().armor });
}

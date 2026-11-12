import { ChangeDetectionStrategy, Component, computed, effect, input, isDevMode, output, signal } from '@angular/core';
import type { Contract } from '../game/contracts/contract';
import { UNLOCK_RADIUS_M } from '../game/constants';
import { CatalogTextPipe } from '../i18n/catalog-text.pipe';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from '../ui/icon.component';

/** Il numero collezionabile scritto come #001. */
export const contractNumber = (n: number): string => `#${String(n).padStart(3, '0')}`;

/** Una distanza leggibile: in metri sotto il chilometro, poi in chilometri con un decimale. */
const formatDistance = (meters: number): string => (meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`);

/**
 * Il pannello con le info di un contratto: su schermo largo è un pannello laterale che scivola da destra, su telefono (fino a 640px) un foglio che sale dal basso. Si apre quando
 * `contract` c'è e si chiude quando torna `null` (il contenuto resta finché l'animazione finisce).
 * Bloccato: numero, titolo, stato, distanza e cosa serve per sbloccarlo (niente didascalia né missione). Sbloccato: titolo, didascalia e il tasto Gioca (si gioca da casa).
 * Lo sblocco manuale c'è solo in sviluppo, per vedere i due stati senza GPS.
 */
@Component({
  selector: 'app-contract-panel',
  imports: [CatalogTextPipe, IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="panel" [class.open]="open()" [attr.aria-hidden]="!open()" [attr.aria-label]="shown() ? ('contract.card' | t: { n: number(shown()!.number) }) : null">
      @if (shown(); as c) {
        <header>
          <span class="num">{{ number(c.number) }}</span>
          <span class="state" [class.on]="unlocked()"><app-icon [name]="unlocked() ? 'lock_open' : 'lock'" [size]="16" />{{ (unlocked() ? 'contract.unlocked' : 'contract.lockedState') | t }}</span>
          <button type="button" class="x" [attr.aria-label]="'common.close' | t" [title]="'common.close' | t" (click)="closed.emit()"><app-icon name="close" [size]="16" /></button>
        </header>
        <hr />
        <div class="body">
          <h2>{{ c.title | ct }}</h2>
          @if (unlocked()) {
            <p class="caption">{{ c.caption | ct }}</p>
            <button type="button" class="dlg-btn primary" (click)="play.emit(c)">{{ 'contract.play' | t }}</button>
          } @else {
            <p class="muted">{{ 'contract.locked' | t }}</p>
            @if (distanceText(); as d) { <p class="info"><app-icon name="navigation" [size]="16" />{{ 'contract.distance' | t: { distance: d } }}</p> }
            <p class="info">{{ 'contract.approach' | t: { n: radius } }}</p>
            @if (dev) { <button type="button" class="dlg-btn" (click)="devUnlock.emit(c)">{{ 'contract.devUnlock' | t }}</button> }
          }
        </div>
      }
    </aside>
  `,
  styles: `
    :host { display: contents; }
    /* Desktop: pannello a destra, sotto la barra in alto (menu e contatore), che scivola da destra. */
    .panel { position: absolute; z-index: 2; top: 56px; right: 10px; width: min(340px, calc(100% - 20px)); box-sizing: border-box; display: flex; flex-direction: column; background: var(--c-surface); border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); color: var(--c-text); font: 14px/1.4 var(--font-ui); transform: translateX(calc(100% + 20px)); transition: transform var(--t-base) var(--ease-draw); }
    .panel.open { transform: none; }
    .panel:not(.open) { visibility: hidden; transition: transform var(--t-base) var(--ease-draw), visibility 0s linear var(--t-base); }
    /* Telefono: un foglio che sale dal basso a tutta larghezza. */
    @media (max-width: 640px) {
      .panel { top: auto; right: 0; bottom: 0; left: 0; width: auto; padding-bottom: env(safe-area-inset-bottom); border-width: 1px 0 0; border-radius: 0; transform: translateY(100%); }
    }
    header { flex: none; display: flex; align-items: center; gap: 10px; padding: 10px 10px 10px 14px; color: var(--c-text-dim); }
    .num { font: 600 12px/1 var(--font-mono); letter-spacing: 0.08em; }
    .state { flex: 1; display: inline-flex; align-items: center; gap: 6px; font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; }
    .state.on { color: var(--c-interact); }
    .x { width: 32px; height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: none; color: var(--c-text-dim); cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast); }
    .x:hover, .x:focus-visible { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
    hr { flex: none; width: 100%; margin: 0; border: 0; border-top: 1px solid var(--c-line-strong); }
    .body { display: flex; flex-direction: column; align-items: stretch; gap: 10px; padding: 14px; }
    h2 { margin: 0; font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.03em; }
    p { margin: 0; }
    .caption { color: var(--c-text-dim); }
    .muted { color: var(--c-text-dim); font-style: italic; }
    .info { display: flex; align-items: center; gap: 6px; color: var(--c-text-dim); font-size: 13px; }
  `,
})
export class ContractPanelComponent {
  /** Il contratto da mostrare; `null` chiude il pannello. */
  readonly contract = input<Contract | null>(null);
  readonly unlocked = input(false);
  /** Quanto dista il giocatore dal contratto, in metri (null se non si conosce la posizione). */
  readonly distance = input<number | null>(null);
  readonly closed = output<void>();
  readonly play = output<Contract>();
  readonly devUnlock = output<Contract>();

  protected readonly dev = isDevMode();
  protected readonly radius = UNLOCK_RADIUS_M;
  protected readonly number = contractNumber;
  protected readonly open = computed(() => !!this.contract());
  /** L'ultimo contratto aperto: resta scritto mentre il pannello scivola via. */
  protected readonly shown = signal<Contract | null>(null);
  protected readonly distanceText = computed(() => {
    const d = this.distance();
    return d === null ? '' : formatDistance(d);
  });

  constructor() {
    effect(() => {
      const c = this.contract();
      if (c) this.shown.set(c);
    });
  }
}

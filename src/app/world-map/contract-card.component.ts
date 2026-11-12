import { ChangeDetectionStrategy, Component, input, isDevMode, output } from '@angular/core';
import type { Contract } from '../game/contracts/contract';
import { CatalogTextPipe } from '../i18n/catalog-text.pipe';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from '../ui/icon.component';

/** Il numero collezionabile scritto come #001. */
export const contractNumber = (n: number): string => `#${String(n).padStart(3, '0')}`;

/**
 * La scheda di un contratto sulla mappa del mondo. Bloccato: solo numero, titolo e "Fuori dal campo di sincronizzazione" (niente didascalia, niente missione).
 * Sbloccato: titolo, didascalia e il tasto Gioca (si gioca da casa). Sblocco manuale solo in sviluppo, per vedere i due stati senza GPS.
 */
@Component({
  selector: 'app-contract-card',
  imports: [CatalogTextPipe, IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (contract(); as c) {
      <aside class="card" [class.open]="unlocked()" role="dialog" [attr.aria-label]="'contract.card' | t: { n: number(c.number) }">
        <header>
          <span class="num">{{ number(c.number) }}</span>
          <app-icon [name]="unlocked() ? 'lock_open' : 'lock'" [size]="16" />
          <button type="button" class="x" [attr.aria-label]="'common.close' | t" [title]="'common.close' | t" (click)="closed.emit()"><app-icon name="close" [size]="16" /></button>
        </header>
        <h2>{{ c.title | ct }}</h2>
        @if (unlocked()) {
          <p class="caption">{{ c.caption | ct }}</p>
          <button type="button" class="dlg-btn primary" (click)="play.emit(c)">{{ 'contract.play' | t }}</button>
        } @else {
          <p class="locked">{{ 'contract.locked' | t }}</p>
          @if (dev) { <button type="button" class="dlg-btn" (click)="devUnlock.emit(c)">{{ 'contract.devUnlock' | t }}</button> }
        }
      </aside>
    }
  `,
  styles: `
    :host { display: contents; }
    .card { position: absolute; left: 50%; bottom: 56px; transform: translateX(-50%); z-index: 3; box-sizing: border-box; width: min(340px, calc(100% - 20px)); display: flex; flex-direction: column; align-items: stretch; gap: 8px; padding: 10px 12px 12px; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); background: var(--c-surface); color: var(--c-text); font: 14px/1.4 var(--font-ui); }
    .card.open { border-color: var(--c-interact); }
    header { display: flex; align-items: center; gap: 8px; color: var(--c-text-dim); }
    .num { flex: 1; font: 600 12px/1 var(--font-mono); letter-spacing: 0.08em; }
    .x { width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: none; color: var(--c-text-dim); cursor: pointer; }
    .x:hover, .x:focus-visible { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
    h2 { margin: 0; font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.03em; }
    p { margin: 0; }
    .caption { color: var(--c-text-dim); }
    .locked { color: var(--c-text-dim); font-style: italic; }
  `,
})
export class ContractCardComponent {
  readonly contract = input<Contract | null>(null);
  readonly unlocked = input(false);
  readonly closed = output<void>();
  readonly play = output<Contract>();
  readonly devUnlock = output<Contract>();
  protected readonly dev = isDevMode();
  protected readonly number = contractNumber;
}

import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import type { Contract } from '../game/contracts/contract';
import { CatalogTextPipe } from '../i18n/catalog-text.pipe';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from '../ui/icon.component';
import { contractNumber } from './contract-panel.component';

/**
 * Il pannello dei contratti accettati: si apre dal contatore in alto a destra (o con il tasto C) e mostra tutti i contratti raccolti in ordine di numero, uno per scheda, in un elenco che scorre.
 * Stesso stile e stessa geometria del pannello di dettaglio (a metà altezza, scivola da destra oltre i tasti di navigazione; su telefono sale dal basso). Non conosce lo stato del
 * giocatore: riceve i contratti già scelti e ordinati e dice quale si vuole giocare.
 */
@Component({
  selector: 'app-contract-list-panel',
  imports: [CatalogTextPipe, IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <aside class="sheet" [class.open]="open()" [attr.aria-hidden]="!open()" [attr.aria-label]="'contract.label' | t">
      <header>
        <h2>{{ 'contract.label' | t }}</h2>
        <button type="button" class="close" [attr.aria-label]="'contract.listClose' | t" [title]="'contract.listClose' | t" (click)="open.set(false)"><app-icon name="close" [size]="20" /></button>
      </header>
      <hr />
      <div class="list">
        @for (c of contracts(); track c.id) {
          <article class="card">
            <p class="meta"><span class="num">{{ number(c.number) }}</span></p>
            <h3>{{ c.title | ct }}</h3>
            <p class="caption">{{ c.caption | ct }}</p>
            <div class="actions">
              <button type="button" class="dlg-btn primary" (click)="play.emit(c)">{{ 'contract.play' | t }}</button>
              <button type="button" class="dlg-btn" [attr.aria-label]="'contract.cancelFor' | t: { n: number(c.number) }" (click)="cancel.emit(c)">{{ 'contract.cancel' | t }}</button>
            </div>
          </article>
        } @empty {
          <p class="empty">{{ 'contract.listEmpty' | t }}</p>
        }
      </div>
    </aside>
  `,
  styles: `
    :host { display: contents; }
    /* Come il pannello di dettaglio: a metà altezza, oltre i tasti di navigazione (10px + 36px + 10px = 56px), scivola da destra e cresce dal centro. */
    .sheet { --w: min(320px, 82vw); --rail: 56px; position: absolute; z-index: 0; top: 50%; right: var(--rail); max-height: calc(100% - 112px); width: var(--w); box-sizing: border-box; display: flex; flex-direction: column; background: var(--c-surface); border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); color: var(--c-text); font: 14px/1.4 var(--font-ui); transform: translate(calc(var(--w) + var(--rail)), -50%); transition: transform var(--t-base) var(--ease-draw); }
    .sheet.open { transform: translate(0, -50%); }
    .sheet:not(.open) { visibility: hidden; transition: transform var(--t-base) var(--ease-draw), visibility 0s linear var(--t-base); }
    @media (max-width: 640px) {
      .sheet { z-index: 2; top: auto; right: 0; bottom: 0; left: 0; width: auto; max-height: 60dvh; padding-bottom: env(safe-area-inset-bottom); border-width: 1px 0 0; border-radius: 0; transform: translateY(100%); }
      .sheet.open { transform: none; }
    }
    header { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 10px 10px 10px 14px; }
    h2 { margin: 0; font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.06em; text-transform: uppercase; }
    hr { flex: none; width: 100%; margin: 0; border: 0; border-top: 1px solid var(--c-line-strong); }
    .close { flex: none; width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: none; color: var(--c-text-dim); cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast); }
    .close:hover, .close:focus-visible { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
    /* L'elenco scorre come quello dei filtri; ogni contratto è una scheda a sé. */
    .list { flex: 1 1 auto; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 12px 14px 14px; }
    .card { flex: none; display: flex; flex-direction: column; align-items: stretch; gap: 8px; padding: 10px; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); }
    .card p, .card h3 { margin: 0; }
    .num { font: 600 12px/1 var(--font-mono); letter-spacing: 0.08em; color: var(--c-interact); }
    h3 { font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.03em; }
    .caption { color: var(--c-text-dim); font-size: 13px; }
    .actions { display: flex; gap: 8px; }
    .actions .dlg-btn { flex: 1; }
    .empty { margin: 0; color: var(--c-text-dim); font-style: italic; }
  `,
})
export class ContractListPanelComponent {
  /** Il pannello è aperto: lo tiene la mappa (`[(open)]`), che ne lascia aperto uno solo alla volta. */
  readonly open = model(false);
  /** I contratti accettati, già in ordine di numero. */
  readonly contracts = input<readonly Contract[]>([]);
  readonly play = output<Contract>();
  /** Si annulla un contratto: lo si toglie da quelli accettati. */
  readonly cancel = output<Contract>();
  protected readonly number = contractNumber;

  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.open.set(false);
      return;
    }
    const target = e.target as HTMLElement | null;
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || target?.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key.toLowerCase() === 'c') this.open.update((v) => !v);
  }
}

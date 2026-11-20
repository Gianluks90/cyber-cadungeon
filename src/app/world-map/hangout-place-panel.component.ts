import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { translate, type MessageKey } from '../i18n/i18n.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from '../ui/icon.component';
import { formatDistance } from './contract-panel.component';
import type { Candidate } from './hangout-layer';

/**
 * Il pannello con le info di un luogo pubblico dove fissare il ritrovo, fatto come quello dei contratti (stessa intestazione, stesso divisore, stesso piede col tasto): su schermo largo
 * scivola da destra a metà altezza, su telefono (fino a 640px) sale dal basso. Si apre quando `place` c'è e si chiude quando torna `null` (il contenuto resta finché l'animazione finisce).
 * Non salva niente: dice solo se si preme «Fissa ritrovo».
 */
@Component({
  selector: 'app-hangout-place-panel',
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Non .panel: è una classe globale con il suo padding. -->
    <aside class="sheet" [class.open]="open()" [attr.aria-hidden]="!open()" [attr.aria-label]="shown() ? title() : null">
      @if (shown(); as p) {
        <header>
          <h2>{{ title() }}</h2>
          <button type="button" class="close" [attr.aria-label]="'common.close' | t" [title]="'common.close' | t" (click)="closed.emit()"><app-icon name="close" [size]="20" /></button>
        </header>
        <hr />
        <div class="body">
          <p class="meta"><span class="kind"><app-icon name="home" [size]="16" />{{ kind() }}</span></p>
          <p class="caption">@for (part of textParts(); track $index) {@if ($odd) {<em>{{ part }}</em>} @else {{{ part }}}}</p>
          @if (distanceText(); as d) { <p class="info"><app-icon name="navigation" [size]="16" />{{ d }}</p> }
        </div>
        <footer>
          <button type="button" class="dlg-btn primary" (click)="confirmed.emit(p)">{{ 'worldMap.hangout.confirm' | t }}</button>
        </footer>
      }
    </aside>
  `,
  styles: `
    :host { display: contents; }
    /* Lo stesso foglio del pannello dei contratti: desktop a metà altezza, oltre i tasti di navigazione, che scivola da destra. */
    /* Mentre si sceglie il luogo, in basso c'è anche il box delle istruzioni: il pannello lascia libero più spazio. */
    .sheet { --side-panel-reserve: 330px; position: absolute; z-index: 0; top: var(--side-panel-top); right: var(--hud-edge); max-height: calc(100% - var(--side-panel-top) - var(--side-panel-reserve)); width: var(--side-panel-w); box-sizing: border-box; display: flex; flex-direction: column; overflow-y: auto; background: var(--c-surface); border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); color: var(--c-text); font: 14px/1.4 var(--font-ui); transform: translateX(calc(100% + var(--hud-edge))); transition: transform var(--t-base) var(--ease-draw); }
    .sheet.open { transform: none; }
    .sheet:not(.open) { visibility: hidden; transition: transform var(--t-base) var(--ease-draw), visibility 0s linear var(--t-base); }
    @media (max-width: 640px) {
      .sheet { z-index: 4; top: auto; right: 0; bottom: 0; left: 0; width: auto; height: auto; max-height: 50%; overflow: hidden; padding-bottom: env(safe-area-inset-bottom); border-width: 1px 0 0; border-radius: 0; transform: translateY(100%); }
      .sheet.open { transform: none; }
      .body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
    }
    header { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 10px 10px 14px; }
    h2 { flex: 1; min-width: 0; margin: 0; font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.06em; text-transform: uppercase; }
    hr { flex: none; width: 100%; margin: 0; border: 0; border-top: 1px solid var(--c-line-strong); }
    .close { flex: none; width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: none; color: var(--c-text-dim); cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast); }
    .close:hover, .close:focus-visible { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
    footer { flex: none; position: sticky; bottom: 0; display: flex; flex-direction: column; padding: 10px 14px 14px; background: var(--c-surface); border-top: 1px solid var(--c-line); }
    .body { display: flex; flex-direction: column; align-items: stretch; gap: 10px; padding: 12px 14px 14px; }
    p { margin: 0; }
    .meta { display: flex; align-items: center; gap: 10px; color: var(--c-text-dim); }
    .kind { display: inline-flex; align-items: center; gap: 6px; color: var(--c-interact); font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; }
    .caption { color: var(--c-text); }
    em { font-style: italic; }
    .info { display: flex; align-items: center; gap: 6px; color: var(--c-text-dim); font-size: 13px; }
  `,
})
export class HangoutPlacePanelComponent {
  /** Il luogo da mostrare; `null` chiude il pannello. */
  readonly place = input<Candidate | null>(null);
  /** Quanto dista il giocatore dal luogo, in metri (null se non si conosce la posizione). */
  readonly distance = input<number | null>(null);
  readonly closed = output<void>();
  /** Il tasto «Fissa ritrovo». */
  readonly confirmed = output<Candidate>();

  /** Il testo spezzato ai trattini bassi: i pezzi in posizione dispari (tra due «_» nella traduzione) vanno in corsivo. */
  protected readonly textParts = computed(() => translate('worldMap.hangout.panel.text').split('_'));
  protected readonly open = computed(() => !!this.place());
  /** L'ultimo luogo aperto e la sua distanza: restano scritti mentre il pannello scivola via. */
  protected readonly shown = signal<Candidate | null>(null);
  private readonly lastDistance = signal<number | null>(null);

  protected readonly title = computed(() => this.shown()?.name ?? translate('worldMap.hangout.unnamed'));
  /** Che tipo di luogo è (biblioteca, fontana…), tradotto; se il tipo non ha una traduzione, un'etichetta generica. */
  protected readonly kind = computed(() => {
    const kind = this.shown()?.kind;
    return kind ? translate(`worldMap.hangout.kind.${kind}` as MessageKey) : '';
  });
  protected readonly distanceText = computed(() => {
    const d = this.lastDistance();
    return d === null ? '' : translate('worldMap.hangout.panel.distance', { distance: formatDistance(d) });
  });

  constructor() {
    effect(() => {
      const p = this.place();
      const d = this.distance();
      if (!p) return; // chiuso: resta quello di prima
      this.shown.set(p);
      this.lastDistance.set(d);
    });
  }
}

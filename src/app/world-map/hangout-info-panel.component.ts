import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from '../ui/icon.component';

/** Cosa mostra il pannello delle info: un titolo, una piccola etichetta (il tipo di elemento) e una riga per ogni informazione. */
export interface HangoutInfo {
  title: string;
  badge: string;
  /** L'icona dell'etichetta (`home` per il ritrovo, `apartment` per un edificio). */
  icon: string;
  lines: string[];
  /** I blocchetti con un'etichetta e un valore (città, quartiere), sotto il tipo di elemento. */
  tags: { label: string; value: string }[];
  /** Quartiere e città si stanno ancora scaricando: al posto dei blocchetti compare un testo che lampeggia piano. */
  loading: boolean;
  /** Il raggio dell'area che proietta, in metri: sta nel piede, con l'etichetta «Influenza». */
  influence: number;
}

/**
 * Il pannello con le info dell'elemento toccato con il punto di domanda (il ritrovo o un edificio dell'area), fatto come quello del luogo e dei contratti: su schermo largo scivola
 * da destra appena sotto il box dei contratti, su telefono sale dal basso. Si apre quando `info` c'è e si chiude quando torna `null` (il contenuto resta finché l'animazione finisce).
 */
@Component({
  selector: 'app-hangout-info-panel',
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Non .panel: è una classe globale con il suo padding. -->
    <aside class="sheet" [class.open]="open()" [attr.aria-hidden]="!open()" [attr.aria-label]="shown()?.title ?? null">
      @if (shown(); as s) {
        <header>
          <h2>{{ s.title }}</h2>
          <button type="button" class="close" [attr.aria-label]="'common.close' | t" [title]="'common.close' | t" (click)="closed.emit()"><app-icon name="close" [size]="20" /></button>
        </header>
        <hr />
        <div class="body">
          <p class="meta"><span class="kind"><app-icon [name]="s.icon" [size]="16" />{{ s.badge }}</span></p>
          @if (s.loading) { <p class="loading" role="status">{{ 'worldMap.hangout.info.loading' | t }}</p> }
          @if (s.tags.length) {
            <div class="tags">
              @for (tag of s.tags; track tag.label) {
                <span class="tag"><span class="tag-label">{{ tag.label }}</span><span class="tag-value">{{ tag.value }}</span></span>
              }
            </div>
          }
          @for (line of s.lines; track $index) { <p class="line">{{ line }}</p> }
        </div>
        <footer>
          <span class="foot-label">{{ 'worldMap.hangout.info.influence' | t }}</span>
          <span class="foot-value">{{ s.influence }} m</span>
        </footer>
      }
    </aside>
  `,
  styles: `
    :host { display: contents; }
    /* Lo stesso foglio degli altri pannelli a destra (token --side-panel-*); in basso lascia libera la colonna con la pillola, il Fixer e il Mercenario. */
    .sheet { --side-panel-reserve: 280px; position: absolute; z-index: 0; top: var(--side-panel-top); right: var(--hud-edge); max-height: calc(100% - var(--side-panel-top) - var(--side-panel-reserve)); width: var(--side-panel-w); box-sizing: border-box; display: flex; flex-direction: column; overflow-y: auto; background: var(--c-surface); border: 1px solid var(--c-you); border-radius: var(--radius-1); color: var(--c-text); font: 14px/1.4 var(--font-ui); transform: translateX(calc(100% + var(--hud-edge))); transition: transform var(--t-base) var(--ease-draw); }
    .sheet.open { transform: none; }
    .sheet:not(.open) { visibility: hidden; transition: transform var(--t-base) var(--ease-draw), visibility 0s linear var(--t-base); }
    @media (max-width: 640px) {
      .sheet { z-index: 4; top: auto; right: 0; bottom: 0; left: 0; width: auto; height: auto; max-height: 50%; overflow: hidden; padding-bottom: env(safe-area-inset-bottom); border-width: 1px 0 0; border-radius: 0; transform: translateY(100%); }
      .sheet.open { transform: none; }
      .body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
    }
    header { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 10px 10px 14px; }
    h2 { flex: 1; min-width: 0; margin: 0; font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.06em; text-transform: uppercase; }
    hr { flex: none; width: 100%; margin: 0; border: 0; border-top: 1px solid var(--c-you); }
    .close { flex: none; width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: none; color: var(--c-text-dim); cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast); }
    .close:hover, .close:focus-visible { color: var(--c-you); border-color: var(--c-you); outline: none; }
    .body { display: flex; flex-direction: column; align-items: stretch; gap: 10px; padding: 12px 14px 14px; }
    p { margin: 0; }
    .meta { display: flex; align-items: center; gap: 10px; }
    .kind { display: inline-flex; align-items: center; gap: 6px; color: var(--c-you); font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; }
    .line { color: var(--c-text); }
    /* I blocchetti città e quartiere, uno sotto l'altro a tutta larghezza: etichetta piccola in maiuscolo a sinistra e valore a destra sulla stessa riga, in verde, con gli angoli in alto a destra e in basso a sinistra arrotondati (come i badge). */
    /* Il testo del download in corso: lampeggia lentamente (con la riduzione del movimento resta fisso, attenuato). */
    .loading { color: var(--c-you); font-size: 13px; animation: loading-blink 1.8s ease-in-out infinite; }
    @keyframes loading-blink { 50% { opacity: 0.2; } }
    @media (prefers-reduced-motion: reduce) { .loading { animation: none; opacity: 0.7; } }
    .tags { display: flex; flex-direction: column; gap: 8px; }
    .tag { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; min-width: 0; padding: 8px 10px; border: 1px solid var(--c-you); border-radius: 0 var(--radius-2) 0 var(--radius-2); background: color-mix(in srgb, var(--c-you) 10%, transparent); }
    .tag-label { flex: none; color: var(--c-you); font: 600 10px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; }
    .tag-value { color: var(--c-text); font: 600 14px/1.2 var(--font-ui); text-align: right; overflow-wrap: anywhere; }
    /* Il piede: «Influenza» a sinistra e il valore in metri a destra, nel carattere del denaro. */
    footer { flex: none; position: sticky; bottom: 0; display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 10px 14px; background: var(--c-surface); border-top: 1px solid var(--c-you); }
    .foot-label { color: var(--c-text-dim); font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; }
    .foot-value { margin-left: auto; font: 700 14px/1 var(--font-mono); font-variant-numeric: tabular-nums; color: var(--c-you); }
  `,
})
export class HangoutInfoPanelComponent {
  /** Le info da mostrare; `null` chiude il pannello. */
  readonly info = input<HangoutInfo | null>(null);
  readonly closed = output<void>();

  protected readonly open = computed(() => !!this.info());
  /** Le ultime info aperte: restano scritte mentre il pannello scivola via. */
  protected readonly shown = signal<HangoutInfo | null>(null);

  constructor() {
    effect(() => {
      const i = this.info();
      if (i) this.shown.set(i); // chiuso: resta quello di prima
    });
  }
}

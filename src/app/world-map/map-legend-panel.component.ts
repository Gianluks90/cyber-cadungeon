import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import type { MessageKey } from '../i18n/i18n.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from '../ui/icon.component';
import { KeyLabelComponent } from '../ui/key-label.component';

/** Una riga della legenda: l'icona com'è sulla mappa, nel suo colore, e cosa significa. */
const ENTRIES: { icon: string; color: string; label: MessageKey }[] = [
  { icon: 'navigation', color: 'var(--c-you)', label: 'worldMap.legend.you' },
  { icon: 'contract', color: 'var(--c-interact)', label: 'worldMap.legend.contract' },
];

/**
 * La legenda della mappa: un tasto quadrato sotto quello dei filtri (lato sinistro) apre un pannello che scivola da sinistra come quello dei filtri e spiega le icone che compaiono
 * sulla mappa. Non conosce la mappa: serve solo a mostrare l'elenco.
 */
@Component({
  selector: 'app-map-legend-panel',
  imports: [IconComponent, KeyLabelComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <div class="wrap" [class.open]="open()">
      <div class="item">
        <button type="button" class="tab" [class.on]="open()" [attr.aria-expanded]="open()" [attr.aria-label]="(open() ? 'worldMap.legend.close' : 'worldMap.legend.open') | t" (click)="open.set(!open())">
          <app-icon name="help" [size]="20" />
          <kbd>L</kbd>
        </button>
        <app-key-label side="right">{{ 'worldMap.legend.title' | t }}</app-key-label>
      </div>
      <aside class="sheet" [attr.aria-label]="'worldMap.legend.title' | t">
        <header>
          <h2>{{ 'worldMap.legend.title' | t }}</h2>
          <button type="button" class="close" [attr.aria-label]="'worldMap.legend.close' | t" (click)="open.set(false)">
            <app-icon name="close" [size]="20" />
          </button>
        </header>
        <hr />
        <ul class="list">
          @for (e of entries; track e.icon) {
            <li class="row">
              <span class="glyph" [style.color]="e.color"><app-icon [name]="e.icon" [size]="24" /></span>
              <span class="name">{{ e.label | t }}</span>
            </li>
          }
        </ul>
      </aside>
    </div>
  `,
  styles: `
    :host { display: contents; }
    .wrap { --w: min(320px, 82vw); --rail: 56px; position: absolute; inset: 0; pointer-events: none; }
    /* Il tasto sta sotto quello dei filtri: quello è al centro del lato (36px) e qui si parte da metà più 18px più 10px di spazio. */
    .item { position: absolute; z-index: 3; left: 10px; top: calc(50% + 28px); }
    .tab, .close { position: relative; display: flex; align-items: center; justify-content: center; padding: 0; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: none; color: var(--c-text); cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast); }
    .tab { pointer-events: auto; width: 36px; height: 36px; border-color: var(--c-line-strong); background: var(--c-surface); }
    .close { width: 32px; height: 32px; color: var(--c-text-dim); }
    .tab:hover, .tab:focus-visible, .tab.on, .close:hover, .close:focus-visible { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
    /* Il pannello scivola da sinistra come quello dei filtri (stessa animazione e stessa origine, a metà altezza) ed è alto quanto basta. */
    .sheet { position: absolute; z-index: 2; left: var(--rail); top: 50%; max-height: calc(100% - 112px); width: var(--w); box-sizing: border-box; display: flex; flex-direction: column; pointer-events: auto; background: var(--c-surface); border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); transform: translate(calc(-1 * (var(--w) + var(--rail))), -50%); transition: transform var(--t-base) var(--ease-draw); }
    .wrap.open .sheet { transform: translate(0, -50%); }
    .wrap:not(.open) .sheet { visibility: hidden; transition: transform var(--t-base) var(--ease-draw), visibility 0s linear var(--t-base); }
    header { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 10px 10px 10px 14px; }
    h2 { margin: 0; font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.06em; text-transform: uppercase; }
    hr { flex: none; width: 100%; margin: 0; border: 0; border-top: 1px solid var(--c-line-strong); }
    kbd { display: none; position: absolute; right: 3px; bottom: 2px; font: 600 9px/1 var(--font-mono); text-transform: uppercase; color: var(--c-text-dim); pointer-events: none; }
    @media (pointer: fine) { kbd { display: block; } }
    .list { margin: 0; padding: 12px 14px 14px; list-style: none; display: flex; flex-direction: column; gap: 4px; }
    .row { display: flex; align-items: center; gap: 12px; padding: 8px 10px; border: 1px solid var(--c-line); border-radius: var(--radius-1); color: var(--c-text-dim); font: 600 12px/1.2 var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; }
    .glyph { display: inline-flex; flex: none; }
  `,
})
export class MapLegendPanelComponent {
  /** Il pannello è aperto: lo tiene la mappa (`[(open)]`), che ne lascia aperto uno solo alla volta. */
  readonly open = model(false);
  protected readonly entries = ENTRIES;

  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.open.set(false);
      return;
    }
    const target = e.target as HTMLElement | null;
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || target?.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key.toLowerCase() === 'l') this.open.update((v) => !v);
  }
}

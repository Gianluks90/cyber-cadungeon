import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import type { MessageKey } from '../i18n/i18n.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from '../ui/icon.component';
import { KeyLabelComponent } from '../ui/key-label.component';
import { FILTER_GROUPS, type FilterPreset, type FilterSection } from './map-filters';

const PRESETS: { id: FilterPreset; label: MessageKey }[] = [
  { id: 'all', label: 'worldMap.filter.presetAll' },
  { id: 'essential', label: 'worldMap.filter.presetEssential' },
  { id: 'custom', label: 'worldMap.filter.presetCustom' },
];

const SECTIONS: { id: FilterSection; label: MessageKey }[] = [
  { id: 'fixer', label: 'worldMap.filter.sectionFixer' },
  { id: 'map', label: 'worldMap.filter.sectionMap' },
  { id: 'names', label: 'worldMap.filter.sectionNames' },
  { id: 'poi', label: 'worldMap.filter.sectionPoi' },
];

/**
 * Il pannello dei filtri della mappa: un tasto quadrato in un container verticale lungo il lato sinistro lo apre (scivola da sinistra, accanto al container); dentro, un elenco di voci da spuntare
 * e i filtri pronti "Tutto" ed "Essenziale". Non conosce la mappa: riceve le voci accese e dice cosa viene toccato.
 */
@Component({
  selector: 'app-map-filter-panel',
  imports: [IconComponent, KeyLabelComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <div class="wrap" [class.open]="open()">
      <nav class="rail">
        <div class="item">
          <button type="button" class="tab" [class.on]="open()" [attr.aria-expanded]="open()" [attr.aria-label]="(open() ? 'worldMap.filter.close' : 'worldMap.filter.open') | t" (click)="open.set(!open())">
            <app-icon name="filter_list" [size]="20" />
            <kbd>F</kbd>
          </button>
          <app-key-label side="right">{{ 'worldMap.filter.title' | t }}</app-key-label>
        </div>
      </nav>
      <aside class="sheet" [attr.aria-label]="'worldMap.filter.title' | t">
        <header>
          <h2>{{ 'worldMap.filter.title' | t }}</h2>
          <button type="button" class="close" [attr.aria-label]="'worldMap.filter.close' | t" (click)="open.set(false)">
            <app-icon name="close" [size]="20" />
          </button>
        </header>
        <hr />
        <div class="config">
          <button type="button" class="step" [attr.aria-label]="'worldMap.filter.prev' | t" (click)="step(-1)">
            <app-icon name="chevron_left" [size]="20" />
            <kbd>Q</kbd>
          </button>
          <span class="config-name">{{ presetLabel() | t }}</span>
          <button type="button" class="step next" [attr.aria-label]="'worldMap.filter.next' | t" (click)="step(1)">
            <app-icon name="chevron_left" [size]="20" />
            <kbd>E</kbd>
          </button>
        </div>
        <div class="segments" aria-hidden="true">
          @for (p of presets; track p.id) {
            <span class="segment" [class.on]="preset() === p.id"></span>
          }
        </div>
        <hr />
        <div class="list">
          @for (section of sections; track section.id) {
            <p class="label">{{ section.label | t }}</p>
            @for (group of groupsOf(section.id); track group.id) {
              <button type="button" class="row" role="checkbox" [class.on]="enabled().has(group.id)" [class.locked]="group.locked" [attr.aria-checked]="enabled().has(group.id)" [disabled]="group.locked" (click)="toggled.emit(group.id)">
                <span class="box"></span>
                <span class="name">{{ group.label | t }}</span>
              </button>
            }
          }
        </div>
      </aside>
    </div>
  `,
  styles: `
    :host { display: contents; }
    .wrap { --w: min(320px, 82vw); --rail: 56px; position: absolute; inset: 0; z-index: 2; pointer-events: none; }
    /* Il container verticale lungo il lato sinistro: ospita i tasti quadrati. */
    .rail { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); z-index: 1; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
    .item { position: relative; }
    .tab, .close { display: flex; align-items: center; justify-content: center; padding: 0; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: none; color: var(--c-text); cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast); }
    .tab { position: relative; pointer-events: auto; width: 36px; height: 36px; border-color: var(--c-line-strong); background: var(--c-surface); }
    .close { width: 32px; height: 32px; color: var(--c-text-dim); }
    .tab:hover, .tab:focus-visible, .tab.on, .close:hover, .close:focus-visible { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
    /* Il pannello si apre accanto al container, scivolando da sinistra. */
    .sheet { position: absolute; left: var(--rail); top: 50%; max-height: calc(100% - 112px); /* parte da metà altezza, vicino ai tasti, e cresce dal centro fino a lasciare libero il logo (10+36px dall'alto) e l'orologio (10+36px dal fondo), con 10px di respiro */ width: var(--w); box-sizing: border-box; display: flex; flex-direction: column; pointer-events: auto; background: var(--c-surface); border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); transform: translate(calc(-1 * (var(--w) + var(--rail))), -50%); transition: transform var(--t-base) var(--ease-draw); }
    .wrap.open .sheet { transform: translate(0, -50%); }
    .wrap:not(.open) .sheet { visibility: hidden; transition: transform var(--t-base) var(--ease-draw), visibility 0s linear var(--t-base); }
    header { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 10px 10px 10px 14px; }
    h2 { margin: 0; font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.06em; text-transform: uppercase; }
    hr { flex: none; width: 100%; margin: 0; border: 0; border-top: 1px solid var(--c-line-strong); }
    .config { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px 10px; }
    .config-name { flex: 1 1 auto; text-align: center; font: 600 12px/1.2 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text); }
    .step { position: relative; width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: none; color: var(--c-text-dim); cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast); }
    .step:hover, .step:focus-visible { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
    .step.next app-icon { transform: scaleX(-1); }
    .segments { flex: none; display: flex; gap: 4px; padding: 0 14px 12px; }
    .segment { flex: 1 1 0; height: 3px; background: var(--c-line); transition: background var(--t-fast); }
    .segment.on { background: var(--c-interact); }
    /* La lettera del tasto, piccola e grigia in basso a destra, solo dove c'è una tastiera. */
    kbd { display: none; position: absolute; right: 3px; bottom: 2px; font: 600 9px/1 var(--font-mono); text-transform: uppercase; color: var(--c-text-dim); pointer-events: none; }
    @media (pointer: fine) { kbd { display: block; } }
    .tab, .step { position: relative; }
    .list { flex: 1 1 auto; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding: 12px 14px 14px; }
    .label { margin: 10px 0 4px; }
    .label:first-child { margin-top: 0; }
    .row { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: none; color: var(--c-text-dim); text-align: left; font: 600 12px/1.2 var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast), background var(--t-fast); }
    .row:disabled { cursor: default; }
    .row.locked { opacity: 0.45; }
    .row:not(:disabled):hover, .row:focus-visible { border-color: var(--c-line-strong); outline: none; }
    .row.on { color: var(--c-text); border-color: var(--c-interact); background: color-mix(in srgb, var(--c-interact) 10%, transparent); }
    .box { flex: none; width: 14px; height: 14px; box-sizing: border-box; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); }
    .row.on .box { border-color: var(--c-interact); background: var(--c-interact); }
  `,
})
export class MapFilterPanelComponent {
  /** Gli id dei gruppi accesi. */
  readonly enabled = input.required<ReadonlySet<string>>();
  readonly toggled = output<string>();
  /** Il filtro scelto. */
  readonly preset = input.required<FilterPreset>();
  readonly presetChosen = output<FilterPreset>();

  /** Il pannello è aperto: lo tiene la Home (`[(open)]`), che ne lascia aperto uno solo alla volta. */
  readonly open = model(false);
  protected readonly sections = SECTIONS;
  protected readonly presets = PRESETS;
  protected readonly presetLabel = computed<MessageKey>(() => PRESETS.find((p) => p.id === this.preset())!.label);

  protected groupsOf(section: FilterSection) {
    return FILTER_GROUPS.filter((g) => g.section === section && !g.fixed);
  }

  /** Passa alla configurazione precedente (-1) o successiva (+1), in giro; "Personalizzato" è l'ultimo. */
  protected step(dir: -1 | 1): void {
    const i = PRESETS.findIndex((p) => p.id === this.preset());
    const next = (i + dir + PRESETS.length) % PRESETS.length;
    this.presetChosen.emit(PRESETS[next].id);
  }

  protected onKey(e: KeyboardEvent): void {
    // Esc non deve mai far uscire dallo schermo intero (dove il browser lo permette): qui serve solo a chiudere il pannello.
    if (e.key === 'Escape') {
      e.preventDefault();
      this.open.set(false);
      return;
    }
    const target = e.target as HTMLElement | null;
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || target?.closest('input, textarea, select, [contenteditable]')) return;
    const key = e.key.toLowerCase();
    if (key === 'f') this.open.update((v) => !v);
    else if (this.open() && key === 'q') this.step(-1);
    else if (this.open() && key === 'e') this.step(1);
  }
}

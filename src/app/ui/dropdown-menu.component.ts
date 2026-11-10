import { ChangeDetectionStrategy, Component, ElementRef, inject, input, model, output } from '@angular/core';
import { IconComponent } from './icon.component';

/** Una voce della tendina: il testo è già tradotto da chi la usa. */
export interface DropdownItem {
  id: string;
  icon: string;
  label: string;
  disabled?: boolean;
}

/**
 * Una tendina con il tasto quadrato che la apre (angolo in alto a destra della pagina, genitore `position: relative`): sotto il tasto scende un pannello con un'intestazione
 * (il titolo a sinistra e, a destra, i tasti messi dentro `[dropdown-actions]`) e l'elenco delle voci. Si chiude con Esc, con un clic fuori o scegliendo una voce.
 * Non sa cosa fanno le voci: dice solo quale è stata scelta (`picked`).
 */
@Component({
  selector: 'app-dropdown-menu',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:pointerdown)': 'outside($event)', '(document:keydown)': 'onKey($event)' },
  template: `
    <button type="button" class="trigger" [class.on]="open()" [attr.aria-expanded]="open()" [attr.aria-label]="label()" [title]="label()" (click)="open.set(!open())">
      <app-icon [name]="icon()" [size]="20" />
      @if (hotkey()) { <kbd>{{ hotkey() }}</kbd> }
    </button>
    <div class="sheet" [class.open]="open()">
      <header>
        <h2>{{ title() }}</h2>
        <div class="actions"><ng-content select="[dropdown-actions]" /></div>
      </header>
      <hr />
      <div class="list" role="menu">
        @for (item of items(); track item.id) {
          <button type="button" class="item" role="menuitem" [disabled]="item.disabled" (click)="pick(item)">
            <app-icon [name]="item.icon" [size]="18" />
            <span>{{ item.label }}</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    :host { position: absolute; top: 10px; right: 10px; z-index: 3; }
    /* La lettera del tasto, piccola e grigia in basso a destra, solo dove c'è una tastiera (come sul tasto dei filtri). */
    kbd { display: none; position: absolute; right: 3px; bottom: 2px; font: 600 9px/1 var(--font-mono); text-transform: uppercase; color: var(--c-text-dim); pointer-events: none; }
    @media (pointer: fine) { kbd { display: block; } }
    .trigger { position: relative; width: 36px; height: 36px; padding: 0; display: flex; align-items: center; justify-content: center; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); background: var(--c-surface); color: var(--c-text); cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast); }
    .trigger:hover, .trigger:focus-visible, .trigger.on { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
    /* Il pannello (.sheet, non .panel: quella è una classe globale con il suo padding) è lo stesso dei filtri (stessi spazi, stessa intestazione, stesse righe, stesso scorrimento) ma dal lato destro, sotto il tasto. */
    .sheet { --w: min(320px, 82vw); position: absolute; top: 46px; right: 0; width: var(--w); box-sizing: border-box; display: flex; flex-direction: column; background: var(--c-surface); border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); transform: translateX(calc(var(--w) + 20px)); transition: transform var(--t-base) var(--ease-draw); }
    .sheet.open { transform: none; }
    .sheet:not(.open) { visibility: hidden; transition: transform var(--t-base) var(--ease-draw), visibility 0s linear var(--t-base); }
    header { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 10px 10px 10px 14px; }
    h2 { margin: 0; font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.06em; text-transform: uppercase; }
    .actions { display: flex; align-items: center; gap: 8px; }
    hr { flex: none; width: 100%; margin: 0; border: 0; border-top: 1px solid var(--c-line-strong); }
    .list { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px 14px; }
    .item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: none; color: var(--c-text-dim); text-align: left; font: 600 12px/1.2 var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast), background var(--t-fast); }
    .item:disabled { cursor: default; opacity: 0.45; }
    .item:not(:disabled):hover, .item:focus-visible { color: var(--c-text); border-color: var(--c-interact); background: color-mix(in srgb, var(--c-interact) 10%, transparent); outline: none; }
  `,
})
export class DropdownMenuComponent {
  /** Il nome del tasto che apre la tendina (per lo schermo e il suggerimento). */
  readonly label = input.required<string>();
  /** Il titolo nell'intestazione. */
  readonly title = input.required<string>();
  readonly items = input.required<readonly DropdownItem[]>();
  readonly icon = input('menu');
  readonly picked = output<string>();
  /** La tendina è aperta: chi la usa può tenerla in mano (`[(open)]`), per esempio per chiuderla quando se ne apre un'altra. */
  readonly open = model(false);
  /** La lettera che la apre e la chiude da tastiera (per esempio `m`); senza, nessuna scorciatoia. */
  readonly hotkey = input<string | null>(null);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected pick(item: DropdownItem): void {
    this.open.set(false);
    this.picked.emit(item.id);
  }

  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.open.set(false);
      return;
    }
    const key = this.hotkey();
    const target = e.target as HTMLElement | null;
    if (!key || e.key.toLowerCase() !== key.toLowerCase() || e.ctrlKey || e.metaKey || e.altKey || e.repeat || target?.closest('input, textarea, select, [contenteditable]')) return;
    this.open.update((v) => !v);
  }

  protected outside(e: PointerEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
  }
}

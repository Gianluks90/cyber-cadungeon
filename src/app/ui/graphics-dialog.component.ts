import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { GRAPHICS_PRESETS, graphics, presetOf, type GraphicsOptions, type GraphicsPreset } from '../game/graphics-settings';
import { translate as t } from '../i18n/i18n.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { CheckboxComponent } from './checkbox.component';
import { DialogComponent } from './dialog.component';
import { FieldComponent } from './field.component';
import { SelectComponent, type SelectOption } from './select.component';

const RESOLUTIONS: SelectOption[] = [
  { value: 'low', get label() { return t('graphics.resLow'); } },
  { value: 'normal', get label() { return t('graphics.resNormal'); } },
  { value: 'high', get label() { return t('graphics.resHigh'); } },
];

/**
 * "Grafica" (home, tasto Impostazioni): su un computer con poca memoria alcune scelte alleggeriscono molto. Tre modalità pronte (Leggera, Normale, Massima) e, sotto, le singole voci
 * (`game/graphics-settings.ts`): se si regola una voce a mano la modalità diventa "Personalizzata". La scelta si salva nel localStorage e vale dalla prossima scena che si apre.
 */
@Component({
  selector: 'app-graphics-dialog',
  imports: [TranslatePipe, DialogComponent, FieldComponent, CheckboxComponent, SelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <app-dialog [title]="'graphics.title' | t" width="min(480px, 100%)" (closed)="cancel.emit()">
        <div class="presets" role="radiogroup" [attr.aria-label]="'graphics.preset' | t">
          @for (p of presets; track p) {
            <button type="button" role="radio" class="opt" [class.on]="preset() === p" [attr.aria-checked]="preset() === p" (click)="draft.set({ ...presetValues[p] })">{{ (p === 'low' ? 'graphics.low' : p === 'normal' ? 'graphics.normal' : 'graphics.high') | t }}</button>
          }
        </div>
        <app-field [label]="'graphics.resolution' | t">
          <app-select class="block" [options]="resolutions" [value]="draft().resolution" [label]="'graphics.resolution' | t" (changed)="patch({ resolution: $any($event) })" />
        </app-field>
        <app-checkbox [checked]="draft().antialias" (changed)="patch({ antialias: $event })">{{ 'graphics.antialias' | t }}</app-checkbox>
        <app-checkbox [checked]="draft().hatch" (changed)="patch({ hatch: $event })">{{ 'graphics.hatch' | t }}</app-checkbox>
        <app-checkbox [checked]="draft().scenery" (changed)="patch({ scenery: $event })">{{ 'graphics.scenery' | t }}</app-checkbox>
        <app-checkbox [checked]="draft().animations" (changed)="patch({ animations: $event })">{{ 'graphics.animations' | t }}</app-checkbox>
        <small class="dlg-hint">{{ 'graphics.hint' | t }}</small>
        @if (preset() === 'custom') { <small dialogFooterStart class="dlg-hint custom">{{ 'graphics.custom' | t }}</small> }
        <ng-container dialogFooter>
          <button type="button" class="dlg-btn primary" (click)="confirmed.emit(draft())">{{ 'common.confirm' | t }}</button>
        </ng-container>
      </app-dialog>
    }
  `,
  styles: `
    :host { display: contents; }
    app-dialog { display: block; }
    /* Un solo contenitore con le tre modalità: quella scelta ha lo sfondo più azzurro. */
    .presets { display: grid; grid-template-columns: repeat(3, 1fr); margin-bottom: 4px; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); overflow: hidden; }
    .opt { padding: 10px 8px; border: 0; border-left: 1px solid var(--c-line-strong); background: none; color: var(--c-text-dim); font: 600 12px/1.2 var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: color var(--t-fast), background var(--t-fast); }
    .opt:first-child { border-left: 0; }
    .opt:hover, .opt:focus-visible { color: var(--c-text); outline: none; }
    .opt.on { color: var(--c-text); background: color-mix(in srgb, var(--c-interact) 22%, transparent); }
    .custom { margin: 0; }
    .opt:focus-visible { box-shadow: inset 0 0 0 1px var(--c-interact); }
    app-checkbox, app-field { margin-top: 12px; }
  `,
})
export class GraphicsDialogComponent {
  readonly open = input(false);
  readonly confirmed = output<GraphicsOptions>();
  readonly cancel = output<void>();

  protected readonly presets: GraphicsPreset[] = ['low', 'normal', 'high'];
  protected readonly presetValues = GRAPHICS_PRESETS;
  protected readonly resolutions = RESOLUTIONS;
  protected readonly draft = signal<GraphicsOptions>(graphics());
  protected readonly preset = computed(() => presetOf(this.draft()));

  constructor() {
    effect(() => {
      if (this.open()) this.draft.set({ ...graphics() });
    });
  }

  protected patch(p: Partial<GraphicsOptions>) {
    this.draft.update((d) => ({ ...d, ...p }));
  }
}

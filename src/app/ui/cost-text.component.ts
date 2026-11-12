import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CostKind, costSegments } from './cost-text';
import { IconComponent } from './icon.component';

/** Le icone dei valori: impronte (movimento), speed (overclock) e teschio (Odio). */
const ICONS: Record<CostKind, string> = { mov: 'footprint', overclock: 'speed', alarm: 'skull' };

/** Un testo in cui i valori sono numero e icona: `{mov:N}` con le impronte gialle, `{overclock:N}` con la icona speed, `{alarm:N}` con il teschio rosso; senza numero solo l'icona. */
@Component({
  selector: 'app-cost-text',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (s of segments(); track $index) { @if ('kind' in s) { <span class="cost" [class.overclock]="s.kind === 'overclock'" [class.alarm]="s.kind === 'alarm'">@if (s.n === null) { <app-icon [name]="iconOf(s.kind)" [size]="sizeOf(s.kind)" /> } @else { @if (!numberFirst()) { <app-icon [name]="iconOf(s.kind)" [size]="sizeOf(s.kind)" /> }{{ s.n }}@if (numberFirst()) { <app-icon [name]="iconOf(s.kind)" [size]="sizeOf(s.kind)" /> } }</span> } @else { {{ s.text }} } }`,
  styles: `
    :host { display: inline; }
    .cost { display: inline-flex; align-items: center; gap: var(--cost-gap, 3px); vertical-align: -2px; color: var(--c-move); font-weight: 600; font-variant-numeric: tabular-nums; }
    .cost.overclock { color: var(--c-overclock); }
    .cost.alarm { color: var(--c-alarm); }
    /* L'icona speed occupa meno altezza delle altre: è più grande, con margini negativi perché non allarghi la riga. */
    .cost.overclock app-icon { margin-block: -2px; }
  `,
})
export class CostTextComponent {
  readonly text = input.required<string>();
  /** Nelle frasi descrittive (carte, abilità) il valore viene prima dell'icona ("spendere 3 💧"); nei bottoni e nelle notizie l'icona sta prima del valore. */
  readonly numberFirst = input(false);
  protected readonly segments = computed(() => costSegments(this.text()));
  protected iconOf(kind: CostKind): string {
    return ICONS[kind];
  }
  protected sizeOf(kind: CostKind): number {
    return kind === 'overclock' ? 18 : 14;
  }
}
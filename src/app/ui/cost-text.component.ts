import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CostKind, costSegments } from './cost-text';
import { IconComponent } from './icon.component';

/** Le icone dei valori: impronte (movimento), speed (overclock), teschio (Odio), scudo (armatura), snowflake (ICE) e cuore (salute); la gittata non ha icona, solo numero e nome (salute). */
const ICONS: Record<CostKind, string | null> = { mov: 'footprint', overclock: 'speed', alarm: 'skull', armor: 'shield', ice: 'ac_unit', range: null, health: 'favorite' };

/** Un testo in cui i valori sono numero e icona (e, se scritto, il nome del parametro), ognuno nel colore del suo parametro; senza numero solo l'icona. Il `**grassetto**` si vede. */
@Component({
  selector: 'app-cost-text',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (s of segments(); track $index) { @if ('kind' in s) { <span class="cost" [attr.data-kind]="s.kind">@if (s.n === null) { @if (iconOf(s.kind)) { <app-icon [name]="iconOf(s.kind)!" [size]="sizeOf(s.kind)" /> } } @else { @if (!numberFirst()) { @if (iconOf(s.kind)) { <app-icon [name]="iconOf(s.kind)!" [size]="sizeOf(s.kind)" /> } }{{ s.plus ? '+' : '' }}{{ s.n }}@if (numberFirst()) { @if (iconOf(s.kind)) { <app-icon [name]="iconOf(s.kind)!" [size]="sizeOf(s.kind)" /> } } }@if (s.label) { <span class="pname">{{ s.label }}</span> }</span> } @else if (s.bold) { <strong>{{ s.text }}</strong> } @else { {{ s.text }} } }`,
  styles: `
    :host { display: inline; }
    .cost { display: inline-flex; align-items: center; gap: var(--cost-gap, 3px); vertical-align: baseline; color: var(--c-move); font-weight: 600; font-variant-numeric: tabular-nums; }
    .cost[data-kind='overclock'] { color: var(--c-overclock); }
    .cost[data-kind='alarm'] { color: var(--c-alarm); }
    .cost[data-kind='armor'] { color: var(--c-armor); }
    .cost[data-kind='ice'] { color: var(--c-ice); }
    .cost[data-kind='range'] { color: var(--c-die-ranged); }
    .cost[data-kind='health'] { color: var(--c-life); }
    /* L'icona speed occupa meno altezza delle altre: è più grande, con margini negativi perché non allarghi la riga. */
    .cost[data-kind='overclock'] app-icon { margin-block: -2px; }
    strong { font-weight: 700; color: var(--c-text); }
  `,
})
export class CostTextComponent {
  readonly text = input.required<string>();
  /** Nelle frasi descrittive (carte, abilità) il valore viene prima dell'icona ("spendere 3 💧"); nei bottoni e nelle notizie l'icona sta prima del valore. */
  readonly numberFirst = input(false);
  protected readonly segments = computed(() => costSegments(this.text()));
  protected iconOf(kind: CostKind): string | null {
    return ICONS[kind];
  }
  protected sizeOf(kind: CostKind): number {
    return kind === 'overclock' ? 18 : 14;
  }
}
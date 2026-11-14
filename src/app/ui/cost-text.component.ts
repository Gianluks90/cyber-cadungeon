import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CostKind, costSegments } from './cost-text';
import { IconComponent } from './icon.component';

/** Le icone dei valori: impronte (movimento), speed (overclock), teschio (Odio), scudo (armatura), snowflake (ICE) e cuore (salute); la gittata non ha icona, solo numero e nome (salute). */
const ICONS: Record<CostKind, string | null> = { mov: 'footprint', overclock: 'speed', alarm: 'skull', armor: 'shield', ice: 'ac_unit', range: null, health: 'favorite', spark: 'bolt', die: 'deployed_code', stun: 'stun', burn: 'burn' };

/** Un testo in cui i valori sono numero e icona (e, se scritto, il nome del parametro), ognuno nel colore del suo parametro; senza numero solo l'icona. Il `**grassetto**` si vede. */
@Component({
  selector: 'app-cost-text',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (s of segments(); track $index) { @if ('kind' in s) { <span class="cost" [class.solo]="s.n === null" [attr.data-kind]="s.kind" [style.color]="dieColor(s.kind, s.label)">@if (s.n === null) { @if (iconOf(s.kind)) { <app-icon [name]="iconOf(s.kind)!" [size]="sizeOf(s.kind)" /> } } @else if (s.kind === 'spark') { {{ s.plus ? '+' : '' }}@for (b of times(s.n); track b) { <app-icon [name]="iconOf(s.kind)!" [size]="sizeOf(s.kind)" /> } } @else { @if (!numberFirst()) { @if (iconOf(s.kind)) { <app-icon [name]="iconOf(s.kind)!" [size]="sizeOf(s.kind)" /> } }{{ s.plus ? '+' : '' }}{{ s.n }}@if (numberFirst()) { @if (iconOf(s.kind)) { <app-icon [name]="iconOf(s.kind)!" [size]="sizeOf(s.kind)" /> } } }@if (s.label && s.kind !== 'die') { <span class="pname">{{ s.label }}</span> }</span> } @else if (s.bold) { <strong>{{ s.text }}</strong> } @else { {{ s.text }} } }`,
  styles: `
    :host { display: inline; }
    .cost { display: inline-flex; align-items: center; gap: var(--cost-gap, 3px); vertical-align: baseline; color: var(--c-move); font-weight: 600; font-variant-numeric: tabular-nums; }
    /* Solo l'icona, dopo una parola ("l'overclock ⚡ al massimo"): si centra sul testo invece di appoggiarsi alla linea di base. */
    .cost.solo { vertical-align: middle; }
    .cost[data-kind='overclock'] { color: var(--c-overclock); }
    .cost[data-kind='alarm'] { color: var(--c-alarm); }
    .cost[data-kind='armor'] { color: var(--c-armor); }
    .cost[data-kind='ice'] { color: var(--c-ice); }
    /* La gittata non ha colore: numero e nome come testo normale (come il danno). */
    .cost[data-kind='range'] { color: inherit; font-weight: inherit; }
    .cost[data-kind='health'] { color: var(--c-life); }
    /* I fulmini si centrano sulla riga di testo (non appoggiati alla linea di base, dove sporgono in alto). */
    .cost[data-kind='spark'] { color: var(--c-text); gap: 0; vertical-align: middle; }
    .cost[data-kind='stun'] { color: var(--c-stun); }
    .cost[data-kind='burn'] { color: var(--c-burn); }
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
  /** Il colore di un dado (il nome del colore è la scritta dopo la barra). */
  protected dieColor(kind: CostKind, label: string | null): string | null {
    return kind === 'die' && label ? `var(--cad-die-${label})` : null;
  }
  protected times(n: number): number[] {
    return Array.from({ length: Math.max(0, n) }, (_, i) => i);
  }
  protected iconOf(kind: CostKind): string | null {
    return ICONS[kind];
  }
  protected sizeOf(kind: CostKind): number {
    return kind === 'overclock' ? 18 : kind === 'spark' ? 13 : kind === 'die' ? 16 : 14;
  }
}
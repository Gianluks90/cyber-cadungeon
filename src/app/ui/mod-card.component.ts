import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ModDef, modTag } from '../game/mods/mod';
import { money } from '../game/money';
import { CatalogTextPipe } from '../i18n/catalog-text.pipe';
import { TrPipe } from '../i18n/tr.pipe';
import { TranslatePipe } from '../i18n/translate.pipe';
import { CostTextComponent } from './cost-text.component';

/**
 * La card di una mod, con lo stile della card oggetto: intestazione con nome e sottotitolo («Mod per Arma · mischia») su un fondo azzurro appena visibile, ciò che aggiunge («Aggiunge: …»)
 * e un piede con il prezzo a sinistra e i tasti a destra (arrivano da fuori, come per gli oggetti). La usano il negozio del Briefing e il catalogo.
 */
@Component({
  selector: 'app-mod-card',
  imports: [CatalogTextPipe, CostTextComponent, TrPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card" [class.on]="on()" [class.hack]="isHacking()">
      <header class="head">
        <div class="titles">
          <h4>{{ mod().name }}</h4>
          <span class="meta">{{ 'Mod per {tag}' | tr: { tag: tag() } }}</span>
        </div>
      </header>
      <section class="skills">
        <!-- «Aggiunge:» e le aggiunte di seguito: una virgola azzurra tra l'una e l'altra e una «e» azzurra prima dell'ultima. -->
        <div class="adds">
          <span class="lead">{{ 'Aggiunge:' | tr }}</span>{{ ' ' }}
          @for (e of mod().effect; track $index) {
            @if ($index > 0) {
              @if ($last) { {{ ' ' }}<span class="lead">{{ 'e' | tr }}</span>{{ ' ' }} } @else { <span class="lead">,</span>{{ ' ' }} }
            }
            <app-cost-text [text]="e | ct" [numberFirst]="true" />
          }
        </div>
        @if (left(); as n) { <div class="line stock">{{ (n === 1 ? 'shop.stockOne' : 'shop.stockMany') | t: { n } }}</div> } @else if (left() === 0) { <div class="line stock">{{ 'shop.stockMany' | t: { n: 0 } }}</div> }
      </section>
      <footer class="foot">
        <span class="price" [title]="'Valore' | tr">{{ money(mod().cost) }}</span>
        <div class="actions"><ng-content /></div>
      </footer>
    </article>
  `,
  styles: `
    :host { display: block; color: var(--c-text); font: 13px/1.35 var(--font-ui); }
    .card { position: relative; box-sizing: border-box; height: 100%; display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border-radius: var(--radius-1); border: 1px solid var(--c-line-strong); background: var(--c-bg); }
    .card.on { border-color: var(--c-interact); }
    /* Le mod hacking hanno il bordo hot pink, il colore degli slot hacking (anche da montata). */
    .card.hack, .card.hack.on { border-color: var(--c-hacking); }
    /* E dentro: lo sfondo dell'intestazione e il testo in evidenza («Aggiunge:», virgole, «e») passano da azzurro a hot pink. */
    .card.hack .head { background: color-mix(in srgb, var(--c-hacking) 7%, transparent); }
    .card.hack .lead { color: var(--c-hacking); }
    .head { display: flex; align-items: center; gap: 12px; margin: -14px -16px 0; padding: 12px 16px; background: color-mix(in srgb, var(--c-interact) 7%, transparent); border-bottom: 1px solid var(--c-line); border-radius: calc(var(--radius-1) - 1px) calc(var(--radius-1) - 1px) 0 0; }
    .titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    h4 { margin: 0; font: 600 var(--fs-md)/1.2 var(--font-display); }
    .meta { color: var(--c-text-dim); font-size: 12px; }
    .skills { display: flex; flex-direction: column; gap: 4px; }
    .line { display: flex; align-items: center; gap: 6px; font-size: 12px; }
    .lead { color: var(--c-interact); }
    .adds { font-size: 12px; line-height: 1.5; }
    .stock { color: var(--c-interact); font-variant-numeric: tabular-nums; }
    .foot { margin: auto -16px -14px; display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 10px 16px; border-top: 1px solid var(--c-line); }
    .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .price { margin-right: auto; display: inline-flex; align-items: center; gap: 4px; font: 15px var(--font-mono); font-variant-numeric: tabular-nums; color: var(--cad-coin); }
  `,
})
export class ModCardComponent {
  protected readonly money = money;
  readonly mod = input.required<ModDef>();
  /** Quanti pezzi restano nel negozio (se si sa). */
  readonly left = input<number | undefined>(undefined);
  /** La mod è montata: il bordo diventa azzurro. */
  readonly on = input(false);
  protected isHacking(): boolean {
    return !!this.mod().tags?.includes('hacking');
  }
  protected tag(): string {
    return modTag(this.mod());
  }
}

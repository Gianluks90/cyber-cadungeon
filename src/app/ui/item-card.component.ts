import { catalogText, tr } from '../i18n/catalog-text';
import { money } from '../game/money';
import { TrPipe } from '../i18n/tr.pipe';
import { CatalogTextPipe } from '../i18n/catalog-text.pipe';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DiceService } from '../game/dice/dice.service';
import { ItemDef, itemGroup } from '../game/items/item';
import { CostTextComponent } from './cost-text.component';
import { IconComponent } from './icon.component';

/** I nomi dei dadi di un oggetto. */
const DIE_NAMES: Record<string, string> = { get red() { return tr('dado rosso'); }, get green() { return tr('dado verde'); }, get blue() { return tr('dado blu'); }, get yellow() { return tr('dado giallo'); }, get white() { return tr('dado bianco'); } };

/**
 * La card di un oggetto, usata nell'inventario e nel negozio: icona, nome, tipo e mani, i dadi in alto a destra come cubi colorati (uno per colore), le abilità a tutta larghezza (fulmini e effetto affiancati) e un piede con le azioni a sinistra e il valore a destra.
 * La descrizione c'è nel modello ma non si mostra. Le azioni (equipaggia, compra...) arrivano da fuori.
 */
@Component({
  selector: 'app-item-card',
  imports: [TrPipe, CatalogTextPipe, CostTextComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card" [class.plain]="plain()">
      <header class="head">
        <div class="titles">
          <h4>{{ def().name }}@if (count()) { <span class="count">({{ count() }})</span> }</h4>
          @if (detail()) { <span class="meta">{{ detail() }}</span> }
        </div>
        @if (def().dice?.length) {
          <button type="button" class="cubes dice" [title]="'Tira i dadi dell\\'oggetto (prova temporanea)' | tr" (click)="rollDice()">
            @for (d of def().dice; track $index) { <app-icon name="deployed_code" [size]="22" [style.color]="dieColor(d)" [title]="dieName(d)" /> }
          </button>
        }
        @if (ice() > 0) {
          <span class="ice" [title]="'ICE: armatura digitale contro le Intrusioni' | tr"><app-icon name="ac_unit" [size]="20" />{{ ice() }}</span>
        }
      </header>

      @if (def().levelLabel && def().levelMax) {
        <div class="level" [title]="'L\\'oggetto cresce: i valori della carta sono quelli del livello di adesso' | tr">{{ def().levelLabel! | ct }}: <b>{{ def().level }}/{{ def().levelMax }}</b></div>
      }

      @if (passives().length || def().spark?.length || def().offHand) {
        <section class="skills">
          <h5>{{ 'Abilità' | tr }}</h5>
          <!-- Prima le passive (armatura, velocità massima, ICE, regole), poi quelle da attivare con le scintille. -->
          @for (p of passives(); track $index) {
            <div class="line"><span class="what"><app-cost-text [text]="p" [numberFirst]="true" /></span></div>
          }
          @for (s of def().spark ?? []; track $index) {
            <div class="line" [title]="'Spendi {n} scintille per questo effetto' | tr: { n: s.cost }">
              <span class="cubes">@for (n of cubes(s.cost); track n) { <app-icon name="bolt" [size]="16" /> }</span>
              <span class="what"><app-cost-text [text]="s.effect | ct" [numberFirst]="true" /></span>
            </div>
          }
          @if (def().offHand) {
            <div class="line" [title]="'Con due armi da mischia a una mano, quella con cui non attacchi aggiunge questo bonus all\\'attacco dell\\'altra (si applicherà con il combattimento)' | tr">
              <span class="what">{{ 'Bonus di supporto {bonus}' | tr: { bonus: (def().offHand! | ct) } }}</span>
            </div>
          }
        </section>
      }

      <!-- Facoltativo: un blocco di testo proprio (per esempio l'effetto di un consumabile), che chi usa la card scrive e stila. -->
      <ng-content select="[cardBody]" />

      <!-- Le mod montate sull'oggetto (solo se ne ha), con ciò che fanno. -->
      @if (def().mods?.length) {
        <section class="skills">
          <h5>{{ 'Mod' | tr }}</h5>
          @for (m of def().mods ?? []; track m.id) {
            <div class="line"><span class="what"><b>{{ m.name }}</b> · {{ m.text | ct }}</span></div>
          }
        </section>
      }

      <footer class="foot">
        @if ((price() ?? def().price) > 0) { <span class="price" [title]="'Valore' | tr">{{ money(price() ?? def().price) }}</span> }
        <div class="actions"><ng-content /></div>
      </footer>
    </article>
  `,
  styles: `
    :host { display: block; color: var(--c-text); font: 13px/1.35 var(--font-ui); }
    .level { font: 600 11px/1.2 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    .level b { color: var(--c-interact); font-family: var(--font-mono); }
    .card { position: relative; box-sizing: border-box; height: 100%; display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border-radius: var(--radius-1); border: 1px solid var(--c-line-strong); background: var(--c-bg); }
    /* Senza i tasti (come nel catalogo) il piede non ha il divisorio */
    .plain .foot { margin: auto 0 0; border-top: 0; padding: 0; }
    .head { display: flex; align-items: center; gap: 12px; }
    .ice { flex: none; display: inline-flex; align-items: center; gap: 3px; color: var(--c-ice); font: 700 14px/1 var(--font-mono); }
    .count { margin-left: 6px; color: var(--c-text-dim); font-weight: 400; }
    .titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    h4 { margin: 0; font: 600 var(--fs-md)/1.2 var(--font-display); }
    .meta { color: var(--c-text-dim); font-size: 12px; }
    .skills { display: flex; flex-direction: column; gap: 4px; }
    .line { display: flex; align-items: center; gap: 6px; font-size: 12px; }
    .line .what { min-width: 0; }
    .cubes { display: inline-flex; align-items: center; gap: 1px; }
    h5 { margin: 0; font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    .dice { flex: none; gap: 2px; padding: 0; border: 0; background: none; cursor: pointer; }
    /* Il piede è una fascia: il filetto arriva ai bordi laterali e il prezzo sta a sinistra e i tasti a destra. */
    .foot { margin: auto -16px -14px; /* sempre sul fondo della card, anche quando la riga la allunga */ display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 10px 16px; border-top: 1px solid var(--c-line); }
    .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .price { margin-right: auto; display: inline-flex; align-items: center; gap: 4px; font: 15px var(--font-mono); font-variant-numeric: tabular-nums; color: var(--cad-coin); }
  `,
})
export class ItemCardComponent {
  protected readonly money = money;
  private readonly dice = inject(DiceService);
  readonly def = input.required<ItemDef>();
  /** Quante copie ne ha chi guarda (comprate, nel negozio): compare tra parentesi accanto al nome. */
  readonly count = input(0);
  /** L'ICE base: la somma degli effetti `ice` dei cyberdeck (le altre fonti di ICE restano abilità scritte). */
  /** Le abilità passive, a testo con i valori (`{armor:+2|Armatura}`): ciò che dà l'oggetto da equipaggiato (armatura, velocità massima, ICE) e le sue regole scritte. */
  protected readonly passives = computed<string[]>(() => {
    const d = this.def();
    const out: string[] = [];
    if (d.armor) out.push(`{armor:+${d.armor}|${tr('Armatura')}}`);
    if (d.speedCap !== undefined) out.push(tr('Velocità massima {mov}', { mov: `{mov:${d.speedCap}}` }));
    const ice = this.iceOf();
    if (ice > 0 && itemGroup(d) !== 'deck') out.push(`{ice:+${ice}|ICE}`);
    for (const r of d.rules ?? []) out.push(catalogText(r));
    return out;
  });
  private iceOf(): number {
    return (this.def().effects ?? []).reduce((n, e) => (e.kind === 'stat' && e['stat'] === 'ice' ? n + Number(e['amount']) : n), 0);
  }
  protected readonly ice = computed(() => (itemGroup(this.def()) === 'deck' ? this.iceOf() : 0));
  /** La riga con il tipo e le mani. */
  readonly detail = input('');
  /** Il prezzo da mostrare, se diverso da quello della carta (per esempio quando si vende). */
  readonly price = input<number | null>(null);
  /** Senza il divisorio sopra il piede (il catalogo non ha azioni). */
  readonly plain = input(false);

  /** Prova temporanea: toccare i dadi della card li tira. */
  protected rollDice() {
    void this.dice.rollItem(this.def().name, this.def().dice ?? []);
  }

  protected dieColor(d: string): string | null {
    return d in DIE_NAMES ? `var(--cad-die-${d})` : null;
  }

  protected dieName(d: string): string {
    return DIE_NAMES[d] ?? d;
  }

  protected cubes(n: number): number[] {
    return Array.from({ length: Math.max(0, n) }, (_, i) => i);
  }
}

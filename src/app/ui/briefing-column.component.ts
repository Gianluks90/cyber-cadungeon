import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MercenarySheet } from '../game/mercenaries/mercenary-sheet';
import { ItemDef } from '../game/items/item';
import { Loadout, ShopData } from '../game/mercenaries/party-setup';
import { modsCost } from '../game/mods/mod';
import { SkillDef } from '../game/skills/skill';
import { CatalogTextPipe } from '../i18n/catalog-text.pipe';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from './icon.component';
import { PregameShopDialogComponent } from './pregame-shop-dialog.component';

/**
 * Una colonna del Briefing, per un mercenario: il token quadrato (solo nome e classe: i parametri si vedono nel negozio), il budget che resta, la fornitura iniziale (con un errore rosso se il catalogo non la dà) e il badge «Pronto» sul token.
 * Un clic sul token apre il negozio del Briefing (mod, pozioni, oggetti) dello stesso mercenario.
 */
@Component({
  selector: 'app-briefing-column',
  imports: [CatalogTextPipe, IconComponent, NgTemplateOutlet, PregameShopDialogComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="frame">
    <button type="button" class="token" [disabled]="!shop()" [attr.aria-label]="'briefing.openShop' | t: { name: mercenary().name }" [title]="'briefing.openShop' | t: { name: mercenary().name }" (click)="openShop()">
      <img [src]="mercenary().portrait" [alt]="mercenary().name" />
      <span class="cap">
        <b>{{ mercenary().name }}</b><span class="role">{{ mercenary().class | ct }}</span>
      </span>
    </button>
    <!-- Il budget è un badge a cavallo del bordo in alto a destra (fuori dal token, che ritaglia). -->
    <span class="budget" [title]="'briefing.budget' | t">{{ 'briefing.amount' | t: { n: budgetLeft() } }}</span>
    <!-- «Pronto»: un badge con la spunta in alto a sinistra, specchio del budget. Diventa verde quando è premuto. -->
    <button type="button" class="ready" [class.on]="ready()" [class.off]="!visited()" [attr.aria-disabled]="visited() ? null : 'true'" [attr.aria-pressed]="ready()" [attr.aria-label]="'briefing.ready' | t" [title]="(visited() ? 'briefing.ready' : 'briefing.readyLocked') | t: { name: mercenary().name }" (click)="toggleReady()"><app-icon name="check" [size]="18" /></button>
    </div>

    <!-- Il contenuto di una card oggetto: la usano la fornitura iniziale e l'inventario. -->
    <ng-template #gearCard let-i let-hands="hands">
      <span class="slots" [title]="'briefing.slotsOf' | t: { n: i.slots ?? 0 }">@for (n of dots(i.slots); track $index) { <i [class.hack]="i.modTags?.includes('hacking')"></i> }</span>
      <span class="what"><b>{{ i.name }}</b><small>{{ categoryKey(i) | t }}</small></span>
      @if (hands && i.hands > 0) {
        <span class="hands" [title]="'briefing.handsOf' | t: { n: i.hands }">@for (n of dots(i.hands); track $index) { <app-icon class="hand" [name]="'back_hand'" [size]="14" /> }</span>
      }
    </ng-template>

    <section class="kit" [attr.aria-label]="'briefing.kit' | t">
      @if (kit().length) {
        <h3>{{ 'briefing.kit' | t }}</h3>
        <hr />
        <ul>
          @for (i of kit(); track i.id) {
            <li class="gear"><ng-container [ngTemplateOutlet]="gearCard" [ngTemplateOutletContext]="{ $implicit: i, hands: false }" /></li>
          }
        </ul>
      } @else {
        <p class="error" role="alert"><app-icon name="warning" [size]="18" />{{ 'briefing.kitMissing' | t }}</p>
      }
    </section>

    <!-- Ciò che si compra nel Briefing, con le stesse card della fornitura (per ora il negozio compra quasi solo mod). -->
    <section class="inventory" [attr.aria-label]="'briefing.inventory' | t">
      <h3>{{ 'briefing.inventory' | t }}</h3>
      <hr />
      @if (inventory().length) {
        <ul>
          @for (i of inventory(); track $index) { <li class="gear"><ng-container [ngTemplateOutlet]="gearCard" [ngTemplateOutletContext]="{ $implicit: i, hands: true }" /></li> }
        </ul>
      } @else {
        <p>{{ 'briefing.inventoryEmpty' | t }}</p>
      }
    </section>

    @if (open() && shop(); as s) {
      <app-pregame-shop-dialog [mercenary]="mercenary()" [loadout]="loadout()" [shop]="s" [others]="others()" [skills]="skills()" (changed)="changed.emit($event)" (closed)="open.set(false)" />
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 12px; width: 100%; min-width: 0; text-align: left; }
    /* Il token: un quadrato dritto (non una carta), con il ritratto ritagliato in alto e i parametri stampati sopra. */
    .token { position: relative; display: block; width: 100%; aspect-ratio: 1; padding: 0; overflow: hidden; cursor: pointer; border-radius: 0 var(--radius-2) 0 var(--radius-2); border: 1px solid var(--c-line-strong); background: var(--c-tile); color: var(--c-text); font: inherit; transition: border-color 0.15s; }
    .token:disabled { cursor: default; }
    .token:not(:disabled):hover, .token:not(:disabled):focus-visible { border-color: var(--c-interact); outline: none; }
    img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .cap { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 8px 12px 10px; text-align: left; background: var(--c-surface); border-top: 1px solid var(--c-line-strong); }
    .cap b { font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.04em; }
    .role { color: var(--c-text-dim); font-size: 11px; font-weight: 600; letter-spacing: var(--label-tracking); text-transform: uppercase; }
    .frame { position: relative; }
    /* Angoli arrotondati solo in alto a destra e in basso a sinistra, come la pillola dei parametri. */
    .budget { position: absolute; top: 0; right: 14px; transform: translateY(-50%); padding: 5px 10px; border-radius: 0 var(--radius-2) 0 var(--radius-2); border: 1px solid var(--c-line-strong); background: var(--c-bg); color: var(--cad-coin); font: 700 14px/1 var(--font-mono); font-variant-numeric: tabular-nums; }
    .kit { flex: 1; min-height: 0; overflow-y: auto; padding: 10px 12px; border-radius: var(--radius-1); border: 1px solid var(--c-line-strong); background: var(--c-bg); }
    .kit h3 { margin: 0; font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    /* Il filetto sotto il titolo chiude l'intestazione del box: va da un bordo all'altro. */
    hr { height: 0; margin: 8px -12px 10px; border: 0; border-top: 1px solid var(--c-line-strong); }
    .kit ul, .inventory ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
    /* Una mini card per oggetto: nome e icona, gli slot (cerchi vuoti) in alto a destra, le mani occupate in basso a destra. */
    .gear { position: relative; display: flex; align-items: center; gap: 8px; min-height: 64px; padding: 10px 56px 10px 10px; box-sizing: border-box; border-radius: var(--radius-1); border: 1px solid var(--c-line-strong); background: var(--c-surface); }
    .gear b { font-weight: 600; min-width: 0; }
    .what { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .what small { color: var(--c-text-dim); font: 600 11px/1.2 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; }
    .slots { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; }
    .slots i { width: 10px; height: 10px; box-sizing: border-box; border-radius: 50%; border: 1.5px solid var(--c-text-dim); }
    /* Gli slot che accettano solo mod hacking hanno un altro colore (prova: il rosa). */
    .slots i.hack { border-color: var(--c-hacking); }
    .hands { position: absolute; right: 8px; bottom: 6px; display: flex; gap: 2px; color: var(--c-text); opacity: 0.6; }
    .hand:last-child:not(:first-child) { transform: scaleX(-1); }
    .inventory { padding: 10px 12px; border-radius: var(--radius-1); border: 1px solid var(--c-line-strong); background: var(--c-bg); }
    .inventory h3 { margin: 0; font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    .inventory p { margin: 0; color: var(--c-text-dim); font-size: 13px; }
    .kit:has(.error) { padding: 0; border-color: var(--c-error); background: color-mix(in srgb, var(--c-error) 14%, var(--c-bg)); }
    .error { display: flex; align-items: center; gap: 8px; margin: 0; padding: 10px 12px; color: var(--c-error); font-size: 13px; font-weight: 600; }
    /* Il badge «Pronto»: sul bordo come il budget ma tutto tondo, perché si legga come un tasto e non come un indicatore; con la spunta spenta finché non lo si preme. */
    .ready { position: absolute; top: 0; left: 14px; transform: translateY(-50%); display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; width: 28px; height: 28px; padding: 0; cursor: pointer; border-radius: var(--radius-round); border: 1px solid var(--c-line-strong); background: var(--c-bg); color: var(--c-text-dim); transition: color 0.15s, background 0.15s, border-color 0.15s, box-shadow 0.15s; }
    .ready.off { opacity: 0.4; cursor: default; }
    .ready:hover:not(.off):not(.on), .ready:focus-visible:not(.off):not(.on) { border-color: var(--c-ok); color: var(--c-ok); outline: none; }
    .ready.on { background: var(--c-ok); border-color: var(--c-ok); color: var(--c-bg); box-shadow: 0 0 12px color-mix(in srgb, var(--c-ok) 60%, transparent); }
  `,
})
export class BriefingColumnComponent {
  readonly mercenary = input.required<MercenarySheet>();
  readonly loadout = input.required<Loadout>();
  readonly shop = input<ShopData | null>(null);
  readonly others = input<readonly Loadout[]>([]);
  readonly skills = input<readonly SkillDef[]>([]);
  readonly ready = input(false);
  /** Il negozio di questo mercenario è già stato aperto almeno una volta: solo allora «Pronto» si accende. */
  readonly visited = input(false);
  readonly shopOpened = output<void>();
  readonly changed = output<Loadout>();
  readonly readyChange = output<boolean>();
  protected readonly open = signal(false);

  protected openShop() {
    this.open.set(true);
    this.shopOpened.emit();
  }

  protected toggleReady() {
    if (this.visited()) this.readyChange.emit(!this.ready());
  }

  /** Gli eurodollari che restano, tolte le mod scelte. */
  protected readonly budgetLeft = computed(() => {
    const s = this.shop();
    return s ? s.budget - modsCost(this.loadout().mods, s.mods) : 0;
  });
  /** Gli oggetti della fornitura iniziale; vuoto se il mercenario non ce l'ha nel json (o non è nel catalogo): la colonna mostra l'errore. */
  protected readonly kit = computed<ItemDef[]>(() => {
    const s = this.shop();
    const ids = this.mercenary().startingGear ?? [];
    const defs = ids.flatMap((id) => s?.items.get(id) ?? []);
    return defs.length === ids.length ? defs : [];
  });
  /** La categoria dell'oggetto, come sottotitolo: arma da mischia, arma a distanza, armatura o cyberdeck (i deck sono le armi a intrusione e gli oggetti con l'etichetta `deck`). */
  protected categoryKey(i: ItemDef): 'briefing.catMelee' | 'briefing.catRanged' | 'briefing.armor' | 'briefing.deck' {
    if (i.kind === 'armor') return 'briefing.armor';
    if (i.attack === 'melee') return 'briefing.catMelee';
    if (i.attack === 'ranged') return 'briefing.catRanged';
    return 'briefing.deck';
  }
  /** Gli oggetti comprati nel Briefing (id del loadout risolti nel catalogo; gli id sconosciuti si saltano). */
  protected readonly inventory = computed<ItemDef[]>(() => {
    const s = this.shop();
    return this.loadout().items.flatMap((id) => s?.items.get(id) ?? []);
  });
  protected dots = (n: number | undefined) => Array.from({ length: n ?? 0 });
}

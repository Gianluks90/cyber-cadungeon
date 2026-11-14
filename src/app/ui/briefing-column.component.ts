import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { MercenarySheet } from '../game/mercenaries/mercenary-sheet';
import { ItemDef, itemGroup } from '../game/items/item';
import { Loadout, ShopData, budgetLeft, carriedItems } from '../game/mercenaries/party-setup';
import { POTION_NAMES } from '../game/markers/marker-rules';
import { modsCost } from '../game/mods/mod';
import { SkillDef } from '../game/skills/skill';
import { CatalogTextPipe } from '../i18n/catalog-text.pipe';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from './icon.component';
import { MoneyCounterComponent } from './money-counter.component';
import { PregameShopDialogComponent } from './pregame-shop-dialog.component';

/**
 * Una colonna del Briefing, per un mercenario: il token quadrato (solo nome e classe: i parametri si vedono nel negozio), il budget che resta, la fornitura iniziale (con un errore rosso se il catalogo non la dà) e il badge «Pronto» sul token.
 * Un clic sul token apre il negozio del Briefing (mod, pozioni, oggetti) dello stesso mercenario.
 */
@Component({
  selector: 'app-briefing-column',
  imports: [CatalogTextPipe, IconComponent, MoneyCounterComponent, NgTemplateOutlet, PregameShopDialogComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- I badge (budget e «Pronto») stanno fuori dal token: su schermo largo restano fissi mentre la colonna scorre; su telefono stanno sopra la card. -->
    <div class="badges">
    <!-- Il budget è un badge a cavallo del bordo in alto a destra (fuori dal token, che ritaglia). -->
    <span class="budget" [title]="'briefing.budget' | t"><app-money-counter [value]="badgeBudget()" /></span>
    <!-- «Pronto»: un badge con la spunta in alto a sinistra, specchio del budget. Diventa verde quando è premuto. -->
    <!-- Su telefono, finché il negozio non è stato aperto il tasto è un carrello (e lo apre); poi diventa la spunta «Pronto». Su schermo largo resta la spunta spenta. -->
    <button type="button" class="ready" [class.on]="ready()" [class.off]="!visited() && !phone()" [attr.aria-disabled]="visited() || phone() ? null : 'true'" [attr.aria-pressed]="visited() || !phone() ? ready() : null" [attr.aria-label]="(shopFirst() ? 'briefing.openShop' : 'briefing.ready') | t: { name: mercenary().name }" [title]="(shopFirst() ? 'briefing.openShop' : visited() ? 'briefing.ready' : 'briefing.readyLocked') | t: { name: mercenary().name }" (click)="tapReady()">@if (shopFirst()) { <app-icon name="add_shopping_cart" [size]="18" /> } @else { <app-icon name="check" [size]="18" /> }</button>
    </div>
    <div class="scroll">
    <div class="frame">
    <button type="button" class="token" [disabled]="!shop()" [attr.aria-label]="'briefing.openShop' | t: { name: mercenary().name }" [title]="'briefing.openShop' | t: { name: mercenary().name }" (click)="openShop()">
      <img [src]="mercenary().portrait" [alt]="mercenary().name" />
      <span class="cap">
        <b>{{ mercenary().name }}</b><span class="role">{{ mercenary().class | ct }}</span>
      </span>
    </button>
    </div>

    <!-- Il contenuto di una card oggetto: la usano la fornitura iniziale e l'inventario. -->
    <ng-template #gearCard let-i let-hands="hands" let-used="used">
      <span class="slots" [title]="'briefing.slotsOf' | t: { n: i.slots ?? 0 }">@for (n of dots(i.slots); track $index) { <i [class.full]="$index < used" [class.hack]="i.modTags?.includes('hacking')"></i> }</span>
      <span class="what"><b>{{ i.name }}</b><small>{{ categoryKey(i) | t }}</small></span>
      @if (hands && i.hands > 0) {
        <span class="hands" [title]="'briefing.handsOf' | t: { n: i.hands }">@for (n of dots(i.hands); track $index) { <app-icon class="hand" [name]="'back_hand'" [size]="14" /> }</span>
      }
    </ng-template>

    <section class="kit" [attr.aria-label]="'briefing.kit' | t">
      @if (kitSold()) {
        <h3>{{ 'briefing.kit' | t }}</h3>
        <hr />
        <p class="empty">{{ 'briefing.kitSold' | t }}</p>
      } @else if (kit().length) {
        <h3>{{ 'briefing.kit' | t }}</h3>
        <hr />
        <ul>
          @for (i of kit(); track i.id; let n = $index) {
            <li class="gear"><ng-container [ngTemplateOutlet]="gearCard" [ngTemplateOutletContext]="{ $implicit: i, hands: false, used: usedAt(n) }" /></li>
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
      @if (inventory().length || potions().length) {
        <ul>
          @for (i of inventory(); track $index; let n = $index) { <li class="gear"><ng-container [ngTemplateOutlet]="gearCard" [ngTemplateOutletContext]="{ $implicit: i, hands: true, used: usedAt(kit().length + n) }" /></li> }
          <!-- I consumabili comprati, uno per tipo con quanti ne ha. -->
          @for (p of potions(); track p.kind) {
            <li class="gear"><span class="what"><b>{{ p.name }}<span class="qty">×{{ p.count }}</span></b><small>{{ 'briefing.consumable' | t }}</small></span></li>
          }
        </ul>
      } @else {
        <p>{{ 'briefing.inventoryEmpty' | t }}</p>
      }
    </section>

    </div>

    @if (open() && shop(); as s) {
      <app-pregame-shop-dialog [mercenary]="mercenary()" [loadout]="loadout()" [shop]="s" [others]="others()" [skills]="skills()" (changed)="changed.emit($event)" (closed)="open.set(false)" />
    }
  `,
  styles: `
    :host { position: relative; display: flex; flex-direction: column; gap: 12px; width: 100%; min-width: 0; text-align: left; }
    /* Desktop: la colonna ha 18px di margine sopra (per i badge, che sporgono) e sotto una zona interna (.scroll) che scorre da sola; i badge stanno fuori da quella zona, quindi restano fermi senza altri accorgimenti. Su mobile .scroll non c'è (display: contents) e scorre tutta la pagina. */
    .scroll { display: contents; }
    @media (min-width: 901px) {
      :host { min-height: 0; padding-top: 18px; }
      .scroll { display: flex; flex-direction: column; gap: 12px; flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; container-type: inline-size; padding-bottom: 4px; }
      :host .kit { flex: 1 0 auto; min-height: auto; overflow: visible; }
      .badges { position: absolute; top: 18px; left: 0; right: 0; height: 0; z-index: 4; }
      /* Il token (un quadrato alto quanto la colonna è larga) scorre finché resta in vista solo la sua fascia con nome e ruolo (56px), che si ferma in cima e fa da intestazione. Il token ha 1px di bordo sotto la fascia, per questo 57: così si vede anche il filetto in alto. */
      :host .frame { position: sticky; top: calc(57px - 100cqw); z-index: 2; }
      .badges .budget, .badges .ready { transform: translateY(calc(-50% - 4px)); }
      :host .cap { height: 56px; box-sizing: border-box; justify-content: center; }
    }
    /* Il token: un quadrato dritto (non una carta), con il ritratto ritagliato in alto e i parametri stampati sopra. */
    .token { position: relative; display: block; width: 100%; aspect-ratio: 1; padding: 0; overflow: hidden; cursor: pointer; border-radius: 0 var(--radius-2) 0 var(--radius-2); border: 1px solid var(--c-line-strong); background: var(--c-tile); color: var(--c-text); font: inherit; transition: border-color 0.15s; }
    .token:disabled { cursor: default; }
    .token:not(:disabled):hover, .token:not(:disabled):focus-visible { border-color: var(--c-interact); outline: none; }
    img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .cap { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 8px 12px 10px; text-align: left; background: var(--c-surface); border-top: 1px solid var(--c-line-strong); }
    .cap b { font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.04em; }
    .role { color: var(--c-text-dim); font-size: 11px; font-weight: 600; letter-spacing: var(--label-tracking); text-transform: uppercase; }
    .frame { position: relative; }
    /* Su telefono il token è una riga: il ritratto a sinistra (40%) e nome e ruolo a destra (60%). */
    @media (max-width: 900px) {
      .token { display: flex; align-items: stretch; aspect-ratio: 5 / 2; }
      img { position: static; flex: 0 0 40%; width: 40%; height: 100%; }
      .cap { position: static; flex: 0 0 60%; width: 60%; box-sizing: border-box; justify-content: center; padding: 8px 14px; border-top: 0; border-left: 1px solid var(--c-line-strong); }
      /* I badge sopra la card (la riga del token ha proporzione 5/2): il budget a cavallo del bordo in alto a sinistra, «Pronto» dentro la card in basso a destra. */
      .badges { position: absolute; top: 0; left: 0; right: 0; aspect-ratio: 5 / 2; pointer-events: none; z-index: 1; }
      .badges > * { pointer-events: auto; }
      .badges .budget { right: auto; left: 14px; }
      /* «Pronto» più grande e dentro la card, in basso a destra (il budget resta a cavallo del bordo). */
      .badges .ready { top: auto; left: auto; right: 12px; bottom: 12px; transform: none; width: 48px; height: 48px; }
      .badges .ready app-icon { width: 28px !important; height: 28px !important; }
    }
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
    .qty { margin-left: 6px; color: var(--c-text-dim); font-weight: 400; }
    .what small { color: var(--c-text-dim); font: 600 11px/1.2 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; }
    .slots { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; }
    .slots i { width: 10px; height: 10px; box-sizing: border-box; border-radius: 50%; border: 1.5px solid var(--c-text-dim); }
    /* Gli slot che accettano solo mod hacking hanno un altro colore (prova: il rosa). */
    .slots i.full { background: var(--c-text-dim); }
    .slots i.hack { border-color: var(--c-hacking); }
    .slots i.hack.full { background: var(--c-hacking); }
    .hands { position: absolute; right: 8px; bottom: 6px; display: flex; gap: 2px; color: var(--c-text); opacity: 0.6; }
    .hand:last-child:not(:first-child) { transform: scaleX(-1); }
    .inventory { padding: 10px 12px; border-radius: var(--radius-1); border: 1px solid var(--c-line-strong); background: var(--c-bg); }
    .inventory h3 { margin: 0; font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    .kit .empty { margin: 0; color: var(--c-text-dim); font-size: 13px; }
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

  /** Mobile (fino a 900px): lì il tasto «Pronto» fa anche da scorciatoia al negozio. */
  protected readonly phone = signal(false);
  /** Telefono e negozio mai aperto: il tasto è il carrello. */
  protected readonly shopFirst = computed(() => this.phone() && !this.visited());
  constructor() {
    const mq = matchMedia('(max-width: 900px)');
    const update = () => this.phone.set(mq.matches);
    update();
    mq.addEventListener('change', update);
    inject(DestroyRef).onDestroy(() => mq.removeEventListener('change', update));
  }

  protected tapReady() {
    if (this.shopFirst()) this.openShop();
    else this.toggleReady();
  }

  protected toggleReady() {
    if (this.visited()) this.readyChange.emit(!this.ready());
  }

  /** Gli eurodollari che restano: un solo budget per mod, oggetti, pozioni e tesori. */
  protected readonly budgetLeft = computed(() => {
    const s = this.shop();
    return s ? budgetLeft(this.mercenary().startingGear ?? [], this.loadout(), s) : 0;
  });
  /** Il budget mostrato dal badge: segue quello vero solo a negozio chiuso, così il conto scorre quando si preme «Fatto» e non durante gli acquisti. */
  protected readonly badgeBudget = signal(0);
  private readonly syncBadge = effect(() => {
    const left = this.budgetLeft();
    if (!this.open()) this.badgeBudget.set(left);
  });
  /** Gli oggetti della fornitura iniziale; vuoto se il mercenario non ce l'ha nel json (o non è nel catalogo): la colonna mostra l'errore. */
  /** La fornitura iniziale completa; vuota se il mercenario non ce l'ha nel json o qualcosa non è nel catalogo: la colonna mostra l'errore. */
  private readonly allGear = computed<ItemDef[]>(() => {
    const s = this.shop();
    const ids = this.mercenary().startingGear ?? [];
    const defs = ids.flatMap((id) => s?.items.get(id) ?? []);
    return defs.length === ids.length ? defs : [];
  });
  /** Ciò che resta della fornitura: gli oggetti non venduti nel negozio. */
  protected readonly kit = computed<ItemDef[]>(() => this.allGear().filter((d) => !(this.loadout().soldGear ?? []).includes(d.id)));
  protected readonly kitSold = computed(() => this.allGear().length > 0 && this.kit().length === 0);
  /** La categoria dell'oggetto, come sottotitolo: arma da mischia, arma a distanza, armatura o cyberdeck (i deck sono le armi a intrusione e gli oggetti con l'etichetta `deck`). */
  protected categoryKey(i: ItemDef): 'briefing.catMelee' | 'briefing.catRanged' | 'briefing.armor' | 'briefing.deck' {
    return { melee: 'briefing.catMelee', ranged: 'briefing.catRanged', armor: 'briefing.armor', deck: 'briefing.deck' }[itemGroup(i)] as 'briefing.catMelee' | 'briefing.catRanged' | 'briefing.armor' | 'briefing.deck';
  }
  /** Gli oggetti comprati nel Briefing (id del loadout risolti nel catalogo; gli id sconosciuti si saltano). */
  protected readonly inventory = computed<ItemDef[]>(() => {
    const s = this.shop();
    return this.loadout().items.flatMap((id) => s?.items.get(id) ?? []);
  });
  /** Gli slot occupati dalle mod montate su ogni oggetto che il mercenario porta, nell'ordine: prima l'equipaggiamento iniziale e poi ciò che ha comprato. */
  private readonly modsUsed = computed<number[]>(() => {
    const s = this.shop();
    if (!s) return [];
    const l = this.loadout();
    return carriedItems(this.mercenary().startingGear ?? [], l, s).map((c) => (l.mods?.[c.key] ?? []).length);
  });
  protected usedAt = (n: number) => this.modsUsed()[n] ?? 0;
  /** I consumabili comprati nel Briefing, raggruppati per tipo. */
  protected readonly potions = computed(() => {
    const l = this.loadout().potions;
    return (['heal', 'overclock'] as const).flatMap((kind) => {
      const count = l.filter((k) => k === kind).length;
      return count ? [{ kind, name: POTION_NAMES[kind], count }] : [];
    });
  });
  protected dots = (n: number | undefined) => Array.from({ length: n ?? 0 });
}

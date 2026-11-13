import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, viewChild } from '@angular/core';
import { POTION_HEAL, POTION_LIMIT, POTION_PRICES } from '../game/constants';
import { money } from '../game/money';
import { MercenarySheet } from '../game/mercenaries/mercenary-sheet';
import { mercenaryStats } from '../game/mercenaries/mercenary-stats';
import { Loadout, ShopData, TREASURE_KEYS, budgetLeft, equippedDefs, gearSalePrice, loadoutCost, placeItems, stockLeft, treasureRoom } from '../game/mercenaries/party-setup';
import { ChestTier } from '../game/board/marker';
import { TREASURE_PRICES } from '../game/constants';
import { translate } from '../i18n/i18n.service';
import { ITEM_GROUPS, ItemGroup, itemDetail, itemGroup } from '../game/items/item';
import { POTION_NAMES } from '../game/markers/marker-rules';
import { PotionKind } from '../game/board/marker';
import { I18nService } from '../i18n/i18n.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { SkillDef } from '../game/skills/skill';
import { BASE_KIT, MOD_SLOTS, ModSlot, isBriefingMod, modFits, modsCost } from '../game/mods/mod';
import { MercenaryFaceComponent } from './mercenary-face.component';
import { SkillCardComponent } from './skill-card.component';
import { AttackDiceComponent } from './attack-dice.component';
import { DialogComponent } from './dialog.component';
import { IconComponent } from './icon.component';
import { ItemCardComponent } from './item-card.component';
import { MoneyCounterComponent } from './money-counter.component';

const POTIONS: readonly PotionKind[] = ['heal', 'overclock'];
const GROUP_TITLES: Record<ItemGroup, 'shop.groupMelee' | 'shop.groupRanged' | 'shop.groupArmor' | 'shop.groupDeck'> = { melee: 'shop.groupMelee', ranged: 'shop.groupRanged', armor: 'shop.groupArmor', deck: 'shop.groupDeck' };

/**
 * Il negozio di prima della partita, per un eroe: con le sue monete (300) compra pozioni e oggetti, e può rimettere a posto ciò che ha comprato riavendo tutti i soldi (prima di partire non
 * si perde niente). Le copie in vendita sono comuni a tutta la squadra. Ogni cambiamento esce subito con `changed`; ciò che resta di monete è dell'eroe.
 * Le regole di posto sono quelle della partita: gli oggetti si equipaggiano finché ci stanno (2 mani, 1 armatura, 2 oggetti vari), poi vanno nello zaino (3 posti).
 */
@Component({
  selector: 'app-pregame-shop-dialog',
  imports: [AttackDiceComponent, DialogComponent, MercenaryFaceComponent, SkillCardComponent, IconComponent, ItemCardComponent, MoneyCounterComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog [title]="'shop.kicker' | t" [subtitle]="'shop.subtitle' | t" height="min(520px, calc(100dvh - 24px))" (closed)="closed.emit()">
      <!-- A sinistra la carta dell'eroe con i suoi parametri, a destra le sue abilità secondarie (già assegnate) in una carta che scorre da sola. Sono inclinate e infilate sotto il pannello. -->
      <figure dialogSide class="card left"><app-mercenary-face [mercenary]="mercenary()" [stats]="stats()" /></figure>
      <figure dialogSide class="card right">
        <figcaption class="head">{{ 'detail.secondary' | t }}</figcaption>
        <div class="scroller" #scroller>
          @for (s of skills(); track s.id) { <app-skill-card [skill]="s" [stacked]="true" /> }
          @empty { <p class="none">{{ 'shop.noSkills' | t }}</p> }
        </div>
      </figure>
      <!-- Seconda intestazione fissa: i dadi competenza dell'eroe, per sapere che armi conviene comprare. -->
      <div dialogSub class="dice">
        <span class="cap">{{ 'detail.dice' | t }}</span>
        <app-attack-dice [dice]="mercenary().dice" />
      </div>

      <!-- Le sezioni si rimettono una alla volta: per ora ci sono solo i consumabili (al massimo POTION_LIMIT per mercenario). -->
      <h3>{{ 'shop.potions' | t }} <small>{{ 'shop.potionsHint' | t: { n: potionLimit } }}</small></h3>
      <div class="list">
        @for (k of potionKinds; track k) {
          <div class="row">
            <div class="what"><b>{{ potionName(k) }}@if (potionCount(k)) { <span class="count">({{ potionCount(k) }})</span> }</b><small class="fx">
                @if (k === 'heal') { {{ 'shop.restore' | t }} <span class="life">{{ healAmount }} <app-icon name="favorite" [size]="14" /> {{ 'stats.health' | t }}</span> }
                @else { {{ 'shop.maxBefore' | t }} <span class="oc"><app-icon name="speed" [size]="18" /> {{ 'stats.overclock' | t }}</span> {{ 'shop.maxAfter' | t }} }
              </small></div>
            <span class="price">{{ money(potionPrice(k)) }}</span>
            <button type="button" class="act cart" [class.off]="!potionCount(k)" [attr.aria-disabled]="!potionCount(k)" [attr.aria-label]="'shop.refund' | t" [title]="'shop.refund' | t" (click)="refundPotion(k)"><app-icon name="remove_shopping_cart" [size]="20" /></button>
            <button type="button" class="act cart" [class.off]="!!potionReason(k)" [attr.aria-disabled]="!!potionReason(k)" [attr.aria-label]="'shop.buy' | t" [title]="potionReason(k) || ('shop.buy' | t)" (click)="buyPotion(k)"><app-icon name="add_shopping_cart" [size]="20" /></button>
          </div>
        }
      </div>

      @for (g of itemGroups(); track g.key) {
        <h3>{{ g.titleKey | t }}</h3>
        <div class="cards">
          @for (o of g.offers; track o.id) {
            <app-item-card [def]="o.def" [detail]="o.detail" [count]="o.count">
              <button type="button" class="act cart" [class.off]="!o.count" [attr.aria-disabled]="!o.count" [attr.aria-label]="'shop.refund' | t" [title]="'shop.refund' | t" (click)="refundItem(o.id)"><app-icon name="remove_shopping_cart" [size]="20" /></button>
              <button type="button" class="act cart" [class.off]="!!o.reason" [attr.aria-disabled]="!!o.reason" [attr.aria-label]="'shop.buy' | t" [title]="o.reason || ('shop.buy' | t)" (click)="buyItem(o.id)"><app-icon name="add_shopping_cart" [size]="20" /></button>
            </app-item-card>
          }
        </div>
      }

      @if (gearOffers().length) {
        <h3>{{ 'shop.gear' | t }} <small>{{ 'shop.gearHint' | t }}</small></h3>
        <div class="cards">
          @for (o of gearOffers(); track o.id) {
            <app-item-card [class.sold]="o.sold" [def]="o.def" [detail]="o.detail" [price]="o.sale">
              <button type="button" class="act cart" [class.off]="!!o.reason" [attr.aria-disabled]="!!o.reason" [attr.aria-label]="(o.sold ? 'shop.undoSale' : 'shop.sell') | t" [title]="o.reason || ((o.sold ? 'shop.undoSale' : 'shop.sell') | t)" (click)="toggleSale(o.id)"><app-icon [name]="o.sold ? 'undo' : 'sell'" [size]="20" /></button>
            </app-item-card>
          }
        </div>
      }

      <!-- A sinistra del piede, una sola volta, il denaro che resta (un solo budget per mod e oggetti). -->
      <div dialogFooterStart class="budget" [title]="'briefing.budget' | t"><b><app-money-counter [value]="budgetLeft()" /></b></div>
      <ng-container dialogFooter><button type="button" class="dlg-btn primary" (click)="closed.emit()">{{ 'shop.confirm' | t }}</button></ng-container>
    </app-dialog>
  `,
  styles: `
    :host { display: contents; }
    h3 { margin: 10px 0 0; font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    h3 small { margin-left: 6px; font-weight: 400; letter-spacing: 0; text-transform: none; font-size: 12px; }
    small { color: var(--c-text-dim); }
    /* Le due carte laterali: inclinate e infilate sotto il pannello, come nella finestra dell'attacco. */
    /* Il margine a sinistra della carta delle abilità (14 px) è tarato a occhio perché risulti uguale a quello di destra (10 px più l'inclinazione). Alte al massimo come la finestra dell'attacco (500 px), centrate in verticale anche se la dialog è più alta. */
    .card { position: absolute; z-index: 0; top: 0; bottom: 0; margin-block: auto; height: min(484px, calc(100% - 16px)); width: 220px; box-sizing: border-box; margin-inline: 0; overflow: hidden; border-radius: 0 var(--radius-2) 0 var(--radius-2); border: 1px solid var(--c-line-strong); background: var(--c-tile); box-shadow: 0 8px 22px rgba(0, 0, 0, 0.55); }
    .card.left { --face-inset: 14px; right: calc(100% - 14px); transform: rotate(-4deg); transform-origin: 70% 100%; }
    /* La carta delle abilità, larga come quella del mercenario, ha gli angoli normali. */
    .card.right { border-radius: var(--radius-1); left: calc(100% - 14px); transform: rotate(4deg); transform-origin: 30% 100%; display: flex; flex-direction: column; background: var(--c-surface); }
    .card .head { flex: none; padding: 10px 10px 8px 14px; border-bottom: 1px solid var(--c-line-strong); font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    .scroller { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 10px 10px 10px 14px; scrollbar-width: none; }
    .scroller::-webkit-scrollbar { display: none; }
    @media (max-width: 1000px) { .card { display: none; } }
    .dice { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
    .dice .cap { font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    .budget { display: inline-flex; align-items: baseline; gap: 6px; color: var(--c-money); font-variant-numeric: tabular-nums; }
    .budget b { font-size: 18px; }
    .gear { display: flex; align-items: baseline; gap: 10px; }
    .gear b { font: 600 13px/1.2 var(--font-ui); }
    .gear span { flex: 1; color: var(--c-text-dim); font-size: 12px; }
    .row.mod.on { border-color: var(--c-interact); }
    .what { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .what b { flex: none; }
    .list, .cards { display: flex; flex-direction: column; gap: 6px; }
    .row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: var(--radius-1); border: 1px solid var(--c-line-strong); background: var(--c-bg); }
    .row b { flex: 1; min-width: 0; font-weight: 600; }
    .price { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-variant-numeric: tabular-nums; color: var(--cad-coin); }
    .fx { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; color: var(--c-text-dim); }
    .fx .life, .fx .oc { display: inline-flex; align-items: center; gap: 4px; }
    .fx .life { color: var(--c-life); }
    .fx .oc { color: var(--c-overclock); }
    .act.cart { display: inline-flex; align-items: center; padding: 4px 8px; }
    .cards app-item-card.sold { opacity: 0.5; }
    .count { margin-left: 6px; color: var(--c-text-dim); font-weight: 400; }
    .stock { margin-right: auto; font-size: 12px; color: var(--c-text-dim); font-variant-numeric: tabular-nums; }
    .none { margin: 0; color: var(--c-text-dim); font-size: 12px; }
    .act { padding: 4px 10px; border-radius: var(--radius-1); background: none; color: var(--c-text); cursor: pointer; white-space: nowrap; border: 1px solid var(--c-line-strong); font: 12px/1.2 var(--font-ui); transition: border-color 0.15s, color 0.15s; }
    .act:hover:not(.off), .act:focus-visible:not(.off) { border-color: var(--c-interact); color: var(--c-interact); outline: none; }
    .act.off { opacity: 0.35; cursor: default; }
  `,
})
export class PregameShopDialogComponent {
  readonly mercenary = input.required<MercenarySheet>();
  readonly loadout = input.required<Loadout>();
  readonly shop = input.required<ShopData>();
  /** Ciò che hanno comprato gli altri eroi della squadra: le copie in vendita sono comuni. */
  readonly others = input<readonly Loadout[]>([]);
  /** Le carte abilità secondarie già assegnate all'eroe. */
  readonly skills = input<readonly SkillDef[]>([]);
  readonly changed = output<Loadout>();
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  readonly closed = output<void>();

  private readonly i18n = inject(I18nService);
  protected readonly potionKinds = POTIONS;
  /** I parametri che avrà, con le abilità assegnate e gli oggetti comprati (per la carta a sinistra). */
  protected readonly stats = computed(() => mercenaryStats(this.mercenary(), this.skills(), equippedDefs(this.loadout(), this.shop(), this.gear())));
  protected readonly potionLimit = POTION_LIMIT;
  /** I tipi di tesoro che questa avventura vende già in preparazione. */
  protected readonly treasureTiers = computed(() => this.shop().treasureTiers);
  /** Gli eurodollari che restano: un solo budget per mod, oggetti, pozioni e tesori. */
  /** La fornitura iniziale del mercenario (gli id) e quella che si può vendere: ognuna vale metà del prezzo, arrotondata a 25 (minimo 25). */
  protected readonly gear = computed(() => this.mercenary().startingGear ?? []);
  protected readonly gearOffers = computed(() =>
    this.gear().flatMap((id) => {
      const def = this.shop().items.get(id);
      if (!def) return [];
      const sold = (this.loadout().soldGear ?? []).includes(id);
      const sale = gearSalePrice(def.price);
      return [{ id, def, sold, sale, detail: itemDetail(def), reason: sold && sale > this.budgetLeft() ? this.i18n.t('shop.noCoins') : '' }];
    }),
  );
  protected readonly budgetLeft = computed(() => budgetLeft(this.gear(), this.loadout(), this.shop()));
  protected readonly money = money;
  /** Per arma, armatura e deck: l'oggetto base, gli slot usati e le mod che ci stanno (con il motivo se non si può installare). */
  protected readonly modGroups = computed(() => {
    const shop = this.shop();
    const mods = this.loadout().mods;
    const labels: Record<ModSlot, string> = { weapon: this.i18n.t('briefing.weapon'), armor: this.i18n.t('briefing.armor'), deck: this.i18n.t('briefing.deck') };
    return MOD_SLOTS.flatMap((slot) => {
      const base = shop.items.get(BASE_KIT[slot]);
      if (!base?.slots) return [];
      const installed = mods?.[slot] ?? [];
      const options = [...shop.mods.values()]
        .filter((m) => isBriefingMod(m) && modFits(m, base, slot))
        .map((mod) => {
          const on = installed.includes(mod.id);
          const reason = on ? '' : installed.length >= base.slots! ? this.i18n.t('briefing.noSlots') : mod.cost > this.budgetLeft() ? this.i18n.t('briefing.noBudget') : '';
          return { mod, on, reason };
        });
      return [{ slot, label: labels[slot], base, max: base.slots, used: installed.length, options }];
    });
  });
  private readonly left = computed(() => stockLeft(this.shop(), [...this.others(), this.loadout()]));

  protected readonly offers = computed(() => {
    const shop = this.shop();
    const l = this.loadout();
    return [...shop.items.values()]
      .filter((i) => i.id in shop.stock)
      .map((def) => {
        const left = this.left()[def.id];
        const reason = left <= 0 ? this.i18n.t('shop.soldOut') : def.price > this.budgetLeft() ? this.i18n.t('shop.noCoins') : placeItems([...l.items, def.id], shop) ? '' : this.i18n.t('shop.noRoom');
        return { id: def.id, def, left, reason, detail: itemDetail(def), count: l.items.filter((id) => id === def.id).length, group: itemGroup(def) };
      })
      .sort((a, b) => a.def.name.localeCompare(b.def.name, 'it'));
  });
  /** Gli oggetti in vendita divisi per categoria (nell'ordine di `ITEM_GROUPS`), senza le categorie vuote. */
  protected readonly itemGroups = computed(() => ITEM_GROUPS.map((g) => ({ key: g, titleKey: GROUP_TITLES[g], offers: this.offers().filter((o) => o.group === g) })).filter((g) => g.offers.length));

  constructor() {
    // La carta delle abilità scorre da sola, su e giù, e si ferma sotto il puntatore (e con la riduzione del movimento sta ferma: si scorre a mano).
    effect((onCleanup) => {
      const el = this.scroller()?.nativeElement;
      if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      let hover = false;
      let dir = 1;
      let wait = 60;
      let pos = 0;
      let raf = 0;
      const enter = () => (hover = true);
      const leave = () => ((hover = false), (pos = el.scrollTop));
      el.addEventListener('pointerenter', enter);
      el.addEventListener('pointerleave', leave);
      const step = () => {
        const max = el.scrollHeight - el.clientHeight;
        if (max > 2 && !hover) {
          if (wait > 0) wait--;
          else {
            pos = Math.min(max, Math.max(0, pos + dir * 0.35));
            el.scrollTop = pos;
            if (pos <= 0 || pos >= max) {
              dir = -dir;
              wait = 90;
            }
          }
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      onCleanup(() => {
        cancelAnimationFrame(raf);
        el.removeEventListener('pointerenter', enter);
        el.removeEventListener('pointerleave', leave);
      });
    });
  }

  /** Mette o toglie una mod: si installa solo se c'è uno slot libero e restano abbastanza eurodollari. */
  protected toggleMod(slot: ModSlot, id: string) {
    const g = this.modGroups().find((x) => x.slot === slot);
    const o = g?.options.find((x) => x.mod.id === id);
    if (!g || !o || o.reason) return;
    const current = this.loadout().mods?.[slot] ?? [];
    this.changed.emit({ ...this.loadout(), mods: { ...this.loadout().mods, [slot]: o.on ? current.filter((m) => m !== id) : [...current, id] } });
  }

  protected readonly healAmount = POTION_HEAL;
  protected potionCount = (k: PotionKind) => this.loadout().potions.filter((p) => p === k).length;
  /** Rimborsa un consumabile di questo tipo (l'ultimo comprato): si riavanno tutti i soldi. */
  protected refundPotion(k: PotionKind) {
    const i = this.loadout().potions.lastIndexOf(k);
    if (i >= 0) this.removePotion(i);
  }
  protected potionName =(k: PotionKind) => POTION_NAMES[k];
  protected potionPrice = (k: PotionKind) => POTION_PRICES[k];
  protected itemName = (id: string) => this.shop().items.get(id)?.name ?? id;
  protected itemPrice = (id: string) => this.shop().items.get(id)?.price ?? 0;

  protected treasureName = (k: ChestTier) => translate(TREASURE_KEYS[k]);
  protected treasurePrice = (k: ChestTier) => TREASURE_PRICES[k];

  protected treasureReason(k: ChestTier): string {
    if (TREASURE_PRICES[k] > this.budgetLeft()) return this.i18n.t('shop.noCoins');
    return treasureRoom(this.loadout(), this.shop()) ? '' : this.i18n.t('shop.noRoom');
  }

  protected buyTreasure(k: ChestTier) {
    if (!this.treasureReason(k)) this.changed.emit({ ...this.loadout(), treasures: [...(this.loadout().treasures ?? []), k] });
  }

  protected removeTreasure(i: number) {
    this.changed.emit({ ...this.loadout(), treasures: (this.loadout().treasures ?? []).filter((_, j) => j !== i) });
  }

  protected potionReason(k: PotionKind): string {
    if (this.loadout().potions.length >= POTION_LIMIT) return this.i18n.t('shop.potionsFull', { n: POTION_LIMIT });
    return POTION_PRICES[k] > this.budgetLeft() ? this.i18n.t('shop.noCoins') : '';
  }

  protected buyPotion(k: PotionKind) {
    if (!this.potionReason(k)) this.changed.emit({ ...this.loadout(), potions: [...this.loadout().potions, k] });
  }

  protected buyItem(id: string) {
    const o = this.offers().find((x) => x.id === id);
    if (o && !o.reason) this.changed.emit({ ...this.loadout(), items: [...this.loadout().items, id] });
  }

  /** Rimborsa una copia di questo oggetto (l'ultima comprata). */
  /** Vende un oggetto della fornitura iniziale (o annulla la vendita, se serve il budget per riprenderlo). */
  protected toggleSale(id: string) {
    const o = this.gearOffers().find((x) => x.id === id);
    if (!o || o.reason) return;
    const sold = this.loadout().soldGear ?? [];
    this.changed.emit({ ...this.loadout(), soldGear: o.sold ? sold.filter((x) => x !== id) : [...sold, id] });
  }

  protected refundItem(id: string) {
    const i = this.loadout().items.lastIndexOf(id);
    if (i >= 0) this.removeItem(i);
  }

  protected removeItem(i: number) {
    this.changed.emit({ ...this.loadout(), items: this.loadout().items.filter((_, j) => j !== i) });
  }

  protected removePotion(i: number) {
    this.changed.emit({ ...this.loadout(), potions: this.loadout().potions.filter((_, j) => j !== i) });
  }
}

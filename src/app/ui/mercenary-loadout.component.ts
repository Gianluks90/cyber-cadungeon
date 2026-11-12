import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MercenarySheet } from '../game/mercenaries/mercenary-sheet';
import { SkillDef } from '../game/skills/skill';
import { mercenaryStats } from '../game/mercenaries/mercenary-stats';
import { Loadout, ShopData, TREASURE_KEYS, equippedDefs, loadoutCost } from '../game/mercenaries/party-setup';
import { translate } from '../i18n/i18n.service';
import { POTION_NAMES } from '../game/markers/marker-rules';
import { CatalogTextPipe } from '../i18n/catalog-text.pipe';
import { TranslatePipe } from '../i18n/translate.pipe';
import { HeartsComponent } from './hearts.component';
import { MercenaryStatsPillComponent } from './mercenary-stats-pill.component';
import { ValueStarComponent } from './value-star.component';
import { IconComponent } from './icon.component';
import { PregameShopDialogComponent } from './pregame-shop-dialog.component';

/**
 * Un eroe della squadra con il suo spazio per gli acquisti: a sinistra la carta ridotta (stesso stile delle carte della scelta), accanto un riquadro con gli oggetti e le pozioni comprati e le
 * monete che restano. Un clic sul riquadro apre il negozio di prima della partita (`app-pregame-shop-dialog`); con `editable` falso (l'eroe è di un altro giocatore) il riquadro si vede ma non si apre.
 */
@Component({
  selector: 'app-mercenary-loadout',
  imports: [CatalogTextPipe, HeartsComponent, MercenaryStatsPillComponent, ValueStarComponent, IconComponent, PregameShopDialogComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mini">
      <img [src]="mercenary().portraitFull" [alt]="mercenary().name" />
      <app-hearts class="hearts" [wounds]="stats().wounds" [max]="stats().wounds" [size]="heartSize" />
      <div class="cap">
        <app-value-star class="value" [value]="mercenary().value" />
        <app-mercenary-stats-pill class="stats" [speed]="stats().speed" [overclock]="stats().overclock" [armor]="stats().armor" />
        <b>{{ mercenary().name }}</b><span>{{ mercenary().class | ct }}</span></div>
    </div>
    <button type="button" class="slot" [disabled]="!editable()" [attr.aria-label]="'shop.open' | t: { name: mercenary().name }" [title]="(editable() ? 'shop.open' : 'shop.notYours') | t: { name: mercenary().name }" (click)="open.set(true)">
      <span class="coins">{{ coinsLeft() }}</span>
      <span class="things">
        @for (n of names(); track $index) { <span class="chip">{{ n }}</span> }
        @empty { <span class="empty">{{ 'shop.empty' | t }}</span> }
      </span>
      @if (editable()) { <span class="go"><app-icon name="inventory_2" [size]="16" />{{ 'shop.enter' | t }}</span> }
    </button>
    @if (open() && shop(); as s) {
      <app-pregame-shop-dialog [mercenary]="mercenary()" [loadout]="loadout()" [shop]="s" [others]="others()" [skills]="skills()" (changed)="changed.emit($event)" (closed)="open.set(false)" />
    }
  `,
  styles: `
    :host { display: flex; align-items: stretch; text-align: left; }
    .mini { position: relative; z-index: 0; flex: none; height: clamp(150px, 29dvh, 300px); aspect-ratio: 2 / 3; overflow: hidden; border-radius: var(--radius-1); border: 1px solid var(--c-line-strong); background: var(--c-tile); transform: rotate(4deg); transform-origin: 30% 100%; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.55); }
    img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .cap { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; padding: 6px 10px 8px; background: var(--c-surface); border-top: 1px solid var(--c-line-strong); }
    .cap b { font: 600 clamp(12px, 1.9dvh, 19px)/1.2 var(--font-display); }
    .cap span { color: var(--c-text-dim); font-size: clamp(8px, 1.2dvh, 12px); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
    /* Lo spazio degli acquisti sta sopra la carta dell'eroe e la copre di 26 px sul bordo destro. */
    .slot { position: relative; z-index: 1; margin-left: -8px; width: clamp(180px, 22vw, 320px); flex: none; display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; box-sizing: border-box; cursor: pointer; text-align: left; color: var(--c-text); font: clamp(13px, 1.9dvh, 17px)/1.3 var(--font-ui); border-radius: var(--radius-1); border: 1px dashed var(--c-line-strong); background: var(--c-surface); transition: border-color 0.15s; }
    .slot:disabled { cursor: default; opacity: 0.7; }
    .slot:not(:disabled):hover, .slot:not(:disabled):focus-visible { border-color: var(--c-interact); border-style: solid; outline: none; }
    .coins { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--cad-coin); }
    .things { display: flex; flex-wrap: wrap; gap: 4px; align-content: flex-start; flex: 1; }
    .chip { padding: 3px 8px; border-radius: var(--radius-1); border: 1px solid var(--c-line-strong); background: var(--c-bg); font-size: 0.85em; }
    /* I punti ferita in cuori, in colonna in alto a destra; velocità, overclock e armatura nella pillola sopra il piede a sinistra, il Valore a destra (come nelle altre carte). */
    .hearts { position: absolute; top: 6px; right: 6px; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .stats { position: absolute; left: 6px; bottom: calc(100% + 6px); transform: scale(0.8); transform-origin: left bottom; }
    .value { position: absolute; right: 6px; bottom: calc(100% + 6px); transform: scale(0.8); transform-origin: right bottom; }
    .empty { color: var(--c-text-dim); font-size: 0.9em; }
    .go { display: inline-flex; align-items: center; gap: 6px; color: var(--c-interact); font-size: 0.9em; font-weight: 600; }
  `,
})
export class MercenaryLoadoutComponent {
  readonly mercenary = input.required<MercenarySheet>();
  readonly loadout = input.required<Loadout>();
  /** Il negozio (finché non è caricato il riquadro non si apre). */
  readonly shop = input<ShopData | null>(null);
  readonly others = input<readonly Loadout[]>([]);
  readonly editable = input(true);
  /** Le carte abilità secondarie già assegnate a questo eroe (le mostra il negozio). */
  readonly skills = input<readonly SkillDef[]>([]);
  readonly changed = output<Loadout>();
  protected readonly open = signal(false);

  protected readonly heartSize = 18;
  /** I parametri che avrà, con le abilità assegnate e gli oggetti comprati. */
  protected readonly stats = computed(() => {
    const shop = this.shop();
    return mercenaryStats(this.mercenary(), this.skills(), shop ? equippedDefs(this.loadout(), shop) : []);
  });
  protected readonly coinsLeft = computed(() => {
    const s = this.shop();
    return this.mercenary().coins - (s ? loadoutCost(this.loadout(), s) : 0);
  });
  /** I nomi di ciò che ha comprato (con le copie raggruppate: "Spada ×2" non serve, di solito è una per tipo). */
  protected readonly names = computed(() => {
    const s = this.shop();
    return [...this.loadout().items.map((id) => s?.items.get(id)?.name ?? id), ...this.loadout().potions.map((k) => POTION_NAMES[k]), ...(this.loadout().treasures ?? []).map((k) => translate(TREASURE_KEYS[k]))];
  });
}

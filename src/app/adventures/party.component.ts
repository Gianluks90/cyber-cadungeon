import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PARTY_SIZE } from '../game/constants';
import type { AdventureSetup } from '../game/map/map-data';
import { Archetype, MercenarySheet, loadAllMercenarySheets } from '../game/mercenaries/mercenary-sheet';
import { Loadout, PartySetup, ShopData, coinsWithSetup, drawSkillCards, emptyLoadout, loadAdventureSetup, loadPregameShop, loadoutCost, partySetupStore } from '../game/mercenaries/party-setup';
import { CatalogTextPipe } from '../i18n/catalog-text.pipe';
import { translate } from '../i18n/i18n.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { ConfirmDialogComponent } from '../ui/confirm-dialog.component';
import { MarkdownPipe } from '../ui/markdown.pipe';
import { DotTrailComponent } from '../ui/dot-trail.component';
import { MercenaryStatsPillComponent } from '../ui/mercenary-stats-pill.component';
import { MercenaryDetailDialogComponent } from '../ui/mercenary-detail-dialog.component';
import { ValueStarComponent } from '../ui/value-star.component';
import { SkillDef, loadSkillCatalog } from '../game/skills/skill';
import { FamiliarPillComponent } from '../ui/familiar-pill.component';
import { FamiliarDef, familiarsOfSheet, loadFamiliarCatalog } from '../game/familiars/familiar';
import { BriefingColumnComponent } from '../ui/briefing-column.component';
import { IconComponent } from '../ui/icon.component';
import { PageNavComponent } from '../ui/page-nav.component';
import { ADVENTURES } from './adventures';


/** I tre ruoli della squadra, nell'ordine in cui si elencano, e il testo di quando uno manca. */
const ROLES: readonly Archetype[] = ['brawler', 'gunner', 'raider'];
const MISSING_ROLE = { brawler: 'party.missingBrawler', gunner: 'party.missingGunner', raider: 'party.missingRaider' } as const;

/**
 * La scelta degli eroi del giocatore singolo (`/party/<map>`, dopo la scelta del contratto, con uno scorrimento di lato): esattamente 3 mercenari, nell'ordine in cui si toccano. Il Maligno è
 * controllato dal gioco. "Inizia" apre la partita su `/play/<map>?new&party=a,b,…`.
 */
@Component({
  selector: 'app-party',
  imports: [CatalogTextPipe, ConfirmDialogComponent, MarkdownPipe, DotTrailComponent, FamiliarPillComponent, ValueStarComponent, MercenaryDetailDialogComponent, MercenaryStatsPillComponent, BriefingColumnComponent, IconComponent, PageNavComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dot-trail />
    <app-page-nav [confirmTitle]="'party.cancelTitle' | t" [confirmText]="'party.cancelText' | t" [confirmLabel]="'party.cancelLabel' | t" (back)="back()" (leave)="home()" />
    <header class="head">
      <span class="kicker">{{ title }}</span>
      @if (step() === 'pick') {
        <h1>{{ 'party.title' | t }}</h1>
        <p class="hint">{{ 'party.hint' | t: { n: size } }}</p>
        <p class="hint">{{ 'party.adversaryHint' | t }}</p>
      } @else {
        <h1>{{ 'party.briefing' | t }}</h1>
        <div class="hint" [innerHTML]="'party.briefingHint' | t: { budget: startCoins() } | markdown"></div>
      }
    </header>
    <main>
      @if (step() === 'pick') {
        <div class="row" role="group" [attr.aria-label]="'party.title' | t">
          @for (h of mercenaries(); track h.id) {
            <div class="card" role="button" tabindex="0" [class.on]="order(h.id) > 0" [attr.aria-pressed]="order(h.id) > 0" [attr.aria-disabled]="!order(h.id) && full() ? 'true' : null" (click)="toggle(h.id)" (keydown.enter)="toggle(h.id)" (keydown.space)="toggle(h.id); $event.preventDefault()">
              <img [src]="h.portraitFull" [alt]="h.name" />
              <button type="button" class="info" [attr.aria-label]="'detail.open' | t: { name: h.name }" [title]="'detail.open' | t: { name: h.name }" (click)="$event.stopPropagation(); detail.set(h)"><app-icon name="info" [size]="18" /></button>
      <app-value-star class="value" [value]="h.value" />
              <div class="cap">
                @if (familiarsOf(h).length) { <app-familiar-pill class="fam" [familiars]="familiarsOf(h)" /> }
                <app-mercenary-stats-pill class="stats" [health]="h.wounds" [speed]="h.speed" [overclock]="h.overclock" [armor]="h.armor" />
                <b>{{ h.name }}</b><span>{{ h.class | ct }}</span>
                @if (order(h.id) > 0) { <span class="n">{{ order(h.id) }}</span> }
              </div>
            </div>
          }
          @if (mercenaries().length) {
            <!-- Solo a eroi caricati: con la fila vuota lo scorrimento si agganciava a questa card e restava in fondo. -->
            <div class="more">
              <p>{{ 'party.more' | t }}</p>
              <button type="button" class="dlg-btn" aria-disabled="true" [title]="'common.soon' | t">{{ 'party.suggest' | t }}</button>
            </div>
          }
        </div>
      } @else {
        <div class="squad">
          @for (h of squad(); track h.id) {
            <app-briefing-column [mercenary]="h" [loadout]="loadoutOf(h.id)" [shop]="shop()" [others]="othersOf(h.id)" [skills]="skillsOf(h.id)" [visited]="visitedIds().includes(h.id)" (shopOpened)="markVisited(h.id)" [ready]="readyIds().includes(h.id)" (readyChange)="setReady(h.id, $event)" (changed)="setLoadout(h.id, $event)" />
          }
        </div>
      }
    </main>
    <footer class="foot">
      @if (step() === 'pick') {
        <button type="button" class="dlg-btn primary confirm" [class.off]="!ready()" [attr.aria-disabled]="ready() ? null : 'true'" (click)="confirm()">{{ 'party.confirm' | t }}<app-icon name="arrow_forward" [size]="20" /></button>
        @if (!ready()) { <p class="warn" role="status"><app-icon name="warning" [size]="18" />{{ warning() }}</p> }
      } @else {
        <button type="button" class="dlg-btn primary confirm" [class.off]="!allReady()" [attr.aria-disabled]="allReady() ? null : 'true'" (click)="start()">{{ 'party.begin' | t }}<app-icon name="arrow_forward" [size]="20" /></button>
      }
    </footer>
    <app-confirm-dialog [open]="skillNotice()" [danger]="false" [title]="'gear.noticeTitle' | t" [text]="'gear.noticeText' | t" [confirmLabel]="'gear.noticeOk' | t" (confirmed)="skillNotice.set(false)" (cancel)="skillNotice.set(false)" />
    <app-mercenary-detail-dialog [mercenary]="detail()" (closed)="detail.set(null)" />
    <app-confirm-dialog [open]="askUnspent()" [danger]="false" [title]="'party.unspentTitle' | t" [text]="'party.unspentText' | t: { names: unspentNames() }" [confirmLabel]="'party.startAnyway' | t" (confirmed)="askUnspent.set(false); go()" (cancel)="askUnspent.set(false)" />
  `,
  styles: `
    :host { position: fixed; inset: 0; overflow: hidden; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; background: var(--c-bg); color: var(--c-text); font: 14px/1.5 var(--font-ui); animation: slide-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
    @keyframes slide-in { from { opacity: 0; transform: translateX(48px); } }
    @media (prefers-reduced-motion: reduce) { :host { animation: none; } }
    /* Come una pagina con intestazione e piede: il titolo in alto, i tasti in basso, il contenuto al centro. */
    /* Righe esplicite: lo sfondo a puntini occupa tutta la griglia e non prende il posto di una riga. */
    app-dot-trail { grid-area: 1 / 1 / -1 / -1; }
    .head { grid-row: 1; grid-column: 1; position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: calc(14px + env(safe-area-inset-top)) 120px 8px; text-align: center; }
    .foot { grid-row: 3; grid-column: 1; position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 10px; min-height: 84px; padding: 8px 16px calc(18px + env(safe-area-inset-bottom)); box-sizing: border-box; justify-content: flex-end; }
    main { grid-row: 2; grid-column: 1; position: relative; min-height: 0; display: flex; align-items: center; justify-content: center; overflow-x: hidden; overflow-y: auto; }
    @media (max-width: 600px) { .head { padding-inline: 16px; padding-top: calc(66px + env(safe-area-inset-top)); } }
    .kicker { font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    h1 { margin: 0; font: 600 var(--fs-lg)/1.2 var(--font-display); letter-spacing: 0.03em; }
    .hint, .count { margin: 0; color: var(--c-text-dim); font-size: 13px; }
    .hint p { margin: 0; }
    /* Un mercenario per colonna: 3 colonne uguali, una sola su schermi stretti. */
    .squad { display: grid; grid-template-columns: repeat(3, minmax(0, 240px)); gap: 24px; justify-content: center; align-items: stretch; width: 100%; box-sizing: border-box; padding: 12px 24px; }
    @media (max-width: 900px) { .squad { grid-template-columns: minmax(0, 240px); } }
    .warn { display: inline-flex; align-items: center; gap: 6px; margin: 0; max-width: calc(100% - 340px); color: var(--c-warn); font-size: 13px; text-align: center; }
    /* «Conferma» in basso a destra, alto quanto la freccia indietro in basso a sinistra (36px, 44px sul tocco), con la freccia a destra della scritta. */
    .confirm { position: fixed; z-index: 3; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); box-sizing: border-box; height: 36px; display: inline-flex; align-items: center; gap: 8px; padding: 0 12px 0 16px; }
    @media (pointer: coarse) { .confirm { height: 44px; } }
    /* Su telefono i due tasti occupano gli angoli in basso: l'avviso sale sopra, a tutta larghezza. */
    @media (max-width: 600px) { .foot { padding-bottom: calc(66px + env(safe-area-inset-bottom)); } .warn { max-width: 100%; } }
    .row { display: flex; gap: 24px; width: 100%; box-sizing: border-box; padding: 18px 28px 22px 56px; overflow-x: auto; scroll-snap-type: x proximity; scroll-padding-inline: 56px 28px; overscroll-behavior-x: contain; }
    /* Con poche carte stanno al centro, con tante partono da sinistra: i margini automatici si azzerano quando non c'è spazio (con il centramento diretto la parte a sinistra restava tagliata e irraggiungibile). */
    .row > :first-child { margin-inline-start: auto; }
    .row > :last-child { margin-inline-end: auto; }
    .card {
      position: relative; flex: none; box-sizing: border-box; width: 210px; height: min(440px, 56dvh); min-height: 300px; margin: 0; padding: 0; overflow: hidden; scroll-snap-align: start; cursor: pointer;
      border-radius: 0 var(--radius-2) 0 var(--radius-2); border: 1px solid var(--c-line-strong); background: var(--c-tile); color: var(--c-text); font: inherit;
      transform: rotate(4deg); transform-origin: 30% 100%; box-shadow: 0 8px 22px rgba(0, 0, 0, 0.55); transition: border-color 0.15s, transform 0.15s;
    }
    /* In fondo alla fila: una carta vuota, grande come le altre, con il bordo tratteggiato; la frase al centro e il tasto (spento, per ora) in basso. */
    .more {
      position: relative; flex: none; box-sizing: border-box; width: 210px; height: min(440px, 56dvh); min-height: 300px; display: grid; place-items: center; padding: 16px 16px 64px;
      border-radius: 0 var(--radius-2) 0 var(--radius-2); border: 1px dashed var(--c-line-strong); transform: rotate(4deg); transform-origin: 30% 100%; scroll-snap-align: start;
    }
    .more p { margin: 0; text-align: center; color: var(--c-text-dim); font-size: 14px; font-style: italic; }
    .more .dlg-btn { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); white-space: nowrap; }
    .more .dlg-btn[aria-disabled='true'] { opacity: 0.4; cursor: default; pointer-events: none; }
    .card:hover, .card:focus-visible { border-color: var(--c-interact); outline: none; transform: rotate(4deg) translateY(-4px); }
    .card.on { border-color: var(--c-interact); box-shadow: 0 0 0 1px var(--c-interact), 0 8px 22px rgba(0, 0, 0, 0.55); }
    .card[aria-disabled='true'] { cursor: not-allowed; }
    .card[aria-disabled='true'] img { filter: grayscale(1) brightness(0.45); }
    img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: filter 0.2s; }
    /* Il numero di scelta sta nel piede, a destra, accanto al nome. */
    .cap .n { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: var(--radius-round); background: var(--c-interact); color: var(--c-bg); font: 700 13px/1 var(--font-mono); letter-spacing: 0; text-transform: none; }
    /* I punti ferita in cuori in colonna in alto a destra; velocità, overclock e armatura nella pillola sopra il piede a sinistra, il Valore a destra. */
    .fam { position: absolute; left: 8px; right: 8px; bottom: calc(100% + 54px); }
    .stats { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(100% + 6px); }
    .value { position: absolute; right: 8px; top: 8px; }
    /* Il tasto "i": un pallino scuro in alto a sinistra che apre la scheda di dettaglio. */
    .info { position: absolute; z-index: 2; top: 8px; left: 8px; display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; padding: 0; cursor: pointer; border-radius: var(--radius-round); border: 1px solid var(--c-line-strong); background: rgba(0, 0, 0, 0.7); color: var(--c-text); transition: color 0.15s, border-color 0.15s; }
    .info:hover, .info:focus-visible { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
    .cap { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; gap: 2px; padding: 8px 12px 10px; background: var(--c-surface); border-top: 1px solid var(--c-line-strong); text-align: left; }
    .cap b { font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.04em; }
    .cap span { color: var(--c-text-dim); font-size: 11px; font-weight: 600; letter-spacing: var(--label-tracking); text-transform: uppercase; }
  `,
})
export class PartyComponent {
  private readonly router = inject(Router);
  private readonly map = inject(ActivatedRoute).snapshot.paramMap.get('map') ?? '';
  protected readonly title = ADVENTURES.find((a) => a.map === this.map)?.title ?? this.map;
  protected readonly size = PARTY_SIZE;
  private readonly rawMercenaries = signal<MercenarySheet[]>([]);
  /** La variante di preparazione dell'avventura (monete in più, tesori in negozio): letta dal file della mappa. */
  private readonly adventureSetup = signal<AdventureSetup>({});
  /** Le schede con le monete di preparazione (300 più il bonus dell'avventura). */
  protected readonly mercenaries = computed(() => this.rawMercenaries().map((h) => ({ ...h, coins: coinsWithSetup(h.coins, this.adventureSetup()) })));
  /** Gli eroi scelti, nell'ordine in cui si sono toccati. */
  protected readonly chosen = signal<string[]>([]);
  /** I ruoli (Picchiatore, Artigliere, Incursore) che i mercenari scelti non coprono ancora: la squadra è valida solo con tutti e tre (docs/REGOLE-v2.md, §2). */
  protected readonly missingRoles = computed<Archetype[]>(() => {
    const covered = new Set(this.chosen().map((id) => this.mercenaries().find((h) => h.id === id)?.archetype));
    return ROLES.filter((role) => !covered.has(role));
  });
  protected readonly ready = computed(() => this.chosen().length === PARTY_SIZE && this.missingRoles().length === 0);
  /** Perché «Conferma» è spento: quanti mercenari mancano e quali ruoli sono scoperti. Si aggiorna a ogni scelta (e al cambio di lingua). */
  protected readonly warning = computed(() => {
    const left = PARTY_SIZE - this.chosen().length;
    const head = left > 1 ? translate('party.remaining', { n: left }) : left === 1 ? translate('party.remainingOne') : translate('party.coverage');
    const roles = this.missingRoles().map((role) => translate(MISSING_ROLE[role])).join(', ');
    return roles ? `${head} ${roles}.` : head;
  });
  /** Le schede degli eroi scelti, nell'ordine della squadra, e ciò che ognuno ha comprato. */
  protected readonly squad = computed(() => this.chosen().flatMap((id) => this.mercenaries().find((h) => h.id === id) ?? []));
  protected readonly shop = signal<ShopData | null>(null);
  /** I famigli del catalogo: una carta eroe che ne dà uno lo mostra già nella scelta (pillola "Famiglio"). */
  private readonly familiarDefs = signal<ReadonlyMap<string, FamiliarDef>>(new Map());
  protected familiarsOf(h: MercenarySheet): FamiliarDef[] {
    return familiarsOfSheet(h, this.familiarDefs());
  }
  /** Il catalogo delle carte abilità e quelle assegnate a ogni eroe della squadra (pescate quando si conferma la scelta). */
  private readonly skillCatalog = signal<ReadonlyMap<string, SkillDef>>(new Map());
  protected readonly skillCards = signal<Record<string, string[]>>({});
  /** Prima si scelgono gli eroi, poi (confermata la scelta) si comprano gli oggetti. */
  protected readonly step = signal<'pick' | 'gear'>('pick');
  protected readonly loadouts = signal<Record<string, Loadout>>({});
  protected readonly startCoins = computed(() => this.squad()[0]?.coins ?? 300);
  protected readonly full = computed(() => this.chosen().length >= PARTY_SIZE);

  constructor() {
    void loadAllMercenarySheets().then((h) => this.rawMercenaries.set(h));
    void loadAdventureSetup(this.map).then(async (setup) => {
      this.adventureSetup.set(setup);
      this.shop.set(await loadPregameShop(setup));
    });
    void loadSkillCatalog().then((c) => this.skillCatalog.set(c));
    void loadFamiliarCatalog().then((d) => this.familiarDefs.set(d));
  }

  /** La posizione dell'eroe nella squadra (1, 2…), o 0 se non è scelto. */
  protected order(id: string): number {
    return this.chosen().indexOf(id) + 1;
  }

  protected toggle(id: string) {
    this.chosen.update((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < PARTY_SIZE ? [...c, id] : c));
    // Un eroe lasciato a casa rimette in negozio ciò che aveva comprato.
    this.loadouts.update((l) => Object.fromEntries(Object.entries(l).filter(([mercenary]) => this.chosen().includes(mercenary))));
  }

  protected loadoutOf(id: string): Loadout {
    return this.loadouts()[id] ?? emptyLoadout();
  }

  /** Gli acquisti degli altri eroi della squadra: le copie in vendita sono comuni. */
  protected othersOf(id: string): Loadout[] {
    return Object.entries(this.loadouts()).filter(([mercenary]) => mercenary !== id).map(([, l]) => l);
  }

  protected setLoadout(id: string, l: Loadout) {
    this.loadouts.update((all) => ({ ...all, [id]: l }));
    // Cambiare il Briefing toglie il «Pronto»: va riconfermato.
    this.readyIds.update((r) => r.filter((x) => x !== id));
  }

  /** I mercenari che hanno detto «Pronto»: si parte solo quando lo sono tutti. */
  protected readonly readyIds = signal<string[]>([]);
  /** I mercenari il cui negozio è stato aperto almeno una volta: solo questi possono dire «Pronto» (comprare niente è permesso, ma il negozio si apre). */
  protected readonly visitedIds = signal<string[]>([]);
  protected markVisited(id: string) {
    this.visitedIds.update((v) => (v.includes(id) ? v : [...v, id]));
  }
  protected readonly allReady = computed(() => this.squad().length > 0 && this.squad().every((h) => this.readyIds().includes(h.id)));
  protected setReady(id: string, on: boolean) {
    if (on && !this.visitedIds().includes(id)) return;
    this.readyIds.update((r) => (on ? [...new Set([...r, id])] : r.filter((x) => x !== id)));
  }

  /** La freccia: dalla schermata degli acquisti si torna agli eroi, da quella degli eroi alla mappa del mondo. */
  protected back() {
    if (this.step() === 'gear') this.step.set('pick');
    else void this.router.navigate(['/']);
  }

  protected home() {
    void this.router.navigate(['/']);
  }

  protected confirm() {
    if (!this.ready()) return;
    this.assignSkills();
    this.readyIds.set([]);
    this.visitedIds.set([]);
    this.step.set('gear');
    this.skillNotice.set(true);
  }

  /** Dà a ogni eroe della squadra le sue carte abilità secondarie (una a caso per punto di attributo, senza doppioni nella squadra); chi le ha già le tiene, chi esce dalla squadra le rimette nel mazzo. */
  private assignSkills() {
    const pool = [...this.skillCatalog().values()].map((c) => ({ id: c.id, school: c.school }));
    const kept: Record<string, string[]> = {};
    for (const h of this.squad()) if (this.skillCards()[h.id]) kept[h.id] = this.skillCards()[h.id];
    const taken = new Set(Object.values(kept).flat());
    for (const h of this.squad()) {
      if (kept[h.id]) continue;
      kept[h.id] = drawSkillCards(h.skills, pool, taken);
      kept[h.id].forEach((id) => taken.add(id));
    }
    this.skillCards.set(kept);
  }

  protected skillsOf(id: string): SkillDef[] {
    return (this.skillCards()[id] ?? []).flatMap((c) => this.skillCatalog().get(c) ?? []);
  }

  /** Gli eroi che non hanno speso niente (hanno ancora tutte le monete): prima di partire si chiede conferma. */
  protected readonly unspentNames = computed(() => {
    const shop = this.shop();
    return this.squad().filter((h) => !shop || loadoutCost(this.loadoutOf(h.id), shop) === 0).map((h) => h.name).join(', ');
  });
  protected readonly askUnspent = signal(false);
  /** Entrando nell'Equipaggiamento una dialog avvisa che le abilità secondarie sono state assegnate a caso. */
  protected readonly skillNotice = signal(false);
  /** La scheda di dettaglio aperta dal tasto "i" di una carta. */
  protected readonly detail = signal<MercenarySheet | null>(null);

  protected start() {
    if (!this.ready() || !this.allReady()) return;
    if (this.unspentNames()) this.askUnspent.set(true);
    else this.go();
  }

  private go() {
    // Gli acquisti passano alla partita: per ogni eroe la dotazione e le monete che gli restano.
    const shop = this.shop();
    const setup: PartySetup = {};
    for (const h of this.squad()) {
      const l = this.loadoutOf(h.id);
      setup[h.id] = { ...l, coins: h.coins - (shop ? loadoutCost(l, shop) : 0), skillCards: this.skillCards()[h.id] ?? [] };
    }
    partySetupStore.save(setup);
    void this.router.navigate(['/play', this.map], { queryParams: { new: 1, party: this.chosen().join(',') } });
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PARTY_SIZE } from '../game/constants';
import type { AdventureSetup } from '../game/map/map-data';
import { Archetype, MercenarySheet, loadAllMercenarySheets } from '../game/mercenaries/mercenary-sheet';
import { Loadout, PartySetup, ShopData, coinsWithSetup, drawSkillCards, rerollSkillCard, skillRerollCost, budgetLeft, mercenaryBudgetBonus, emptyLoadout, loadAdventureSetup, loadPregameShop, partySetupStore } from '../game/mercenaries/party-setup';
import { CatalogTextPipe } from '../i18n/catalog-text.pipe';
import { translate } from '../i18n/i18n.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { ARCHETYPE_ICON, ARCHETYPE_NAME, ArchetypeMarkComponent } from '../ui/archetype-mark.component';
import { ConfirmDialogComponent } from '../ui/confirm-dialog.component';
import { MarkdownPipe } from '../ui/markdown.pipe';
import { DotTrailComponent } from '../ui/dot-trail.component';
import { MercenaryStatsPillComponent } from '../ui/mercenary-stats-pill.component';
import { CatalogDialogComponent } from '../ui/catalog-dialog.component';
import { MercenaryDetailDialogComponent, scrollIfPartial } from '../ui/mercenary-detail-dialog.component';
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
  imports: [ArchetypeMarkComponent, CatalogDialogComponent, CatalogTextPipe, ConfirmDialogComponent, MarkdownPipe, DotTrailComponent, FamiliarPillComponent, ValueStarComponent, MercenaryDetailDialogComponent, MercenaryStatsPillComponent, BriefingColumnComponent, IconComponent, PageNavComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dot-trail />
    <app-page-nav [confirmTitle]="'party.cancelTitle' | t" [confirmText]="'party.cancelText' | t" [confirmLabel]="'party.cancelLabel' | t" [showCatalog]="true" backIcon="close" [backLabel]="'nav.exit' | t" (catalog)="catalogOpen.set(true)" (back)="back()" (leave)="home()" />
    <app-catalog-dialog [open]="catalogOpen()" (closed)="catalogOpen.set(false)" />
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
            <div class="card" role="button" tabindex="0" [class.on]="order(h.id) > 0" [attr.aria-pressed]="order(h.id) > 0" [attr.aria-disabled]="!order(h.id) && full() ? 'true' : null" (click)="tap($event, h.id)" (keydown.enter)="toggle(h.id)" (keydown.space)="toggle(h.id); $event.preventDefault()">
              <img [src]="h.portraitFull" [alt]="h.name" />
              <!-- Gli archetipi in pallini, in colonna in alto a sinistra. -->
              <app-archetype-mark class="mark" [dice]="h.dice" />
      <app-value-star class="value" [value]="h.value" />
              <div class="cap">
                @if (familiarsOf(h).length) { <app-familiar-pill class="fam" [familiars]="familiarsOf(h)" /> }
                <app-mercenary-stats-pill class="stats" [health]="h.wounds" [speed]="h.speed" [overclock]="h.overclock" [armor]="h.armor" />
                <b>{{ h.name }}</b><span>{{ h.class | ct }}</span>
                <button type="button" class="info" [attr.aria-label]="'detail.open' | t: { name: h.name }" [title]="'detail.open' | t: { name: h.name }" (click)="$event.stopPropagation(); detail.set(h)"><app-icon name="info" [size]="24" /></button>
              </div>
              <!-- Il numero di scelta: una linea azzurra appena sotto la card, inclinata con lei, col numero al centro. -->
              @if (order(h.id) > 0) { <span class="order"><span class="n">{{ order(h.id) }}</span></span> }
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
            <app-briefing-column [mercenary]="h" [skillsSet]="!!skillCards()[h.id]" [rerollReasons]="rerollReasonsOf(h.id)" [rerollCost]="rerollCostOf(h.id)" (skillsGenerate)="generateSkills(h.id)" (skillReroll)="rerollSkill(h.id, $event)" [loadout]="loadoutOf(h.id)" [shop]="shop()" [others]="othersOf(h.id)" [skills]="skillsOf(h.id)" [visited]="visitedIds().includes(h.id)" (shopOpened)="markVisited(h.id)" [ready]="readyIds().includes(h.id)" (readyChange)="setReady(h.id, $event)" (changed)="setLoadout(h.id, $event)" />
          }
        </div>
      }
    </main>
    <footer class="foot" [class.pick]="step() === 'pick'">
      @if (step() === 'pick') {
        <button type="button" class="dlg-btn primary confirm" [class.off]="!ready()" [attr.aria-disabled]="ready() ? null : 'true'" [attr.aria-label]="'party.confirm' | t" (click)="confirm()"><span class="btn-label">{{ 'party.confirm' | t }}</span><app-icon name="arrow_forward" [size]="20" /></button>
        <!-- La squadra a colpo d'occhio: gialla finché manca un ruolo, verde quando è valida; un pallino per ruolo (pieno se coperto). La frase che spiega cosa manca resta nel tooltip e per i lettori di schermo. -->
        <div class="status" [class.ok]="ready()" [class.bad]="full() && !ready()">
          <p class="warn" role="status" [attr.aria-label]="ready() ? ('party.complete' | t) : warning()" [title]="ready() ? ('party.complete' | t) : warning()">
            <app-icon [name]="ready() ? 'check' : 'warning'" [size]="18" />
            @for (r of roles; track r) { <span class="role" [class.on]="!missingRoles().includes(r)"><span class="dot"><app-icon [name]="archetypeIcon[r]" [size]="16" aria-hidden="true" /></span><span class="lbl">{{ archetypeName[r] | t }}</span></span> }
          </p>
          <!-- Rimette a zero la scelta: un pallino a destra della pillola, con i suoi stessi colori (segue il suo bordo quando si allarga); spento finché non c'è almeno un mercenario scelto. -->
          <button type="button" class="reset" [class.off]="!chosen().length" [attr.aria-disabled]="chosen().length ? null : 'true'" [attr.aria-label]="'party.reset' | t" [title]="'party.reset' | t" (click)="reset()"><app-icon name="undo" [size]="18" /></button>
        </div>
      } @else {
        <button type="button" class="dlg-btn primary confirm" [class.off]="!allReady()" [attr.aria-disabled]="allReady() ? null : 'true'" [attr.aria-label]="'party.begin' | t" (click)="start()"><span class="btn-label">{{ 'party.begin' | t }}</span><app-icon name="arrow_forward" [size]="20" /></button>
      }
    </footer>
    <app-mercenary-detail-dialog [mercenary]="detail()" [chosen]="!!detail() && order(detail()!.id) > 0" [canChoose]="!detail() || !full() || order(detail()!.id) > 0" (choose)="chooseFromDetail($event)" (closed)="detail.set(null)" />
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
    main { grid-row: 2; grid-column: 1; position: relative; min-height: 0; display: flex; align-items: flex-start; justify-content: center; overflow-x: hidden; overflow-y: auto; }
    /* Centrato in verticale con i margini automatici, che si azzerano se il contenuto è più alto: con align-items: center la parte in alto restava tagliata e irraggiungibile. */
    main > * { margin-block: auto; }
    @media (max-width: 900px) { .head { padding-inline: 16px; padding-top: calc(66px + env(safe-area-inset-top)); } }
    .kicker { font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    h1 { margin: 0; font: 600 var(--fs-lg)/1.2 var(--font-display); letter-spacing: 0.03em; }
    .hint, .count { margin: 0; color: var(--c-text-dim); font-size: 13px; }
    .hint p { margin: 0; }
    /* In alto 30px: i badge del budget e «Pronto» sporgono a metà sopra la prima card e non devono essere tagliati. */
    /* Un mercenario per colonna: 3 colonne uguali, una sola su schermi stretti. */
    .squad { display: grid; grid-template-columns: repeat(3, minmax(0, 280px)); gap: 12px; justify-content: center; align-items: stretch; width: 100%; box-sizing: border-box; padding: 30px 24px 12px; }
    /* Desktop: le tre colonne occupano tutta l'altezza e ognuna scorre da sola (non tutta la pagina insieme). */
    @media (min-width: 901px) { .squad { height: 100%; grid-template-rows: minmax(0, 1fr); margin-block: 0; padding-top: 12px; } }
    @media (max-width: 900px) { .squad { grid-template-columns: minmax(0, 1fr); max-width: 520px; padding-inline: 16px; } }
    /* Fuori dal flusso: quando sparisce l'altezza del piè di pagina non cambia e le card non scattano. */
    /* La pillola della squadra: gialla finché manca un ruolo, verde quando c'è tutto. Il colore (currentColor) dà bordo, fondo e pallini. */
    /* Il gruppo in basso al centro: la pillola, centrata (si allarga da tutti e due i lati all'hover) e, fuori dal flusso, il reset che le sta a destra e ne segue il bordo. */
    .status { position: absolute; left: 50%; bottom: calc(18px + env(safe-area-inset-bottom)); transform: translateX(-50%); display: flex; align-items: center; gap: 8px; color: var(--c-warn); transition: color 0.2s; }
    .status.ok { color: var(--c-ok); }
    /* Tre mercenari scelti ma i ruoli non tornano: rossa, perché serve cambiare qualcuno (non basta aggiungere). */
    .status.bad { color: var(--c-error); }
    .warn { width: max-content; display: flex; align-items: center; gap: 8px; margin: 0; padding: 6px 12px 6px 10px; border-radius: 0 18px 0 18px; border: 1px solid color-mix(in srgb, currentColor 55%, transparent); background: color-mix(in srgb, currentColor 10%, var(--c-bg)); }
    /* Il reset: un pallino con i colori della pillola (a destra di lei, fuori dal flusso, così la pillola resta centrata; quando lei si allarga si sposta con il suo bordo). */
    .reset { position: absolute; left: calc(100% + 8px); top: 50%; transform: translateY(-50%); display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; padding: 0; cursor: pointer; border-radius: 50%; border: 1px solid color-mix(in srgb, currentColor 55%, transparent); background: color-mix(in srgb, currentColor 10%, var(--c-bg)); color: inherit; transition: background-color 0.15s, opacity 0.2s; }
    .reset:hover:not(.off), .reset:focus-visible:not(.off) { background: color-mix(in srgb, currentColor 22%, var(--c-bg)); outline: none; }
    .reset.off { opacity: 0.4; cursor: default; pointer-events: none; }
    /* Un pallino per archetipo con la sua icona: spento (tenue, tratteggiato) finché il ruolo manca, acceso quando è coperto. */
    .role { display: inline-flex; align-items: center; opacity: 0.5; transition: opacity 0.2s; }
    .role.on { opacity: 1; }
    .dot { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 26px; height: 26px; box-sizing: border-box; border-radius: 50%; border: 1px dashed currentColor; }
    .role.on .dot { border-style: solid; background: color-mix(in srgb, currentColor 18%, transparent); }
    /* All'hover la pillola si allarga: i nomi degli archetipi scorrono fuori accanto alle icone (la pillola è centrata, quindi cresce da tutti e due i lati). */
    .lbl { max-width: 0; margin-left: 0; overflow: hidden; white-space: nowrap; opacity: 0; font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; transition: max-width 0.3s ease, margin 0.3s ease, opacity 0.25s ease; }
    @media (min-width: 901px) { .warn:hover .lbl { max-width: 110px; margin-left: 6px; margin-right: 4px; opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .lbl { transition: none; } }
    /* «Conferma» in basso a destra, alto quanto la freccia indietro in basso a sinistra (36px, 44px sul tocco), con la freccia a destra della scritta. */
    .confirm { position: fixed; z-index: 3; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); box-sizing: border-box; height: 36px; display: inline-flex; align-items: center; gap: 8px; padding: 0 12px 0 16px; }
    @media (pointer: coarse) { .confirm { height: 44px; } }
    /* Su telefono i due tasti occupano gli angoli in basso: l'avviso sale sopra, a tutta larghezza. Nel Briefing, dove l'avviso non c'è, il piede è alto solo quanto i tasti e il resto va al contenuto. */
    /* Su telefono i due tasti diventano solo icona (X ed «avanti») e la pillola sta in mezzo a loro, sulla stessa riga: senza hover non ci sono nomi e solo il reset risponde al tocco. */
    @media (max-width: 900px) {
      .foot { min-height: 0; padding: 0 16px calc(60px + env(safe-area-inset-bottom)); }
      .btn-label { display: none; }
      .confirm { aspect-ratio: 1; padding: 0; gap: 0; justify-content: center; }
      .status { bottom: calc(14px + env(safe-area-inset-bottom)); }
      .warn { pointer-events: none; }
      /* Il reset sta in fila accanto alla pillola (il gruppo è centrato tra i due tasti ai lati): senza hover la pillola non si allarga. */
      .reset { position: static; transform: none; }
    }
    /* In fondo 34px: la linea del numero di scelta sporge sotto le card e, con l'inclinazione, scende ancora di più verso destra. */
    .row { display: flex; gap: 24px; width: 100%; box-sizing: border-box; padding: 18px 28px 34px 56px; overflow-x: auto; scroll-snap-type: x proximity; scroll-padding-inline: 56px 28px; overscroll-behavior-x: contain; }
    /* Con poche carte stanno al centro, con tante partono da sinistra: i margini automatici si azzerano quando non c'è spazio (con il centramento diretto la parte a sinistra restava tagliata e irraggiungibile). */
    .row > :first-child { margin-inline-start: auto; }
    .row > :last-child { margin-inline-end: auto; }
    .card {
      position: relative; flex: none; box-sizing: border-box; width: 210px; height: min(440px, 56dvh); min-height: 300px; margin: 0; padding: 0; scroll-snap-align: start; cursor: pointer;
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
    /* La card non ritaglia più (la linea del numero sta fuori): l'immagine e il piede seguono da soli gli angoli arrotondati, 1px dentro il bordo. */
    img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 0 calc(var(--radius-2) - 1px) 0 calc(var(--radius-2) - 1px); transition: filter 0.2s; }
    /* Il numero di scelta: una linea azzurra appena sotto la card, che gira con lei, col numero in un pallino al centro. */
    .order { position: absolute; left: 0; right: 0; top: calc(100% + 8px); height: 2px; display: flex; align-items: center; justify-content: center; background: var(--c-interact); pointer-events: none; }
    .n { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 24px; height: 24px; border-radius: var(--radius-round); background: var(--c-interact); color: var(--c-bg); font: 700 13px/1 var(--font-mono); letter-spacing: 0; text-transform: none; }
    /* Gli archetipi: pallini in colonna in alto a sinistra, dove prima c'era il tasto «i». */
    .mark { position: absolute; z-index: 2; top: 8px; left: 8px; }
    /* I punti ferita in cuori in colonna in alto a destra; velocità, overclock e armatura nella pillola sopra il piede a sinistra, il Valore a destra. */
    .fam { position: absolute; left: 8px; right: 8px; bottom: calc(100% + 54px); }
    .stats { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(100% + 6px); }
    .value { position: absolute; right: 8px; top: 8px; }
    /* Il tasto "i": solo l'icona (il cerchio è già nel disegno), a destra nel piede e centrata in altezza; apre la scheda di dettaglio. */
    .info { position: absolute; z-index: 2; top: 50%; right: 10px; transform: translateY(-50%); display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; cursor: pointer; border: 0; background: none; color: var(--c-text-dim); transition: color 0.15s; }
    .info:hover, .info:focus-visible { color: var(--c-interact); outline: none; }
    .cap { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; gap: 2px; padding: 8px 12px 10px; background: var(--c-surface); border-top: 1px solid var(--c-line-strong); border-radius: 0 0 0 calc(var(--radius-2) - 1px); text-align: left; }
    .cap b { font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.04em; }
    .cap span { color: var(--c-text-dim); font-size: 11px; font-weight: 600; letter-spacing: var(--label-tracking); text-transform: uppercase; }
  `,
})
export class PartyComponent {
  private readonly router = inject(Router);
  private readonly map = inject(ActivatedRoute).snapshot.paramMap.get('map') ?? '';
  protected readonly title = ADVENTURES.find((a) => a.map === this.map)?.title ?? this.map;
  protected readonly size = PARTY_SIZE;
  protected readonly roles = ROLES;
  protected readonly archetypeName = ARCHETYPE_NAME;
  protected readonly archetypeIcon = ARCHETYPE_ICON;
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
  protected readonly startCoins = computed(() => this.shop()?.budget ?? 300);
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

  /** Un tocco sulla card: se è seminascosta fa solo scorrere l'elenco fin lì, altrimenti la sceglie. */
  protected tap(e: Event, id: string) {
    if (!scrollIfPartial(e.currentTarget as HTMLElement)) this.toggle(id);
  }

  /** Toglie tutti i mercenari scelti (e ciò che avevano comprato). */
  protected reset() {
    if (!this.chosen().length) return;
    this.chosen.set([]);
    this.loadouts.set({});
    this.skillCards.set({});
  }

  protected toggle(id: string) {
    this.chosen.update((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < PARTY_SIZE ? [...c, id] : c));
    // Un eroe lasciato a casa rimette in negozio ciò che aveva comprato.
    this.loadouts.update((l) => Object.fromEntries(Object.entries(l).filter(([mercenary]) => this.chosen().includes(mercenary))));
    this.skillCards.update((all) => Object.fromEntries(Object.entries(all).filter(([mercenary]) => this.chosen().includes(mercenary))));
  }

  /** Il tasto della scheda: sceglie il mercenario o, se è già scelto, lo toglie; poi chiude la scheda. */
  protected chooseFromDetail(h: MercenarySheet) {
    this.toggle(h.id);
    this.detail.set(null);
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
    if (on && (!this.visitedIds().includes(id) || !this.skillCards()[id])) return; // serve aver aperto il negozio e impostato le abilità
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
    // Le abilità si generano nel Briefing («Imposta abilità»): chi esce dalla squadra perde le sue, chi resta le tiene.
    this.skillCards.update((all) => Object.fromEntries(Object.entries(all).filter(([id]) => this.chosen().includes(id))));
    this.readyIds.set([]);
    this.visitedIds.set([]);
    this.step.set('gear');
  }

  /** Il mazzo da cui si generano le abilità: tutte quelle del catalogo, con il loro ramo. */
  private readonly skillPool = computed(() => [...this.skillCatalog().values()].map((c) => ({ id: c.id, school: c.school })));

  /** «Imposta abilità»: genera a caso le abilità secondarie di un mercenario (una per punto di attributo), senza quelle già date agli altri della squadra. Una volta sola: riaprire la dialog mostra le stesse. */
  protected generateSkills(id: string) {
    const h = this.squad().find((x) => x.id === id);
    if (!h || this.skillCards()[id]) return;
    const taken = new Set(Object.values(this.skillCards()).flat());
    this.skillCards.update((all) => ({ ...all, [id]: drawSkillCards(h.skills, this.skillPool(), taken) }));
    this.readyIds.update((r) => r.filter((x) => x !== id));
  }

  /** Per ogni abilità del mercenario, se non si può cambiare: `noAlt` quando nel suo ramo non ne resta un'altra che nessuno ha; vuoto se si può. */
  protected rerollReasonsOf(id: string): ('' | 'noAlt')[] {
    const taken = new Set(Object.values(this.skillCards()).flat());
    return (this.skillCards()[id] ?? []).map((card) => {
      const school = this.skillCatalog().get(card)?.school;
      return school && this.skillPool().some((c) => c.school === school && c.id !== card && !taken.has(c.id)) ? '' : 'noAlt';
    });
  }

  /** Quanto costa il prossimo cambio: il primo è gratis, poi ognuno 25 in più del precedente. */
  protected rerollCostOf(id: string): number {
    return skillRerollCost(this.loadoutOf(id).skillRerolls ?? 0);
  }

  /** «Cambia»: sostituisce l'abilità `index` con un'altra dello stesso ramo e toglie il costo dal budget. Si può cambiare quante volte si vuole, pagando sempre di più. */
  protected rerollSkill(id: string, index: number) {
    const h = this.squad().find((x) => x.id === id);
    const shop = this.shop();
    const cards = this.skillCards()[id];
    if (!h || !shop || !cards?.[index] || this.rerollReasonsOf(id)[index]) return;
    const l = this.loadoutOf(id);
    if (this.rerollCostOf(id) > budgetLeft(h.startingGear ?? [], l, shop, mercenaryBudgetBonus(h))) return;
    const school = this.skillCatalog().get(cards[index])?.school;
    if (!school) return;
    const next = rerollSkillCard(cards[index], school, this.skillPool(), new Set(Object.values(this.skillCards()).flat()));
    if (!next) return;
    this.skillCards.update((all) => ({ ...all, [id]: cards.map((c, i) => (i === index ? next : c)) }));
    this.setLoadout(id, { ...l, skillRerolls: (l.skillRerolls ?? 0) + 1 });
  }

  protected skillsOf(id: string): SkillDef[] {
    return (this.skillCards()[id] ?? []).flatMap((c) => this.skillCatalog().get(c) ?? []);
  }

  /** Gli eroi che non hanno speso niente (hanno ancora tutte le monete): prima di partire si chiede conferma. */
  protected readonly unspentNames = computed(() => {
    const shop = this.shop();
    return this.squad().filter((h) => !shop || budgetLeft(h.startingGear ?? [], this.loadoutOf(h.id), shop, mercenaryBudgetBonus(h)) === shop.budget + mercenaryBudgetBonus(h)).map((h) => h.name).join(', ');
  });
  protected readonly askUnspent = signal(false);
  /** La scheda di dettaglio aperta dal tasto "i" di una carta. */
  protected readonly detail = signal<MercenarySheet | null>(null);
  /** Il catalogo di oggetti, mod, abilità e personaggi. */
  protected readonly catalogOpen = signal(false);

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
      setup[h.id] = { ...l, coins: shop ? Math.max(0, budgetLeft(h.startingGear ?? [], l, shop, mercenaryBudgetBonus(h))) : 0, skillCards: this.skillCards()[h.id] ?? [] };
    }
    partySetupStore.save(setup);
    void this.router.navigate(['/play', this.map], { queryParams: { new: 1, party: this.chosen().join(',') } });
  }
}

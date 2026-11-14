import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, isDevMode, output, signal, untracked } from '@angular/core';
import type { Contract } from '../game/contracts/contract';
import { CONTRACT_SLOTS, UNLOCK_RADIUS_M } from '../game/constants';
import { CatalogTextPipe } from '../i18n/catalog-text.pipe';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from '../ui/icon.component';
import { CipherTextComponent } from './cipher-text.component';
import type { WalkingRoute } from './route-service';
import type { AlertLevel } from './weather-alert';

/** Il numero collezionabile scritto come #001. */
export const contractNumber = (n: number): string => `#${String(n).padStart(3, '0')}`;

/** Una distanza leggibile: in metri sotto il chilometro, poi in chilometri con un decimale. */
const formatDistance = (meters: number): string => (meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`);

/** Passo a piedi in metri al secondo (circa 4,5 km/h), per stimare il tempo quando manca il percorso. */
const WALK_SPEED_MS = 1.25;
/** Oltre questa distanza (metri) dal contratto, con un'allerta meteo in corso, il pannello avvisa: bisogna uscire e camminare. */
const WEATHER_NOTE_FROM_M = 500;

/**
 * Il pannello con le info di un contratto, nello stile degli altri pannelli della mappa (stessa intestazione, stesso divisore a tutta larghezza, stesse spaziature):
 * su schermo largo è un pannello laterale a metà altezza che scivola da destra, oltre i tasti di navigazione; su telefono (fino a 640px) un foglio che sale dal basso.
 * Si apre quando `contract` c'è e si chiude quando torna `null` (il contenuto resta finché l'animazione finisce).
 * Titolo nell'intestazione; sotto numero e stato, la didascalia. Da bloccato titolo e didascalia sono cifrati (caratteri casuali dello stesso aspetto del testo vero); se si sblocca mentre li guardi si decifrano un poco alla volta, e se è bloccato a che distanza sei e cosa serve per sbloccarlo. Mentre il contratto si sta sbloccando (a portata) al posto del tasto c'è una sola barra «X%» in due metà: «Violazione…» e poi «Decrittazione…», in cui titolo e didascalia passano da simboli a testo vero. Il tasto è sempre «Accetta»
 * con quanti contratti hai (es. «Accetta 3/5»): spento se è bloccato, già accettato o i posti sono finiti. Lo sblocco manuale c'è solo in sviluppo, per vedere i due stati senza GPS.
 */
@Component({
  selector: 'app-contract-panel',
  imports: [CatalogTextPipe, CipherTextComponent, IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Non .panel: è una classe globale con il suo padding (come nel menu a tendina). -->
    <aside class="sheet" [class.open]="open()" [attr.aria-hidden]="!open()" [attr.aria-label]="shown() ? ('contract.card' | t: { n: number(shown()!.number) }) : null">
      @if (shown(); as c) {
        <header>
          <h2><app-cipher-text [text]="c.title | ct" [unlocked]="unlocked()" [owner]="c.id" [reveal]="reveal()" /></h2>
          <button type="button" class="close" [attr.aria-label]="'common.close' | t" [title]="'common.close' | t" (click)="closed.emit()"><app-icon name="close" [size]="20" /></button>
        </header>
        <hr />
        <div class="body">
          <p class="meta">
            <span class="num">{{ number(c.number) }}</span>
            <span class="state" [class.on]="badgeUnlocked()" [class.flash]="flash()"><app-icon [name]="badgeUnlocked() ? 'lock_open' : 'lock'" [size]="16" />{{ (badgeUnlocked() ? 'contract.unlocked' : 'contract.lockedState') | t }}</span>
          </p>
          <app-cipher-text class="caption" [text]="c.caption | ct" [unlocked]="unlocked()" [owner]="c.id" [reveal]="reveal()" />
          <!-- Le uniche frasi che spariscono da un contratto sbloccato (o a portata, dove la violazione è in corso): fuori dal campo di sincronizzazione e il raggio per sbloccare. La distanza resta sempre. -->
          @if (!unlocked() && breach() === null) { <p class="muted">{{ 'contract.locked' | t }}</p> }
          @if (distanceLine(); as d) { <p class="info"><app-icon name="navigation" [size]="16" />{{ d.key | t: d.params }}</p> }
          @if (alertLevel(); as level) {
            @if (far()) { <p class="info warn" [class.blink]="open()" [attr.data-level]="level" role="status"><app-icon name="warning" [size]="16" />{{ 'contract.weatherAlert' | t }}</p> }
          }
          @if (!unlocked() && breach() === null) { <p class="info">{{ 'contract.approach' | t: { n: radius } }}</p> }
          @if (dev && !unlocked() && breach() === null) { <button type="button" class="dlg-btn" (click)="devUnlock.emit(c)">{{ 'contract.devUnlock' | t }}</button> }
          @if (dev) { <button type="button" class="dlg-btn" (click)="devReset.emit()">{{ 'contract.devReset' | t }}</button> }
        </div>
        <!-- Il tasto principale sta fuori dal testo che scorre: si vede sempre. -->
        <footer>
          @if (breach() !== null) {
            <!-- La violazione: restando a portata per qualche secondo la barra si riempie (a riempimento, non a segmenti) e il contratto si sblocca. Prende il posto del tasto. -->
            <div class="breach" role="progressbar" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="percent()" [attr.aria-label]="(decrypting() ? 'contract.decrypt' : 'contract.breach') | t">
              <div class="breach-row"><span>{{ (decrypting() ? 'contract.decrypt' : 'contract.breach') | t }}</span><span class="pct">{{ percent() }}%</span></div>
              <div class="track"><div class="fill" [style.width.%]="percent()"></div></div>
            </div>
          } @else {
            <button type="button" class="dlg-btn primary" [attr.aria-disabled]="canAccept() ? null : 'true'" (click)="canAccept() && accept.emit(c)">{{ (accepted() ? 'contract.accepted' : 'contract.acceptCount') | t: { n: heldCount(), max: maxHeld() } }}</button>
          }
        </footer>
      }
    </aside>
  `,
  styles: `
    :host { display: contents; }
    /* Desktop: lo specchio dei filtri e della legenda, dall'altra parte. Nasce a metà altezza, oltre i tasti di navigazione (10px dal bordo + 36px di tasto + 10px di respiro = 56px), scivola da destra e cresce dal centro lasciando liberi la barra in alto e l'orologio. Sta sotto i tasti (z-index 0 contro l'1 dei tasti). */
    .sheet { --w: min(320px, 82vw); --rail: 56px; position: absolute; z-index: 0; top: 50%; right: var(--rail); max-height: calc(100% - 112px); width: var(--w); box-sizing: border-box; display: flex; flex-direction: column; overflow-y: auto; background: var(--c-surface); border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); color: var(--c-text); font: 14px/1.4 var(--font-ui); transform: translate(calc(var(--w) + var(--rail)), -50%); transition: transform var(--t-base) var(--ease-draw); }
    .sheet.open { transform: translate(0, -50%); }
    .sheet:not(.open) { visibility: hidden; transition: transform var(--t-base) var(--ease-draw), visibility 0s linear var(--t-base); }
    /* Telefono: un foglio alto metà schermo che sale dal basso a tutta larghezza, sopra i tasti della mappa. */
    @media (max-width: 640px) {
      .sheet { z-index: 4; top: auto; right: 0; bottom: 0; left: 0; width: auto; height: 50%; max-height: none; overflow: hidden; padding-bottom: env(safe-area-inset-bottom); border-width: 1px 0 0; border-radius: 0; transform: translateY(100%); }
      .sheet.open { transform: none; }
      /* Metà schermo al contratto, metà alla mappa: l'intestazione resta ferma e scorre solo il testo. */
      .body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
    }
    /* Intestazione, divisore e tasto di chiusura: gli stessi dei filtri. */
    header { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 10px 10px 14px; }
    /* flex: 1: il titolo ha sempre la larghezza che resta accanto al tasto di chiusura, anche cifrato (altrimenti la larghezza seguirebbe i simboli e il testo andrebbe a capo in punti diversi). */
    h2 { flex: 1; min-width: 0; margin: 0; font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.06em; text-transform: uppercase; }
    hr { flex: none; width: 100%; margin: 0; border: 0; border-top: 1px solid var(--c-line-strong); }
    .close { flex: none; width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: none; color: var(--c-text-dim); cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast); }
    .close:hover, .close:focus-visible { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
    /* Il piè di pagina col tasto (o la barra di violazione): non scorre. Su schermo largo, dove scorre tutto il foglio, resta incollato in fondo. */
    footer { flex: none; position: sticky; bottom: 0; display: flex; flex-direction: column; padding: 10px 14px 14px; background: var(--c-surface); border-top: 1px solid var(--c-line); }
    /* Il contenuto con le spaziature dell'elenco dei filtri. */
    .body { display: flex; flex-direction: column; align-items: stretch; gap: 10px; padding: 12px 14px 14px; }
    p { margin: 0; }
    .meta { display: flex; align-items: center; gap: 10px; color: var(--c-text-dim); }
    .num { font: 600 12px/1 var(--font-mono); letter-spacing: 0.08em; }
    .state { display: inline-flex; align-items: center; gap: 6px; font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; }
    .state.on { color: var(--c-interact); }
    /* Violazione compiuta: «Bloccato» lampeggia di verde due volte e diventa «Sbloccato». */
    .state.flash { animation: unlock-flash 0.6s ease-in-out 2; }
    @keyframes unlock-flash { 50% { color: var(--c-you); text-shadow: 0 0 8px var(--c-you); } }
    @media (prefers-reduced-motion: reduce) { .state.flash { animation: none; } }
    .caption { color: var(--c-text); }
    .muted { color: var(--c-text-dim); font-style: italic; }
    /* La violazione: etichetta e percentuale ai due lati, sotto una barra che si riempie. */
    .breach { display: flex; flex-direction: column; gap: 6px; }
    .breach-row { display: flex; justify-content: space-between; align-items: baseline; font: 600 12px/1.2 var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; color: var(--c-text); }
    .pct { font-variant-numeric: tabular-nums; color: var(--c-interact); }
    .track { height: 8px; box-sizing: border-box; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); background: var(--c-bg); overflow: hidden; }
    .fill { height: 100%; background: var(--c-interact); transition: width 120ms linear; }
    .info { display: flex; align-items: center; gap: 6px; color: var(--c-text-dim); font-size: 13px; }
    /* L'avviso di allerta meteo: il colore del livello (come il blocchetto sulla mappa); ogni volta che il pannello si apre lampeggia due volte e poi resta fisso. */
    .warn { color: var(--alert-color); }
    .warn[data-level='yellow'] { --alert-color: var(--c-warn); }
    .warn[data-level='orange'] { --alert-color: var(--c-missing); }
    .warn[data-level='red'] { --alert-color: var(--c-danger); }
    .warn.blink { animation: alert-blink 1s ease-in-out 2; }
    @keyframes alert-blink { 50% { opacity: 0.15; } }
    @media (prefers-reduced-motion: reduce) { .warn.blink { animation: none; } }
  `,
})
export class ContractPanelComponent {
  /** Il contratto da mostrare; `null` chiude il pannello. */
  readonly contract = input<Contract | null>(null);
  readonly unlockedIn = input(false, { alias: 'unlocked' });
  /** Quanto dista il giocatore dal contratto, in metri (null se non si conosce la posizione). */
  readonly distanceIn = input<number | null>(null, { alias: 'distance' });
  /** Il percorso a piedi fino al contratto e a che punto è il calcolo. */
  readonly routeIn = input<WalkingRoute | null>(null, { alias: 'route' });
  /** La violazione in corso (0-1) mentre si resta a portata, o null se non è in corso. */
  readonly breachIn = input<number | null>(null, { alias: 'breach' });
  /** Il contratto è già fra quelli accettati, quanti ne ha il giocatore e quanti può tenerne al massimo. */
  readonly acceptedIn = input(false, { alias: 'accepted' });
  readonly heldCountIn = input(0, { alias: 'heldCount' });
  readonly maxHeldIn = input(CONTRACT_SLOTS, { alias: 'maxHeld' });
  /** Il livello dell'allerta meteo in corso dove si trova il giocatore, o null se non ce n'è. */
  readonly alertLevelIn = input<AlertLevel | null>(null, { alias: 'alertLevel' });
  readonly closed = output<void>();
  /** Il tasto «Accetta»: attivo se il contratto è sbloccato, non è già accettato e c'è posto. */
  readonly accept = output<Contract>();
  readonly devUnlock = output<Contract>();
  /** Solo in sviluppo: azzera sblocchi e contratti accettati. */
  readonly devReset = output<void>();

  /**
   * I valori che il pannello mostra: copie di quelli che arrivano da fuori, aggiornate solo finché il pannello è aperto. Quando si chiude (il contratto torna null, e chi lo usa
   * azzera distanza, sblocco, accettazione...) il pannello scivola via con lo stesso aspetto che aveva, senza tornare per un attimo allo stato "da bloccato" con i tasti doppi,
   * e riaprendolo un contratto già sbloccato non si rivede la cifratura.
   */
  protected readonly unlocked = signal(false);
  protected readonly distance = signal<number | null>(null);
  protected readonly route = signal<WalkingRoute | null>(null);
  protected readonly breach = signal<number | null>(null);
  protected readonly accepted = signal(false);
  protected readonly heldCount = signal(0);
  protected readonly maxHeld = signal(CONTRACT_SLOTS);
  protected readonly alertLevel = signal<AlertLevel | null>(null);
  /** Il contratto è più lontano di WEATHER_NOTE_FROM_M (come la distanza mostrata: a piedi se c'è il percorso): solo allora serve l'avviso, da vicino si è già fuori. */
  protected readonly far = computed(() => {
    const route = this.route();
    const meters = route ? route.distanceM : this.distance();
    return meters !== null && meters > WEATHER_NOTE_FROM_M;
  });

  /** La procedura ha una sola barra in due metà: prima la violazione, poi la decrittazione (da lì i simboli diventano testo vero, tanto quanto la barra va oltre la metà). */
  protected readonly decrypting = computed(() => (this.breach() ?? 0) >= 0.5);
  protected readonly reveal = computed(() => {
    const b = this.breach();
    return b === null ? null : Math.max(0, (b - 0.5) * 2);
  });
  /** L'etichetta dello stato: a violazione compiuta (metà barra) passa a «Sbloccato», anche se la decrittazione deve ancora finire. */
  protected readonly badgeUnlocked = computed(() => this.unlocked() || (this.breach() ?? 0) >= 0.5);
  /** Lampeggia di verde per un attimo quando lo stato passa a «Sbloccato» mentre si guarda il pannello (non riaprendo un contratto già sbloccato). */
  protected readonly flash = signal(false);
  private badgeId: string | null = null;
  private badgeWas = false;
  private flashTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly percent = computed(() => Math.floor((this.breach() ?? 0) * 100));
  protected readonly canAccept = computed(() => this.unlocked() && !this.accepted() && this.heldCount() < this.maxHeld());
  protected readonly dev = isDevMode();
  protected readonly radius = UNLOCK_RADIUS_M;
  protected readonly number = contractNumber;
  protected readonly open = computed(() => !!this.contract());
  /** L'ultimo contratto aperto: resta scritto mentre il pannello scivola via. */
  protected readonly shown = signal<Contract | null>(null);
  /**
   * L'unica indicazione di distanza, sempre presente se si conosce la posizione: «A 1,2 km da te, ~15 m a piedi» (o «più di 1h a piedi»). Se c'è il percorso a piedi
   * si usano la sua lunghezza e il suo tempo, altrimenti la distanza in linea d'aria e il tempo a passo normale.
   */
  protected readonly distanceLine = computed<{ key: 'contract.distanceMinutes' | 'contract.distanceHour'; params: Record<string, string | number> } | null>(() => {
    const route = this.route();
    const meters = route ? route.distanceM : this.distance();
    if (meters === null) return null;
    const minutes = Math.max(1, Math.round((route ? route.durationS : meters / WALK_SPEED_MS) / 60));
    const distance = formatDistance(meters);
    const params = { distance, n: minutes }; // il numero lo usa solo la frase con i minuti (per l'ora serve solo la distanza)
    if (minutes >= 60) return { key: 'contract.distanceHour', params };
    return { key: 'contract.distanceMinutes', params };
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.flashTimer) clearTimeout(this.flashTimer);
    });
    effect(() => {
      const id = this.shown()?.id ?? null;
      const now = this.badgeUnlocked();
      untracked(() => {
        if (id === this.badgeId && now && !this.badgeWas) {
          this.flash.set(true);
          if (this.flashTimer) clearTimeout(this.flashTimer);
          this.flashTimer = setTimeout(() => this.flash.set(false), 1400);
        }
        this.badgeId = id;
        this.badgeWas = now;
      });
    });
    effect(() => {
      const c = this.contract();
      const values = {
        unlocked: this.unlockedIn(),
        distance: this.distanceIn(),
        route: this.routeIn(),
        breach: this.breachIn(),
        accepted: this.acceptedIn(),
        heldCount: this.heldCountIn(),
        maxHeld: this.maxHeldIn(),
        alertLevel: this.alertLevelIn(),
      };
      if (!c) return; // chiuso: restano i valori di prima
      this.shown.set(c);
      this.unlocked.set(values.unlocked);
      this.distance.set(values.distance);
      this.route.set(values.route);
      this.breach.set(values.breach);
      this.accepted.set(values.accepted);
      this.heldCount.set(values.heldCount);
      this.maxHeld.set(values.maxHeld);
      this.alertLevel.set(values.alertLevel);
    });
  }
}

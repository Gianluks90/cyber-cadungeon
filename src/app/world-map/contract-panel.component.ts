import { ChangeDetectionStrategy, Component, computed, effect, input, isDevMode, output, signal } from '@angular/core';
import type { Contract } from '../game/contracts/contract';
import { CONTRACT_SLOTS, UNLOCK_RADIUS_M } from '../game/constants';
import { CatalogTextPipe } from '../i18n/catalog-text.pipe';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from '../ui/icon.component';
import { CipherTextComponent } from './cipher-text.component';
import type { WalkingRoute } from './route-service';

/** Il numero collezionabile scritto come #001. */
export const contractNumber = (n: number): string => `#${String(n).padStart(3, '0')}`;

/** Una distanza leggibile: in metri sotto il chilometro, poi in chilometri con un decimale. */
const formatDistance = (meters: number): string => (meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`);

/** Il tempo a piedi in forma breve: "12 min" o "1 h 5 min" (almeno 1 minuto). */
const formatDuration = (seconds: number): string => {
  const min = Math.max(1, Math.round(seconds / 60));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
};

/**
 * Il pannello con le info di un contratto, nello stile degli altri pannelli della mappa (stessa intestazione, stesso divisore a tutta larghezza, stesse spaziature):
 * su schermo largo è un pannello laterale a metà altezza che scivola da destra, oltre i tasti di navigazione; su telefono (fino a 640px) un foglio che sale dal basso.
 * Si apre quando `contract` c'è e si chiude quando torna `null` (il contenuto resta finché l'animazione finisce).
 * Titolo nell'intestazione; sotto numero e stato, la didascalia (da bloccato è cifrata: caratteri casuali al posto del testo; se si sblocca mentre la guardi si decifra un poco alla volta), e se è bloccato a che distanza sei e cosa serve per sbloccarlo. Il tasto è sempre «Accetta»
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
          <h2>{{ c.title | ct }}</h2>
          <button type="button" class="close" [attr.aria-label]="'common.close' | t" [title]="'common.close' | t" (click)="closed.emit()"><app-icon name="close" [size]="20" /></button>
        </header>
        <hr />
        <div class="body">
          <p class="meta">
            <span class="num">{{ number(c.number) }}</span>
            <span class="state" [class.on]="unlocked()"><app-icon [name]="unlocked() ? 'lock_open' : 'lock'" [size]="16" />{{ (unlocked() ? 'contract.unlocked' : 'contract.lockedState') | t }}</span>
          </p>
          <app-cipher-text [text]="c.caption | ct" [unlocked]="unlocked()" [owner]="c.id" />
          @if (!unlocked()) {
            <p class="muted">{{ 'contract.locked' | t }}</p>
            @if (distanceText(); as d) { <p class="info"><app-icon name="navigation" [size]="16" />{{ 'contract.distance' | t: { distance: d } }}</p> }
            @if (walkText(); as w) { <p class="info"><app-icon name="footprint" [size]="16" />{{ 'contract.walk' | t: { walk: w } }}</p> }
            @else if (routeStatus() === 'loading') { <p class="info">{{ 'contract.routeLoading' | t }}</p> }
            @else if (routeStatus() === 'failed') { <p class="info">{{ 'contract.routeFailed' | t }}</p> }
            <p class="info">{{ 'contract.approach' | t: { n: radius } }}</p>
          }
          <button type="button" class="dlg-btn primary" [attr.aria-disabled]="canAccept() ? null : 'true'" (click)="canAccept() && accept.emit(c)">{{ (accepted() ? 'contract.accepted' : 'contract.acceptCount') | t: { n: heldCount(), max: maxHeld() } }}</button>
          @if (dev && !unlocked()) { <button type="button" class="dlg-btn" (click)="devUnlock.emit(c)">{{ 'contract.devUnlock' | t }}</button> }
        </div>
      }
    </aside>
  `,
  styles: `
    :host { display: contents; }
    /* Desktop: lo specchio dei filtri e della legenda, dall'altra parte. Nasce a metà altezza, oltre i tasti di navigazione (10px dal bordo + 36px di tasto + 10px di respiro = 56px), scivola da destra e cresce dal centro lasciando liberi la barra in alto e l'orologio. Sta sotto i tasti (z-index 0 contro l'1 dei tasti). */
    .sheet { --w: min(320px, 82vw); --rail: 56px; position: absolute; z-index: 0; top: 50%; right: var(--rail); max-height: calc(100% - 112px); width: var(--w); box-sizing: border-box; display: flex; flex-direction: column; overflow-y: auto; background: var(--c-surface); border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); color: var(--c-text); font: 14px/1.4 var(--font-ui); transform: translate(calc(var(--w) + var(--rail)), -50%); transition: transform var(--t-base) var(--ease-draw); }
    .sheet.open { transform: translate(0, -50%); }
    .sheet:not(.open) { visibility: hidden; transition: transform var(--t-base) var(--ease-draw), visibility 0s linear var(--t-base); }
    /* Telefono: un foglio che sale dal basso a tutta larghezza. */
    @media (max-width: 640px) {
      .sheet { z-index: 2; top: auto; right: 0; bottom: 0; left: 0; width: auto; max-height: 60dvh; padding-bottom: env(safe-area-inset-bottom); border-width: 1px 0 0; border-radius: 0; transform: translateY(100%); }
      .sheet.open { transform: none; }
    }
    /* Intestazione, divisore e tasto di chiusura: gli stessi dei filtri. */
    header { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 10px 10px 14px; }
    h2 { margin: 0; font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.06em; text-transform: uppercase; }
    hr { flex: none; width: 100%; margin: 0; border: 0; border-top: 1px solid var(--c-line-strong); }
    .close { flex: none; width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: none; color: var(--c-text-dim); cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast); }
    .close:hover, .close:focus-visible { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
    /* Il contenuto con le spaziature dell'elenco dei filtri. */
    .body { display: flex; flex-direction: column; align-items: stretch; gap: 10px; padding: 12px 14px 14px; }
    p { margin: 0; }
    .meta { display: flex; align-items: center; gap: 10px; color: var(--c-text-dim); }
    .num { font: 600 12px/1 var(--font-mono); letter-spacing: 0.08em; }
    .state { display: inline-flex; align-items: center; gap: 6px; font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; }
    .state.on { color: var(--c-interact); }
    .caption { color: var(--c-text); }
    .muted { color: var(--c-text-dim); font-style: italic; }
    .info { display: flex; align-items: center; gap: 6px; color: var(--c-text-dim); font-size: 13px; }
  `,
})
export class ContractPanelComponent {
  /** Il contratto da mostrare; `null` chiude il pannello. */
  readonly contract = input<Contract | null>(null);
  readonly unlocked = input(false);
  /** Quanto dista il giocatore dal contratto, in metri (null se non si conosce la posizione). */
  readonly distance = input<number | null>(null);
  /** Il percorso a piedi fino al contratto e a che punto è il calcolo. */
  readonly route = input<WalkingRoute | null>(null);
  readonly routeStatus = input<'idle' | 'loading' | 'failed'>('idle');
  /** Il contratto è già fra quelli accettati, quanti ne ha il giocatore e quanti può tenerne al massimo. */
  readonly accepted = input(false);
  readonly heldCount = input(0);
  readonly maxHeld = input(CONTRACT_SLOTS);
  readonly closed = output<void>();
  /** Il tasto «Accetta»: attivo se il contratto è sbloccato, non è già accettato e c'è posto. */
  readonly accept = output<Contract>();
  readonly devUnlock = output<Contract>();

  protected readonly canAccept = computed(() => this.unlocked() && !this.accepted() && this.heldCount() < this.maxHeld());
  protected readonly dev = isDevMode();
  protected readonly radius = UNLOCK_RADIUS_M;
  protected readonly number = contractNumber;
  protected readonly open = computed(() => !!this.contract());
  /** L'ultimo contratto aperto: resta scritto mentre il pannello scivola via. */
  protected readonly shown = signal<Contract | null>(null);
  protected readonly distanceText = computed(() => {
    const d = this.distance();
    return d === null ? '' : formatDistance(d);
  });
  protected readonly walkText = computed(() => {
    const r = this.route();
    return r ? `${formatDistance(r.distanceM)} · ${formatDuration(r.durationS)}` : '';
  });

  constructor() {
    effect(() => {
      const c = this.contract();
      if (c) this.shown.set(c);
    });
  }
}

import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, NgZone, afterNextRender, effect, inject, input, isDevMode, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Map as MapLibreMap, Marker, addProtocol, removeProtocol, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { AuthService } from '../auth/auth.service';
import { translate } from '../i18n/i18n.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { setGraphics, type GraphicsOptions } from '../game/graphics-settings';
import { DropdownMenuComponent, type DropdownItem } from '../ui/dropdown-menu.component';
import { GraphicsDialogComponent } from '../ui/graphics-dialog.component';
import { IconComponent } from '../ui/icon.component';
import { BASEMAP_SOURCE_ID, START_VIEW } from './map-config';
import { TileLoadingView } from './tile-loading';
import { LocationConsentComponent } from './location-consent.component';
import { GOOD_ACCURACY_M, LocationService, type UserPosition } from './location.service';
import { applyTerrain, buildMapStyle } from './map-style';
import { MapNavComponent } from './map-nav.component';
import { MapCreditsComponent } from './map-credits.component';
import { MapLocatingComponent } from './map-locating.component';
import { MapFilterPanelComponent } from './map-filter-panel.component';
import { FILTER_GROUPS, applyMapFilters, enabledFor, loadCustomFilters, loadPreset, saveCustomFilters, savePreset, type FilterPreset } from './map-filters';
import { createCyberpunkTheme, type MapTheme } from './map-theme';
import type { Contract } from '../game/contracts/contract';
import { JsonContractStore, type ContractStore } from '../game/contracts/contract-store';
import { LocalUnlockStore, type UnlockStore } from '../game/contracts/unlock-store';
import { DEV_CONTRACT_PREFIX, canUnlock, devContracts } from '../game/contracts/unlock-rule';
import { ContractPanelComponent, contractNumber } from './contract-panel.component';
import { distanceMeters } from '../game/contracts/unlock-rule';
import { OsrmFootRouteService, type RouteService, type WalkingRoute } from './route-service';
import { ContractCounterComponent } from './contract-counter.component';
import { MapLegendPanelComponent } from './map-legend-panel.component';

/** Inclinazione fissa della vista 3D, in gradi: non si regola a mano. */
const PITCH_3D = 60;
const VIEW3D_KEY = 'cad-map-3d';
const HALO_KEY = 'cad-map-halo';
const readFlag = (key: string): boolean => {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
};
const loadHaloShown = (): boolean => {
  try { return localStorage.getItem(HALO_KEY) !== '0'; } catch { return true; }
};

/** Il percorso a piedi: id della sorgente e del livello della linea, e di quanto deve spostarsi il giocatore (metri) perché lo si richieda. */
const ROUTE_SOURCE = 'contract-route';
const ROUTE_LAYER = 'contract-route';
const ROUTE_REFRESH_M = 150;

/** Quanto la mappa si avvicina al giocatore quando lo trova. */
const USER_ZOOM = 16;

/**
 * La mappa del mondo, che è la home (`/`): MapLibre su dati Protomaps, nel tema cyberpunk. Nasce fuori da NgZone (le animazioni continue non devono far girare Angular)
 * e si distrugge con la pagina: `map.remove()` libera il contesto WebGL. Il contenitore ha un `ResizeObserver` che ridisegna la mappa quando cambia la sua misura.
 * Il genitore deve dare un'altezza vera al componente (qui `/` è a tutto schermo).
 */
@Component({
  selector: 'app-world-map',
  imports: [IconComponent, TranslatePipe, DropdownMenuComponent, GraphicsDialogComponent, MapFilterPanelComponent, MapNavComponent, MapCreditsComponent, MapLocatingComponent, LocationConsentComponent, ContractPanelComponent, ContractCounterComponent, MapLegendPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #container class="map" [class.ready]="ready()" role="application" [attr.aria-label]="'worldMap.label' | t"></div>
    @if (locating()) {
      <app-map-locating [position]="location.position()" />
    }
    <div class="logo" role="img" [attr.aria-label]="'worldMap.logo' | t" [style.--logo]="logoUrl"></div>
    <app-map-filter-panel [enabled]="enabled()" [preset]="preset()" [open]="panel() === 'filters'" (openChange)="setPanel('filters', $event)" (toggled)="toggle($event)" (presetChosen)="choosePreset($event)" />
    <app-map-legend-panel [open]="panel() === 'legend'" (openChange)="setPanel('legend', $event)" />
    <app-contract-counter [count]="heldContracts()" />
    <app-dropdown-menu [label]="'home.menu' | t" [title]="'home.menu' | t" [items]="menuItems()" hotkey="m" [open]="panel() === 'menu'" (openChange)="setPanel('menu', $event)" (picked)="onMenu($event)">
      <button dropdown-actions type="button" class="hbtn" [attr.aria-label]="(fullscreen() ? 'home.exitFullscreen' : 'home.fullscreen') | t" [title]="(fullscreen() ? 'home.exitFullscreen' : 'home.fullscreen') | t" (click)="toggleFullscreen()">
        <app-icon [name]="fullscreen() ? 'fullscreen_exit' : 'fullscreen'" [size]="18" />
      </button>
      <button dropdown-actions type="button" class="hbtn" [attr.aria-label]="'worldMap.menu.settings' | t" [title]="'worldMap.menu.settings' | t" (click)="openSettings()">
        <app-icon name="settings" [size]="18" />
      </button>
    </app-dropdown-menu>
    <p class="clock" role="timer" [attr.aria-label]="(isNight() ? 'worldMap.night' : 'worldMap.day') | t">
      <span class="sun" [class.swapping]="swapping()"><app-icon [name]="shownNight() ? 'bedtime' : 'light_mode'" [size]="20" /></span>
      {{ time() }}
    </p>
    <app-map-nav [located]="!location.locked()" [view3d]="view3d()" [bearing]="bearing()" (locate)="focusUser()" (toggle3d)="toggle3d()" (resetNorth)="resetNorth()" (zoomIn)="zoom(1)" (zoomOut)="zoom(-1)" />
    <app-contract-panel [contract]="selectedContract()" [unlocked]="!!selectedContract() && unlockedIds().has(selectedContract()!.id)" [distance]="selectedDistance()" [route]="route()" [routeStatus]="routeStatus()" (closed)="selectedId.set(null)" (play)="playContract($event)" (devUnlock)="devUnlock($event)" />
    <app-map-credits [open]="creditsOpen()" (closed)="creditsOpen.set(false)" />
    <app-graphics-dialog [open]="settingsOpen()" (confirmed)="saveSettings($event)" (cancel)="settingsOpen.set(false)" />
    @if (location.searching() && ready()) {
      <p class="status">{{ 'location.searching' | t }}</p>
    } @else if (lowAccuracy(); as meters) {
      <p class="status">
        {{ 'location.lowAccuracy' | t: { meters } }}
        <button type="button" class="halo-toggle" [attr.aria-pressed]="showHalo()" [attr.aria-label]="(showHalo() ? 'location.haloHide' : 'location.haloShow') | t" [title]="(showHalo() ? 'location.haloHide' : 'location.haloShow') | t" (click)="toggleHalo()">
          <app-icon [name]="showHalo() ? 'visibility' : 'visibility_off'" [size]="14" />
        </button>
      </p>
    }
    @if (location.needsPanel()) {
      <app-location-consent [state]="location.state()" (accepted)="location.accept()" (refused)="logout()" />
    }
  `,
  styles: `
    :host { display: block; position: relative; width: 100%; height: 100%; }
    .map { position: absolute; inset: 0; opacity: 0; transition: opacity var(--t-base); }
    /* La mappa compare quando ha disegnato i primi tasselli (all'avvio sul giocatore, dietro la finta dialog "Localizzazione in corso"). */
    .map.ready { opacity: 1; }
    /* In alto a sinistra, nel box come i tasti; il logo è un SVG usato come maschera, quindi lo colora il testo. */
    .logo { position: absolute; top: 10px; left: 10px; z-index: 1; box-sizing: border-box; height: 36px; width: 82px; border: 1px solid var(--c-line-strong); border-radius: 0 var(--radius-2) 0 var(--radius-2); background: var(--c-surface); pointer-events: none; }
    .logo::after { content: ''; position: absolute; inset: 0; margin: auto; width: 62px; height: 20px; background-color: var(--c-text); -webkit-mask: var(--logo) center / contain no-repeat; mask: var(--logo) center / contain no-repeat; }
    /* I tasti nell'intestazione della tendina (schermo intero, impostazioni): quadrati piccoli, a spigoli secchi. */
    .hbtn { width: 32px; height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: none; color: var(--c-text-dim); cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast); }
    .hbtn:hover:not(:disabled), .hbtn:focus-visible { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
    .hbtn:disabled { opacity: 0.45; cursor: default; }
    /* Lo stato della ricerca della posizione: al centro in basso, senza spostare l'orologio. Su telefono occupa tutta la larghezza (meno 10px per lato). */
    .status { position: absolute; left: 50%; transform: translateX(-50%); bottom: 10px; z-index: 2; margin: 0; padding: 0 5px; max-width: calc(100% - 20px); box-sizing: border-box; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: var(--c-surface); color: var(--c-text-dim); font: 12px/20px 'Helvetica Neue', Arial, Helvetica, sans-serif; pointer-events: none; }
    .status { display: flex; align-items: center; gap: 4px; }
    .halo-toggle { pointer-events: auto; width: 20px; height: 20px; margin-right: -5px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 0; background: none; color: var(--c-text-dim); cursor: pointer; transition: color var(--t-fast); }
    .halo-toggle:hover, .halo-toggle:focus-visible { color: var(--c-interact); outline: none; }
    /* L'orologio: un riquadro come i tasti (36px di altezza), in basso a sinistra. */
    .clock { position: absolute; left: 10px; bottom: 10px; z-index: 1; margin: 0; height: 36px; padding: 0 12px; box-sizing: border-box; display: flex; align-items: center; gap: 8px; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); background: var(--c-surface); color: var(--c-text); font: 14px/1 'Helvetica Neue', Arial, Helvetica, sans-serif; font-variant-numeric: tabular-nums; pointer-events: none; }
    /* Il passaggio giorno/notte: l'icona scende, cambia mentre è nascosta e risale al suo posto. */
    .sun { display: inline-flex; transition: transform 240ms var(--ease-draw), opacity 240ms; }
    .sun.swapping { transform: translateY(28px); opacity: 0; }
    @media (prefers-reduced-motion: reduce) { .sun { transition: none; } }
    /* Su telefono l'orologio non si vede e l'avviso di posizione prende tutta la larghezza. */
    @media (max-width: 640px) {
      .clock { display: none; }
      .status { left: 10px; right: 10px; transform: none; max-width: none; justify-content: center; }
    }
  `,
})
export class WorldMapComponent {
  /** Il tema: oggi ce n'è uno solo, ma la struttura è pronta per altri. */
  readonly theme = input<MapTheme>();
  /** Il tema in uso: quello passato o, di default, il cyberpunk letto dai token. */
  private readonly activeTheme = computed(() => this.theme() ?? createCyberpunkTheme());

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('container');
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly location = inject(LocationService);
  protected readonly logoUrl = `url("${new URL('logo/logoipsum-421.svg', document.baseURI).href}")`;
  /** Se la posizione è poco precisa, di quanti metri (altrimenti niente). */
  protected readonly lowAccuracy = computed(() => {
    const a = this.location.position()?.accuracy;
    return a !== undefined && a > GOOD_ACCURACY_M ? Math.round(a) : null;
  });
  /** Mostra l'alone dell'incertezza attorno alla freccia (scelta ricordata nel browser). */
  protected readonly showHalo = signal(loadHaloShown());
  /** Schermo intero attivo. */
  protected readonly fullscreen = signal(!!document.fullscreenElement);
  /** L'ora corrente, aggiornata ogni secondo. */
  private readonly now = signal(new Date());
  protected readonly time = computed(() => this.now().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  /** Notte dalle 18 alle 6, giorno nelle altre ore. */
  protected readonly isNight = computed(() => {
    const h = this.now().getHours();
    return h >= 18 || h < 6;
  });
  /** L'icona sole/luna che si vede adesso: segue `isNight` con un'animazione (scende, cambia, risale) tranne alla prima volta. */
  protected readonly shownNight = signal(this.isNight());
  /** L'icona è scesa e sta per cambiare. */
  protected readonly swapping = signal(false);
  /** Il pannello laterale aperto: uno solo alla volta (aprirne uno chiude l'altro). */
  protected readonly panel = signal<'filters' | 'legend' | 'menu' | null>(null);
  /** La dialog della grafica (tasto impostazioni del menu) è aperta. */
  protected readonly settingsOpen = signal(false);
  /** La dialog dei crediti (voce Attribuzione del menu) è aperta. */
  protected readonly creditsOpen = signal(false);
  /** Le voci della tendina in alto a destra, nell'ordine in cui compaiono (si ricalcolano al cambio di lingua). */
  protected readonly menuItems = computed<DropdownItem[]>(() => [
    { id: 'credits', icon: 'info', label: translate('worldMap.menu.attribution') },
    { id: 'logout', icon: 'logout', label: translate('worldMap.menu.logout') },
  ]);
  /** Il contenitore esiste nel DOM: da qui si può creare la mappa. */
  private readonly domReady = signal(false);
  /** La mappa ha disegnato i primi tasselli: prima si vede il loader. */
  protected readonly ready = signal(false);
  /** La mappa non viene creata finché non arriva la prima posizione (solo se il consenso c'era già: senza, non c'è nulla da aspettare), così nasce già sul giocatore e carica i tasselli giusti una volta sola. */
  protected readonly arriving = signal(!this.location.needsPanel() && this.location.position() === null);
  /** La finta dialog di avvio è in gioco: solo se all'apertura si stava aspettando la posizione (senza consenso non c'è nulla da cercare). */
  private readonly intro = signal(this.arriving());
  /** È passato 1 secondo da quando c'è la posizione. */
  private readonly held = signal(false);
  /** La dialog resta finché c'è la posizione da cercare, poi 1 secondo e il tempo di disegnare la mappa. */
  protected readonly locating = computed(() => this.intro() && !(this.held() && this.ready()));
  /** Vista 3D accesa (scelta ricordata nel browser). */
  protected readonly view3d = signal(readFlag(VIEW3D_KEY));
  /** Di quanto è ruotata la mappa, in gradi interi. */
  protected readonly bearing = signal(0);
  /** I contratti sulla mappa (intestazioni leggere), lo stato di sblocco del giocatore e quello toccato (la scheda aperta). Due archivi dietro interfaccia: oggi file e localStorage. */
  private readonly contractStore: ContractStore = new JsonContractStore();
  private readonly unlockStore: UnlockStore = new LocalUnlockStore();
  private readonly realContracts = signal<Contract[]>([]);
  /** Solo in sviluppo: due contratti di prova generati rispetto alla prima posizione (non si salvano e non stanno in index.json). */
  private readonly devList = signal<Contract[]>([]);
  private readonly contracts = computed(() => [...this.realContracts(), ...this.devList()]);
  protected readonly unlockedIds = signal<ReadonlySet<string>>(this.unlockStore.unlocked());
  protected readonly selectedId = signal<string | null>(null);
  /** Quanti contratti ha il giocatore: per ora quelli sbloccati (il contatore ne mostra al massimo CONTRACT_SLOTS). */
  protected readonly heldContracts = computed(() => this.contracts().filter((c) => this.unlockedIds().has(c.id)).length);
  protected readonly selectedContract = computed(() => this.contracts().find((c) => c.id === this.selectedId()) ?? null);
  /** Quanto dista il giocatore dal contratto aperto, in metri (null senza posizione). */
  protected readonly selectedDistance = computed(() => {
    const pos = this.location.position();
    const c = this.selectedContract();
    return pos && c ? distanceMeters(c, pos) : null;
  });
  /** Il percorso a piedi fino al contratto aperto (servizio dietro interfaccia: oggi uno pubblico gratuito), a che punto è il calcolo e per quale contratto e da dove è stato chiesto. */
  private readonly routeService: RouteService = new OsrmFootRouteService();
  protected readonly route = signal<WalkingRoute | null>(null);
  protected readonly routeStatus = signal<'idle' | 'loading' | 'failed'>('idle');
  private routeAsked: { id: string; from: { lat: number; lng: number } } | null = null;
  private routeToken = 0;
  /** La mappa esiste: da qui si possono mettere i segnaposto dei contratti. */
  private readonly mapCreated = signal(false);
  private contractMarkers: Marker[] = [];
  private userMarker: Marker | null = null;
  private userArrow: HTMLElement | null = null;
  private userHalo: HTMLElement | null = null;
  private centeredOnUser = false;
  /** La mappa si è già riallineata sulla posizione precisa dopo quella approssimativa. */
  private refinedOnUser = false;
  /** I gruppi di filtri accesi (il pannello li mostra, la mappa li applica). */
  protected readonly preset = signal<FilterPreset>(loadPreset());
  /** Le voci scelte a mano, che il filtro "Personalizzato" ricorda. */
  private readonly custom = signal<ReadonlySet<string>>(loadCustomFilters());
  protected readonly enabled = computed(() => enabledFor(this.preset(), this.custom()));
  private map: MapLibreMap | null = null;
  /** Il bordo tratteggiato e il loader dei tasselli in arrivo. */
  private tileLoading: TileLoadingView | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private protocolRegistered = false;

  constructor() {
    const tick = setInterval(() => this.now.set(new Date()), 1000);
    const onFullscreen = () => this.fullscreen.set(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreen);
    const timers: ReturnType<typeof setTimeout>[] = [];
    this.destroyRef.onDestroy(() => {
      clearInterval(tick);
      timers.forEach(clearTimeout);
      document.removeEventListener('fullscreenchange', onFullscreen);
    });

    // Trovata la posizione, la dialog resta ancora 1 secondo (si vedono le coordinate vere) e poi può sparire.
    effect(() => {
      if (this.location.position() && this.intro()) timers.push(setTimeout(() => this.held.set(true), 1000));
    });

    // Alle 18:00 e alle 6:00 l'icona scende, diventa l'altra mentre è nascosta e torna al suo posto.
    effect(() => {
      const night = this.isNight();
      untracked(() => {
        if (night === this.shownNight()) return;
        this.swapping.set(true);
        timers.push(setTimeout(() => this.shownNight.set(night), 240), setTimeout(() => this.swapping.set(false), 280));
      });
    });

    // Il DOM esiste solo dopo il primo disegno; tutto fuori da NgZone.
    afterNextRender(() => this.domReady.set(true));
    effect(() => {
      if (this.domReady() && !this.arriving() && !untracked(() => this.map)) this.ngZone.runOutsideAngular(() => untracked(() => this.createMap()));
    });

    // Cambio tema: stile sostituito per intero. Al primo giro la mappa non c'è ancora e non si fa nulla.
    effect(() => {
      const theme = this.activeTheme();
      this.ngZone.runOutsideAngular(() => this.map?.setStyle(buildMapStyle(theme), { diff: false }));
    });

    // Ogni cambio dei filtri si salva e si applica subito; all'avvio e dopo un cambio di tema ci pensa `style.load`.
    effect(() => {
      const enabled = this.enabled();
      const threeD = this.view3d();
      savePreset(this.preset());
      saveCustomFilters(this.custom());
      this.ngZone.runOutsideAngular(() => { if (this.map) { applyMapFilters(this.map, enabled, threeD); applyTerrain(this.map, threeD); } });
    });

    // La mappa si muove solo quando c'è una posizione; alla prima la si centra, poi una freccia segue il giocatore.
    effect(() => {
      const locked = this.location.locked();
      const pos = this.location.position();
      const facing = this.location.facing();
      // La mappa nascosta all'avvio si mostra alla prima posizione, o se serve il pannello del consenso (il rifiuto non porta nessuna posizione).
      if (pos || this.location.needsPanel()) this.arriving.set(false);
      if (!pos && this.location.needsPanel()) this.intro.set(false); // consenso negato o posizione non disponibile: niente dialog di ricerca sopra il pannello
      this.ngZone.runOutsideAngular(() => {
        if (!this.map) return;
        this.setInteractive(this.map, !locked);
        this.showUser(this.map, pos, facing);
      });
    });

    // I contratti: letti una volta; i segnaposto si ridisegnano quando cambiano i contratti, gli sblocchi o la scheda aperta.
    void this.contractStore.list().then((list) => this.realContracts.set(list));
    effect(() => {
      const list = this.contracts();
      const unlocked = this.unlockedIds();
      const selected = this.selectedId();
      if (!this.mapCreated()) return;
      this.ngZone.runOutsideAngular(() => untracked(() => this.showContracts(list, unlocked, selected)));
    });

    // Il percorso a piedi: si chiede quando si apre un contratto e c'è una posizione, e di nuovo se ci si sposta di più di ROUTE_REFRESH_M (non a ogni lettura del GPS: il servizio è a uso equo).
    effect(() => {
      const c = this.selectedContract();
      const pos = this.location.position();
      const unlocked = this.unlockedIds();
      untracked(() => this.updateRoute(c && !unlocked.has(c.id) && !(pos && canUnlock(c, pos)) ? c : null, pos)); // a portata o già sbloccato: niente da raggiungere, niente percorso
    });
    // La linea sulla mappa segue il percorso.
    effect(() => {
      this.route();
      if (this.mapCreated()) this.ngZone.runOutsideAngular(() => untracked(() => this.paintRoute()));
    });

    // Lo sblocco: a ogni posizione nuova, i contratti da cui distanza - precisione <= 50 m si sbloccano (e restano sbloccati). Il calcolo è solo sul dispositivo.
    effect(() => {
      const pos = this.location.position();
      const list = this.contracts();
      if (!pos) return;
      untracked(() => this.unlockNear(pos, list));
    });

    this.location.start();

    this.destroyRef.onDestroy(() => {
      this.location.stop();
      this.userMarker?.remove();
      this.userMarker = null;
      this.contractMarkers.forEach((m) => m.remove());
      this.contractMarkers = [];
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      this.tileLoading?.destroy();
      this.tileLoading = null;
      this.map?.remove(); // libera anche il contesto WebGL
      this.map = null;
      if (this.protocolRegistered) {
        removeProtocol('pmtiles');
        this.protocolRegistered = false;
      }
    });
  }

  /** Un pannello dice che si apre o si chiude: aprendosi prende il posto dell'altro, chiudendosi lascia stare quello che c'è. */
  protected setPanel(which: 'filters' | 'legend' | 'menu', open: boolean): void {
    if (open) this.selectedId.set(null); // aprire un pannello laterale chiude quello del contratto
    this.panel.update((current) => (open ? which : current === which ? null : current));
  }

  /** Il tasto impostazioni: chiude il menu e apre la dialog della grafica. */
  protected openSettings(): void {
    this.setPanel('menu', false);
    this.settingsOpen.set(true);
  }

  protected saveSettings(options: GraphicsOptions): void {
    setGraphics(options);
    this.settingsOpen.set(false);
  }

  protected onMenu(id: string): void {
    if (id === 'credits') this.creditsOpen.set(true);
    else if (id === 'logout') void this.logout();
  }

  protected toggle(id: string): void {
    if (FILTER_GROUPS.some((g) => g.id === id && (g.fixed || g.locked))) return;
    // Toccare una voce da "Tutto" o "Essenziale" parte da quel filtro e passa a "Personalizzato".
    const next = new Set(this.enabled());
    if (!next.delete(id)) next.add(id);
    this.custom.set(next);
    this.preset.set('custom');
  }

  protected choosePreset(preset: FilterPreset): void {
    this.preset.set(preset);
  }

  /** Torna alla mia posizione, restando almeno allo zoom di partenza. */
  protected focusUser(): void {
    const pos = this.location.position();
    if (this.map && pos) this.map.flyTo({ center: [pos.lng, pos.lat], zoom: Math.max(this.map.getZoom(), USER_ZOOM) });
  }

  protected resetNorth(): void {
    this.map?.resetNorth();
  }

  protected zoom(step: 1 | -1): void {
    if (step > 0) this.map?.zoomIn();
    else this.map?.zoomOut();
  }

  /** Accende o spegne il 3D: la mappa si inclina (o si raddrizza) e poi l'inclinazione si blocca, così con il mouse o le dita non cambia. */
  protected toggle3d(): void {
    const on = !this.view3d();
    this.view3d.set(on);
    try { localStorage.setItem(VIEW3D_KEY, on ? '1' : '0'); } catch { /* vale solo per questa visita */ }
    const map = this.map;
    if (!map) return;
    const pitch = on ? PITCH_3D : 0;
    map.setMinPitch(0);
    map.setMaxPitch(85);
    map.once('moveend', () => {
      if (this.view3d() === on) {
        map.setMinPitch(pitch);
        map.setMaxPitch(pitch);
      }
    });
    map.easeTo({ pitch });
  }

  protected toggleHalo(): void {
    this.showHalo.update((v) => !v);
    try { localStorage.setItem(HALO_KEY, this.showHalo() ? '1' : '0'); } catch { /* vale solo per questa visita */ }
  }

  protected toggleFullscreen(): void {
    const result = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    result.catch(() => { /* il browser può rifiutare: resta com'è */ });
  }

  protected async logout(): Promise<void> {
    this.location.revoke(); // uscire è anche revocare il consenso alla posizione
    await this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  private createMap(): void {
    // Il worker di MapLibre 6 è un file a parte, copiato nella radice del sito da `angular.json`.
    setWorkerUrl(new URL('maplibre-gl-worker.mjs', document.baseURI).href);
    addProtocol('pmtiles', new Protocol().tile);
    this.protocolRegistered = true;

    // Se la posizione c'è già la mappa nasce lì (e vicina), senza spostamenti dopo.
    const pos = this.location.position();
    const map = new MapLibreMap({
      container: this.container().nativeElement,
      style: buildMapStyle(this.activeTheme()),
      center: pos ? [pos.lng, pos.lat] : START_VIEW.center,
      zoom: pos ? Math.max(START_VIEW.zoom, USER_ZOOM) : START_VIEW.zoom,
      pitch: this.view3d() ? PITCH_3D : 0,
      minPitch: this.view3d() ? PITCH_3D : 0, // l'inclinazione la scegliamo noi: min e max uguali la bloccano
      maxPitch: this.view3d() ? PITCH_3D : 0,
      trackResize: false, // il ridimensionamento lo segue solo il ResizeObserver qui sotto: due ascoltatori ridisegnavano due volte
      attributionControl: false, // i crediti stanno nella dialog del tasto info (`app-map-credits`)
    });
    this.map = map;
    this.setInteractive(map, !this.location.locked());
    this.showUser(map, this.location.position(), this.location.facing());
    // Lo stile si ricrea al cambio di tema e azzera le visibilità: i filtri si riapplicano a ogni caricamento.
    map.on('style.load', () => { applyMapFilters(map, this.enabled(), this.view3d()); applyTerrain(map, this.view3d()); this.paintRoute(); });
    this.tileLoading = new TileLoadingView(map, BASEMAP_SOURCE_ID);
    map.once('idle', () => this.ready.set(true)); // 'idle': ha finito di caricare e disegnare (anche se qualche tassello è fallito)
    map.on('rotate', () => this.bearing.set(Math.round(map.getBearing())));
    map.on('click', () => this.ngZone.run(() => this.selectedId.set(null))); // un tocco sulla mappa chiude il pannello del contratto (i marker fermano il loro tocco)
    map.on('zoom', () => this.sizeHalo(map));

    // Se cambia la misura del contenitore senza che cambi la finestra, la mappa si ridisegna.
    this.resizeObserver = new ResizeObserver(() => map.resize());
    this.resizeObserver.observe(this.container().nativeElement);
    this.mapCreated.set(true);
  }

  /** Sblocca i contratti vicini a pos. In sviluppo, alla prima posizione nascono anche i due contratti di prova. Quelli di prova si sbloccano solo in memoria. */
  private unlockNear(pos: UserPosition, list: readonly Contract[]): void {
    if (isDevMode() && !this.devList().length) {
      this.devList.set(devContracts(pos));
      return; // l'effetto riparte con l'elenco completo
    }
    const already = this.unlockedIds();
    const now = list.filter((c) => !already.has(c.id) && canUnlock(c, pos));
    if (!now.length) return;
    for (const c of now) if (!c.id.startsWith(DEV_CONTRACT_PREFIX)) this.unlockStore.unlock(c.id);
    this.unlockedIds.set(new Set([...already, ...now.map((c) => c.id)]));
  }

  /** Chiede (o toglie) il percorso a piedi per il contratto aperto. */
  private updateRoute(c: Contract | null, pos: UserPosition | null): void {
    if (!c) {
      this.routeToken++;
      this.routeAsked = null;
      this.route.set(null);
      this.routeStatus.set('idle');
      return;
    }
    if (!pos) return;
    const from = { lat: pos.lat, lng: pos.lng };
    if (this.routeAsked?.id === c.id && distanceMeters(this.routeAsked.from, from) < ROUTE_REFRESH_M) return;
    if (this.routeAsked?.id !== c.id) this.route.set(null); // un altro contratto: via la linea vecchia
    this.routeAsked = { id: c.id, from };
    this.routeStatus.set('loading');
    const token = ++this.routeToken;
    void this.routeService.walk(from, c).then((r) => {
      if (token !== this.routeToken) return; // nel frattempo si è aperto altro o si è chiuso
      this.route.set(r);
      this.routeStatus.set(r ? 'idle' : 'failed');
    });
  }

  /** Disegna (o toglie) la linea del percorso: dello stesso verde della posizione del giocatore. Dopo un cambio di tema la linea si ridisegna da `style.load`. */
  private paintRoute(): void {
    const map = this.map;
    if (!map) return;
    const route = this.route();
    const data = { type: 'FeatureCollection' as const, features: route ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: route.coordinates } }] : [] };
    try {
      const source = map.getSource(ROUTE_SOURCE);
      if (source && 'setData' in source) {
        (source as GeoJSONSource).setData(data);
        return;
      }
      map.addSource(ROUTE_SOURCE, { type: 'geojson', data });
      map.addLayer({
        id: ROUTE_LAYER,
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': getComputedStyle(document.documentElement).getPropertyValue('--c-you').trim(), 'line-width': 4, 'line-opacity': 0.9 },
      });
    } catch {
      map.once('idle', () => this.paintRoute()); // lo stile non è ancora pronto (cambio di tema o primi tasselli): si riprova a riposo
    }
  }

  /** Si tocca un contratto: la mappa va alle sue coordinate (spostando il centro fuori dal pannello che si apre) e si apre il pannello con le info. */
  private selectContract(c: Contract): void {
    this.panel.set(null);
    this.selectedId.set(c.id);
    const map = this.map;
    if (!map) return;
    const phone = matchMedia('(max-width: 640px)').matches;
    const pos = this.location.position();
    const near = this.unlockedIds().has(c.id) || (!!pos && canUnlock(c, pos));
    this.ngZone.runOutsideAngular(() => {
      if (!near && pos) {
        // Fuori portata: una vista che include sia il giocatore sia il contratto, nello spazio che il pannello lascia libero (con un po' di margine; la barra in alto e l'orologio non coprono i punti).
        const margin = 60;
        const padding = phone ? { top: 80, left: margin, right: margin, bottom: Math.round(window.innerHeight * 0.4) + margin } : { top: 80, left: margin + 56, bottom: 80, right: 56 + 320 + 10 + margin };
        map.fitBounds([[Math.min(pos.lng, c.lng), Math.min(pos.lat, c.lat)], [Math.max(pos.lng, c.lng), Math.max(pos.lat, c.lat)]], { padding, maxZoom: USER_ZOOM, duration: 900 });
        return;
      }
      // A portata: il contratto resta al centro dello spazio che il pannello lascia libero: a sinistra del pannello (56px di tasti + 320px di pannello + 10px) su schermo largo, sopra il foglio su telefono.
      const padding = phone ? { top: 0, left: 0, right: 0, bottom: Math.round(window.innerHeight * 0.4) } : { top: 0, left: 0, bottom: 0, right: 56 + 320 + 10 };
      map.flyTo({ center: [c.lng, c.lat], zoom: Math.max(map.getZoom(), USER_ZOOM - 1), padding });
    });
  }

  /** Il tasto Gioca della scheda: si gioca da casa, la partita parte dal Briefing. */
  protected playContract(c: Contract): void {
    void this.router.navigate(['/party', c.mapId]);
  }

  /** Solo in sviluppo: sblocca a mano il contratto, per vedere la scheda aperta senza GPS (la regola vera dei 50 m è il passo 4). */
  protected devUnlock(c: Contract): void {
    if (c.id.startsWith(DEV_CONTRACT_PREFIX)) this.unlockedIds.set(new Set([...this.unlockedIds(), c.id]));
    else if (this.unlockStore.unlock(c.id)) this.unlockedIds.set(new Set([...this.unlockedIds(), c.id]));
  }

  /** Un segnaposto per contratto: il numero, in verde se sbloccato, spento se bloccato, in risalto se è quello aperto. Il tocco apre la scheda (fuori da NgZone, quindi rientra con un). */
  private showContracts(list: readonly Contract[], unlocked: ReadonlySet<string>, selected: string | null): void {
    const map = this.map;
    if (!map) return;
    this.contractMarkers.forEach((m) => m.remove());
    this.contractMarkers = list.map((c) => {
      const open = unlocked.has(c.id);
      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', translate('contract.marker', { n: contractNumber(c.number) }));
      // Un quadrato con un punto esclamativo al centro (l'icona `contract`, come nella legenda): sfondo scuro sotto, icona colorata sopra; in risalto se è quello aperto.
      const color = open ? 'var(--c-interact)' : 'var(--c-text-dim)';
      const iconUrl = new URL('icons/contract.svg', document.baseURI).href;
      el.style.cssText = 'width:32px;height:32px;padding:0;border:0;background:none;cursor:pointer'; // niente `position`: la classe `.maplibregl-marker` lo vuole absolute, così il marker segue le coordinate
      const fill = document.createElement('span');
      fill.style.cssText = 'position:absolute;inset:4px;background:var(--c-surface)';
      const glyph = document.createElement('span');
      glyph.style.cssText = `position:absolute;inset:0;background-color:${color};-webkit-mask:url("${iconUrl}") center / contain no-repeat;mask:url("${iconUrl}") center / contain no-repeat`;
      const glow = document.createElement('span');
      glow.style.cssText = `position:absolute;inset:0;${selected === c.id ? `filter:drop-shadow(0 0 3px ${color}) drop-shadow(0 0 8px ${color})` : ''}`;
      glow.append(glyph);
      el.append(fill, glow);
      el.addEventListener('click', (e) => { e.stopPropagation(); this.ngZone.run(() => this.selectContract(c)); });
      return new Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(map);
    });
  }

  /** Accende o spegne ogni modo di muovere la mappa (trascinare, zoom, tastiera, tocco). */
  private setInteractive(map: MapLibreMap, on: boolean): void {
    for (const handler of [map.dragPan, map.dragRotate, map.scrollZoom, map.boxZoom, map.doubleClickZoom, map.touchZoomRotate, map.touchPitch, map.keyboard]) {
      if (on) handler.enable();
      else handler.disable();
    }
  }

  /** Il segno del giocatore: una freccia verde neon ("navigation") che punta dove guarda o va, dentro un alone grande quanto l'incertezza della posizione. La prima volta la mappa vola lì. */
  private showUser(map: MapLibreMap, pos: UserPosition | null, facing: number | null): void {
    if (!pos) {
      this.userMarker?.remove();
      this.userMarker = null;
      this.userArrow = this.userHalo = null;
      this.centeredOnUser = false;
      this.refinedOnUser = false;
      return;
    }
    if (!this.userMarker) {
      const iconUrl = new URL('icons/navigation.svg', document.baseURI).href;
      const el = document.createElement('div');
      el.style.cssText = 'width:28px;height:28px;pointer-events:none'; // niente `position`: vedi i marker dei contratti
      const halo = document.createElement('div');
      halo.style.cssText = 'position:absolute;left:50%;top:50%;border-radius:50%;box-sizing:border-box;border:1px solid color-mix(in srgb, var(--c-you) 70%, transparent);background:color-mix(in srgb, var(--c-you) 12%, transparent);transform:translate(-50%,-50%)';
      const arrow = document.createElement('div');
      arrow.style.cssText = `position:absolute;inset:0;background-color:var(--c-you);-webkit-mask:url("${iconUrl}") center / contain no-repeat;mask:url("${iconUrl}") center / contain no-repeat`;
      // Il glow: la maschera ritaglia anche le ombre, quindi sta su un contenitore a parte, con `drop-shadow` che segue la sagoma della freccia.
      const glow = document.createElement('div');
      glow.style.cssText = 'position:absolute;inset:0;filter:drop-shadow(0 0 3px var(--c-you)) drop-shadow(0 0 8px color-mix(in srgb, var(--c-you) 70%, transparent))';
      glow.append(arrow);
      el.append(halo, glow);
      this.userHalo = halo;
      this.userArrow = arrow;
      this.userMarker = new Marker({ element: el });
    }
    this.userMarker.setLngLat([pos.lng, pos.lat]).addTo(map);
    this.userArrow!.style.transform = `rotate(${facing ?? 0}deg)`;
    this.userHalo!.dataset['meters'] = String(pos.accuracy);
    this.sizeHalo(map);
    if (!this.centeredOnUser) {
      this.centeredOnUser = true;
      // Alla prima lettura (anche approssimativa) la mappa è subito sul giocatore, senza animazione (la mappa è ancora nascosta).
      map.jumpTo({ center: [pos.lng, pos.lat], zoom: Math.max(map.getZoom(), USER_ZOOM) });
      this.refinedOnUser = pos.accuracy <= GOOD_ACCURACY_M;
    } else if (!this.refinedOnUser && pos.accuracy <= GOOD_ACCURACY_M) {
      // La prima lettura era approssimativa: appena arriva quella precisa, la mappa si sposta dolcemente lì (una volta sola).
      this.refinedOnUser = true;
      map.easeTo({ center: [pos.lng, pos.lat] });
    }
  }

  /** L'alone ha il raggio dell'incertezza in pixel, che dipende da zoom e latitudine (tasselli da 512 px). */
  private sizeHalo(map: MapLibreMap): void {
    const halo = this.userHalo;
    const pos = this.location.position();
    if (!halo || !pos) return;
    const metersPerPx = (78271.517 * Math.cos((pos.lat * Math.PI) / 180)) / 2 ** map.getZoom();
    const px = Math.max(0, (2 * pos.accuracy) / metersPerPx);
    halo.style.width = halo.style.height = `${px}px`;
    halo.style.display = this.showHalo() && px >= 30 ? 'block' : 'none'; // più piccolo della freccia non dice niente
  }
}

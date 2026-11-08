import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, NgZone, afterNextRender, effect, inject, input, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AttributionControl, Map as MapLibreMap, Marker, addProtocol, removeProtocol, setWorkerUrl } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { AuthService } from '../auth/auth.service';
import { translate } from '../i18n/i18n.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from '../ui/icon.component';
import { START_VIEW } from './map-config';
import { LocationConsentComponent } from './location-consent.component';
import { GOOD_ACCURACY_M, LocationService, type UserPosition } from './location.service';
import { applyTerrain, buildMapStyle } from './map-style';
import { MapNavComponent } from './map-nav.component';
import { MapFilterPanelComponent } from './map-filter-panel.component';
import { applyMapFilters, enabledFor, loadCustomFilters, loadPreset, saveCustomFilters, savePreset, type FilterPreset } from './map-filters';
import { createCyberpunkTheme, type MapTheme } from './map-theme';

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

/** Quanto la mappa si avvicina al giocatore quando lo trova. */
const USER_ZOOM = 16;

/**
 * La mappa del mondo, che è la home (`/`): MapLibre su dati Protomaps, nel tema cyberpunk. Nasce fuori da NgZone (le animazioni continue non devono far girare Angular)
 * e si distrugge con la pagina: `map.remove()` libera il contesto WebGL. Il contenitore ha un `ResizeObserver` che ridisegna la mappa quando cambia la sua misura.
 * Il genitore deve dare un'altezza vera al componente (qui `/` è a tutto schermo).
 */
@Component({
  selector: 'app-world-map',
  imports: [IconComponent, TranslatePipe, MapFilterPanelComponent, MapNavComponent, LocationConsentComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #container class="map" role="application" [attr.aria-label]="'worldMap.label' | t"></div>
    <div class="logo" role="img" [attr.aria-label]="'worldMap.logo' | t" [style.--logo]="logoUrl"></div>
    <app-map-filter-panel [enabled]="enabled()" [preset]="preset()" (toggled)="toggle($event)" (presetChosen)="choosePreset($event)" />
    <button type="button" class="logout" [attr.aria-label]="'worldMap.logout' | t" [title]="'worldMap.logout' | t" (click)="logout()">
      <app-icon name="logout" [size]="20" />
    </button>
    <app-map-nav [located]="!location.locked()" [view3d]="view3d()" [bearing]="bearing()" (locate)="focusUser()" (toggle3d)="toggle3d()" (resetNorth)="resetNorth()" (zoomIn)="zoom(1)" (zoomOut)="zoom(-1)" />
    @if (location.searching()) {
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
    .map { position: absolute; inset: 0; }
    /* In alto a destra, a spigoli secchi come le altre cornici del progetto. */
    /* In alto a sinistra, nel box come il logout; il logo è un SVG usato come maschera, quindi lo colora il testo. */
    .logo { position: absolute; top: 10px; left: 10px; z-index: 1; box-sizing: border-box; height: 36px; width: 82px; border: 1px solid var(--c-line-strong); border-radius: 0 var(--radius-2) 0 var(--radius-2); background: var(--c-surface); pointer-events: none; }
    .logo::after { content: ''; position: absolute; inset: 0; margin: auto; width: 62px; height: 20px; background-color: var(--c-text); -webkit-mask: var(--logo) center / contain no-repeat; mask: var(--logo) center / contain no-repeat; }
    .logout { position: absolute; top: 10px; right: 10px; z-index: 1; width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); background: var(--c-surface); color: var(--c-text); cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast); }
    /* Lo stato della ricerca della posizione: in basso a sinistra, identico all'attribuzione di MapLibre (che sta in basso a destra). */
    .status { position: absolute; left: 0; bottom: 0; z-index: 2; margin: 0; padding: 0 5px; max-width: calc(100% - 10px); box-sizing: border-box; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: var(--c-surface); color: var(--c-text-dim); font: 12px/20px 'Helvetica Neue', Arial, Helvetica, sans-serif; pointer-events: none; }
    .status { display: flex; align-items: center; gap: 4px; }
    .halo-toggle { pointer-events: auto; width: 20px; height: 20px; margin-right: -5px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 0; background: none; color: var(--c-text-dim); cursor: pointer; transition: color var(--t-fast); }
    .halo-toggle:hover, .halo-toggle:focus-visible { color: var(--c-interact); outline: none; }
    .logout:hover, .logout:focus-visible { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
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
  /** Vista 3D accesa (scelta ricordata nel browser). */
  protected readonly view3d = signal(readFlag(VIEW3D_KEY));
  /** Di quanto è ruotata la mappa, in gradi interi. */
  protected readonly bearing = signal(0);
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
  private resizeObserver: ResizeObserver | null = null;
  private protocolRegistered = false;

  constructor() {
    // Il DOM esiste solo dopo il primo disegno; tutto fuori da NgZone.
    afterNextRender(() => this.ngZone.runOutsideAngular(() => this.createMap()));

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
      this.ngZone.runOutsideAngular(() => {
        if (!this.map) return;
        this.setInteractive(this.map, !locked);
        this.showUser(this.map, pos, facing);
      });
    });

    this.location.start();

    this.destroyRef.onDestroy(() => {
      this.location.stop();
      this.userMarker?.remove();
      this.userMarker = null;
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      this.map?.remove(); // libera anche il contesto WebGL
      this.map = null;
      if (this.protocolRegistered) {
        removeProtocol('pmtiles');
        this.protocolRegistered = false;
      }
    });
  }

  protected toggle(id: string): void {
    if (this.preset() !== 'custom') return; // "Tutto" ed "Essenziale" non si modificano
    this.custom.update((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
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

    const map = new MapLibreMap({
      container: this.container().nativeElement,
      style: buildMapStyle(this.activeTheme()),
      center: START_VIEW.center,
      zoom: START_VIEW.zoom,
      pitch: this.view3d() ? PITCH_3D : 0,
      minPitch: this.view3d() ? PITCH_3D : 0, // l'inclinazione la scegliamo noi: min e max uguali la bloccano
      maxPitch: this.view3d() ? PITCH_3D : 0,
      trackResize: false, // il ridimensionamento lo segue solo il ResizeObserver qui sotto: due ascoltatori ridisegnavano due volte
      attributionControl: false, // aggiunta a mano sotto, sempre aperta
      locale: this.controlTexts(),
    });
    this.map = map;
    this.setInteractive(map, !this.location.locked());
    this.showUser(map, this.location.position(), this.location.facing());
    // Lo stile si ricrea al cambio di tema e azzera le visibilità: i filtri si riapplicano a ogni caricamento.
    map.on('style.load', () => { applyMapFilters(map, this.enabled(), this.view3d()); applyTerrain(map, this.view3d()); });
    map.on('rotate', () => this.bearing.set(Math.round(map.getBearing())));
    map.on('zoom', () => this.sizeHalo(map));
    map.addControl(new AttributionControl({ compact: false }), 'bottom-right');

    // Se cambia la misura del contenitore senza che cambi la finestra, la mappa si ridisegna.
    this.resizeObserver = new ResizeObserver(() => map.resize());
    this.resizeObserver.observe(this.container().nativeElement);
  }

  /** I testi dei controlli di MapLibre (resta solo l'attribuzione), nella lingua di adesso (letti al momento della creazione). */
  private controlTexts(): Record<string, string> {
    return {
      'AttributionControl.ToggleAttribution': translate('worldMap.toggleAttribution'),
      'AttributionControl.MapFeedback': translate('worldMap.mapFeedback'),
    };
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
      el.style.cssText = 'position:relative;width:28px;height:28px;pointer-events:none';
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
      // Alla prima lettura (anche approssimativa) la mappa vola verso il giocatore, spostandosi e avvicinandosi insieme.
      map.flyTo({ center: [pos.lng, pos.lat], zoom: Math.max(map.getZoom(), USER_ZOOM) });
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

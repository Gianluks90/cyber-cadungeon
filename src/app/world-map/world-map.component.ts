import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, NgZone, afterNextRender, effect, inject, input, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AttributionControl, Map as MapLibreMap, addProtocol, removeProtocol, setWorkerUrl } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { AuthService } from '../auth/auth.service';
import { translate } from '../i18n/i18n.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from '../ui/icon.component';
import { START_VIEW } from './map-config';
import { buildMapStyle } from './map-style';
import { createCyberpunkTheme, type MapTheme } from './map-theme';

/**
 * La mappa del mondo, che è la home (`/`): MapLibre su dati Protomaps, nel tema cyberpunk. Nasce fuori da NgZone (le animazioni continue non devono far girare Angular)
 * e si distrugge con la pagina: `map.remove()` libera il contesto WebGL. Il contenitore ha un `ResizeObserver` che ridisegna la mappa quando cambia la sua misura.
 * Il genitore deve dare un'altezza vera al componente (qui `/` è a tutto schermo).
 */
@Component({
  selector: 'app-world-map',
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #container class="map" role="application" [attr.aria-label]="'worldMap.label' | t"></div>
    <button type="button" class="logout" [attr.aria-label]="'worldMap.logout' | t" [title]="'worldMap.logout' | t" (click)="logout()">
      <app-icon name="logout" [size]="20" />
    </button>
  `,
  styles: `
    :host { display: block; position: relative; width: 100%; height: 100%; }
    .map { position: absolute; inset: 0; }
    /* In alto a destra, a spigoli secchi come le altre cornici del progetto. */
    .logout { position: absolute; top: 10px; right: 10px; z-index: 1; width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); background: var(--c-surface); color: var(--c-text); cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast); }
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

    this.destroyRef.onDestroy(() => {
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

  protected async logout(): Promise<void> {
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
      trackResize: false, // il ridimensionamento lo segue solo il ResizeObserver qui sotto: due ascoltatori ridisegnavano due volte
      attributionControl: false, // aggiunta a mano sotto, sempre aperta
      locale: this.controlTexts(),
    });
    this.map = map;
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
}

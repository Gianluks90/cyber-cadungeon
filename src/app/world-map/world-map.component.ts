import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, NgZone, afterNextRender, effect, inject, input, isDevMode, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Map as MapLibreMap, Marker, addProtocol, removeProtocol, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { AuthService } from '../auth/auth.service';
import { translate, type MessageKey } from '../i18n/i18n.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { setGraphics, type GraphicsOptions } from '../game/graphics-settings';
import { DropdownMenuComponent, type DropdownItem } from '../ui/dropdown-menu.component';
import { GraphicsDialogComponent } from '../ui/graphics-dialog.component';
import { BrandLogoComponent } from '../ui/brand-logo.component';
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
import { LocalHeldStore, type HeldStore } from '../game/contracts/held-store';
import { CONTRACT_SLOTS, UNLOCK_BREACH_MS, UNLOCK_DECRYPT_MS } from '../game/constants';
import { ContractListPanelComponent } from './contract-list-panel.component';
import { DEV_CONTRACT_PREFIX, canUnlock, devContracts } from '../game/contracts/unlock-rule';
import { ContractPanelComponent, contractNumber, formatDistance } from './contract-panel.component';
import { distanceMeters } from '../game/contracts/unlock-rule';
import { DpcWeatherAlertService, WEATHER_CHECK_EVERY_MS, type WeatherAlert, type WeatherAlertService } from './weather-alert';
import { OsrmFootRouteService, type RouteService, type WalkingRoute } from './route-service';
import { ContractCounterComponent } from './contract-counter.component';
import { MapLegendPanelComponent } from './map-legend-panel.component';
import { LocalHangoutStore, type Hangout, type HangoutStore } from '../game/hangout/hangout-store';
import { HANGOUT_PICK_RANGE_M, INFLUENCE_POINTS, ZONE_BUILDING_M, ZONE_PLACE_M } from './hangout-geo';
import { HangoutInfoPanelComponent, type HangoutInfo } from './hangout-info-panel.component';
import { localityAt } from './place-names';
import { HangoutPlacePanelComponent } from './hangout-place-panel.component';
import { ConfirmDialogComponent } from '../ui/confirm-dialog.component';
import { HangoutLayer, type Candidate } from './hangout-layer';

/** Cosa si sta facendo con il ritrovo: niente, scegliere il luogo, scegliere gli edifici dell'influenza, o guardare l'area di influenza (la lente nel profilo Fixer). */
type HangoutMode = 'none' | 'place' | 'influence' | 'view';

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
/** Il colore della linea come sfumatura lungo il percorso (MapLibre vuole una sfumatura per animare la comparsa): tutta dello stesso colore. */
const routeGradient = (color: string) => ['interpolate', ['linear'], ['line-progress'], 0, color, 1, color] as never;
/** La linea tracciata solo fino a `fraction` (0-1) del percorso, dal punto di partenza: il resto è trasparente. */
const routeGradientUntil = (color: string, fraction: number) => ['step', ['line-progress'], color, Math.max(fraction, 0.0001), 'rgba(0,0,0,0)'] as never;

/** Quanto la mappa si avvicina al giocatore quando lo trova. */
const USER_ZOOM = 16;

/**
 * La mappa del mondo, che è la home (`/`): MapLibre su dati Protomaps, nel tema cyberpunk. Nasce fuori da NgZone (le animazioni continue non devono far girare Angular)
 * e si distrugge con la pagina: `map.remove()` libera il contesto WebGL. Il contenitore ha un `ResizeObserver` che ridisegna la mappa quando cambia la sua misura.
 * Il genitore deve dare un'altezza vera al componente (qui `/` è a tutto schermo).
 */
@Component({
  selector: 'app-world-map',
  imports: [BrandLogoComponent, IconComponent, TranslatePipe, DropdownMenuComponent, GraphicsDialogComponent, MapFilterPanelComponent, MapNavComponent, MapCreditsComponent, MapLocatingComponent, LocationConsentComponent, ContractPanelComponent, ContractCounterComponent, ContractListPanelComponent, MapLegendPanelComponent, HangoutPlacePanelComponent, HangoutInfoPanelComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #container class="map" [class.ready]="ready()" role="application" [attr.aria-label]="'worldMap.label' | t"></div>
    @if (locating()) {
      <app-map-locating [position]="location.position()" />
    }
    <app-brand-logo class="logo" role="img" [attr.aria-label]="'worldMap.logo' | t" />
    <app-map-filter-panel [enabled]="enabled()" [preset]="preset()" [open]="panel() === 'filters'" (openChange)="setPanel('filters', $event)" (toggled)="toggle($event)" (presetChosen)="choosePreset($event)" />
    <app-map-legend-panel [open]="panel() === 'legend'" (openChange)="setPanel('legend', $event)" />
    <app-contract-counter [count]="heldContracts().length" [open]="panel() === 'contracts'" (toggle)="setPanel('contracts', panel() !== 'contracts')" />
    <app-contract-list-panel [open]="panel() === 'contracts'" (openChange)="setPanel('contracts', $event)" [contracts]="heldContracts()" [max]="maxHeld" (play)="playContract($event)" (cancel)="cancelContract($event)" />
    <app-dropdown-menu [label]="'home.menu' | t" [title]="'home.menu' | t" [items]="menuItems()" hotkey="m" [open]="panel() === 'menu'" (openChange)="setPanel('menu', $event)" (picked)="onMenu($event)">
      <button dropdown-actions type="button" class="hbtn" [attr.aria-label]="(fullscreen() ? 'home.exitFullscreen' : 'home.fullscreen') | t" [title]="(fullscreen() ? 'home.exitFullscreen' : 'home.fullscreen') | t" (click)="toggleFullscreen()">
        <app-icon [name]="fullscreen() ? 'fullscreen_exit' : 'fullscreen'" [size]="18" />
      </button>
      <button dropdown-actions type="button" class="hbtn" [attr.aria-label]="'worldMap.menu.settings' | t" [title]="'worldMap.menu.settings' | t" (click)="openSettings()">
        <app-icon name="settings" [size]="18" />
      </button>
    </app-dropdown-menu>
    <div class="corner">
      <p class="clock" role="timer" [attr.aria-label]="(isNight() ? 'worldMap.night' : 'worldMap.day') | t">
        <span class="sun" [class.swapping]="swapping()"><app-icon [name]="shownNight() ? 'bedtime' : 'light_mode'" [size]="20" /></span>
        {{ time() }}
      </p>
      @if (weatherAlert(); as alert) {
        <p class="weather" [attr.data-level]="alert.level" role="status" [attr.aria-label]="alertTitle()" [title]="alertTitle()">
          <app-icon name="warning" [size]="20" />
          {{ 'worldMap.weather.alert' | t }}
        </p>
      }
    </div>
    <div class="corner end">
      @if (hangoutMode() === 'place' || hangoutMode() === 'influence') {
        <section class="mode-box" role="status">
          <header>{{ (hangoutMode() === 'place' ? 'worldMap.hangout.title.place' : 'worldMap.hangout.title.influence') | t }}</header>
          <div class="mode-body">
            <p>
              @if (hangoutMode() === 'place') {
                {{ placeHint() }}
              } @else if (hangoutMode() === 'influence') {
                {{ (influenceTotal() ? 'worldMap.hangout.influence.hint' : 'worldMap.hangout.influence.none') | t }}
              }
            </p>
            <!-- Il contatore grosso, nel carattere del denaro: luoghi in vista, edifici scelti (su quanti servono) o edifici dell'area. -->
            <span class="mode-count" [class.done]="hangoutMode() === 'influence' && influenceReady()">{{ modeCount() }}@if (hangoutMode() === 'influence') {<small>/{{ influenceNeeded() }}</small>}</span>
          </div>
          <footer>
            @if (hangoutMode() === 'influence') {
              <button type="button" class="dlg-btn primary" [class.off]="!influenceReady()" [disabled]="!influenceReady()" (click)="confirmInfluence()">{{ 'worldMap.hangout.influence.confirm' | t }}</button>
            }
            <button type="button" class="dlg-btn" (click)="hangoutMode.set('none')">{{ 'worldMap.hangout.cancel' | t }}</button>
          </footer>
        </section>
      }
      <!-- La pillola dei comandi, sopra il riquadro Fixer, mentre la lente è accesa: modificare, nascondere, eliminare (per ora tutti spenti). -->
      @if (hangoutMode() === 'view') {
        <div class="pill" role="toolbar" [attr.aria-label]="'worldMap.hangout.pill.label' | t">
          <button type="button" disabled [attr.aria-label]="'worldMap.hangout.pill.edit' | t" [title]="'worldMap.hangout.pill.edit' | t"><app-icon name="edit" [size]="18" /></button>
          <button type="button" [attr.aria-pressed]="zonesOn()" [attr.aria-label]="'worldMap.hangout.pill.visibility' | t" [title]="'worldMap.hangout.pill.visibility' | t" (click)="zonesOn.set(!zonesOn())"><app-icon [name]="zonesOn() ? 'visibility' : 'visibility_off'" [size]="18" /></button>
          <button type="button" [attr.aria-label]="'worldMap.hangout.pill.delete' | t" [title]="'worldMap.hangout.pill.delete' | t" (click)="removeAsked.set(true)"><app-icon name="delete" [size]="18" /></button>
          <button type="button" [attr.aria-pressed]="infoOn()" [attr.aria-label]="'worldMap.hangout.pill.info' | t" [title]="'worldMap.hangout.pill.info' | t" (click)="toggleInfo()"><app-icon name="help" [size]="18" /></button>
        </div>
      }      <section class="fixer" [class.mine]="!!hangout()" [class.active]="hangoutMode() === 'view'" [attr.aria-label]="'worldMap.fixer.title' | t">
        <header>
          <span>{{ 'worldMap.fixer.title' | t }}</span>
          <!-- Con un ritrovo, la lente per guardare l'area di influenza: solo icona, tutto a destra dell'intestazione. -->
          @if (hangout()) {
            <button type="button" class="hdr-btn" [attr.aria-pressed]="hangoutMode() !== 'none'" [attr.aria-label]="'worldMap.hangout.viewLabel' | t" [title]="'worldMap.hangout.viewLabel' | t" (click)="onHangoutClick()">
              <app-icon name="search" [size]="16" />
            </button>
          }
        </header>
        <div class="fixer-body">
          @if (hangout()) {
            <div class="rep-block">
              <p class="rep"><app-icon name="groups_3" [size]="20" /><span class="stat-label">{{ 'worldMap.fixer.reputation' | t }}</span><span class="stat-val">{{ reputation() }}</span></p>
              <p class="controls">{{ (hangout()!.buildings.length === 1 ? 'worldMap.fixer.controlsOne' : 'worldMap.fixer.controlsMany') | t: { n: hangout()!.buildings.length } }}</p>
            </div>
          } @else {
            <p class="pitch">{{ 'worldMap.fixer.pitch' | t }}</p>
          }
          @if (!hangout()) {
            <button type="button" class="add" [attr.aria-pressed]="hangoutMode() !== 'none'" [attr.aria-label]="'worldMap.hangout.setLabel' | t" [title]="'worldMap.hangout.setLabel' | t" (click)="onHangoutClick()">
              <app-icon name="add_home" [size]="22" />
            </button>
          }
        </div>
      </section>
      <section class="merc" [attr.aria-label]="'worldMap.mercenary.title' | t">
        <header>{{ 'worldMap.mercenary.title' | t }}</header>
        <p class="merc-body">
          <app-icon name="star" [size]="20" />
          <span class="stat-label">{{ 'worldMap.fame.label' | t }}</span>
          <span class="stat-val">{{ fame() }}</span>
        </p>
      </section>
    </div>
    <app-confirm-dialog [open]="removeAsked()" [title]="'worldMap.hangout.removeTitle' | t" [text]="'worldMap.hangout.removeText' | t" [confirmLabel]="'worldMap.hangout.remove' | t" (confirmed)="removeHangout()" (cancel)="removeAsked.set(false)" />
    <app-hangout-info-panel [info]="infoData()" (closed)="infoTarget.set(null)" />
    <app-hangout-place-panel [place]="pendingPlace()" [distance]="pendingDistance()" (closed)="pendingPlace.set(null)" (confirmed)="confirmPlace()" />
    <app-map-nav [located]="!location.locked()" [view3d]="view3d()" [bearing]="bearing()" (locate)="focusUser()" (toggle3d)="toggle3d()" (resetNorth)="resetNorth()" (zoomIn)="zoom(1)" (zoomOut)="zoom(-1)" />
    <app-contract-panel [contract]="selectedContract()" [unlocked]="!!selectedContract() && unlockedIds().has(selectedContract()!.id)" [accepted]="!!selectedContract() && heldIds().includes(selectedContract()!.id)" [heldCount]="heldContracts().length" [maxHeld]="maxHeld" [breach]="breach()" [distance]="selectedDistance()" [route]="route()" [alertLevel]="weatherAlert()?.level ?? null" (closed)="selectedId.set(null)" (accept)="acceptContract($event)" (devUnlock)="devUnlock($event)" (devReset)="devReset()" />
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
    /* In alto a sinistra, nel box come i tasti; il logo (app-brand-logo) è un SVG usato come maschera, quindi lo colora il testo. */
    .logo { position: absolute; top: 10px; left: 10px; z-index: 1; color: var(--c-text); pointer-events: none; }
    /* I tasti nell'intestazione della tendina (schermo intero, impostazioni): quadrati piccoli, a spigoli secchi. */
    .hbtn { width: 32px; height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: none; color: var(--c-text-dim); cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast); }
    .hbtn:hover:not(:disabled), .hbtn:focus-visible { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
    .hbtn:disabled { opacity: 0.45; cursor: default; }
    /* Lo stato della ricerca della posizione: al centro in basso, senza spostare l'orologio. Su telefono occupa tutta la larghezza (meno 10px per lato). */
    .status { position: absolute; left: 50%; transform: translateX(-50%); bottom: 10px; z-index: 2; margin: 0; padding: 0 5px; max-width: calc(100% - 20px); box-sizing: border-box; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: var(--c-surface); color: var(--c-text-dim); font: 12px/20px 'Helvetica Neue', Arial, Helvetica, sans-serif; pointer-events: none; }
    .status { display: flex; align-items: center; gap: 4px; }
    .halo-toggle { pointer-events: auto; width: 20px; height: 20px; margin-right: -5px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 0; background: none; color: var(--c-text-dim); cursor: pointer; transition: color var(--t-fast); }
    .halo-toggle:hover, .halo-toggle:focus-visible { color: var(--c-interact); outline: none; }
    /* In basso a sinistra una fila di riquadri come i tasti (36px di altezza): l'orologio e, se c'è, l'avviso di allerta meteo. */
    .corner { position: absolute; left: 10px; bottom: 10px; z-index: 1; display: flex; align-items: center; gap: 8px; pointer-events: none; }
    /* In basso a destra una colonna di larghezza fissa: il profilo Fixer sopra, la Fama sotto, larghi uguale. */
    .corner.end { left: auto; right: 10px; flex-direction: column; align-items: stretch; width: min(var(--side-panel-w), calc(100% - 20px)); }
    /* Il profilo Fixer: un riquadro con un'intestazione sottile. Giallo (avviso) finché non c'è un ritrovo, verde come il giocatore dopo. */
    .fixer { --accent: var(--c-warn); pointer-events: auto; box-sizing: border-box; border: 1px solid var(--accent); border-radius: var(--radius-1); background: var(--c-surface); color: var(--c-text); }
    /* Con un ritrovo il riquadro è blu; verde (insieme alla pillola dei suoi strumenti) solo mentre la lente è accesa. */
    .fixer.mine { --accent: var(--c-interact); }
    .fixer.active { --accent: var(--c-you); }
    .fixer header { display: flex; align-items: center; justify-content: space-between; padding: 0 0 0 12px; border-bottom: 1px solid var(--accent); color: var(--accent); font: 600 10px/1.4 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; }
    .fixer-body { display: flex; align-items: center; gap: 10px; padding: 8px 10px 8px 12px; }
    .pitch, .rep-block { flex: 1; min-width: 0; margin: 0; }
    .rep-block { display: flex; flex-direction: column; gap: 6px; }
    .rep, .controls { margin: 0; }
    .controls { font: 12px/1.35 'Helvetica Neue', Arial, Helvetica, sans-serif; color: var(--c-text-dim); }
    .pitch { font: 12px/1.35 'Helvetica Neue', Arial, Helvetica, sans-serif; }
    .rep { display: flex; align-items: center; gap: 8px; }
    /* Fama e Reputazione: l'etichetta in maiuscolo come «Contratti», il valore nel carattere del denaro. */
    .stat-label { font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    .stat-val { margin-left: auto; font: 700 14px/1 var(--font-mono); font-variant-numeric: tabular-nums; color: var(--c-text); } /* il valore sta a destra, lontano dall'etichetta */
    .add { flex: none; width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--accent); border-radius: var(--radius-1); background: none; color: var(--accent); cursor: pointer; transition: background var(--t-fast); }
    /* Il tasto di ricerca nell'intestazione: solo icona, un blocchetto attaccato al fondo e al bordo destro dell'intestazione, con un filo a sinistra, del colore del riquadro. */
    /* Le intestazioni dei tre riquadri della colonna (istruzioni, Fixer, Mercenario) sono alte uguali: 28px, quanto è largo il tasto di ricerca (il blocchetto è quadrato). */
    .fixer header, .mode-box header, .merc header { box-sizing: content-box; height: 28px; display: flex; align-items: center; }
    .mode-box header, .merc header { padding: 0 12px; }
    /* Il riquadro del Mercenario: neutro (grigio), come l'orologio. */
    .merc { pointer-events: auto; box-sizing: border-box; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); background: var(--c-surface); color: var(--c-text); }
    .merc header { border-bottom: 1px solid var(--c-line-strong); color: var(--c-text-dim); font: 600 10px/1.4 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; }
    .merc-body { display: flex; align-items: center; gap: 8px; margin: 0; padding: 8px 12px; }
    .hdr-btn { flex: none; align-self: stretch; width: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 0; border-left: 1px solid var(--accent); border-radius: 0; background: none; color: var(--accent); cursor: pointer; transition: background var(--t-fast); }
    .hdr-btn:hover, .hdr-btn:focus-visible, .hdr-btn[aria-pressed='true'] { background: color-mix(in srgb, var(--accent) 20%, transparent); outline: none; }
    .add:hover, .add:focus-visible, .add[aria-pressed='true'] { background: color-mix(in srgb, var(--accent) 20%, transparent); outline: none; }
    /* Il box con le istruzioni mentre si sceglie il luogo, gli edifici dell'influenza o si espande l'area: sta sopra il profilo Fixer, nella colonna, e sale dal basso quando compare. */
    .mode-box { pointer-events: auto; box-sizing: border-box; border: 1px solid var(--c-interact); border-radius: var(--radius-1); background: var(--c-surface); color: var(--c-text); animation: mode-rise 0.28s var(--ease-draw); }
    @keyframes mode-rise { from { opacity: 0; transform: translateY(24px); } }
    @media (prefers-reduced-motion: reduce) { .mode-box { animation: none; } }
    .mode-box header { padding: 3px 12px; border-bottom: 1px solid var(--c-interact); color: var(--c-interact); font: 600 10px/1.4 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; }
    .mode-body { display: flex; align-items: center; gap: 12px; padding: 10px 12px; }
    .mode-body p { flex: 1; margin: 0; font: 12px/1.35 'Helvetica Neue', Arial, Helvetica, sans-serif; }
    /* Il contatore grosso, nel carattere del denaro; verde quando gli edifici da scegliere sono tutti scelti. */
    .mode-count { flex: none; font: 700 32px/1 var(--font-mono); font-variant-numeric: tabular-nums; color: var(--c-interact); }
    .mode-count small { font-size: 14px; color: var(--c-text-dim); }
    .mode-count.done { color: var(--c-you); }
    .mode-box footer { display: flex; justify-content: flex-end; gap: 8px; padding: 8px 10px; border-top: 1px solid var(--c-line); }
    /* La pillola dei comandi sopra il riquadro Fixer: tre tasti, con solo gli angoli in alto a destra e in basso a sinistra arrotondati (come i badge del Briefing), allineata a destra, sale dal basso come il box delle istruzioni. */
    .pill { align-self: flex-end; display: flex; gap: 4px; padding: 3px; border: 1px solid var(--c-you); border-radius: 0 var(--radius-2) 0 var(--radius-2); background: var(--c-surface); pointer-events: auto; animation: mode-rise 0.28s var(--ease-draw); }
    .pill button { width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 0; background: none; color: var(--c-you); cursor: pointer; }
    /* Il primo e l'ultimo tasto seguono la curva del contenitore (raggio della pillola meno il suo bordo e il suo margine interno: 1px + 3px), così il loro sfondo non esce dall'angolo. */
    .pill button:first-child { border-bottom-left-radius: calc(var(--radius-2) - 4px); }
    .pill button:last-child { border-top-right-radius: calc(var(--radius-2) - 4px); }
    .pill button:disabled { opacity: 0.4; cursor: default; }
    .pill button:enabled:hover, .pill button:enabled:focus-visible, .pill button[aria-pressed='true'] { background: color-mix(in srgb, var(--c-you) 20%, transparent); outline: none; }
    .clock, .weather { margin: 0; height: 36px; padding: 0 12px; box-sizing: border-box; display: flex; align-items: center; gap: 8px; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); background: var(--c-surface); color: var(--c-text); font: 14px/1 'Helvetica Neue', Arial, Helvetica, sans-serif; font-variant-numeric: tabular-nums; }
    /* L'allerta prende il colore del suo livello (gialla, arancione, rossa); il nome del livello e della zona sta nel suggerimento. */
    .weather { pointer-events: auto; border-color: var(--alert-color); color: var(--alert-color); animation: weather-blink 1s ease-in-out 2; }
    /* Quando compare (anche a ogni ricarica della pagina) lampeggia due volte e poi resta fisso. */
    @keyframes weather-blink { 50% { opacity: 0.15; } }
    @media (prefers-reduced-motion: reduce) { .weather { animation: none; } }
    .weather[data-level='yellow'] { --alert-color: var(--c-warn); }
    .weather[data-level='orange'] { --alert-color: var(--c-missing); }
    .weather[data-level='red'] { --alert-color: var(--c-danger); }
    /* Il passaggio giorno/notte: l'icona scende, cambia mentre è nascosta e risale al suo posto. */
    .sun { display: inline-flex; transition: transform 240ms var(--ease-draw), opacity 240ms; }
    .sun.swapping { transform: translateY(28px); opacity: 0; }
    @media (prefers-reduced-motion: reduce) { .sun { transition: none; } }
    /* Su telefono l'orologio non si vede, l'allerta resta (è una sicurezza) e sale sopra l'avviso di posizione, che prende tutta la larghezza. */
    @media (max-width: 640px) {
      .corner:not(.end) .clock { display: none; }
      .corner { bottom: 52px; }
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
  /** L'allerta meteo in corso dove si trova il giocatore (null: nessuna o non si sa), dal servizio della Protezione Civile; ultimo controllo e posizione per cui è stato fatto. */
  /** La Fama del giocatore: per ora sempre 0, finché non esiste il sistema che la assegna (vedi il glossario). */
  protected readonly fame = signal(0);
  /** La Reputazione del giocatore come Fixer (separata dalla Fama): per ora sempre 0, finché non esiste il sistema che la assegna. */
  protected readonly reputation = signal(0);
  private readonly weatherService: WeatherAlertService = new DpcWeatherAlertService();
  protected readonly weatherAlert = signal<WeatherAlert | null>(null);
  private weatherAskedAt = 0;
  /** Il suggerimento dell'avviso: livello e zona («Allerta arancione · Bacini Liguri Marittimi di Centro»). */
  protected readonly alertTitle = computed(() => {
    const a = this.weatherAlert();
    return a ? translate(`worldMap.weather.${a.level}`, { zone: a.zone }) : '';
  });
  /** Il pannello laterale aperto: uno solo alla volta (aprirne uno chiude l'altro). */
  protected readonly panel = signal<'filters' | 'legend' | 'menu' | 'contracts' | null>(null);
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
  /** La violazione del contratto aperto (0-1) mentre il giocatore resta a portata, o null; il tempo in cui è iniziata e il timer. */
  protected readonly breach = signal<number | null>(null);
  /** Solo in sviluppo: il contratto per cui il tasto di prova ha fatto partire la violazione come se si fosse a portata. */
  private readonly devForced = signal<string | null>(null);
  private breachId: string | null = null;
  private breachSince = 0;
  private breachTimer: ReturnType<typeof setInterval> | null = null;
  /** I contratti accettati (stato del giocatore, nel localStorage; quelli di prova di sviluppo restano solo in memoria) e quanti se ne possono tenere. */
  private readonly heldStore: HeldStore = new LocalHeldStore();
  protected readonly heldIds = signal<readonly string[]>(this.heldStore.held());
  protected readonly maxHeld = CONTRACT_SLOTS;
  /** I contratti accettati, in ordine di numero (quelli che non si trovano più nell'elenco non contano). */
  protected readonly heldContracts = computed(() => this.contracts().filter((c) => this.heldIds().includes(c.id)).sort((a, b) => a.number - b.number));
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
  private routeAsked: { id: string; from: { lat: number; lng: number } } | null = null;
  private routeToken = 0;
  /** C'è già una linea disegnata (una nuova che compare corre dal punto A al punto B; un aggiornamento dello stesso percorso no) e il fotogramma dell'animazione in corso. */
  private routeDrawn = false;
  private routeFrame = 0;
  /** Il ritrovo del giocatore (luogo pubblico + area di edifici), nel localStorage. */
  private readonly hangoutStore: HangoutStore = new LocalHangoutStore();
  protected readonly hangout = signal<Hangout | null>(this.hangoutStore.get());
  /** Cosa si sta facendo con il ritrovo: niente, scegliere il luogo, o guardare l'area di influenza (la lente nel profilo Fixer). */
  protected readonly hangoutMode = signal<HangoutMode>('none');
  /** Il luogo appena scelto (non ancora salvato) mentre si scelgono gli edifici dove imporre l'influenza, gli edifici scelti finora e quanti se ne possono scegliere. */
  private readonly influencePlace = signal<Candidate | null>(null);
  protected readonly influenceChosen = signal<readonly number[]>([]);
  protected readonly influenceTotal = signal(0);
  /** Quanti edifici bisogna scegliere: INFLUENCE_POINTS, o meno se attorno al luogo non ce ne sono abbastanza. */
  protected readonly influenceNeeded = computed(() => Math.min(INFLUENCE_POINTS, this.influenceTotal()));
  /** Il numero grosso del box: luoghi in vista (scelta del luogo), edifici scelti (influenza) o edifici dell'area (espansione). */
  protected readonly modeCount = computed(() => {
    const mode = this.hangoutMode();
    return mode === 'place' ? this.placesCount() : mode === 'influence' ? this.influenceChosen().length : (this.hangout()?.buildings.length ?? 0);
  });
  protected readonly influenceReady = computed(() => this.influenceNeeded() > 0 && this.influenceChosen().length >= this.influenceNeeded());
  /** Il luogo toccato, in attesa di conferma. */
  protected readonly pendingPlace = signal<Candidate | null>(null);
  /** Quanti luoghi pubblici (o edifici da aggiungere) si vedono adesso: serve a dire cosa fare se non ce n'è nessuno. */
  protected readonly placesCount = signal(0);
  /** Quanto dista il giocatore dal luogo aperto, in metri (null senza posizione). */
  protected readonly pendingDistance = computed(() => {
    const p = this.pendingPlace();
    const here = this.location.position();
    return p && here ? distanceMeters(p, here) : null;
  });
  /** L'occhio della pillola: le aree rotonde attorno al ritrovo (100 m) e agli edifici (50 m) sono visibili. */
  protected readonly zonesOn = signal(false);
  /** La dialog di conferma del cestino (rimuovere il ritrovo) è aperta. */
  protected readonly removeAsked = signal(false);
  /** Quanto può distare un luogo dal giocatore per sceglierlo come ritrovo (metri), per le frasi della barra. */
  protected readonly pickRange = HANGOUT_PICK_RANGE_M;
  /** Il luogo ammesso più vicino al giocatore tra quelli nei tasselli caricati, in metri (null: nessuno trovato nei dati). */
  private readonly placesNearest = signal<number | null>(null);
  /** La frase della barra nella scelta del luogo: dice cosa fare, o perché non c'è niente da scegliere (nessuna posizione, luogo più vicino troppo lontano, dati non ancora caricati). */
  protected readonly placeHint = computed(() => {
    if (this.placesCount() > 0) return translate('worldMap.hangout.place.hint', { meters: HANGOUT_PICK_RANGE_M });
    if (!this.location.position()) return translate('worldMap.hangout.place.noPosition');
    const nearest = this.placesNearest();
    return nearest === null ? translate('worldMap.hangout.place.noneLoaded') : translate('worldMap.hangout.place.none', { meters: HANGOUT_PICK_RANGE_M, nearest: formatDistance(nearest) });
  });
  /** Il punto di domanda della pillola è attivo: un tocco sul ritrovo o su un edificio dell'area ne apre le info nel pannello laterale. */
  protected readonly infoOn = signal(false);
  protected readonly infoTarget = signal<{ kind: 'place' } | { kind: 'building'; id: number; areaM2: number | null; distanceM: number | null } | null>(null);
  /** Le info dell'elemento toccato (null: pannello chiuso). */
  protected readonly infoData = computed<HangoutInfo | null>(() => {
    const target = this.infoTarget();
    const h = this.hangout();
    if (!target || !h) return null;
    // Quartiere e città (dello stesso luogo per tutta l'area): in testa a tutte le info, appena sono stati letti.
    const loc = this.locality();
    const tags = [
      ...(loc?.city ? [{ label: translate('worldMap.hangout.info.cityLabel'), value: loc.city }] : []),
      ...(loc?.neighborhood ? [{ label: translate('worldMap.hangout.info.neighborhoodLabel'), value: loc.neighborhood }] : []),
    ];
    if (target.kind === 'place') {
      const n = h.buildings.length;
      return {
        title: h.place.name ?? translate('worldMap.hangout.info.placeTitle'),
        badge: translate(`worldMap.hangout.kind.${h.place.kind}` as MessageKey),
        icon: 'home',
        lines: [translate(n === 1 ? 'worldMap.fixer.controlsOne' : 'worldMap.fixer.controlsMany', { n })],
        tags,
        loading: this.localityLoading(),
        influence: ZONE_PLACE_M,
      };
    }
    const lines: string[] = [];
    if (target.distanceM !== null) lines.push(translate('worldMap.hangout.info.fromPlace', { distance: formatDistance(target.distanceM) }));
    if (target.areaM2 !== null) lines.push(translate('worldMap.hangout.info.surface', { area: Math.max(10, Math.round(target.areaM2 / 10) * 10) }));
    return { title: translate('worldMap.hangout.info.buildingTitle', { n: h.buildings.indexOf(target.id) + 1 }), badge: translate('worldMap.hangout.info.building'), icon: 'apartment', lines, tags, loading: this.localityLoading(), influence: ZONE_BUILDING_M };
  });
  /** Quartiere e città del ritrovo, letti una volta sola (finché non si rimuove il ritrovo). */
  protected readonly locality = signal<{ neighborhood: string | null; city: string | null } | null>(null);
  /** Quartiere e città si stanno scaricando. */
  protected readonly localityLoading = signal(false);
  private hangoutLayer: HangoutLayer | null = null;
  /** Rilegge i tasselli per la modalità in corso (a ogni «idle» della mappa) e l'ultimo risultato, per non ridisegnare se non è cambiato nulla. */
  private hangoutRefresh: (() => void) | null = null;
  private hangoutTimer: ReturnType<typeof setInterval> | null = null;
  private hangoutSignature = '';
  /** La mappa esiste: da qui si possono mettere i segnaposto dei contratti. */
  private readonly mapCreated = signal(false);
  private contractMarkers: Marker[] = [];
  private userMarker: Marker | null = null;
  private userArrow: HTMLElement | null = null;
  private userHalo: HTMLElement | null = null;
  private centeredOnUser = false;
  /** Verso dove guarda l'utente (gradi dal nord), per girare la freccia rispetto alla mappa quando questa ruota. */
  private userFacing = 0;
  /** L'utente sta toccando la mappa: finché non passano 5 secondi di quiete la mappa non lo segue. */
  private userBusy = false;
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;
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

    // L'allerta meteo: si controlla alla prima posizione, poi una volta all'ora (non a ogni lettura del GPS: le fonti sono a uso equo).
    effect(() => {
      const pos = this.location.position();
      if (pos) untracked(() => this.checkWeather(pos));
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

    // In sviluppo, alla prima posizione nascono i due contratti di prova.
    effect(() => {
      const pos = this.location.position();
      if (pos && isDevMode()) untracked(() => this.ensureDevContracts(pos));
    });

    // Lo sblocco non è istantaneo: col pannello del contratto aperto e il giocatore a portata (distanza - precisione <= 50 m) parte la violazione, che dura UNLOCK_BREACH_MS; se esce
    // dalla portata, chiude il pannello o ne apre un altro riparte da zero. Il calcolo è solo sul dispositivo.
    effect(() => {
      const c = this.selectedContract();
      const pos = this.location.position();
      const unlocked = this.unlockedIds();
      const forced = this.devForced();
      const active = !!c && !unlocked.has(c.id) && ((!!pos && canUnlock(c, pos)) || forced === c.id);
      untracked(() => {
        if (forced && c?.id !== forced) this.devForced.set(null); // il contratto di prova è stato chiuso o cambiato
        this.setBreach(active ? c : null);
      });
    });

    // Il ritrovo sulla mappa: il segnaposto c'è sempre; l'area di influenza solo quando la si guarda (tasto di ricerca = modalità espansione). Durante la scelta dell'influenza ci pensa quella.
    effect(() => {
      const h = this.hangout();
      const mode = this.hangoutMode();
      if (!this.mapCreated() || mode === 'influence') return;
      this.ngZone.runOutsideAngular(() => untracked(() => {
        this.hangoutLayer?.setArea(mode === 'view' ? (h?.buildings ?? []) : []);
        this.hangoutLayer?.setHome(h?.place ?? null);
      }));
    });
    // L'occhio acceso o spento: le aree rotonde si mostrano o si nascondono subito.
    effect(() => {
      this.zonesOn();
      if (!this.mapCreated()) return;
      this.ngZone.runOutsideAngular(() => untracked(() => { if (this.hangoutMode() === 'view') this.hangoutRefresh?.(); }));
    });
    // La casetta del luogo aperto nel pannello resta evidenziata.
    effect(() => {
      const place = this.pendingPlace();
      if (!this.mapCreated()) return;
      this.ngZone.runOutsideAngular(() => untracked(() => this.hangoutLayer?.setSelected(place)));
    });
    // Scegliere il luogo o espandere l'area: la mappa si prepara e legge i tasselli a ogni riposo.
    effect(() => {
      const mode = this.hangoutMode();
      if (!this.mapCreated()) return;
      this.ngZone.runOutsideAngular(() => untracked(() => this.applyHangoutMode(mode)));
    });

    this.location.start();

    this.destroyRef.onDestroy(() => {
      if (this.hangoutTimer) clearInterval(this.hangoutTimer);
      this.hangoutLayer?.destroy();
      this.hangoutLayer = null;
      this.location.stop();
      this.stopBreach();
      this.userMarker?.remove();
      this.userMarker = null;
      if (this.resumeTimer) clearTimeout(this.resumeTimer);
      cancelAnimationFrame(this.routeFrame);
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
  protected setPanel(which: 'filters' | 'legend' | 'menu' | 'contracts', open: boolean): void {
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

  /** Il tasto «ritrovo» in basso a destra: senza ritrovo apre la scelta del luogo, con un ritrovo apre (o chiude) l'espansione dell'area. */
  protected onHangoutClick(): void {
    this.panel.set(null);
    this.selectedId.set(null);
    this.hangoutMode.update((m) => (m !== 'none' ? 'none' : this.hangout() ? 'view' : 'place'));
  }

  /** Prepara la mappa per la modalità: legge i tasselli (ora e a ogni riposo della mappa) e mostra i luoghi tra cui scegliere o gli edifici da aggiungere. */
  private applyHangoutMode(mode: HangoutMode): void {
    const map = this.map;
    const layer = this.hangoutLayer;
    if (!map || !layer) return;
    if (this.hangoutRefresh) map.off('idle', this.hangoutRefresh);
    if (this.hangoutTimer) clearInterval(this.hangoutTimer);
    this.hangoutTimer = null;
    this.hangoutRefresh = null;
    this.hangoutSignature = '';
    layer.setPlaces([]);
    layer.setReach([]);
    layer.setBlocked([]);
    layer.setZone([]);
    // Fuori dalla scelta dell'influenza la mappa mostra il ritrovo salvato (o niente).
    if (mode !== 'influence') {
      layer.setArea(mode === 'view' ? (this.hangout()?.buildings ?? []) : []); // l'area si vede solo guardandola (espansione)
      layer.setHome(this.hangout()?.place ?? null);
    }
    this.ngZone.run(() => {
      this.placesCount.set(0);
      this.placesNearest.set(null);
      this.pendingPlace.set(null);
      if (mode !== 'view') { this.infoOn.set(false); this.infoTarget.set(null); }
      if (mode !== 'influence') { this.influencePlace.set(null); this.influenceChosen.set([]); this.influenceTotal.set(0); }
    });
    if (mode === 'none') return;

    // Gli edifici completi esistono solo da zoom 15: ci si avvicina se serve.
    if (mode === 'place') {
      const here = this.location.position();
      map.easeTo({ center: here ? [here.lng, here.lat] : map.getCenter(), zoom: Math.max(map.getZoom(), 16) }); // i luoghi sono entro HANGOUT_PICK_RANGE_M dal giocatore: si guarda da vicino
    }
    const h = this.hangout();
    if (mode === 'view' && h) {
      // La mappa si sposta e si avvicina (o si allontana) fino a contenere tutta l'area di influenza, lasciando liberi i bordi dove stanno i comandi. Se i tasselli dell'area non sono
      // ancora caricati si va prima sul ritrovo e, a mappa a riposo, si inquadra l'area (con quello che si è trovato, se manca qualcosa).
      const fit = (requireAll: boolean) => {
        const box = layer.boundsOf(h.buildings, requireAll);
        if (!box) return false;
        const wide = map.getContainer().clientWidth > 640;
        const padding = wide ? { top: 70, left: 70, right: 330, bottom: 70 } : { top: 70, left: 40, right: 40, bottom: 300 }; // a destra la colonna di riquadri (296px + bordo); sul telefono sta in basso
        map.fitBounds([[box[0], box[1]], [box[2], box[3]]], { padding, maxZoom: 18, duration: 900 });
        return true;
      };
      if (!fit(true)) {
        map.flyTo({ center: [h.place.lng, h.place.lat], zoom: Math.max(map.getZoom(), 16) });
        map.once('idle', () => { if (this.hangoutMode() === 'view') fit(false); });
      }
    }
    const place = this.influencePlace();
    if (mode === 'influence' && place) {
      layer.setHome(place);
      map.flyTo({ center: [place.lng, place.lat], zoom: Math.max(map.getZoom(), 16) });
    }

    if (mode === 'view') {
      // Si guarda soltanto: l'unica cosa da tenere aggiornata sono le aree rotonde, se l'occhio è acceso (a ogni riposo della mappa, perché la forma degli edifici arriva coi tasselli).
      const refreshZone = () => {
        const current = this.hangout();
        if (!current) return;
        if (!this.zonesOn()) {
          if (this.hangoutSignature !== 'off') { this.hangoutSignature = 'off'; layer.setZone([]); }
          return;
        }
        const circles = layer.zoneCircles(current.place, current.buildings);
        const signature = 'on:' + circles.map((c) => `${c.lng.toFixed(6)},${c.lat.toFixed(6)},${c.r}`).join('|');
        if (signature === this.hangoutSignature) return;
        this.hangoutSignature = signature;
        layer.setZone(circles);
      };
      this.hangoutRefresh = refreshZone;
      refreshZone();
      map.on('idle', refreshZone);
      return;
    }

    const refresh = () => {
      if (mode === 'influence') {
        const target = this.influencePlace();
        if (!target) return;
        // Gli edifici scelti si ricordano; quelli che non sono più fra i possibili (i tasselli cambiano) cadono.
        const { ids, blocked } = layer.eligibleAround(target);
        const chosen = this.influenceChosen().filter((id) => ids.includes(id));
        const signature = `${chosen.join(',')}|${ids.slice().sort((a, b) => a - b).join(',')}|${blocked.map((b) => b.id).sort((a, b) => a - b).join(',')}`;
        if (signature === this.hangoutSignature) return;
        this.hangoutSignature = signature;
        layer.setBlocked(blocked);
        layer.setArea(chosen);
        layer.setReach(ids.filter((id) => !chosen.includes(id)));
        this.ngZone.run(() => {
          if (chosen.length !== this.influenceChosen().length) this.influenceChosen.set(chosen);
          this.influenceTotal.set(ids.length);
        });
      } else if (mode === 'place') {
        // Solo i luoghi entro HANGOUT_PICK_RANGE_M dal giocatore (senza posizione, nessuno).
        const here = this.location.position();
        const found = here ? layer.readPlaces() : [];
        const places = here ? found.filter((p) => distanceMeters(p, here) <= HANGOUT_PICK_RANGE_M) : [];
        const nearest = here && found.length ? Math.round(Math.min(...found.map((p) => distanceMeters(p, here)))) : null;
        const signature = `${nearest}:` + places.map((p) => `${p.lng},${p.lat}`).sort().join('|');
        if (isDevMode() && signature !== this.hangoutSignature) console.info('[ritrovo] luoghi', { zoom: Math.round(map.getZoom() * 10) / 10, posizione: here ? [here.lat, here.lng] : null, poiNeiTasselli: layer.poiCount(), ammessiNeiTasselli: found.length, entroRaggio: places.length, piuVicinoM: nearest });
        if (signature === this.hangoutSignature) return;
        this.hangoutSignature = signature;
        layer.setPlaces(places, (place) => this.ngZone.run(() => { this.selectedId.set(null); this.panel.set(null); this.pendingPlace.set(place); }));
        this.ngZone.run(() => { this.placesCount.set(places.length); this.placesNearest.set(nearest); });
      }
    };
    this.hangoutRefresh = refresh;
    refresh();
    map.on('idle', refresh);
    // L'evento «a riposo» può non scattare (o scattare prima che arrivino i tasselli): finché si sceglie, si rilegge anche ogni secondo (se non è cambiato niente non si ridisegna nulla).
    this.hangoutTimer = setInterval(refresh, 1000);
  }

  /** Un tocco sulla mappa: nella scelta del luogo prende un luogo pubblico, nella scelta dell'influenza prende o toglie un edificio. */
  private onHangoutTap(point: { x: number; y: number }): void {
    const layer = this.hangoutLayer;
    const mode = this.hangoutMode();
    if (mode === 'view' && this.infoOn() && layer) {
      // Il punto di domanda: un tocco sul ritrovo o su un edificio dell'area apre le sue info; un tocco altrove chiude il pannello.
      const h = this.hangout();
      if (!h) return;
      // Il pannello si apre subito; quartiere e città si aggiungono appena arrivano (la prima volta serve leggere due piccoli tasselli).
      // Si ricorda solo un risultato completo: se manca la città (o tutto) al prossimo tocco si riprova.
      if (!this.locality()?.city) {
        this.ngZone.run(() => this.localityLoading.set(true));
        void localityAt(h.place.lng, h.place.lat).then((loc) => {
          if (isDevMode()) console.info('[ritrovo] quartiere e città', loc);
          this.ngZone.run(() => {
            if (loc.neighborhood || loc.city) this.locality.set({ neighborhood: loc.neighborhood, city: loc.city });
            this.localityLoading.set(false);
          });
        });
      }
      if (layer.isNearHome(point)) {
        this.ngZone.run(() => this.infoTarget.set({ kind: 'place' }));
        return;
      }
      const id = layer.areaAt(point);
      if (id !== null && h.buildings.includes(id)) {
        const stats = layer.buildingStats(id);
        const distanceM = stats ? distanceMeters({ lng: stats.center[0], lat: stats.center[1] }, h.place) : null;
        this.ngZone.run(() => this.infoTarget.set({ kind: 'building', id, areaM2: stats?.areaM2 ?? null, distanceM }));
        return;
      }
      this.ngZone.run(() => this.infoTarget.set(null));
      return;
    }
    if (mode === 'place') {
      this.ngZone.run(() => this.pendingPlace.set(null)); // un tocco sulla mappa chiude il pannello del luogo (le casette fermano il loro tocco)
      return;
    }
    if (layer && mode === 'influence') {
      // Un tocco su un edificio possibile lo sceglie (finché ci sono punti), uno su un edificio già scelto lo toglie.
      const add = layer.reachAt(point);
      const chosen = this.influenceChosen();
      if (add !== null && chosen.length < this.influenceNeeded()) {
        this.ngZone.run(() => this.influenceChosen.set([...chosen, add]));
        this.hangoutRefresh?.();
        return;
      }
      const drop = layer.areaAt(point);
      if (drop !== null && chosen.includes(drop)) {
        this.ngZone.run(() => this.influenceChosen.set(chosen.filter((id) => id !== drop)));
        this.hangoutRefresh?.();
      }
      return;
    }
  }

  /** Confermato il luogo: non si salva ancora niente, si passa alla scelta degli edifici dove imporre l'influenza (la mappa va lì e li cerca). */
  protected confirmPlace(): void {
    const place = this.pendingPlace();
    if (!place) return;
    this.influencePlace.set(place);
    this.influenceChosen.set([]);
    this.influenceTotal.set(0);
    this.pendingPlace.set(null);
    this.hangoutMode.set('influence');
  }

  /** Confermati gli edifici scelti: il ritrovo si salva con l'area di influenza fatta di quegli edifici. */
  protected confirmInfluence(): void {
    const place = this.influencePlace();
    if (!place || !this.influenceReady()) return;
    const hangout: Hangout = { place, buildings: [...this.influenceChosen()] };
    this.hangoutStore.save(hangout);
    this.hangout.set(hangout);
    this.hangoutMode.set('none');
  }

  /** Il punto di domanda della pillola: acceso, i tocchi sul ritrovo e sugli edifici dell'area aprono le info; spento, il pannello si chiude. */
  protected toggleInfo(): void {
    this.infoOn.update((v) => !v);
    if (!this.infoOn()) this.infoTarget.set(null);
  }

  /**
   * Il cestino della pillola, dopo la conferma: via il ritrovo e tutta la sua area, e il riquadro Fixer torna all'inizio (frase di presentazione e tasto per fissare un ritrovo).
   * I punti rimborsati (la metà di quelli spesi, minimo 3: per ora sempre 3) non hanno ancora dove andare, perché non esiste un conto dei punti; e i contratti creati nella zona
   * non esistono ancora: quando ci saranno, qui vanno riportati allo stato «posizionabile».
   */
  protected removeHangout(): void {
    this.hangoutStore.clear();
    this.locality.set(null);
    this.removeAsked.set(false);
    this.zonesOn.set(false);
    this.hangoutMode.set('none');
    this.hangout.set(null);
  }

  /** Torna alla mia posizione, restando almeno allo zoom di partenza. */
  protected focusUser(): void {
    const pos = this.location.position();
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    this.userBusy = false; // il tasto «dove sono» riprende subito l'inseguimento
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
    // L'alone è un elemento della mappa fuori da Angular: va aggiornato subito, non quando arriva una nuova posizione o si cambia zoom.
    this.ngZone.runOutsideAngular(() => { if (this.map) this.sizeHalo(this.map); });
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
    this.hangoutLayer = new HangoutLayer(map);
    map.on('style.load', () => { applyMapFilters(map, this.enabled(), this.view3d()); applyTerrain(map, this.view3d()); this.paintRoute(); this.hangoutLayer?.render(); });
    map.on('click', (e) => this.onHangoutTap(e.point));
    this.tileLoading = new TileLoadingView(map, BASEMAP_SOURCE_ID);
    map.once('idle', () => this.ready.set(true)); // 'idle': ha finito di caricare e disegnare (anche se qualche tassello è fallito)
    map.on('rotate', () => {
      this.bearing.set(Math.round(map.getBearing()));
      this.turnArrow(map);
    });
    // Un gesto dell'utente (trascinare, zoomare, ruotare) sospende l'inseguimento; dopo 5 secondi senza gesti la mappa torna da lui.
    for (const type of ['movestart', 'move', 'moveend'] as const) map.on(type, (e) => { if (e.originalEvent) this.userTouchedMap(map); });
    map.on('click', () => this.ngZone.run(() => this.selectedId.set(null))); // un tocco sulla mappa chiude il pannello del contratto (i marker fermano il loro tocco)
    map.on('zoom', () => this.sizeHalo(map));

    // Se cambia la misura del contenitore senza che cambi la finestra, la mappa si ridisegna.
    this.resizeObserver = new ResizeObserver(() => map.resize());
    this.resizeObserver.observe(this.container().nativeElement);
    this.mapCreated.set(true);
  }

  /** Solo in sviluppo: alla prima posizione nascono i due contratti di prova (non si salvano). */
  private ensureDevContracts(pos: UserPosition): void {
    if (!this.devList().length) this.devList.set(devContracts(pos));
  }

  /** Avvia (o continua) la violazione del contratto, o la ferma se `c` è null. Arrivata al 100% sblocca il contratto. */
  private setBreach(c: Contract | null): void {
    if (!c) {
      this.stopBreach();
      return;
    }
    if (this.breachId === c.id && this.breachTimer) return; // già in corso
    this.stopBreach();
    this.breachId = c.id;
    this.breachSince = performance.now();
    this.breach.set(0);
    this.breachTimer = setInterval(() => {
      // Una sola barra: la violazione ne occupa la metà e la decrittazione l'altra metà, anche se durano diverso.
      const elapsed = performance.now() - this.breachSince;
      const progress = Math.min(1, elapsed < UNLOCK_BREACH_MS ? (0.5 * elapsed) / UNLOCK_BREACH_MS : 0.5 + (0.5 * (elapsed - UNLOCK_BREACH_MS)) / UNLOCK_DECRYPT_MS);
      this.breach.set(progress);
      if (progress < 1) return;
      const done = this.contracts().find((x) => x.id === this.breachId);
      this.stopBreach();
      this.devForced.set(null);
      if (done) this.unlockContract(done);
    }, 100);
  }

  private stopBreach(): void {
    if (this.breachTimer) clearInterval(this.breachTimer);
    this.breachTimer = null;
    this.breachId = null;
    if (this.breach() !== null) this.breach.set(null);
  }

  /** Il contratto resta sbloccato (nel localStorage; quelli di prova di sviluppo solo in memoria). */
  private unlockContract(c: Contract): void {
    if (!c.id.startsWith(DEV_CONTRACT_PREFIX) && !this.unlockStore.unlock(c.id)) return;
    this.unlockedIds.set(new Set([...this.unlockedIds(), c.id]));
  }

  /** Chiede l'allerta meteo alla prima posizione e poi una volta all'ora (il servizio tiene l'ultimo esito nel localStorage e non chiama la rete prima). La posizione resta sul dispositivo: la zona si cerca qui. */
  private checkWeather(pos: UserPosition): void {
    if (this.weatherAskedAt && Date.now() - this.weatherAskedAt < WEATHER_CHECK_EVERY_MS) return;
    this.weatherAskedAt = Date.now();
    void this.weatherService.at(pos, new Date()).then((alert) => this.weatherAlert.set(alert));
  }

  /** Chiede (o toglie) il percorso a piedi per il contratto aperto. */
  private updateRoute(c: Contract | null, pos: UserPosition | null): void {
    if (!c) {
      this.routeToken++;
      this.routeAsked = null;
      this.route.set(null);
      return;
    }
    if (!pos) return;
    const from = { lat: pos.lat, lng: pos.lng };
    if (this.routeAsked?.id === c.id && distanceMeters(this.routeAsked.from, from) < ROUTE_REFRESH_M) return;
    if (this.routeAsked?.id !== c.id) this.route.set(null); // un altro contratto: via la linea vecchia
    this.routeAsked = { id: c.id, from };
    const token = ++this.routeToken;
    void this.routeService.walk(from, c).then((r) => {
      if (token !== this.routeToken) return; // nel frattempo si è aperto altro o si è chiuso
      this.route.set(r);
    });
  }

  /**
   * Disegna (o toglie) la linea del percorso, dello stesso verde della posizione del giocatore. Quando la linea compare corre dal punto A (la posizione del giocatore) al punto B (il contratto):
   * una sfumatura lungo il percorso che si allunga da trasparente a piena (con "riduci le animazioni" compare intera). Un aggiornamento dello stesso percorso (il giocatore si è mosso) non
   * la rifà; dopo un cambio di tema la linea si ridisegna da `style.load` senza animazione.
   */
  private paintRoute(): void {
    const map = this.map;
    if (!map) return;
    const route = this.route();
    const color = getComputedStyle(document.documentElement).getPropertyValue('--c-you').trim();
    const data = { type: 'FeatureCollection' as const, features: route ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: route.coordinates } }] : [] };
    const animate = !!route && !this.routeDrawn && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      const source = map.getSource(ROUTE_SOURCE);
      if (source && 'setData' in source) {
        if (animate) map.setPaintProperty(ROUTE_LAYER, 'line-gradient', routeGradientUntil(color, 0)); // prima di mostrare la linea nuova: nascosta
        (source as GeoJSONSource).setData(data);
      } else {
        map.addSource(ROUTE_SOURCE, { type: 'geojson', data, lineMetrics: true }); // lineMetrics: serve alla sfumatura lungo la linea
        map.addLayer({
          id: ROUTE_LAYER,
          type: 'line',
          source: ROUTE_SOURCE,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-gradient': animate ? routeGradientUntil(color, 0) : routeGradient(color), 'line-width': 4, 'line-opacity': 0.9 },
        });
      }
    } catch {
      map.once('idle', () => this.paintRoute()); // lo stile non è ancora pronto (cambio di tema o primi tasselli): si riprova a riposo
      return;
    }
    cancelAnimationFrame(this.routeFrame);
    if (!route) {
      this.routeDrawn = false;
      return;
    }
    if (animate) this.animateRoute(map, color, route.distanceM);
    else map.setPaintProperty(ROUTE_LAYER, 'line-gradient', routeGradient(color));
    this.routeDrawn = true;
  }

  /** Fa correre la linea da A a B: la parte colorata cresce da 0 a tutto il percorso, rallentando verso la fine; dura da 0,9 a 2,2 secondi secondo la lunghezza. */
  private animateRoute(map: MapLibreMap, color: string, distanceM: number): void {
    const duration = Math.min(2200, 900 + distanceM * 0.4);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      try {
        map.setPaintProperty(ROUTE_LAYER, 'line-gradient', t < 1 ? routeGradientUntil(color, eased) : routeGradient(color));
      } catch {
        return; // lo stile è cambiato nel frattempo: ci pensa `style.load`
      }
      if (t < 1) this.routeFrame = requestAnimationFrame(step);
    };
    this.routeFrame = requestAnimationFrame(step);
  }

  /** Si tocca un contratto: la mappa va alle sue coordinate (spostando il centro fuori dal pannello che si apre) e si apre il pannello con le info. */
  private selectContract(c: Contract): void {
    this.panel.set(null);
    this.pendingPlace.set(null); // un solo pannello alla volta
    this.selectedId.set(c.id);
    const map = this.map;
    if (!map) return;
    const phone = matchMedia('(max-width: 640px)').matches;
    const pos = this.location.position();
    const near = this.unlockedIds().has(c.id) || (!!pos && canUnlock(c, pos));
    this.ngZone.runOutsideAngular(() => {
      if (!near && pos && !phone) {
        // Fuori portata: una vista che include sia il giocatore sia il contratto, nello spazio che il pannello lascia libero (con un po' di margine; la barra in alto e l'orologio non coprono i punti).
        const margin = 60;
        const padding = phone ? { top: 80, left: margin, right: margin, bottom: Math.round(window.innerHeight * 0.4) + margin } : { top: 80, left: margin + 56, bottom: 80, right: 56 + 320 + 10 + margin };
        map.fitBounds([[Math.min(pos.lng, c.lng), Math.min(pos.lat, c.lat)], [Math.max(pos.lng, c.lng), Math.max(pos.lat, c.lat)]], { padding, maxZoom: USER_ZOOM, duration: 900 });
        return;
      }
      // A portata: il contratto resta al centro dello spazio che il pannello lascia libero: a sinistra del pannello (56px di tasti + 320px di pannello + 10px) su schermo largo, sopra il foglio su telefono (anche se è lontano: lì basta centrarlo).
      const padding = phone ? { top: 0, left: 0, right: 0, bottom: Math.round(window.innerHeight * 0.5) } : { top: 0, left: 0, bottom: 0, right: 56 + 320 + 10 };
      map.flyTo({ center: [c.lng, c.lat], zoom: Math.max(map.getZoom(), USER_ZOOM - 1), padding });
    });
  }

  /** Il tasto Accetta: il contratto sbloccato passa fra quelli accettati, se c'è posto. Quelli di prova di sviluppo restano solo in memoria. */
  protected acceptContract(c: Contract): void {
    if (!this.unlockedIds().has(c.id) || this.heldIds().includes(c.id) || this.heldIds().length >= CONTRACT_SLOTS) return;
    if (!c.id.startsWith(DEV_CONTRACT_PREFIX) && !this.heldStore.add(c.id)) return;
    this.heldIds.set([...this.heldIds(), c.id]);
  }

  /** Il tasto Annulla di un contratto accettato: esce da quelli che si tengono e il posto torna libero (resta sbloccato: lo si può riaccettare). */
  protected cancelContract(c: Contract): void {
    if (!this.heldIds().includes(c.id)) return;
    if (!c.id.startsWith(DEV_CONTRACT_PREFIX) && !this.heldStore.remove(c.id)) return;
    this.heldIds.set(this.heldIds().filter((id) => id !== c.id));
  }

  /** Il tasto Gioca di un contratto accettato: si gioca da casa, la partita parte dal Briefing. */
  protected playContract(c: Contract): void {
    void this.router.navigate(['/party', c.mapId]);
  }

  /** Solo in sviluppo: azzera sblocchi e contratti accettati (nel localStorage e in memoria), per riprovare da capo senza svuotare il browser. */
  protected devReset(): void {
    this.stopBreach();
    this.devForced.set(null);
    this.unlockStore.clear();
    this.heldStore.clear();
    this.unlockedIds.set(new Set());
    this.heldIds.set([]);
  }

  /** Solo in sviluppo: fa partire la violazione come se si fosse a portata (5 secondi, poi si sblocca), per vedere la procedura senza GPS. */
  protected devUnlock(c: Contract): void {
    this.devForced.set(c.id);
  }

  /** Un segnaposto per contratto: il numero, in verde se sbloccato, spento se bloccato, in risalto se è quello aperto. Il tocco apre la scheda (fuori da NgZone, quindi rientra con 
un). */
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
      el.style.cssText = 'width:32px;height:32px;padding:0;border:0;background:none'; // niente `position`: la classe `.maplibregl-marker` lo vuole absolute, così il marker segue le coordinate
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
    this.userFacing = facing ?? 0;
    this.turnArrow(map);
    this.userHalo!.dataset['meters'] = String(pos.accuracy);
    this.sizeHalo(map);
    const wasCentered = this.centeredOnUser;
    if (!this.centeredOnUser) {
      this.centeredOnUser = true;
      // Alla prima lettura (anche approssimativa) la mappa è subito sul giocatore, senza animazione (la mappa è ancora nascosta).
      map.jumpTo({ center: [pos.lng, pos.lat], zoom: Math.max(map.getZoom(), USER_ZOOM) });
      this.refinedOnUser = pos.accuracy <= GOOD_ACCURACY_M;
    } else if (!this.refinedOnUser && pos.accuracy <= GOOD_ACCURACY_M) {
      // La prima lettura era approssimativa: appena arriva quella precisa, la mappa si sposta dolcemente lì (una volta sola).
      this.refinedOnUser = true;
      map.easeTo({ center: [pos.lng, pos.lat] });
    } else if (wasCentered) {
      this.followUser(map, pos);
    }
  }

  /** La freccia punta dove guarda l'utente, rispetto allo schermo: se la mappa è girata nello stesso verso (inseguimento) sta dritta. */
  private turnArrow(map: MapLibreMap): void {
    if (this.userArrow) this.userArrow.style.transform = `rotate(${this.userFacing - map.getBearing()}deg)`;
  }

  /** Solo mentre l'utente si muove davvero (il GPS dà una direzione): la mappa lo tiene al centro e si orienta come lui. Da fermo non si tocca. */
  private followUser(map: MapLibreMap, pos: UserPosition): void {
    if (pos.heading === null || this.userBusy || this.hangoutMode() !== 'none') return; // scegliendo il ritrovo la mappa resta dov'è
    map.easeTo({ center: [pos.lng, pos.lat], bearing: pos.heading, duration: 800, easing: (t) => t });
  }

  private userTouchedMap(map: MapLibreMap): void {
    this.userBusy = true;
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    this.resumeTimer = setTimeout(() => {
      this.userBusy = false;
      const pos = this.location.position();
      if (pos && this.map === map) this.followUser(map, pos);
    }, 5000);
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

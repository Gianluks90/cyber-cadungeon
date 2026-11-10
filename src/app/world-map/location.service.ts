import { Injectable, computed, signal } from '@angular/core';

export interface UserPosition {
  lng: number;
  lat: number;
  /** Dove sta andando, in gradi dal nord: solo se si muove davvero (da fermo il GPS non lo sa). */
  heading: number | null;
  /** Raggio di incertezza in metri: più è piccolo, più la posizione è precisa. */
  accuracy: number;
}

/** Come sta andando la lettura della posizione. `waiting` = consenso dato, si aspetta la risposta del dispositivo. */
export type LocationState = 'idle' | 'waiting' | 'granted' | 'denied' | 'unavailable';

const CONSENT_KEY = 'cad-location-consent';
/** Sotto questa incertezza (metri) la posizione è considerata precisa. */
export const GOOD_ACCURACY_M = 25;
/** Sotto questa velocità (m/s) la direzione del GPS non è affidabile e si usa la bussola. */
const MOVING_SPEED = 1;

/**
 * La posizione del giocatore. Si legge solo dopo il consenso dato nel pannello (salvato nel browser con la data) e solo mentre l'app è aperta:
 * nessuna cronologia, nessun invio altrove. Senza posizione la mappa resta ferma.
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  readonly state = signal<LocationState>('idle');
  /** La posizione di adesso, appena arriva la prima lettura (anche approssimativa); poi si affina da sola. Prima, la mappa resta ferma. */
  readonly position = signal<UserPosition | null>(null);
  /** La bussola del dispositivo, in gradi dal nord (se il sensore c'è e il permesso è stato dato). */
  readonly compass = signal<number | null>(null);
  /** Verso dove punta la freccia: la direzione di marcia se ci si muove, altrimenti la bussola. */
  readonly facing = computed(() => this.position()?.heading ?? this.compass());
  /** Si sta cercando una posizione precisa (consenso dato, ma ancora nessuna lettura). */
  readonly searching = computed(() => !this.needsPanel() && this.position() === null);
  private fix: UserPosition | null = null;
  private compassCleanup: (() => void) | null = null;
  private readonly consented = signal(readConsent());
  private watchId: number | null = null;

  /** Il pannello del consenso serve se manca il consenso o se il dispositivo non ci lascia leggere la posizione. */
  readonly needsPanel = computed(() => !this.consented() || this.state() === 'denied' || this.state() === 'unavailable');
  /** La mappa si muove solo quando c'è una posizione. */
  readonly locked = computed(() => this.position() === null);

  /** All'apertura della mappa: se il consenso c'è già, si riparte a leggere. */
  start(): void {
    if (this.consented()) {
      this.watch();
      void this.listenCompass();
    }
  }

  /** Tasto Accetta: si ricorda il consenso e si chiede la posizione al dispositivo. */
  accept(): void {
    try { localStorage.setItem(CONSENT_KEY, new Date().toISOString()); } catch { /* archivio bloccato: il consenso vale per questa visita */ }
    this.consented.set(true);
    // Su iPhone il permesso per la bussola si chiede solo dentro un clic: per questo parte subito, prima di ogni attesa.
    void this.listenCompass();
    this.watch();
  }

  /** Ritira il consenso (uscita dall'app o rifiuto): si smette di leggere e si dimentica tutto. */
  revoke(): void {
    this.stop();
    try { localStorage.removeItem(CONSENT_KEY); } catch { /* niente da togliere */ }
    this.consented.set(false);
    this.state.set('idle');
  }

  /** Si smette di leggere la posizione (il consenso resta, per la prossima visita). */
  stop(): void {
    if (this.watchId !== null) navigator.geolocation?.clearWatch(this.watchId);
    this.watchId = null;
    this.compassCleanup?.();
    this.compassCleanup = null;
    this.fix = null;
    this.position.set(null);
    this.compass.set(null);
  }

  private watch(): void {
    this.stop();
    if (!('geolocation' in navigator)) {
      this.state.set('unavailable');
      return;
    }
    this.state.set('waiting');
    // Il GPS preciso può metterci molti secondi: intanto una lettura veloce e approssimativa (rete, o l'ultima nota al browser) fa partire la mappa.
    // Vale solo se la lettura precisa non è ancora arrivata; poi la affina la lettura continua qui sotto.
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (this.fix !== null || this.watchId === null) return;
        this.fix = { lng: p.coords.longitude, lat: p.coords.latitude, heading: null, accuracy: p.coords.accuracy };
        this.state.set('granted');
        this.position.set(this.fix);
      },
      () => { /* nessuna lettura veloce: si aspetta quella precisa */ },
      { enableHighAccuracy: false, maximumAge: 5 * 60_000, timeout: 5000 },
    );
    this.watchId = navigator.geolocation.watchPosition(
      (p) => {
        const moving = (p.coords.speed ?? 0) > MOVING_SPEED && p.coords.heading !== null && !Number.isNaN(p.coords.heading);
        this.fix = { lng: p.coords.longitude, lat: p.coords.latitude, heading: moving ? p.coords.heading : null, accuracy: p.coords.accuracy };
        this.state.set('granted');
        this.position.set(this.fix); // subito, anche se approssimativa: le letture successive la affinano
      },
      (e) => {
        if (e.code === e.PERMISSION_DENIED) this.state.set('denied');
        else if (this.fix === null) this.state.set(e.code === e.POSITION_UNAVAILABLE ? 'unavailable' : 'waiting');
      },
      // maximumAge 0: mai una lettura vecchia; l'alta precisione chiede il GPS vero.
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }

  /** Ascolta la bussola. Android manda l'angolo assoluto (`alpha`), iPhone la direzione già pronta (`webkitCompassHeading`, dopo il permesso). Senza sensore non succede nulla. */
  private async listenCompass(): Promise<void> {
    if (this.compassCleanup || typeof DeviceOrientationEvent === 'undefined') return;
    const ask = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
    if (ask) {
      try {
        if ((await ask.call(DeviceOrientationEvent)) !== 'granted') return;
      } catch {
        return; // fuori da un clic iOS rifiuta: resta la direzione di marcia
      }
    }
    if (this.compassCleanup || this.watchId === null) return; // nel frattempo si è smesso di leggere la posizione
    const onTurn = (e: Event) => {
      const o = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
      let heading: number | null = null;
      if (typeof o.webkitCompassHeading === 'number') heading = o.webkitCompassHeading;
      else if (o.absolute && o.alpha !== null) heading = (360 - o.alpha + (screen.orientation?.angle ?? 0) + 360) % 360;
      const prev = this.compass();
      if (heading !== null && (prev === null || Math.abs(((heading - prev + 540) % 360) - 180) > 2)) this.compass.set(Math.round(heading));
    };
    window.addEventListener('deviceorientationabsolute', onTurn);
    window.addEventListener('deviceorientation', onTurn);
    this.compassCleanup = () => {
      window.removeEventListener('deviceorientationabsolute', onTurn);
      window.removeEventListener('deviceorientation', onTurn);
    };
  }
}

function readConsent(): boolean {
  try { return localStorage.getItem(CONSENT_KEY) !== null; } catch { return false; }
}

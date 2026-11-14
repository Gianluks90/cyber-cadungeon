import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';

/** Quanti segmenti ha la barra del footer. */
const SEGMENTS = Array.from({ length: 12 }, (_, i) => i);

/** Una coordinata come la mostra il display: segno, cinque decimali, larghezza fissa (così i numeri non ballano). */
const format = (v: number, int: number): string => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(5).padStart(int + 6, '0')}`;

/**
 * La finta dialog all'avvio della Home: intestazione "Localizzazione in corso…", due coordinate che girano a caso velocissime finché non c'è la posizione vera
 * (poi si fermano su quella, in verde) e una barra a segmenti che scorre in loop. Non decide quando sparire: lo fa chi la usa.
 */
@Component({
  selector: 'app-map-locating',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scrim">
      <section class="box" role="status" [class.found]="!!position()">
        <header>
          <h2>{{ (position() ? 'worldMap.locating.loading' : 'worldMap.locating.title') | t }}</h2>
        </header>
        <hr />
        <div class="content" aria-hidden="true">
          <div class="row"><span class="label">{{ 'worldMap.locating.lat' | t }}</span><span class="value">{{ lat() }}</span></div>
          <div class="row"><span class="label">{{ 'worldMap.locating.lng' | t }}</span><span class="value">{{ lng() }}</span></div>
        </div>
        <hr />
        <footer aria-hidden="true">
          <div class="segments">
            @for (i of segments; track i) {
              <span class="segment" [style.animation-delay.ms]="i * 90"></span>
            }
          </div>
        </footer>
      </section>
    </div>
  `,
  styles: `
    :host { display: contents; }
    .scrim { position: absolute; inset: 0; z-index: 5; display: flex; align-items: center; justify-content: center; padding: 10px; box-sizing: border-box; background: color-mix(in srgb, var(--c-bg) 70%, transparent); }
    .box { width: min(340px, 100%); display: flex; flex-direction: column; background: var(--c-surface); border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); }
    header { padding: 12px 14px; }
    h2 { margin: 0; font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.06em; text-transform: uppercase; }
    hr { width: 100%; margin: 0; border: 0; border-top: 1px solid var(--c-line-strong); }
    .content { display: flex; flex-direction: column; gap: 10px; padding: 18px 14px; }
    .row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    .label { font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    .value { font: 600 22px/1 var(--font-mono); font-variant-numeric: tabular-nums; color: var(--c-text); transition: color var(--t-fast); }
    .box.found .value { color: var(--c-you); }
    footer { padding: 14px; }
    .segments { display: flex; gap: 4px; }
    .segment { flex: 1 1 0; height: 4px; background: var(--c-line); animation: sweep 1.08s steps(1, end) infinite; }
    /* Il segmento si accende per un attimo e passa al successivo (i ritardi sono a scatti da 90ms su 12 segmenti = un giro di 1,08s). */
    @keyframes sweep { 0% { background: var(--c-interact); } 8.33% { background: var(--c-line); } }
    @media (prefers-reduced-motion: reduce) { .segment { animation-duration: 3.24s; } }
  `,
})
export class MapLocatingComponent {
  /** La posizione vera, appena c'è: i numeri si fermano lì. Prima, girano a caso. */
  readonly position = input<{ lat: number; lng: number } | null>(null);
  protected readonly segments = SEGMENTS;

  private readonly random = signal({ lat: 0, lng: 0 });
  protected readonly lat = computed(() => format(this.position()?.lat ?? this.random().lat, 2));
  protected readonly lng = computed(() => format(this.position()?.lng ?? this.random().lng, 3));

  constructor() {
    // Con "riduci animazioni" i numeri cambiano più piano (un lampeggio velocissimo dà fastidio).
    const slow = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const spin = () => this.random.set({ lat: Math.random() * 180 - 90, lng: Math.random() * 360 - 180 });
    spin();
    const timer = setInterval(() => { if (!this.position()) spin(); }, slow ? 400 : 45);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}

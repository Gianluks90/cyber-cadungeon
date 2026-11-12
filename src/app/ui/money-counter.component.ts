import { ChangeDetectionStrategy, Component, effect, input, signal, untracked } from '@angular/core';
import { money } from '../game/money';

/** Durata dell'animazione dei numeri, in millisecondi: rapida, per accompagnare un acquisto senza farlo aspettare. */
const DURATION = 350;

/**
 * Un importo in E$ che, quando cambia, scorre in fretta verso il nuovo valore (con la riduzione del movimento salta subito).
 * Il colore lo decide chi lo usa; i numeri hanno cifre di larghezza fissa perché la scritta non tremi.
 */
@Component({
  selector: 'app-money-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ text() }}`,
  styles: `:host { font-variant-numeric: tabular-nums; }`,
})
export class MoneyCounterComponent {
  readonly value = input.required<number>();
  protected readonly shown = signal<number | null>(null);
  protected readonly text = () => money(this.shown() ?? this.value());

  constructor() {
    effect((onCleanup) => {
      const to = this.value();
      const from = untracked(this.shown);
      if (from === null || from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.shown.set(to);
        return;
      }
      const start = performance.now();
      let raf = 0;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION);
        const eased = 1 - (1 - t) * (1 - t);
        this.shown.set(Math.round(from + (to - from) * eased));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      onCleanup(() => cancelAnimationFrame(raf));
    });
  }
}

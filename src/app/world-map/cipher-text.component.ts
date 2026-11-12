import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';

/** I caratteri con cui si "cifra" un testo: blocchi, simboli e cifre esadecimali. */
const GLYPHS = Array.from('█▓▒░#@%&*+=<>/\\|[]{}$§¤¦≈∑∆Ω∞¿?!~^0123456789ABCDEF');

/** Un'estrazione: tutti i caratteri nuovi (spazi esclusi) se non c'è `previous`, altrimenti ne cambia solo qualcuno, così il testo scintilla senza diventare rumore. */
function roll(chars: readonly string[], previous: readonly string[] | null): string[] {
  return chars.map((ch, i) => (/\s/.test(ch) ? ch : previous && Math.random() > 0.15 ? previous[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]));
}

/**
 * Un testo che non si può ancora leggere: al suo posto una serie di caratteri e simboli casuali, come se fosse cifrato, con qualche carattere che cambia di continuo.
 * Ha la stessa lunghezza e gli stessi spazi del testo vero, ma il testo vero non finisce mai nella pagina (solo la sua forma). Con «riduci le animazioni» resta fermo.
 */
@Component({
  selector: 'app-cipher-text',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="cipher" role="img" [attr.aria-label]="'contract.encrypted' | t">{{ shown().join('') }}</span>`,
  styles: `
    :host { display: block; }
    .cipher { display: block; font: 13px/1.5 var(--font-mono); letter-spacing: 0.04em; white-space: pre-wrap; overflow-wrap: anywhere; color: color-mix(in srgb, var(--c-interact) 55%, var(--c-text-dim)); user-select: none; }
  `,
})
export class CipherTextComponent {
  /** Il testo da cifrare: se ne usa solo la forma (lunghezza e spazi). */
  readonly text = input('');
  protected readonly shown = signal<string[]>([]);

  constructor() {
    effect((onCleanup) => {
      const chars = Array.from(this.text());
      this.shown.set(roll(chars, null));
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const timer = setInterval(() => this.shown.update((s) => roll(chars, s)), 90);
      onCleanup(() => clearInterval(timer));
    });
  }
}

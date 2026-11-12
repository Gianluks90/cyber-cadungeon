import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';

/** I caratteri con cui si "cifra" un testo: blocchi, simboli e cifre esadecimali. */
const GLYPHS = Array.from('█▓▒░#@%&*+=<>/\\|[]{}$§¤¦≈∑∆Ω∞¿?!~^0123456789ABCDEF');
const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
/** Ogni quanto cambia il testo cifrato (ms) e quanta parte dei caratteri cambia a ogni giro. */
const TICK_MS = 90;
const REVOLVE = 0.15;
/** Durante la decifratura il ritmo è più serrato. */
const REVEAL_TICK_MS = 60;

/**
 * Un testo che non si può ancora leggere: al suo posto una serie di caratteri e simboli casuali, come se fosse cifrato, con qualche carattere che cambia di continuo
 * (stessa lunghezza e stessi spazi del testo vero, e lo stesso carattere tipografico e colore: usato per la didascalia e per il titolo). Quando `unlocked` diventa vero **mentre lo si guarda** il testo vero compare un poco alla volta, carattere per carattere in
 * ordine sparso, come se si decifrasse. Se è già sbloccato all'inizio (o con «riduci le animazioni») si legge subito, senza effetto.
 * Mentre è cifrato il testo vero non sta nella pagina (solo la sua forma).
 */
@Component({
  selector: 'app-cipher-text',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="text" [class.plain]="plain()" [attr.role]="plain() ? null : 'img'" [attr.aria-label]="plain() ? null : ('contract.encrypted' | t)">{{ shown().join('') }}</span>`,
  styles: `
    /* Niente font né colore propri: il testo cifrato ha lo stesso aspetto del testo finale (li decide chi usa il componente), così alla decifratura non cambia niente tranne i caratteri. */
    :host { display: block; }
    .text { display: block; white-space: pre-wrap; overflow-wrap: anywhere; }
    .text:not(.plain) { user-select: none; }
  `,
})
export class CipherTextComponent {
  /** Il testo vero: finché è cifrato se ne usa solo la forma (lunghezza e spazi). */
  readonly text = input('');
  /** Se il testo si può leggere. */
  readonly unlocked = input(false);
  /** Di chi è il testo (l'id del contratto): due contratti con lo stesso testo non sono lo stesso testo che si sblocca. */
  readonly owner = input<string | null>(null);
  protected readonly shown = signal<string[]>([]);
  /** Il testo vero è completamente visibile (anche dopo la decifratura). */
  protected readonly plain = signal(false);

  /** Per riconoscere il passaggio da cifrato a leggibile sullo stesso testo. */
  private lastText: string | null = null;
  private lastOwner: string | null = null;
  private lastUnlocked = false;

  constructor() {
    effect((onCleanup) => {
      const text = this.text();
      const unlocked = this.unlocked();
      const chars = Array.from(text);
      const owner = this.owner();
      const decrypting = unlocked && this.lastText === text && this.lastOwner === owner && !this.lastUnlocked; // era cifrato e adesso si sblocca, davanti agli occhi
      this.lastText = text;
      this.lastOwner = owner;
      this.lastUnlocked = unlocked;
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (unlocked && (!decrypting || still)) {
        this.shown.set(chars);
        this.plain.set(true);
        return;
      }
      this.plain.set(false);
      this.shown.set(chars.map((ch) => (/\s/.test(ch) ? ch : randomGlyph())));
      if (still) return;

      if (!decrypting) {
        // Cifrato: qualche carattere cambia a ogni giro.
        const timer = setInterval(() => this.shown.update((s) => s.map((ch, i) => (/\s/.test(chars[i]) || Math.random() > REVOLVE ? ch : randomGlyph()))), TICK_MS);
        onCleanup(() => clearInterval(timer));
        return;
      }

      // Decifratura: i caratteri veri compaiono in ordine sparso, gli altri continuano a cambiare; alla fine il testo diventa normale.
      const order = chars.map((_, i) => i).filter((i) => !/\s/.test(chars[i]));
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      const ticks = Math.max(8, Math.round(Math.min(2200, 500 + order.length * 18) / REVEAL_TICK_MS));
      const perTick = Math.ceil(order.length / ticks);
      const revealed = new Set<number>();
      const timer = setInterval(() => {
        for (const i of order.splice(0, perTick)) revealed.add(i);
        if (!order.length) {
          clearInterval(timer);
          this.shown.set(chars);
          this.plain.set(true);
          return;
        }
        this.shown.set(chars.map((ch, i) => (/\s/.test(ch) || revealed.has(i) ? ch : randomGlyph())));
      }, REVEAL_TICK_MS);
      onCleanup(() => clearInterval(timer));
    });
  }
}

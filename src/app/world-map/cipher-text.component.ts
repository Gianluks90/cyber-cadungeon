import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, afterRenderEffect, effect, inject, input, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';

/**
 * I caratteri con cui si "cifra" un testo: simboli, cifre e lettere maiuscole e minuscole, tutti ASCII o Latin-1, cioè presenti in qualunque carattere tipografico dell'interfaccia
 * (simboli rari finiscono in un altro font e fanno crescere o spostare la riga, e il testo ballerebbe). Si estrae prima il genere (più simboli che altro), poi il carattere.
 */
const SYMBOLS = Array.from('!#$%&*+-/:;<=>?@[\\]^_{|}~§¤¦¿¬±¶×÷');
const DIGITS = Array.from('0123456789');
const LETTERS = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
const pick = (list: readonly string[]) => list[Math.floor(Math.random() * list.length)];
const randomGlyph = () => {
  const kind = Math.random();
  return kind < 0.45 ? pick(SYMBOLS) : kind < 0.65 ? pick(DIGITS) : pick(LETTERS);
};
/** Ogni quanto cambia il testo cifrato (ms) e quanta parte dei caratteri cambia a ogni giro. */
const TICK_MS = 130;
const REVOLVE = 0.15;
/** Durante la decifratura il ritmo è un po' più serrato. */
const REVEAL_TICK_MS = 85;

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
  template: `<span #t class="text" [class.plain]="plain()" [attr.role]="plain() ? null : 'img'" [attr.aria-label]="plain() ? null : ('contract.encrypted' | t)">{{ shown().join('') }}</span>`,
  styles: `
    /* Niente font né colore propri: il testo cifrato ha lo stesso aspetto del testo finale (li decide chi usa il componente), così alla decifratura non cambia niente tranne i caratteri. */
    :host { display: block; }
    .text { display: block; white-space: pre-wrap; overflow-wrap: anywhere; }
    /* Finché è cifrato ha l'altezza del testo vero (la imposta il metodo measure) e ciò che la supera si taglia: i simboli hanno larghezze diverse dalle lettere e andrebbero a capo in punti diversi, facendo ballare il pannello. */
    .text:not(.plain) { user-select: none; overflow: hidden; }
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

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly textEl = viewChild<ElementRef<HTMLElement>>('t');

  /**
   * Fissa l'altezza del testo cifrato a quella che avrà il testo vero alla larghezza di adesso: si misura una copia del testo vero messa un attimo fuori vista e subito tolta.
   * Decifrato, l'altezza torna libera (è la stessa, quindi non si sposta niente).
   */
  private measure(): void {
    const el = this.textEl()?.nativeElement;
    if (!el) return;
    if (this.plain()) {
      el.style.height = '';
      return;
    }
    const probe = el.cloneNode(false) as HTMLElement;
    probe.removeAttribute('role');
    probe.removeAttribute('aria-label');
    probe.setAttribute('aria-hidden', 'true');
    probe.textContent = this.text();
    probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;height:auto;width:${el.clientWidth}px`;
    this.host.nativeElement.appendChild(probe);
    const height = probe.getBoundingClientRect().height;
    probe.remove();
    el.style.height = height ? `${height}px` : '';
  }

  /** Per riconoscere il passaggio da cifrato a leggibile sullo stesso testo. */
  private lastText: string | null = null;
  private lastOwner: string | null = null;
  private lastUnlocked = false;

  constructor() {
    // Dopo ogni disegno in cui cambia il testo (o la decifratura finisce) si rimisura l'altezza; se cambia la larghezza (telefono girato, pannello ridimensionato) si rimisura.
    afterRenderEffect(() => {
      this.text();
      this.plain();
      this.measure();
    });
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      let width = this.host.nativeElement.clientWidth;
      const observer = new ResizeObserver(() => {
        const now = this.host.nativeElement.clientWidth;
        if (now === width) return;
        width = now;
        this.measure();
      });
      observer.observe(this.host.nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });

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

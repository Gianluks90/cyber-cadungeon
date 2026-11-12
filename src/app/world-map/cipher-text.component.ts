import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, afterRenderEffect, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
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

/**
 * Un testo che non si può ancora leggere: al suo posto una serie di caratteri e simboli casuali, come se fosse cifrato, con qualche carattere che cambia di continuo
 * (stessa lunghezza e stessi spazi del testo vero, e lo stesso carattere tipografico; blu finché è cifrato, e ogni carattere che si fissa diventa bianco: usato per la didascalia e per
 * il titolo). La decifratura non ha un tempo suo: la guida `reveal` (0-1, dato da chi lo usa, per esempio la barra di una procedura di sblocco): a `reveal` il testo vero compare per
 * quella parte dei caratteri, in ordine sparso, e gli altri continuano a cambiare. Se `reveal` torna null o scende, i caratteri tornano cifrati. Se `unlocked` è vero il testo si legge
 * subito, intero (anche riaprendo un contratto già sbloccato).
 * Mentre è cifrato il testo vero non sta nella pagina, se non per la parte già rivelata.
 */
@Component({
  selector: 'app-cipher-text',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span #t class="text" [class.plain]="plain()" [attr.role]="plain() ? null : 'img'" [attr.aria-label]="plain() ? null : ('contract.encrypted' | t)">@for (ch of shown(); track $index) {<span [class.fixed]="fixed()[$index]">{{ ch }}</span>}</span>`,
  styles: `
    /* Il carattere tipografico è quello del testo finale (lo decide chi usa il componente). Cifrato è blu (l'accento dell'interfaccia stemperato); ogni carattere che si fissa durante la decifratura diventa bianco (il colore del testo), e a fine decifratura lo è tutto. */
    :host { display: block; }
    .text { display: block; white-space: pre-wrap; overflow-wrap: anywhere; color: color-mix(in srgb, var(--c-interact) 55%, var(--c-text-dim)); }
    .text .fixed, .text.plain { color: var(--c-text); }
    /* Finché è cifrato ha l'altezza del testo vero (la imposta il metodo measure) e ciò che la supera si taglia: i simboli hanno larghezze diverse dalle lettere e andrebbero a capo in punti diversi, facendo ballare il pannello. */
    .text:not(.plain) { user-select: none; overflow: hidden; }
  `,
})
export class CipherTextComponent {
  /** Il testo vero: finché è cifrato se ne usa solo la forma (lunghezza e spazi) più la parte già rivelata. */
  readonly text = input('');
  /** Se il testo si può leggere. */
  readonly unlocked = input(false);
  /** Di chi è il testo (l'id del contratto): due contratti con lo stesso testo hanno un ordine di decifratura diverso. */
  readonly owner = input<string | null>(null);
  /** Quanto del testo è decifrato (0-1) o null se non si sta decifrando. */
  readonly reveal = input<number | null>(null);
  protected readonly shown = signal<string[]>([]);
  /** Il testo vero è completamente visibile. */
  protected readonly plain = signal(false);
  /** Quali caratteri sono già fissati (veri e bianchi). */
  protected readonly fixed = signal<boolean[]>([]);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly textEl = viewChild<ElementRef<HTMLElement>>('t');
  private chars: string[] = [];
  /** L'ordine sparso (indici dei caratteri non spazio) in cui compaiono quelli veri. */
  private order: number[] = [];
  private fixedSet = new Set<number>();

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

  /** Fissa la parte `r` (0-1) dei caratteri, nell'ordine sparso; quelli che non lo sono più tornano casuali. */
  private applyReveal(r: number | null): void {
    const count = r === null ? 0 : Math.min(this.order.length, Math.max(0, Math.floor(r * this.order.length)));
    const before = this.fixed();
    this.fixedSet = new Set(this.order.slice(0, count));
    const now = this.chars.map((_, i) => this.fixedSet.has(i));
    this.fixed.set(now);
    this.shown.update((s) => s.map((ch, i) => (now[i] ? this.chars[i] : before[i] ? randomGlyph() : ch)));
  }

  constructor() {
    // Dopo ogni disegno in cui cambia il testo (o diventa leggibile) si rimisura l'altezza; se cambia la larghezza (telefono girato, pannello ridimensionato) si rimisura.
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

    // La forma del testo: se è sbloccato si legge intero, altrimenti è cifrato e qualche carattere cambia a ogni giro.
    effect((onCleanup) => {
      const text = this.text();
      const unlocked = this.unlocked();
      this.owner();
      this.chars = Array.from(text);
      this.order = this.chars.map((_, i) => i).filter((i) => !/\s/.test(this.chars[i]));
      for (let i = this.order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.order[i], this.order[j]] = [this.order[j], this.order[i]];
      }
      this.fixedSet = new Set();
      this.fixed.set([]);
      if (unlocked) {
        this.shown.set(this.chars);
        this.plain.set(true);
        return;
      }
      this.plain.set(false);
      this.shown.set(this.chars.map((ch) => (/\s/.test(ch) ? ch : randomGlyph())));
      untracked(() => this.applyReveal(this.reveal())); // se il pannello si apre a decifratura già iniziata
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const chars = this.chars;
      const timer = setInterval(() => this.shown.update((s) => s.map((ch, i) => (/\s/.test(chars[i]) || this.fixedSet.has(i) || Math.random() > REVOLVE ? ch : randomGlyph()))), TICK_MS);
      onCleanup(() => clearInterval(timer));
    });

    // La decifratura: segue `reveal`.
    effect(() => {
      const r = this.reveal();
      untracked(() => {
        if (!this.plain()) this.applyReveal(r);
      });
    });
  }
}

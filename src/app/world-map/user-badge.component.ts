import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { IconComponent } from '../ui/icon.component';

/**
 * Il riquadro di chi è dentro, in alto accanto al tasto del menu: un rettangolo alto come il tasto con un quadrato a tutta altezza (la foto del giocatore, o una sagoma se non c'è) e il nome (in maiuscolo), con un contatore a destra.
 * Non sa da dove vengono foto e nome: li riceve già scelti.
 */
@Component({
  selector: 'app-user-badge',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar" role="group" [attr.aria-label]="label()">
      <span class="avatar" [class.photo]="showPhoto()">
        @if (showPhoto()) {
          <!-- Le foto di Google a volte rifiutano la richiesta se arriva con l'indirizzo della pagina: senza referrer si caricano sempre. -->
          <img [src]="photoURL()" alt="" referrerpolicy="no-referrer" (error)="failed.set(photoURL())" />
        } @else {
          <app-icon name="person" [size]="18" />
        }
      </span>
      <span class="name">{{ name() }}</span>
      <!-- Il contatore, a destra: per ora non conta niente (resta a 0), il significato verrà dopo. -->
      <span class="count" aria-hidden="true">{{ count() }}<app-icon name="deployed_code" [size]="18" /></span>
    </div>
  `,
  styles: `
    /* A sinistra del tasto del menu (10px dal bordo + 36px di tasto + 10px di spazio), largo quanto la colonna dei riquadri meno il tasto e lo spazio. */
    :host { position: absolute; top: var(--hud-edge); right: calc(var(--hud-edge) + var(--hud-btn) + var(--hud-gap)); z-index: 2; }
    .bar { box-sizing: border-box; width: calc(var(--side-panel-w) - var(--hud-btn) - var(--hud-gap)); height: var(--hud-btn); display: flex; align-items: stretch; gap: 10px; padding: 0 12px 0 0; overflow: hidden; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); background: var(--c-surface); color: var(--c-text); }
    /* Il quadrato dell'immagine occupa tutta l'altezza del riquadro, senza margini, con un filetto sul lato del nome. Una foto si desatura e si tinge dell'azzurro dell'interfaccia (lo strato colorato fonde solo il tono, la luminosità resta quella della foto). */
    .avatar { position: relative; isolation: isolate; flex: none; aspect-ratio: 1; display: inline-flex; align-items: center; justify-content: center; overflow: hidden; border-right: 1px solid var(--c-line-strong); background: var(--c-bg); color: var(--c-text-dim); }
    .avatar img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.05); }
    .avatar.photo::after { content: ''; position: absolute; inset: 0; background: var(--c-interact); mix-blend-mode: color; opacity: 0.75; pointer-events: none; }
    .name { align-self: center; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 600 12px/1 var(--font-ui); letter-spacing: 0.08em; text-transform: uppercase; }
    /* Il numero e il cubo in azzurro, con un leggero alone. */
    .count { flex: none; align-self: center; margin-left: auto; display: inline-flex; align-items: center; gap: 5px; color: var(--c-interact); font: 600 12px/1 var(--font-ui); font-variant-numeric: tabular-nums; text-shadow: 0 0 6px color-mix(in srgb, var(--c-interact) 60%, transparent); }
    .count app-icon { filter: drop-shadow(0 0 4px color-mix(in srgb, var(--c-interact) 70%, transparent)); }
    /* Su telefono accanto al logo c'è poco posto: il riquadro si stringe al nome (con un tetto). */
    @media (max-width: 640px) { .bar { width: auto; max-width: 150px; } }
  `,
})
export class UserBadgeComponent {
  readonly name = input.required<string>();
  /** Il nome del riquadro per chi usa un lettore di schermo (per esempio «Giocatore»). */
  readonly label = input('');
  /** Il contatore a destra del nome. Per ora nessuno lo imposta: resta a 0. */
  readonly count = input(0);
  /** L'indirizzo dell'immagine, o `null` se non c'è. */
  readonly photoURL = input<string | null>(null);
  /** L'ultimo indirizzo che non si è riusciti a caricare: se cambia, si riprova. */
  protected readonly failed = signal<string | null>(null);
  protected readonly showPhoto = computed(() => !!this.photoURL() && this.failed() !== this.photoURL());
}

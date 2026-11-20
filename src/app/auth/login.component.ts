import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../i18n/translate.pipe';
import { DialogComponent } from '../ui/dialog.component';
import { FieldComponent } from '../ui/field.component';
import { IconComponent } from '../ui/icon.component';
import { AuthService } from './auth.service';

/** La pagina di accesso (`/login`): utente e password in una dialog. Per ora il login è finto (utente `test`, password `test`). */
@Component({
  selector: 'app-login',
  host: { '[style.--login-bg-image]': 'bgImage', '[style.--login-logo-image]': 'logoImage' },
  imports: [DialogComponent, FieldComponent, IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Il logo grande (usato come maschera: prende il colore del testo) e il sottotitolo, al centro della pagina. -->
    <div class="brand">
      <div class="brand-mark" role="img" [attr.aria-label]="'worldMap.logo' | t"></div>
      <p class="tagline">{{ 'login.tagline' | t }}</p>
    </div>
    <!-- In basso: l'avviso sulla posizione e il tasto che apre la finestra di accesso (anche con Invio); la finestra si può chiudere. -->
    <div class="bottom">
      <p class="warning" role="note"><app-icon name="warning" [size]="16" /> {{ 'login.locationWarning' | t }}</p>
      <button type="button" class="enter dlg-btn primary" (click)="open.set(true)"><app-icon name="login" [size]="16" /> {{ 'login.title' | t }}</button>
    </div>
    @if (open()) {
      <app-dialog [title]="'login.title' | t" width="360px" (closed)="open.set(false)">
        <form id="login-form" (submit)="submit($event, user.value, password.value)">
          <app-field [label]="'login.user' | t">
            <input #user type="text" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" [class.bad]="failed()" (input)="failed.set(false)" />
          </app-field>
          <app-field [label]="'login.password' | t" [error]="failed() ? ('login.error' | t) : ''">
            <input #password type="password" name="password" autocomplete="current-password" [class.bad]="failed()" (input)="failed.set(false)" />
          </app-field>
        </form>
        <button dialogFooter type="submit" form="login-form" class="dlg-btn primary" [class.off]="busy()" [disabled]="busy()">
          <app-icon name="login" [size]="16" /> {{ 'login.submit' | t }}
        </button>
      </app-dialog>
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative; /* il logo si posiziona rispetto alla pagina */
      height: 100%;
      background: var(--c-bg) var(--login-bg-image) center / cover no-repeat;
    }
    /* Il velo scuro sopra la foto: più fitto al centro (dove stanno logo e sottotitolo) e in basso (dove sta il tasto), perché i testi si leggano su qualunque punto dell'immagine. */
    :host::before { content: ''; position: absolute; inset: 0; pointer-events: none; background:
      radial-gradient(ellipse 70% 42% at 50% 50%, color-mix(in srgb, var(--c-bg) 88%, transparent) 0%, color-mix(in srgb, var(--c-bg) 55%, transparent) 55%, transparent 100%),
      linear-gradient(to top, color-mix(in srgb, var(--c-bg) 80%, transparent) 0%, transparent 28%); }
    /* Logo e sottotitolo: al centro della pagina. Quando la finestra di accesso è aperta stanno sotto il suo sfondo scuro; non prendono i clic. */
    .brand { position: absolute; z-index: 1; left: 50%; top: 50%; width: min(840px, 90vw); transform: translate(-50%, -56%); display: flex; flex-direction: column; align-items: center; gap: 24px; pointer-events: none; }
    /* In basso al centro: l'avviso sulla posizione sopra il tasto «Accedi». */
    .bottom { position: absolute; z-index: 1; left: 50%; bottom: calc(32px + env(safe-area-inset-bottom)); transform: translateX(-50%); width: min(560px, 92vw); display: flex; flex-direction: column; align-items: center; gap: 14px; }
    /* L'avviso: giallo come gli altri avvisi dell'app, su una lastra scura sfocata come il sottotitolo. */
    .warning { display: flex; align-items: center; gap: 8px; margin: 0; padding: 8px 14px; text-align: left; color: var(--c-warn); font: 600 12px/1.4 var(--font-ui); background: color-mix(in srgb, var(--c-bg) 60%, transparent); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); border: 1px solid color-mix(in srgb, var(--c-warn) 45%, transparent); border-radius: var(--radius-1); }
    .warning app-icon { flex: none; }
    /* Il tasto «Accedi»: alto come gli altri tasti dell'interfaccia (36px). */
    .enter { height: var(--hud-btn); padding: 0 28px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; background: color-mix(in srgb, var(--c-bg) 85%, transparent); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); box-shadow: 0 0 16px color-mix(in srgb, var(--c-interact) 40%, transparent); }
    .brand-mark { width: 100%; aspect-ratio: 1304 / 193; background-color: var(--c-text); -webkit-mask: var(--login-logo-image) center / contain no-repeat; mask: var(--login-logo-image) center / contain no-repeat; filter: drop-shadow(0 3px 10px rgba(0, 0, 0, 0.85)) drop-shadow(0 0 18px color-mix(in srgb, var(--c-interact) 45%, transparent)); }
    /* Il sottotitolo (su due righe a schermo largo, bilanciate, largo meno del logo perché non lo pareggi in peso) su una lastra scura sfocata, con un filo azzurro e l'angolo in alto a destra e in basso a sinistra smussato (come i riquadri dell'app); le ombre scure attorno alle lettere le staccano dallo sfondo. */
    .tagline { box-sizing: border-box; width: min(100%, 700px); margin: 0; padding: 14px 28px; text-align: center; text-wrap: balance; color: var(--c-interact); font: 700 13px/1.6 var(--font-display); letter-spacing: 0.1em; text-transform: uppercase; background: color-mix(in srgb, var(--c-bg) 60%, transparent); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); border: 1px solid color-mix(in srgb, var(--c-interact) 32%, transparent); border-radius: 0 var(--radius-2) 0 var(--radius-2); text-shadow: 0 1px 2px var(--c-bg), 0 0 8px rgba(0, 0, 0, 0.9), 0 0 14px color-mix(in srgb, var(--c-interact) 55%, transparent); }
    form { display: flex; flex-direction: column; gap: 12px; }
    .dlg-btn { display: inline-flex; align-items: center; gap: 6px; }
  `,
})
export class LoginComponent {
  /** Relativo al base href: in produzione l'app sta sotto `/cyber-cadungeon/`, un `/images/…` assoluto darebbe 404. */
  protected readonly logoImage = `url("${new URL('logo/logo.svg', document.baseURI).href}")`;
  protected readonly bgImage = `url("${new URL('images/login-backgroun.png', document.baseURI).href}")`;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);
  /** La finestra con utente e password è aperta (si apre dal tasto in basso o con Invio). */
  protected readonly open = signal(false);

  /** Invio apre la finestra di accesso; con la finestra aperta, Invio invia il modulo come sempre. */
  @HostListener('document:keydown.enter')
  protected openOnEnter(): void {
    if (!this.open()) this.open.set(true);
  }

  protected async submit(event: Event, name: string, password: string): Promise<void> {
    event.preventDefault();
    this.busy.set(true);
    const ok = await this.auth.login(name, password);
    this.busy.set(false);
    if (ok) void this.router.navigateByUrl('/');
    else this.failed.set(true);
  }
}

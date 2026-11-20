import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../i18n/translate.pipe';
import { DialogComponent } from '../ui/dialog.component';
import { FieldComponent } from '../ui/field.component';
import { IconComponent } from '../ui/icon.component';
import type { MessageKey } from '../i18n/i18n.service';
import { ProfileService } from '../profile/profile.service';
import { AuthService, type AuthError, type AuthResult } from './auth.service';

/** Il testo da mostrare per ogni errore (`cancelled` non ne ha: chi chiude la finestra di Google non ha sbagliato niente). */
const ERROR_KEYS: Record<Exclude<AuthError, 'cancelled'>, MessageKey> = {
  missing: 'login.error.missing',
  credentials: 'login.error.credentials',
  'email-in-use': 'login.error.emailInUse',
  'weak-password': 'login.error.weakPassword',
  'invalid-email': 'login.error.invalidEmail',
  'too-many': 'login.error.tooMany',
  network: 'login.error.network',
  'popup-blocked': 'login.error.popupBlocked',
  unknown: 'login.error.unknown',
};

/** La pagina di accesso (`/login`): email e password (o Google) in una dialog, con la scelta tra accedere e creare un account. */
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
    <!-- In basso: il tasto che apre la finestra di accesso (anche con Invio; la finestra si può chiudere) e, sotto, l'avviso sulla posizione. -->
    <div class="bottom">
      <button type="button" class="enter dlg-btn primary" (click)="open.set(true)"><app-icon name="login" [size]="16" /> {{ 'login.title' | t }}</button>
      <p class="warning" role="note"><app-icon name="warning" [size]="16" /> {{ 'login.locationWarning' | t }}</p>
    </div>
    @if (open()) {
      <app-dialog [title]="(mode() === 'login' ? 'login.title' : 'login.registerTitle') | t" width="360px" (closed)="open.set(false)">
        <form id="login-form" (submit)="submit($event, email.value, password.value)">
          @if (mode() === 'register') {
            <app-field [label]="'login.nickname' | t">
              <input #nick type="text" name="nickname" maxlength="24" autocomplete="nickname" spellcheck="false" [class.bad]="!!errorKey()" (input)="nickname.set(nick.value); errorKey.set(null)" />
            </app-field>
          }
          <app-field [label]="'login.email' | t">
            <input #email type="email" name="email" autocomplete="email" autocapitalize="none" spellcheck="false" [class.bad]="!!errorKey()" (input)="errorKey.set(null); sent.set(false)" />
          </app-field>
          <app-field [label]="'login.password' | t">
            <input #password type="password" name="password" [attr.autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'" [class.bad]="!!errorKey()" (input)="errorKey.set(null)" />
          </app-field>
          @if (errorKey(); as key) { <p class="err" role="alert">{{ key | t }}</p> }
          @if (sent()) { <p class="ok" role="status">{{ 'login.resetSent' | t }}</p> }
          @if (mode() === 'login') { <button type="button" class="switch forgot" [disabled]="busy()" (click)="forgot(email.value)">{{ 'login.forgot' | t }}</button> }
        </form>
        <div class="alt">
          <span class="or">{{ 'login.or' | t }}</span>
          <button type="button" class="dlg-btn google" [class.off]="busy()" [disabled]="busy()" (click)="google()">{{ 'login.google' | t }}</button>
          <button type="button" class="switch" (click)="switchMode()">{{ (mode() === 'login' ? 'login.toRegister' : 'login.toLogin') | t }}</button>
        </div>
        <button dialogFooter type="submit" form="login-form" class="dlg-btn primary" [class.off]="busy()" [disabled]="busy()">
          <app-icon name="login" [size]="16" /> {{ (mode() === 'login' ? 'login.submit' : 'login.registerSubmit') | t }}
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
    /* In basso al centro: il tasto «Accedi» e, sotto, l'avviso sulla posizione. */
    .bottom { position: absolute; z-index: 1; left: 50%; bottom: calc(32px + env(safe-area-inset-bottom)); transform: translateX(-50%); width: min(560px, 92vw); display: flex; flex-direction: column; align-items: center; gap: 14px; }
    /* L'avviso: giallo come gli altri avvisi dell'app, su una lastra scura sfocata come il sottotitolo. */
    .warning { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0; padding: 8px 14px; text-align: center; color: var(--c-warn); font: 600 12px/1.4 var(--font-ui); background: color-mix(in srgb, var(--c-bg) 60%, transparent); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); border: 1px solid color-mix(in srgb, var(--c-warn) 45%, transparent); border-radius: var(--radius-1); }
    .warning app-icon { flex: none; }
    /* Il tasto «Accedi»: alto come gli altri tasti dell'interfaccia (36px). */
    .enter { height: var(--hud-btn); padding: 0 28px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; background: color-mix(in srgb, var(--c-bg) 85%, transparent); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); box-shadow: 0 0 16px color-mix(in srgb, var(--c-interact) 40%, transparent); }
    .brand-mark { width: 100%; aspect-ratio: 1304 / 193; background-color: var(--c-text); -webkit-mask: var(--login-logo-image) center / contain no-repeat; mask: var(--login-logo-image) center / contain no-repeat; filter: drop-shadow(0 3px 10px rgba(0, 0, 0, 0.85)) drop-shadow(0 0 18px color-mix(in srgb, var(--c-interact) 45%, transparent)); }
    /* Il sottotitolo (su due righe a schermo largo, bilanciate, largo meno del logo perché non lo pareggi in peso) su una lastra scura sfocata, con un filo azzurro e l'angolo in alto a destra e in basso a sinistra smussato (come i riquadri dell'app); le ombre scure attorno alle lettere le staccano dallo sfondo. */
    .tagline { box-sizing: border-box; width: min(100%, 700px); margin: 0; padding: 14px 28px; text-align: center; text-wrap: balance; color: var(--c-interact); font: 700 13px/1.6 var(--font-display); letter-spacing: 0.1em; text-transform: uppercase; background: color-mix(in srgb, var(--c-bg) 60%, transparent); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); border: 1px solid color-mix(in srgb, var(--c-interact) 32%, transparent); border-radius: 0 var(--radius-2) 0 var(--radius-2); text-shadow: 0 1px 2px var(--c-bg), 0 0 8px rgba(0, 0, 0, 0.9), 0 0 14px color-mix(in srgb, var(--c-interact) 55%, transparent); }
    form { display: flex; flex-direction: column; gap: 12px; }
    .ok { margin: 0; color: var(--c-interact); font-size: 12px; }
    .forgot { align-self: flex-start; padding: 0; }
    .err { margin: 0; color: var(--c-danger); font-size: 12px; }
    .alt { display: flex; flex-direction: column; align-items: stretch; gap: 10px; margin-top: 16px; }
    .or { align-self: center; color: var(--c-text-dim); font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; }
    .google { justify-content: center; }
    .switch { align-self: center; padding: 4px; background: none; border: 0; color: var(--c-interact); font: 600 12px/1.4 var(--font-ui); cursor: pointer; }
    .switch:hover { text-decoration: underline; }
    .dlg-btn { display: inline-flex; align-items: center; gap: 6px; }
  `,
})
export class LoginComponent {
  /** Relativo al base href: in produzione l'app sta sotto `/cyber-cadungeon/`, un `/images/…` assoluto darebbe 404. */
  protected readonly logoImage = `url("${new URL('logo/logo.svg', document.baseURI).href}")`;
  protected readonly bgImage = `url("${new URL('images/login-backgroun.png', document.baseURI).href}")`;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly profile = inject(ProfileService);
  /** Il nickname scritto nella registrazione (chi entra con Google non lo sceglie qui). */
  protected readonly nickname = signal('');
  /** Il motivo dell'ultimo errore (la chiave del testo), se c'è. */
  protected readonly errorKey = signal<MessageKey | null>(null);
  /** L'email per reimpostare la password è partita. */
  protected readonly sent = signal(false);
  protected readonly busy = signal(false);
  /** La finestra con email e password è aperta (si apre dal tasto in basso o con Invio). */
  protected readonly open = signal(false);
  /** «Accedi» o «Crea account»: la stessa finestra, con testi diversi. */
  protected readonly mode = signal<'login' | 'register'>('login');

  /** Invio apre la finestra di accesso; con la finestra aperta, Invio invia il modulo come sempre. */
  @HostListener('document:keydown.enter')
  protected openOnEnter(): void {
    if (!this.open()) this.open.set(true);
  }

  protected switchMode(): void {
    this.mode.update((m) => (m === 'login' ? 'register' : 'login'));
    this.errorKey.set(null);
    this.sent.set(false);
  }

  /** «Password dimenticata»: manda il link per reimpostarla all'email già scritta nel campo. */
  protected async forgot(email: string): Promise<void> {
    this.busy.set(true);
    this.errorKey.set(null);
    this.sent.set(false);
    const error = await this.auth.resetPassword(email);
    this.busy.set(false);
    if (error === null) this.sent.set(true);
    else this.errorKey.set(ERROR_KEYS[error === 'cancelled' ? 'unknown' : error]);
  }

  protected async submit(event: Event, email: string, password: string): Promise<void> {
    event.preventDefault();
    if (this.mode() === 'login') return this.enter(this.auth.login(email, password));
    const nick = this.nickname().trim();
    if (!nick) {
      this.errorKey.set('login.error.nickname');
      return;
    }
    await this.enter(this.auth.register(email, password), nick);
  }

  protected google(): Promise<void> {
    return this.enter(this.auth.loginWithGoogle());
  }

  private async enter(attempt: Promise<AuthResult>, nickname?: string): Promise<void> {
    this.busy.set(true);
    this.errorKey.set(null);
    const result = await attempt;
    this.busy.set(false);
    if ('user' in result) {
      if (nickname) void this.profile.saveProfile({ nickname }); // senza aspettare la rete: si entra subito
      void this.router.navigateByUrl('/');
    }
    else if (result.error !== 'cancelled') this.errorKey.set(ERROR_KEYS[result.error]);
  }
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../i18n/translate.pipe';
import { DialogComponent } from '../ui/dialog.component';
import { FieldComponent } from '../ui/field.component';
import { IconComponent } from '../ui/icon.component';
import { AuthService } from './auth.service';

/** La pagina di accesso (`/login`): utente e password in una dialog. Per ora il login è finto (utente `test`, password `test`). */
@Component({
  selector: 'app-login',
  imports: [DialogComponent, FieldComponent, IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog [title]="'login.title' | t" [closable]="false" width="360px">
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
  `,
  styles: `
    :host { display: block; height: 100%; background: var(--c-bg); }
    form { display: flex; flex-direction: column; gap: 12px; }
    .dlg-btn { display: inline-flex; align-items: center; gap: 6px; }
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);

  protected async submit(event: Event, name: string, password: string): Promise<void> {
    event.preventDefault();
    this.busy.set(true);
    const ok = await this.auth.login(name, password);
    this.busy.set(false);
    if (ok) void this.router.navigateByUrl('/');
    else this.failed.set(true);
  }
}

import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { BrandLogoComponent } from './brand-logo.component';
import { IconComponent } from './icon.component';

/**
 * Il logo in alto a sinistra e la freccia in basso a sinistra delle pagine di preparazione (scelta degli eroi, sala d'attesa): il logo dell'app (`app-brand-logo`, porta alla home), che prima chiede conferma
 * ("Sei sicuro di voler annullare…": solo se si conferma esce `leave`) e la freccia (`back`, torna al passo prima). `ask()` apre la stessa conferma da fuori (per un tasto "indietro" che ha come passo precedente la home).
 */
@Component({
  selector: 'app-page-nav',
  imports: [BrandLogoComponent, ConfirmDialogComponent, IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="nav">
      <button type="button" class="home" [attr.aria-label]="'adventures.backHome' | t" [title]="'adventures.backHome' | t" (click)="ask()"><app-brand-logo /></button>
    </div>
    <button type="button" class="square back" [attr.aria-label]="'nav.back' | t" [title]="'nav.back' | t" (click)="back.emit()"><app-icon name="arrow_back" [size]="20" /></button>
    <app-confirm-dialog [open]="asking()" [title]="confirmTitle()" [text]="confirmText()" [confirmLabel]="confirmLabel()" (confirmed)="asking.set(false); leave.emit()" (cancel)="asking.set(false)" />
  `,
  styles: `
    :host { display: contents; }
    .nav { position: fixed; z-index: 3; top: calc(12px + env(safe-area-inset-top)); left: 12px; display: flex; gap: 8px; }
    /* La freccia indietro sta in basso a sinistra, lontana dal logo (forme diverse). */
    .back { position: fixed; z-index: 3; left: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); }
    .home { display: inline-flex; padding: 0; border: 0; background: none; color: var(--c-text); cursor: pointer; transition: color 0.15s; }
    .home:hover, .home:focus-visible { color: var(--c-interact); outline: none; }
    .home:hover app-brand-logo, .home:focus-visible app-brand-logo { border-color: var(--c-interact); }
    .square { display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; width: 36px; height: 36px; padding: 0; cursor: pointer; border-radius: var(--radius-1); background: var(--c-surface); color: var(--c-text); border: 1px solid var(--c-line-strong); transition: color 0.15s, border-color 0.15s; }
    @media (pointer: coarse) { .square { width: 44px; height: 44px; } .home { --logo-h: 44px; } }
    .square:hover, .square:focus-visible { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
  `,
})
export class PageNavComponent {
  readonly confirmTitle = input.required<string>();
  readonly confirmText = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly back = output<void>();
  /** Confermato: si esce dalla preparazione. */
  readonly leave = output<void>();
  protected readonly asking = signal(false);

  ask() {
    this.asking.set(true);
  }
}

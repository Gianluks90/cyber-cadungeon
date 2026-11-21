import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { HANGOUT_NICKNAME_MAX, HANGOUT_PHOTO_URL_MAX, type HangoutCustom } from '../game/hangout/hangout-store';
import { TranslatePipe } from '../i18n/translate.pipe';
import { CheckboxComponent } from './checkbox.component';
import { DialogComponent } from './dialog.component';
import { FieldComponent } from './field.component';

/**
 * «Personalizza il ritrovo» (la matita della pillola del ritrovo): soprannome, immagine e se il ritrovo è nascosto agli altri giocatori. Un campo di testo lasciato vuoto toglie la scelta.
 * Non sa dove si salva: riceve i valori di adesso e dice cosa è stato scelto.
 */
@Component({
  selector: 'app-hangout-dialog',
  imports: [TranslatePipe, DialogComponent, FieldComponent, CheckboxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <app-dialog [title]="'hangout.edit.title' | t" width="min(420px, 100%)" (closed)="cancel.emit()">
        <form id="hangout-form" (submit)="submit($event)">
          <app-field [label]="'hangout.edit.nickname' | t">
            <input type="text" name="nickname" [attr.maxlength]="nicknameMax" [placeholder]="placeholder()" spellcheck="false" [value]="nickname()" (input)="nickname.set($any($event.target).value)" />
          </app-field>
          <small class="dlg-hint">{{ 'hangout.edit.nicknameHint' | t }}</small>
          <app-field [label]="'hangout.edit.photo' | t" [error]="photoBad() ? ('profile.error.photo' | t) : ''">
            <input type="url" name="photo" [attr.maxlength]="photoMax" placeholder="https://" autocapitalize="none" spellcheck="false" [class.bad]="photoBad()" [value]="photo()" (input)="photo.set($any($event.target).value)" />
          </app-field>
          <small class="dlg-hint">{{ 'hangout.edit.photoHint' | t }}</small>
          <app-checkbox [checked]="hidden()" (changed)="hidden.set($event)">{{ 'hangout.edit.hidden' | t }}</app-checkbox>
          <small class="dlg-hint">{{ 'hangout.edit.hiddenHint' | t }}</small>
        </form>
        <button dialogFooter type="submit" form="hangout-form" class="dlg-btn primary" [class.off]="busy()" [disabled]="busy()">{{ 'common.confirm' | t }}</button>
      </app-dialog>
    }
  `,
  styles: `
    :host { display: contents; }
    app-dialog { display: block; }
    form { display: flex; flex-direction: column; gap: 8px; }
    .dlg-hint { margin: 0; }
    app-checkbox { margin-top: 4px; }
  `,
})
export class HangoutDialogComponent {
  readonly open = input(false);
  /** Le scelte di adesso (vuote o false se non ne ha fatte). */
  readonly custom = input<HangoutCustom>({ nickname: null, photoURL: null, hidden: false });
  /** Cosa si vedrebbe senza soprannome (il nome del luogo), scritto in grigio nel campo. */
  readonly placeholder = input('');
  /** Si sta salvando: il tasto è spento. */
  readonly busy = input(false);
  readonly confirmed = output<HangoutCustom>();
  readonly cancel = output<void>();

  protected readonly nicknameMax = HANGOUT_NICKNAME_MAX;
  protected readonly photoMax = HANGOUT_PHOTO_URL_MAX;
  protected readonly nickname = signal('');
  protected readonly photo = signal('');
  protected readonly hidden = signal(false);
  protected readonly photoBad = signal(false);

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const c = this.custom();
      this.nickname.set(c.nickname ?? '');
      this.photo.set(c.photoURL ?? '');
      this.hidden.set(c.hidden);
      this.photoBad.set(false);
    });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const photo = this.photo().trim();
    if (photo && !photo.startsWith('https://')) {
      this.photoBad.set(true);
      return;
    }
    this.confirmed.emit({ nickname: this.nickname().trim() || null, photoURL: photo || null, hidden: this.hidden() });
  }
}

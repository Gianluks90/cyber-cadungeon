import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { NICKNAME_MAX, PHOTO_URL_MAX, type ProfileChange } from '../profile/profile.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { DialogComponent } from './dialog.component';
import { FieldComponent } from './field.component';

/**
 * «Profilo» (home, tasto Account del menu): il giocatore sceglie il suo nickname e l'indirizzo della sua immagine.
 * Un campo lasciato vuoto toglie la scelta: il nickname torna a essere il nome dell'account fino al primo spazio, l'immagine torna quella di Google (se c'è) o sparisce.
 * Non sa dove si salva: riceve i valori di adesso e dice cosa è stato scelto.
 */
@Component({
  selector: 'app-profile-dialog',
  imports: [TranslatePipe, DialogComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <app-dialog [title]="'profile.title' | t" width="min(420px, 100%)" (closed)="cancel.emit()">
        <form id="profile-form" (submit)="submit($event)">
          <app-field [label]="'profile.nickname' | t">
            <input type="text" name="nickname" [attr.maxlength]="nicknameMax" [placeholder]="defaultNickname()" autocomplete="nickname" spellcheck="false" [value]="nickname()" (input)="nickname.set($any($event.target).value)" />
          </app-field>
          <small class="dlg-hint">{{ 'profile.nicknameHint' | t }}</small>
          <app-field [label]="'profile.photo' | t" [error]="photoBad() ? ('profile.error.photo' | t) : ''">
            <input type="url" name="photo" [attr.maxlength]="photoMax" placeholder="https://" autocapitalize="none" spellcheck="false" [class.bad]="photoBad()" [value]="photo()" (input)="photo.set($any($event.target).value)" />
          </app-field>
          <small class="dlg-hint">{{ (googlePhoto() ? 'profile.photoHintGoogle' : 'profile.photoHint') | t }}</small>
        </form>
        <button dialogFooter type="submit" form="profile-form" class="dlg-btn primary">{{ 'common.confirm' | t }}</button>
      </app-dialog>
    }
  `,
  styles: `
    :host { display: contents; }
    app-dialog { display: block; }
    form { display: flex; flex-direction: column; gap: 8px; }
    .dlg-hint { margin: 0; }
  `,
})
export class ProfileDialogComponent {
  readonly open = input(false);
  /** Il nickname scelto finora (vuoto se non ne ha scelto uno). */
  readonly savedNickname = input<string | null>(null);
  /** L'immagine scelta finora (vuota se non ne ha scelta una). */
  readonly savedPhotoURL = input<string | null>(null);
  /** Il nickname che si userebbe senza scelta, scritto in grigio nel campo. */
  readonly defaultNickname = input('');
  /** Chi entra con Google ha già la sua foto: se non sceglie un'immagine, resta quella (cambia solo il suggerimento sotto il campo). */
  readonly googlePhoto = input(false);
  readonly confirmed = output<ProfileChange>();
  readonly cancel = output<void>();

  protected readonly nicknameMax = NICKNAME_MAX;
  protected readonly photoMax = PHOTO_URL_MAX;
  protected readonly nickname = signal('');
  protected readonly photo = signal('');
  protected readonly photoBad = signal(false);

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.nickname.set(this.savedNickname() ?? '');
      this.photo.set(this.savedPhotoURL() ?? '');
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
    this.confirmed.emit({ nickname: this.nickname(), photoURL: photo });
  }
}

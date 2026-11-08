import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';
import { IconComponent } from '../ui/icon.component';

/**
 * I tasti di navigazione della mappa, in un container verticale trasparente lungo il lato destro (come quello dei filtri, a sinistra): la mia posizione, il 3D, il nord, + e −.
 * Non conosce la mappa: dice solo cosa viene premuto.
 */
@Component({
  selector: 'app-map-nav',
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="rail">
      <button type="button" [disabled]="!located()" [attr.aria-label]="'worldMap.nav.locate' | t" [title]="'worldMap.nav.locate' | t" (click)="locate.emit()">
        <app-icon name="frame_person" [size]="20" />
      </button>
      <button type="button" [disabled]="!located()" [attr.aria-label]="'worldMap.nav.view3d' | t" [title]="'worldMap.nav.view3d' | t" (click)="toggle3d.emit()">
        <app-icon [name]="view3d() ? '2d_2' : '3d_2'" [size]="20" />
      </button>
      <button type="button" [disabled]="!located()" [attr.aria-label]="'worldMap.nav.resetNorth' | t" [title]="'worldMap.nav.resetNorth' | t" (click)="resetNorth.emit()">
        <app-icon name="explore" [size]="20" [style.transform]="'rotate(' + -bearing() + 'deg)'" />
      </button>
      <button type="button" [disabled]="!located()" [attr.aria-label]="'worldMap.nav.zoomIn' | t" [title]="'worldMap.nav.zoomIn' | t" (click)="zoomIn.emit()">
        <app-icon name="add" [size]="20" />
      </button>
      <button type="button" [disabled]="!located()" [attr.aria-label]="'worldMap.nav.zoomOut' | t" [title]="'worldMap.nav.zoomOut' | t" (click)="zoomOut.emit()">
        <app-icon name="remove" [size]="20" />
      </button>
    </nav>
  `,
  styles: `
    :host { display: contents; }
    /* Contenitore trasparente, al centro del lato destro; i tasti sono quadrati come quello del logout. */
    .rail { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); z-index: 1; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
    button { pointer-events: auto; width: 36px; height: 36px; padding: 0; display: flex; align-items: center; justify-content: center; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); background: var(--c-surface); color: var(--c-text); cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast); }
    button:hover, button:focus-visible, button.on { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
    button:disabled { opacity: 0.45; cursor: default; color: var(--c-text); border-color: var(--c-line-strong); }
  `,
})
export class MapNavComponent {
  /** C'è una posizione: senza, la mappa è ferma e i tasti sono spenti. */
  readonly located = input.required<boolean>();
  readonly view3d = input.required<boolean>();
  /** Di quanto è ruotata la mappa, in gradi (la bussola gira al contrario per puntare sempre il nord). */
  readonly bearing = input(0);
  readonly locate = output<void>();
  readonly toggle3d = output<void>();
  readonly resetNorth = output<void>();
  readonly zoomIn = output<void>();
  readonly zoomOut = output<void>();
}

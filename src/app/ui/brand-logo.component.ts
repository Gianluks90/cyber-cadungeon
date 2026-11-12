import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Il logo dell'app (public/logo/logoipsum-421.svg, usato come maschera: prende il colore del testo) nel suo riquadro dagli angoli smussati in alto a destra e in basso a sinistra.
 * È il solo logo dell'app: lo mostrano la mappa del mondo, i tasti in alto delle pagine di preparazione, la partita e l'editor. Chi lo usa lo posiziona e gli dà il colore (`color`);
 * l'altezza si cambia con `--logo-h` (36px, 44px sui telefoni dove i tasti sono più grandi).
 */
@Component({
  selector: 'app-brand-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: { '[style.--brand-logo]': 'url' },
  styles: `
    :host { display: block; position: relative; box-sizing: border-box; width: 82px; height: var(--logo-h, 36px); border: 1px solid var(--c-line-strong); border-radius: 0 var(--radius-2) 0 var(--radius-2); background: var(--c-surface); transition: border-color 0.15s, color 0.15s; }
    :host::after { content: ''; position: absolute; inset: 0; margin: auto; width: 62px; height: 20px; background-color: currentColor; -webkit-mask: var(--brand-logo) center / contain no-repeat; mask: var(--brand-logo) center / contain no-repeat; }
  `,
})
export class BrandLogoComponent {
  protected readonly url = `url("${new URL('logo/logoipsum-421.svg', document.baseURI).href}")`;
}

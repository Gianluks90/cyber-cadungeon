import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';
import { DialogComponent } from '../ui/dialog.component';
import { IconComponent } from '../ui/icon.component';
import { DATA_CREDITS, MAP_FEEDBACK_URL, SOFTWARE_CREDITS, TERRAIN_CREDITS, TERRAIN_SOURCES_URL } from './map-config';

/**
 * Il piccolo tasto con l'icona info, in basso a destra, e la dialog con i crediti della mappa (dati, terreno, software): prende il posto del box dei crediti di MapLibre.
 * Le righe di credito sono in `map-config.ts`; qui si traducono solo i titoli e i link che sono testo nostro.
 */
@Component({
  selector: 'app-map-credits',
  imports: [IconComponent, TranslatePipe, DialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="info" [attr.aria-label]="'worldMap.credits.open' | t" [title]="'worldMap.credits.open' | t" (click)="open.set(true)">
      <app-icon name="info" [size]="16" />
    </button>
    @if (open()) {
      <app-dialog [title]="'worldMap.credits.title' | t" width="min(460px, 100%)" (closed)="open.set(false)">
        <section>
          <h3>{{ 'worldMap.credits.data' | t }}</h3>
          <ul>
            @for (c of dataCredits; track c.text) {
              <li>@if (c.url) { <a [href]="c.url" target="_blank" rel="noopener">{{ c.text }}</a> } @else { {{ c.text }} }</li>
            }
            <li><a [href]="feedbackUrl" target="_blank" rel="noopener">{{ 'worldMap.mapFeedback' | t }}</a></li>
          </ul>
        </section>
        <section>
          <h3>{{ 'worldMap.credits.terrain' | t }}</h3>
          <ul>
            @for (c of terrainCredits; track c.text) {
              <li>@if (c.url) { <a [href]="c.url" target="_blank" rel="noopener">{{ c.text }}</a> } @else { {{ c.text }} }</li>
            }
            <li><a [href]="terrainSourcesUrl" target="_blank" rel="noopener">{{ 'worldMap.credits.terrainOthers' | t }}</a></li>
          </ul>
        </section>
        <section>
          <h3>{{ 'worldMap.credits.software' | t }}</h3>
          <ul>
            @for (c of softwareCredits; track c.text) {
              <li>@if (c.url) { <a [href]="c.url" target="_blank" rel="noopener">{{ c.text }}</a> } @else { {{ c.text }} }</li>
            }
          </ul>
        </section>
      </app-dialog>
    }
  `,
  styles: `
    :host { display: contents; }
    /* Piccolo, a spigoli secchi, nell'angolo dove stava l'attribuzione di MapLibre. */
    .info { position: absolute; right: 10px; bottom: 10px; z-index: 2; width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--c-line); border-radius: var(--radius-1); background: var(--c-surface); color: var(--c-text-dim); cursor: pointer; transition: color var(--t-fast), border-color var(--t-fast); }
    .info:hover, .info:focus-visible { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
    section { display: flex; flex-direction: column; gap: 6px; }
    h3 { margin: 0; font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
    a { color: var(--c-text); }
    a:hover, a:focus-visible { color: var(--c-interact); outline: none; }
  `,
})
export class MapCreditsComponent {
  protected readonly open = signal(false);
  protected readonly dataCredits = DATA_CREDITS;
  protected readonly terrainCredits = TERRAIN_CREDITS;
  protected readonly softwareCredits = SOFTWARE_CREDITS;
  protected readonly terrainSourcesUrl = TERRAIN_SOURCES_URL;
  protected readonly feedbackUrl = MAP_FEEDBACK_URL;
}

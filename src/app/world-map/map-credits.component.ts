import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';
import { DialogComponent } from '../ui/dialog.component';
import { DATA_CREDITS, MAP_FEEDBACK_URL, SOFTWARE_CREDITS, TERRAIN_CREDITS, TERRAIN_SOURCES_URL } from './map-config';

/**
 * La dialog con i crediti della mappa (dati, terreno, software), che prende il posto del box dei crediti di MapLibre: si apre dalla voce Attribuzione del menu della Home (open).
 * Le righe di credito sono in `map-config.ts`; qui si traducono solo i titoli e i link che sono testo nostro.
 */
@Component({
  selector: 'app-map-credits',
  imports: [TranslatePipe, DialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <app-dialog [title]="'worldMap.credits.title' | t" width="min(460px, 100%)" (closed)="closed.emit()">
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
    section { display: flex; flex-direction: column; gap: 6px; }
    h3 { margin: 0; font: 600 11px/1 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; color: var(--c-text-dim); }
    ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
    a { color: var(--c-text); }
    a:hover, a:focus-visible { color: var(--c-interact); outline: none; }
  `,
})
export class MapCreditsComponent {
  /** La dialog è aperta (la apre la voce Attribuzione del menu della Home). */
  readonly open = input(false);
  readonly closed = output<void>();
  protected readonly dataCredits = DATA_CREDITS;
  protected readonly terrainCredits = TERRAIN_CREDITS;
  protected readonly softwareCredits = SOFTWARE_CREDITS;
  protected readonly terrainSourcesUrl = TERRAIN_SOURCES_URL;
  protected readonly feedbackUrl = MAP_FEEDBACK_URL;
}

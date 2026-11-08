import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { MessageKey } from '../i18n/i18n.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import type { LocationState } from './location.service';

/** Le voci dell'informativa (art. 13 del Regolamento UE 2016/679), nell'ordine in cui compaiono. */
const NOTICE: { label: MessageKey; text: MessageKey }[] = [
  { label: 'location.controller', text: 'location.controllerText' },
  { label: 'location.purpose', text: 'location.purposeText' },
  { label: 'location.basis', text: 'location.basisText' },
  { label: 'location.recipients', text: 'location.recipientsText' },
  { label: 'location.retention', text: 'location.retentionText' },
  { label: 'location.rights', text: 'location.rightsText' },
  { label: 'location.withdraw', text: 'location.withdrawText' },
  { label: 'location.complaint', text: 'location.complaintText' },
];

/**
 * Il pannello al centro dello schermo che chiede il consenso alla posizione, con l'informativa privacy. Accetta o Rifiuta: chi rifiuta è libero di non usare l'app.
 * Non conosce la posizione: dice solo cosa sceglie l'utente.
 */
@Component({
  selector: 'app-location-consent',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="backdrop">
      <section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="loc-title" aria-describedby="loc-lead">
        <header>
          <h2 id="loc-title">{{ 'location.title' | t }}</h2>
        </header>
        <hr />
        <div class="body">
          <p id="loc-lead" class="lead">{{ 'location.lead' | t }}</p>
          @if (state() === 'denied') {
            <p class="warn">{{ 'location.denied' | t }}</p>
          } @else if (state() === 'unavailable') {
            <p class="warn">{{ 'location.unavailable' | t }}</p>
          }
          <p class="label">{{ 'location.noticeTitle' | t }}</p>
          <dl>
            @for (item of notice; track item.label) {
              <dt>{{ item.label | t }}</dt>
              <dd>{{ item.text | t }}</dd>
            }
          </dl>
        </div>
        <hr />
        <footer>
          <p class="hint">{{ 'location.refuseHint' | t }}</p>
          <div class="buttons">
            <button type="button" class="btn" (click)="refused.emit()">{{ 'location.refuse' | t }}</button>
            <button type="button" class="btn primary" (click)="accepted.emit()">{{ 'location.accept' | t }}</button>
          </div>
        </footer>
      </section>
    </div>
  `,
  styles: `
    :host { display: contents; }
    /* Copre tutto e prende i clic: finché non si sceglie, la mappa non si tocca. */
    .backdrop { position: absolute; inset: 0; z-index: 10; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; background: color-mix(in srgb, var(--c-bg) 70%, transparent); }
    .dialog { width: min(520px, 100%); max-height: 100%; display: flex; flex-direction: column; box-sizing: border-box; background: var(--c-surface); border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); }
    header { flex: none; padding: 14px 16px; }
    h2 { margin: 0; font: 600 var(--fs-md)/1.2 var(--font-display); letter-spacing: 0.06em; text-transform: uppercase; }
    hr { flex: none; width: 100%; margin: 0; border: 0; border-top: 1px solid var(--c-line-strong); }
    .body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 14px 16px; font: 400 var(--fs-sm)/1.5 var(--font-ui); color: var(--c-text-dim); }
    .lead { margin: 0 0 12px; color: var(--c-text); font-size: var(--fs-md); }
    .warn { margin: 0 0 12px; padding: 8px 10px; border: 1px solid var(--c-danger); border-radius: var(--radius-1); color: var(--c-text); }
    .label { margin: 16px 0 8px; }
    dl { margin: 0; display: flex; flex-direction: column; gap: 10px; }
    dt { color: var(--c-text); font-weight: 600; }
    dd { margin: 2px 0 0; }
    footer { flex: none; display: flex; flex-direction: column; gap: 10px; padding: 12px 16px 14px; }
    .hint { margin: 0; font: 400 var(--fs-xs)/1.4 var(--font-ui); color: var(--c-text-dim); }
    .buttons { display: flex; justify-content: flex-end; gap: 8px; }
    .btn { padding: 8px 18px; border: 1px solid var(--c-line-strong); border-radius: var(--radius-1); background: none; color: var(--c-text); cursor: pointer; font: 600 12px/1.2 var(--font-ui); letter-spacing: var(--label-tracking); text-transform: uppercase; transition: color var(--t-fast), border-color var(--t-fast); }
    .btn.primary { border-color: var(--c-interact); }
    .btn:hover, .btn:focus-visible { color: var(--c-interact); border-color: var(--c-interact); outline: none; }
  `,
})
export class LocationConsentComponent {
  /** Come sta andando la lettura: se il dispositivo ha negato o non ha la posizione, il pannello lo dice. */
  readonly state = input.required<LocationState>();
  readonly accepted = output<void>();
  readonly refused = output<void>();
  protected readonly notice = NOTICE;
}

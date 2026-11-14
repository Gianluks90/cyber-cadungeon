import { tr } from '../i18n/catalog-text';
import { TrPipe } from '../i18n/tr.pipe';
import { CatalogTextPipe } from '../i18n/catalog-text.pipe';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SKILL_SCHOOL_NAMES, SkillDef } from '../game/skills/skill';
import { CostTextComponent } from './cost-text.component';
import { IconComponent } from './icon.component';

/** La card di una carta abilità: per ora solo testo (nome, ramo e descrizione), senza grafica. */
@Component({
  selector: 'app-skill-card',
  imports: [TrPipe, CatalogTextPipe, CostTextComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (skill(); as s) {
      <article class="card">
        <!-- L'intestazione: titolo e sottotitolo (il ramo) su un fondo azzurro appena visibile, e il filetto sotto; poi il testo. -->
        <header class="head">
          <h4>{{ s.name }}</h4><span class="meta">{{ schoolName(s) }}</span>
          <!-- L'icona del ramo, a destra, ruotata e quasi trasparente: nota di stile per riempire l'intestazione. -->
          <app-icon class="mark" [name]="schoolIcon(s)" [size]="40" aria-hidden="true" />
        </header>
        <p class="text"><app-cost-text [text]="s.text | ct" [numberFirst]="true" /></p>
        @if (action(); as a) {
          <!-- Un'abilità da usare: il bottone dice il costo; se non si può, resta spento e dice perché. -->
          <footer>
            <button type="button" class="use" [class.off]="!a.enabled" [class.overclock]="a.cost.includes('{overclock:')" [attr.aria-disabled]="!a.enabled" [title]="a.enabled ? ('Usa questa abilità' | tr) : (a.reason ?? '')" (click)="a.enabled ? use.emit() : denied.emit(a.reason ?? notPossible())">@if (costBefore(a.cost)) { <app-cost-text [text]="costBefore(a.cost)" /> }{{ 'Usa' | tr }}{{ costAfter(a.cost) }}</button>
            @if (!a.enabled && a.reason) { <small>{{ a.reason }}</small> }
          </footer>
        }
      </article>
    }
  `,
  styles: `
    :host { display: block; color: var(--c-text); font: 13px/1.35 var(--font-ui); }
    .card { box-sizing: border-box; height: 100%; display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border-radius: var(--radius-1); border: 1px solid var(--c-line-strong); background: var(--c-bg); }
    /* Come l'intestazione delle card oggetto: a tutta larghezza, con il filetto sotto. */
    .head { position: relative; display: flex; flex-direction: column; gap: 4px; margin: -14px -16px 0; padding: 12px 64px 12px 16px; background: color-mix(in srgb, var(--c-interact) 7%, transparent); border-bottom: 1px solid var(--c-line); border-radius: calc(var(--radius-1) - 1px) calc(var(--radius-1) - 1px) 0 0; }
    /* 40px: circa l'altezza di titolo e sottotitolo messi insieme. Ruotata di 12° verso destra e opaca al 30%. */
    .mark { position: absolute; right: 14px; top: 50%; transform: translateY(-50%) rotate(12deg); opacity: 0.3; pointer-events: none; }
    h4 { margin: 0; font: 600 var(--fs-md)/1.2 var(--font-display); }
    .meta { color: var(--c-text-dim); font-size: 12px; }
    .text { margin: 0; font-size: 12px; line-height: 1.5; color: var(--c-text); }
    footer { margin-top: auto; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    small { color: var(--c-text-dim); font-size: 11px; }
    /* Il testo resta bianco: il colore del costo (verde il movimento, arancione l'overclock) compare nel bordo e in un fondo appena visibile solo al passaggio. */
    .use { --tone: var(--c-interact); --cost-gap: 6px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 7px 16px; border-radius: var(--radius-1); background: none; color: var(--c-text); cursor: pointer; border: 1px solid var(--c-line-strong); font: 13px/1.2 var(--font-ui); transition: border-color 0.15s, background-color 0.15s; }
    .use.overclock { --tone: var(--c-overclock); }
    .use:hover:not(.off), .use:focus-visible:not(.off) { border-color: var(--tone); background: color-mix(in srgb, var(--tone) 8%, transparent); outline: none; }
    .use.off { opacity: 0.45; border-color: var(--c-line-strong); cursor: default; }
  `,
})
export class SkillCardComponent {
  /** Il motivo di riserva quando un'azione spenta non ne dà uno. */
  protected readonly notPossible = () => tr('Non è possibile');
  readonly skill = input<SkillDef | null>(null);
  /** Se l'abilità si può usare: il costo a parole, se si può adesso e, se no, il motivo. */
  readonly action = input<{ cost: string; enabled: boolean; reason?: string } | null>(null);
  readonly use = output<void>();
  readonly denied = output<string>();

  /** L'icona di ogni ramo: combattimento il guantone, astuzia il bersaglio, hacking il chip. */
  protected schoolIcon(s: SkillDef): string {
    return { combat: 'sports_mma', cunning: 'target', hacking: 'memory' }[s.school];
  }

  protected schoolName(s: SkillDef): string {
    return SKILL_SCHOOL_NAMES[s.school];
  }

  /** Il costo in overclock va prima di ciò che sblocca ("💧2 Usa"), senza il puntino di separazione. */
  protected costBefore(cost: string): string {
    const overclock = cost.split(' · ').filter((p) => p.startsWith('{overclock:'));
    return overclock.length ? overclock.join(' ') + ' ' : '';
  }

  /** Il resto del costo (per esempio "una volta per turno") resta dopo, separato dal puntino. */
  protected costAfter(cost: string): string {
    const rest = cost.split(' · ').filter((p) => p && !p.startsWith('{overclock:'));
    return rest.length ? ' · ' + rest.join(' · ') : '';
  }
}

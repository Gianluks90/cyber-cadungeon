import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';
import { Archetype, AttackDice } from '../game/mercenaries/mercenary-sheet';
import { IconComponent } from './icon.component';

/** L'icona di ogni archetipo: le stesse dei rami di abilità (mischia il guantone, distanza il bersaglio, Intrusione il chip). */
const ICON = { brawler: 'sports_mma', gunner: 'target', raider: 'memory' } as const satisfies Record<Archetype, string>;
const NAME = { brawler: 'archetype.brawler', gunner: 'archetype.gunner', raider: 'archetype.raider' } as const satisfies Record<Archetype, string>;

/** Gli archetipi di un mercenario, ricavati dai dadi competenza: un tipo di dado oltre zero è un archetipo (gli ibridi ne hanno due o tre), sempre nello stesso ordine. */
export function archetypesFromDice(dice: AttackDice): Archetype[] {
  const kinds: Archetype[] = [];
  if (dice.melee > 0) kinds.push('brawler');
  if (dice.ranged > 0) kinds.push('gunner');
  if (dice.intrusion > 0) kinds.push('raider');
  return kinds;
}

/** Il segno dell'archetipo di una card: un pallino scuro con l'icona per ogni archetipo (gli ibridi ne hanno più d'uno), in colonna. Si posiziona da chi la usa. */
@Component({
  selector: 'app-archetype-mark',
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (k of kinds(); track k) {
      <span class="m" [title]="NAME[k] | t"><app-icon [name]="ICON[k]" [size]="18" aria-hidden="true" /></span>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    /* Lo stesso pallino del tasto «i»: 30px, scuro, con il filetto. */
    .m { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: var(--radius-round); border: 1px solid var(--c-line-strong); background: rgba(0, 0, 0, 0.7); color: var(--c-text); }
  `,
})
export class ArchetypeMarkComponent {
  readonly dice = input.required<AttackDice>();
  protected readonly ICON = ICON;
  protected readonly NAME = NAME;
  protected readonly kinds = computed(() => archetypesFromDice(this.dice()));
}

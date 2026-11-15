import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ItemDef, itemNameParts } from '../game/items/item';

/** Il nome di un oggetto: per un oggetto unico è tutto arancione (come il tag «unica»); per uno Glam l'ultima parola (il suffisso, «Dorata») è in hot pink. */
@Component({
  selector: 'app-item-name',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.unique]': 'def().unique' },
  template: `{{ parts().base }}@if (parts().suffix) {<span class="suffix"> {{ parts().suffix }}</span>}`,
  styles: `
    :host { display: inline; }
    :host(.unique) { color: var(--c-unique); }
    .suffix { color: var(--c-glam); }
  `,
})
export class ItemNameComponent {
  readonly def = input.required<Pick<ItemDef, 'name' | 'glam' | 'unique'>>();
  protected readonly parts = computed(() => itemNameParts(this.def()));
}

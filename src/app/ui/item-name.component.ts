import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ItemDef, itemNameParts } from '../game/items/item';

/** Il nome di un oggetto: per uno Glam l'ultima parola (il suffisso, «Dorata») è in hot pink. */
@Component({
  selector: 'app-item-name',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ parts().base }}@if (parts().suffix) {<span class="suffix"> {{ parts().suffix }}</span>}`,
  styles: `
    :host { display: inline; }
    .suffix { color: var(--c-glam); }
  `,
})
export class ItemNameComponent {
  readonly def = input.required<Pick<ItemDef, 'name' | 'glam'>>();
  protected readonly parts = computed(() => itemNameParts(this.def()));
}

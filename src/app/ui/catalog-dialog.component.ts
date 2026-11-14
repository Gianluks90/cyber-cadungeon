import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { tr } from '../i18n/catalog-text';
import { loadEnemyCatalog } from '../game/enemies/enemy';
import { ItemDef, itemDetail, itemGroup, loadItemCatalog } from '../game/items/item';
import { MercenarySheet, loadAllMercenarySheets } from '../game/mercenaries/mercenary-sheet';
import { potionDef } from '../game/items/potion';
import { loadModCatalog, modTag } from '../game/mods/mod';
import { loadSkillCatalog } from '../game/skills/skill';
import { CatalogCategory, CatalogEntry, ComponentsDialogComponent } from './components-dialog.component';

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'it');

/** Una carta oggetto del catalogo: tutti gli oggetti, anche quelli che il negozio non vende. */
const itemEntry = (d: ItemDef): CatalogEntry => {
  const detail = itemDetail(d);
  return { kind: 'item', id: d.id, name: d.name, def: d, icon: d.icon ?? 'inventory_2', detail, count: null, search: [d.name, detail, d.offHand ?? '', ...(d.rules ?? []), ...(d.spark ?? []).map((x) => x.effect)].join(' ') };
};

/** I consumabili (le pozioni non sono oggetti del catalogo: ogni mercenario ne porta fino a 3). */
const potionEntries = (): CatalogEntry[] =>
  (['heal', 'overclock'] as const).map((kind): CatalogEntry => {
    const def = potionDef(kind);
    return { kind: 'item', id: def.id, name: def.name, def, icon: 'tokens/potion', detail: tr('Consumabile'), count: null, search: [def.name, tr('consumabile'), ...(def.rules ?? [])].join(' ') };
  });

/**
 * Il catalogo di ciò che si può rivedere prima della partita (scelta degli eroi, Briefing, sala d'attesa): mercenari, nemici, armi, armature, cyberdeck, mod, consumabili e carte abilità.
 * Carica i cataloghi la prima volta che si apre e li mostra nella finestra a due colonne dei componenti.
 */
@Component({
  selector: 'app-catalog-dialog',
  imports: [ComponentsDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-components-dialog [open]="open()" [categories]="categories()" (closed)="closed.emit()" />`,
})
export class CatalogDialogComponent {
  readonly open = input(false);
  readonly closed = output<void>();
  protected readonly categories = signal<CatalogCategory[]>([]);
  private loaded = false;

  constructor() {
    // Si carica solo quando si apre per la prima volta.
    effect(() => {
      if (this.open()) void this.ensureLoaded();
    });
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    const [items, mods, skills, enemies, mercenaries] = await Promise.all([loadItemCatalog(), loadModCatalog(), loadSkillCatalog(), loadEnemyCatalog(), loadAllMercenarySheets()]);
    const all = [...items.values()];
    const ofGroup = (g: string) => all.filter((d) => itemGroup(d) === g).map(itemEntry).sort(byName);
    const skillEntries = (school: string): CatalogEntry[] => [...skills.values()].filter((k) => k.school === school).map((k): CatalogEntry => ({ kind: 'skill', id: k.id, name: k.name, def: k, search: `${k.name} ${k.text}` })).sort(byName);
    const mercenaryEntries = mercenaries.map((h: MercenarySheet): CatalogEntry => ({ kind: 'mercenary', id: h.id, name: h.name, sheet: h, search: [h.name, h.class].join(' ') })).sort(byName);
    const enemyEntries = [...enemies.values()].map((m): CatalogEntry => ({ kind: 'enemy', id: m.id, name: m.name, def: m, search: [m.name, ...m.normal.abilities, ...m.enhanced.abilities].join(' ') })).sort(byName);
    const modEntries = [...mods.values()].map((m): CatalogEntry => {
      const detail = modTag(m);
      return { kind: 'mod', id: m.id, name: m.name, def: m, detail, search: [m.name, ...m.effect, detail].join(' ') };
    }).sort(byName);
    this.categories.set([
      { id: 'mercenaries', group: tr('Personaggi'), name: tr('Mercenari'), entries: mercenaryEntries },
      { id: 'enemies', group: tr('Personaggi'), name: tr('Nemici'), entries: enemyEntries },
      { id: 'melee', group: tr('Equipaggiamento'), name: tr('Armi da mischia'), entries: ofGroup('melee') },
      { id: 'ranged', group: tr('Equipaggiamento'), name: tr('Armi a distanza'), entries: ofGroup('ranged') },
      { id: 'armor', group: tr('Equipaggiamento'), name: tr('Armature'), entries: ofGroup('armor') },
      { id: 'deck', group: tr('Equipaggiamento'), name: tr('Cyberdeck'), entries: ofGroup('deck') },
      { id: 'mods', group: tr('Equipaggiamento'), name: tr('Mod'), entries: modEntries },
      { id: 'potions', group: tr('Consumabili'), name: tr('Consumabili'), entries: potionEntries() },
      { id: 'combat', group: tr('Abilità'), name: tr('Combattimento'), entries: skillEntries('combat') },
      { id: 'cunning', group: tr('Abilità'), name: tr('Astuzia'), entries: skillEntries('cunning') },
      { id: 'hacking', group: tr('Abilità'), name: tr('Hacking'), entries: skillEntries('hacking') },
    ]);
  }
}

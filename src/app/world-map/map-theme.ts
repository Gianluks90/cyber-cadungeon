import { namedFlavor, type Flavor } from '@protomaps/basemaps';

/**
 * Un tema della mappa: i colori del disegno (`flavor`), lo sprite delle icone e i colori nostri (`extras`).
 * I colori sono stringhe già risolte, lette da `src/styles/tokens.css` (la fonte), perché MapLibre non legge `var(--x)`. Per ora esiste un solo tema; per aggiungerne un altro
 * basta una nuova funzione `create…Theme()` che legga i suoi token, con lo sprite giusto (`dark` per fondi scuri, `light` per chiari).
 */
export interface MapTheme {
  id: 'cyberpunk';
  flavor: Flavor;
  spriteName: 'dark' | 'light';
  extras: { buildingOutline: string };
}

/** Legge un ruolo della palette da `src/styles/tokens.css` (la fonte dei colori). Se manca, errore subito: uno stile con un colore vuoto non si disegna. */
function token(style: CSSStyleDeclaration, name: string): string {
  const value = style.getPropertyValue(name).trim();
  if (!value) throw new Error(`Token mancante in tokens.css: ${name}`);
  return value;
}

/** I ruoli della mappa, letti dal CSS al momento di costruire il tema (mai in costanti di modulo). */
function readPalette() {
  const style = getComputedStyle(document.documentElement);
  const t = (name: string) => token(style, `--map-${name}`);
  return {
    background: t('background'),
    land: t('land'),
    landUse: t('land-use'),
    water: t('water'),
    waterLabel: t('water-label'),
    park: t('park'),
    wood: t('wood'),
    roadMain: t('road-main'),
    roadSecondary: t('road-secondary'),
    roadMinor: t('road-minor'),
    roadCasing: t('road-casing'),
    roadTunnel: t('road-tunnel'),
    railway: t('railway'),
    building: t('building'),
    buildingOutline: t('building-outline'),
    boundary: t('boundary'),
    label: t('label'),
    labelHalo: t('label-halo'),
  };
}

type Palette = ReturnType<typeof readPalette>;

function buildCyberpunkFlavor(p: Palette): Flavor {
  return {
    // Si parte dal tema scuro ufficiale: nessun campo obbligatorio manca.
    ...namedFlavor('dark'),
    background: p.background,
    earth: p.land,
    park_a: p.park,
    park_b: p.park,
    zoo: p.park,
    wood_a: p.wood,
    wood_b: p.wood,
    scrub_a: p.wood,
    scrub_b: p.wood,
    hospital: p.landUse,
    industrial: p.landUse,
    school: p.landUse,
    pedestrian: p.landUse,
    sand: p.landUse,
    beach: p.landUse,
    glacier: p.landUse,
    military: p.landUse,
    aerodrome: p.landUse,
    runway: p.roadSecondary,
    pier: p.roadMinor,
    water: p.water,
    buildings: p.building,
    highway: p.roadMain,
    major: p.roadMain,
    link: p.roadSecondary,
    minor_a: p.roadSecondary,
    minor_b: p.roadSecondary,
    other: p.roadMinor,
    minor_service: p.roadMinor,
    railway: p.railway,
    highway_casing_early: p.roadCasing,
    highway_casing_late: p.roadCasing,
    major_casing_early: p.roadCasing,
    major_casing_late: p.roadCasing,
    link_casing: p.roadCasing,
    minor_casing: p.roadCasing,
    minor_service_casing: p.roadCasing,
    tunnel_highway: p.roadTunnel,
    tunnel_major: p.roadTunnel,
    tunnel_link: p.roadTunnel,
    tunnel_minor: p.roadTunnel,
    tunnel_other: p.roadTunnel,
    tunnel_highway_casing: p.roadCasing,
    tunnel_major_casing: p.roadCasing,
    tunnel_link_casing: p.roadCasing,
    tunnel_minor_casing: p.roadCasing,
    tunnel_other_casing: p.roadCasing,
    bridges_highway: p.roadMain,
    bridges_major: p.roadMain,
    bridges_link: p.roadSecondary,
    bridges_minor: p.roadSecondary,
    bridges_other: p.roadMinor,
    bridges_highway_casing: p.roadCasing,
    bridges_major_casing: p.roadCasing,
    bridges_link_casing: p.roadCasing,
    bridges_minor_casing: p.roadCasing,
    bridges_other_casing: p.roadCasing,
    boundaries: p.boundary,
    roads_label_minor: p.label,
    roads_label_major: p.label,
    subplace_label: p.label,
    city_label: p.label,
    state_label: p.label,
    country_label: p.label,
    address_label: p.label,
    roads_label_minor_halo: p.labelHalo,
    roads_label_major_halo: p.labelHalo,
    subplace_label_halo: p.labelHalo,
    city_label_halo: p.labelHalo,
    state_label_halo: p.labelHalo,
    address_label_halo: p.labelHalo,
    ocean_label: p.waterLabel,
    landcover: {
      barren: p.land,
      farmland: p.wood,
      forest: p.wood,
      glacier: p.landUse,
      grassland: p.park,
      scrub: p.wood,
      urban_area: p.landUse,
    },
  };
}

/** Il tema cyberpunk, con i colori letti ora da `tokens.css`. */
export function createCyberpunkTheme(): MapTheme {
  const palette = readPalette();
  return {
    id: 'cyberpunk',
    flavor: buildCyberpunkFlavor(palette),
    spriteName: 'dark',
    extras: { buildingOutline: palette.buildingOutline },
  };
}

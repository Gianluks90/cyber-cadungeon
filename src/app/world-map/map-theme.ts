import { namedFlavor, type Flavor } from '@protomaps/basemaps';

/**
 * Un tema della mappa: i colori del disegno (`flavor`), lo sprite delle icone e i colori nostri (`extras`).
 * I colori sono stringhe già risolte, perché MapLibre non legge `var(--x)`. Per ora esiste un solo tema; per aggiungerne un altro
 * basta un nuovo oggetto `MapTheme`, registrato in `THEMES`, con lo sprite giusto (`dark` per fondi scuri, `light` per chiari).
 */
export interface MapTheme {
  id: 'cyberpunk';
  flavor: Flavor;
  spriteName: 'dark' | 'light';
  extras: { buildingOutline: string };
}

/** Un colore = un ruolo. Si ritocca solo qui. */
const palette = {
  background: '#03060f',
  land: '#070c1c',
  landUse: '#0b1226',
  water: '#050e24',
  waterLabel: '#2f6f9f',
  park: '#08181f',
  wood: '#07151b',
  roadMain: '#2ad4ff',
  roadSecondary: '#1a8fb0',
  roadMinor: '#12566d',
  roadCasing: '#03060f',
  roadTunnel: '#0e3a4a',
  railway: '#5a2a3a',
  building: '#4a0e18',
  buildingOutline: '#ff3b3b',
  boundary: '#ff5a1f',
  label: '#6fe6ff',
  labelHalo: '#03060f',
};

function buildCyberpunkFlavor(): Flavor {
  const p = palette;
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

export const CYBERPUNK_THEME: MapTheme = {
  id: 'cyberpunk',
  flavor: buildCyberpunkFlavor(),
  spriteName: 'dark',
  extras: { buildingOutline: palette.buildingOutline },
};

export const THEMES: Record<MapTheme['id'], MapTheme> = { cyberpunk: CYBERPUNK_THEME };

import type { FilterSpecification, Map as MapLibreMap } from 'maplibre-gl';
import type { MessageKey } from '../i18n/i18n.service';

/**
 * I filtri della mappa: i tile contengono già tutto, quindi accendere o spegnere un gruppo di layer è istantaneo (nessuna richiesta di rete).
 * Un gruppo è un insieme di layer di Protomaps (per id) oppure, per i luoghi di interesse, un insieme di tipi (`kind`) del layer `pois`.
 */
export type FilterSection = 'fixer' | 'map' | 'names' | 'poi';

export interface FilterGroup {
  id: string;
  section: FilterSection;
  label: MessageKey;
  /** Gli id dei layer che il gruppo accende o spegne. */
  layers: readonly string[];
  /** Solo per i luoghi di interesse: i tipi (`kind`) che il gruppo lascia vedere nel layer `pois`. */
  poiKinds?: readonly string[];
  /** Acceso di default (il filtro "Essenziale"). */
  essential: boolean;
  /** Voce non ancora disponibile: si vede spenta e non si può toccare; non entra in nessun filtro. */
  locked?: boolean;
}

export const FILTER_GROUPS: readonly FilterGroup[] = [
  { id: 'fixer-contracts', section: 'fixer', label: 'worldMap.filter.fixerContracts', essential: false, locked: true, layers: [] },
  { id: 'fixer-hangouts', section: 'fixer', label: 'worldMap.filter.fixerHangouts', essential: false, locked: true, layers: [] },
  {
    id: 'roads-main', section: 'map', label: 'worldMap.filter.roadsMain', essential: true,
    layers: [
      'roads_highway', 'roads_highway_casing_early', 'roads_highway_casing_late', 'roads_major', 'roads_major_casing_early', 'roads_major_casing_late', 'roads_link', 'roads_link_casing',
      'roads_bridges_highway', 'roads_bridges_highway_casing', 'roads_bridges_major', 'roads_bridges_major_casing', 'roads_bridges_link', 'roads_bridges_link_casing',
      'roads_tunnels_highway', 'roads_tunnels_highway_casing', 'roads_tunnels_major', 'roads_tunnels_major_casing', 'roads_tunnels_link', 'roads_tunnels_link_casing',
    ],
  },
  {
    id: 'roads-minor', section: 'map', label: 'worldMap.filter.roadsMinor', essential: true,
    layers: [
      'roads_minor', 'roads_minor_casing', 'roads_minor_service', 'roads_minor_service_casing', 'roads_other', 'roads_pier', 'roads_oneway',
      'roads_bridges_minor', 'roads_bridges_minor_casing', 'roads_bridges_other', 'roads_bridges_other_casing',
      'roads_tunnels_minor', 'roads_tunnels_minor_casing', 'roads_tunnels_other', 'roads_tunnels_other_casing',
    ],
  },
  { id: 'railways', section: 'map', label: 'worldMap.filter.railways', essential: true, layers: ['roads_rail'] },
  { id: 'buildings', section: 'map', label: 'worldMap.filter.buildings', essential: true, layers: ['buildings', 'buildings-outline', 'buildings-3d'] },
  { id: 'parks', section: 'map', label: 'worldMap.filter.parks', essential: true, layers: ['landcover', 'landuse_park', 'landuse_urban_green', 'landuse_zoo'] },
  { id: 'water', section: 'map', label: 'worldMap.filter.water', essential: true, layers: ['water', 'water_stream', 'water_river'] },
  {
    id: 'land-use', section: 'map', label: 'worldMap.filter.landUse', essential: false,
    layers: ['landuse_hospital', 'landuse_industrial', 'landuse_school', 'landuse_beach', 'landuse_pedestrian', 'landuse_pier'],
  },
  { id: 'airports', section: 'map', label: 'worldMap.filter.airports', essential: false, layers: ['landuse_aerodrome', 'landuse_runway', 'roads_runway', 'roads_taxiway'] },
  { id: 'borders', section: 'map', label: 'worldMap.filter.borders', essential: false, layers: ['boundaries', 'boundaries_country', 'places_country'] },

  { id: 'places', section: 'names', label: 'worldMap.filter.places', essential: true, layers: ['places_subplace', 'places_locality', 'places_region'] },
  { id: 'water-names', section: 'names', label: 'worldMap.filter.waterNames', essential: true, layers: ['water_label_ocean', 'water_label_lakes', 'water_waterway_label', 'earth_label_islands'] },
  { id: 'road-names-main', section: 'names', label: 'worldMap.filter.roadNamesMain', essential: true, layers: ['roads_labels_major', 'roads_shields'] },
  { id: 'road-names-minor', section: 'names', label: 'worldMap.filter.roadNamesMinor', essential: false, layers: ['roads_labels_minor'] },
  { id: 'addresses', section: 'names', label: 'worldMap.filter.addresses', essential: false, layers: ['address_label'] },

  { id: 'poi-transport', section: 'poi', label: 'worldMap.filter.poiTransport', essential: false, layers: [], poiKinds: ['station', 'bus_stop', 'ferry_terminal', 'aerodrome', 'marina'] },
  { id: 'poi-food', section: 'poi', label: 'worldMap.filter.poiFood', essential: false, layers: [], poiKinds: ['restaurant', 'fast_food', 'cafe', 'bar'] },
  { id: 'poi-shops', section: 'poi', label: 'worldMap.filter.poiShops', essential: false, layers: [], poiKinds: ['supermarket', 'convenience', 'books', 'beauty', 'electronics', 'clothes'] },
  { id: 'poi-culture', section: 'poi', label: 'worldMap.filter.poiCulture', essential: false, layers: [], poiKinds: ['attraction', 'museum', 'theatre', 'artwork', 'library', 'stadium', 'zoo', 'animal'] },
  { id: 'poi-services', section: 'poi', label: 'worldMap.filter.poiServices', essential: false, layers: [], poiKinds: ['post_office', 'townhall', 'toilets', 'drinking_water', 'bench', 'building', 'university', 'school'] },
  { id: 'poi-nature', section: 'poi', label: 'worldMap.filter.poiNature', essential: false, layers: [], poiKinds: ['beach', 'forest', 'park', 'peak', 'garden'] },
];

export type FilterPreset = 'all' | 'essential' | 'custom';

const ALL_IDS = FILTER_GROUPS.filter((g) => !g.locked).map((g) => g.id);
const ESSENTIAL_IDS = FILTER_GROUPS.filter((g) => g.essential && !g.locked).map((g) => g.id);
const PRESET_KEY = 'cad-map-preset';
const CUSTOM_KEY = 'cad-map-filters-custom';

/** Le voci accese da un filtro: quelle di "Tutto" o "Essenziale", oppure la scelta a mano (`custom`). */
export function enabledFor(preset: FilterPreset, custom: ReadonlySet<string>): ReadonlySet<string> {
  return preset === 'custom' ? custom : new Set(preset === 'all' ? ALL_IDS : ESSENTIAL_IDS);
}

/** Il filtro su cui eravamo, salvato nel browser; di base "Essenziale". */
export function loadPreset(): FilterPreset {
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    if (raw === 'all' || raw === 'essential' || raw === 'custom') return raw;
  } catch {
    /* archivio bloccato: si riparte dal filtro di base */
  }
  return 'essential';
}

export function savePreset(preset: FilterPreset): void {
  try {
    localStorage.setItem(PRESET_KEY, preset);
  } catch {
    /* non si salva: vale solo per questa visita */
  }
}

/** Le voci scelte a mano nel filtro "Personalizzato" (gli id che non esistono più si ignorano); all'inizio, nessuna. */
export function loadCustomFilters(): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (raw) {
      const ids: unknown = JSON.parse(raw);
      if (Array.isArray(ids)) return new Set(ids.filter((id): id is string => typeof id === 'string' && ALL_IDS.includes(id)));
    }
  } catch {
    /* dato rovinato: si riparte da tutto spento */
  }
  return new Set();
}

export function saveCustomFilters(custom: ReadonlySet<string>): void {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify([...custom]));
  } catch {
    /* non si salva: vale solo per questa visita */
  }
}

/**
 * Applica i filtri allo stile in uso. Va rifatto a ogni `style.load` (il cambio di tema ricrea lo stile e azzera le visibilità).
 * Se lo stile non è pronto MapLibre lancia un errore: basta ignorarlo, perché `style.load` riapplica tutto.
 */
export function applyMapFilters(map: MapLibreMap, enabled: ReadonlySet<string>, threeD = false): void {
  try {
    const poiKinds: string[] = [];
    for (const group of FILTER_GROUPS) {
      const on = enabled.has(group.id);
      for (const id of group.layers) {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on && (threeD || id !== 'buildings-3d') ? 'visible' : 'none');
      }
      if (on && group.poiKinds) poiKinds.push(...group.poiKinds);
    }
    if (map.getLayer('pois')) {
      map.setLayoutProperty('pois', 'visibility', poiKinds.length ? 'visible' : 'none');
      // Come il filtro di Protomaps (i tipi voluti, e ogni luogo dal suo zoom minimo), ma con solo i tipi dei gruppi accesi.
      if (poiKinds.length) map.setFilter('pois', ['all', ['in', ['get', 'kind'], ['literal', poiKinds]], ['>=', ['zoom'], ['+', ['get', 'min_zoom'], 0]]] as FilterSpecification);
    }
  } catch {
    /* stile non ancora pronto */
  }
}

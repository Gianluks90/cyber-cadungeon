import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import { layers } from '@protomaps/basemaps';
import { ATTRIBUTION_HTML, BASEMAP_SOURCE_ID, DEM_ATTRIBUTION_HTML, DEM_SOURCE_ID, DEM_TILES_URL, GLYPHS_URL, LABEL_LANGUAGE, PMTILES_URL, SPRITE_BASE_URL, TERRAIN_EXAGGERATION } from './map-config';
import type { MapTheme } from './map-theme';

/** Trasforma un tema nello stile completo di MapLibre (sorgente, font, icone, layer di Protomaps + contorno degli edifici). */
export function buildMapStyle(theme: MapTheme): StyleSpecification {
  const baseLayers = layers(BASEMAP_SOURCE_ID, theme.flavor, { lang: LABEL_LANGUAGE });

  // Il contorno degli edifici va subito dopo il loro riempimento; se l'id cambiasse in una versione futura della libreria, va in coda.
  const outline = {
    id: 'buildings-outline',
    type: 'line' as const,
    source: BASEMAP_SOURCE_ID,
    'source-layer': 'buildings',
    filter: ['in', 'kind', 'building', 'building_part'] as ['in', string, ...string[]],
    minzoom: 14,
    paint: {
      'line-color': theme.extras.buildingOutline,
      'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.4, 18, 1.2] as unknown as number,
      'line-opacity': 0.85,
    },
  };
  // Gli edifici in rilievo del 3D: stessi edifici, altezza dai dati (10 m se manca). Nascosti finché non si accende il 3D (lo decide `applyMapFilters`).
  const extrusion = {
    id: 'buildings-3d',
    type: 'fill-extrusion' as const,
    source: BASEMAP_SOURCE_ID,
    'source-layer': 'buildings',
    filter: ['in', 'kind', 'building', 'building_part'] as ['in', string, ...string[]],
    minzoom: 14,
    layout: { visibility: 'none' as const },
    paint: {
      'fill-extrusion-color': theme.extras.building,
      'fill-extrusion-height': ['coalesce', ['get', 'height'], 10] as unknown as number,
      'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0] as unknown as number,
      'fill-extrusion-opacity': 0.9,
    },
  };
  // L'ombreggiatura del rilievo sta sopra terra e acqua e sotto strade ed edifici; come il resto del 3D, è spenta finché non si accende.
  const hillshade = {
    id: 'hillshade',
    type: 'hillshade' as const,
    source: DEM_SOURCE_ID,
    layout: { visibility: 'none' as const },
    paint: { 'hillshade-shadow-color': '#000000', 'hillshade-highlight-color': theme.extras.building, 'hillshade-accent-color': '#000000', 'hillshade-exaggeration': 0.6 },
  };
  const at = baseLayers.findIndex((l) => l.id === 'buildings');
  const shadeAt = baseLayers.findIndex((l) => l.id === 'landuse_pier');
  const withShade = shadeAt === -1 ? baseLayers : [...baseLayers.slice(0, shadeAt + 1), hillshade, ...baseLayers.slice(shadeAt + 1)];
  const atNow = at === -1 ? -1 : withShade.findIndex((l) => l.id === 'buildings');
  const allLayers = atNow === -1 ? [...withShade, outline, extrusion] : [...withShade.slice(0, atNow + 1), outline, extrusion, ...withShade.slice(atNow + 1)];

  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sprite: `${SPRITE_BASE_URL}/${theme.spriteName}`,
    sources: {
      [BASEMAP_SOURCE_ID]: { type: 'vector', url: `pmtiles://${PMTILES_URL}`, attribution: ATTRIBUTION_HTML },
      [DEM_SOURCE_ID]: { type: 'raster-dem', tiles: [DEM_TILES_URL], encoding: 'terrarium', tileSize: 256, maxzoom: 15, attribution: DEM_ATTRIBUTION_HTML },
    },
    layers: allLayers,
  };
}

/** Accende o spegne il rilievo (terreno sollevato + ombreggiatura). Va rifatto a ogni `style.load`, perché un nuovo stile parte senza. */
export function applyTerrain(map: MapLibreMap, on: boolean): void {
  try {
    map.setTerrain(on ? { source: DEM_SOURCE_ID, exaggeration: TERRAIN_EXAGGERATION } : null);
    if (map.getLayer('hillshade')) map.setLayoutProperty('hillshade', 'visibility', on ? 'visible' : 'none');
  } catch {
    /* stile non ancora pronto: ci pensa `style.load` */
  }
}

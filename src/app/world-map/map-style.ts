import type { StyleSpecification } from 'maplibre-gl';
import { layers } from '@protomaps/basemaps';
import { ATTRIBUTION_HTML, BASEMAP_SOURCE_ID, GLYPHS_URL, LABEL_LANGUAGE, PMTILES_URL, SPRITE_BASE_URL } from './map-config';
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
  const at = baseLayers.findIndex((l) => l.id === 'buildings');
  const allLayers = at === -1 ? [...baseLayers, outline] : [...baseLayers.slice(0, at + 1), outline, ...baseLayers.slice(at + 1)];

  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sprite: `${SPRITE_BASE_URL}/${theme.spriteName}`,
    sources: {
      [BASEMAP_SOURCE_ID]: { type: 'vector', url: `pmtiles://${PMTILES_URL}`, attribution: ATTRIBUTION_HTML },
    },
    layers: allLayers,
  };
}

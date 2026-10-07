import { byType, DASHED_TYPES, DEFAULT_COLOR } from './featureTypes';

// Mapbox Draw styles. Inactive features are coloured by their type (Draw exposes the
// feature's properties with a `user_` prefix); the selected feature is orange.
const typeColor = byType('user_type', t => t.color, DEFAULT_COLOR);
const typeWidth = byType('user_type', t => t.width, 2);
const dashed = ['in', 'user_type', ...DASHED_TYPES];
const solid = ['!in', 'user_type', ...DASHED_TYPES];

export const drawStyles = [
  // POLYGON FILL
  {
    'id': 'gl-draw-polygon-fill-inactive',
    'type': 'fill',
    'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
    'paint': {
      'fill-color': typeColor,
      'fill-outline-color': typeColor,
      'fill-opacity': 0.15
    }
  },
  {
    'id': 'gl-draw-polygon-fill-active',
    'type': 'fill',
    'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
    'paint': {
      'fill-color': '#fbb03b',
      'fill-outline-color': '#fbb03b',
      'fill-opacity': 0.1
    }
  },
  // POLYGON MIDPOINTS
  {
    'id': 'gl-draw-polygon-midpoint',
    'type': 'circle',
    'filter': ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
    'paint': {
      'circle-radius': 3,
      'circle-color': '#fbb03b'
    }
  },
  // LINE STROKE
  {
    'id': 'gl-draw-line-inactive',
    'type': 'line',
    'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'LineString'], solid],
    'layout': {
      'line-cap': 'round',
      'line-join': 'round'
    },
    'paint': {
      'line-color': typeColor,
      'line-width': typeWidth
    }
  },
  {
    'id': 'gl-draw-line-inactive-dashed',
    'type': 'line',
    'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'LineString'], dashed],
    'layout': {
      'line-join': 'round'
    },
    'paint': {
      'line-color': typeColor,
      'line-width': typeWidth,
      'line-dasharray': [2, 1.5]
    }
  },
  {
    'id': 'gl-draw-line-active',
    'type': 'line',
    'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'LineString']],
    'layout': {
      'line-cap': 'round',
      'line-join': 'round'
    },
    'paint': {
      'line-color': '#fbb03b',
      'line-dasharray': [0.2, 2],
      'line-width': 2
    }
  },
  // POLYGON OUTLINE
  {
    'id': 'gl-draw-polygon-stroke-inactive',
    'type': 'line',
    'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
    'layout': {
      'line-cap': 'round',
      'line-join': 'round'
    },
    'paint': {
      'line-color': typeColor,
      'line-width': 2
    }
  },
  {
    'id': 'gl-draw-polygon-stroke-active',
    'type': 'line',
    'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
    'layout': {
      'line-cap': 'round',
      'line-join': 'round'
    },
    'paint': {
      'line-color': '#fbb03b',
      'line-dasharray': [0.2, 2],
      'line-width': 2
    }
  },
  // POINT
  {
    'id': 'gl-draw-point-inactive',
    'type': 'circle',
    'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Point'], ['!=', 'meta', 'midpoint']],
    'paint': {
      'circle-radius': 5,
      'circle-color': typeColor,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1
    }
  },
  {
    'id': 'gl-draw-point-active',
    'type': 'circle',
    'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Point'], ['!=', 'meta', 'midpoint']],
    'paint': {
      'circle-radius': 7,
      'circle-color': '#fbb03b'
    }
  }
];

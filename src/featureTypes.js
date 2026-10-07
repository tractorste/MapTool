// The feature types the map knows, grouped for the menus. The farm game reads `id`, so
// never rename an existing id (add a new one instead).
//
//   geometry  what to draw it as: 'line', 'polygon', 'point' or 'any'
//   color     how it shows on the satellite map
//   width     line width on the map (lines and polygon outlines)
//   dash      dashed line on the map
//   like      an older type it looks like, for the Render Map styles that predate it

export const FEATURE_GROUPS = [
  'Land',
  'Roads & Tracks',
  'Boundaries',
  'Trees & Plants',
  'Buildings',
  'Water',
  'Landmarks',
  'Other',
];

export const FEATURE_TYPES = [
  // Land
  { id: 'field', label: 'Field', group: 'Land', geometry: 'polygon', color: '#c0ca33' },
  { id: 'grass_field', label: 'Grass Field', group: 'Land', geometry: 'polygon', color: '#8bc34a' },
  { id: 'lawn', label: 'Lawn', group: 'Land', geometry: 'polygon', color: '#b2ff59', like: 'grass_field' },
  { id: 'sand', label: 'Sand / Bare Ground', group: 'Land', geometry: 'polygon', color: '#ffd54f' },
  { id: 'tennis_court', label: 'Tennis Court', group: 'Land', geometry: 'polygon', color: '#26a69a', like: 'sand' },

  // Roads & Tracks
  { id: 'a_road', label: 'A Road', group: 'Roads & Tracks', geometry: 'line', color: '#e53935', width: 5, like: 'road' },
  { id: 'b_road', label: 'B Road', group: 'Roads & Tracks', geometry: 'line', color: '#fb8c00', width: 4, like: 'road' },
  { id: 'road', label: 'Road / Track', group: 'Roads & Tracks', geometry: 'any', color: '#f5f5f5', width: 3 },
  { id: 'gravel_track', label: 'Gravel Track', group: 'Roads & Tracks', geometry: 'line', color: '#cfd8dc', width: 3, like: 'road' },
  { id: 'muddy_track', label: 'Muddy Track', group: 'Roads & Tracks', geometry: 'line', color: '#a1887f', width: 3, like: 'road' },
  { id: 'footpath', label: 'Footpath', group: 'Roads & Tracks', geometry: 'line', color: '#fff176', width: 2, dash: true, like: 'road' },

  // Boundaries
  { id: 'fence', label: 'Wire Fence', group: 'Boundaries', geometry: 'line', color: '#e0e0e0', width: 1.5 },
  { id: 'wire_fence_top_rail', label: 'Wire Fence With Top Rail', group: 'Boundaries', geometry: 'line', color: '#ffe0b2', width: 2, dash: true, like: 'fence' },
  { id: 'railed_fence', label: 'Railed Fence', group: 'Boundaries', geometry: 'line', color: '#bcaaa4', width: 2.5, like: 'fence' },
  { id: 'stone_wall', label: 'Stone Wall', group: 'Boundaries', geometry: 'line', color: '#9e9e9e', width: 3.5, like: 'fence' },
  { id: 'hedge', label: 'Hedge', group: 'Boundaries', geometry: 'line', color: '#00e676', width: 4, like: 'wood' },
  { id: 'gate', label: 'Gate', group: 'Boundaries', geometry: 'any', color: '#ff9800' },

  // Trees & Plants
  { id: 'wood', label: 'Wood / Forest', group: 'Trees & Plants', geometry: 'polygon', color: '#2e7d32' },
  { id: 'tree', label: 'Individual Tree', group: 'Trees & Plants', geometry: 'point', color: '#43a047' },
  { id: 'small_tree', label: 'Small Tree', group: 'Trees & Plants', geometry: 'point', color: '#a5d6a7', like: 'tree' },
  { id: 'bushes', label: 'Bushes', group: 'Trees & Plants', geometry: 'any', color: '#9ccc65', like: 'tree' },

  // Buildings
  { id: 'building', label: 'Building', group: 'Buildings', geometry: 'polygon', color: '#90a4ae' },
  { id: 'house', label: 'House', group: 'Buildings', geometry: 'polygon', color: '#ff7043' },
  { id: 'shed', label: 'Shed', group: 'Buildings', geometry: 'polygon', color: '#bcaaa4' },
  { id: 'church', label: 'Church', group: 'Buildings', geometry: 'polygon', color: '#7e57c2', like: 'building' },
  { id: 'school', label: 'School', group: 'Buildings', geometry: 'polygon', color: '#ec407a', like: 'building' },

  // Water
  { id: 'water', label: 'Water Source', group: 'Water', geometry: 'any', color: '#1e88e5' },
  { id: 'stream', label: 'Stream / Creek', group: 'Water', geometry: 'any', color: '#4fc3f7' },

  // Landmarks
  { id: 'bus_shelter', label: 'Bus Shelter', group: 'Landmarks', geometry: 'any', color: '#26c6da', like: 'building' },
  { id: 'phone_box', label: 'Phone Box', group: 'Landmarks', geometry: 'point', color: '#d50000', like: 'other' },

  // Other
  { id: 'other', label: 'Other', group: 'Other', geometry: 'any', color: '#ab47bc' },
  { id: 'unassigned', label: 'Unassigned', group: 'Other', geometry: 'any', color: '#3bb2d0' },
];

export const TYPE_BY_ID = Object.fromEntries(FEATURE_TYPES.map(t => [t.id, t]));
export const DEFAULT_COLOR = TYPE_BY_ID.unassigned.color;

export function typeLabel(id) {
  return TYPE_BY_ID[id]?.label || id || 'Unassigned';
}

// Can a feature with this GeoJSON geometry type sensibly be this map type?
export function fitsGeometry(type, geometryType) {
  if (!geometryType || type.geometry === 'any') return true;
  return {
    line: ['LineString', 'MultiLineString'],
    polygon: ['Polygon', 'MultiPolygon'],
    point: ['Point', 'MultiPoint'],
  }[type.geometry].includes(geometryType);
}

// MapLibre expression: a value per feature type, read from `property`.
export function byType(property, pick, fallback) {
  const expr = ['match', ['get', property]];
  for (const t of FEATURE_TYPES) {
    const v = pick(t);
    if (v !== undefined && v !== fallback) expr.push(t.id, v);
  }
  expr.push(fallback);
  return expr.length > 3 ? expr : fallback;
}

export const DASHED_TYPES = FEATURE_TYPES.filter(t => t.dash).map(t => t.id);

// Colours for the Render Map styles: their own entry, else the older type it looks like.
export function renderColors(styleColors, id) {
  return styleColors[id] || styleColors[TYPE_BY_ID[id]?.like] || styleColors.unassigned;
}

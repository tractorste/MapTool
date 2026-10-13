// Land details for fields and woods: area in acres, value from a price per acre, and owner.
//
// Feature properties (saved in the map file):
//   owner           who owns it (free text; the same spelling groups fields together)
//   price_per_acre  £ per acre, used to work out the land value
//
// Owner colours are saved at the top level of the map file as `owner_colors`
// ({ "Owner name": "#rrggbb" }).

export const LAND_TYPES = ['field', 'grass_field', 'wood'];
export const isLandType = (type) => LAND_TYPES.includes(type);

const M2_PER_ACRE = 4046.8564224;

// WGS84 ellipsoid. Areas use the Earth's curvature at the ring's own latitude (the Gaussian
// radius), which at County Durham is ~0.2% more accurate than turf.js's single radius.
const WGS84_A = 6378137;
const WGS84_E2 = 0.00669437999014;

function gaussianRadius(latDeg) {
  const s = Math.sin(latDeg * Math.PI / 180);
  const w = 1 - WGS84_E2 * s * s;
  return WGS84_A * Math.sqrt(1 - WGS84_E2) / w;
}

// Area of a ring of [lng, lat] points in m² on a sphere (Chamberlain & Duquette).
function ringArea(coords) {
  let total = 0;
  const n = coords.length;
  if (n < 3) return 0;
  const rad = Math.PI / 180;
  let latSum = 0;
  for (let i = 0; i < n; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[(i + 1) % n];
    total += (lng2 - lng1) * rad * (2 + Math.sin(lat1 * rad) + Math.sin(lat2 * rad));
    latSum += lat1;
  }
  const r = gaussianRadius(latSum / n);
  return Math.abs(total * r * r / 2);
}

function polygonArea(rings) {
  if (!rings?.length) return 0;
  return rings.reduce((sum, ring, i) => sum + (i === 0 ? ringArea(ring) : -ringArea(ring)), 0);
}

export function areaM2(geometry) {
  if (!geometry) return 0;
  if (geometry.type === 'Polygon') return polygonArea(geometry.coordinates);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.reduce((s, p) => s + polygonArea(p), 0);
  return 0;
}

export const acresOf = (feature) => areaM2(feature?.geometry) / M2_PER_ACRE;

export function landValue(feature) {
  const price = Number(feature?.properties?.price_per_acre);
  return Number.isFinite(price) && price > 0 ? acresOf(feature) * price : null;
}

export const formatAcres = (acres) => `${acres.toFixed(2)} acres`;
export const formatMoney = (value) =>
  '£' + Math.round(value).toLocaleString('en-GB');

// Colours handed out to new owners, in order.
const OWNER_PALETTE = ['#e53935', '#1e88e5', '#fdd835', '#8e24aa', '#fb8c00', '#00acc1',
  '#d81b60', '#3949ab', '#7cb342', '#6d4c41', '#00897b', '#5e35b1'];

export function ownersOf(features) {
  const names = new Set();
  features.forEach(f => {
    const o = f.properties?.owner?.trim();
    if (o && isLandType(f.properties?.type)) names.add(o);
  });
  return [...names].sort((a, b) => a.localeCompare(b));
}

// Give every owner on the map a colour, keeping the ones already chosen.
// Returns the same object if nothing needed adding.
export function withOwnerColors(colors, owners) {
  const missing = owners.filter(o => !colors[o]);
  if (!missing.length) return colors;
  const next = { ...colors };
  // Only colours of owners still on the map count as taken, so the half-typed names on the
  // way to a full name don't use up the palette.
  const used = new Set(owners.map(o => next[o]).filter(Boolean));
  missing.forEach((o, i) => {
    next[o] = OWNER_PALETTE.find(c => !used.has(c)) || OWNER_PALETTE[i % OWNER_PALETTE.length];
    used.add(next[o]);
  });
  return next;
}

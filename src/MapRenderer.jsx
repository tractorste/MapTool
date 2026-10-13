import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Download, Palette, FileText } from 'lucide-react';
import { FEATURE_GROUPS, FEATURE_TYPES, renderColors, TYPE_BY_ID } from './featureTypes';
import { acresOf, formatAcres, formatMoney, isLandType, landValue, ownersOf } from './land';

// ── Style Definitions ──
const MAP_STYLES = {
  simple: {
    name: 'Simple',
    description: 'Clean, flat colours with clear outlines',
    bg: '#e8e4d8',
    colors: {
      field: { fill: '#7cb342', stroke: '#558b2f', label: '#33691e' },
      grass_field: { fill: '#8bc34a', stroke: '#689f38', label: '#33691e' },
      wood: { fill: '#2e7d32', stroke: '#1b5e20', label: '#ffffff' },
      building: { fill: '#9e9e9e', stroke: '#616161', label: '#212121' },
      house: { fill: '#795548', stroke: '#4e342e', label: '#ffffff' },
      shed: { fill: '#a1887f', stroke: '#5d4037', label: '#ffffff' },
      road: { fill: '#d7ccc8', stroke: '#8d6e63', label: '#4e342e' },
      fence: { fill: '#795548', stroke: '#4e342e', label: '#3e2723' },
      water: { fill: '#42a5f5', stroke: '#1565c0', label: '#0d47a1' },
      stream: { fill: '#90caf9', stroke: '#1e88e5', label: '#0d47a1' },
      sand: { fill: '#fff9c4', stroke: '#fbc02d', label: '#f57f17' },
      tree: { fill: '#4caf50', stroke: '#2e7d32', label: '#1b5e20' },
      gate: { fill: '#ff9800', stroke: '#e65100', label: '#bf360c' },
      other: { fill: '#ab47bc', stroke: '#6a1b9a', label: '#4a148c' },
      unassigned: { fill: '#bdbdbd', stroke: '#757575', label: '#424242' },
    },
    lineWidth: 4,
    pointRadius: 16,
    font: '28px Inter, sans-serif',
    labelFont: 'bold 26px Inter, sans-serif',
  },
  cartoon: {
    name: 'Cartoon',
    description: 'Bold outlines, bright colours, playful feel',
    bg: '#a5d6a7',
    colors: {
      field: { fill: '#66bb6a', stroke: '#1b5e20', label: '#1b5e20' },
      grass_field: { fill: '#81c784', stroke: '#2e7d32', label: '#1b5e20' },
      wood: { fill: '#388e3c', stroke: '#1b5e20', label: '#ffffff' },
      building: { fill: '#ffcc80', stroke: '#4e342e', label: '#3e2723' },
      house: { fill: '#ffab91', stroke: '#bf360c', label: '#3e2723' },
      shed: { fill: '#d7ccc8', stroke: '#5d4037', label: '#3e2723' },
      road: { fill: '#ffe0b2', stroke: '#6d4c41', label: '#3e2723' },
      fence: { fill: '#8d6e63', stroke: '#3e2723', label: '#3e2723' },
      water: { fill: '#4fc3f7', stroke: '#01579b', label: '#01579b' },
      stream: { fill: '#81d4fa', stroke: '#0277bd', label: '#01579b' },
      sand: { fill: '#fff59d', stroke: '#fbc02d', label: '#f57f17' },
      tree: { fill: '#43a047', stroke: '#1b5e20', label: '#ffffff' },
      gate: { fill: '#ffd54f', stroke: '#f57f17', label: '#e65100' },
      other: { fill: '#ce93d8', stroke: '#6a1b9a', label: '#4a148c' },
      unassigned: { fill: '#e0e0e0', stroke: '#424242', label: '#212121' },
    },
    lineWidth: 8,
    pointRadius: 24,
    font: '32px "Comic Sans MS", cursive, sans-serif',
    labelFont: 'bold 30px "Comic Sans MS", cursive, sans-serif',
  },
  tolkien: {
    name: 'Tolkien / Middle Earth',
    description: 'Aged parchment, hand-drawn ink style',
    bg: '#f5e6c8',
    colors: {
      field: { fill: '#c8b88a', stroke: '#5d4e37', label: '#3e2723' },
      grass_field: { fill: '#b3a97a', stroke: '#5d4e37', label: '#3e2723' },
      wood: { fill: '#7d6b4f', stroke: '#3e2723', label: '#f5e6c8' },
      building: { fill: '#a1887f', stroke: '#4e342e', label: '#3e2723' },
      house: { fill: '#8d6e63', stroke: '#3e2723', label: '#f5e6c8' },
      shed: { fill: '#bcaaa4', stroke: '#4e342e', label: '#3e2723' },
      road: { fill: '#d7ccc8', stroke: '#5d4e37', label: '#3e2723' },
      fence: { fill: '#8d6e63', stroke: '#3e2723', label: '#3e2723' },
      water: { fill: '#90caf9', stroke: '#37474f', label: '#263238' },
      stream: { fill: '#a9d6e5', stroke: '#37474f', label: '#263238' },
      sand: { fill: '#e4d5b7', stroke: '#8d6e63', label: '#5d4e37' },
      tree: { fill: '#6b8e23', stroke: '#3e2723', label: '#f5e6c8' },
      gate: { fill: '#bcaaa4', stroke: '#4e342e', label: '#3e2723' },
      other: { fill: '#d7ccc8', stroke: '#5d4e37', label: '#3e2723' },
      unassigned: { fill: '#d7ccc8', stroke: '#795548', label: '#4e342e' },
    },
    lineWidth: 4,
    pointRadius: 14,
    font: '28px Georgia, "Times New Roman", serif',
    labelFont: 'italic bold 28px Georgia, "Times New Roman", serif',
  },
  ordnance: {
    name: 'Ordnance Survey',
    description: 'Traditional British topographical style',
    bg: '#fefdf4',
    colors: {
      field: { fill: '#e7f3d3', stroke: '#95a5a6', label: '#2c3e50' },
      grass_field: { fill: '#dcf0c0', stroke: '#95a5a6', label: '#2c3e50' },
      wood: { fill: '#7bb369', stroke: '#27ae60', label: '#2c3e50' },
      building: { fill: '#e67e22', stroke: '#2c3e50', label: '#2c3e50' },
      house: { fill: '#f39c12', stroke: '#2c3e50', label: '#2c3e50' },
      shed: { fill: '#d35400', stroke: '#2c3e50', label: '#2c3e50' },
      road: { fill: '#f39c12', stroke: '#2c3e50', label: '#2c3e50' },
      fence: { fill: '#2ecc71', stroke: '#27ae60', label: '#27ae60' },
      water: { fill: '#9fd9f6', stroke: '#2980b9', label: '#2980b9' },
      stream: { fill: '#b3e5fc', stroke: '#2980b9', label: '#2980b9' },
      sand: { fill: '#f9e79f', stroke: '#d4ac0d', label: '#9a7d0a' },
      tree: { fill: '#27ae60', stroke: '#1e8449', label: '#ffffff' },
      gate: { fill: '#95a5a6', stroke: '#2c3e50', label: '#2c3e50' },
      other: { fill: '#bdc3c7', stroke: '#7f8c8d', label: '#2c3e50' },
      unassigned: { fill: '#ecf0f1', stroke: '#95a5a6', label: '#7f8c8d' },
    },
    lineWidth: 3,
    pointRadius: 12,
    font: '24px "Arial", sans-serif',
    labelFont: 'bold 24px "Arial", sans-serif',
  },
};

// ── Geo helpers ──
function getBBox(features) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const visit = (coords) => {
    if (typeof coords[0] === 'number') {
      if (coords[0] < minX) minX = coords[0];
      if (coords[0] > maxX) maxX = coords[0];
      if (coords[1] < minY) minY = coords[1];
      if (coords[1] > maxY) maxY = coords[1];
    } else {
      coords.forEach(visit);
    }
  };
  features.forEach(f => {
    if (f.geometry && f.geometry.coordinates) visit(f.geometry.coordinates);
  });
  return { minX, minY, maxX, maxY };
}

function makeProjection(bbox, width, height, padding = 60) {
  const midLat = (bbox.minY + bbox.maxY) / 2;
  const cosLat = Math.cos(midLat * Math.PI / 180);
  
  // Adjust dx by cos(lat) to maintain physical aspect ratio
  const dx = (bbox.maxX - bbox.minX) * cosLat || 0.001;
  const dy = (bbox.maxY - bbox.minY) || 0.001;
  
  const scale = Math.min((width - padding * 2) / dx, (height - padding * 2) / dy);
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  
  return ([lng, lat]) => [
    width / 2 + (lng - cx) * cosLat * scale,
    height / 2 - (lat - cy) * scale,
  ];
}

// ── Texture Draws ──
function drawGrassTexture(ctx, points, style) {
  if (style !== 'cartoon' && style !== 'tolkien') return;
  ctx.save();
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.clip();
  const bounds = getPointsBounds(points);
  const spacing = style === 'cartoon' ? 36 : 28;
  ctx.strokeStyle = style === 'cartoon' ? '#2e7d32' : '#7d6b4f';
  ctx.lineWidth = style === 'cartoon' ? 3 : 1.6;
  for (let x = bounds.minX; x < bounds.maxX; x += spacing) {
    for (let y = bounds.minY; y < bounds.maxY; y += spacing) {
      const ox = x + (Math.random() - 0.5) * 16;
      const oy = y + (Math.random() - 0.5) * 16;
      drawGrassBlade(ctx, ox, oy, style);
    }
  }
  ctx.restore();
}

function drawGrassBlade(ctx, x, y, style) {
  const h = style === 'cartoon' ? 12 : 8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 3, y - h);
  ctx.moveTo(x, y);
  ctx.lineTo(x + 3, y - h);
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h - 2);
  ctx.stroke();
}

function drawWoodTexture(ctx, points, style) {
  if (style !== 'cartoon' && style !== 'tolkien') return;
  ctx.save();
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.clip();
  const bounds = getPointsBounds(points);
  const spacing = style === 'cartoon' ? 60 : 50;
  ctx.strokeStyle = style === 'cartoon' ? '#1b5e20' : '#3e2723';
  ctx.fillStyle = style === 'cartoon' ? '#2e7d32' : '#5d4e37';
  for (let x = bounds.minX; x < bounds.maxX; x += spacing) {
    for (let y = bounds.minY; y < bounds.maxY; y += spacing) {
      const ox = x + (Math.random() - 0.5) * 30;
      const oy = y + (Math.random() - 0.5) * 30;
      drawTreeIcon(ctx, ox, oy, style);
    }
  }
  ctx.restore();
}

function drawTreeIcon(ctx, x, y, style) {
  const s = style === 'cartoon' ? 18 : 14;
  
  // Top-down tree: a few overlapping circles for the crown
  ctx.save();
  ctx.translate(x, y);
  
  const mainColor = style === 'cartoon' ? '#388e3c' : '#4e3b31';
  const darkColor = style === 'cartoon' ? '#1b5e20' : '#2d241e';
  
  // Main crown circle
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, Math.PI * 2);
  ctx.fillStyle = mainColor;
  ctx.fill();
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Subtle highlights for top-down feel
  ctx.beginPath();
  ctx.arc(-s * 0.2, -s * 0.2, s * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = style === 'cartoon' ? '#4caf50' : '#5d4e37';
  ctx.fill();
  
  ctx.restore();
}

function drawSandTexture(ctx, points, style) {
  ctx.save();
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.clip();
  const bounds = getPointsBounds(points);
  const spacing = 16;
  ctx.fillStyle = style === 'cartoon' ? '#fbc02d' : '#8d6e63';
  for (let x = bounds.minX; x < bounds.maxX; x += spacing) {
    for (let y = bounds.minY; y < bounds.maxY; y += spacing) {
      if (Math.random() > 0.7) {
        const ox = x + (Math.random() - 0.5) * 20;
        const oy = y + (Math.random() - 0.5) * 20;
        ctx.beginPath();
        ctx.arc(ox, oy, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawWaterTexture(ctx, points, style) {
  if (style !== 'cartoon' && style !== 'tolkien') return;
  ctx.save();
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.clip();
  const bounds = getPointsBounds(points);
  const spacing = style === 'cartoon' ? 44 : 32;
  ctx.strokeStyle = style === 'cartoon' ? '#0277bd' : '#546e7a';
  ctx.lineWidth = style === 'cartoon' ? 3 : 1.4;
  for (let y = bounds.minY; y < bounds.maxY; y += spacing) {
    for (let x = bounds.minX; x < bounds.maxX; x += spacing * 2) {
      const ox = x + (Math.random() - 0.5) * 12;
      const oy = y + (Math.random() - 0.5) * 8;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.quadraticCurveTo(ox + 10, oy - 6, ox + 20, oy);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawParchmentTexture(ctx, w, h) {
  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const a = Math.random() * 0.04;
    ctx.fillStyle = `rgba(90,70,40,${a})`;
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawGrid(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 150, 255, 0.15)';
  ctx.lineWidth = 2;
  const step = 200;
  for (let x = step; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = step; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCompass(ctx, x, y, size, style) {
  ctx.save();
  ctx.translate(x, y);
  // Circle
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.strokeStyle = style === 'tolkien' ? '#5d4e37' : '#455a64';
  ctx.lineWidth = style === 'cartoon' ? 6 : 3;
  ctx.stroke();
  // N arrow
  ctx.beginPath();
  ctx.moveTo(0, -size + 8);
  ctx.lineTo(-10, 8);
  ctx.lineTo(10, 8);
  ctx.closePath();
  ctx.fillStyle = style === 'tolkien' ? '#5d4e37' : '#d32f2f';
  ctx.fill();
  // N label
  ctx.fillStyle = style === 'tolkien' ? '#5d4e37' : '#212121';
  ctx.font = style === 'tolkien' ? 'italic bold 24px Georgia, serif' : 'bold 22px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', 0, -size - 12);
  ctx.restore();
}

function drawBorder(ctx, w, h, style) {
  if (style === 'tolkien') {
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 6;
    const m = 24;
    ctx.strokeRect(m, m, w - m * 2, h - m * 2);
    ctx.strokeStyle = '#a1887f';
    ctx.lineWidth = 2;
    ctx.strokeRect(m + 10, m + 10, w - (m + 10) * 2, h - (m + 10) * 2);
  } else if (style === 'cartoon') {
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 12;
    ctx.strokeRect(12, 12, w - 24, h - 24);
  } else {
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, w - 16, h - 16);
  }
}

function getPointsBounds(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });
  return { minX, minY, maxX, maxY };
}

function getScaledFont(fontStr, multiplier) {
  return fontStr.replace(/(\d+)px/, (_, size) => `${Math.round(parseInt(size) * multiplier)}px`);
}

function getCentroid(points) {
  let sx = 0, sy = 0;
  points.forEach(([x, y]) => { sx += x; sy += y; });
  return [sx / points.length, sy / points.length];
}

// Labels: the first line (the name) in the style's label font, any more (acres, value) a
// bit smaller. Empty lines are left out. `anchor` is where (x, y) is on the block of text:
// 'middle', 'bottom' or 'top'.
function drawLabel(ctx, allLines, x, y, anchor, rotationDeg, style, styleName, fontScale, color) {
  const kept = allLines.map((text, i) => [text, i]).filter(([text]) => text);
  if (!kept.length) return;
  const lines = kept.map(([text]) => text);
  const fonts = kept.map(([, i]) => i === 0
    ? getScaledFont(style.labelFont, fontScale)
    : getScaledFont(style.font, fontScale * 0.75));
  const sizes = fonts.map(f => parseInt(f.match(/(\d+)px/)[1]));
  const heights = sizes.map(s => s * 1.15);
  const total = heights.reduce((a, b) => a + b, 0);
  let ty = anchor === 'middle' ? -total / 2 : anchor === 'bottom' ? -total : 0;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotationDeg * Math.PI / 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  lines.forEach((text, i) => {
    ctx.font = fonts[i];
    if (styleName !== 'simple' || i > 0) {
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = styleName === 'tolkien' ? 'rgba(245, 230, 200, 0.8)' : 'rgba(255, 255, 255, 0.8)';
      ctx.strokeText(text, 0, ty);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, 0, ty);
    ty += heights[i];
  });
  ctx.restore();
}

function labelPos(feature, project, fallback) {
  const p = feature.properties || {};
  if (p.labelLng !== undefined && p.labelLat !== undefined) return project([p.labelLng, p.labelLat]);
  return fallback;
}

// Owner key: a colour swatch, the owner, and their total acres / value.
function drawLegend(ctx, entries, W, H, style, styleName, fontScale, opts) {
  if (!entries.length) return;
  const titleFont = getScaledFont(style.labelFont, fontScale * 1.1);
  const rowFont = getScaledFont(style.font, fontScale);
  const rowSize = parseInt(rowFont.match(/(\d+)px/)[1]);
  const titleSize = parseInt(titleFont.match(/(\d+)px/)[1]);
  const rowH = rowSize * 1.6;
  const pad = 20;
  const swatch = rowSize * 1.1;

  const detail = (e) => [
    opts.showAcres ? formatAcres(e.acres) : null,
    opts.showValue && e.value ? formatMoney(e.value) : null,
  ].filter(Boolean).join('  ·  ');
  const rows = [...entries];
  if (entries.length > 1 && (opts.showAcres || opts.showValue)) {
    rows.push({
      owner: 'Total', total: true,
      acres: entries.reduce((s, e) => s + e.acres, 0),
      value: entries.reduce((s, e) => s + (e.value || 0), 0),
    });
  }

  ctx.save();
  ctx.font = rowFont;
  let nameW = 0, detailW = 0;
  rows.forEach(e => {
    ctx.font = e.total ? getScaledFont(style.labelFont, fontScale) : rowFont;
    nameW = Math.max(nameW, ctx.measureText(e.owner).width);
    detailW = Math.max(detailW, ctx.measureText(detail(e)).width);
  });
  ctx.font = titleFont;
  const titleW = ctx.measureText('Owners').width;
  const boxW = Math.max(titleW, swatch + 12 + nameW + (detailW ? 28 + detailW : 0)) + pad * 2;
  const boxH = pad * 2 + titleSize * 1.4 + rows.length * rowH;
  const x = 56, y = H - 56 - boxH;

  ctx.fillStyle = styleName === 'tolkien' ? 'rgba(245, 230, 200, 0.92)' : 'rgba(255, 255, 255, 0.92)';
  ctx.strokeStyle = styleName === 'tolkien' ? '#8d6e63' : '#90a4ae';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(x, y, boxW, boxH);
  ctx.fill();
  ctx.stroke();

  const ink = styleName === 'tolkien' ? '#3e2723' : '#263238';
  ctx.fillStyle = ink;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = titleFont;
  ctx.fillText('Owners', x + pad, y + pad);

  let ry = y + pad + titleSize * 1.4;
  rows.forEach(e => {
    const cy = ry + rowH / 2;
    if (e.total) {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + pad, ry + 2);
      ctx.lineTo(x + boxW - pad, ry + 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = e.color;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(x + pad, cy - swatch / 2, swatch, swatch);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x + pad, cy - swatch / 2, swatch, swatch);
    }
    ctx.fillStyle = ink;
    ctx.textBaseline = 'middle';
    ctx.font = e.total ? getScaledFont(style.labelFont, fontScale) : rowFont;
    ctx.fillText(e.owner, x + pad + swatch + 12, cy);
    const d = detail(e);
    if (d) {
      ctx.textAlign = 'right';
      ctx.fillText(d, x + boxW - pad, cy);
      ctx.textAlign = 'left';
    }
    ry += rowH;
  });
  ctx.restore();
}

// ── Main render function ──
// opts: styleName, fontScale, title, hiddenTypes (Set), showLabels, showAcres, showValue,
//       showOwners, hiddenOwners (Set), ownerColors, showLegend
function renderMap(canvas, allFeatures, W, H, opts) {
  const { styleName, fontScale } = opts;
  const style = MAP_STYLES[styleName];
  const ctx = canvas.getContext('2d');
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);

  const features = allFeatures.filter(f => !opts.hiddenTypes.has(f.properties?.type || 'unassigned'));
  const ownerColor = (f) => {
    const owner = f.properties?.owner?.trim();
    if (!opts.showOwners || !owner || !isLandType(f.properties?.type) || opts.hiddenOwners.has(owner)) return null;
    return opts.ownerColors[owner] || null;
  };

  // Background
  ctx.fillStyle = style.bg;
  ctx.fillRect(0, 0, W, H);

  if (styleName === 'ordnance') drawGrid(ctx, W, H);
  if (styleName === 'tolkien') drawParchmentTexture(ctx, W, H);

  if (!features || features.length === 0) {
    ctx.fillStyle = '#666';
    ctx.font = '20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No features to render', W / 2, H / 2);
    drawBorder(ctx, W, H, styleName);
    return;
  }

  // Frame what is switched on, so e.g. just the fields fill the page
  const bbox = getBBox(features);
  const project = makeProjection(bbox, W, H, 80);

  // Sort: polygons first, then lines, then points
  const sorted = [...features].sort((a, b) => {
    const order = { Polygon: 0, MultiPolygon: 0, LineString: 1, MultiLineString: 1, Point: 2 };
    return (order[a.geometry?.type] ?? 1) - (order[b.geometry?.type] ?? 1);
  });

  // Labels go on top of everything, so a line or a neighbouring field can't cover them
  const labels = [];

  sorted.forEach(feature => {
    const geom = feature.geometry;
    if (!geom) return;
    const fType = feature.properties?.type || 'unassigned';
    const colors = renderColors(style.colors, fType);
    const kind = TYPE_BY_ID[fType]?.like || fType;  // newer types draw like the older one
    const name = feature.properties?.name || '';
    const showLabel = opts.showLabels && feature.properties?.showLabel !== false;
    const rotation = feature.properties?.labelRotation || 0;

    if (geom.type === 'Polygon') {
      const ring = geom.coordinates[0].map(project);
      const trace = () => {
        ctx.beginPath();
        ring.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.closePath();
      };
      // Fill
      trace();
      ctx.fillStyle = colors.fill;
      ctx.globalAlpha = styleName === 'tolkien' ? 0.5 : 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
      // Texture
      if (fType === 'field' || fType === 'grass_field') drawGrassTexture(ctx, ring, styleName);
      if (fType === 'water' || fType === 'stream') drawWaterTexture(ctx, ring, styleName);
      if (fType === 'wood') drawWoodTexture(ctx, ring, styleName);
      if (fType === 'sand') drawSandTexture(ctx, ring, styleName);
      // Owner highlight
      const oc = ownerColor(feature);
      if (oc) {
        trace();
        ctx.fillStyle = oc;
        ctx.globalAlpha = 0.45;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Stroke
      trace();
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = style.lineWidth;
      if (styleName === 'cartoon') ctx.lineWidth = 4;
      ctx.stroke();
      if (oc) {
        // Inside edge in the owner's colour, so neighbouring owners stay distinct
        ctx.save();
        trace();
        ctx.clip();
        trace();
        ctx.strokeStyle = oc;
        ctx.lineWidth = style.lineWidth * 3;
        ctx.stroke();
        ctx.restore();
      }

      // Roof ridge for top-down building look
      if ((styleName === 'cartoon' || styleName === 'tolkien') && (fType === 'building' || fType === 'house' || fType === 'shed')) {
        const [cx, cy] = getCentroid(ring);
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy);
        ctx.lineTo(cx + 10, cy);
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      if (showLabel) {
        const lines = [name];
        // Acres and value on fields and woods that are named or owned (not every scrap of
        // OpenStreetMap woodland round about)
        if (isLandType(fType) && (name || feature.properties?.owner?.trim())) {
          lines.push(opts.showAcres ? formatAcres(acresOf(feature)) : '');
          const value = landValue(feature);
          if (opts.showValue && value !== null) lines.push(formatMoney(value));
        }
        const [lx, ly] = labelPos(feature, project, getCentroid(ring));
        labels.push([lines, lx, ly, 'middle', rotation, colors.label]);
      }
    } else if (geom.type === 'LineString') {
      const pts = geom.coordinates.map(project);
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.strokeStyle = colors.stroke;
      const widthScale = { a_road: 3.5, b_road: 3, footpath: 1, hedge: 2.5, stone_wall: 2 }[fType]
        ?? ((kind === 'road' || kind === 'stream') ? 2.5 : 1.5);
      ctx.lineWidth = style.lineWidth * widthScale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if ((styleName === 'tolkien' || styleName === 'ordnance') && kind === 'fence' && fType !== 'stone_wall') {
        ctx.setLineDash([6, 4]);
      } else if (fType === 'footpath') {
        ctx.setLineDash([style.lineWidth * 3, style.lineWidth * 2]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      if (name && pts.length >= 2 && showLabel) {
        const mid = pts[Math.floor(pts.length / 2)];
        const [lx, ly] = labelPos(feature, project, [mid[0], mid[1] - 6 * fontScale]);
        labels.push([[name], lx, ly, 'bottom', rotation, colors.label]);
      }
    } else if (geom.type === 'Point') {
      const [px, py] = project(geom.coordinates);
      if (kind === 'tree' && (styleName === 'cartoon' || styleName === 'tolkien')) {
        drawTreeIcon(ctx, px, py, styleName);
      } else {
        ctx.beginPath();
        ctx.arc(px, py, style.pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = colors.fill;
        ctx.fill();
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = style.lineWidth;
        if (styleName === 'cartoon') ctx.lineWidth = 3;
        ctx.stroke();
        // Inner dot
        ctx.beginPath();
        ctx.arc(px, py, style.pointRadius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = colors.stroke;
        ctx.fill();
      }
      if (name && showLabel) {
        const [lx, ly] = labelPos(feature, project, [px, py + style.pointRadius + 4 * fontScale]);
        labels.push([[name], lx, ly, 'top', rotation, colors.label]);
      }
    }
  });

  labels.forEach(([lines, x, y, anchor, rotation, color]) =>
    drawLabel(ctx, lines, x, y, anchor, rotation, style, styleName, fontScale, color));

  // Title
  if (opts.title) {
    ctx.font = getScaledFont(styleName === 'tolkien'
      ? 'italic bold 44px Georgia, serif'
      : styleName === 'cartoon'
        ? 'bold 44px "Comic Sans MS", cursive'
        : 'bold 40px Inter, sans-serif', fontScale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = styleName === 'tolkien' ? '#4e342e' : '#263238';
    ctx.fillText(opts.title, W / 2, 48);
  }

  // Owner legend
  if (opts.showOwners && opts.showLegend) {
    const byOwner = new Map();
    features.forEach(f => {
      if (!ownerColor(f)) return;
      const owner = f.properties.owner.trim();
      const e = byOwner.get(owner) || { owner, color: ownerColor(f), acres: 0, value: 0 };
      e.acres += acresOf(f);
      e.value += landValue(f) || 0;
      byOwner.set(owner, e);
    });
    const entries = [...byOwner.values()].sort((a, b) => a.owner.localeCompare(b.owner));
    drawLegend(ctx, entries, W, H, style, styleName, fontScale, opts);
  }

  // Compass rose
  drawCompass(ctx, W - 110, H - 110, 44, styleName);

  // Border
  drawBorder(ctx, W, H, styleName);
}

// ── Paper sizes ──
// The map is laid out on a page 2400 units across its long side, then drawn at the
// paper's print resolution, so A3 is the same map as A4 printed bigger.
const PRINT_DPI = 300;
const PAPERS = {
  screen: { name: 'Screen', mm: null },
  a4: { name: 'A4', mm: [297, 210] },
  a3: { name: 'A3', mm: [420, 297] },
};

function pageLayout(paper, orientation) {
  const mm = PAPERS[paper].mm;
  let W = 2400, H = mm ? Math.round(2400 * mm[1] / mm[0]) : 1600;
  let pxW = mm ? Math.round(mm[0] / 25.4 * PRINT_DPI) : 2400;
  let pxH = mm ? Math.round(mm[1] / 25.4 * PRINT_DPI) : 1600;
  let mmW = mm?.[0], mmH = mm?.[1];
  if (orientation === 'portrait') {
    [W, H] = [H, W];
    [pxW, pxH] = [pxH, pxW];
    [mmW, mmH] = [mmH, mmW];
  }
  return { W, H, pxW, pxH, mmW, mmH };
}

// Render choices are remembered in this browser between visits.
const SETTINGS_KEY = 'maptool-render-settings';
const DEFAULT_SETTINGS = {
  style: 'ordnance', fontScale: 1, title: 'Farm Map', paper: 'screen', orientation: 'landscape',
  hiddenTypes: [], showLabels: true, showAcres: true, showValue: false,
  showOwners: true, showLegend: true, hiddenOwners: [],
};

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// ── React Component ──
export default function MapRendererModal({ features, ownerColors, setOwnerColors, onClose }) {
  const canvasRef = useRef(null);
  const [settings, setSettings] = useState(loadSettings);
  const set = (key, value) => setSettings(s => ({ ...s, [key]: value }));
  const toggleIn = (key, id) => setSettings(s => ({
    ...s, [key]: s[key].includes(id) ? s[key].filter(x => x !== id) : [...s[key], id],
  }));
  const [zoom, setZoom] = useState(0.6); // Default zoom level to show more at once
  const [busy, setBusy] = useState(false);
  const scrollContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const layout = pageLayout(settings.paper, settings.orientation);
  const presentTypes = new Set(features.map(f => f.properties?.type || 'unassigned'));
  const owners = ownersOf(features);

  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* storage unavailable */ }
  }, [settings]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = layout.pxW;
    canvas.height = layout.pxH;
    renderMap(canvas, features, layout.W, layout.H, {
      styleName: settings.style,
      fontScale: settings.fontScale,
      title: settings.title,
      hiddenTypes: new Set(settings.hiddenTypes),
      showLabels: settings.showLabels,
      showAcres: settings.showAcres,
      showValue: settings.showValue,
      showOwners: settings.showOwners,
      showLegend: settings.showLegend,
      hiddenOwners: new Set(settings.hiddenOwners),
      ownerColors,
    });
  }, [features, settings, ownerColors, layout.W, layout.H, layout.pxW, layout.pxH]);

  const onMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setStartY(e.pageY - scrollContainerRef.current.offsetTop);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    setScrollTop(scrollContainerRef.current.scrollTop);
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const y = e.pageY - scrollContainerRef.current.offsetTop;
    const walkX = (x - startX);
    const walkY = (y - startY);
    scrollContainerRef.current.scrollLeft = scrollLeft - walkX;
    scrollContainerRef.current.scrollTop = scrollTop - walkY;
  };

  useEffect(() => { redraw(); }, [redraw]);

  const fileBase = `farm_map_${settings.style}${settings.paper === 'screen' ? '' : `_${settings.paper}`}`;

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${fileBase}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePdf = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const { jsPDF } = await import('jspdf');
      const portrait = settings.orientation === 'portrait';
      const pdf = layout.mmW
        ? new jsPDF({ orientation: portrait ? 'portrait' : 'landscape', unit: 'mm', format: settings.paper })
        : new jsPDF({ orientation: 'landscape', unit: 'px', format: [layout.pxW, layout.pxH], hotfixes: ['px_scaling'] });
      const w = layout.mmW || layout.pxW, h = layout.mmH || layout.pxH;
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, w, h);
      pdf.save(`${fileBase}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="renderer-overlay" onClick={onClose}>
      <div className="renderer-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="renderer-header">
          <div className="renderer-title">
            <Palette size={20} />
            <h2>Artistic Map Preview</h2>
          </div>
          <button className="renderer-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="renderer-body">
          {/* Options */}
          <aside className="renderer-sidebar">
            <section>
              <h3>Map Style</h3>
              <div className="renderer-styles">
                {Object.entries(MAP_STYLES).map(([key, s]) => (
                  <button
                    key={key}
                    className={`style-card ${settings.style === key ? 'active' : ''}`}
                    onClick={() => set('style', key)}
                  >
                    <span className="style-swatch" style={{ background: s.bg }} />
                    <span className="style-name">{s.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3>Page</h3>
              <div className="segmented">
                {Object.entries(PAPERS).map(([key, p]) => (
                  <button key={key} className={settings.paper === key ? 'active' : ''} onClick={() => set('paper', key)}>
                    {p.name}
                  </button>
                ))}
              </div>
              {settings.paper !== 'screen' && (
                <div className="segmented">
                  {['landscape', 'portrait'].map(o => (
                    <button key={o} className={settings.orientation === o ? 'active' : ''} onClick={() => set('orientation', o)}>
                      {o === 'landscape' ? 'Landscape' : 'Portrait'}
                    </button>
                  ))}
                </div>
              )}
              <label className="field-label">
                Title
                <input type="text" value={settings.title} onChange={(e) => set('title', e.target.value)} placeholder="No title" />
              </label>
              <label className="field-label">
                Font size: {Math.round(settings.fontScale * 100)}%
                <input type="range" min="0.5" max="2.5" step="0.1" value={settings.fontScale}
                  onChange={(e) => set('fontScale', parseFloat(e.target.value))} />
              </label>
              <label className="field-label">
                Preview zoom: {Math.round(zoom * 100)}%
                <input type="range" min="0.2" max="1.5" step="0.05" value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))} />
              </label>
            </section>

            <section>
              <h3>Labels &amp; Land</h3>
              <label className="check">
                <input type="checkbox" checked={settings.showLabels} onChange={(e) => set('showLabels', e.target.checked)} />
                Labels
              </label>
              <label className={`check ${settings.showLabels ? '' : 'disabled'}`}>
                <input type="checkbox" disabled={!settings.showLabels} checked={settings.showAcres}
                  onChange={(e) => set('showAcres', e.target.checked)} />
                Acres
              </label>
              <label className={`check ${settings.showLabels ? '' : 'disabled'}`}>
                <input type="checkbox" disabled={!settings.showLabels} checked={settings.showValue}
                  onChange={(e) => set('showValue', e.target.checked)} />
                Land value
              </label>
            </section>

            <section>
              <h3>Owners</h3>
              {owners.length === 0 ? (
                <p className="hint">Give fields and woods an owner (in Feature Properties) to colour them by owner.</p>
              ) : (
                <>
                  <label className="check">
                    <input type="checkbox" checked={settings.showOwners} onChange={(e) => set('showOwners', e.target.checked)} />
                    Highlight by owner
                  </label>
                  <label className={`check ${settings.showOwners ? '' : 'disabled'}`}>
                    <input type="checkbox" disabled={!settings.showOwners} checked={settings.showLegend}
                      onChange={(e) => set('showLegend', e.target.checked)} />
                    Legend
                  </label>
                  <div className={`owner-list ${settings.showOwners ? '' : 'disabled'}`}>
                    {owners.map(o => (
                      <div key={o} className="owner-item">
                        <input type="checkbox" disabled={!settings.showOwners}
                          checked={!settings.hiddenOwners.includes(o)} onChange={() => toggleIn('hiddenOwners', o)} />
                        <input type="color" disabled={!settings.showOwners} value={ownerColors[o] || '#888888'}
                          onChange={(e) => setOwnerColors({ ...ownerColors, [o]: e.target.value })} />
                        <span>{o}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section>
              <h3>Categories</h3>
              <div className="button-row">
                <button className="link-btn" onClick={() => set('hiddenTypes', [])}>All</button>
                <button className="link-btn" onClick={() => set('hiddenTypes', [...presentTypes])}>None</button>
              </div>
              {FEATURE_GROUPS.map(g => {
                const types = FEATURE_TYPES.filter(t => t.group === g && presentTypes.has(t.id));
                return types.length ? (
                  <div key={g} className="category-group">
                    <h4>{g}</h4>
                    {types.map(t => (
                      <label key={t.id} className="check">
                        <input type="checkbox" checked={!settings.hiddenTypes.includes(t.id)}
                          onChange={() => toggleIn('hiddenTypes', t.id)} />
                        <span className="swatch" style={{ background: t.color }} />
                        {t.label}
                      </label>
                    ))}
                  </div>
                ) : null;
              })}
            </section>
          </aside>

          {/* Canvas */}
          <div
            className={`renderer-canvas-wrap ${isDragging ? 'dragging' : ''}`}
            ref={scrollContainerRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: `${layout.W * zoom}px`,
                height: `${layout.H * zoom}px`
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="renderer-footer">
          <span className="renderer-size">
            {layout.mmW ? `${PAPERS[settings.paper].name} ${settings.orientation}, ${layout.pxW} × ${layout.pxH} px (${PRINT_DPI} dpi)` : `${layout.pxW} × ${layout.pxH} px`}
          </span>
          <button className="renderer-download" onClick={handleDownload}>
            <Download size={16} /> Download PNG
          </button>
          <button className="renderer-download pdf" onClick={handlePdf} disabled={busy}>
            <FileText size={16} /> {busy ? 'Making PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Download, Palette } from 'lucide-react';

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
      wood: { fill: '#7bb369', stroke: '#27ae60', label: '#ffffff' },
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

// ── Main render function ──
function renderMap(canvas, features, styleName, fontScale = 1) {
  const style = MAP_STYLES[styleName];
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

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

  const bbox = getBBox(features);
  const project = makeProjection(bbox, W, H, 80);

  // Sort: polygons first, then lines, then points
  const sorted = [...features].sort((a, b) => {
    const order = { Polygon: 0, MultiPolygon: 0, LineString: 1, MultiLineString: 1, Point: 2 };
    return (order[a.geometry?.type] ?? 1) - (order[b.geometry?.type] ?? 1);
  });

  sorted.forEach(feature => {
    const geom = feature.geometry;
    if (!geom) return;
    const fType = feature.properties?.type || 'unassigned';
    const colors = style.colors[fType] || style.colors.unassigned;
    const name = feature.properties?.name || '';

    if (geom.type === 'Polygon') {
      const ring = geom.coordinates[0].map(project);
      // Fill
      ctx.beginPath();
      ring.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = colors.fill;
      ctx.globalAlpha = styleName === 'tolkien' ? 0.5 : 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
      // Texture
      if (fType === 'field' || fType === 'grass_field') drawGrassTexture(ctx, ring, styleName);
      if (fType === 'water' || fType === 'stream') drawWaterTexture(ctx, ring, styleName);
      if (fType === 'wood') drawWoodTexture(ctx, ring, styleName);
      if (fType === 'sand') drawSandTexture(ctx, ring, styleName);
      // Stroke
      ctx.beginPath();
      ring.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = style.lineWidth;
      if (styleName === 'cartoon') ctx.lineWidth = 4;
      ctx.stroke();
      
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

      const showLabel = feature.properties?.showLabel !== false;

      // Label
      if (name && showLabel) {
        const [cx, cy] = getCentroid(ring);
        ctx.font = getScaledFont(style.labelFont, fontScale);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (styleName !== 'tolkien') {
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          const tw = ctx.measureText(name).width;
          const th = 20 * fontScale;
          ctx.fillRect(cx - tw / 2 - 4, cy - th / 2, tw + 8, th);
        }
        ctx.fillStyle = colors.label;
        ctx.fillText(name, cx, cy);
      }
    } else if (geom.type === 'LineString') {
      const pts = geom.coordinates.map(project);
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = (fType === 'road' || fType === 'stream') ? style.lineWidth * 2.5 : style.lineWidth * 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if ((styleName === 'tolkien' || styleName === 'ordnance') && fType === 'fence') {
        ctx.setLineDash([6, 4]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      const showLabel = feature.properties?.showLabel !== false;
      if (name && pts.length >= 2 && showLabel) {
        const mid = pts[Math.floor(pts.length / 2)];
        ctx.font = getScaledFont(style.labelFont, fontScale);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = colors.label;
        ctx.fillText(name, mid[0], mid[1] - (6 * fontScale));
      }
    } else if (geom.type === 'Point') {
      const [px, py] = project(geom.coordinates);
      if (fType === 'tree' && (styleName === 'cartoon' || styleName === 'tolkien')) {
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
      const showLabel = feature.properties?.showLabel !== false;
      if (name && showLabel) {
        ctx.font = getScaledFont(style.labelFont, fontScale);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = colors.label;
        ctx.fillText(name, px, py + style.pointRadius + (4 * fontScale));
      }
    }
  });

  // Title
  ctx.font = getScaledFont(styleName === 'tolkien'
    ? 'italic bold 44px Georgia, serif'
    : styleName === 'cartoon'
      ? 'bold 44px "Comic Sans MS", cursive'
      : 'bold 40px Inter, sans-serif', fontScale);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = styleName === 'tolkien' ? '#4e342e' : '#263238';
  ctx.fillText('Farm Map', W / 2, 48);
 
  // Compass rose
  drawCompass(ctx, W - 110, H - 110, 44, styleName);

  // Border
  drawBorder(ctx, W, H, styleName);
}

// ── React Component ──
export default function MapRendererModal({ features, onClose }) {
  const canvasRef = useRef(null);
  const [activeStyle, setActiveStyle] = useState('simple');
  const [fontScale, setFontScale] = useState(1);
  const [zoom, setZoom] = useState(0.6); // Default zoom level to show more at once
  const scrollContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // High-detail resolution
    canvas.width = 2400;
    canvas.height = 1600;
    renderMap(canvas, features, activeStyle, fontScale);
  }, [features, activeStyle, fontScale]);

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

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `farm_map_${activeStyle}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

        {/* Style & Adjustment Controls */}
        <div className="renderer-controls">
          <div className="control-group">
            <h3>Map Style</h3>
            <div className="renderer-styles">
              {Object.entries(MAP_STYLES).map(([key, s]) => (
                <button
                  key={key}
                  className={`style-card ${activeStyle === key ? 'active' : ''}`}
                  onClick={() => setActiveStyle(key)}
                >
                  <span className="style-swatch" style={{ background: s.bg }} />
                  <div className="style-info">
                    <span className="style-name">{s.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="control-divider" />

          <div className="adjustment-grid">
            <div className="adj-group">
              <label>Zoom: {Math.round(zoom * 100)}%</label>
              <input 
                type="range" 
                min="0.2" 
                max="1.5" 
                step="0.05" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))} 
              />
            </div>
            <div className="adj-group">
              <label>Font Size: {Math.round(fontScale * 100)}%</label>
              <input 
                type="range" 
                min="0.5" 
                max="2.5" 
                step="0.1" 
                value={fontScale} 
                onChange={(e) => setFontScale(parseFloat(e.target.value))} 
              />
            </div>
          </div>
        </div>

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
              width: `${2400 * zoom}px`, 
              height: `${1600 * zoom}px` 
            }} 
          />
        </div>

        {/* Footer */}
        <div className="renderer-footer">
          <button className="renderer-download" onClick={handleDownload}>
            <Download size={16} /> Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}

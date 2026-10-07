import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Pencil, Upload, X, XCircle } from 'lucide-react';
import { FEATURE_GROUPS, FEATURE_TYPES, TYPE_BY_ID, byType, DEFAULT_COLOR, fitsGeometry } from './featureTypes';

// Review of suggested additions (e.g. from the LiDAR detector): each one is shown on the
// map with a dashed outline; Accept adds it to the map as an ordinary feature, Reject
// remembers its id (saved in the map file) so a later run doesn't suggest it again.
//
// A suggestions file is a GeoJSON FeatureCollection; each feature's properties have
//   suggestion_id  stable id (same thing found again -> same id)
//   type           a feature type id from featureTypes.js
//   confidence     0..1
//   detector       what found it (e.g. "lidar-hedge")
//   reason         one line on why, shown to the reviewer
// and optionally name / height / width, which are copied onto the accepted feature.

const SOURCE = 'suggestions-source';
const LAYERS = ['sugg-fill', 'sugg-line', 'sugg-point'];
const KEEP_PROPS = ['name', 'height', 'width', 'surface'];
const color = byType('type', t => t.color, DEFAULT_COLOR);

function bounds(geometry) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = c => {
    if (typeof c[0] === 'number') {
      minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]);
      minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]);
    } else c.forEach(walk);
  };
  walk(geometry.coordinates);
  return [[minX, minY], [maxX, maxY]];
}

function centre(geometry) {
  const [[a, b], [c, d]] = bounds(geometry);
  return [(a + c) / 2, (b + d) / 2];
}

// A simple stable id for suggestions that arrive without one.
function hashId(feature) {
  const s = (feature.properties?.type || '') + JSON.stringify(feature.geometry);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return 'h' + (h >>> 0).toString(16);
}

// Review order: by type, then sweeping across the map in ~200 m bands, so you move
// along rather than jumping about.
function reviewOrder(a, b) {
  const ta = FEATURE_TYPES.indexOf(TYPE_BY_ID[a.properties.type]);
  const tb = FEATURE_TYPES.indexOf(TYPE_BY_ID[b.properties.type]);
  if (ta !== tb) return ta - tb;
  const [ax, ay] = centre(a.geometry), [bx, by] = centre(b.geometry);
  const ba = Math.floor(ay / 0.002), bb = Math.floor(by / 0.002);
  if (ba !== bb) return bb - ba;
  return ba % 2 ? bx - ax : ax - bx;
}

export default function SuggestionsPanel({ map, draw, pending, setPending, rejected, setRejected, onAdded, onClose, visible }) {
  const [index, setIndex] = useState(0);
  const [shownTypes, setShownTypes] = useState(null);  // null = all
  const [minConfidence, setMinConfidence] = useState(0);
  const fileRef = useRef(null);
  const handled = useRef(new Set());  // ids already accepted/rejected (keys can beat a re-render)

  const shown = useMemo(() => pending.filter(f =>
    (shownTypes === null || shownTypes.has(f.properties.type)) &&
    (f.properties.confidence ?? 1) >= minConfidence), [pending, shownTypes, minConfidence]);
  const current = shown.length ? shown[Math.min(index, shown.length - 1)] : null;
  const counts = useMemo(() => {
    const c = {};
    pending.forEach(f => { c[f.properties.type] = (c[f.properties.type] || 0) + 1; });
    return c;
  }, [pending]);

  // --- map layers
  const ensureLayers = () => {
    const m = map.current;
    if (!m || !m.isStyleLoaded() || m.getSource(SOURCE)) return;
    m.addSource(SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    m.addLayer({ id: 'sugg-fill', type: 'fill', source: SOURCE, filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': color, 'fill-opacity': 0.25 } });
    m.addLayer({ id: 'sugg-current-line', type: 'line', source: SOURCE, filter: ['==', ['get', 'suggestion_id'], ''],
      paint: { 'line-color': '#ff00ff', 'line-width': 9, 'line-opacity': 0.55 } });
    m.addLayer({ id: 'sugg-line', type: 'line', source: SOURCE, filter: ['!=', ['geometry-type'], 'Point'],
      paint: { 'line-color': color, 'line-width': 3, 'line-dasharray': [1.5, 1] } });
    m.addLayer({ id: 'sugg-current-point', type: 'circle', source: SOURCE,
      filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'suggestion_id'], '']],
      paint: { 'circle-radius': 13, 'circle-color': '#ff00ff', 'circle-opacity': 0.45 } });
    m.addLayer({ id: 'sugg-point', type: 'circle', source: SOURCE, filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-radius': 6, 'circle-color': color, 'circle-stroke-color': '#ff00ff', 'circle-stroke-width': 2 } });
  };

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const refresh = () => {
      ensureLayers();
      const src = m.getSource(SOURCE);
      if (!src) return;
      src.setData({ type: 'FeatureCollection', features: visible ? shown : [] });
      const id = (visible && current?.properties.suggestion_id) || '';
      m.setFilter('sugg-current-line', ['==', ['get', 'suggestion_id'], id]);
      m.setFilter('sugg-current-point', ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'suggestion_id'], id]]);
    };
    refresh();
    m.on('styledata', refresh);  // switching base map wipes our layers
    return () => m.off('styledata', refresh);
  }, [map, shown, current, visible]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Click a suggestion on the map to review it.
  useEffect(() => {
    const m = map.current;
    if (!m || !visible) return;
    const onClick = e => {
      if (draw.current?.getMode() !== 'simple_select') return;
      const hit = m.queryRenderedFeatures(e.point, { layers: LAYERS.filter(l => m.getLayer(l)) })[0];
      if (!hit) return;
      const i = shown.findIndex(f => f.properties.suggestion_id === hit.properties.suggestion_id);
      if (i >= 0) setIndex(i);
    };
    m.on('click', onClick);
    return () => m.off('click', onClick);
  }, [map, draw, shown, visible]);

  // Fly to the one being reviewed.
  const currentId = current?.properties.suggestion_id;
  useEffect(() => {
    if (!visible || !current || !map.current) return;
    map.current.fitBounds(bounds(current.geometry), { padding: 160, maxZoom: 18, duration: 600 });
  }, [currentId, visible]);  // eslint-disable-line react-hooks/exhaustive-deps

  // --- actions
  const remove = ids => setPending(p => p.filter(f => !ids.has(f.properties.suggestion_id)));

  const toFeature = s => {
    const props = { type: s.properties.type };
    KEEP_PROPS.forEach(k => { if (s.properties[k] !== undefined && s.properties[k] !== '') props[k] = s.properties[k]; });
    // No `source`: once accepted, it's yours, like anything you drew.
    props.detected_by = s.properties.detector || 'suggestion';
    props.suggestion_id = s.properties.suggestion_id;
    return { type: 'Feature', geometry: s.geometry, properties: props };
  };

  const claim = s => {
    const id = s.properties.suggestion_id;
    if (handled.current.has(id)) return false;
    handled.current.add(id);
    return true;
  };

  const accept = (edit = false) => {
    if (!current || !claim(current)) return;
    const [id] = draw.current.add(toFeature(current));
    remove(new Set([current.properties.suggestion_id]));
    onAdded();
    if (edit) {
      const mode = current.geometry.type === 'Point' ? 'simple_select' : 'direct_select';
      draw.current.changeMode(mode, mode === 'direct_select' ? { featureId: id } : { featureIds: [id] });
      map.current.fire('draw.selectionchange', { features: [draw.current.get(id)] });
    }
  };

  const reject = () => {
    if (!current || !claim(current)) return;
    const id = current.properties.suggestion_id;
    setRejected(r => new Set(r).add(id));
    remove(new Set([id]));
  };

  const acceptAll = () => {
    if (!shown.length || !window.confirm(`Add all ${shown.length} shown suggestions to the map?`)) return;
    shown.forEach(claim);
    draw.current.add({ type: 'FeatureCollection', features: shown.map(toFeature) });
    remove(new Set(shown.map(f => f.properties.suggestion_id)));
    onAdded();
  };

  const rejectAll = () => {
    if (!shown.length || !window.confirm(`Reject all ${shown.length} shown suggestions?`)) return;
    shown.forEach(claim);
    setRejected(r => new Set([...r, ...shown.map(f => f.properties.suggestion_id)]));
    remove(new Set(shown.map(f => f.properties.suggestion_id)));
  };

  const retype = type => {
    const id = current.properties.suggestion_id;
    setPending(p => p.map(f => f.properties.suggestion_id === id
      ? { ...f, properties: { ...f.properties, type } } : f));
  };

  const step = d => setIndex(i => (shown.length ? (Math.min(i, shown.length - 1) + d + shown.length) % shown.length : 0));

  // Keyboard: A accept, E accept and edit, R reject, arrows / N P next and previous.
  useEffect(() => {
    if (!visible) return;
    const onKey = e => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'a') accept();
      else if (k === 'e') accept(true);
      else if (k === 'r' || k === 'delete') reject();
      else if (k === 'n' || k === 'arrowright') step(1);
      else if (k === 'p' || k === 'arrowleft') step(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // --- loading a suggestions file
  const load = e => {
    const file = e.target.files[0];
    e.target.value = null;
    if (!file) return;
    file.text().then(text => {
      const geo = JSON.parse(text);
      const mapped = new Set(draw.current.getAll().features.map(f => f.properties?.suggestion_id).filter(Boolean));
      let skipped = 0;
      const fresh = [];
      for (const f of geo.features || []) {
        if (!f.geometry) continue;
        const props = { ...(f.properties || {}) };
        props.suggestion_id = props.suggestion_id || hashId(f);
        if (!TYPE_BY_ID[props.type]) props.type = 'unassigned';
        if (rejected.has(props.suggestion_id) || mapped.has(props.suggestion_id)) { skipped++; continue; }
        fresh.push({ type: 'Feature', id: props.suggestion_id, geometry: f.geometry, properties: props });
      }
      fresh.sort(reviewOrder);
      handled.current = new Set();
      setPending(fresh);
      setIndex(0);
      setShownTypes(null);
      alert(`${fresh.length} suggestions to review` + (skipped ? ` (${skipped} already accepted or rejected)` : ''));
    }).catch(err => {
      console.error(err);
      alert('Could not read that file. It should be a GeoJSON suggestions file.');
    });
  };

  if (!visible) return null;

  const toggleType = id => {
    const all = new Set(Object.keys(counts));
    const next = new Set(shownTypes ?? all);
    next.has(id) ? next.delete(id) : next.add(id);
    setShownTypes(next.size === all.size ? null : next);
    setIndex(0);
  };

  const p = current?.properties;
  return (
    <div className="properties-panel suggestions-panel">
      <div className="panel-header">
        <h3>Suggestions</h3>
        <button className="close-btn" onClick={onClose} title="Close (suggestions are kept)"><X size={16} /></button>
      </div>
      <div className="panel-body">
        <div className="button-row">
          <button className="small-btn" onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Load suggestions file
          </button>
          <input type="file" ref={fileRef} style={{ display: 'none' }} accept=".geojson,.json" onChange={load} />
        </div>

        {pending.length === 0 ? (
          <p className="help-text muted">
            Nothing to review. Load a suggestions file made by the detector
            (<code>data_tools/detect_features.py</code>). Things you accept or reject are
            remembered in the saved map, so they won't come back.
          </p>
        ) : (
          <>
            <div className="sugg-types">
              {FEATURE_GROUPS.flatMap(g => FEATURE_TYPES.filter(t => t.group === g && counts[t.id])).map(t => (
                <label key={t.id} className="sugg-type">
                  <input type="checkbox" checked={shownTypes === null || shownTypes.has(t.id)} onChange={() => toggleType(t.id)} />
                  <span className="swatch" style={{ background: t.color }} />
                  {t.label} <span className="count">{counts[t.id]}</span>
                </label>
              ))}
            </div>

            <div className="form-group">
              <label>Minimum confidence: {Math.round(minConfidence * 100)}%</label>
              <input type="range" min="0" max="0.95" step="0.05" value={minConfidence}
                onChange={e => { setMinConfidence(parseFloat(e.target.value)); setIndex(0); }} />
            </div>

            {current ? (
              <div className="sugg-card">
                <div className="sugg-nav">
                  <button className="icon-btn" onClick={() => step(-1)} title="Previous (P)"><ChevronLeft size={18} /></button>
                  <span>{Math.min(index, shown.length - 1) + 1} of {shown.length}</span>
                  <button className="icon-btn" onClick={() => step(1)} title="Next (N)"><ChevronRight size={18} /></button>
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={p.type} onChange={e => retype(e.target.value)}>
                    {FEATURE_GROUPS.map(g => (
                      <optgroup key={g} label={g}>
                        {FEATURE_TYPES.filter(t => t.group === g && t.id !== 'unassigned' &&
                          (t.id === p.type || fitsGeometry(t, current.geometry.type))).map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="sugg-meta">
                  {p.confidence !== undefined && <span className="badge">{Math.round(p.confidence * 100)}% sure</span>}
                  {p.height !== undefined && <span className="badge">{p.height} m tall</span>}
                  {p.detector && <span className="badge muted">{p.detector}</span>}
                </div>
                {p.reason && <p className="sugg-reason">{p.reason}</p>}
                <div className="button-row">
                  <button className="small-btn accept" onClick={() => accept()} title="Add to the map (A)"><Check size={14} /> Accept</button>
                  <button className="small-btn" onClick={() => accept(true)} title="Add, then adjust its shape (E)"><Pencil size={14} /> Edit</button>
                  <button className="small-btn reject" onClick={reject} title="Don't add, and don't suggest again (R)"><XCircle size={14} /> Reject</button>
                </div>
                <p className="help-text muted">Keys: A accept, E accept and edit, R reject, ← → previous / next.</p>
              </div>
            ) : (
              <p className="help-text muted">No suggestions match the filters.</p>
            )}

            <div className="button-row">
              <button className="small-btn" onClick={acceptAll} disabled={!shown.length}>Accept all {shown.length} shown</button>
              <button className="small-btn" onClick={rejectAll} disabled={!shown.length}>Reject all shown</button>
            </div>
            <p className="help-text muted">{pending.length} left to review · {rejected.size} rejected so far</p>
          </>
        )}
        <p className="help-text muted">Remember to Save Map when you're done.</p>
      </div>
    </div>
  );
}

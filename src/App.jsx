import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { Layers, Hexagon, GitCommit, MapPin, Trash2, MousePointer2, Save, Upload, X, Eye, Palette, Sparkles } from 'lucide-react';
import MapRendererModal from './MapRenderer';
import { drawStyles } from './drawStyles';
import { FEATURE_GROUPS, FEATURE_TYPES, fitsGeometry } from './featureTypes';
import SuggestionsPanel from './Suggestions';
import { acresOf, formatAcres, formatMoney, isLandType, landValue, ownersOf, withOwnerColors } from './land';
import './MapRenderer.css';
import './App.css';

const FARM_COORDINATES = [-1.5, 52.5];

const BASE_MAPS = {
  esri: {
    name: 'Esri Satellite',
    style: {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: '&copy; Esri'
        }
      },
      layers: [{ id: 'satellite-layer', type: 'raster', source: 'esri-satellite', minzoom: 0, maxzoom: 22 }]
    }
  },
  osm: {
    name: 'OpenStreetMap',
    style: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap Contributors'
        }
      },
      layers: [{ id: 'osm-layer', type: 'raster', source: 'osm-tiles', minzoom: 0, maxzoom: 19 }]
    }
  }
};

// Work in progress is kept in the browser, so a refresh or a closed tab doesn't lose it.
const AUTOSAVE_KEY = 'maptool-autosave';

// Zoom the map to fit the features: the hand-drawn ones if there are any (not imported from
// OpenStreetMap or accepted from detector suggestions), so the villages round about don't
// pull the view away from the farm.
function fitToFeatures(mapInstance, features) {
  const mine = features.filter(f => !f.properties?.source && !f.properties?.detected_by);
  const use = mine.length ? mine : features;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const visit = (c) => {
    if (typeof c[0] === 'number') {
      minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]);
      minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]);
    } else c.forEach(visit);
  };
  use.forEach(f => f.geometry?.coordinates && visit(f.geometry.coordinates));
  if (!Number.isFinite(minX)) return;
  mapInstance.fitBounds([[minX, minY], [maxX, maxY]], { padding: 60, maxZoom: 18, duration: 1200 });
}

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const draw = useRef(null);
  const fileInputRef = useRef(null);
  const pickingLabelPosRef = useRef(false);
  const pickingFeatureIdRef = useRef(null);
  const selectedFeatureRef = useRef(null);
  
  const [activeBaseMap, setActiveBaseMap] = useState('esri');
  const [showBasePicker, setShowBasePicker] = useState(false);
  const [showLayerToggle, setShowLayerToggle] = useState(false);
  
  const [drawMode, setDrawMode] = useState('simple_select');
  const [selectedFeature, setSelectedFeature] = useState(null);
  
  // Phase 4: Layer Management State
  const [hiddenTypes, setHiddenTypes] = useState(new Set());
  const [hiddenFeatures, setHiddenFeatures] = useState({});

  // Artistic renderer state
  const [showRenderer, setShowRenderer] = useState(false);
  const [pickingLabelPos, setPickingLabelPos] = useState(false);

  // Suggestions to review, and the ids of ones rejected (saved in the map file)
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState([]);
  const [rejectedSuggestions, setRejectedSuggestions] = useState(new Set());
  const [changeCount, setChangeCount] = useState(0);
  const markChanged = () => setChangeCount(c => c + 1);

  // Owner colours for fields and woods (saved in the map file as `owner_colors`)
  const [ownerColors, setOwnerColors] = useState({});
  const [showAcresOnLabels, setShowAcresOnLabels] = useState(false);
  const showAcresRef = useRef(false);

  useEffect(() => {
    pickingLabelPosRef.current = pickingLabelPos;
  }, [pickingLabelPos]);

  const initLabelsLayer = () => {
    if (!map.current || map.current.getSource('labels-source')) return;

    map.current.addSource('labels-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    map.current.addLayer({
      id: 'labels-layer',
      type: 'symbol',
      source: 'labels-source',
      layout: {
        'text-field': ['get', 'name'],
        'text-anchor': 'center',
        'text-justify': 'center',
        'text-size': 16,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-rotate': ['coalesce', ['get', 'labelRotation'], 0],
        'text-rotation-alignment': 'viewport'
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 2,
        'text-halo-blur': 1
      }
    });
  };

  const updateLabels = () => {
    if (!map.current || !map.current.getSource('labels-source')) return;
    if (draw.current) {
      const data = draw.current.getAll();
      
      const labelFeatures = [];
      data.features.forEach(f => {
        if (f.properties?.showLabel === false) return;
        if (!f.properties?.name) return;
        
        const labelFeature = { ...f, properties: { ...f.properties } };
        if (showAcresRef.current && isLandType(f.properties?.type)) {
          labelFeature.properties.name = `${f.properties.name}\n${formatAcres(acresOf(f))}`;
        }
        if (f.properties?.labelLng !== undefined && f.properties?.labelLat !== undefined) {
          labelFeature.geometry = {
            type: 'Point',
            coordinates: [f.properties.labelLng, f.properties.labelLat]
          };
        }
        labelFeatures.push(labelFeature);
      });

      map.current.getSource('labels-source').setData({
        type: 'FeatureCollection',
        features: labelFeatures
      });
    }
  };

  // --- autosave
  const restoreAutosave = () => {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || 'null'); } catch { saved = null; }
    if (!saved?.features?.length && !saved?.suggestions?.length) return;
    const when = new Date(saved.savedAt).toLocaleString();
    if (!window.confirm(`Carry on from your unsaved work (${saved.features.length} features, autosaved ${when})?\n\nCancel starts with an empty map (use Import Data to open a file).`)) {
      try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* storage unavailable */ }
      return;
    }
    draw.current.add({ type: 'FeatureCollection', features: saved.features });
    setRejectedSuggestions(new Set(saved.rejected || []));
    setPendingSuggestions(saved.suggestions || []);
    setOwnerColors(saved.ownerColors || {});
    if (saved.center) map.current.jumpTo({ center: saved.center, zoom: saved.zoom });
    updateLabels();
  };

  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: BASE_MAPS[activeBaseMap].style,
      center: FARM_COORDINATES,
      zoom: 16,
      pitch: 0,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      userProperties: true,
      styles: drawStyles
    });

    map.current.addControl(draw.current);
    if (import.meta.env.DEV) window.__maptool = { map: map.current, draw: draw.current };  // for testing

    map.current.on('load', () => {
      initLabelsLayer();
      restoreAutosave();
    });

    map.current.on('draw.modechange', (e) => setDrawMode(e.mode));
    map.current.on('draw.create', () => { updateLabels(); markChanged(); });
    map.current.on('draw.update', () => { updateLabels(); markChanged(); });
    map.current.on('draw.delete', () => { updateLabels(); markChanged(); });

    map.current.on('draw.selectionchange', (e) => {
      if (e.features.length > 0) {
        const feat = {
          id: e.features[0].id,
          geometryType: e.features[0].geometry?.type,
          properties: e.features[0].properties || {}
        };
        setSelectedFeature(feat);
        selectedFeatureRef.current = feat;
      } else {
        setSelectedFeature(null);
        selectedFeatureRef.current = null;
        if (!pickingFeatureIdRef.current) {
          setPickingLabelPos(false);
        }
      }
    });

    map.current.on('click', (e) => {
      if (pickingLabelPosRef.current && pickingFeatureIdRef.current) {
        const { lng, lat } = e.lngLat;
        const featureId = pickingFeatureIdRef.current;
        
        // Update both the state and the MapboxDraw feature
        draw.current.setFeatureProperty(featureId, 'labelLng', lng);
        draw.current.setFeatureProperty(featureId, 'labelLat', lat);
        
        // Re-select the feature if it got deselected
        draw.current.changeMode('simple_select', { featureIds: [featureId] });
        
        setPickingLabelPos(false);
        pickingFeatureIdRef.current = null;
        updateLabels();
      }
    });
  }, []);

  useEffect(() => {
    if (!map.current) return;
    map.current.setStyle(BASE_MAPS[activeBaseMap].style);
    map.current.once('styledata', () => {
      initLabelsLayer();
      updateLabels();
    });
  }, [activeBaseMap]);

  const changeDrawMode = (mode) => {
    if (draw.current) {
      draw.current.changeMode(mode);
      setDrawMode(mode);
    }
  };

  const deleteSelected = () => {
    if (draw.current) {
      draw.current.trash();
      updateLabels();
      setSelectedFeature(null);
    }
  };

  const handlePropertyChange = (key, value) => {
    if (!selectedFeature || !draw.current) return;
    
    setSelectedFeature(prev => ({
      ...prev,
      properties: { ...prev.properties, [key]: value }
    }));

    draw.current.setFeatureProperty(selectedFeature.id, key, value);
    updateLabels();
    markChanged();
  };

  const closePropertiesPanel = () => {
    setSelectedFeature(null);
    setPickingLabelPos(false);
    pickingFeatureIdRef.current = null;
    changeDrawMode('simple_select');
  };

  // Phase 4: Toggle Layer Visibility
  const toggleLayerType = (typeId) => {
    const newHiddenTypes = new Set(hiddenTypes);
    
    if (hiddenTypes.has(typeId)) {
      // Show: Move features from hiddenFeatures to MapboxDraw
      newHiddenTypes.delete(typeId);
      const toAdd = [];
      const newHiddenFeatures = { ...hiddenFeatures };
      
      for (const id in newHiddenFeatures) {
        const feat = newHiddenFeatures[id];
        const fType = feat.properties?.type || 'unassigned';
        if (fType === typeId) {
          toAdd.push(feat);
          delete newHiddenFeatures[id];
        }
      }
      
      if (toAdd.length > 0) {
        draw.current.add({ type: 'FeatureCollection', features: toAdd });
        updateLabels();
      }
      setHiddenFeatures(newHiddenFeatures);
    } else {
      // Hide: Move features from MapboxDraw to hiddenFeatures
      newHiddenTypes.add(typeId);
      const allActive = draw.current.getAll().features;
      const toHide = allActive.filter(f => (f.properties?.type || 'unassigned') === typeId);
      
      if (toHide.length > 0) {
        const newHiddenFeatures = { ...hiddenFeatures };
        const idsToDelete = [];
        
        toHide.forEach(f => {
          newHiddenFeatures[f.id] = f;
          idsToDelete.push(f.id);
        });
        
        draw.current.delete(idsToDelete);
        setHiddenFeatures(newHiddenFeatures);
        updateLabels();
      }
    }
    
    setHiddenTypes(newHiddenTypes);
  };

  // Phase 5: Save & Load
  const handleExport = () => {
    const activeFeatures = draw.current.getAll().features;
    const hiddenFeats = Object.values(hiddenFeatures);
    const geojson = {
      type: 'FeatureCollection',
      features: [...activeFeatures, ...hiddenFeats]
    };
    if (rejectedSuggestions.size) {
      geojson.rejected_suggestions = [...rejectedSuggestions].sort();
    }
    const owners = ownersOf(geojson.features);
    if (owners.length) {
      geojson.owner_colors = Object.fromEntries(owners.map(o => [o, ownerColors[o]]).filter(([, c]) => c));
    }
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geojson, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = 'farm_map.geojson';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const geojson = JSON.parse(event.target.result);
        draw.current.deleteAll();
        setHiddenFeatures({});
        setHiddenTypes(new Set());
        setRejectedSuggestions(new Set(geojson.rejected_suggestions || []));
        setPendingSuggestions([]);
        setOwnerColors(geojson.owner_colors || {});
        
        // MapboxDraw automatically generates IDs if missing, but we ensure all features go to active map
        draw.current.add(geojson);
        
        updateLabels();
        markChanged();
        fitToFeatures(map.current, geojson.features || []);
      } catch (err) {
        alert('Failed to parse the file. Ensure it is a valid GeoJSON.');
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = null;
  };

  useEffect(() => {
    if (!changeCount && !pendingSuggestions.length && !rejectedSuggestions.size) return;
    const t = setTimeout(() => {
      if (!draw.current) return;
      const saved = {
        savedAt: Date.now(),
        features: [...draw.current.getAll().features, ...Object.values(hiddenFeatures)],
        rejected: [...rejectedSuggestions],
        suggestions: pendingSuggestions,
        ownerColors,
        center: map.current?.getCenter().toArray(),
        zoom: map.current?.getZoom(),
      };
      try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(saved)); } catch (err) { console.warn('Autosave failed', err); }
    }, 800);
    return () => clearTimeout(t);
  }, [changeCount, pendingSuggestions, rejectedSuggestions, hiddenFeatures, ownerColors]);

  useEffect(() => {
    showAcresRef.current = showAcresOnLabels;
    updateLabels();
  }, [showAcresOnLabels]);

  // Every feature, including ones on hidden layers
  const allFeatures = () => [
    ...(draw.current ? draw.current.getAll().features : []),
    ...Object.values(hiddenFeatures),
  ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const owners = useMemo(() => ownersOf(allFeatures()), [changeCount, hiddenFeatures]);
  useEffect(() => { setOwnerColors(c => withOwnerColors(c, owners)); }, [owners]);

  // Acres, owner and value for fields and woods
  const landDetails = (sel) => {
    const feature = draw.current?.get(sel.id);
    if (!feature) return null;
    const acres = acresOf(feature);
    const value = landValue({ ...feature, properties: sel.properties });
    const owner = sel.properties.owner?.trim();
    return (
      <div className="land-details">
        <div className="land-stat">
          <span>Area</span>
          <strong>{acres ? formatAcres(acres) : 'Draw a shape'}</strong>
        </div>
        <div className="form-group">
          <label>Owner</label>
          <div className="owner-row">
            <input
              type="text"
              list="owner-list"
              value={sel.properties.owner || ''}
              onChange={(e) => handlePropertyChange('owner', e.target.value)}
              placeholder="e.g. Ulnaby Farm"
            />
            {owner && ownerColors[owner] && (
              <input
                type="color"
                className="owner-color"
                title={`Colour for ${owner}`}
                value={ownerColors[owner]}
                onChange={(e) => { setOwnerColors(c => ({ ...c, [owner]: e.target.value })); markChanged(); }}
              />
            )}
          </div>
          <datalist id="owner-list">
            {owners.map(o => <option key={o} value={o} />)}
          </datalist>
        </div>
        <div className="form-group">
          <label>Price per acre (£)</label>
          <input
            type="number"
            min="0"
            step="100"
            value={sel.properties.price_per_acre ?? ''}
            onChange={(e) => handlePropertyChange('price_per_acre',
              e.target.value === '' ? undefined : Number(e.target.value))}
            placeholder="e.g. 10000"
          />
        </div>
        <div className="land-stat">
          <span>Land value</span>
          <strong>{value !== null ? formatMoney(value) : '–'}</strong>
        </div>
      </div>
    );
  };

  const typeOptions = (geometryType, current) => FEATURE_GROUPS.map(g => {
    const types = FEATURE_TYPES.filter(t => t.group === g && t.id !== 'unassigned' &&
      (t.id === current || fitsGeometry(t, geometryType)));
    return types.length ? (
      <optgroup key={g} label={g}>
        {types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
      </optgroup>
    ) : null;
  });

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Farm Map Tool</h1>
        
        {/* Phase 5: Save/Load Header Buttons */}
        <div className="header-actions">
          <button className="header-btn" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Import Data
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".geojson,.json" 
            onChange={handleImport} 
          />
          <button className="header-btn primary" onClick={handleExport}>
            <Save size={16} /> Save Map
          </button>
          <button className={`header-btn ${showSuggestions ? 'active' : ''}`} onClick={() => setShowSuggestions(s => !s)}>
            <Sparkles size={16} /> Suggestions{pendingSuggestions.length ? ` (${pendingSuggestions.length})` : ''}
          </button>
          <button className="header-btn render-btn" onClick={() => setShowRenderer(true)}>
            <Palette size={16} /> Render Map
          </button>
        </div>
      </header>

      <div className={`map-wrapper ${pickingLabelPos ? 'picking-pos' : ''}`} ref={mapContainer}>
        {/* Floating Controls - Left */}
        <div className="floating-panel top-left">
          
          <div className="panel-section">
            <button 
              className={`control-btn ${showBasePicker ? 'active' : ''}`}
              onClick={() => { setShowBasePicker(!showBasePicker); setShowLayerToggle(false); }}
              title="Base Map"
            >
              <Layers size={20} />
            </button>
            
            {showBasePicker && (
              <div className="dropdown-menu">
                <h3>Base Map</h3>
                {Object.entries(BASE_MAPS).map(([key, data]) => (
                  <label key={key} className="radio-label">
                    <input 
                      type="radio" 
                      name="basemap" 
                      value={key} 
                      checked={activeBaseMap === key}
                      onChange={() => {
                        setActiveBaseMap(key);
                        setShowBasePicker(false);
                      }}
                    />
                    {data.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Phase 4: Layers Visibility Toggle */}
          <div className="panel-section">
            <button 
              className={`control-btn ${showLayerToggle ? 'active' : ''}`}
              onClick={() => { setShowLayerToggle(!showLayerToggle); setShowBasePicker(false); }}
              title="Visibility Layers"
            >
              <Eye size={20} />
            </button>

            {showLayerToggle && (
              <div className="dropdown-menu layers-menu">
                <h3>Visible Layers</h3>
                <label className="radio-label">
                  <input
                    type="checkbox"
                    checked={showAcresOnLabels}
                    onChange={(e) => setShowAcresOnLabels(e.target.checked)}
                  />
                  Show acres on field labels
                </label>
                {FEATURE_GROUPS.map(g => (
                  <div key={g} className="layer-group">
                    <h4>{g}</h4>
                    {FEATURE_TYPES.filter(t => t.group === g).map(type => (
                      <label key={type.id} className="radio-label">
                        <input
                          type="checkbox"
                          checked={!hiddenTypes.has(type.id)}
                          onChange={() => toggleLayerType(type.id)}
                        />
                        <span className="swatch" style={{ background: type.color }} />
                        {type.label}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel-divider" />

          {/* Drawing Tools */}
          <div className="panel-section draw-tools">
            <button 
              className={`control-btn ${drawMode === 'simple_select' ? 'active' : ''}`}
              onClick={() => changeDrawMode('simple_select')}
              title="Select / Move"
            >
              <MousePointer2 size={18} />
            </button>
            <button 
              className={`control-btn ${drawMode === 'draw_polygon' ? 'active' : ''}`}
              onClick={() => changeDrawMode('draw_polygon')}
              title="Draw Polygon (Field/Building)"
            >
              <Hexagon size={18} />
            </button>
            <button 
              className={`control-btn ${drawMode === 'draw_line_string' ? 'active' : ''}`}
              onClick={() => changeDrawMode('draw_line_string')}
              title="Draw Line (Fence/Road)"
            >
              <GitCommit size={18} />
            </button>
            <button 
              className={`control-btn ${drawMode === 'draw_point' ? 'active' : ''}`}
              onClick={() => changeDrawMode('draw_point')}
              title="Draw Point (Gate/Landmark)"
            >
              <MapPin size={18} />
            </button>
            <button 
              className="control-btn delete-btn"
              onClick={deleteSelected}
              title="Delete Selected"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Floating Properties Panel - Right */}
        {selectedFeature && (
          <div className="properties-panel">
            <div className="panel-header">
              <h3>Feature Properties</h3>
              <button className="close-btn" onClick={closePropertiesPanel}>
                <X size={16} />
              </button>
            </div>
            
            <div className="panel-body">
              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text" 
                  value={selectedFeature.properties.name || ''} 
                  onChange={(e) => handlePropertyChange('name', e.target.value)}
                  placeholder="e.g. North Pasture"
                />
              </div>

              <div className="form-group">
                <label>Type / Category</label>
                <select 
                  value={selectedFeature.properties.type || ''}
                  onChange={(e) => handlePropertyChange('type', e.target.value)}
                >
                  <option value="">Select a type...</option>
                  {typeOptions(selectedFeature.geometryType, selectedFeature.properties.type)}
                </select>
              </div>
              
              {isLandType(selectedFeature.properties.type) && landDetails(selectedFeature)}

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={selectedFeature.properties.showLabel !== false} 
                    onChange={(e) => handlePropertyChange('showLabel', e.target.checked)}
                  />
                  Show Label on Map
                </label>
              </div>

              {selectedFeature.properties.showLabel !== false && (
                <>
                  <div className="form-group">
                    <label>Label Rotation: {selectedFeature.properties.labelRotation || 0}°</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="360" 
                      value={selectedFeature.properties.labelRotation || 0} 
                      onChange={(e) => handlePropertyChange('labelRotation', parseInt(e.target.value))} 
                    />
                  </div>

                  <div className="form-group">
                    <label>Label Position</label>
                    <div className="button-row">
                      <button 
                        className={`small-btn ${pickingLabelPos ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const isPicking = !pickingLabelPos;
                          setPickingLabelPos(isPicking);
                          pickingFeatureIdRef.current = isPicking ? selectedFeature.id : null;
                        }}
                      >
                        {pickingLabelPos ? 'Click on Map...' : 'Set Custom Position'}
                      </button>
                      {(selectedFeature.properties.labelLng !== undefined) && (
                        <button 
                          className="small-btn secondary"
                          onClick={() => {
                            handlePropertyChange('labelLng', undefined);
                            handlePropertyChange('labelLat', undefined);
                          }}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    {pickingLabelPos && <p className="help-text">Click anywhere on the map to place the label.</p>}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <SuggestionsPanel
          map={map}
          draw={draw}
          visible={showSuggestions && !selectedFeature}
          pending={pendingSuggestions}
          setPending={setPendingSuggestions}
          rejected={rejectedSuggestions}
          setRejected={setRejectedSuggestions}
          onAdded={() => { updateLabels(); markChanged(); }}
          onClose={() => setShowSuggestions(false)}
        />
      </div>

      {showRenderer && (
        <MapRendererModal
          features={allFeatures()}
          ownerColors={ownerColors}
          setOwnerColors={(c) => { setOwnerColors(c); markChanged(); }}
          onClose={() => setShowRenderer(false)}
        />
      )}
    </div>
  );
}

export default App;

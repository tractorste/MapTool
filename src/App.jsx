import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { Layers, Hexagon, GitCommit, MapPin, Trash2, MousePointer2, Save, Upload, X, Eye, Palette } from 'lucide-react';
import MapRendererModal from './MapRenderer';
import { drawStyles } from './drawStyles';
import './MapRenderer.css';
import './App.css';

const FARM_COORDINATES = [-1.643404322599725, 54.531969034128664];

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

const FEATURE_TYPES = [
  { id: 'field', label: 'Field' },
  { id: 'grass_field', label: 'Grass Field' },
  { id: 'wood', label: 'Wood / Forest' },
  { id: 'building', label: 'Building' },
  { id: 'house', label: 'House' },
  { id: 'shed', label: 'Shed' },
  { id: 'road', label: 'Road / Path' },
  { id: 'fence', label: 'Fence' },
  { id: 'water', label: 'Water Source' },
  { id: 'stream', label: 'Stream / Creek' },
  { id: 'sand', label: 'Sand / Bare Ground' },
  { id: 'tree', label: 'Individual Tree' },
  { id: 'gate', label: 'Gate' },
  { id: 'other', label: 'Other' },
  { id: 'unassigned', label: 'Unassigned' }
];

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const draw = useRef(null);
  const fileInputRef = useRef(null);
  
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
        'text-variable-anchor': ['center', 'top', 'bottom', 'left', 'right'],
        'text-radial-offset': 0.5,
        'text-justify': 'center',
        'text-size': 16,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
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
      map.current.getSource('labels-source').setData(data);
    }
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

    map.current.on('load', () => {
      initLabelsLayer();
    });

    map.current.on('draw.modechange', (e) => setDrawMode(e.mode));
    map.current.on('draw.create', updateLabels);
    map.current.on('draw.update', updateLabels);
    map.current.on('draw.delete', updateLabels);

    map.current.on('draw.selectionchange', (e) => {
      if (e.features.length > 0) {
        setSelectedFeature({
          id: e.features[0].id,
          properties: e.features[0].properties || {}
        });
      } else {
        setSelectedFeature(null);
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
  };

  const closePropertiesPanel = () => {
    setSelectedFeature(null);
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
        
        // MapboxDraw automatically generates IDs if missing, but we ensure all features go to active map
        const ids = draw.current.add(geojson);
        
        updateLabels();
        alert('Map data loaded successfully!');
      } catch (err) {
        alert('Failed to parse the file. Ensure it is a valid GeoJSON.');
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = null;
  };

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
          <button className="header-btn render-btn" onClick={() => setShowRenderer(true)}>
            <Palette size={16} /> Render Map
          </button>
        </div>
      </header>

      <div className="map-wrapper" ref={mapContainer}>
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
              <div className="dropdown-menu">
                <h3>Visible Layers</h3>
                {FEATURE_TYPES.map(type => (
                  <label key={type.id} className="radio-label">
                    <input 
                      type="checkbox" 
                      checked={!hiddenTypes.has(type.id)}
                      onChange={() => toggleLayerType(type.id)}
                    />
                    {type.label}
                  </label>
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
                  {FEATURE_TYPES.filter(t => t.id !== 'unassigned').map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              
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
            </div>
          </div>
        )}

      </div>

      {showRenderer && (
        <MapRendererModal
          features={[
            ...(draw.current ? draw.current.getAll().features : []),
            ...Object.values(hiddenFeatures)
          ]}
          onClose={() => setShowRenderer(false)}
        />
      )}
    </div>
  );
}

export default App;

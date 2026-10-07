# Farm Mapping Tool

A custom mapping tool for farm management, allowing users to overlay vector features on satellite imagery, draw polygons, lines, and points, and manage farm data.

## Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed on your system.

### Installation

1. Clone the repository or download the source code.
2. Open your terminal and navigate to the project directory:
   ```bash
   cd MapTool
   ```
3. Install the necessary dependencies:
   ```bash
   npm install
   ```

### Running the Application

To start the development server and view the app in your browser:

```bash
npm run dev
```

The app will typically be available at `http://localhost:5173`.

### Updating Modules

To update the project's dependencies to their latest compatible versions, run:

```bash
npm update
```

## Features

- **Satellite Imagery**: High-quality satellite base maps.
- **Drawing Tools**: Create and edit polygons, lines, and points.
- **Data Management**: Label features, assign categories, and export/import GeoJSON data.
- **Suggestions**: Review features found automatically (e.g. from LiDAR) and accept, edit or reject them.
- **Layer Control**: Toggle visibility of different map layers.

## Feature Types

All types live in `src/featureTypes.js` (label, menu group, colour on the map, and what
shape they're normally drawn as). The farm game reads the `type` ids, so never rename an
existing id; add a new one instead.

| Group | Types |
| --- | --- |
| Land | Field, Grass Field, Lawn, Sand / Bare Ground, Tennis Court |
| Roads & Tracks | A Road, B Road, Road / Track, Gravel Track, Muddy Track, Footpath |
| Boundaries | Wire Fence (`fence`), Wire Fence With Top Rail, Railed Fence, Stone Wall, Hedge, Gate |
| Trees & Plants | Wood / Forest, Individual Tree, Small Tree, Bushes |
| Buildings | Building, House, Shed, Church, School |
| Water | Water Source, Stream / Creek |
| Landmarks | Bus Shelter, Phone Box |
| Other | Other, Unassigned |

The type menu only offers types that suit the shape you drew (e.g. lines get roads,
fences and hedges). Each type is drawn in its own colour on the satellite map.

## Suggestions (review detected features)

**Suggestions** in the header opens a review panel. **Load suggestions file** reads a
GeoJSON file of things a detector found (the farm project's
`data_tools/detect_features.py` finds buildings, hedges, stone walls, trees and bushes in
Environment Agency LiDAR). Each suggestion is shown with a dashed outline and you can:

- **Accept** (A): add it to the map as an ordinary feature (it's yours from then on).
- **Edit** (E): add it and go straight to adjusting its shape.
- **Reject** (R): leave it out; it won't be suggested again.
- Change its type before accepting, step through with ← / →, filter by type or minimum
  confidence, or accept/reject everything shown at once.

Rejected suggestion ids are saved in the map file as a top-level `rejected_suggestions`
list (and read back on Import Data), so the next detector run leaves them out. Accepted
features keep `detected_by` and `suggestion_id` properties.

Suggestions file format: a FeatureCollection whose features have properties
`suggestion_id` (stable id), `type` (a type id), `confidence` (0-1), `detector`, `reason`
(shown to the reviewer) and optionally `name`, `height`, `width`, `surface` (copied onto
the accepted feature).

## Autosave

Work in progress (features, suggestions still to review, rejections) is kept in the
browser's local storage. If the page is reloaded or closed without saving, it offers to
carry on from there. It is per browser - always **Save Map** to keep a proper copy.

## Built With

- [React](https://reactjs.org/) - UI Framework
- [Vite](https://vitejs.dev/) - Build Tool
- [MapLibre GL JS](https://maplibre.org/) - Mapping Engine
- [Mapbox GL Draw](https://github.com/mapbox/mapbox-gl-draw) - Drawing Suite

## Notes To Self

### Deploying (Docker on the M73 server)

The server's `docker-compose.yml` (github.com/tractorste/server) builds the image straight
from this repo's `main` branch - no image registry. To update the running tool after
pushing to `main`, on the server:

    cd ~/server
    docker compose build --pull maptool
    docker compose up -d maptool

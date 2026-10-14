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
- **Land**: acres, owners and land value for fields and woods.
- **Render Map**: printable maps (A4 / A3, PNG or PDF) with owner colours and a legend.

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

## Land: acres, value and owners

Fields, Grass Fields and Woods show extra details in **Feature Properties**:

- **Area** in acres, worked out from the shape (updates as you reshape it).
- **Owner**: type a name, or pick one already used. Each owner gets a colour (click the
  swatch to change it).
- **Price per acre (£)**, and the **Land value** it gives (acres × price).

These are saved on each feature as `owner` and `price_per_acre`; owner colours are saved at
the top level of the map file as `owner_colors` (`{ "Owner": "#rrggbb" }`). The eye menu has
**Show acres on field labels** for the satellite map.

## Render Map

Down the left of the render preview:

- **Map Style**: Simple, Cartoon, Tolkien, Ordnance Survey, or Print (Ordnance Survey on
  plain white with no grid or page border).
- **Page**: Screen (2400 × 1600), **A4** or **A3** (landscape or portrait, drawn at 300 dpi),
  a title (blank for none), font size and preview zoom.
- **Labels & Land**: labels on/off, and acres and land value under field names.
- **Owners**: highlight fields and woods in their owner's colour, choose which owners are
  shown and their colours, and a legend (with each owner's total acres and value). While
  highlighting is on, every other field, wood and house is greyed out.
- **Categories**: tick which feature types are drawn; the map is framed to what's shown.

**Download PNG** or **Download PDF** (the PDF is page-sized for A4 / A3). The choices are
remembered in the browser for next time.

When a map file is opened with **Import Data**, the map moves to fit the hand-drawn features.

## Autosave

Work in progress (features, suggestions still to review, rejections) is kept in the
browser's local storage. If the page is reloaded or closed without saving, it offers to
carry on from there. It is per browser - always **Save Map** to keep a proper copy.

## Built With

- [React](https://reactjs.org/) - UI Framework
- [Vite](https://vitejs.dev/) - Build Tool
- [MapLibre GL JS](https://maplibre.org/) - Mapping Engine
- [Mapbox GL Draw](https://github.com/mapbox/mapbox-gl-draw) - Drawing Suite
- [jsPDF](https://github.com/parallax/jsPDF) - PDF export

## Notes To Self

### Deploying (Docker on the M73 server)

The server's `docker-compose.yml` (github.com/tractorste/server) builds the image straight
from this repo's `main` branch - no image registry. To update the running tool after
pushing to `main`, on the server:

    cd ~/server
    docker compose build --pull maptool
    docker compose up -d maptool

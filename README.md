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
- **Layer Control**: Toggle visibility of different map layers.

## Built With

- [React](https://reactjs.org/) - UI Framework
- [Vite](https://vitejs.dev/) - Build Tool
- [MapLibre GL JS](https://maplibre.org/) - Mapping Engine
- [Mapbox GL Draw](https://github.com/mapbox/mapbox-gl-draw) - Drawing Suite

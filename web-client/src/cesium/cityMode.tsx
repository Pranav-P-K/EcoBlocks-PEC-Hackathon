import * as Cesium from "cesium";

export function enterCityMode(
  viewer: Cesium.Viewer,
  lat?: number,
  lon?: number
) {
  viewer.scene.globe.enableLighting = true;
  if (lat && lon) {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, 2500),
    });
  }
}

/**
 * Draws a temporary semi-transparent rectangle while the user is dragging.
 */
export function drawSelectionShape(
  viewer: Cesium.Viewer,
  north: number,
  south: number,
  east: number,
  west: number
) {
  // Clear any existing temporary selection or previous result to avoid clutter
  viewer.entities.removeById("selection-shape");

  // Clean up any previous grid highlights
  const entities = viewer.entities.values;
  for (let i = entities.length - 1; i >= 0; i--) {
    const id = entities[i].id;
    if (typeof id === 'string' && id.startsWith("aqi-highlight")) {
      viewer.entities.remove(entities[i]);
    }
  }

  viewer.entities.add({
    id: "selection-shape",
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(west, south, east, north),
      material: Cesium.Color.CYAN.withAlpha(0.3),
      outline: true,
      outlineColor: Cesium.Color.CYAN,
      // Ensures it drapes over mountains/terrain
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
  });
}

/**
 * Helper to determine color based on AQI severity
 */
function getAQIColor(aqi: number): Cesium.Color {
  if (aqi > 300) return Cesium.Color.MAROON.withAlpha(0.6); // Hazardous
  if (aqi > 200) return Cesium.Color.PURPLE.withAlpha(0.6); // Very Unhealthy
  if (aqi > 150) return Cesium.Color.RED.withAlpha(0.6);    // Unhealthy
  if (aqi > 100) return Cesium.Color.ORANGE.withAlpha(0.6); // Unhealthy for sensitive
  if (aqi > 50) return Cesium.Color.YELLOW.withAlpha(0.6);  // Moderate
  return Cesium.Color.GREEN.withAlpha(0.6);                 // Good
}

/**
 * Finalizes the selection area with varying AQI color coding (Heatmap effect).
 */
export function highlightSelectedArea(
  viewer: Cesium.Viewer,
  north: number,
  south: number,
  east: number,
  west: number,
  baseAqi: number
) {
  // 1. Cleanup: Remove the temporary drag shape
  viewer.entities.removeById("selection-shape");

  // 2. Cleanup: Remove any existing heatmap grid
  const entities = viewer.entities.values;
  for (let i = entities.length - 1; i >= 0; i--) {
    const id = entities[i].id;
    if (typeof id === 'string' && id.startsWith("aqi-highlight")) {
      viewer.entities.remove(entities[i]);
    }
  }

  // 3. Grid Generation Settings
  const GRID_ROWS = 4;
  const GRID_COLS = 4;
  const latStep = (north - south) / GRID_ROWS;
  const lonStep = (east - west) / GRID_COLS;

  // 4. Generate Sub-blocks
  for (let i = 0; i < GRID_ROWS; i++) {
    for (let j = 0; j < GRID_COLS; j++) {
      // Calculate sub-block bounds
      const s = south + i * latStep;
      const n = south + (i + 1) * latStep;
      const w = west + j * lonStep;
      const e = west + (j + 1) * lonStep;

      // Simulate local variation (Heatmap logic)
      // In a real scenario, this would come from a granular API response
      const variance = Math.floor(Math.random() * 40) - 20; // +/- 20 AQI variation
      const localAqi = Math.max(0, baseAqi + variance);

      viewer.entities.add({
        id: `aqi-highlight-${i}-${j}`, // Unique ID per block
        rectangle: {
          coordinates: Cesium.Rectangle.fromDegrees(w, s, e, n),
          material: getAQIColor(localAqi),
          outline: false, // No outline for smoother heatmap look
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      });
    }
  }
}

/**
 * Backward compatibility wrapper for older App versions.
 * Converts a point (lat/lon) into a fixed-size square selection.
 */
export function highlightAQIBlock(
  viewer: Cesium.Viewer,
  lat: number,
  lon: number,
  aqi: number
) {
  // Create a roughly 400m x 400m box around the point
  const offset = 0.002;
  const north = lat + offset;
  const south = lat - offset;
  const east = lon + offset;
  const west = lon - offset;

  highlightSelectedArea(viewer, north, south, east, west, aqi);
}
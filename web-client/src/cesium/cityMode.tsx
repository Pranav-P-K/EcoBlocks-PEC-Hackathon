import * as Cesium from "cesium";

/* -----------------------------------------------------
   CITY MODE CAMERA
----------------------------------------------------- */
export function enterCityMode(
  viewer: Cesium.Viewer,
  lat?: number,
  lon?: number
) {
  viewer.scene.globe.enableLighting = true;

  if (lat !== undefined && lon !== undefined) {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, 2500),
      duration: 1.5,
    });
  }
}

/* -----------------------------------------------------
   AQI → COLOR MAPPING
----------------------------------------------------- */
function getAQIColor(aqi: number): Cesium.Color {
  if (aqi > 300) return Cesium.Color.MAROON.withAlpha(0.85);   // Hazardous
  if (aqi > 200) return Cesium.Color.PURPLE.withAlpha(0.85);  // Very Unhealthy
  if (aqi > 150) return Cesium.Color.RED.withAlpha(0.85);     // Unhealthy
  if (aqi > 100) return Cesium.Color.ORANGE.withAlpha(0.85);  // Sensitive
  if (aqi > 50) return Cesium.Color.YELLOW.withAlpha(0.85);  // Moderate
  return Cesium.Color.GREEN.withAlpha(0.85);                  // Good
}

/* -----------------------------------------------------
   BUILDING PICK + AQI HIGHLIGHT
----------------------------------------------------- */
export function enableBuildingAQISelection(
  viewer: Cesium.Viewer | null,
  baseAqi: number | null
) {
  if (!viewer) return null;

  const scene = viewer.scene;
  const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);

  // Track selected buildings
  const selectedBuildings = new Map<
    Cesium.Cesium3DTileFeature,
    Cesium.Color
  >();

  handler.setInputAction((movement: { position: Cesium.Cartesian2; }) => {
    const picked = scene.pick(movement.position);

    // Only proceed if a building feature is clicked
    if (
      !Cesium.defined(picked) ||
      !(picked instanceof Cesium.Cesium3DTileFeature) ||
      baseAqi === null
    ) {
      return;
    }

    // Toggle behavior
    if (selectedBuildings.has(picked)) {
      // Restore original color
      try {
        if (picked.content && !picked.content.isDestroyed()) {
          picked.color = selectedBuildings.get(picked)!;
        }
      } catch (e) {
        // Feature/Tile destroyed
      }
      selectedBuildings.delete(picked);
      return;
    }

    // Save original color
    try {
      // Deep clone the color to ensure we have a stable reference
      selectedBuildings.set(picked, picked.color.clone());
    } catch (e) {
      // Fallback if color isn't readable
      selectedBuildings.set(picked, Cesium.Color.WHITE.clone());
    }

    // Optional: simulate per-building AQI variation
    const variance = Math.floor(Math.random() * 30) - 15;
    const buildingAQI = Math.max(0, baseAqi + variance);

    // Apply AQI color
    try {
      picked.color = getAQIColor(buildingAQI);
    } catch (e) {
      // Ignore setting if failed
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  return {
    handler,
    clearSelection() {
      // Iterate over tracked buildings to restore colors
      selectedBuildings.forEach((color, building) => {
        try {
          // Robust check: Ensure building, content exist and are not destroyed
          if (building && building.content && !building.content.isDestroyed()) {
            // WRAP SETTER IN TRY/CATCH: This is the specific fix for Model3DTileContent error
            try {
              building.color = color;
            } catch (innerErr) {
              // If the specific model inside the content is invalid/unloaded
            }
          }
        } catch (error) {
          // If the tile is fully unloaded/destroyed, access throws immediately
        }
      });
      selectedBuildings.clear();
    },
  };
}
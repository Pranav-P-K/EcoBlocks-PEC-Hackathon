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
      picked.color = selectedBuildings.get(picked)!;
      selectedBuildings.delete(picked);
      return;
    }

    // Save original color
    selectedBuildings.set(picked, picked.color.clone());

    // Optional: simulate per-building AQI variation
    const variance = Math.floor(Math.random() * 30) - 15;
    const buildingAQI = Math.max(0, baseAqi + variance);

    // Apply AQI color
    picked.color = getAQIColor(buildingAQI);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

return {
    handler,
    clearSelection() {
      selectedBuildings.forEach((color, building) => {
        building.color = color;
      });
      selectedBuildings.clear();
    },
  };
}
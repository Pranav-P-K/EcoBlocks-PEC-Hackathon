import * as Cesium from "cesium";

export function initViewer(containerId: HTMLElement) {
  Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

  const viewer = new Cesium.Viewer(containerId, {
    // Use WorldTerrain for accurate ground elevation under buildings
    terrain: Cesium.Terrain.fromWorldTerrain(),
    animation: false,
    timeline: false,
    geocoder: false,
    baseLayerPicker: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    shouldAnimate: true,
  });

  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.highDynamicRange = true;
  viewer.scene.postProcessStages.fxaa.enabled = true;

  // ─── LOAD CESIUM OSM BUILDINGS (3D Block Tiles) ───
  // We load this asynchronously so the viewer returns immediately
  Cesium.createOsmBuildingsAsync().then((tileset) => {
    // Optional: Style the buildings (e.g., make them white/gray)
    tileset.style = new Cesium.Cesium3DTileStyle({
      color: {
        conditions: [
          ["true", "color('white')"] // Standard blocky white look
        ]
      }
    });
    viewer.scene.primitives.add(tileset);
  }).catch((error) => {
    console.error("Error adding OSM Buildings:", error);
  });

  return viewer;
}
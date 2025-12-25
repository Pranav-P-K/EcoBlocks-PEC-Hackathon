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

export function highlightAQIBlock(
  viewer: Cesium.Viewer,
  lat: number,
  lon: number,
  aqi: number
) {
  const color =
    aqi > 150 ? Cesium.Color.RED.withAlpha(0.6) :
    aqi > 100 ? Cesium.Color.ORANGE.withAlpha(0.6) :
    Cesium.Color.YELLOW.withAlpha(0.6);

  return viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat),
    box: {
      dimensions: new Cesium.Cartesian3(400, 400, 50),
      material: color,
      outline: true,
      outlineColor: Cesium.Color.BLACK,
    },
  });
}

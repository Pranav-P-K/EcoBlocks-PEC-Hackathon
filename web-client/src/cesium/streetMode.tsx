import * as Cesium from "cesium";

export function enterStreetMode(
  viewer: Cesium.Viewer,
  lat: number,
  lon: number
) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, 15),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-8),
      roll: 0,
    },
    duration: 1.2,
  });

  const scene = viewer.scene;

  scene.fog.enabled = true;
  scene.fog.density = 0.004;
  scene.fog.minimumBrightness = 0.3;

  const bloom = scene.postProcessStages.bloom;
  bloom.enabled = true;
  bloom.uniforms.sigma = 6;
  bloom.uniforms.brightness = -0.2;

  scene.screenSpaceCameraController.enableCollisionDetection = true;
}

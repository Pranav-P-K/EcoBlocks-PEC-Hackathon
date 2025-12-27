import * as Cesium from "cesium";

export function enterStreetMode(
  viewer: Cesium.Viewer,
  lat: number,
  lon: number
) {
  const scene = viewer.scene;
  const camera = viewer.camera;

  // Target point (building / ground point)
  const target = Cesium.Cartesian3.fromDegrees(lon, lat, 0);

  // Drone parameters
  const height = 300;           // AB (meters)
  const distance = 500;         // AC (for 45° angle)
  const heading = Cesium.Math.toRadians(0); // facing north (change if needed)

  // Offset from target
  const offset = new Cesium.HeadingPitchRange(
    heading,
    Cesium.Math.toRadians(-45), // 45° downward view
    Math.sqrt(height * height + distance * distance)
  );

  camera.flyToBoundingSphere(
    new Cesium.BoundingSphere(target, 1),
    {
      offset,
      duration: 1.2,
    }
  );

  // Visual effects
  scene.fog.enabled = true;
  scene.fog.density = 0.004;
  scene.fog.minimumBrightness = 0.3;

  const bloom = scene.postProcessStages.bloom;
  bloom.enabled = true;
  bloom.uniforms.sigma = 6;
  bloom.uniforms.brightness = -0.2;

  scene.screenSpaceCameraController.enableCollisionDetection = true;
}

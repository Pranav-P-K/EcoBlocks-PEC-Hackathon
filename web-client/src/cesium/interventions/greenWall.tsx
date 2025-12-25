import * as Cesium from "cesium";

export function greenWallParticles(
  viewer: Cesium.Viewer,
  lat: number,
  lon: number
) {
  const position = Cesium.Cartesian3.fromDegrees(lon, lat, 5);

  return viewer.scene.primitives.add(
    new Cesium.ParticleSystem({
      image: "/particles/co2.png",
      startColor: Cesium.Color.RED.withAlpha(0.7),
      endColor: Cesium.Color.GREEN.withAlpha(0.2),
      startScale: 1.2,
      endScale: 0.3,
      minimumParticleLife: 2,
      maximumParticleLife: 4,
      minimumSpeed: 0.3,
      maximumSpeed: 1.2,
      emissionRate: 40,
      // gravity: -0.3,
      emitter: new Cesium.BoxEmitter(
        new Cesium.Cartesian3(5, 1, 3)
      ),
      modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(position),
    })
  );
}

import * as Cesium from "cesium";

export function dacParticles(
  viewer: Cesium.Viewer,
  lat: number,
  lon: number
) {
  const position = Cesium.Cartesian3.fromDegrees(lon, lat, 8);

  return viewer.scene.primitives.add(
    new Cesium.ParticleSystem({
      image: "/particles/co2.png",
      startColor: Cesium.Color.GRAY.withAlpha(0.8),
      endColor: Cesium.Color.TRANSPARENT,
      minimumParticleLife: 1,
      maximumParticleLife: 2.5,
      minimumSpeed: 2,
      maximumSpeed: 4,
      emissionRate: 80,
      // gravity: 1.5,
      emitter: new Cesium.ConeEmitter(Cesium.Math.toRadians(25)),
      modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(position),
    })
  );
}

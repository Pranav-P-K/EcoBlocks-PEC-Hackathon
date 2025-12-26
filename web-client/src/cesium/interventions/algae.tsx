import * as Cesium from "cesium";

export function algaeParticles(
  viewer: Cesium.Viewer,
  lat: number,
  lon: number
) {
  const position = Cesium.Cartesian3.fromDegrees(lon, lat, 3);

  return viewer.scene.primitives.add(
    new Cesium.ParticleSystem({
      image: "/o2.png",
      startColor: Cesium.Color.LIME.withAlpha(0.8),
      endColor: Cesium.Color.CYAN.withAlpha(0.2),
      minimumParticleLife: 3,
      maximumParticleLife: 6,
      minimumSpeed: 0.5,
      maximumSpeed: 1.5,
      emissionRate: 60,
      emitter: new Cesium.CircleEmitter(4),
      modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(position),
    })
  );
}

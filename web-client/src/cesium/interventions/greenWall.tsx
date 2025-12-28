import * as Cesium from "cesium";

interface BuildingDef {
  lat: number;
  lon: number;
  width?: number;
  depth?: number;
  height?: number;
}

/**
 * Adds Green Wall interventions to the scene.
 * Supports adding to a single location (legacy args) or multiple locations (array of objects).
 * * @param viewer Cesium Viewer instance
 * @param latOrBuildings Latitude number OR Array of building objects
 * @param lon Longitude (if single)
 * @param width Width (if single)
 * @param depth Depth (if single)
 * @param height Height (if single)
 */
export function addGreenWall(
  viewer: Cesium.Viewer,
  latOrBuildings: number | BuildingDef[],
  lon?: number,
  width: number = 30,
  depth: number = 30,
  height: number = 30
) {
  // Normalize input into an array of buildings
  let buildings: Required<BuildingDef>[] = [];

  if (Array.isArray(latOrBuildings)) {
    // Handle array input for multiple buildings
    buildings = latOrBuildings.map(b => ({
      lat: b.lat,
      lon: b.lon,
      width: b.width ?? 30,
      depth: b.depth ?? 30,
      height: b.height ?? 30
    }));
  } else if (typeof latOrBuildings === 'number' && typeof lon === 'number') {
    // Handle legacy single-location input
    buildings = [{
      lat: latOrBuildings,
      lon: lon,
      width: width,
      depth: depth,
      height: height
    }];
  }

  const cleanupFunctions: (() => void)[] = [];

  // Iterate over all targets and create visuals
  buildings.forEach(b => {
    const { lat, lon, width, depth, height } = b;

    // 1. Create the Visual "Green Wall" Structure
    // Using PolygonGraphics with an inner hole to create a "wrapping" wall effect

    const metersPerDegreeLat = 111111;
    const metersPerDegreeLon = 111111 * Math.cos(Cesium.Math.toRadians(lat));

    const padding = 1.0; // Distance from building face
    const wallThickness = 0.5; // Thickness of the vegetation layer

    // Calculate offsets for Outer Ring (Building + Padding)
    const outerDX = (width / 2 + padding) / metersPerDegreeLon;
    const outerDY = (depth / 2 + padding) / metersPerDegreeLat;

    // Calculate offsets for Inner Ring (Hole)
    const innerDX = (width / 2 + padding - wallThickness) / metersPerDegreeLon;
    const innerDY = (depth / 2 + padding - wallThickness) / metersPerDegreeLat;

    const outerPositions = Cesium.Cartesian3.fromDegreesArray([
      lon - outerDX, lat - outerDY, // SW
      lon + outerDX, lat - outerDY, // SE
      lon + outerDX, lat + outerDY, // NE
      lon - outerDX, lat + outerDY  // NW
    ]);

    const innerPositions = Cesium.Cartesian3.fromDegreesArray([
      lon - innerDX, lat - innerDY,
      lon + innerDX, lat - innerDY,
      lon + innerDX, lat + innerDY,
      lon - innerDX, lat + innerDY
    ]);

    const wallEntity = viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(outerPositions, [
          new Cesium.PolygonHierarchy(innerPositions)
        ]),
        height: 0,
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        extrudedHeight: height,
        extrudedHeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        material: new Cesium.ColorMaterialProperty(
          Cesium.Color.FORESTGREEN.withAlpha(0.8) // Denser green for the wall structure
        ),
        outline: true,
        outlineColor: Cesium.Color.LIME,
      }
    });
    cleanupFunctions.push(() => viewer.entities.remove(wallEntity));

    // 2. Create the Particle System (Air Cleaning Effect - Base)
    const particlePosition = Cesium.Cartesian3.fromDegrees(lon, lat, 1);

    const particleSystem = new Cesium.ParticleSystem({
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
      // Emitter scales with the building size (plus padding) to cover the area
      emitter: new Cesium.BoxEmitter(new Cesium.Cartesian3(width + 2, depth + 2, 10)),
      modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(particlePosition),
    });

    const p1 = viewer.scene.primitives.add(particleSystem);
    cleanupFunctions.push(() => viewer.scene.primitives.remove(p1));

    // 3. Create the CO2 Emission Particle System (Pollution Effect - Roof)
    const roofPosition = Cesium.Cartesian3.fromDegrees(lon, lat, height);

    const emissionSystem = new Cesium.ParticleSystem({
      image: "/particles/co2.png", // Reusing asset, tinted grey for smoke/carbon
      startColor: Cesium.Color.GRAY.withAlpha(0.5),
      endColor: Cesium.Color.DARKGRAY.withAlpha(0.0), // Fades out
      startScale: 2.0,
      endScale: 5.0, // Expands as it rises
      minimumParticleLife: 3,
      maximumParticleLife: 5,
      minimumSpeed: 2.0, // Rising speed
      maximumSpeed: 4.0,
      emissionRate: 15,
      // Use CircleEmitter to create a rising plume from the roof
      emitter: new Cesium.CircleEmitter(Math.min(width, depth) / 2),
      modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(roofPosition),
    });

    const p2 = viewer.scene.primitives.add(emissionSystem);
    cleanupFunctions.push(() => viewer.scene.primitives.remove(p2));
  });

  // 4. Return a cleanup function that removes ALL created entities/primitives
  return {
    remove: () => {
      cleanupFunctions.forEach(fn => fn());
    },
  };
}
import * as Cesium from "cesium";

interface BuildingDef {
  lat: number;
  lon: number;
  width?: number;
  depth?: number;
  height?: number;
}

/**
 * Adds Algae Panel interventions (Bio-reactive Facades) to the scene.
 * Uses PolygonGraphics to create semi-transparent, bio-luminescent panels wrapping the building.
 * * @param viewer Cesium Viewer instance
 * @param latOrBuildings Latitude number OR Array of building objects
 * @param lon Longitude (if single)
 * @param width Width (if single)
 * @param depth Depth (if single)
 * @param height Height (if single)
 */
export function addAlgaePanels(
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
    buildings = latOrBuildings.map(b => ({
      lat: b.lat,
      lon: b.lon,
      width: b.width ?? 30,
      depth: b.depth ?? 30,
      height: b.height ?? 30
    }));
  } else if (typeof latOrBuildings === 'number' && typeof lon === 'number') {
    buildings = [{ lat: latOrBuildings, lon, width, depth, height }];
  }

  const cleanupFunctions: (() => void)[] = [];

  buildings.forEach(b => {
    const { lat, lon, width, depth, height } = b;
    // Panels are mounted on the facade. We create a shell around the building.
    const padding = 0.5; // Small offset from actual building face
    const panelThickness = 0.2; // Thin panels

    // Calculate Lat/Lon offsets
    const metersPerDegreeLat = 111111;
    const metersPerDegreeLon = 111111 * Math.cos(Cesium.Math.toRadians(lat));

    // Outer boundary (Building + Padding)
    const outerDX = (width / 2 + padding) / metersPerDegreeLon;
    const outerDY = (depth / 2 + padding) / metersPerDegreeLat;

    // Inner boundary (Hole)
    const innerDX = (width / 2 + padding - panelThickness) / metersPerDegreeLon;
    const innerDY = (depth / 2 + padding - panelThickness) / metersPerDegreeLat;

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

    // 1. Create the Facade Panels using PolygonGraphics
    // We extrude a polygon with a hole to create the vertical panels
    const panelEntity = viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(outerPositions, [
          new Cesium.PolygonHierarchy(innerPositions)
        ]),
        height: 0,
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        extrudedHeight: height,
        extrudedHeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        material: new Cesium.ColorMaterialProperty(
          // "Slight green/blue tint (like bioreactor glass)" with "Low opacity"
          Cesium.Color.fromCssColorString('#00FFCC').withAlpha(0.3)
        ),
        outline: true,
        // "Subtle emissive glow" simulated via bright outline
        outlineColor: Cesium.Color.fromCssColorString('#AAFFDD').withAlpha(0.8),
        outlineWidth: 2,
      }
    });
    cleanupFunctions.push(() => viewer.entities.remove(panelEntity));

    // 2. Add "Photosynthesis" Particle System
    // Simulates oxygen bubbles or bio-activity rising from the panels
    const particlePos = Cesium.Cartesian3.fromDegrees(lon, lat, 1);
    const particleSystem = new Cesium.ParticleSystem({
      image: "/particles/o2.png", // Ensure this asset exists in your public folder
      startColor: Cesium.Color.CYAN.withAlpha(0.6),
      endColor: Cesium.Color.WHITE.withAlpha(0.0),
      startScale: 0.8,
      endScale: 1.5,
      minimumParticleLife: 2,
      maximumParticleLife: 5,
      minimumSpeed: 0.5,
      maximumSpeed: 1.5,
      emissionRate: 20,
      // Emit from the perimeter of the building
      emitter: new Cesium.BoxEmitter(new Cesium.Cartesian3(width + 2, depth + 2, 5)),
      modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(particlePos),
    });

    const p = viewer.scene.primitives.add(particleSystem);
    cleanupFunctions.push(() => viewer.scene.primitives.remove(p));
  });

  // Return standard cleanup object
  return {
    remove: () => {
      cleanupFunctions.forEach(fn => fn());
    }
  };
}

// Backward compatibility alias for App.tsx
export const algaeParticles = addAlgaePanels;
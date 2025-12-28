import * as Cesium from "cesium";

interface BuildingDef {
  lat: number;
  lon: number;
  width?: number;
  depth?: number;
  height?: number;
}

/**
 * Adds Direct Air Capture (DAC) modular units to the rooftops of selected buildings.
 * Simulates industrial carbon capture with "Suction" (pollution in) and "Exhaust" (clean air out) effects.
 * * @param viewer Cesium Viewer instance
 * @param latOrBuildings Latitude number OR Array of building objects
 * @param lon Longitude (if single)
 * @param width Width (if single)
 * @param depth Depth (if single)
 * @param height Height (if single)
 */
export function addDirectAirCapture(
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

    // 1. VISUALS: Modular Rooftop Units
    // We'll place 2-4 units depending on roof size, but for MVP let's place a "Double Unit" array.
    const unitWidth = width * 0.6;
    const unitDepth = depth * 0.3;
    const unitHeight = 4; // 4 meters tall machinery
    const roofElevation = height;

    // Create the Main DAC Unit Entity (Metallic Box)
    const dacUnitEntity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat, roofElevation + (unitHeight / 2)),
      box: {
        dimensions: new Cesium.Cartesian3(unitWidth, unitDepth, unitHeight),
        material: new Cesium.ColorMaterialProperty(Cesium.Color.LIGHTSLATEGRAY), // Industrial Steel
        outline: true,
        outlineColor: Cesium.Color.DARKSLATEGRAY,
        // Ensure it sits ON TOP of the building (using RELATIVE_TO_GROUND adds to terrain height)
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      }
    });
    cleanupFunctions.push(() => viewer.entities.remove(dacUnitEntity));

    // Add visual details: "Vents/Fans" on top (Darker patches)
    const fanEntity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat, roofElevation + unitHeight + 0.1),
      ellipse: {
        semiMinorAxis: unitDepth * 0.3,
        semiMajorAxis: unitWidth * 0.4,
        material: Cesium.Color.DARKSLATEGRAY.withAlpha(0.8), // Fan grill look
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        height: roofElevation + unitHeight + 0.1 // Just above the box
      }
    });
    cleanupFunctions.push(() => viewer.entities.remove(fanEntity));


    // 2. PARTICLE SYSTEM: Pollution Intake (Suction Effect)
    // Particles spawn around the unit and get pulled IN
    const intakeCenter = Cesium.Cartesian3.fromDegrees(lon, lat, roofElevation + (unitHeight / 2));

    // Custom update function to simulate "Suction" physics
    const suctionUpdate = (particle: any, dt: number) => {
      const position = particle.position;
      const direction = new Cesium.Cartesian3();

      // Calculate vector from particle to center
      Cesium.Cartesian3.subtract(intakeCenter, position, direction);
      const distance = Cesium.Cartesian3.magnitude(direction);

      // Normalize
      Cesium.Cartesian3.normalize(direction, direction);

      // Accelerate towards center (Suction force)
      // Closer particles move faster
      const speed = 5.0 + (10.0 / (distance + 0.1));
      Cesium.Cartesian3.multiplyByScalar(direction, speed * dt, direction);

      // Move particle
      Cesium.Cartesian3.add(particle.position, direction, particle.position);

      // If too close to center, kill particle (it's "captured")
      if (distance < 2.0) {
        particle.life = 0;
      }
    };

    const intakeSystem = new Cesium.ParticleSystem({
      image: "/particles/co2.png", // Ensure asset exists
      startColor: Cesium.Color.GRAY.withAlpha(0.5), // Pollution smog
      endColor: Cesium.Color.BLACK.withAlpha(0.8),  // Darkening as it compresses
      startScale: 3.0,
      endScale: 1.0, // Shrinks as it gets sucked in
      minimumParticleLife: 1.5,
      maximumParticleLife: 3.0,
      emissionRate: 20,
      // Spawn particles in a wider box around the unit
      emitter: new Cesium.BoxEmitter(new Cesium.Cartesian3(width * 1.5, depth * 1.5, 10)),
      modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(intakeCenter),
      updateCallback: suctionUpdate
    });
    const p1 = viewer.scene.primitives.add(intakeSystem);
    cleanupFunctions.push(() => viewer.scene.primitives.remove(p1));


    // 3. PARTICLE SYSTEM: Clean Air Exhaust (Vertical Stream)
    // Shoots straight up from the fans
    const exhaustPos = Cesium.Cartesian3.fromDegrees(lon, lat, roofElevation + unitHeight);

    const exhaustSystem = new Cesium.ParticleSystem({
      image: "/particles/o2.png", // Or a generic glow
      startColor: Cesium.Color.CYAN.withAlpha(0.7),
      endColor: Cesium.Color.WHITE.withAlpha(0.0), // Fades into atmosphere
      startScale: 1.0,
      endScale: 4.0, // Expands into the air
      minimumParticleLife: 2,
      maximumParticleLife: 4,
      minimumSpeed: 5.0, // Fast upward thrust
      maximumSpeed: 8.0,
      emissionRate: 10,
      // Cone emitter pointing UP (Z-axis is Up in model matrix)
      emitter: new Cesium.ConeEmitter(Cesium.Math.toRadians(15)),
      modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(exhaustPos),
    });
    const p2 = viewer.scene.primitives.add(exhaustSystem);
    cleanupFunctions.push(() => viewer.scene.primitives.remove(p2));

  });

  return {
    remove: () => {
      cleanupFunctions.forEach(fn => fn());
    }
  };
}

// Backward compatibility alias for App.tsx
export const dacParticles = addDirectAirCapture;
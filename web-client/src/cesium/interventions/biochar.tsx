import * as Cesium from "cesium";

/**
 * Adds Biochar Soil Amendment visualization.
 * Creates a dark, carbon-rich layer on the ground around the building.
 */
export function addBiochar(
    viewer: Cesium.Viewer,
    lat: number,
    lon: number,
    width: number = 30,
    depth: number = 30
) {
    // Create a ground-level "skirt" representing treated soil
    const biocharEntity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 0.2), // Just above ground
        box: {
            // Wider than the building to show landscaping area
            dimensions: new Cesium.Cartesian3(width + 10, depth + 10, 0.4),
            material: new Cesium.ColorMaterialProperty(
                Cesium.Color.fromCssColorString('#212121').withAlpha(0.8) // Charcoal color
            ),
            outline: true,
            outlineColor: Cesium.Color.BLACK,
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        },
    });

    // Optional: "Sequestration" particles (slowly sinking/grounding)
    const particlePos = Cesium.Cartesian3.fromDegrees(lon, lat, 1);
    const particleSystem = new Cesium.ParticleSystem({
        image: "/particles/co2.png", // Reuse existing asset
        startColor: Cesium.Color.GRAY.withAlpha(0.5),
        endColor: Cesium.Color.BLACK.withAlpha(0.8),
        startScale: 1.0,
        endScale: 0.5,
        minimumParticleLife: 3,
        maximumParticleLife: 6,
        speed: 0.5,
        emissionRate: 10,
        emitter: new Cesium.BoxEmitter(new Cesium.Cartesian3(width + 10, depth + 10, 1)),
        modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(particlePos),
    });

    const primitive = viewer.scene.primitives.add(particleSystem);

    return {
        remove: () => {
            viewer.entities.remove(biocharEntity);
            viewer.scene.primitives.remove(primitive);
        },
    };
}
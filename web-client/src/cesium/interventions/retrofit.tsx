import * as Cesium from "cesium";

/**
 * Adds Building Envelope Retrofit visualization.
 * Wraps the building in a thermal insulation layer (Amber/Orange tint).
 */
export function addRetrofit(
    viewer: Cesium.Viewer,
    lat: number,
    lon: number,
    width: number = 30,
    depth: number = 30,
    height: number = 30
) {
    // Create a slightly larger box to wrap the existing building
    const retrofitEntity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, height / 2),
        box: {
            dimensions: new Cesium.Cartesian3(width + 1, depth + 1, height),
            material: new Cesium.ColorMaterialProperty(
                Cesium.Color.ORANGE.withAlpha(0.3) // Thermal insulation look
            ),
            outline: true,
            outlineColor: Cesium.Color.ORANGE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        },
    });

    return {
        remove: () => {
            viewer.entities.remove(retrofitEntity);
        },
    };
}
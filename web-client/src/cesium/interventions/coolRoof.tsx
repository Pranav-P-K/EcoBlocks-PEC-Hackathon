import * as Cesium from "cesium";

/**
 * Adds Cool Roof (White) + Solar Panel visualization.
 */
export function addCoolRoofSolar(
    viewer: Cesium.Viewer,
    lat: number,
    lon: number,
    width: number = 30,
    depth: number = 30,
    height: number = 30
) {
    const entities: Cesium.Entity[] = [];

    // 1. The Cool Roof Layer (White coating)
    const coolRoof = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, height + 0.1),
        box: {
            dimensions: new Cesium.Cartesian3(width, depth, 0.2),
            material: Cesium.Color.WHITESMOKE,
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        }
    });
    entities.push(coolRoof);

    // 2. Solar Panels (Array of blue rectangles)
    const rows = 3;
    const cols = 2;
    const panelWidth = width / cols * 0.8;
    const panelDepth = depth / rows * 0.8;

    // Calculate offsets to place panels in a grid on the roof
    const metersPerDegreeLat = 111111;
    const metersPerDegreeLon = 111111 * Math.cos(Cesium.Math.toRadians(lat));

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            // Calculate offset from center
            const offsetX = ((c - (cols - 1) / 2) * (width / cols)) / metersPerDegreeLon;
            const offsetY = ((r - (rows - 1) / 2) * (depth / rows)) / metersPerDegreeLat;

            const panel = viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(lon + offsetX, lat + offsetY, height + 0.3),
                box: {
                    dimensions: new Cesium.Cartesian3(panelWidth, panelDepth, 0.1),
                    material: Cesium.Color.NAVY.withAlpha(0.9), // Dark Blue Solar Cells
                    outline: true,
                    outlineColor: Cesium.Color.SILVER,
                    heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
                }
            });
            entities.push(panel);
        }
    }

    return {
        remove: () => {
            entities.forEach(e => viewer.entities.remove(e));
        },
    };
}
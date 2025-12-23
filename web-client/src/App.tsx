/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

// Interfaces for our data structures
interface BlockData {
  aqi: number;
  traffic: string;
  locationName: string;
  lat: number;
  lng: number;
}

interface SimResult {
  newAQI: number;
  credits: number;
  aiInsight: string;
}

const App: React.FC = () => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const cesiumViewer = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [blockData, setBlockData] = useState<BlockData | null>(null);
  const [simResult, setSimResult] = useState<SimResult | null>(null);

  // 1. Initialize Cesium on Mount
  useEffect(() => {
    if (!viewerRef.current) return;

    // Set Access Token
    Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

    // Initialize the Viewer
    const viewer = new Cesium.Viewer(viewerRef.current, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      infoBox: false,
      selectionIndicator: false,
    });

    Cesium.createWorldTerrainAsync().then((terrainProvider) => {
      viewer.terrainProvider = terrainProvider;
    });

    // Proxy for OSM Tiles to bypass CORS
    const proxyImageryProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'http://localhost:5000/api/proxy-tile/{z}/{x}/{y}',
      maximumLevel: 19
    });
    viewer.imageryLayers.addImageryProvider(proxyImageryProvider);

    // Load 3D Buildings
    Cesium.Cesium3DTileset.fromIonAssetId(96188).then((tileset) => {
      viewer.scene.primitives.add(tileset);
    });

    // Initial View: Bengaluru
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(77.5946, 12.9716, 2000),
      orientation: {
        pitch: Cesium.Math.toRadians(-35)
      }
    });

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: any) => {
      const pickedObject = viewer.scene.pick(click.position);
      if (Cesium.defined(pickedObject) && pickedObject.primitive instanceof Cesium.Cesium3DTileset) {
        // Get lat/lng of the click
        const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
        if (cartesian) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          const lat = Cesium.Math.toDegrees(cartographic.latitude);
          const lng = Cesium.Math.toDegrees(cartographic.longitude);

          fetchDataForCoords(lat, lng, "Selected Building Block");
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    cesiumViewer.current = viewer;

    return () => {
      if (cesiumViewer.current) {
        cesiumViewer.current.destroy();
      }
    };
  }, []);

  const fetchDataForCoords = async (lat: number, lng: number, name: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/block-data?lat=${lat}&lng=${lng}`);
      setBlockData({ ...res.data, locationName: name });
      drawAQIHeatmap(lat, lng, res.data.aqi);
      setSimResult(null);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const drawAQIHeatmap = (lat: number, lng: number, aqi: number) => {
    const viewer = cesiumViewer.current;
    if (!viewer) return;

    const color =
      aqi < 50
        ? Cesium.Color.GREEN.withAlpha(0.4)
        : aqi < 100
          ? Cesium.Color.YELLOW.withAlpha(0.45)
          : aqi < 150
            ? Cesium.Color.ORANGE.withAlpha(0.5)
            : Cesium.Color.RED.withAlpha(0.55);

    viewer.entities.removeAll();

    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lng, lat),
      ellipse: {
        semiMajorAxis: 500,
        semiMinorAxis: 500,
        material: color,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      }
    });
  };

  // Handle Search & Fly To
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery || !cesiumViewer.current) return;

    try {
      setLoading(true);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`;
      const res = await axios.get(url);

      if (res.data.length > 0) {
        const { lat, lon, display_name } = res.data[0];

        cesiumViewer.current.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(parseFloat(lon), parseFloat(lat), 1500),
          duration: 3
        });

        // Fetch AQI from backend
        const backendRes = await axios.get(`http://localhost:5000/api/block-data?lat=${lat}&lng=${lon}`);
        setBlockData({ ...backendRes.data, locationName: display_name });
        setSimResult(null);
      } else {
        alert("Location not found.");
      }
    } catch (err) {
      console.error("Search error", err);
    } finally {
      setLoading(false);
    }
  };

  // Run Carbon Simulation
  const runSimulation = async (intervention: string) => {
    if (!blockData) return;
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/simulate', {
        blockId: 1,
        intervention: intervention,
        currentAQI: blockData ? blockData.aqi : 150
      });
      setSimResult(res.data);
      animateInterventionEffect(blockData.lat, blockData.lng);
    } catch (err) {
      console.error("Simulation error", err);
    }
    setLoading(false);
  };

  const animateInterventionEffect = (lat: number, lng: number) => {
    const viewer = cesiumViewer.current;
    if (!viewer) return;

    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lng, lat),
      ellipse: {
        semiMajorAxis: new Cesium.CallbackProperty((_time) => {
          return 300 + (Math.sin(Date.now() / 400) + 1) * 200;
        }, false),
        semiMinorAxis: new Cesium.CallbackProperty((_time) => {
          return 300 + (Math.sin(Date.now() / 400) + 1) * 200;
        }, false),
        material: Cesium.Color.CYAN.withAlpha(0.35),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      }
    });

    setTimeout(() => viewer.entities.remove(entity), 5000);
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden' }}>

      {/* SIDEBAR UI */}
      <div style={{
        width: '380px', background: 'rgba(15, 15, 15, 0.98)', color: 'white',
        padding: '25px', zIndex: 100, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid #333', boxShadow: '5px 0 15px rgba(0,0,0,0.5)'
      }}>

        <h2 style={{ color: '#00ff88', marginBottom: '20px' }}>EcoBlocks 🌍</h2>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '25px' }}>
          <input
            type="text"
            placeholder="Search city (e.g. Delhi)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white' }}
          />
          <button type="submit" disabled={loading} style={{ background: '#00ff88', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '12px' }}>
            {loading ? '...' : '🔍'}
          </button>
        </form>

        {blockData && (
          <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
            <p style={{ fontSize: '0.7rem', color: '#888', marginBottom: '4px' }}>CURRENT LOCATION</p>
            <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '15px', color: '#eee' }}>{blockData.locationName}</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Live AQI</span>
              <b style={{ color: blockData.aqi > 100 ? '#ff4444' : '#00ff88' }}>{blockData.aqi}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Traffic Flow</span>
              <span style={{ color: '#aaa' }}>{blockData.traffic}</span>
            </div>
          </div>
        )}

        {blockData && !simResult && (
          <div style={{ marginTop: '25px' }}>
            <h4 style={{ color: '#888', marginBottom: '10px' }}>🧪 INTERVENTIONS</h4>
            {['Green Wall', 'Algae Panel', 'Direct Air Capture'].map(tech => (
              <button
                key={tech}
                onClick={() => runSimulation(tech)}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px', marginTop: '10px',
                  background: '#222', color: 'white', border: '1px solid #333', borderRadius: '8px',
                  cursor: 'pointer', textAlign: 'left'
                }}
              >
                + {tech}
              </button>
            ))}
          </div>
        )}

        {simResult && (
          <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '20px' }}>
            <h3 style={{ color: '#00ff88' }}>Impact Analysis</h3>
            <p>New AQI: <b style={{ color: '#00ff88' }}>{simResult.newAQI}</b></p>
            <p>Credits: <b>+{simResult.credits}</b></p>
            <div style={{ background: '#000', padding: '15px', borderRadius: '8px', fontSize: '0.85rem', color: '#00ff88', borderLeft: '4px solid #00ff88', marginTop: '10px' }}>
              "{simResult.aiInsight}"
            </div>
            <button
              onClick={() => setSimResult(null)}
              style={{ width: '100%', marginTop: '15px', padding: '10px', background: 'transparent', color: '#555', border: 'none', cursor: 'pointer' }}>
              Reset Simulation
            </button>
          </div>
        )}
      </div>

      {/* 3D MAP VIEW */}
      <div ref={viewerRef} style={{ flex: 1, background: '#000' }} />

      {/* CSS Reset for Full-Screen Map */}
      <style>{`
        body, html, #root { 
          margin: 0 !important; 
          padding: 0 !important; 
          width: 100% !important; 
          height: 100% !important; 
          display: block !important;
        }
        .cesium-viewer { width: 100%; height: 100%; }
      `}</style>
    </div>
  );
};

export default App;
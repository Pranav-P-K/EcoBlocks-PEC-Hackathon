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

interface User {
  id: string;
  name: string;
  credits: number;
}

const App: React.FC = () => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const cesiumViewer = useRef<any>(null);

  // App State
  const [activeTab, setActiveTab] = useState<'simulate' | 'history' | 'wallet'>('simulate');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User>({ id: 'guest', name: 'Guest', credits: 0 });

  // Data State
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [blockData, setBlockData] = useState<BlockData | null>(null);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [mintStatus, setMintStatus] = useState("");

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
    setActiveTab('simulate');
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

        // Auto-fetch data on arrival
        fetchDataForCoords(parseFloat(lat), parseFloat(lon), display_name.split(',')[0]);
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
        currentAQI: blockData ? blockData.aqi : 150,
        userId: user.id
      });
      setSimResult(res.data);
      animateInterventionEffect(blockData.lat, blockData.lng);

      // Update User Credits
      const newCredits = user.credits + res.data.credits;
      setUser(prev => ({ ...prev, credits: newCredits }));

      // Refresh history if logged in
      if (isLoggedIn) fetchHistory(user.id);

      // Play Audio
      if (res.data.audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${res.data.audioBase64}`);
        audio.play().catch(e => console.log("Audio play blocked by browser policy", e));
      }
    } catch (err) {
      console.error("Simulation error", err);
    }
    setLoading(false);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    const mockUser = { id: 'user_prod_001', name: 'City Architect', credits: 50 };
    setUser(mockUser);
    fetchHistory(mockUser.id);
  };

  const fetchHistory = async (id: string) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/history?userId=${id}`);
      setHistory(res.data);
    } catch (e) { console.error(e); }
  };

  const handleMint = async () => {
    setMintStatus("Minting on Solana Devnet...");
    try {
      const res = await axios.post('http://localhost:5000/api/mint-credit', { userId: user.id, credits: user.credits });
      setMintStatus(`Success! Tx: ${res.data.txHash.substring(0, 12)}...`);
    } catch (e) { setMintStatus("Mint Failed. Try again."); }
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
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* SIDEBAR */}
      <div style={{ width: '420px', background: 'rgba(18, 18, 18, 0.95)', color: 'white', display: 'flex', flexDirection: 'column', zIndex: 100, borderRight: '1px solid #333', backdropFilter: 'blur(20px)' }}>

        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #333' }}>
          <h2 style={{ margin: 0, color: '#00ff88', letterSpacing: '-1px' }}>EcoBlocks <span style={{ fontSize: '0.5em', color: '#666' }}>PRO</span></h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isLoggedIn ? '#00ff88' : '#666' }}></div>
              <span style={{ fontSize: '0.9rem', color: '#ccc' }}>{isLoggedIn ? user.name : "Guest Mode"}</span>
            </div>
            {!isLoggedIn && <button onClick={handleLogin} style={{ padding: '6px 12px', background: '#333', border: '1px solid #444', color: 'white', cursor: 'pointer', borderRadius: '4px', fontSize: '0.8rem' }}>Login</button>}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', background: '#111' }}>
          {['simulate', 'history', 'wallet'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{ flex: 1, padding: '15px', background: activeTab === tab ? '#1a1a1a' : 'transparent', border: 'none', color: activeTab === tab ? '#00ff88' : '#666', borderBottom: activeTab === tab ? '2px solid #00ff88' : '1px solid #333', cursor: 'pointer', textTransform: 'capitalize', fontWeight: 'bold' }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* TAB: SIMULATE */}
          {activeTab === 'simulate' && (
            <>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input type="text" placeholder="Search city..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white' }} />
                <button type="submit" disabled={loading} style={{ background: '#00ff88', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '0 15px', color: '#000', fontWeight: 'bold' }}>{loading ? '...' : 'GO'}</button>
              </form>

              {!blockData && <div style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>Click any building on the 3D map<br />or search for a city to begin.</div>}

              {blockData && (
                <div style={{ animation: 'fadeIn 0.5s' }}>
                  <div style={{ background: '#222', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>{blockData.locationName}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
                      <div><div style={{ fontSize: '0.8rem', color: '#888' }}>AQI LEVEL</div><div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: blockData.aqi > 100 ? '#ff4444' : '#00ff88' }}>{blockData.aqi}</div></div>
                      <div style={{ textAlign: 'right' }}><div style={{ fontSize: '0.8rem', color: '#888' }}>STATUS</div><div style={{ fontSize: '1rem', color: '#ccc' }}>{blockData.traffic}</div></div>
                    </div>
                  </div>

                  <h4 style={{ color: '#888', marginTop: '25px', marginBottom: '10px', fontSize: '0.8rem', letterSpacing: '1px' }}>AVAILABLE INTERVENTIONS</h4>
                  {['Green Wall', 'Algae Panel', 'Direct Air Capture'].map(tech => (
                    <button key={tech} disabled={loading} onClick={() => runSimulation(tech)} style={{ width: '100%', padding: '14px', marginBottom: '8px', background: 'linear-gradient(90deg, #222 0%, #1a1a1a 100%)', color: 'white', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
                      <span>+ {tech}</span>
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>Deploy</span>
                    </button>
                  ))}
                </div>
              )}

              {simResult && (
                <div style={{ marginTop: '20px', background: 'rgba(0, 255, 136, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid #00ff88' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#00ff88' }}>Impact Verified</h3>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div><div style={{ fontSize: '0.8rem', color: '#aaa' }}>NEW AQI</div><div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{simResult.newAQI}</div></div>
                    <div><div style={{ fontSize: '0.8rem', color: '#aaa' }}>CREDITS</div><div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>+{simResult.credits}</div></div>
                  </div>
                  <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.9rem', lineHeight: '1.4', fontStyle: 'italic', color: '#ddd' }}>
                    🔊 "{simResult.aiInsight}"
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB: HISTORY */}
          {activeTab === 'history' && (
            <div>
              {!isLoggedIn && <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Login to view your sustainability history.</div>}
              {history.map((h: any, i) => (
                <div key={i} style={{ padding: '15px', background: '#222', borderRadius: '8px', marginBottom: '10px', borderLeft: '3px solid #00ff88' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold' }}>{h.intervention_type}</span>
                    <span style={{ color: '#00ff88' }}>+{h.credits_earned}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>{new Date(h.created_at).toLocaleDateString()} • {h.co2_reduced} tons CO2</div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: WALLET */}
          {activeTab === 'wallet' && (
            <div style={{ textAlign: 'center', paddingTop: '40px' }}>
              <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'white', letterSpacing: '-2px' }}>{user.credits}</div>
              <div style={{ color: '#888', marginBottom: '30px' }}>Total Carbon Credits</div>

              <button
                onClick={handleMint}
                disabled={!isLoggedIn || user.credits === 0}
                style={{ background: 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)', border: 'none', padding: '16px 40px', borderRadius: '50px', color: '#000', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(20, 241, 149, 0.2)' }}
              >
                Mint on Solana
              </button>

              {mintStatus && (
                <div style={{ marginTop: '30px', padding: '15px', background: '#222', borderRadius: '8px', border: '1px solid #333' }}>
                  <div style={{ fontSize: '0.9rem', color: '#aaa' }}>STATUS</div>
                  <div style={{ color: '#fff' }}>{mintStatus}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3D MAP */}
      <div ref={viewerRef} style={{ flex: 1, background: '#000' }} />
      <style>{`body, html, #root { margin: 0; padding: 0; width: 100%; height: 100%; display: block; } .cesium-viewer { width: 100%; height: 100%; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

export default App;
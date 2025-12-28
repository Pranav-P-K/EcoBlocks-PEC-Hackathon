/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

/* ───────────── CESIUM CORE ───────────── */
import { initViewer } from "./cesium/initViewer";
import { enterCityMode, enableBuildingAQISelection } from "./cesium/cityMode";
import { enterStreetMode } from "./cesium/streetMode";

/* ───────────── INTERVENTIONS ───────────── */
import { addGreenWall } from "./cesium/interventions/greenWall";
import { addAlgaePanels } from "./cesium/interventions/algae";
import { addDirectAirCapture } from "./cesium/interventions/dac";
import { addRetrofit } from "./cesium/interventions/retrofit";
import { addBiochar } from "./cesium/interventions/biochar";
import { addCoolRoofSolar } from "./cesium/interventions/coolRoof";

/* ───────────── API LAYER ───────────── */
import { fetchAQIData } from "./api/aqi";
import { runSimulation } from "./api/simulate";

/* ───────────── UI COMPONENTS ───────────── */
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Wallet } from "./components/Wallet";
import { AnalyticsView } from "./components/AnalyticsView";

import './App.css';
import { Toaster } from 'react-hot-toast';

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

const App: React.FC = () => {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const viewer = useRef<Cesium.Viewer | null>(null);
  const interventionRef = useRef<any>(null); // Holds { remove: () => void }

  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [aqi, setAQI] = useState<number | null>(null);
  const [traffic, setTraffic] = useState<string | null>(null);
  const [buildingDensity, setBuildingDensity] = useState<string | null>(null);

  // NEW: Track number of selected buildings
  const [selectedBlockCount, setSelectedBlockCount] = useState(0);
  const selectionController = useRef<any>(null);

  const [selectedIntervention, setSelectedIntervention] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);

  /* INIT CESIUM */
  useEffect(() => {
    if (!viewerRef.current) return;
    viewer.current = initViewer(viewerRef.current);
    enterCityMode(viewer.current);

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.current.scene.canvas);
    handler.setInputAction((click: { position: Cesium.Cartesian2; }) => {
      const cartesian = viewer.current!.scene.pickPosition(click.position);
      if (!cartesian) return;
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      setCoords({
        lat: Cesium.Math.toDegrees(cartographic.latitude),
        lon: Cesium.Math.toDegrees(cartographic.longitude)
      });
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      viewer.current?.destroy();
    };
  }, []);

  /* DATA FETCH */
  useEffect(() => {
    if (!coords || !viewer.current) return;
    (async () => {
      const data = await fetchAQIData(coords.lat, coords.lon);
      setAQI(data.aqi);
      setTraffic(data.traffic);
      setBuildingDensity(data.buildingDensity);
      setSimulationResult(null);
      setSelectedIntervention(null);
      setShowAnalytics(false);
      setSelectedBlockCount(0); // Reset count on new area search

      // Clear old visuals
      if (interventionRef.current) {
        interventionRef.current.remove();
        interventionRef.current = null;
      }
    })();
  }, [coords]);

  /* BUILDING HIGHLIGHT */
  useEffect(() => {
    if (!viewer.current || aqi === null) return;
    if (selectionController.current) {
      selectionController.current.handler.destroy();
      selectionController.current.clearSelection();
    }

    // Pass callback to update count state
    selectionController.current = enableBuildingAQISelection(
      viewer.current,
      aqi,
      (count) => setSelectedBlockCount(count)
    );

    return () => selectionController.current?.clearSelection();
  }, [aqi]);

  /* UTILS */
  const handleCitySearch = async (city: string) => {
    if (!viewer.current) return;
    const res = await fetch(`${API_BASE}/geocode?q=${encodeURIComponent(city)}`);
    const data = await res.json();
    if (!data[0]) return;
    viewer.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(Number(data[0].lon), Number(data[0].lat), 2500),
      duration: 3,
    });
  };

  /* SIMULATION */
  const handleSimulate = async () => {
    if (!coords || !aqi || !selectedIntervention || !viewer.current) return;

    enterStreetMode(viewer.current, coords.lat, coords.lon);

    // Clear previous visuals
    if (interventionRef.current) {
      interventionRef.current.remove();
      interventionRef.current = null;
    }

    // --- APPLY VISUALS ---
    // Note: For now visual is applied to the center 'coords'. 
    // In a full implementation, we would iterate over 'selectedBuildings' from cityMode.
    switch (selectedIntervention) {
      case "Green Wall":
        interventionRef.current = addGreenWall(viewer.current, coords.lat, coords.lon);
        break;
      case "Algae Panel":
        interventionRef.current = addAlgaePanels(viewer.current, coords.lat, coords.lon);
        break;
      case "Direct Air Capture":
        interventionRef.current = addDirectAirCapture(viewer.current, coords.lat, coords.lon);
        break;
      case "Building Retrofit":
        interventionRef.current = addRetrofit(viewer.current, coords.lat, coords.lon);
        break;
      case "Biochar":
        interventionRef.current = addBiochar(viewer.current, coords.lat, coords.lon);
        break;
      case "Cool Roof + Solar":
        interventionRef.current = addCoolRoofSolar(viewer.current, coords.lat, coords.lon);
        break;
    }

    // Backend Call
    try {
      const result = await runSimulation({
        blockId: 1,
        intervention: selectedIntervention as any,
        currentAQI: aqi,
        buildingDensity: buildingDensity,
        traffic: traffic,
        areaType: "Urban",
        userId: "guest",
        // Pass block count to adjust credit/impact calculation if backend supports it
        blockCount: selectedBlockCount > 0 ? selectedBlockCount : 1
      });

      setSimulationResult(result);
      setCredits(result.credits);
    } catch (error) {
      console.error("Simulation failed:", error);
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <div ref={viewerRef} style={{ position: "absolute", inset: 0, zIndex: 0 }} />

      {/* ANALYTICS OVERLAY */}
      {showAnalytics && simulationResult && aqi && (
        <AnalyticsView
          initialAQI={aqi}
          newAQI={simulationResult.newAQI}
          intervention={selectedIntervention!}
          reductionAmount={simulationResult.reductionAmount}
          estimatedCost={simulationResult.estimatedCost || 0}
          densityMultiplier={simulationResult.densityMultiplier || 1}
          aiInsight={simulationResult.aiInsight}
          traffic={traffic || "Unknown"}
          buildingDensity={buildingDensity || "Unknown"}
          
          // 1. FIX: Pass the entire result object
          result={simulationResult} 
          
          onClose={() => setShowAnalytics(false)}
        />
      )}

      {/* MAIN UI LAYER */}
      <div style={{ position: "absolute", inset: 0, display: "flex", pointerEvents: "none", zIndex: 10 }}>
        <Sidebar
          onSearch={handleCitySearch}
          onLocateMe={(lat, lon) => {
            if (!viewer.current) return;
            viewer.current.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(lon, lat, 2500), duration: 2 });
            setCoords({ lat, lon });
          }}
          // 2. FIX: Type cast to solve mismatch
          onSelectIntervention={(val: any) => setSelectedIntervention(val)}
          onSimulate={handleSimulate}
          selectedIntervention={selectedIntervention}
          selectedBlockCount={selectedBlockCount} // PASS COUNT TO SIDEBAR
        />

        {!showAnalytics && (
          <Dashboard
            aqi={aqi}
            traffic={traffic}
            areaType={areaType}
            treeDensity={treeDensity}
          
            buildingDensity={buildingDensity}
            intervention={selectedIntervention}
            result={simulationResult}
            onViewAnalytics={() => setShowAnalytics(true)}
          />
        )}

        <Wallet credits={credits} />
      </div>
      <Toaster position="top-center" />
    </div>
  );
};

export default App;
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import '../App.css'

/* ───────────── CESIUM CORE ───────────── */
import { initViewer } from "../cesium/initViewer";
import { enterCityMode, enableBuildingAQISelection } from "../cesium/cityMode";
import { enterStreetMode } from "../cesium/streetMode";

/* ───────────── INTERVENTIONS ───────────── */
import { addGreenWall } from "../cesium/interventions/greenWall";
import { addAlgaePanels } from "../cesium/interventions/algae";
import { addDirectAirCapture } from "../cesium/interventions/dac";
import { addRetrofit } from "../cesium/interventions/retrofit";
import { addBiochar } from "../cesium/interventions/biochar";
import { addCoolRoofSolar } from "../cesium/interventions/coolRoof";

/* ───────────── API LAYER ───────────── */
import { fetchAQIData } from "../api/aqi";
import { runSimulation } from "../api/simulate";

/* ───────────── UI COMPONENTS ───────────── */
import { Sidebar } from "./Sidebar";
import { Dashboard } from "./Dashboard";
import { Wallet } from "./Wallet";
import { AnalyticsView } from "./AnalyticsView";

import '../App.css';
import { Toaster } from 'react-hot-toast';

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

const DashboardPage: React.FC = () => {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const viewer = useRef<Cesium.Viewer | null>(null);
  const interventionRef = useRef<any>(null);

  // 1. STATE DEFINITIONS
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [aqi, setAQI] = useState<number | null>(null);
  const [traffic, setTraffic] = useState<string | null>(null);
  const [buildingDensity, setBuildingDensity] = useState<string | null>(null);

  // FIXED: Restored missing state variables
  const [areaType, setAreaType] = useState<string | null>(null);
  const [treeDensity, setTreeDensity] = useState<string | null>(null);
  const [counts, setCounts] = useState({ buildings: 0, trees: 0 });

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
      
      // FIXED: Update new states
      setAreaType(data.areaType);
      setTreeDensity(data.treeDensity);
      setCounts({ buildings: data.buildingCount, trees: data.treeCount });

      setSimulationResult(null);
      setSelectedIntervention(null);
      setShowAnalytics(false);

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

    // FIXED: Removed 3rd argument (callback) to match cityMode.ts signature
    selectionController.current = enableBuildingAQISelection(
      viewer.current,
      aqi
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

    if (interventionRef.current) {
      interventionRef.current.remove();
      interventionRef.current = null;
    }

    // --- APPLY VISUALS ---
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
        
        // Context Data
        buildingDensity: buildingDensity,
        areaType: areaType, // FIXED: Now passing correctly
        treeDensity: treeDensity, // FIXED: Now passing correctly
        treeCount: counts.trees,
        
        traffic: traffic,
        userId: "guest",
        lat: coords.lat,
        lon: coords.lon
        
        // FIXED: Removed 'blockCount' as it doesn't exist on the interface
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
          traffic={traffic || "Unknown"}
          buildingDensity={buildingDensity || "Unknown"}
          
          // FIXED: Removed extra props (densityMultiplier, aiInsight)
          // The result object contains everything needed
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
          onSelectIntervention={(val: any) => setSelectedIntervention(val)}
          onSimulate={handleSimulate}
          selectedIntervention={selectedIntervention}
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

export default DashboardPage;
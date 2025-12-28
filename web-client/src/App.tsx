/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

/* ───────────── CESIUM CORE ───────────── */
import { initViewer } from "./cesium/initViewer";
import { enterCityMode, enableBuildingAQISelection } from "./cesium/cityMode";
import { enterStreetMode } from "./cesium/streetMode";

/* ───────────── INTERVENTIONS ───────────── */
import { addGreenWall } from "./cesium/interventions/greenWall"; // UPDATED IMPORT
import { algaeParticles } from "./cesium/interventions/algae";
import { dacParticles } from "./cesium/interventions/dac";

/* ───────────── API LAYER ───────────── */
import { fetchAQIData } from "./api/aqi";
import { runSimulation } from "./api/simulate";

/* ───────────── UI COMPONENTS ───────────── */
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Wallet } from "./components/Wallet";
import LandingPage from "./components/LandingPage";
import { AnalyticsView } from "./components/AnalyticsView";

import './App.css';
import { Toaster } from 'react-hot-toast';

// FIX: Define API_BASE properly - should be in .env
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

const AppContent: React.FC = () => {
  /* ───────────── REFS ───────────── */
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const viewer = useRef<Cesium.Viewer | null>(null);

  // Ref to track the current intervention (can be a primitive or an object with remove())
  const interventionRef = useRef<any>(null);

  /* ───────────── GLOBAL STATE ───────────── */
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [aqi, setAQI] = useState<number | null>(null);
  const [traffic, setTraffic] = useState<string | null>(null);
  const [buildingDensity, setBuildingDensity] = useState<string | null>(null);
  const selectionController = useRef<any>(null);

  const [selectedIntervention, setSelectedIntervention] = useState<
    "Green Wall" | "Algae Panel" | "Direct Air Capture" | null
  >(null);

  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [credits, setCredits] = useState(0);

  const [showAnalytics, setShowAnalytics] = useState(false);

  /* ───────────── INIT CESIUM ───────────── */
  useEffect(() => {
    if (!viewerRef.current) return;

    viewer.current = initViewer(viewerRef.current);
    enterCityMode(viewer.current);

    const handler = new Cesium.ScreenSpaceEventHandler(
      viewer.current.scene.canvas
    );

    handler.setInputAction((click: { position: Cesium.Cartesian2; }) => {
      const cartesian = viewer.current!.scene.pickPosition(click.position);
      if (!cartesian) return;

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);
      const lon = Cesium.Math.toDegrees(cartographic.longitude);

      setCoords({ lat, lon });
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      viewer.current?.destroy();
    };
  }, []);

  /* ───────────── AQI FETCH ON BLOCK SELECT ───────────── */
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

      // Clear previous intervention when moving location
      if (interventionRef.current) {
        if (typeof interventionRef.current.remove === 'function') {
          interventionRef.current.remove();
        } else {
          viewer.current!.scene.primitives.remove(interventionRef.current);
        }
        interventionRef.current = null;
      }
    })();
  }, [coords]);

  useEffect(() => {
    if (!viewer.current || aqi === null) return;

    if (selectionController.current) {
      selectionController.current.handler.destroy();
      selectionController.current.clearSelection();
    }

    selectionController.current = enableBuildingAQISelection(
      viewer.current,
      aqi
    );

    return () => {
      selectionController.current?.clearSelection();
    };
  }, [aqi]);

  /* ───────────── CITY SEARCH ───────────── */
  const handleCitySearch = async (city: string) => {
    if (!viewer.current) return;

    const res = await fetch(
      `${API_BASE}/geocode?q=${encodeURIComponent(city)}`
    );
    const data = await res.json();

    if (!data[0]) return;

    viewer.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        Number(data[0].lon),
        Number(data[0].lat),
        2500
      ),
      duration: 3,
    });
  };

  /* ───────────── RUN DIGITAL TWIN SIMULATION ───────────── */
  const handleSimulate = async () => {
    if (!coords || !aqi || !selectedIntervention || !viewer.current) return;

    enterStreetMode(viewer.current, coords.lat, coords.lon);

    /* FIX: Clear existing intervention visuals */
    if (interventionRef.current) {
      if (typeof interventionRef.current.remove === 'function') {
        interventionRef.current.remove();
      } else {
        viewer.current.scene.primitives.remove(interventionRef.current);
      }
      interventionRef.current = null;
    }

    /* Launch Visuals based on Selection */
    if (selectedIntervention === "Green Wall") {
      // NEW: Uses the object with .remove()
      interventionRef.current = addGreenWall(viewer.current, coords.lat, coords.lon);
    } else if (selectedIntervention === "Algae Panel") {
      interventionRef.current = algaeParticles(viewer.current, coords.lat, coords.lon);
    } else if (selectedIntervention === "Direct Air Capture") {
      interventionRef.current = dacParticles(viewer.current, coords.lat, coords.lon);
    }

    try {
      const result = await runSimulation({
        blockId: 1,
        intervention: selectedIntervention,
        currentAQI: aqi,
        buildingDensity: buildingDensity,
        traffic: traffic, // Passing traffic for better AI insights
        areaType: "Urban",
        userId: "guest"
      });

      setSimulationResult(result);
      setCredits((prev) => prev + result.credits);
    } catch (error) {
      console.error("Simulation failed:", error);
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      <div ref={viewerRef} style={{ position: "absolute", inset: 0, zIndex: 0 }} />

      {showAnalytics && simulationResult && aqi && (
        <AnalyticsView
          initialAQI={aqi}
          newAQI={simulationResult.newAQI}
          intervention={selectedIntervention!}
          reductionAmount={simulationResult.reductionAmount}
          estimatedCost={simulationResult.estimatedCost || 0}
          densityMultiplier={simulationResult.densityMultiplier || 1}
          aiInsight={simulationResult.aiInsight || "No insight available."}
          traffic={traffic || "Unknown"}
          buildingDensity={buildingDensity || "Unknown"}
          predictionData={simulationResult.predictionData}
          onClose={() => setShowAnalytics(false)}
        />
      )}

      <div style={{ position: "absolute", inset: 0, display: "flex", pointerEvents: "none", zIndex: 10 }}>
        <Sidebar
          onSearch={handleCitySearch}
          onLocateMe={(lat, lon) => {
            if (!viewer.current) return;
            viewer.current.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(lon, lat, 2500),
              duration: 2,
            });
            setCoords({ lat, lon });
            setCoords({ lat, lon });
          }}
          onSelectIntervention={setSelectedIntervention}
          onSimulate={handleSimulate}
          selectedIntervention={selectedIntervention}
        />

        {!showAnalytics && (
          <Dashboard
            aqi={aqi}
            traffic={traffic}
            buildingDensity={buildingDensity}
            intervention={selectedIntervention}
            result={simulationResult}
            onViewAnalytics={() => setShowAnalytics(true)}
          />
        )}

        <Wallet credits={credits} />
      </div>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text)',
            boxShadow: 'var(--box-shadow)',
            borderRadius: 'var(--border-radius)',
          }
        }}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<AppContent />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
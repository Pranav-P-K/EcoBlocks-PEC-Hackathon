/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

/* ───────────── CESIUM CORE ───────────── */
import { initViewer } from "./cesium/initViewer";
import { enterCityMode, highlightAQIBlock } from "./cesium/cityMode";
import { enterStreetMode } from "./cesium/streetMode";

/* ───────────── INTERVENTIONS ───────────── */
import { greenWallParticles } from "./cesium/interventions/greenWall";
import { algaeParticles } from "./cesium/interventions/algae";
import { dacParticles } from "./cesium/interventions/dac";

/* ───────────── API LAYER ───────────── */
import { fetchAQIData } from "./api/aqi";
import { runSimulation } from "./api/simulate";

/* ───────────── UI COMPONENTS ───────────── */
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Wallet } from "./components/Wallet";

import './App.css';
import { Toaster } from 'react-hot-toast';

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

const App: React.FC = () => {
  /* ───────────── REFS ───────────── */
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const viewer = useRef<Cesium.Viewer | null>(null);

  /* ───────────── GLOBAL STATE ───────────── */
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [aqi, setAQI] = useState<number | null>(null);
  const [traffic, setTraffic] = useState<string | null>(null);

  const [selectedIntervention, setSelectedIntervention] = useState<
    "Green Wall" | "Algae Panel" | "Direct Air Capture" | null
  >(null);

  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [credits, setCredits] = useState(0);

  /* ───────────── INIT CESIUM ───────────── */
  useEffect(() => {
    if (!viewerRef.current) return;

    viewer.current = initViewer(viewerRef.current);
    enterCityMode(viewer.current);

    const handler = new Cesium.ScreenSpaceEventHandler(
      viewer.current.scene.canvas
    );

    handler.setInputAction((click: { position: Cesium.Cartesian2; }) => {
      const cartesian = viewer.current!.camera.pickEllipsoid(
        click.position,
        viewer.current!.scene.globe.ellipsoid
      );

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

      highlightAQIBlock(
        viewer.current!,
        coords.lat,
        coords.lon,
        data.aqi
      );

      setSimulationResult(null);
      setSelectedIntervention(null);
    })();
  }, [coords]);

  /* ───────────── CITY SEARCH ───────────── */
  const handleCitySearch = async (city: string) => {
    if (!viewer.current) return;

    const res = await fetch(
      `http://localhost:5000/api/geocode?q=${encodeURIComponent(city)}`
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

    /* Switch to Street-Level Mode */
    enterStreetMode(viewer.current, coords.lat, coords.lon);

    /* Launch Correct Particle System */
    if (selectedIntervention === "Green Wall") {
      greenWallParticles(viewer.current, coords.lat, coords.lon);
    }

    if (selectedIntervention === "Algae Panel") {
      algaeParticles(viewer.current, coords.lat, coords.lon);
    }

    if (selectedIntervention === "Direct Air Capture") {
      dacParticles(viewer.current, coords.lat, coords.lon);
    }

    /* Backend Simulation */
    const result = await runSimulation({
      blockId: 1,
      intervention: selectedIntervention,
      currentAQI: aqi,
    });

    setSimulationResult(result);
    setCredits((prev) => prev + result.credits);
  };

  /* ───────────── RENDER ───────────── */
  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      {/* CESIUM MAP */}
      <div
        ref={viewerRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
        }}
      />

      {/* UI OVERLAY */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <Sidebar
          onSearch={handleCitySearch}
          onSelectIntervention={setSelectedIntervention}
          onSimulate={handleSimulate}
          selectedIntervention={selectedIntervention}
        />

        <Dashboard
          aqi={aqi}
          traffic={traffic}
          intervention={selectedIntervention}
          result={simulationResult}
        />

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

export default App;
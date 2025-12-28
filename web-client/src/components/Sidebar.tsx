/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";

interface Props {
  onSearch: (city: string) => void;
  onLocateMe: (lat: number, lon: number) => void
  onSelectIntervention: (value: string | null) => void;
  onSimulate: () => void;
  selectedIntervention: string | null;
}

const interventions = [
  {
    id: "green-wall",
    name: "Green Wall",
    emoji: "🌿",
    description: "Vertical gardens reducing heat",
    cost: 12000
  },
  {
    id: "algae-panel",
    name: "Algae Panel",
    emoji: "🧪",
    description: "Bio-reactive CO2 capture",
    cost: 25000
  },
  {
    id: "direct-air-capture",
    name: "Direct Air Capture",
    emoji: "🏭",
    description: "Industrial carbon removal",
    cost: 80000
  },
  {
    id: "retrofit",
    name: "Building Retrofit",
    emoji: "🏗️",
    description: "Insulation & Envelope upgrades",
    cost: 45000
  },
  {
    id: "biochar",
    name: "Biochar",
    emoji: "🪨",
    description: "Soil carbon sequestration",
    cost: 8000
  },
  {
    id: "cool-roof",
    name: "Cool Roof + Solar",
    emoji: "☀️",
    description: "High albedo & Renewable energy",
    cost: 35000
  }
];

export const Sidebar: React.FC<Props> = ({ onSearch, onLocateMe, onSelectIntervention, onSimulate, selectedIntervention }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      onSearch(searchQuery);
      setIsExpanded(false);
    }
  };

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocateMe(position.coords.latitude, position.coords.longitude);
        setIsExpanded(false);
      },
      (error) => {
        console.error(error);
        alert("Unable to retrieve your location");
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="mobile-handle" onClick={toggleSidebar} />

      <div className="sidebar-header" onClick={() => setIsExpanded(true)}>
        <h2>🌍 EcoBlocks</h2>
      </div>

      <div className="search-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="🔍 Search city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            onFocus={() => setIsExpanded(true)}
          />
          <button className="locate-btn" title="Use my location" onClick={handleLocateMe}>📍</button>
        </div>
      </div>

      <div className="intervention-grid">
        <h4>Select Intervention</h4>
        {interventions.map((intervention) => (
          <button
            key={intervention.id}
            className={`intervention-btn ${selectedIntervention === intervention.name ? "selected" : ""}`}
            onClick={() => {
              onSelectIntervention(intervention.name);
              setIsExpanded(true);
            }}
          >
            <span className="emoji">{intervention.emoji}</span>
            <div className="intervention-info">
              <span className="intervention-name">{intervention.name}</span>
              <span className="intervention-desc">{intervention.description}</span>
              <span className="intervention-cost" style={{ fontSize: '0.75rem', color: '#2e7d32', fontWeight: 'bold' }}>
                Est. ${intervention.cost.toLocaleString()}
              </span>
            </div>
          </button>
        ))}
      </div>

      <button
        className="simulate-btn"
        onClick={() => {
          onSimulate();
          setIsExpanded(false);
        }}
        disabled={!selectedIntervention}
      >
        <span>▶️</span> Simulate Impact
      </button>
    </div>
  );
};
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";

interface Props {
  onSearch: (city: string) => void;
  onSelectIntervention: (value: "Green Wall" | "Algae Panel" | "Direct Air Capture" | null) => void;
  onSimulate: () => void;
  selectedIntervention: "Green Wall" | "Algae Panel" | "Direct Air Capture" | null;
}

const interventions = [
  {
    id: "green-wall",
    name: "Green Wall",
    emoji: "🌿",
    description: "Vertical gardens reducing heat"
  },
  {
    id: "algae-panel",
    name: "Algae Panel",
    emoji: "🧪",
    description: "Bio-reactive CO2 capture"
  },
  {
    id: "direct-air-capture",
    name: "Direct Air Capture",
    emoji: "🏭",
    description: "Industrial carbon removal"
  }
];

export const Sidebar: React.FC<Props> = ({ onSearch, onSelectIntervention, onSimulate, selectedIntervention }) => {
  const [searchQuery, setSearchQuery] = useState("");
  // Mobile state: 'collapsed' or 'expanded'
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      onSearch(searchQuery);
      // On mobile, collapse after search to show map
      setIsExpanded(false);
    }
  };

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Mobile Drag Handle */}
      <div className="mobile-handle" onClick={toggleSidebar} />

      <div className="sidebar-header" onClick={() => setIsExpanded(true)}>
        <h2>🌍 EcoBlocks</h2>
      </div>
      
      <div className="search-container">
        <input
          type="text"
          placeholder="🔍 Search city..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearch}
          onFocus={() => setIsExpanded(true)} // Expand when typing
        />
      </div>

      <div className="intervention-grid">
        <h4>Select Intervention</h4>
        {interventions.map((intervention) => (
          <button
            key={intervention.id}
            className={`intervention-btn ${selectedIntervention === intervention.name ? "selected" : ""}`}
            onClick={() => {
              onSelectIntervention(intervention.name as any);
              setIsExpanded(true);
            }}
          >
            <span className="emoji">{intervention.emoji}</span>
            <div className="intervention-info">
              <span className="intervention-name">{intervention.name}</span>
              <span className="intervention-desc">{intervention.description}</span>
            </div>
          </button>
        ))}
      </div>

      <button 
        className="simulate-btn" 
        onClick={() => {
          onSimulate();
          setIsExpanded(false); // Collapse to show simulation
        }}
        disabled={!selectedIntervention}
      >
        <span>▶️</span> Simulate Impact
      </button>
    </div>
  );
};
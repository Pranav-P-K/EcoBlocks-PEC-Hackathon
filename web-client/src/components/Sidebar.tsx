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
    description: "Vertical gardens that improve air quality and reduce urban heat"
  },
  {
    id: "algae-panel",
    name: "Algae Panel",
    emoji: "🧪",
    description: "Bio-reactive panels that capture CO2 and produce biomass"
  },
  {
    id: "direct-air-capture",
    name: "Direct Air Capture",
    emoji: "🏭",
    description: "Advanced technology to remove CO2 directly from the atmosphere"
  }
];

export const Sidebar: React.FC<Props> = ({ onSearch, onSelectIntervention, onSimulate, selectedIntervention }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  return (
    <div className="sidebar">
      <h2>🌍 EcoBlocks</h2>
      
      <input
        type="text"
        placeholder="🔍 Search for a city..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleSearch}
      />

      <h4>🌱 Carbon Capture Solutions</h4>

      {interventions.map((intervention) => (
        <button
          key={intervention.id}
          className={selectedIntervention === intervention.name ? "selected" : ""}
          onClick={() => onSelectIntervention(intervention.name as any)}
          title={intervention.description}
        >
          <span className="emoji">{intervention.emoji}</span>
          <span className="name">{intervention.name}</span>
          <span className="description">{intervention.description}</span>
        </button>
      ))}

      <button 
        className="simulate" 
        onClick={onSimulate}
        disabled={!selectedIntervention}
      >
        ▶️ Simulate Impact
      </button>
    </div>
  );
};
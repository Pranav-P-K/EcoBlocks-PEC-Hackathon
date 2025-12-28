/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from "react";

interface Props {
  onSearch: (city: string) => void;
  onLocateMe: (lat: number, lon: number) => void
  onSelectIntervention: (value: string | null) => void;
  onSimulate: () => void;
  selectedIntervention: string | null;
  selectedBlockCount?: number; // New prop for dynamic cost calc
}

const interventions = [
  {
    id: "green-wall",
    name: "Green Wall",
    emoji: "🌿",
    description: "Vertical gardens reducing heat",
    cost: 12000,
    rate: "₹40 / sq.ft"
  },
  {
    id: "algae-panel",
    name: "Algae Panel",
    emoji: "🧪",
    description: "Bio-reactive CO2 capture",
    cost: 25000,
    rate: "₹85 / sq.ft"
  },
  {
    id: "direct-air-capture",
    name: "Direct Air Capture",
    emoji: "🏭",
    description: "Industrial carbon removal",
    cost: 80000,
    rate: "₹40,000 / unit"
  },
  {
    id: "retrofit",
    name: "Building Retrofit",
    emoji: "🏗️",
    description: "Insulation & Envelope upgrades",
    cost: 45000,
    rate: "₹15 / sq.ft"
  },
  {
    id: "biochar",
    name: "Biochar",
    emoji: "🪨",
    description: "Soil carbon sequestration",
    cost: 8000,
    rate: "₹2 / sq.ft"
  },
  {
    id: "cool-roof",
    name: "Cool Roof + Solar",
    emoji: "☀️",
    description: "High albedo & Renewable energy",
    cost: 35000,
    rate: "₹12 / sq.ft"
  }
];

export const Sidebar: React.FC<Props> = ({
  onSearch,
  onLocateMe,
  onSelectIntervention,
  onSimulate,
  selectedIntervention,
  selectedBlockCount = 0
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length > 2) {
      debounceRef.current = setTimeout(async () => {
        try {
          const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";
          const res = await fetch(`${API_BASE}/geocode?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setSuggestions(data);
            setShowSuggestions(true);
          } else {
            setShowSuggestions(false);
          }
        } catch (error) {
          console.error("Error fetching suggestions:", error);
        }
      }, 300); // 300ms debounce
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setSearchQuery(suggestion.display_name);
    setShowSuggestions(false);
    onSearch(suggestion.display_name);
    setIsExpanded(false);
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      onSearch(searchQuery);
      setIsExpanded(false);
      setShowSuggestions(false);
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
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        onLocateMe(lat, lon);
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
        <div className="search-input-wrapper" style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍 Search city..."
            value={searchQuery}
            onChange={handleInputChange}
            onKeyDown={handleSearch}
            onFocus={() => {
              setIsExpanded(true);
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => {
              // Delay hiding to allow click event to register
              setTimeout(() => setShowSuggestions(false), 200);
            }}
          />
          <button className="locate-btn" title="Use my location" onClick={handleLocateMe}>📍</button>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-list" style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'white',
              borderRadius: '0 0 12px 12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 1000,
              maxHeight: '250px',
              overflowY: 'auto',
              border: '1px solid #eee',
              borderTop: 'none'
            }}>
              {suggestions.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSuggestionClick(s)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: idx < suggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                    fontSize: '0.9rem',
                    color: '#333',
                    transition: 'background 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <span style={{ fontSize: '1rem' }}>📍</span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.display_name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="intervention-grid">
        <h4>Select Intervention</h4>
        {interventions.map((intervention) => {
          // If blocks are selected, calculate total. Otherwise show rate.
          const showTotal = selectedBlockCount > 0;
          const totalCost = intervention.cost * selectedBlockCount;

          return (
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

                <div className="intervention-meta" style={{ display: 'flex', flexDirection: 'column', marginTop: '4px' }}>
                  {/* Always show rate as reference */}
                  <span className="intervention-rate" style={{ fontSize: '0.7rem', color: '#78909c' }}>
                    {intervention.rate}
                  </span>

                  {/* Show Total if blocks selected */}
                  {showTotal && (
                    <span className="intervention-cost" style={{ fontSize: '0.75rem', color: '#2e7d32', fontWeight: 'bold' }}>
                      Est. ({selectedBlockCount}x): ${totalCost.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
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
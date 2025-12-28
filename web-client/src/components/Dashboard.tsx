import React from "react";

interface Props {
  aqi?: number | null;
  traffic?: string | null;
  buildingDensity?: string | null;
  intervention?: string | null;
  result?: {
    newAQI: number;
    reductionAmount: number;
    credits: number;
    aiInsight: string;
    estimatedCost?: number;
    densityMultiplier?: number;
  };
  onViewAnalytics?: () => void;
}

const getAQIColor = (aqi: number) => {
  if (aqi <= 50) return '#4CAF50';
  if (aqi <= 100) return '#FFC107';
  if (aqi <= 150) return '#FF9800';
  if (aqi <= 200) return '#F44336';
  if (aqi <= 300) return '#9C27B0';
  return '#673AB7';
};

// Estimated total costs for a standard city block simulation
const INTERVENTION_COSTS: Record<string, number> = {
  "Green Wall": 12000,
  "Algae Panel": 25000,
  "Direct Air Capture": 80000,
  "Building Retrofit": 45000,
  "Biochar": 8000,
  "Cool Roof + Solar": 35000
};

// Cost rates per unit/area for user reference
const INTERVENTION_RATES: Record<string, string> = {
  "Green Wall": "$40 / sq.ft",
  "Algae Panel": "$85 / sq.ft",
  "Direct Air Capture": "$40,000 / unit",
  "Building Retrofit": "$15 / sq.ft",
  "Biochar": "$2 / sq.ft",
  "Cool Roof + Solar": "$12 / sq.ft"
};

export const Dashboard: React.FC<Props> = ({
  aqi,
  traffic,
  buildingDensity,
  intervention,
  result,
  onViewAnalytics
}) => {
  // If no data, don't render anything
  if (!aqi && !result) return null;

  // Calculate total cost immediately if intervention is selected (even before result)
  const currentCost = result?.estimatedCost ?? (intervention ? INTERVENTION_COSTS[intervention] : 0) ?? 0;
  const currentRate = intervention ? INTERVENTION_RATES[intervention] : null;

  return (
    <div className="dashboard">
      {!result && <h3>🌱 Urban Conditions</h3>}

      {aqi && !result && (
        <div className="aqi-badge" style={{
          background: `linear-gradient(135deg, ${getAQIColor(aqi)}20, ${getAQIColor(aqi)}40)`,
          border: `1px solid ${getAQIColor(aqi)}`
        }}>
          <div className="stat-row">
            <span>Air Quality</span>
            <strong>{aqi} US AQI</strong>
          </div>
          <div className="stat-row">
            <span>Traffic</span>
            <strong>{traffic}</strong>
          </div>
          <div className="stat-row">
            <span>Density</span>
            <strong>{buildingDensity || "Calculating..."}</strong>
          </div>
          <div style={{
            height: '6px',
            background: `linear-gradient(90deg, #4CAF50, ${getAQIColor(aqi)})`,
            borderRadius: '4px',
            marginTop: '8px'
          }} />

          {/* Show Cost Rate Immediately when selected */}
          {intervention && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(255,255,255,0.5)',
              borderRadius: '6px'
            }}>
              <div className="stat-row" style={{ marginBottom: 0 }}>
                <span style={{ color: '#2e7d32' }}>Est. Rate</span>
                <strong style={{ color: '#1b5e20' }}>{currentRate || 'N/A'}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="simulation-results">
          <h3 style={{ marginBottom: '10px' }}>🌍 Impact Summary</h3>
          <div className="stat-row">
            <span>Intervention</span>
            <strong>{intervention}</strong>
          </div>
          <div className="stat-row">
            <span>New AQI</span>
            <strong style={{ color: getAQIColor(result.newAQI) }}>{result.newAQI}</strong>
          </div>
          <div className="stat-row">
            <span>CO₂ Reduced</span>
            <strong>{result.reductionAmount.toFixed(1)} tons</strong>
          </div>

          {/* Updated Estimated Cost Display with Rate Context */}
          <div className="stat-row" style={{ alignItems: 'flex-start' }}>
            <span>Est. Cost</span>
            <div style={{ textAlign: 'right' }}>
              <strong style={{ display: 'block' }}>${currentCost.toLocaleString()}</strong>
              {currentRate && (
                <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'normal' }}>
                  ({currentRate})
                </span>
              )}
            </div>
          </div>

          <blockquote style={{
            fontSize: '0.8rem',
            fontStyle: 'italic',
            background: '#f1f8e9',
            padding: '8px',
            borderRadius: '6px',
            marginTop: '8px',
            borderLeft: '3px solid var(--primary)'
          }}>
            {result.aiInsight}
          </blockquote>

          <button
            onClick={onViewAnalytics}
            style={{
              width: '100%',
              padding: '10px',
              marginTop: '12px',
              background: '#263238',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>📊</span> View Analytics
          </button>
        </div>
      )}
    </div>
  );
};
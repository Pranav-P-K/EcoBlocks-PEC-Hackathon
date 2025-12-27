import React from "react";

interface Props {
  aqi?: number | null;
  traffic?: string | null;
  buildingDensity?: string | null; // Added prop
  intervention?: string | null;
  result?: {
    newAQI: number;
    reductionAmount: number;
    credits: number;
    aiInsight: string;
  };
}

const getAQIColor = (aqi: number) => {
  if (aqi <= 50) return '#4CAF50';
  if (aqi <= 100) return '#FFC107';
  if (aqi <= 150) return '#FF9800';
  if (aqi <= 200) return '#F44336';
  if (aqi <= 300) return '#9C27B0';
  return '#673AB7';
};

export const Dashboard: React.FC<Props> = ({ aqi, traffic, buildingDensity, intervention, result }) => {
  // If no data, don't render anything (keeps UI clean)
  if (!aqi && !result) return null;

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
          {/* New Density Row */}
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
        </div>
      )}
    </div>
  );
};
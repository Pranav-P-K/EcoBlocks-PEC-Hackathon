import React from "react";

interface Props {
  aqi?: number | null;
  traffic?: string | null;
  intervention?: string | null;
  result?: {
    newAQI: number;
    reductionAmount: number;
    credits: number;
    aiInsight: string;
  };
}

const getAQIColor = (aqi: number) => {
  if (aqi <= 50) return '#4CAF50'; // Good
  if (aqi <= 100) return '#FFC107'; // Moderate
  if (aqi <= 150) return '#FF9800'; // Unhealthy for Sensitive Groups
  if (aqi <= 200) return '#F44336'; // Unhealthy
  if (aqi <= 300) return '#9C27B0'; // Very Unhealthy
  return '#673AB7'; // Hazardous
};

export const Dashboard: React.FC<Props> = ({ aqi, traffic, intervention, result }) => {
  return (
    <div className="dashboard">
      <h3>🌱 Urban Conditions</h3>

      {aqi && (
        <div className="aqi-display" style={{ 
          background: `linear-gradient(135deg, ${getAQIColor(aqi)}20, ${getAQIColor(aqi)}40)`,
          padding: 'var(--spacing-sm)',
          borderRadius: 'var(--border-radius)',
          marginBottom: 'var(--spacing-sm)'
        }}>
          <p>🌫️ Air Quality Index: <strong>{aqi}</strong></p>
          <p>🚦 Traffic: <strong>{traffic}</strong></p>
          <div style={{
            height: '8px',
            background: `linear-gradient(90deg, #4CAF50, ${getAQIColor(aqi)})`,
            borderRadius: '4px',
            marginTop: 'var(--spacing-xs)'
          }} />
        </div>
      )}

      {result && (
        <div className="simulation-results">
          <h4>🌍 Impact Summary</h4>
          <p>🏗️ Intervention: <strong>{intervention}</strong></p>
          <p>📉 New AQI: <strong style={{ color: getAQIColor(result.newAQI) }}>{result.newAQI}</strong></p>
          <p>🌱 CO₂ Reduced: <strong>{result.reductionAmount.toFixed(2)} tons</strong></p>
          <p>💎 Credits Earned: <strong>{result.credits}</strong></p>
          <blockquote>💡 {result.aiInsight}</blockquote>
        </div>
      )}
    </div>
  );
};
import React, { useMemo } from "react";

interface Props {
  aqi?: number | null;
  traffic?: string | null;
  buildingDensity?: string | null;
  areaType?: string | null;
  treeDensity?: string | null;
  intervention?: string | null;
  result?: {
    newAQI: number;
    reductionAmount: number;
    credits: number;
    estimatedCost?: number;
    // Structured Insight Object
    aiInsight: string | {
      headline: string;
      content: string;
      tech_specs: string;
      recommendation: string;
    };
    estimatedDays: number;
    dailyAQIHistory: number[];
    trafficHistory: number[];
    aqiForecast: number[];
    trafficForecast: number[];
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

// Estimated total costs (Fallback)
const INTERVENTION_COSTS: Record<string, number> = {
  "Green Wall": 12000,
  "Algae Panel": 25000,
  "Direct Air Capture": 80000,
  "Building Retrofit": 45000,
  "Biochar": 8000,
  "Cool Roof + Solar": 35000
};

const INTERVENTION_RATES: Record<string, string> = {
  "Green Wall": "₹40 / sq.ft",
  "Algae Panel": "₹85 / sq.ft",
  "Direct Air Capture": "₹40,000 / unit",
  "Building Retrofit": "₹15 / sq.ft",
  "Biochar": "₹2 / sq.ft",
  "Cool Roof + Solar": "₹12 / sq.ft"
};

export const Dashboard: React.FC<Props> = ({
  aqi, traffic, buildingDensity, areaType, treeDensity, intervention, result, onViewAnalytics
}) => {
  
  // 1. HOOKS MUST BE CALLED FIRST (Before any return statement)
  const insightData = useMemo(() => {
    if (!result?.aiInsight) return null;
    if (typeof result.aiInsight === 'string') {
      try { return JSON.parse(result.aiInsight); }
      catch { return { headline: "Analysis Complete", content: result.aiInsight }; }
    }
    return result.aiInsight;
  }, [result]);

  // 2. NOW we can do the conditional return
  if (!aqi && !result) return null;

  // 3. Cost Calculation
  const currentCost = result?.estimatedCost ?? (intervention ? INTERVENTION_COSTS[intervention] : 0) ?? 0;
  const currentRate = intervention ? INTERVENTION_RATES[intervention] : null;

  return (
    <div className="dashboard">
      
      {/* ─── STATE 1: PRE-SIMULATION (Context) ─── */}
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
            <span>Type</span>
            <strong style={{textTransform: 'capitalize'}}>{areaType || 'Unknown'}</strong>
          </div>
          <div className="stat-row">
            <span>Density</span>
            <strong>{buildingDensity}</strong>
          </div>
          <div className="stat-row">
            <span>Greenery</span>
            <strong>{treeDensity}</strong>
          </div>

          <div style={{
            height: '6px',
            background: `linear-gradient(90deg, #4CAF50, ${getAQIColor(aqi)})`,
            borderRadius: '4px',
            marginTop: '8px'
          }} />

          {/* Show Cost Rate Immediately when selected */}
          {intervention && (
            <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255,255,255,0.5)', borderRadius: '6px' }}>
              <div className="stat-row" style={{ marginBottom: 0 }}>
                <span style={{ color: '#2e7d32' }}>Est. Rate</span>
                <strong style={{ color: '#1b5e20' }}>{currentRate || 'N/A'}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── STATE 2: POST-SIMULATION (Summary Only) ─── */}
      {result && (
        <div className="simulation-results">
          
          {/* AI Headline (From your data) */}
          <h3 style={{ marginBottom: '5px', fontSize:'1rem', color:'#2E7D32' }}>
            {insightData?.headline || "Impact Summary"}
          </h3>
          <div style={{ fontSize:'0.75rem', color:'#666', marginBottom:'10px' }}>
             {intervention} Applied
          </div>

          <div className="stat-row">
            <span>New AQI</span>
            <strong style={{ color: getAQIColor(result.newAQI) }}>{result.newAQI}</strong>
          </div>
          <div className="stat-row">
            <span>CO₂ Reduced</span>
            <strong>{result.reductionAmount.toFixed(1)} tons</strong>
          </div>
          <div className="stat-row">
            <span>Time to Effect</span>
            <strong>{result.estimatedDays} Days</strong>
          </div>

          {/* Cost Display */}
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

          {/* Call to Action -> Opens AnalyticsView */}
          <button
            onClick={onViewAnalytics}
            style={{
              width: '100%', padding: '10px', marginTop: '12px',
              background: '#263238', color: 'white', border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <span>📊</span> View Detailed Report
          </button>
        </div>
      )}
    </div>
  );
};
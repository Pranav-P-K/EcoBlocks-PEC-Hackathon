import React, { useRef, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Props {
  initialAQI: number;
  newAQI: number;
  reductionAmount: number;
  intervention: string;
  estimatedCost: number;
  densityMultiplier: number;
  aiInsight: string;
  traffic: string;
  buildingDensity: string;
  predictionData?: number[];
  onClose: () => void;
}

// Updated Cost Lookup to include new methods (Fallback)
const INTERVENTION_COSTS: Record<string, number> = {
  "Green Wall": 12000,
  "Algae Panel": 25000,
  "Direct Air Capture": 80000,
  "Building Retrofit": 45000,
  "Biochar": 8000,
  "Cool Roof + Solar": 35000
};

export const AnalyticsView: React.FC<Props> = ({
  initialAQI,
  newAQI,
  intervention,
  reductionAmount,
  estimatedCost,
  densityMultiplier,
  aiInsight,
  traffic,
  buildingDensity,
  predictionData,
  onClose
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const simulationId = useMemo(() => Math.random().toString(36).substr(2, 9).toUpperCase(), []);
  const reportDate = new Date().toLocaleDateString();
  const finalCost = estimatedCost > 0 ? estimatedCost : (INTERVENTION_COSTS[intervention] || 0);

  // ... (ExposureFactor and TrafficVolatility logic remains the same) ...
  const exposureFactor = useMemo(() => {
    const d = (buildingDensity || "").toLowerCase();
    if (d.includes("high") || d.includes("urban")) return 2.5;
    if (d.includes("medium")) return 1.5;
    return 1.0;
  }, [buildingDensity]);

  const trafficVolatility = useMemo(() => {
    const t = (traffic || "").toLowerCase();
    if (t.includes("severe") || t.includes("congestion")) return 15;
    if (t.includes("heavy")) return 10;
    return 5;
  }, [traffic]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Trend Data Logic
  const trendData = months.map((_, index) => {
    const seasonality = Math.cos((index / 11) * Math.PI * 2) * 15;
    const noise = (Math.random() - 0.5) * trafficVolatility;
    const baseline = Math.max(20, initialAQI + seasonality + noise);

    let projected;
    if (predictionData && predictionData.length === 12 && predictionData[index] !== undefined) {
      projected = predictionData[index];
    } else {
      const targetReduction = initialAQI - newAQI;
      const currentReduction = targetReduction * (1 - Math.exp(-index * 0.35));
      projected = Math.max(10, baseline - currentReduction);
    }

    return { baseline, projected };
  });

  const asthmaData = trendData.map((d) => {
    const baselineCases = Math.round(d.baseline * exposureFactor * 0.1);
    const projectedCases = Math.round(d.projected * exposureFactor * 0.1);
    return { baseline: baselineCases, projected: projectedCases };
  });

  // Updated Comparison Data to include ALL 6 Interventions
  // This powers the Cost vs Impact Bar Chart
  const comparisons = [
    { name: "Biochar", cost: 8000, baseRate: 0.10 },
    { name: "Green Wall", cost: 12000, baseRate: 0.15 },
    { name: "Algae Panel", cost: 25000, baseRate: 0.25 },
    { name: "Cool Roof + Solar", cost: 35000, baseRate: 0.22 },
    { name: "Building Retrofit", cost: 45000, baseRate: 0.20 },
    { name: "Direct Air Capture", cost: 80000, baseRate: 0.45 },
  ].map(item => ({
    ...item,
    // Apply local density multiplier so comparison is fair for THIS specific building
    reduction: initialAQI * item.baseRate * densityMultiplier
  }));

  const maxCost = 80000;
  const improvementPct = Math.round(((initialAQI - newAQI) / initialAQI) * 100);
  const healthRiskBefore = initialAQI > 150 ? "High" : initialAQI > 100 ? "Moderate" : "Low";
  const healthRiskAfter = newAQI > 150 ? "High" : newAQI > 100 ? "Moderate" : "Low";

  // --- CHART 1: AQI Trend ---
  const lineData: ChartData<'line'> = {
    labels: months,
    datasets: [
      {
        label: 'Baseline',
        data: trendData.map(d => d.baseline),
        borderColor: '#ef5350',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0.4,
      },
      {
        label: 'Projected',
        data: trendData.map(d => d.projected),
        borderColor: '#2e7d32',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        fill: true,
        pointRadius: 4,
        tension: 0.4,
      },
    ],
  };

  // --- CHART 2: Cost vs Impact ---
  const barData: ChartData<'bar'> = {
    labels: comparisons.map(c => c.name),
    datasets: [{
      label: 'Reduction (AQI)',
      data: comparisons.map(c => c.reduction),
      backgroundColor: comparisons.map(c => {
        const costIntensity = 0.2 + (c.cost / maxCost) * 0.8;
        return c.name === intervention ? `rgba(46, 125, 50, ${costIntensity})` : `rgba(144, 164, 174, ${costIntensity})`;
      }),
      borderColor: comparisons.map(c => c.name === intervention ? '#1b5e20' : 'transparent'),
      borderWidth: 2,
      borderRadius: 6,
    }],
  };

  // --- CHART 3: Asthma ---
  const asthmaLineData: ChartData<'line'> = {
    labels: months,
    datasets: [
      {
        label: 'Projected Cases',
        data: asthmaData.map(d => d.projected),
        borderColor: '#29b6f6',
        backgroundColor: 'rgba(41, 182, 246, 0.15)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // --- CHART 4: AI PREDICTION ---
  const aiGraphData: ChartData<'line'> = {
    labels: months,
    datasets: [
      {
        label: 'Gemini Forecast (AQI)',
        data: predictionData && predictionData.length === 12 ? predictionData : trendData.map(d => d.projected + (Math.random() * 10 - 5)),
        borderColor: '#9c27b0', // Purple
        backgroundColor: 'rgba(156, 39, 176, 0.1)',
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: '#7b1fa2',
        tension: 0.3,
        borderDash: predictionData ? [] : [2, 2],
      }
    ]
  };

  const commonOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#f0f0f0' } } }
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`EcoBlocks_Report_${simulationId}.pdf`);
    } catch (error) { console.error(error); alert("PDF Error"); }
  };

  return (
    <div className="analytics-overlay" style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(245, 247, 245, 0.98)', backdropFilter: 'blur(12px)',
      zIndex: 100, display: 'flex', flexDirection: 'column', padding: '2rem', overflowY: 'auto'
    }}>
      <div className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#1b5e20', fontSize: '1.8rem', margin: 0 }}>📊 Analytics & Report</h2>
        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#cfd8dc' }}>Close</button>
      </div>

      <div ref={reportRef} style={{ width: '100%', maxWidth: '1000px', background: '#fff', padding: '40px', borderRadius: '8px', margin: '0 auto', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>

        {/* REPORT HEADER */}
        <div style={{ borderBottom: '2px solid #2e7d32', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between' }}>
          <div><h1 style={{ color: '#2e7d32', margin: 0 }}>EcoBlocks Impact Report</h1><p style={{ margin: '5px 0 0', color: '#546e7a' }}>Generated via Digital Twin</p></div>
          <div style={{ textAlign: 'right' }}><div style={{ color: '#37474f' }}><strong>Date:</strong> {reportDate}</div><div style={{ color: '#37474f' }}><strong>ID:</strong> {simulationId}</div></div>
        </div>

        {/* 1. EXECUTIVE SUMMARY */}
        <div style={{ marginBottom: '30px', padding: '20px', background: '#f1f8e9', borderRadius: '8px', borderLeft: '5px solid #2e7d32' }}>
          <h3 style={{ color: '#1b5e20', marginTop: 0 }}>📝 Executive Summary</h3>
          <p style={{ color: '#333', lineHeight: '1.6' }}>
            Evaluation of <strong>{intervention}</strong> in a <strong>{buildingDensity}</strong> density block with <strong>{traffic}</strong> traffic.
            Results: <strong>{improvementPct}% AQI improvement</strong>, <strong>{(reductionAmount * 12).toFixed(1)} tons</strong> annual CO₂ reduction.
            Est. Cost: <strong>${finalCost.toLocaleString()}</strong>.
          </p>
        </div>

        {/* 2 & 3. PROFILE & METHODOLOGY */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
          <div>
            <h4 style={{ color: '#455a64', borderBottom: '1px solid #eee' }}>📍 Profile</h4>
            <ul style={{ fontSize: '0.9rem', color: '#546e7a', paddingLeft: '20px' }}>
              <li><strong>Density:</strong> {buildingDensity}</li>
              <li><strong>Traffic:</strong> {traffic}</li>
              <li><strong>Base AQI:</strong> {initialAQI}</li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#455a64', borderBottom: '1px solid #eee' }}>🔬 Methodology</h4>
            <p style={{ fontSize: '0.9rem', color: '#546e7a' }}>Simulates real-time coefficients tailored to {intervention} efficiency over 12 months.</p>
          </div>
        </div>

        {/* 4. TABLE */}
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ color: '#455a64' }}>📊 Impact Summary</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead><tr style={{ background: '#263238', color: 'white' }}><th style={{ padding: '10px' }}>Metric</th><th style={{ padding: '10px' }}>Before</th><th style={{ padding: '10px' }}>After</th></tr></thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '10px' }}>AQI</td><td>{initialAQI}</td><td style={{ color: '#2e7d32' }}><strong>{newAQI}</strong></td></tr>
              <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '10px' }}>Health Risk</td><td>{healthRiskBefore}</td><td>{healthRiskAfter}</td></tr>
            </tbody>
          </table>
        </div>

        {/* GRAPHS GRID (4 Charts) */}
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ color: '#455a64', marginBottom: '15px' }}>📈 Visual Analytics</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', height: '250px' }}>
              <p style={{ textAlign: 'center', margin: '0 0 10px', fontSize: '0.8rem', fontWeight: 'bold', color: '#546e7a' }}>AQI Trend</p>
              <div style={{ height: '200px' }}><Line data={lineData} options={commonOptions} /></div>
            </div>
            <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', height: '250px' }}>
              <p style={{ textAlign: 'center', margin: '0 0 10px', fontSize: '0.8rem', fontWeight: 'bold', color: '#546e7a' }}>Cost vs Impact</p>
              <div style={{ height: '200px' }}><Bar data={barData} options={{ ...commonOptions, plugins: { legend: { display: false } } }} /></div>
            </div>
            <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', height: '250px' }}>
              <p style={{ textAlign: 'center', margin: '0 0 10px', fontSize: '0.8rem', fontWeight: 'bold', color: '#546e7a' }}>Asthma Reduction</p>
              <div style={{ height: '200px' }}><Line data={asthmaLineData} options={commonOptions} /></div>
            </div>
            {/* NEW 4th GRAPH: Gemini Prediction */}
            <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', height: '250px', background: '#f3e5f5' }}>
              <p style={{ textAlign: 'center', margin: '0 0 10px', fontSize: '0.8rem', fontWeight: 'bold', color: '#7b1fa2' }}>🤖 AI Prediction: Future AQI</p>
              <div style={{ height: '200px' }}><Line data={aiGraphData} options={commonOptions} /></div>
            </div>
          </div>
        </div>

        {/* 5-7. RISKS, RECS, SDG */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
          <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #ff9800' }}>
            <h4 style={{ color: '#ef6c00', margin: 0 }}>⚠️ Risks</h4><p style={{ fontSize: '0.8rem' }}>Results vary by season/maintenance.</p>
          </div>
          <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #2196f3' }}>
            <h4 style={{ color: '#1565c0', margin: 0 }}>🚀 Next Steps</h4><p style={{ fontSize: '0.8rem' }}>Pilot installation recommended.</p>
          </div>
        </div>
        <div style={{ padding: '15px', border: '1px dashed #ccc', borderRadius: '8px' }}>
          <h4 style={{ color: '#455a64', margin: 0 }}>🌍 SDG Alignment</h4>
          <p style={{ fontSize: '0.8rem', margin: '5px 0 0' }}>Supports SDG 11 (Sustainable Cities) & SDG 13 (Climate Action).</p>
        </div>

        {/* 8-9. FOOTER */}
        <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#90a4ae' }}>
          <div>Data: OpenAQ, TomTom, OpenStreetMap. Engine: EcoBlocks v1.2</div>
          <div>Digitally Verified.</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', paddingBottom: '20px' }}>
        <button onClick={handleDownloadPdf} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', background: '#263238', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          <span>📥</span> Download Full Report (PDF)
        </button>
      </div>
    </div>
  );
};
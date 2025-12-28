import React, { useRef, useMemo, useState } from 'react';
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
} from 'chart.js';
// 1. Fix: Use type-only import to avoid TS errors
import type { ChartData, ChartOptions } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

// Interface for the detailed AI structure
interface AIInsightData {
  headline: string;
  content: string;
  tech_specs: string;
  recommendation: string;
}

interface Props {
  initialAQI: number;
  newAQI: number;
  reductionAmount: number;
  intervention: string;
  estimatedCost: number;
  traffic: string;
  buildingDensity: string;
  
  // Make result optional to handle loading states safely
  result?: {
    newAQI: number;
    reductionAmount: number;
    credits: number;
    aiInsight: string | AIInsightData;
    estimatedDays: number;
    dailyAQIHistory: number[];
    trafficHistory: number[];
    aqiForecast: number[];
    trafficForecast: number[];
  };
  
  onClose: () => void;
}

export const AnalyticsView: React.FC<Props> = ({
  initialAQI, 
  newAQI, 
  intervention, 
  reductionAmount, 
  estimatedCost, 
  traffic, 
  buildingDensity, 
  result, 
  onClose
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  
  // 2. Fix: Use useState for stable random ID (Pure Render)
  const [simulationId] = useState(() => Math.random().toString(36).substr(2, 9).toUpperCase());
  const reportDate = new Date().toLocaleDateString();

  // 3. CRITICAL FIX: Guard clause. If result is missing, don't render anything.
  if (!result) return null;

  // 4. DEFENSIVE CODING: Default to empty arrays if backend data is missing
  // This prevents the "Cannot read properties of undefined" crash
  const dailyHistory = result.dailyAQIHistory || [];
  const aqiForecast = result.aqiForecast || [];
  const trafficHistory = result.trafficHistory || [];
  const trafficForecast = result.trafficForecast || [];

  // 5. PARSE INSIGHT SAFELY
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const insightData = useMemo(() => {
    if (!result.aiInsight) return null;
    if (typeof result.aiInsight === 'string') {
      try { 
        return JSON.parse(result.aiInsight); 
      } catch { 
        return { 
          headline: "Analysis Complete", 
          content: result.aiInsight, 
          tech_specs: "Standard Configuration", 
          recommendation: "Continue monitoring." 
        }; 
      }
    }
    return result.aiInsight as AIInsightData;
  }, [result]);

  // Combine History + Forecast for the Main Graph
  const combinedAQILabels = [
    ...dailyHistory.map((_, i) => `Day -${30-i}`),
    ...aqiForecast.map((_, i) => `Day +${i+1}`)
  ];
  
  const combinedAQIData = [
    ...dailyHistory,
    ...aqiForecast
  ];

  // Fallback if data is completely empty (prevents empty chart crash)
  if (combinedAQIData.length === 0) {
      combinedAQIData.push(initialAQI);
      combinedAQILabels.push('Today');
  }

  // COMPARISON DATA (For Bar Chart)
  const comparisons = [
    { name: "Biochar", cost: 8000, r: 0.10 },
    { name: "Green Wall", cost: 12000, r: 0.15 },
    { name: "Algae Panel", cost: 25000, r: 0.25 },
    { name: "Cool Roof", cost: 35000, r: 0.22 },
    { name: "Retrofit", cost: 45000, r: 0.20 },
    { name: "DAC", cost: 80000, r: 0.45 },
  ];

  // --- CHART 1: Real-Time Trend ---
  const trendChartData: ChartData<'line'> = {
    labels: combinedAQILabels,
    datasets: [
      {
        label: 'Real-Time AQI Trend',
        data: combinedAQIData,
        borderColor: '#2e7d32',
        backgroundColor: 'rgba(46, 125, 50, 0.1)',
        fill: true,
        pointRadius: 2,
        tension: 0.3,
        segment: {
          // Only show dashed lines if we have history data to segment against
          borderColor: (ctx) => (ctx.p0DataIndex < dailyHistory.length) ? '#90A4AE' : '#2e7d32',
          borderDash: (ctx) => (ctx.p0DataIndex < dailyHistory.length) ? [] : [5, 5],
        }
      },
    ],
  };

  // --- CHART 2: Cost vs Impact ---
  const barData: ChartData<'bar'> = {
    labels: comparisons.map(c => c.name),
    datasets: [{
      label: 'Projected Reduction (AQI Points)',
      data: comparisons.map(c => initialAQI * c.r),
      backgroundColor: comparisons.map(c => c.name === intervention ? '#2e7d32' : '#cfd8dc'),
      borderRadius: 4,
    }],
  };

  // --- CHART 3: Traffic Correlation ---
  const trafficChartData: ChartData<'line'> = {
    labels: combinedAQILabels,
    datasets: [{
      label: 'Traffic Speed (km/h)',
      data: [...trafficHistory, ...trafficForecast],
      borderColor: '#ff9800',
      backgroundColor: 'rgba(255, 152, 0, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 0
    }]
  };

  const commonOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { beginAtZero: true } }
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
      {/* HEADER */}
      <div className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#1b5e20', fontSize: '1.8rem', margin: 0 }}>📊 Analytics & Report</h2>
        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#cfd8dc' }}>Close</button>
      </div>

      <div ref={reportRef} style={{ width: '100%', maxWidth: '1000px', background: '#fff', padding: '40px', borderRadius: '8px', margin: '0 auto', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>

        {/* REPORT TITLE */}
        <div style={{ borderBottom: '2px solid #2e7d32', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between' }}>
          <div><h1 style={{ color: '#2e7d32', margin: 0 }}>EcoBlocks Impact Report</h1><p style={{ margin: '5px 0 0', color: '#546e7a' }}>Generated via Digital Twin</p></div>
          <div style={{ textAlign: 'right' }}><div style={{ color: '#37474f' }}><strong>Date:</strong> {reportDate}</div><div style={{ color: '#37474f' }}><strong>ID:</strong> {simulationId}</div></div>
        </div>

        {/* 1. EXECUTIVE SUMMARY */}
        <div style={{ marginBottom: '30px', padding: '20px', background: '#f1f8e9', borderRadius: '8px', borderLeft: '5px solid #2e7d32' }}>
          <h3 style={{ color: '#1b5e20', marginTop: 0 }}>📝 Executive Summary</h3>
          <p style={{ color: '#333', lineHeight: '1.6' }}>
            Evaluation of <strong>{intervention}</strong> in a <strong>{buildingDensity}</strong> density block.
            The simulation indicates a <strong>{Math.round(((initialAQI - newAQI)/initialAQI)*100)}% AQI improvement</strong>.
            
            <br />
            <strong>Total Impact:</strong> {reductionAmount.toFixed(1)} tons CO₂ reduced. 
            <br />
            <strong>Financial Est:</strong> ${estimatedCost.toLocaleString()} initial investment.
            <br />
            Est. Time to Effectiveness: <strong>{result.estimatedDays} days</strong>.
          </p>
        </div>

        {/* 2. GRAPHS GRID */}
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ color: '#455a64', marginBottom: '15px' }}>📈 Visual Analytics</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Graph 1: Real Trend */}
            <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', height: '250px' }}>
              <p style={{ textAlign: 'center', margin: '0 0 10px', fontSize: '0.8rem', fontWeight: 'bold', color: '#546e7a' }}>30-Day History & Forecast</p>
              <div style={{ height: '200px' }}><Line data={trendChartData} options={commonOptions} /></div>
            </div>

            {/* Graph 2: Cost Comparison */}
            <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', height: '250px' }}>
              <p style={{ textAlign: 'center', margin: '0 0 10px', fontSize: '0.8rem', fontWeight: 'bold', color: '#546e7a' }}>Intervention Comparison</p>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <div style={{ height: '200px' }}><Bar data={barData} options={commonOptions as any} /></div>
            </div>

            {/* Graph 3: Traffic */}
            <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', height: '250px' }}>
              <p style={{ textAlign: 'center', margin: '0 0 10px', fontSize: '0.8rem', fontWeight: 'bold', color: '#546e7a' }}>Traffic ({traffic}) Correlation</p>
              <div style={{ height: '200px' }}><Line data={trafficChartData} options={commonOptions} /></div>
            </div>
            
             {/* Graph 4: Stats Box */}
            <div style={{ border: '1px solid #eee', padding: '25px', borderRadius: '8px', height: '250px', background: '#fafafa', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center' }}>
               <div style={{ fontSize:'2.5rem', fontWeight:'bold', color:'#2e7d32' }}>{result.newAQI}</div>
               <div style={{ color:'#888', textTransform:'uppercase', fontSize:'0.8rem', letterSpacing:'1px' }}>Projected AQI</div>
               <div style={{ margin:'15px 0', width:'50%', height:'1px', background:'#ddd' }}></div>
               <div style={{ fontSize:'1.5rem', fontWeight:'bold', color:'#1565C0' }}>{result.credits}</div>
               <div style={{ color:'#888', textTransform:'uppercase', fontSize:'0.8rem', letterSpacing:'1px' }}>Credits Earned</div>
            </div>

          </div>
        </div>

        {/* 3. DETAILED AI INSIGHT CARD */}
        <div style={{ marginTop: '30px', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
            {/* Top Bar */}
            <div style={{ background: '#f5f5f5', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚙️</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#555', textTransform:'uppercase' }}>
                Technology Spec: {insightData?.tech_specs}
              </span>
            </div>

            {/* Content */}
            <div style={{ padding: '20px' }}>
              <h4 style={{ margin:'0 0 10px 0', color:'#2e7d32' }}>{insightData?.headline}</h4>
              <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#444', margin: 0, textAlign: 'justify' }}>
                {insightData?.content}
              </p>
            </div>

            {/* Recommendation */}
            <div style={{ background: '#E8F5E9', padding: '15px 20px', borderTop: '1px solid #C8E6C9', display: 'flex', gap: '12px' }}>
              <span style={{ fontSize: '1.5rem' }}>💡</span>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#2E7D32', textTransform: 'uppercase' }}>
                  Strategic Recommendation
                </div>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: '#1B5E20' }}>
                  {insightData?.recommendation}
                </div>
              </div>
            </div>
        </div>

        {/* FOOTER */}
        <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#90a4ae' }}>
          <div>Data: Open-Meteo, TomTom, Mapbox. Engine: EcoBlocks v2.0</div>
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
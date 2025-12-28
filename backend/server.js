require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const {
  getOrCreateAssociatedTokenAccount,
  mintTo
} = require('@solana/spl-token');

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const app = express();
app.use(cors());
app.use(express.json());

/* ─────────────────── CONFIG ─────────────────── */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const ELEVEN_LABS_KEY = process.env.ELEVEN_LABS_API_KEY;
const ELEVEN_LABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

const SOLANA_MINT_ADDRESS = process.env.SOLANA_MINT_ADDRESS;
const SOLANA_PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY;

// API Keys
const POSITIONSTACK_KEY = "a24792ebd5bd21c65ea087f2630dd027";
const TOMTOM_KEY = "fXVNqCBEyaXJdtxAoU7surZO7T232MYC";
const OSM_BUILDINGS_KEY = "59fcc2e8";

/* ─────────────────── CLIENTS ─────────────────── */

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

// Initialize Solana Connection
const connection = new Connection(
  "https://api.devnet.solana.com",
  "confirmed"
);

let mintKeypair;
let MINT;

try {
  if (SOLANA_PRIVATE_KEY && SOLANA_MINT_ADDRESS) {
    mintKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(SOLANA_PRIVATE_KEY))
    );
    MINT = new PublicKey(SOLANA_MINT_ADDRESS);
  } else {
    console.warn("⚠️ Solana credentials missing. Minting will fail.");
  }
} catch (err) {
  console.error("❌ Failed to initialize Solana keys:", err.message);
}

/* ─────────────────── HELPERS ─────────────────── */

const jwks = jwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
});

function getKey(header, cb) {
  jwks.getSigningKey(header.kid, (err, key) => {
    cb(null, key.getPublicKey());
  });
}

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  jwt.verify(
    token,
    getKey,
    {
      audience: AUTH0_AUDIENCE,
      issuer: `https://${AUTH0_DOMAIN}/`,
      algorithms: ['RS256']
    },
    (err, decoded) => {
      if (err) return res.status(401).json({ error: "Invalid token" });
      req.user = decoded;
      next();
    }
  );
}

// Tile Math Helpers for OSM
const lon2tile = (lon, zoom) => (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
const lat2tile = (lat, zoom) => (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));

/* ─────────────────── 1. BLOCK DATA (AQI + TOMTOM + BUILDINGS) ─────────────────── */


app.get('/api/block-data', async (req, res) => {
  const { lat, lon } = req.query;
  const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

  if (!lat || !lon) return res.status(400).json({ error: "Missing coordinates" });

  try {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    // 1. Fetch AQI (Open-Meteo) -- [UNCHANGED]
    const aqiPromise = axios.get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5`);

    // 2. Fetch Traffic (TomTom) -- [UNCHANGED]
    const trafficPromise = axios.get(`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json`, {
      params: { key: TOMTOM_KEY, point: `${lat},${lon}` }
    });

    // 3. Fetch Buildings & Area Info (Mapbox Tilequery) -- [NEW]
    // We query for buildings, landuse (area type), and natural features (trees/parks)
    const radius = 200; // Mapbox is fast, 200m is precise
    const mapboxUrl = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lon},${lat}.json?radius=${radius}&limit=50&layers=building,landuse,natural_label,poi_label&access_token=${MAPBOX_TOKEN}`;
    
    const mapboxPromise = axios.get(mapboxUrl);

    // Execute all requests
    const [aqiRes, trafficRes, mapboxRes] = await Promise.allSettled([aqiPromise, trafficPromise, mapboxPromise]);

    // -- Process AQI -- [UNCHANGED]
    let aqi = 0;
    let pm25 = 0;
    if (aqiRes.status === 'fulfilled') {
      aqi = aqiRes.value.data.current.us_aqi;
      pm25 = aqiRes.value.data.current.pm2_5;
    }

    // -- Process Traffic -- [UNCHANGED]
    let trafficLabel = "Clear Roads";
    if (trafficRes.status === 'fulfilled' && trafficRes.value.data.flowSegmentData) {
      const { currentSpeed, freeFlowSpeed } = trafficRes.value.data.flowSegmentData;
      const ratio = currentSpeed / freeFlowSpeed;
      if (ratio < 0.5) trafficLabel = `Severe Congestion (${currentSpeed} km/h)`;
      else if (ratio < 0.75) trafficLabel = `Heavy Traffic (${currentSpeed} km/h)`;
      else if (ratio < 0.9) trafficLabel = `Moderate Flow (${currentSpeed} km/h)`;
      else trafficLabel = `Clear Flow (${currentSpeed} km/h)`;
    } else {
      trafficLabel = aqi > 100 ? "Heavy Traffic (Est)" : "Clear Roads (Est)";
    }

    // -- Process Mapbox Data (Replaces Overpass Logic) --
    let buildingCount = 0;
    let treeCount = 0;
    let densityLabel = "Low";
    let areaType = "Suburban";
    let treeDensity = "Low";

    if (mapboxRes.status === 'fulfilled') {
      const features = mapboxRes.value.data.features || [];
      
      // A. Count Buildings
      // Mapbox returns individual building parts in the 'building' layer
      buildingCount = features.filter(f => f.properties.tilequery.layer === 'building').length;

      // B. Determine Area Type (Landuse)
      // Look for the 'landuse' layer to see if it's residential, commercial, etc.
      const landuseFeature = features.find(f => f.properties.tilequery.layer === 'landuse');
      if (landuseFeature && landuseFeature.properties.class) {
        // Capitalize the first letter (e.g. "residential" -> "Residential")
        const rawType = landuseFeature.properties.class;
        areaType = rawType.charAt(0).toUpperCase() + rawType.slice(1);
      } else {
        // Fallback: Guess based on density if no specific landuse tag is found
        areaType = buildingCount > 20 ? "Urban/Commercial" : "Residential";
      }

      // C. Estimate Tree/Nature Count
      // Mapbox doesn't count individual trees like OSM. We estimate based on "Park", "Wood", or "Scrub" tags.
      const isNature = features.some(f => 
        f.properties.class === 'park' || 
        f.properties.class === 'wood' || 
        f.properties.class === 'scrub' ||
        f.properties.tilequery.layer === 'natural_label'
      );

      if (isNature) {
        treeCount = 80; // Estimate for a green area
        treeDensity = "High";
      } else if (areaType === "Residential") {
        treeCount = 25; // Estimate for residential with gardens
        treeDensity = "Moderate";
      } else {
        treeCount = 5; // Urban core
        treeDensity = "Sparse";
      }

      // D. Set Density Label
      if (buildingCount > 30) {
        densityLabel = "High (Urban Core)";
      } else if (buildingCount > 10) {
        densityLabel = "Medium";
      } else {
        densityLabel = "Low";
      }
    }

    // Final Response -- [UNCHANGED STRUCTURE]
    const responseData = {
      aqi,
      pm25,
      traffic: trafficLabel,
      buildingDensity: densityLabel,
      buildingCount,
      treeCount,
      treeDensity: treeDensity,
      areaType: areaType,
      temperature: 28
    };

    console.log("🚀 BACKEND SENDING:", responseData);
    res.json(responseData);

  } catch (err) {
    console.error("Block Data Error:", err.message);
    res.status(500).json({ error: "Failed to fetch environmental data" });
  }
});

/* ─────────────────── 2. TILE PROXY ─────────────────── */
app.get('/api/proxy-tile/:z/:x/:y', async (req, res) => {
  const { z, x, y } = req.params;
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  try {
    const tile = await axios.get(url, { responseType: 'arraybuffer', headers: { 'User-Agent': 'EcoBlocks/1.0' } });
    res.set('Content-Type', 'image/png');
    res.send(tile.data);
  } catch {
    res.status(404).send();
  }
});

/* ─────────────────── 3. GEOCODE (TOMTOM FUZZY SEARCH) ─────────────────── */
app.get("/api/geocode", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Missing query" });

  try {
    // TomTom Fuzzy Search API (v2)
    // Allows searching for addresses, POIs, and geographic features with typo tolerance.
    const response = await axios.get(`https://api.tomtom.com/search/2/search/${encodeURIComponent(q)}.json`, {
      params: {
        key: TOMTOM_KEY,
        limit: 5,         // Increase limit to get multiple suggestions
        minFuzzyLevel: 1,
        maxFuzzyLevel: 2,
        typeahead: true   // Enable typeahead for predictive matching
      },
      timeout: 8000,
    });

    const results = response.data.results;
    if (!results || results.length === 0) {
      console.log("TomTom Fuzzy Search found no results, trying fallback...");
      return usePositionStackFallback(q, res);
    }

    // Map all results to suggestion format
    const suggestions = results.map(place => {
      const poiName = place.poi && place.poi.name ? `${place.poi.name}, ` : "";
      const address = place.address ? place.address.freeformAddress : "";
      const displayName = `${poiName}${address}` || place.address.freeformAddress || place.address.country;

      return {
        lat: place.position.lat,
        lon: place.position.lon,
        display_name: displayName,
        country: place.address.country
      };
    });

    res.json(suggestions);
  } catch (err) {
    console.error("❌ TomTom Fuzzy Search error:", err.message);
    usePositionStackFallback(q, res);
  }
});

async function usePositionStackFallback(query, res) {
  try {
    const response = await axios.get("http://api.positionstack.com/v1/forward", {
      params: { access_key: POSITIONSTACK_KEY, query: query, limit: 1 },
      timeout: 5000,
    });
    if (!response.data?.data?.length) return res.status(404).json({ error: "Location not found" });

    // PositionStack Fallback (Single result usually, but mapping array to be safe)
    const place = response.data.data[0];
    res.json([{
      lat: place.latitude,
      lon: place.longitude,
      display_name: place.label || place.name,
      country: place.country
    }]);
  } catch (err) {
    res.status(500).json({ error: "Geocoding failed" });
  }
}

/* ─────────────────── 4. SIMULATION ─────────────────── */
function getWeeklySummary(dailyArray) {
  if (!dailyArray || dailyArray.length === 0) return [];
  
  const weeks = [];
  const chunkSize = 7;

  for (let i = 0; i < 4; i++) {
      const start = i * chunkSize;
      const end = (i === 3) ? dailyArray.length : start + chunkSize;
      
      const slice = dailyArray.slice(start, end);
      const avg = slice.length > 0 
          ? Math.round(slice.reduce((a, b) => a + b, 0) / slice.length) 
          : 0;
          
      weeks.push({
          week: i + 1,
          avg_value: avg,
          trend: i === 3 ? "Current" : "Past"
      });
  }
  return weeks;
}

/* ── HELPER: LOCAL FALLBACK GENERATOR (Safety Net) ── */
// If Gemini fails (429 Error), this generates a valid object so the UI doesn't break
function generateFallbackInsight(intervention, density, newAQI) {
  const techSpecs = {
      "Green Wall": "Hydroponic vertical matrix with automated irrigation",
      "Algae Panel": "Bio-reactive photo-bioreactor tubes",
      "Direct Air Capture": "Solid sorbent CO2 filters with fan arrays",
      "Building Retrofit": "High-efficiency HVAC with HEPA filtration",
      "Biochar": "Pyrolyzed organic carbon soil amendment",
      "Cool Roof + Solar": "High-albedo reflective coating with PV integration"
  };

  return {
      headline: `${intervention} Successfully Optimized`,
      content: `Due to high API load, this is a procedural estimation. The deployment in this ${density} density zone is calculated to stabilize AQI around ${newAQI}. The system detects high particulate matter and has adjusted filtration cycles accordingly.`,
      tech_specs: techSpecs[intervention] || "Standard environmental control unit",
      recommendation: "Inspect filters in 14 days and monitor peak traffic hours.",
      fallback: true
  };
}

/* ── SIMULATION ROUTE ── */
app.post('/api/simulate', async (req, res) => {
try {
  const { 
    blockId, intervention, currentAQI, userId, 
    buildingDensity, treeDensity, lat, lon 
  } = req.body;

  console.log(`🤖 Batching Simulation for: ${intervention}`);

  // 1. FETCH REAL HISTORY (30 Days)
  let dailyAQIHistory = Array(30).fill(currentAQI);
  try {
    const historyUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi&past_days=30`;
    const historyRes = await axios.get(historyUrl);
    const rawHourly = historyRes.data.hourly.us_aqi;
    
    dailyAQIHistory = [];
    for (let i = 0; i < 30; i++) {
      const slice = rawHourly.slice(i * 24, (i + 1) * 24).filter(v => v !== null);
      const avg = slice.length ? Math.round(slice.reduce((a, b) => a + b, 0) / slice.length) : currentAQI;
      dailyAQIHistory.push(avg);
    }
  } catch (err) {
    console.warn("⚠️ History Fetch Failed:", err.message);
  }

  // 2. GENERATE TRAFFIC HISTORY (30 Days)
  const generateTraffic = (baseSpeed) => {
      return Array.from({length: 30}, (_, i) => {
          const isWeekend = (30 - i) % 7 === 0 || (30 - i) % 7 === 1;
          const variance = Math.random() * 10 - 5;
          return Math.max(10, Math.round(baseSpeed + (isWeekend ? 15 : 0) + variance));
      });
  };
  const trafficHistory = generateTraffic(30);

  // 3. BATCH DATA FOR AI (The Optimization)
  const weeklyAQI = getWeeklySummary(dailyAQIHistory);
  const weeklyTraffic = getWeeklySummary(trafficHistory);
  
  // 4. CALCULATE REDUCTION (Physics)
  const strategies = { 
      "Green Wall": { r: 0.15, cost: 12000 },
      "Algae Panel": { r: 0.25, cost: 25000 },
      "Direct Air Capture": { r: 0.45, cost: 80000 },
      "Building Retrofit": { r: 0.20, cost: 45000 },
      "Biochar": { r: 0.10, cost: 8000 },
      "Cool Roof + Solar": { r: 0.22, cost: 35000 }
  };
  
  const s = strategies[intervention] || strategies["Green Wall"];
  const baseRate = s.r || 0.15;
  const reducedAmount = +(currentAQI * baseRate).toFixed(1);
  const newAQI = Math.max(0, +(currentAQI - reducedAmount).toFixed(1));
  const credits = Math.floor(reducedAmount * 10);
  const estimatedCost = s.cost || 10000;

  // 5. GEMINI: INSIGHT GENERATION (Using Summaries)
  let aiInsight = null;
  let aqiForecast = [];
  let trafficForecast = [];

  if (GEMINI_KEY) {
    try {
      // FIXED: Using 1.5-flash for stability
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `
        Role: Urban Environmental Consultant.
        Response Format: JSON ONLY.
        
        Context:
        - Location: ${lat}, ${lon} (${buildingDensity}, ${treeDensity} trees).
        - Intervention: ${intervention} (Targeting AQI ${newAQI}).
        
        **Weekly Analysis (Past Month):**
        - AQI Trend: ${JSON.stringify(weeklyAQI)}
        - Traffic Trend: ${JSON.stringify(weeklyTraffic)}
        
        Task:
        1. Analyze the 4-week trend (e.g. "AQI spiked in Week 2").
        2. Suggest a "Pro" tech version of ${intervention}.
        3. Predict next 7 days (Forecast).

        Output JSON:
        {
          "headline": "5-word punchy title",
          "content": "Analysis of the weekly trend and why this tech fits.",
          "tech_specs": "Specific tech name (e.g. 'IoT Active Moss')",
          "recommendation": "Strategic advice based on the weekly data.",
          "aqi": [7 numbers],
          "traffic": [7 numbers]
        }
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      
      aiInsight = {
          headline: parsed.headline,
          content: parsed.content,
          tech_specs: parsed.tech_specs,
          recommendation: parsed.recommendation
      };
      aqiForecast = parsed.aqi || [];
      trafficForecast = parsed.traffic || [];

    } catch (e) {
      console.error("⚠️ Gemini API Error/Rate Limit:", e.message);
      // FALLBACK: Use local generator so UI doesn't break
      aiInsight = generateFallbackInsight(intervention, buildingDensity, newAQI);
      // Fallback Forecast (Math based)
      aqiForecast = Array.from({length: 7}, (_, i) => Math.max(0, Math.round(newAQI - (i * 0.5))));
      trafficForecast = Array(7).fill(30);
    }
  } else {
      // No Key provided - Use Fallback
      aiInsight = generateFallbackInsight(intervention, buildingDensity, newAQI);
      aqiForecast = Array(7).fill(newAQI);
      trafficForecast = Array(7).fill(30);
  }

  // 6. DB INSERT (Storing Raw Data AND Weekly Summary)
  await supabase.from('simulations').insert({
    user_id: userId || 'guest',
    block_id: blockId,
    intervention_type: intervention,
    co2_reduced: reducedAmount,
    credits_earned: credits,
    ai_insight: JSON.stringify(aiInsight),
    history_data: dailyAQIHistory,       
    traffic_data: trafficHistory,        
    weekly_summary: {                    
        aqi: weeklyAQI,
        traffic: weeklyTraffic
    }
  });

  console.log("✅ Simulation Success.");
  
  res.json({
    newAQI,
    reductionAmount: reducedAmount,
    credits,
    estimatedCost, // Sent to frontend
    aiInsight,
    dailyAQIHistory, 
    trafficHistory,
    aqiForecast,
    trafficForecast,
    estimatedDays: 14
  });

} catch (error) {
  console.error("❌ CRITICAL ERROR:", error.message);
  res.status(500).json({ error: "Simulation failed internally." });
}
});
/* ─────────────────── 5. HISTORY ─────────────────── */
app.get('/api/history', requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const { data } = await supabase.from('simulations').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
  res.json(data || []);
});

/* ─────────────────── 6. REAL SOLANA MINT ─────────────────── */
app.post('/api/mint-credit', requireAuth, async (req, res) => {
  const { walletAddress, credits } = req.body;
  const userId = req.user.sub;
  if (!credits || credits <= 0 || !walletAddress) return res.status(400).json({ error: "Invalid request" });

  try {
    if (!mintKeypair || !MINT) throw new Error("Solana configuration missing");
    const tokenAccount = await getOrCreateAssociatedTokenAccount(connection, mintKeypair, MINT, new PublicKey(walletAddress));
    const tx = await mintTo(connection, mintKeypair, MINT, tokenAccount.address, mintKeypair, credits);
    await supabase.from('user_rewards').insert({ user_id: userId, total_credits: credits, tx_hash: tx, status: 'MINTED' });
    res.json({ success: true, txHash: tx });
  } catch (e) {
    res.status(500).json({ error: "Mint failed: " + e.message });
  }
});

const PORT = process.env.PORT || 5000;

// Only start the server if running locally or not in a serverless environment
if (require.main === module) {
  app.listen(PORT, () => console.log(`🚀 EcoBlocks running locally on ${PORT}`));
}

// Export the app for Vercel to use as a serverless function
module.exports = app;
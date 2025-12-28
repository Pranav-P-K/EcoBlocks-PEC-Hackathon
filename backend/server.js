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
  if (!lat || !lon) return res.status(400).json({ error: "Missing coordinates" });

  try {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    // 1. Fetch AQI
    const aqiPromise = axios.get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5`);

    // 2. Fetch Traffic (TomTom)
    const trafficPromise = axios.get(`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json`, {
      params: { key: TOMTOM_KEY, point: `${lat},${lon}` }
    });

    // 3. Fetch Buildings (OSM Buildings Tile)
    const z = 15;
    const x = lon2tile(lonNum, z);
    const y = lat2tile(latNum, z);
    const buildingsPromise = axios.get(`https://a.data.osmbuildings.org/0.2/${OSM_BUILDINGS_KEY}/tile/${z}/${x}/${y}.json`, {
      validateStatus: false
    });

    const [aqiRes, trafficRes, buildingsRes] = await Promise.allSettled([aqiPromise, trafficPromise, buildingsPromise]);

    // -- Process AQI --
    let aqi = 0;
    let pm25 = 0;
    if (aqiRes.status === 'fulfilled') {
      aqi = aqiRes.value.data.current.us_aqi;
      pm25 = aqiRes.value.data.current.pm2_5;
    }

    // -- Process Traffic --
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

    // -- Process Buildings (Density & Type) --
    let buildingCount = 0;
    let areaType = "Unknown";
    let densityLabel = "Low";

    if (buildingsRes.status === 'fulfilled' && buildingsRes.value.status === 200) {
      const geoJson = buildingsRes.value.data;
      if (geoJson && geoJson.features) {
        buildingCount = geoJson.features.length;

        if (buildingCount > 100) {
          densityLabel = "High";
          areaType = "Urban Core";
        } else if (buildingCount > 40) {
          densityLabel = "Medium";
          areaType = "Commercial/Residential";
        } else if (buildingCount > 5) {
          densityLabel = "Low";
          areaType = "Suburban";
        } else {
          densityLabel = "Sparse";
          areaType = "Rural/Open Space";
        }
      }
    }

    res.json({
      aqi,
      pm25,
      traffic: trafficLabel,
      buildingDensity: densityLabel,
      buildingCount,
      areaType,
      temperature: 28
    });
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
    const response = await axios.get(`https://api.tomtom.com/search/2/search/${encodeURIComponent(q)}.json`, {
      params: {
        key: TOMTOM_KEY,
        limit: 1,
        minFuzzyLevel: 1,
        maxFuzzyLevel: 2,
        typeahead: false
      },
      timeout: 8000,
    });

    const results = response.data.results;
    if (!results || results.length === 0) {
      console.log("TomTom Fuzzy Search found no results, trying fallback...");
      return usePositionStackFallback(q, res);
    }

    const place = results[0];
    const poiName = place.poi && place.poi.name ? `${place.poi.name}, ` : "";
    const address = place.address ? place.address.freeformAddress : "";
    const displayName = `${poiName}${address}` || place.address.freeformAddress || place.address.country;

    res.json([{
      lat: place.position.lat,
      lon: place.position.lon,
      display_name: displayName,
      country: place.address.country
    }]);
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
    const place = response.data.data[0];
    res.json([{ lat: place.latitude, lon: place.longitude, display_name: place.label, country: place.country }]);
  } catch (err) {
    res.status(500).json({ error: "Geocoding failed" });
  }
}

/* ─────────────────── 4. SIMULATION ─────────────────── */
app.post('/api/simulate', async (req, res) => {
  try {
    const { blockId, intervention, currentAQI, userId, buildingDensity, areaType, traffic } = req.body;

    const strategies = {
      "Green Wall": { r: 0.15, cost: 12000 },
      "Algae Panel": { r: 0.25, cost: 25000 },
      "Direct Air Capture": { r: 0.45, cost: 80000 },
      "Building Retrofit": { r: 0.20, cost: 45000 }, // Energy efficiency reduces ambient heat & indirect emissions
      "Biochar": { r: 0.10, cost: 8000 }, // Soil sequestration
      "Cool Roof + Solar": { r: 0.22, cost: 35000 } // Albedo + Renewable offset
    };

    const s = strategies[intervention] || strategies["Green Wall"];
    let reductionRate = s.r;

    // Density Multiplier
    let densityMultiplier = 1.0;
    if (buildingDensity === "High") densityMultiplier = 1.2;
    else if (buildingDensity === "Medium") densityMultiplier = 1.1;
    else if (buildingDensity === "Sparse") densityMultiplier = 0.9;

    reductionRate = reductionRate * densityMultiplier;

    const reduced = +(currentAQI * reductionRate).toFixed(1);
    const newAQI = Math.max(0, +(currentAQI - reduced).toFixed(1));
    const credits = Math.floor(reduced * 10);
    const estimatedCost = s.cost;

    let aiInsight = "Urban air quality improved significantly.";
    let predictionData = [];

    try {
      if (GEMINI_KEY) {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
          Act as an environmental data analyst.
          Input:
          - Current AQI: ${currentAQI}
          - Intervention: ${intervention}
          - Traffic Conditions: ${traffic || 'Moderate'}
          - Building Density: ${buildingDensity || 'Medium'}
          
          Tasks:
          1. Write a professional one-line headline about the impact.
          2. Predict the AQI values for the next 12 months (array of 12 integers) taking seasonality and the intervention impact into account.
          
          Return strictly in JSON format:
          {
            "insight": "headline string",
            "aqiForecast": [num1, num2, ..., num12]
          }
        `;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          aiInsight = parsed.insight;
          predictionData = parsed.aqiForecast;
        } else {
          aiInsight = text;
        }
      }
    } catch (e) {
      console.error("Gemini API Error:", e.message);
    }

    let audioBase64 = null;
    try {
      if (ELEVEN_LABS_KEY) {
        const voice = await axios.post(
          `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_LABS_VOICE_ID}`,
          { text: aiInsight },
          { headers: { 'xi-api-key': ELEVEN_LABS_KEY }, responseType: 'arraybuffer' }
        );
        audioBase64 = Buffer.from(voice.data).toString('base64');
      }
    } catch (e) {
      console.error("ElevenLabs API Error:", e.message);
    }

    await supabase.from('simulations').insert({
      user_id: userId || 'guest',
      block_id: blockId,
      intervention_type: intervention,
      co2_reduced: reduced,
      credits_earned: credits,
      ai_insight: aiInsight
    });

    res.json({ newAQI, reductionAmount: reduced, credits, estimatedCost, aiInsight, audioBase64, densityMultiplier, predictionData });
  } catch (error) {
    console.error("Simulation Error:", error);
    res.status(500).json({ error: "Simulation failed" });
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
app.listen(PORT, () => console.log(`🚀 EcoBlocks production server running on ${PORT}`));
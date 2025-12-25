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

// const SOLANA_MINT_ADDRESS = process.env.SOLANA_MINT_ADDRESS;
// const SOLANA_PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY;

/* ─────────────────── CLIENTS ─────────────────── */

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

// const connection = new Connection(
//   "https://api.devnet.solana.com",
//   "confirmed"
// );

// const mintKeypair = Keypair.fromSecretKey(
//   Uint8Array.from(JSON.parse(SOLANA_PRIVATE_KEY))
// );
// const MINT = new PublicKey(SOLANA_MINT_ADDRESS);

/* ─────────────────── AUTH MIDDLEWARE ─────────────────── */

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

/* ─────────────────── 1. BLOCK DATA ─────────────────── */

app.get('/api/block-data', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "Missing coordinates" });

  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5`;
    const { data } = await axios.get(url);

    const aqi = data.current.us_aqi;
    const traffic =
      aqi > 150 ? "Severe Congestion" :
      aqi > 100 ? "Heavy Traffic" :
      aqi > 50 ? "Moderate Flow" : "Clear Roads";

    res.json({
      aqi,
      pm25: data.current.pm2_5,
      traffic,
      temperature: 28
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch AQI" });
  }
});

/* ─────────────────── 2. TILE PROXY ─────────────────── */

app.get('/api/proxy-tile/:z/:x/:y', async (req, res) => {
  const { z, x, y } = req.params;
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

  try {
    const tile = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'EcoBlocks/1.0' }
    });

    res.set('Content-Type', 'image/png');
    res.send(tile.data);
  } catch {
    res.status(404).send();
  }
});

app.get("/api/geocode", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Missing query" });

  try {
    const response = await axios.get(
      "https://geocoding-api.open-meteo.com/v1/search",
      {
        params: {
          name: q,
          count: 1,
          language: "en",
          format: "json",
        },
        timeout: 8000,
      }
    );

    if (!response.data?.results?.length) {
      return res.status(404).json({ error: "Location not found" });
    }

    const place = response.data.results[0];

    res.json([
      {
        lat: place.latitude,
        lon: place.longitude,
        display_name: `${place.name}, ${place.country}`,
      },
    ]);
  } catch (err) {
    console.error("❌ Open-Meteo geocode error:", err.message);
    res.status(500).json({ error: "Geocoding failed" });
  }
});




/* ─────────────────── 3. SIMULATION ─────────────────── */

app.post('/api/simulate', async (req, res) => {
  const { blockId, intervention, currentAQI, userId } = req.body;

  const strategies = {
    "Green Wall": { r: 0.15, cost: 12000 },
    "Algae Panel": { r: 0.25, cost: 25000 },
    "Direct Air Capture": { r: 0.45, cost: 80000 }
  };

  const s = strategies[intervention] || strategies["Green Wall"];
  const reduced = +(currentAQI * s.r).toFixed(1);
  const newAQI = +(currentAQI - reduced).toFixed(1);
  const credits = Math.floor(reduced * 10);

  let aiInsight = "Urban air quality improved significantly.";
  if (GEMINI_KEY) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(
      `Write a professional one-line headline about ${intervention} reducing pollution.`
    );
    aiInsight = result.response.text();
  }

  let audioBase64 = null;
  if (ELEVEN_LABS_KEY) {
    const voice = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_LABS_VOICE_ID}`,
      { text: aiInsight },
      {
        headers: { 'xi-api-key': ELEVEN_LABS_KEY },
        responseType: 'arraybuffer'
      }
    );
    audioBase64 = Buffer.from(voice.data).toString('base64');
  }

  await supabase.from('simulations').insert({
    user_id: userId || 'guest',
    block_id: blockId,
    intervention_type: intervention,
    co2_reduced: reduced,
    credits_earned: credits,
    ai_insight: aiInsight
  });

  res.json({ newAQI, reductionAmount: reduced, credits, aiInsight, audioBase64 });
});

/* ─────────────────── 4. HISTORY ─────────────────── */

app.get('/api/history', requireAuth, async (req, res) => {
  const userId = req.user.sub;

  const { data } = await supabase
    .from('simulations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  res.json(data || []);
});

/* ─────────────────── 5. REAL SOLANA MINT ─────────────────── */

app.post('/api/mint-credit', requireAuth, async (req, res) => {
  const { walletAddress, credits } = req.body;
  const userId = req.user.sub;

  try {
    const tokenAccount =
      await getOrCreateAssociatedTokenAccount(
        connection,
        mintKeypair,
        MINT,
        new PublicKey(walletAddress)
      );

    const tx = await mintTo(
      connection,
      mintKeypair,
      MINT,
      tokenAccount.address,
      mintKeypair,
      credits
    );

    await supabase.from('user_rewards').insert({
      user_id: userId,
      total_credits: credits,
      tx_hash: tx,
      status: 'MINTED'
    });

    res.json({ success: true, txHash: tx });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Mint failed" });
  }
});

/* ─────────────────── START ─────────────────── */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 EcoBlocks production server running on ${PORT}`)
);

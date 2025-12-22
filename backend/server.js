require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase & Gemini
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_KEY || '');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// --- 1. GET REAL-TIME DATA (AQI) ---
app.get('/api/block-data', async (req, res) => {
    const { lat, lng } = req.query;
    
    try {
        const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5`;
        const response = await axios.get(aqiUrl);
        const currentAQI = response.data.current.us_aqi;
        
        const trafficLevel = currentAQI > 100 ? "Heavy Congestion" : "Moderate Flow";

        res.json({
            aqi: currentAQI,
            pm25: response.data.current.pm2_5,
            traffic: trafficLevel,
            temperature: 28 
        });
    } catch (error) {
        console.error("Data Fetch Error", error);
        res.status(500).json({ error: "Failed to fetch environmental data" });
    }
});

// --- 2. RUN SIMULATION & AI INSIGHTS ---
app.post('/api/simulate', async (req, res) => {
    const { blockId, intervention, currentAQI } = req.body;
    
    const strategies = {
        'Green Wall': { reduction: 0.15, cost: 12000 },
        'Algae Panel': { reduction: 0.25, cost: 25000 },
        'Direct Air Capture': { reduction: 0.45, cost: 80000 }
    };

    const strategy = strategies[intervention] || strategies['Green Wall'];

    const reductionAmount = Number((currentAQI * strategy.reduction).toFixed(1));
    const newAQI = Number((currentAQI - reductionAmount).toFixed(1));
    const credits = Math.floor(reductionAmount * 10);

    // let aiInsight = "Simulation complete.";
    // try {
    //     const model = genAI.getGenerativeModel({
    //         model: "gemini-1.0-pro",
    //     });

    //     const prompt = `Write a short, exciting Future News Headline (max 15 words) for a city block that installed ${intervention} and reduced pollution by ${Math.round(strategy.reduction * 100)}%.`;

    //     const result = await model.generateContent(prompt);
    //     aiInsight = result.response.text();
    // } catch (e) {
    //     console.error("AI Error", e);
    // }

    const { error } = await supabase.from('simulations').insert({
        block_id: blockId,
        intervention_type: intervention,
        co2_reduced: reductionAmount,
        credits_earned: credits,
        // ai_insight: aiInsight
    });

    if (error) console.error("Supabase Insert Error:", error);

    // res.json({ newAQI, reductionAmount, credits, aiInsight });
    res.json({ newAQI, reductionAmount, credits });
});


// --- 3. OSM TILE PROXY (Fixes CORS Error) ---
app.get('/api/proxy-tile/:z/:x/:y', async (req, res) => {
    const { z, x, y } = req.params;
    const tileUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    
    try {
        const response = await axios.get(tileUrl, { 
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'CarbonTwinHackathon/1.0' }
        });
        
        res.set('Content-Type', 'image/png');
        res.set('Access-Control-Allow-Origin', '*'); 
        res.send(response.data);
    } catch (error) {
        res.status(404).send('Tile not found');
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
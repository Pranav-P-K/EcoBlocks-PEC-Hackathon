import axios from "axios";

// Use your env variable
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

export interface BlockData {
  aqi: number;
  pm25: number;
  traffic: string;
  buildingDensity: string;
  buildingCount: number;
  treeDensity: string;
  treeCount: number;
  areaType: string;
  temperature: number;
}

export async function fetchAQIData(lat: number, lon: number): Promise<BlockData> {
  const res = await axios.get(`${API_BASE}/block-data`, {
    params: { lat, lon },
  });
  
  return res.data;
}
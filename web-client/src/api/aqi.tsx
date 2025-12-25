import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

export async function fetchAQIData(lat: number, lon: number) {
  const res = await axios.get(`${API_BASE}/block-data`, {
    params: { lat, lon },
  });

  return res.data as {
    aqi: number;
    pm25: number;
    traffic: string;
    temperature: number;
  };
}

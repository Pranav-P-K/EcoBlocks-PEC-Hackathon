import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

export async function runSimulation(payload: {
  blockId: number;
  intervention: "Green Wall" | "Algae Panel" | "Direct Air Capture";
  currentAQI: number;
  userId?: string;
}) {
  const res = await axios.post(`${API_BASE}/simulate`, payload);
  return res.data as {
    newAQI: number;
    reductionAmount: number;
    credits: number;
    aiInsight: string;
    audioBase64?: string;
  };
}

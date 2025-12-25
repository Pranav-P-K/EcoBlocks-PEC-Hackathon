import React, { useState } from "react";
import axios from "axios";

interface Props {
  userId?: string;
  credits?: number;
}

export const Wallet: React.FC<Props> = ({ userId, credits = 0 }) => {
  const [isMinting, setIsMinting] = useState(false);

  const mintCredits = async () => {
    if (!credits || isMinting) return;
    
    try {
      setIsMinting(true);
      await axios.post(`${import.meta.env.VITE_API_BASE}/api/mint-credit`, {
        userId: userId || "guest",
        credits,
      });
      alert("🌱 Success! Your carbon credits have been minted on the blockchain.");
    } catch (error) {
      console.error("Minting failed:", error);
      alert("❌ Failed to mint credits. Please try again.");
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="wallet">
      <h4>💰 Carbon Wallet</h4>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: 'var(--spacing-sm) 0'
      }}>
        <span>Your Credits:</span>
        <span style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold',
          color: 'var(--primary)'
        }}>
          {credits.toLocaleString()}
        </span>
      </div>
      <button 
        onClick={mintCredits} 
        disabled={credits === 0 || isMinting}
        style={{
          opacity: credits === 0 ? 0.6 : 1,
          cursor: credits === 0 ? 'not-allowed' : 'pointer'
        }}
      >
        {isMinting ? 'Minting...' : 'Mint to Blockchain'}
      </button>
      {credits > 0 && (
        <p style={{ 
          fontSize: '0.8rem', 
          color: 'var(--text-secondary)',
          marginTop: 'var(--spacing-xs)',
          textAlign: 'center'
        }}>
          Each credit represents 1kg of CO₂ removed
        </p>
      )}
    </div>
  );
};
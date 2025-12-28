import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Marketplace.css';

interface Vendor {
  id: string;
  name: string;
  intervention: string;
  logo: string;
  website: string;
  price: string;
  description: string;
  location: string;
  rating: number;
  certifications: string[];
}

const vendors: Vendor[] = [
  // Green Wall Vendors
  {
    id: 'gw1',
    name: 'Ambius',
    intervention: 'Green Wall',
    logo: '🌿',
    website: 'https://www.ambius.com',
    price: '$150-300/sq ft',
    description: 'Leading provider of interior and exterior green wall systems with custom design capabilities.',
    location: 'Nationwide (US)',
    rating: 4.8,
    certifications: ['LEED Certified', 'Green Building Council']
  },
  {
    id: 'gw2',
    name: 'GSky Plant Systems',
    intervention: 'Green Wall',
    logo: '🏢',
    website: 'https://www.gsky.com',
    price: '$200-400/sq ft',
    description: 'Award-winning green wall systems for interior and exterior spaces, enhancing air quality.',
    location: 'Global',
    rating: 4.9,
    certifications: ['ISO 14001', 'Living Building Challenge']
  },

  // Algae Panel Vendors
  {
    id: 'ap1',
    name: 'Alcarbo Technologies',
    intervention: 'Algae Panel',
    logo: '🦠',
    website: 'https://www.alcarbotechnologies.com.hk',
    price: '$500-800/panel',
    description: 'Revolutionary algae photobioreactor systems designed to absorb and neutralize CO₂.',
    location: 'Hong Kong, Global',
    rating: 4.7,
    certifications: ['Carbon Trust Certified', 'ISO 9001']
  },
  {
    id: 'ap2',
    name: 'Carbelim',
    intervention: 'Algae Panel',
    logo: '🔬',
    website: 'https://www.carbelim.io',
    price: '$600-1000/panel',
    description: 'Microalgae CCUS technology transforming CO₂ streams into valuable biomass.',
    location: 'Europe, North America',
    rating: 4.6,
    certifications: ['EU Carbon Removal Certified', 'Verified Carbon Standard']
  },

  // Direct Air Capture Vendors
  {
    id: 'dac1',
    name: 'Climeworks',
    intervention: 'Direct Air Capture',
    logo: '🌪️',
    website: 'https://climeworks.com',
    price: '$600-1200/tonne CO₂',
    description: 'Pioneer in direct air capture technology with modular CO₂ collectors powered by renewable energy.',
    location: 'Switzerland, Global',
    rating: 4.9,
    certifications: ['Gold Standard', 'Verified Carbon Standard', 'ISO 14064']
  },
  {
    id: 'dac2',
    name: 'Carbon Engineering',
    intervention: 'Direct Air Capture',
    logo: '⚙️',
    website: 'https://carbonengineering.com',
    price: '$400-800/tonne CO₂',
    description: 'Large-scale direct air capture technology with geological storage solutions.',
    location: 'Canada, US',
    rating: 4.8,
    certifications: ['California LCFS', 'Clean Development Mechanism']
  },

  // Building Retrofit Vendors
  {
    id: 'br1',
    name: 'Efficient Home LLC',
    intervention: 'Building Retrofit',
    logo: '🏗️',
    website: 'https://www.efficienthomellc.com',
    price: '$15-35/sq ft',
    description: 'Energy efficiency retrofit services for commercial buildings and multifamily properties.',
    location: 'US Northeast',
    rating: 4.7,
    certifications: ['ENERGY STAR Partner', 'BPI Certified']
  },
  {
    id: 'br2',
    name: 'Superior Heating & Air',
    intervention: 'Building Retrofit',
    logo: '🔧',
    website: 'https://superiorheatandair.com',
    price: '$20-50/sq ft',
    description: 'Commercial HVAC retrofits and building automation systems for improved efficiency.',
    location: 'Denver Metro Area',
    rating: 4.8,
    certifications: ['NATE Certified', 'EPA Section 608']
  },

  // Biochar Vendors
  {
    id: 'bc1',
    name: 'Sitos Group',
    intervention: 'Biochar',
    logo: '🌱',
    website: 'https://www.sitos.earth',
    price: '$300-600/tonne',
    description: 'High-quality durable biochar production using slow pyrolysis for carbon sequestration.',
    location: 'US, Canada',
    rating: 4.8,
    certifications: ['Biochar Quality Mandate', 'Carbon Future Registry']
  },
  {
    id: 'bc2',
    name: 'Standard Biocarbon',
    intervention: 'Biochar',
    logo: '🪵',
    website: 'https://www.standardbiocarbon.com',
    price: '$400-700/tonne',
    description: 'Premium biochar made from source-verified sawmill residuals for professional applications.',
    location: 'Maine, US',
    rating: 4.7,
    certifications: ['USDA Organic', 'Biochar Quality Mandate']
  },

  // Cool Roof + Solar Vendors
  {
    id: 'crs1',
    name: 'Freedom Solar Power',
    intervention: 'Cool Roof + Solar',
    logo: '☀️',
    website: 'https://freedomsolarpower.com',
    price: '$3-6/watt installed',
    description: 'Commercial solar solutions with cool roof integration for maximum energy efficiency.',
    location: 'Texas, US',
    rating: 4.9,
    certifications: ['NABCEP Certified', 'Solar Power World Top Contractor']
  },
  {
    id: 'crs2',
    name: 'Roofed Right America',
    intervention: 'Cool Roof + Solar',
    logo: '🏠',
    website: 'https://www.roofedright.com',
    price: '$4-7/watt installed',
    description: 'Expert solar panel installation with cool roofing systems for commercial properties.',
    location: 'Nationwide (US)',
    rating: 4.8,
    certifications: ['GAF Master Elite', 'Tesla Certified Installer']
  }
];

const Marketplace: React.FC = () => {
  const navigate = useNavigate();
  const [selectedIntervention, setSelectedIntervention] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const interventionTypes = ['All', 'Green Wall', 'Algae Panel', 'Direct Air Capture', 'Building Retrofit', 'Biochar', 'Cool Roof + Solar'];

  const filteredVendors = vendors.filter(vendor => {
    const matchesIntervention = selectedIntervention === 'All' || vendor.intervention === selectedIntervention;
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesIntervention && matchesSearch;
  });

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleVendorContact = (vendor: Vendor) => {
    window.open(vendor.website, '_blank');
  };

  return (
    <div className="marketplace-container">
      <div className="marketplace-header">
        <button className="back-button" onClick={handleBackToDashboard}>
          ← Back to Dashboard
        </button>
        <h1>🏪 Carbon Solutions Marketplace</h1>
        <p>Find verified vendors for your carbon reduction interventions</p>
      </div>

      <div className="marketplace-filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="intervention-filters">
          {interventionTypes.map(type => (
            <button
              key={type}
              className={`filter-btn ${selectedIntervention === type ? 'active' : ''}`}
              onClick={() => setSelectedIntervention(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="vendors-grid">
        {filteredVendors.map(vendor => (
          <div key={vendor.id} className="vendor-card">
            <div className="vendor-header">
              <div className="vendor-logo">{vendor.logo}</div>
              <div className="vendor-info">
                <h3>{vendor.name}</h3>
                <span className="intervention-tag">{vendor.intervention}</span>
              </div>
              <div className="vendor-rating">
                ⭐ {vendor.rating}
              </div>
            </div>
            
            <div className="vendor-details">
              <p className="vendor-description">{vendor.description}</p>
              <div className="vendor-meta">
                <div className="price">💰 {vendor.price}</div>
                <div className="location">📍 {vendor.location}</div>
              </div>
              
              <div className="certifications">
                {vendor.certifications.map(cert => (
                  <span key={cert} className="cert-badge">{cert}</span>
                ))}
              </div>
            </div>
            
            <div className="vendor-actions">
              <button 
                className="contact-btn"
                onClick={() => handleVendorContact(vendor)}
              >
                Visit Website
              </button>
              <button className="quote-btn">
                Request Quote
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <div className="no-results">
          <h3>No vendors found</h3>
          <p>Try adjusting your search criteria or intervention type.</p>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
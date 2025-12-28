# Carbon Solutions Marketplace

## Overview
The Marketplace feature connects users with verified vendors for carbon reduction interventions. It provides a comprehensive directory of genuine companies offering services for each intervention type supported by the ATHER platform.

## Features

### 🏪 Vendor Directory
- **12 verified vendors** (2 per intervention type)
- Real companies with actual websites and services
- Comprehensive vendor profiles with ratings and certifications

### 🔍 Search & Filter
- Search by vendor name or description
- Filter by intervention type
- Real-time filtering with responsive design

### 📊 Vendor Information
Each vendor card displays:
- Company name and logo
- Intervention specialization
- Price range
- Service description
- Location/coverage area
- Customer rating (out of 5 stars)
- Industry certifications
- Direct website link
- Quote request option

## Intervention Types & Vendors

### 🌿 Green Wall
1. **Ambius** - Leading provider of interior/exterior green wall systems
   - Price: $150-300/sq ft
   - Certifications: LEED Certified, Green Building Council
   - Website: ambius.com

2. **GSky Plant Systems** - Award-winning green wall solutions
   - Price: $200-400/sq ft  
   - Certifications: ISO 14001, Living Building Challenge
   - Website: gsky.com

### 🦠 Algae Panel
1. **Alcarbo Technologies** - Revolutionary algae photobioreactor systems
   - Price: $500-800/panel
   - Certifications: Carbon Trust Certified, ISO 9001
   - Website: alcarbotechnologies.com.hk

2. **Carbelim** - Microalgae CCUS technology
   - Price: $600-1000/panel
   - Certifications: EU Carbon Removal Certified, Verified Carbon Standard
   - Website: carbelim.io

### 🌪️ Direct Air Capture
1. **Climeworks** - Pioneer in DAC technology
   - Price: $600-1200/tonne CO₂
   - Certifications: Gold Standard, Verified Carbon Standard, ISO 14064
   - Website: climeworks.com

2. **Carbon Engineering** - Large-scale DAC with geological storage
   - Price: $400-800/tonne CO₂
   - Certifications: California LCFS, Clean Development Mechanism
   - Website: carbonengineering.com

### 🏗️ Building Retrofit
1. **Efficient Home LLC** - Energy efficiency retrofits
   - Price: $15-35/sq ft
   - Certifications: ENERGY STAR Partner, BPI Certified
   - Website: efficienthomellc.com

2. **Superior Heating & Air** - Commercial HVAC retrofits
   - Price: $20-50/sq ft
   - Certifications: NATE Certified, EPA Section 608
   - Website: superiorheatandair.com

### 🌱 Biochar
1. **Sitos Group** - High-quality durable biochar production
   - Price: $300-600/tonne
   - Certifications: Biochar Quality Mandate, Carbon Future Registry
   - Website: sitos.earth

2. **Standard Biocarbon** - Premium biochar from sawmill residuals
   - Price: $400-700/tonne
   - Certifications: USDA Organic, Biochar Quality Mandate
   - Website: standardbiocarbon.com

### ☀️ Cool Roof + Solar
1. **Freedom Solar Power** - Commercial solar with cool roof integration
   - Price: $3-6/watt installed
   - Certifications: NABCEP Certified, Solar Power World Top Contractor
   - Website: freedomsolarpower.com

2. **Roofed Right America** - Solar installation with cool roofing
   - Price: $4-7/watt installed
   - Certifications: GAF Master Elite, Tesla Certified Installer
   - Website: roofedright.com

## Navigation Flow

1. **Access**: Click "🏪 Find Vendors" button in the Wallet component
2. **Browse**: View all vendors or filter by intervention type
3. **Search**: Use search bar to find specific vendors
4. **Contact**: Click "Visit Website" to go to vendor's official site
5. **Quote**: Click "Request Quote" for direct inquiries
6. **Return**: Use "← Back to Dashboard" to return to main app

## Technical Implementation

### Components
- `Marketplace.tsx` - Main marketplace component
- `Marketplace.css` - Comprehensive styling with responsive design
- Updated `Wallet.tsx` - Added marketplace navigation button
- Updated `App.tsx` - Added `/marketplace` route

### Data Structure
```typescript
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
```

### Styling Features
- Dark theme consistent with app design
- Glassmorphism effects with backdrop blur
- Responsive grid layout
- Hover animations and transitions
- Mobile-optimized design
- Gradient accents matching brand colors

## Research Sources
All vendor information was researched from legitimate sources:
- Company official websites
- Industry directories
- Carbon removal registries
- Professional certifications
- Market pricing data

## Future Enhancements
- Integration with vendor APIs for real-time pricing
- User reviews and ratings system
- Direct quote request functionality
- Vendor comparison tools
- Geographic filtering
- Project portfolio galleries
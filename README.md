# Highways Scheme Planner

A browser-based highways scheme planning tool for placing accurately-scaled highways products on real road corridors worldwide.

## Features

- **Global Road Selection**: Select real roads anywhere using MapLibre GL JS and OpenStreetMap data
- **Corridor-Based Design**: Define scheme corridors of any length with chainage-based placement
- **Product Catalogue**: Complete product library including:
  - Speed Cushions (1-piece and 2-piece, 65mm/75mm heights)
  - Traffic Islands (various sizes)
  - Pedestrian Refuges
  - NCLD Standard and Lite (Narrow Cycle Lane Defenders)
  - Lane Separators
  - Raised Tables
- **Linear Runs**: Configure continuous or segmented runs for cycle lane products
- **Live Quantities**: Real-time bill of quantities as you work
- **Save/Export**: Save schemes locally and export as JSON

## Tech Stack

- **Framework**: Next.js 14 (React + TypeScript)
- **State**: Zustand
- **Mapping**: MapLibre GL JS + MapTiler
- **Geometry**: Turf.js
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/rosehillgroup/highwaysscheme.git
cd highwaysscheme

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local and add your MapTiler API key
```

### MapTiler API Key

1. Sign up at [MapTiler Cloud](https://www.maptiler.com/cloud/)
2. Create a new API key
3. Add it to `.env.local`:
   ```
   NEXT_PUBLIC_MAPTILER_KEY=your_api_key_here
   ```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
├── components/
│   ├── map/               # MapLibre components
│   ├── canvas/            # Product placement canvas
│   ├── panels/            # UI panels
│   └── ui/                # Shared UI components
├── lib/
│   ├── geometry/          # Geometry utilities
│   ├── corridor/          # Corridor calculations
│   ├── products/          # Product resolution logic
│   └── serialization/     # Save/load utilities
├── stores/
│   └── schemeStore.ts     # Zustand store
├── data/
│   └── products.json      # Product catalogue
└── types/
    └── index.ts           # TypeScript definitions
```

## Product Data

Product dimensions and specifications are sourced from the Rosehill Highways product range. All measurements are in millimetres.

### Linear Product Behaviour

- **NCLD Standard & Lane Separators**: Continuous runs (End + Mid + End pattern)
- **NCLD Lite**: Segmented only (no mid piece - End units with configurable gaps)

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variable `NEXT_PUBLIC_MAPTILER_KEY`
3. Deploy

## License

Proprietary - Rosehill Group

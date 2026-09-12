'use client';
import { Map, Satellite } from 'lucide-react';

interface Props {
  mode: 'standard' | 'satellite';
  onChange: (mode: 'standard' | 'satellite') => void;
}

export default function MapStyleToggle({ mode, onChange }: Props) {
  return (
    <div className="map-style-toggle" role="radiogroup" aria-label="Map style">
      <button
        className={`mst-btn ${mode === 'standard' ? 'active' : ''}`}
        role="radio"
        aria-checked={mode === 'standard'}
        aria-label="Standard map"
        onClick={() => onChange('standard')}
      >
        <Map size={15} />
        <span className="mst-label">Standard</span>
      </button>
      <button
        className={`mst-btn ${mode === 'satellite' ? 'active' : ''}`}
        role="radio"
        aria-checked={mode === 'satellite'}
        aria-label="Satellite imagery"
        onClick={() => onChange('satellite')}
      >
        <Satellite size={15} />
        <span className="mst-label">Satellite</span>
      </button>
    </div>
  );
}

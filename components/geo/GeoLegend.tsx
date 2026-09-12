'use client';

const items: [string, string, string][] = [
  ['Completed', '#22c55e', 'Work marked complete'],
  ['Ongoing', '#3b82f6', 'Work in progress'],
  ['Sanctioned', '#f59e0b', 'Approved, not yet started'],
  ['Unsanctioned', '#ef4444', 'Pending IDA approval'],
  ['Not reported', '#9ca3af', 'Status not supplied'],
];

export default function GeoLegend({ satellite = false }: { satellite?: boolean }) {
  return (
    <div className={`geo-legend ${satellite ? 'satellite' : ''}`} aria-label="Map legend">
      {items.map(([label, color]) => (
        <span key={label} className="geo-legend-item">
          <i className="geo-legend-dot" style={{ background: color }} />
          {label}
        </span>
      ))}
      <span className="geo-legend-item precision">
        <i className="geo-legend-dot approx" />
        Approximate location
      </span>
    </div>
  );
}

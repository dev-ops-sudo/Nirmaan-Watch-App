/**
 * Coordinate resolution for MPLADS works.
 *
 * Resolves each work to a lat/lng by joining against a centroid lookup:
 *   1. Constituency centroid (if geocoded)
 *   2. State centroid + deterministic offset (fallback)
 *
 * Precision is tagged per-work so the map can visually distinguish
 * exact vs. approximate locations.
 */
import type { Work } from './mplads';

export type CentroidLookup = {
  states: Record<string, [number, number]>;
  constituencies: Record<string, [number, number]>;
};

export type ResolvedWork = Work & {
  resolvedLat: number;
  resolvedLng: number;
  geoPrecision: 'constituency' | 'state';
};

let _cached: CentroidLookup | null = null;

/** Load centroid data (cached after first call). */
export async function loadCentroids(): Promise<CentroidLookup> {
  if (_cached) return _cached;
  const res = await fetch('/data/constituency-centroids.json');
  _cached = await res.json();
  return _cached!;
}

/** Simple string hash for deterministic constituency offsets. */
function strhash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Resolve a single work to coordinates.
 * Returns null if no centroid is available (shouldn't happen with full state data).
 */
export function resolveWork(work: Work, centroids: CentroidLookup): ResolvedWork | null {
  // Try constituency centroid first
  const key = `${work.constituency}|${work.state}`;
  const cc = centroids.constituencies[key];
  if (cc) {
    return { ...work, resolvedLat: cc[0], resolvedLng: cc[1], geoPrecision: 'constituency' };
  }

  // Fallback to state centroid with a deterministic offset per constituency
  // so different constituencies spread out instead of stacking on the same point
  const sc = centroids.states[work.state];
  if (!sc) return null;

  const h = strhash(work.constituency || work.id);
  const angle = ((h % 360) * Math.PI) / 180;
  const radius = 0.3 + (h % 7) * 0.13; // 0.3–1.2° ≈ 33–130 km
  const lat = sc[0] + Math.cos(angle) * radius;
  const lng = sc[1] + Math.sin(angle) * radius;

  return { ...work, resolvedLat: lat, resolvedLng: lng, geoPrecision: 'state' };
}

/**
 * Resolve all works in bulk.
 * Groups by resolved location for efficient marker rendering.
 */
export function resolveAll(
  works: Work[],
  centroids: CentroidLookup
): { resolved: ResolvedWork[]; groups: Map<string, ResolvedWork[]> } {
  const resolved: ResolvedWork[] = [];
  const groups = new Map<string, ResolvedWork[]>();

  for (const w of works) {
    const r = resolveWork(w, centroids);
    if (!r) continue;
    resolved.push(r);
    // Group by rounded location (works in same constituency share a point)
    const gk = `${r.resolvedLat.toFixed(3)},${r.resolvedLng.toFixed(3)}`;
    if (!groups.has(gk)) groups.set(gk, []);
    groups.get(gk)!.push(r);
  }

  return { resolved, groups };
}

/** Status priority for marker coloring (highest-priority status in a group). */
const STATUS_PRIORITY: Record<string, number> = {
  'Unsanctioned': 4,
  'Not reported': 3,
  'Ongoing': 2,
  'Sanctioned': 1,
  'Completed': 0,
};

/** Get the dominant status for a group of works (for marker coloring). */
export function dominantStatus(works: ResolvedWork[]): string {
  let best = 'Not reported';
  let bestPri = -1;
  for (const w of works) {
    const pri = STATUS_PRIORITY[w.status] ?? 3;
    if (pri > bestPri) {
      bestPri = pri;
      best = w.status;
    }
  }
  return best;
}

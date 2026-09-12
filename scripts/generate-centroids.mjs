/**
 * One-time script to geocode MPLADS constituency names to lat/lng centroids.
 * Uses the free OpenStreetMap Nominatim API (max 1 request/second).
 *
 * Usage:
 *   node scripts/generate-centroids.mjs
 *
 * The script reads the MPLADS dataset, extracts unique constituency|state pairs,
 * geocodes each via Nominatim, and writes results to constituency-centroids.json.
 * Previously geocoded results are preserved (incremental).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OUT_FILE = 'public/data/constituency-centroids.json';
const DELAY_MS = 1100; // Nominatim TOS: max 1 req/sec

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function geocode(name, state) {
  // Try constituency name + state + India
  for (const query of [
    `${name} constituency, ${state}, India`,
    `${name}, ${state}, India`,
    `${name}, India`,
  ]) {
    const url = `${NOMINATIM}?${new URLSearchParams({
      q: query, format: 'json', limit: '1', countrycodes: 'in',
    })}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'NirmaanWatch/1.0 (SIH prototype geocoder)' },
      });
      const data = await res.json();
      if (data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch {
      // Network error, continue to next query variant
    }
    await sleep(DELAY_MS);
  }
  return null;
}

async function main() {
  // Load MPLADS data
  console.log('Loading MPLADS dataset…');
  const mplads = JSON.parse(readFileSync('public/data/mplads.json', 'utf-8'));

  // Extract unique constituency|state pairs (skip Rajya Sabha placeholders)
  const pairs = new Map();
  for (const row of mplads.rows) {
    const constituency = String(row[4]).trim();
    const state = String(row[3]).trim();
    if (constituency && !constituency.startsWith('Sitting ')) {
      const key = `${constituency}|${state}`;
      if (!pairs.has(key)) pairs.set(key, { constituency, state, count: 0 });
      pairs.get(key).count++;
    }
  }
  console.log(`Found ${pairs.size} unique constituency|state pairs to geocode`);

  // Load existing data
  const existing = JSON.parse(readFileSync(OUT_FILE, 'utf-8'));
  const constituencies = existing.constituencies || {};

  let geocoded = 0, cached = 0, failed = 0;
  const total = pairs.size;

  for (const [key, { constituency, state }] of pairs) {
    if (constituencies[key]) { cached++; continue; }

    await sleep(DELAY_MS);
    const result = await geocode(constituency, state);

    if (result) {
      constituencies[key] = result;
      geocoded++;
    } else {
      failed++;
      console.log(`  ✗ ${key}`);
    }

    if ((geocoded + failed) % 20 === 0) {
      const done = geocoded + failed + cached;
      console.log(`Progress: ${done}/${total} (${geocoded} new, ${cached} cached, ${failed} failed)`);
      // Incremental save
      writeFileSync(OUT_FILE, JSON.stringify({ ...existing, constituencies }, null, 2));
    }
  }

  // Final save
  writeFileSync(OUT_FILE, JSON.stringify({ ...existing, constituencies }, null, 2));
  console.log(`\nDone: ${geocoded} geocoded, ${cached} cached, ${failed} failed`);
  console.log(`Total constituency centroids: ${Object.keys(constituencies).length}`);
}

main().catch(e => { console.error(e); process.exitCode = 1; });

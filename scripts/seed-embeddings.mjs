/**
 * Nirmaan AI / MPLADS Vector Embedding Ingestion Script
 * Model: Google Gemini text-embedding-004 (768 dimensions)
 * Target: Supabase pgvector table `mplads_embeddings`
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// 1. Load environment variables
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  const env = {};
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      const lines = fs.readFileSync(file, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const k = trimmed.slice(0, idx).trim();
          const v = trimmed.slice(idx + 1).trim();
          if (!env[k]) env[k] = v;
        }
      }
    }
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = env.GEMINI_API_KEY || env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Error: Supabase credentials not found in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function getEmbedding(text, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini Embedding API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.embedding?.values;
}

async function main() {
  console.log('--- Nirmaan MPLADS Vector Embedding Ingestion ---');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Gemini API Key configured: ${geminiApiKey ? 'YES' : 'NO (Required for live embedding generation)'}`);

  if (!geminiApiKey || geminiApiKey.includes('your_gemini_api_key')) {
    console.log('\n[!] GEMINI_API_KEY is not set in .env.local.');
    console.log('Please add GEMINI_API_KEY=AIzaSy... to your .env.local file and re-run.\n');
    return;
  }

  const dataPath = path.resolve('public/data/mplads.json');
  if (!fs.existsSync(dataPath)) {
    console.error('Data file public/data/mplads.json does not exist. Run "npm run data:prepare" first.');
    return;
  }

  console.log('Reading MPLADS dataset...');
  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const rows = rawData.rows;
  console.log(`Loaded ${rows.length} total works.`);

  // Process sample or full batch
  const limit = process.argv.includes('--all') ? rows.length : 100;
  console.log(`Processing up to ${limit} records... (Use --all for complete ingestion)`);

  let successCount = 0;
  for (let i = 0; i < limit; i++) {
    const r = rows[i];
    const work = {
      work_id: String(r[0]),
      mp_name: String(r[1]),
      house: String(r[2]),
      state: String(r[3]),
      constituency: String(r[4]),
      city: String(r[5]),
      ward: String(r[6]),
      block: String(r[7]),
      village: String(r[8]),
      category: String(r[9]),
      title: String(r[10]),
      agency: String(r[11]),
      recommended_date: String(r[12]),
      approval: String(r[13]),
      allocation: Number(r[14]) || 0,
      status: String(r[15]) || 'Not reported'
    };

    const textContent = `MPLADS Work ID: ${work.work_id}. State: ${work.state}. MP: ${work.mp_name} (${work.house}, ${work.constituency}). Location: ${work.village || work.city || work.block || 'Unspecified'}. Category: ${work.category}. Description: ${work.title}. Allocation: INR ${work.allocation}. Status: ${work.status}. Authority: ${work.agency}.`;

    try {
      const embedding = await getEmbedding(textContent, geminiApiKey);
      const { error } = await supabase.from('mplads_embeddings').upsert({
        id: work.work_id,
        ...work,
        content: textContent,
        embedding
      });

      if (error) {
        console.error(`Error inserting work ${work.work_id}:`, error.message);
      } else {
        successCount++;
        if (successCount % 10 === 0 || successCount === limit) {
          console.log(`Ingested ${successCount}/${limit} records into Supabase...`);
        }
      }
      // Slight delay to respect rate limits
      await new Promise(res => setTimeout(res, 120));
    } catch (err) {
      console.error(`Failed on work ${work.work_id}:`, err.message);
      break;
    }
  }

  console.log(`\nDone! Successfully embedded and uploaded ${successCount} records to Supabase.`);
}

main().catch(console.error);

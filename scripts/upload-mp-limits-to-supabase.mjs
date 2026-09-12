/**
 * Upload "Allocated Limit for Honble MPs" dataset to Supabase:
 * 1. Uploads CSV and JSON files to Supabase Storage bucket 'mplads_datasets'
 * 2. Attempts upsert of all 543 MP records to Supabase Table 'mp_allocated_limits'
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
function loadEnv() {
  const envFiles = ['.env', '.env.local'];
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
          if (!env[k] || env[k].includes('your_')) env[k] = v;
        }
      }
    }
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://dhnokgnebxthvwkfcgto.supabase.co';
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Error: Supabase URL or Service Key missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function uploadToStorage() {
  console.log('--- 1. Uploading Datasets to Supabase Storage ---');
  
  // Ensure bucket exists
  try {
    await supabase.storage.createBucket('mplads_datasets', { public: true });
  } catch (err) {
    // bucket may already exist
  }

  const filesToUpload = [
    {
      localPath: 'public/data/Allocated_Limit_for_Honble_MPs.csv',
      remotePath: 'Allocated_Limit_for_Honble_MPs.csv',
      contentType: 'text/csv'
    },
    {
      localPath: 'public/data/mp-allocated-limits.json',
      remotePath: 'mp-allocated-limits.json',
      contentType: 'application/json'
    }
  ];

  for (const item of filesToUpload) {
    if (fs.existsSync(item.localPath)) {
      const fileBuffer = fs.readFileSync(item.localPath);
      const { data, error } = await supabase.storage
        .from('mplads_datasets')
        .upload(item.remotePath, fileBuffer, {
          contentType: item.contentType,
          upsert: true
        });

      if (error) {
        console.warn(`Storage upload warning for ${item.remotePath}:`, error.message);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('mplads_datasets')
          .getPublicUrl(item.remotePath);
        console.log(`✓ Uploaded ${item.remotePath} to Supabase Storage.`);
        console.log(`  Public URL: ${publicUrlData?.publicUrl}`);
      }
    }
  }
}

async function uploadToTable() {
  console.log('\n--- 2. Upserting Records into Supabase Table: mp_allocated_limits ---');
  const jsonPath = 'public/data/mp-allocated-limits.json';
  if (!fs.existsSync(jsonPath)) {
    console.error('JSON file not found at:', jsonPath);
    return;
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const records = raw.records;
  console.log(`Found ${records.length} MP records to upload.`);

  // Chunk in batches of 50
  const chunkSize = 50;
  let inserted = 0;
  let tableMissing = false;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await supabase.from('mp_allocated_limits').upsert(chunk, {
      onConflict: 'sr_no'
    });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('not found')) {
        tableMissing = true;
        console.log('\n[NOTICE] Supabase Table "public.mp_allocated_limits" has not been created yet in PostgreSQL.');
        console.log('To create it, run the SQL script in your Supabase SQL Editor:');
        console.log('  -> scripts/setup-mp-limits.sql');
        console.log('(Note: The app will seamlessly load from the bundled JSON dataset in the meantime!)\n');
        break;
      } else {
        console.error(`Batch error at index ${i}:`, error.message);
      }
    } else {
      inserted += chunk.length;
      process.stdout.write(`\rInserted ${inserted}/${records.length} records into Supabase table...`);
    }
  }

  if (!tableMissing && inserted > 0) {
    console.log(`\n✓ Successfully synced all ${inserted} records to Supabase table "mp_allocated_limits"!`);
  }
}

async function main() {
  await uploadToStorage();
  await uploadToTable();
  console.log('\nFinished Supabase dataset synchronization.');
}

main().catch(console.error);

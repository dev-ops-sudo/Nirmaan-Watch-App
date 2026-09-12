import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env.local manually
const envLines = fs.readFileSync('.env.local', 'utf-8').split('\n');
const env = {};
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    env[key] = val;
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection to:', supabaseUrl);
const supabase = createClient(supabaseUrl, serviceKey);

async function test() {
  try {
    const { data, error } = await supabase.from('projects').select('*').limit(1);
    console.log('Query projects result:', { data, error });

    // Test calling an rpc or listing tables
    const rpcRes = await supabase.rpc('get_schema_version');
    console.log('RPC test:', rpcRes.error?.message || 'ok');
  } catch (err) {
    console.error('Error:', err);
  }
}

test();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  'https://dhnokgnebxthvwkfcgto.supabase.co';

const supabaseAnonKey = 
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRobm9rZ25lYnh0aHZ3a2ZjZ3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNjMwMDIsImV4cCI6MjEwNDczOTAwMn0.CQ5lsRSkXOXI3c2a4GnFpFIuXZjwaCGyGJRXJgnYByw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

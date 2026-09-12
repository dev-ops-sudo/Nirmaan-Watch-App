import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Cached in-memory dataset for rapid hybrid fallback
let cachedWorks: any[] | null = null;

async function loadLocalWorks(reqUrl?: string) {
  if (cachedWorks && cachedWorks.length > 0) return cachedWorks;
  
  // 1. Try local fs candidates
  const candidates = [
    path.resolve(process.cwd(), 'public/data/mplads.json'),
    path.resolve(process.cwd(), 'Nirmaan-Watch-Source/public/data/mplads.json'),
    'C:/Users/dm790/OneDrive/Desktop/mplads new project 2026/Nirmaan-Watch-Source/public/data/mplads.json'
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
        cachedWorks = raw.rows.map((r: any[]) => ({
          id: String(r[0]),
          mp: String(r[1]),
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
          recommended: String(r[12]),
          approval: String(r[13]),
          allocation: Number(r[14]) || 0,
          status: String(r[15] || 'Not reported')
        }));
        if (cachedWorks && cachedWorks.length > 0) return cachedWorks;
      } catch (err) {
        console.warn('fs read failed:', err);
      }
    }
  }

  // 2. Fetch via worker/server URL (essential in bundled Cloudflare/Vinext runtime)
  if (reqUrl) {
    try {
      const dataUrl = new URL('/data/mplads.json', reqUrl).toString();
      console.log('[RAG] Fetching dataset from bundle URL:', dataUrl);
      const res = await fetch(dataUrl);
      if (res.ok) {
        const raw = (await res.json()) as any;
        cachedWorks = raw.rows.map((r: any[]) => ({
          id: String(r[0]),
          mp: String(r[1]),
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
          recommended: String(r[12]),
          approval: String(r[13]),
          allocation: Number(r[14]) || 0,
          status: String(r[15] || 'Not reported')
        }));
        console.log('[RAG] Successfully loaded via URL fetch, count:', cachedWorks?.length);
        return cachedWorks || [];
      }
    } catch (err) {
      console.error('[RAG] Failed to fetch data from bundle URL:', err);
    }
  }

  return cachedWorks || [];
}

function getEnvGeminiKey(): string | null {
  const direct = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (direct && !direct.includes('your_gemini') && direct.trim().length > 10) return direct.trim();

  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
    'C:/Users/dm790/OneDrive/Desktop/mplads new project 2026/Nirmaan-Watch-Source/.env',
    'C:/Users/dm790/OneDrive/Desktop/mplads new project 2026/Nirmaan-Watch-Source/.env.local'
  ];

  for (const f of candidates) {
    try {
      if (fs.existsSync(f)) {
        const text = fs.readFileSync(f, 'utf-8');
        for (const line of text.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const match = trimmed.match(/^(?:GEMINI_API_KEY|VITE_GEMINI_API_KEY|NEXT_PUBLIC_GEMINI_API_KEY)\s*=\s*(.+)$/i);
          if (match && match[1]) {
            let val = match[1].trim();
            // Strip inline comments if any
            if (val.includes('#')) {
              val = val.split('#')[0].trim();
            }
            // Strip surrounding quotes
            val = val.replace(/^["']|["']$/g, '').trim();
            if (val && !val.includes('your_gemini') && val.length > 10) {
              return val;
            }
          }
        }
      }
    } catch {}
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as any;
    const {
      query,
      state = 'All states',
      mp = 'All MPs',
      village = 'All villages',
      local = 'All localities',
      userApiKey
    } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'A search query is required.' }, { status: 400 });
    }

    const geminiKey = userApiKey || getEnvGeminiKey();

    // Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://dhnokgnebxthvwkfcgto.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey || '');

    let retrievedWorks: any[] = [];
    let retrievalSource: 'supabase_vector' | 'hybrid_local' = 'hybrid_local';

    // 1. Attempt Supabase Vector Retrieval if Gemini Key is available
    if (geminiKey && !geminiKey.includes('your_gemini')) {
      try {
        const embRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/text-embedding-004',
              content: { parts: [{ text: query }] }
            })
          }
        );

        if (embRes.ok) {
          const embData = (await embRes.json()) as any;
          const queryEmbedding = embData.embedding?.values;

          if (queryEmbedding && queryEmbedding.length === 768) {
            const { data, error } = await supabase.rpc('match_mplads_works', {
              query_embedding: queryEmbedding,
              match_threshold: 0.25,
              match_count: 20,
              filter_state: state !== 'All states' ? state : null,
              filter_mp: mp !== 'All MPs' ? mp : null,
              filter_village: village !== 'All villages' ? village : null
            });

            if (!error && data && data.length > 0) {
              retrievedWorks = data.map((d: any) => ({
                id: d.work_id,
                mp: d.mp_name,
                state: d.state,
                constituency: d.constituency,
                village: d.village,
                block: d.block,
                city: d.city,
                category: d.category,
                title: d.title,
                agency: d.agency,
                allocation: Number(d.allocation),
                status: d.status,
                approval: d.approval,
                recommended: d.recommended_date,
                similarity: d.similarity
              }));
              retrievalSource = 'supabase_vector';
            }
          }
        }
      } catch (err) {
        console.warn('Supabase vector query skipped/failed, using high-speed hybrid store:', err);
      }
    }

    // 2. Hybrid In-Memory Fallback if vector records were not retrieved
    if (retrievedWorks.length === 0) {
      const all = (await loadLocalWorks(req.url)) || [];
      const stopWords = new Set(['in', 'on', 'at', 'the', 'of', 'and', 'for', 'to', 'with', 'by', 'works', 'projects', 'all', 'any', 'show', 'find', 'get', 'list']);
      const terms = query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((t: string) => t.length > 2 && !stopWords.has(t));
      
      const filtered = all.filter((r: any) => {
        if (state !== 'All states' && r.state.toLowerCase() !== state.toLowerCase()) return false;
        if (mp !== 'All MPs' && !r.mp.toLowerCase().includes(mp.toLowerCase())) return false;
        if (village !== 'All villages' && !r.village.toLowerCase().includes(village.toLowerCase())) return false;
        if (local !== 'All localities') {
          const loc = `${r.block} ${r.city} ${r.constituency}`.toLowerCase();
          if (!loc.includes(local.toLowerCase())) return false;
        }
        return true;
      });

      // Score relevance across all text fields
      const scored = filtered.map((r: any) => {
        const text = `${r.id} ${r.title} ${r.village} ${r.city} ${r.block} ${r.constituency} ${r.category} ${r.mp} ${r.state} ${r.agency}`.toLowerCase();
        let score = 0;
        for (const term of terms) {
          if (text.includes(term)) score += 10;
        }
        if (query.toLowerCase().includes(r.id.toLowerCase())) score += 50;
        return { ...r, score, similarity: Math.min(1, score / 40) };
      });

      const matches = scored.filter((s: any) => s.score > 0);
      matches.sort((a: any, b: any) => b.score - a.score || b.allocation - a.allocation);
      retrievedWorks = (matches.length > 0 ? matches : filtered).slice(0, 15);
      retrievalSource = 'hybrid_local';
    }

    // Calculate deterministic numerical aggregates
    const totalAllocation = retrievedWorks.reduce((sum, w) => sum + (w.allocation || 0), 0);
    const completedCount = retrievedWorks.filter(w => w.status === 'Completed').length;
    const pendingApprovalCount = retrievedWorks.filter(w => w.approval === 'Action Pending').length;

    // 3. Synthesize response with Google Gemini
    let aiAnswer = '';
    let confidence = 0.96;

    if (geminiKey && !geminiKey.includes('your_gemini')) {
      const systemPrompt = `You are an analytical assistant for India's MPLADS development monitor.
Provide an accurate, concise response based strictly on the retrieved records below.

Rules:
1. State facts directly supported by the records. Never invent figures or extrapolate.
2. Format amounts clearly in Indian Rupees (e.g. ₹15,00,000 or ₹1.5 Crore).
3. Cite specific WORK_IDs and MP names.
4. Do NOT use em dashes (—). Use clean hyphens (-) or bullet points.
5. Keep answers minimal, professional, and free of conversational filler.

Context Records (${retrievedWorks.length} works found, Total Allocation: ₹${totalAllocation.toLocaleString('en-IN')}):
${JSON.stringify(retrievedWorks.slice(0, 12), null, 2)}
`;

      // Dynamic model resolution with fallback chain
      const configuredModel = process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';
      const candidateModels = [
        configuredModel,
        'gemini-1.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-pro'
      ].filter((v, i, a) => a.indexOf(v) === i);

      for (const model of candidateModels) {
        try {
          const genRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: `${systemPrompt}\n\nUser Question: ${query}` }]
                  }
                ],
                generationConfig: {
                  temperature: 0.1,
                  topP: 0.8,
                  maxOutputTokens: 1024
                }
              })
            }
          );

          if (genRes.ok) {
            const genData = (await genRes.json()) as any;
            let rawText = genData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (rawText) {
              // Strip em dashes (—) and en dashes (–) into clean hyphens
              rawText = rawText.replace(/—/g, ' - ').replace(/–/g, '-');
              aiAnswer = rawText.trim();
              console.log(`[RAG] Successfully synthesized response using model: ${model}`);
              break;
            }
          } else {
            const errText = await genRes.text();
            console.warn(`[RAG] Model ${model} generation returned ${genRes.status}:`, errText);
          }
        } catch (err) {
          console.warn(`[RAG] Error calling model ${model}:`, err);
        }
      }
    }

    // Fallback deterministic synthesis if API key is not yet configured
    if (!aiAnswer) {
      if (retrievedWorks.length === 0) {
        aiAnswer = `No specific works matching "${query}" were found under the current filters (${state}, ${local}, ${village}). Please broaden your filters or try a different locality or MP name.`;
        confidence = 0.85;
      } else {
        const top = retrievedWorks[0];
        aiAnswer = `**Analytical Summary for "${query}"**\n\n` +
          `• **Records Identified:** ${retrievedWorks.length} works matching your criteria across **${state}**.\n` +
          `• **Total Allocation:** ₹${totalAllocation.toLocaleString('en-IN')} allocated across these initiatives.\n` +
          `• **Execution Status:** ${completedCount} works completed, ${pendingApprovalCount} pending IDA administrative approval.\n` +
          `• **Primary Work Identified:** Work ID \`${top.id}\` recommended by **${top.mp}** (${top.village || top.city || top.block || 'Local area'}), with an allocation of ₹${top.allocation.toLocaleString('en-IN')} (Status: ${top.status}).`;
      }
    }

    return NextResponse.json({
      answer: aiAnswer,
      citations: retrievedWorks.map(w => ({
        id: w.id,
        title: w.title,
        mp: w.mp,
        state: w.state,
        village: w.village || w.city || w.block || 'Local Area',
        allocation: w.allocation,
        status: w.status,
        approval: w.approval
      })),
      summary: {
        totalWorks: retrievedWorks.length,
        totalAllocation,
        completedCount,
        pendingApprovalCount
      },
      retrievalSource,
      confidence
    });
  } catch (err: any) {
    console.error('RAG Route Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

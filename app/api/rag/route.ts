import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Cached in-memory datasets for sub-millisecond response latency
let cachedWorks: any[] | null = null;
let cachedMpLimits: any[] | null = null;
let cachedGrandTotal: any = null;

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
        return cachedWorks || [];
      }
    } catch (err) {
      console.error('[RAG] Failed to fetch data from bundle URL:', err);
    }
  }

  return cachedWorks || [];
}

async function loadMpAllocatedLimits(supabase: any, reqUrl?: string) {
  if (cachedMpLimits && cachedMpLimits.length > 0) return cachedMpLimits;

  // 1. Try Supabase Table: mp_allocated_limits
  try {
    const { data, error } = await supabase
      .from('mp_allocated_limits')
      .select('*')
      .order('sr_no', { ascending: true });

    if (!error && data && data.length > 0) {
      cachedMpLimits = data;
      console.log(`[RAG] Loaded ${data.length} MP limits from Supabase table.`);
      return cachedMpLimits;
    }
  } catch (err) {
    console.warn('[RAG] Supabase mp_allocated_limits query skipped/failed, using fallback store:', err);
  }

  // 2. Try Local File: public/data/mp-allocated-limits.json
  const candidates = [
    path.resolve(process.cwd(), 'public/data/mp-allocated-limits.json'),
    path.resolve(process.cwd(), 'Nirmaan-Watch-Source/public/data/mp-allocated-limits.json'),
    'C:/Users/dm790/OneDrive/Desktop/mplads new project 2026/Nirmaan-Watch-Source/public/data/mp-allocated-limits.json'
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
        cachedMpLimits = raw.records || [];
        cachedGrandTotal = raw.grandTotal || null;
        if (cachedMpLimits && cachedMpLimits.length > 0) {
          console.log(`[RAG] Loaded ${cachedMpLimits.length} MP limits from local json.`);
          return cachedMpLimits;
        }
      } catch (err) {
        console.warn('fs read mp limits failed:', err);
      }
    }
  }

  // 3. Fallback: Fetch via URL
  if (reqUrl) {
    try {
      const dataUrl = new URL('/data/mp-allocated-limits.json', reqUrl).toString();
      const res = await fetch(dataUrl);
      if (res.ok) {
        const raw = (await res.json()) as any;
        cachedMpLimits = raw.records || [];
        cachedGrandTotal = raw.grandTotal || null;
        return cachedMpLimits || [];
      }
    } catch (err) {
      console.error('[RAG] Failed to fetch MP limits from bundle URL:', err);
    }
  }

  return cachedMpLimits || [];
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
            if (val.includes('#')) val = val.split('#')[0].trim();
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

    // 1. Load Datasets
    const [allWorks, allMpLimits] = await Promise.all([
      loadLocalWorks(req.url),
      loadMpAllocatedLimits(supabase, req.url)
    ]);

    let retrievedWorks: any[] = [];
    let retrievalSource: 'supabase_vector' | 'hybrid_local' = 'hybrid_local';

    // 2. Attempt Supabase Vector Retrieval if Gemini Key is available
    if (geminiKey && !geminiKey.includes('your_gemini')) {
      try {
        const embRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/gemini-embedding-001',
              content: { parts: [{ text: query }] }
            })
          }
        );

        if (embRes.ok) {
          const embData = (await embRes.json()) as any;
          const queryEmbedding = embData.embedding?.values;

          if (queryEmbedding && (queryEmbedding.length === 768 || queryEmbedding.length === 3072)) {
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
        console.warn('Supabase vector query skipped/failed, using hybrid store:', err);
      }
    }

    // 3. Stopwords & Term Extraction
    const stopWords = new Set([
      'in', 'on', 'at', 'the', 'of', 'and', 'for', 'to', 'with', 'by', 
      'works', 'projects', 'all', 'any', 'show', 'find', 'get', 'list', 
      'what', 'who', 'how', 'much', 'tell', 'me', 'about', 'fund', 'funds', 
      'allocation', 'allocations', 'detail', 'details', 'give', 'explain', 
      'info', 'information', 'limit', 'limits', 'status', 'please', 'honble', 
      'hon', 'mp', 'mps', 'parliament', 'constituency'
    ]);
    const terms = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t: string) => t.length > 2 && !stopWords.has(t));

    // 4. Retrieve Relevant MP Allocated Limits
    // Match against MP Name, Constituency, State, or general quota queries
    let relevantMpLimits: any[] = [];
    const lowerQuery = query.toLowerCase();
    const isLimitQuery = /limit|quota|allocated|fund|ceiling|budget|money|highest|crore|mp|parliament/i.test(lowerQuery);

    if (allMpLimits && allMpLimits.length > 0) {
      const scoredMp = allMpLimits.map((m: any) => {
        let score = 0;
        const mpLower = m.mp_name.toLowerCase();
        const constLower = m.constituency.toLowerCase();
        const stateLower = m.state.toLowerCase();

        // Exact / partial MP match
        if (mp !== 'All MPs' && mpLower.includes(mp.toLowerCase())) score += 60;
        if (lowerQuery.includes(mpLower)) score += 50;
        else {
          const mpParts = mpLower.split(/\s+/).filter((p: string) => p.length > 2);
          for (const p of mpParts) {
            if (lowerQuery.includes(p)) score += 15;
          }
        }

        // Constituency match
        if (lowerQuery.includes(constLower)) score += 30;

        // State match (only small booster)
        if (state !== 'All states' && stateLower === state.toLowerCase()) {
          score += 5;
        } else if (lowerQuery.includes(stateLower)) {
          score += 3;
        }

        return { ...m, matchScore: score };
      });

      // If user asks about highest / top allocated limits
      if (/highest|top|most|maximum/i.test(lowerQuery)) {
        let pool = scoredMp;
        if (state !== 'All states') {
          pool = pool.filter((m: any) => m.state.toLowerCase() === state.toLowerCase());
        }
        pool.sort((a: any, b: any) => b.allocated_amount - a.allocated_amount);
        relevantMpLimits = pool.slice(0, 4);
      } else {
        const strongMatches = scoredMp.filter((m: any) => m.matchScore >= 25);
        if (strongMatches.length > 0) {
          strongMatches.sort((a: any, b: any) => b.matchScore - a.matchScore);
          relevantMpLimits = strongMatches.slice(0, 1);
        } else {
          const matches = scoredMp.filter((m: any) => m.matchScore > 0);
          matches.sort((a: any, b: any) => b.matchScore - a.matchScore || b.allocated_amount - a.allocated_amount);
          if (matches.length > 0) {
            relevantMpLimits = matches.slice(0, 3);
          } else if (state !== 'All states' && isLimitQuery) {
            relevantMpLimits = allMpLimits
              .filter((m: any) => m.state.toLowerCase() === state.toLowerCase())
              .slice(0, 3);
          }
        }
      }
    }

    // Check if the query specifically targets a single MP
    const targetedMpName = (relevantMpLimits.length === 1 && relevantMpLimits[0].matchScore >= 25)
      ? relevantMpLimits[0].mp_name.toLowerCase()
      : (mp !== 'All MPs' ? mp.toLowerCase() : null);

    // 5. Hybrid Works Search if vector query didn't return matches
    if (retrievedWorks.length === 0) {
      const filtered = allWorks.filter((r: any) => {
        if (state !== 'All states' && r.state.toLowerCase() !== state.toLowerCase()) return false;
        if (targetedMpName) {
          // If searching for a specific MP, ONLY consider works belonging to this MP
          const rMp = r.mp.toLowerCase();
          const targetParts = targetedMpName.split(/\s+/).filter(p => p.length > 2);
          const hasOverlap = targetParts.some(p => rMp.includes(p));
          if (!hasOverlap) return false;
        } else if (mp !== 'All MPs' && !r.mp.toLowerCase().includes(mp.toLowerCase())) {
          return false;
        }
        if (village !== 'All villages' && !r.village.toLowerCase().includes(village.toLowerCase())) return false;
        if (local !== 'All localities') {
          const loc = `${r.block} ${r.city} ${r.constituency}`.toLowerCase();
          if (!loc.includes(local.toLowerCase())) return false;
        }
        return true;
      });

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

      if (targetedMpName) {
        retrievedWorks = matches.slice(0, 10);
      } else if (terms.length > 0) {
        retrievedWorks = matches.slice(0, 10);
      } else {
        retrievedWorks = filtered.slice(0, 10);
      }
      retrievalSource = 'hybrid_local';
    }

    // Deterministic Numerical Aggregates
    const totalAllocation = retrievedWorks.reduce((sum, w) => sum + (w.allocation || 0), 0);
    const completedCount = retrievedWorks.filter(w => w.status === 'Completed').length;
    const pendingApprovalCount = retrievedWorks.filter(w => w.approval === 'Action Pending').length;

    // 5. Synthesize AI Response with Google Gemini
    let aiAnswer = '';
    let confidence = 0.96;

    if (geminiKey && !geminiKey.includes('your_gemini')) {
      const mpLimitsContext = relevantMpLimits.length > 0 
        ? `\nOfficial Hon'ble MP Allocated Limits (Source: "Allocated Limit for Honble MPs" registry):\n${JSON.stringify(relevantMpLimits.map(m => ({
            mp_name: m.mp_name,
            constituency: m.constituency,
            state: m.state,
            allocated_limit_inr: m.allocated_amount_inr || `₹${m.allocated_amount.toLocaleString('en-IN')}`,
            allocated_crores: `₹${m.allocated_crores} Cr`
          })), null, 2)}\n(Note: Total All-India Central Allocation for 543 Lok Sabha MPs is ₹83,339,905,622 (~₹8,334 Cr))\n`
        : '';

      const systemPrompt = `You are the lead analytical assistant for India's Nirmaan MPLADS development monitor.
Provide an authoritative, clean, and concise response grounded directly on the official records below.

Formatting Guidelines:
1. State facts directly supported by the data. Never invent or extrapolate figures.
2. Clearly present the official Hon'ble MP Allocated Limit (in Crores and INR) when asking about an MP or quota.
3. If an MP has no recommended project works in the provided project records, state: "No project works are currently recorded in the registry for this MP." Do NOT cite unrelated projects.
4. Format amounts clearly in Indian Rupees (e.g. ₹19.03 Crore or ₹14,70,000).
5. Do NOT output markdown symbol clutter such as "* **Label:**". Use clean, direct presentation:
   - Hon'ble MP: [Name]
   - Constituency: [Constituency], [State]
   - Official Allocated Limit: [Amount]
6. Keep answers structured, professional, and free of conversational filler.
${mpLimitsContext}
MPLADS Project Works (${retrievedWorks.length} works found, Total Sanctioned: ₹${totalAllocation.toLocaleString('en-IN')}):
${JSON.stringify(retrievedWorks.slice(0, 10), null, 2)}
`;

      const candidateModels = [
        'gemini-flash-latest',
        'gemini-3.8-flash',
        'gemini-3-flash-preview',
        'gemini-pro-latest'
      ];

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
              rawText = rawText
                .replace(/—/g, ' - ')
                .replace(/–/g, '-')
                .replace(/^\s*\*\s+\*\*(.+?):\*\*/gm, '- $1:')
                .replace(/^\s*\*\s+/gm, '- ')
                .trim();
              aiAnswer = rawText;
              console.log(`[RAG] Successfully synthesized response using model: ${model}`);
              break;
            }
          } else {
            const errText = await genRes.text();
            console.warn(`[RAG] Model ${model} generation returned ${genRes.status}:`, errText.slice(0, 120));
          }
        } catch (err) {
          console.warn(`[RAG] Error calling model ${model}:`, err);
        }
      }
    }

    // 6. Fallback Deterministic Synthesis
    if (!aiAnswer) {
      if (relevantMpLimits.length > 0 && retrievedWorks.length === 0) {
        const topMp = relevantMpLimits[0];
        aiAnswer = `Official MP Allocation Details for "${query}"\n\n` +
          `- Hon'ble MP: ${topMp.mp_name}\n` +
          `- Constituency: ${topMp.constituency}, ${topMp.state}\n` +
          `- Official Allocated Limit: ${topMp.allocated_amount_inr || '₹' + topMp.allocated_amount.toLocaleString('en-IN')} (₹${topMp.allocated_crores} Crore)\n\n` +
          `Project Works Status:\n` +
          `No project works are currently recorded in the registry for this MP.\n\n` +
          `National Context:\n` +
          `Under Government of India MPLADS guidelines, total Lok Sabha allocation stands at ₹8,333.99 Crore across 543 MPs.`;
        confidence = 0.95;
      } else if (retrievedWorks.length === 0) {
        aiAnswer = `No specific records matching "${query}" were found under current filters (${state}, ${local}, ${village}). Please broaden your filters or try a different locality or MP name.`;
        confidence = 0.85;
      } else {
        const top = retrievedWorks[0];
        const mpLimitInfo = relevantMpLimits.length > 0
          ? `\n- Official MP Allocated Limit: ${relevantMpLimits[0].mp_name} has an official entitlement limit of ${relevantMpLimits[0].allocated_amount_inr || '₹' + relevantMpLimits[0].allocated_amount.toLocaleString('en-IN')} (₹${relevantMpLimits[0].allocated_crores} Cr).`
          : '';

        aiAnswer = `Analytical Summary for "${query}"\n\n` +
          `- Records Identified: ${retrievedWorks.length} works matching your criteria across ${state}.\n` +
          `- Total Sanctioned: ₹${totalAllocation.toLocaleString('en-IN')} allocated across these initiatives.\n` +
          `- Execution Status: ${completedCount} works completed, ${pendingApprovalCount} pending IDA administrative approval.\n` +
          `- Primary Work Identified: Work ID ${top.id} recommended by ${top.mp} (${top.village || top.city || top.block || 'Local area'}), with an allocation of ₹${top.allocation.toLocaleString('en-IN')} (Status: ${top.status}).` +
          mpLimitInfo;
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
      mpAllocations: relevantMpLimits.map(m => ({
        sr_no: m.sr_no,
        mp_name: m.mp_name,
        constituency: m.constituency,
        state: m.state,
        allocated_amount: m.allocated_amount,
        allocated_crores: m.allocated_crores,
        allocated_amount_inr: m.allocated_amount_inr || `₹${m.allocated_amount.toLocaleString('en-IN')}`
      })),
      summary: {
        totalWorks: retrievedWorks.length,
        totalAllocation,
        completedCount,
        pendingApprovalCount,
        matchingMpCount: relevantMpLimits.length
      },
      retrievalSource,
      confidence
    });
  } catch (err: any) {
    console.error('RAG Route Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

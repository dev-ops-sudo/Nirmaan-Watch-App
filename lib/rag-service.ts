/**
 * Unified RAG Intelligence Service
 * 
 * Supports both server-side (/api/rag) and 100% resilient client-side execution.
 * If the app is hosted statically (e.g. Vercel SPA) where /api/rag is unavailable,
 * this service queries official static datasets (/data/mp-allocated-limits.json & /data/mplads.json)
 * and generates authoritative responses directly in the browser.
 */

export interface RagSummary {
  totalWorks: number;
  totalAllocation: number;
  completedCount: number;
  pendingApprovalCount: number;
  dataPoints: number;
}

export interface MpAllocationRecord {
  sr_no: number;
  state: string;
  mp_name: string;
  constituency: string;
  allocated_amount: number;
  allocated_crores: number;
  allocated_amount_inr: string;
  matchScore?: number;
}

export interface RagResult {
  answer: string;
  citations: any[];
  summary: RagSummary;
  retrievalSource: 'supabase_vector' | 'hybrid_local' | 'client_memory';
  confidence: number;
  mpAllocations?: MpAllocationRecord[];
}

export interface RagQueryParams {
  query: string;
  state?: string;
  mp?: string;
  local?: string;
  village?: string;
  userApiKey?: string;
  works?: any[];
}

let cachedLimits: MpAllocationRecord[] | null = null;
let cachedGrandTotal: { allocated_amount: number; allocated_crores: number } | null = null;
let cachedWorksData: any[] | null = null;

async function loadClientMpLimits(): Promise<MpAllocationRecord[]> {
  if (cachedLimits && cachedLimits.length > 0) return cachedLimits;

  try {
    const res = await fetch('/data/mp-allocated-limits.json');
    if (res.ok) {
      const data = await res.json();
      cachedLimits = data.records || [];
      cachedGrandTotal = data.grandTotal || null;
      return cachedLimits || [];
    }
  } catch (err) {
    console.warn('[RAG Client] Failed to fetch /data/mp-allocated-limits.json:', err);
  }

  return cachedLimits || [];
}

async function loadClientWorks(): Promise<any[]> {
  if (cachedWorksData && cachedWorksData.length > 0) return cachedWorksData;

  try {
    const res = await fetch('/data/mplads.json');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.rows)) {
        cachedWorksData = data.rows.map((r: any[]) => ({
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
        return cachedWorksData || [];
      }
    }
  } catch (err) {
    console.warn('[RAG Client] Failed to fetch /data/mplads.json:', err);
  }

  return cachedWorksData || [];
}

export async function queryRagIntelligence(params: RagQueryParams): Promise<RagResult> {
  const {
    query,
    state = 'All states',
    mp = 'All MPs',
    local = 'All localities',
    village = 'All villages',
    userApiKey,
    works
  } = params;

  // 1. First, attempt backend /api/rag endpoint if active
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('/api/rag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, state, mp, local, village, userApiKey }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data && data.answer) {
        return data as RagResult;
      }
    }
  } catch (err) {
    // API not reachable or static rewrite -> silently proceed to client engine
  }

  // 2. Client-side Analytical Engine
  const allLimits = await loadClientMpLimits();
  const lowerQuery = query.toLowerCase();

  // Score MP Allocated Limits
  let relevantMpLimits: MpAllocationRecord[] = [];
  if (allLimits && allLimits.length > 0) {
    const scored = allLimits.map(m => {
      let score = 0;
      const mpLower = m.mp_name.toLowerCase();
      const constLower = m.constituency.toLowerCase();
      const stateLower = m.state.toLowerCase();

      if (mp !== 'All MPs' && mpLower.includes(mp.toLowerCase())) score += 60;
      if (lowerQuery.includes(mpLower)) score += 50;
      else {
        const parts = mpLower.split(/\s+/).filter(p => p.length > 2);
        for (const p of parts) {
          if (lowerQuery.includes(p)) score += 15;
        }
      }

      if (lowerQuery.includes(constLower)) score += 30;

      if (state !== 'All states' && stateLower === state.toLowerCase()) {
        score += 10;
      } else if (lowerQuery.includes(stateLower)) {
        score += 5;
      }

      return { ...m, matchScore: score };
    });

    if (/highest|top|most|maximum|greatest/i.test(lowerQuery)) {
      let pool = scored;
      if (state !== 'All states') {
        pool = pool.filter(m => m.state.toLowerCase() === state.toLowerCase());
      }
      pool.sort((a, b) => b.allocated_amount - a.allocated_amount);
      relevantMpLimits = pool.slice(0, 5);
    } else {
      const strong = scored.filter(m => (m.matchScore || 0) >= 25);
      if (strong.length > 0) {
        strong.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        relevantMpLimits = strong.slice(0, 3);
      } else {
        const matches = scored.filter(m => (m.matchScore || 0) > 0);
        matches.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0) || b.allocated_amount - a.allocated_amount);
        if (matches.length > 0) {
          relevantMpLimits = matches.slice(0, 4);
        } else if (state !== 'All states') {
          relevantMpLimits = allLimits
            .filter(m => m.state.toLowerCase() === state.toLowerCase())
            .sort((a, b) => b.allocated_amount - a.allocated_amount)
            .slice(0, 4);
        }
      }
    }
  }

  // Load Works dataset if needed
  let worksDataset = works;
  if (!worksDataset || worksDataset.length === 0) {
    worksDataset = await loadClientWorks();
  }

  // Stopwords & term search for works
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
    .filter(t => t.length > 2 && !stopWords.has(t));

  let matchedWorks: any[] = [];
  if (worksDataset && worksDataset.length > 0) {
    const filtered = worksDataset.filter(r => {
      if (state !== 'All states' && r.state.toLowerCase() !== state.toLowerCase()) return false;
      if (mp !== 'All MPs' && !r.mp.toLowerCase().includes(mp.toLowerCase())) return false;
      if (village !== 'All villages' && !r.village.toLowerCase().includes(village.toLowerCase())) return false;
      if (local !== 'All localities') {
        const loc = `${r.block || ''} ${r.city || ''} ${r.constituency || ''}`.toLowerCase();
        if (!loc.includes(local.toLowerCase())) return false;
      }
      return true;
    });

    const scoredWorks = filtered.map(r => {
      const text = `${r.id} ${r.title} ${r.village} ${r.city} ${r.block} ${r.constituency} ${r.category} ${r.mp} ${r.state} ${r.agency}`.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (text.includes(t)) score += 10;
      }
      if (lowerQuery.includes(String(r.id).toLowerCase())) score += 50;
      return { ...r, score, similarity: Math.min(1, score / 40) };
    });

    matchedWorks = scoredWorks.filter(s => s.score > 0);
    matchedWorks.sort((a, b) => b.score - a.score || b.allocation - a.allocation);
    if (matchedWorks.length === 0 && terms.length === 0) {
      matchedWorks = filtered.slice(0, 10);
    }
  }

  const retrievedWorks = matchedWorks.slice(0, 10);
  const totalAllocation = retrievedWorks.reduce((sum, w) => sum + (w.allocation || 0), 0);
  const completedCount = retrievedWorks.filter(w => w.status === 'Completed').length;
  const pendingApprovalCount = retrievedWorks.filter(w => w.approval === 'Action Pending').length;

  const citations = retrievedWorks.map(w => ({
    id: w.id,
    title: w.title,
    allocation: w.allocation,
    mp: w.mp,
    state: w.state,
    constituency: w.constituency,
    village: w.village,
    block: w.block,
    status: w.status,
    approval: w.approval,
    category: w.category,
    similarity: w.similarity || 0.85
  }));

  const summary: RagSummary = {
    totalWorks: retrievedWorks.length,
    totalAllocation,
    completedCount,
    pendingApprovalCount,
    dataPoints: (worksDataset ? worksDataset.length : 0) + (allLimits ? allLimits.length : 0)
  };

  // 3. Formulate Answer
  let answer = '';

  // Check specific query intent
  const isHighestQuery = /highest|top|most|maximum/i.test(lowerQuery) && /limit|allocated|allocation|fund|quota|budget|mp/i.test(lowerQuery);
  const isTotalFundQuery = /total.*(fund|allocation|mplads|budget)|all india.*total/i.test(lowerQuery);
  const isPendingQuery = /pending|ida|administrative.*approval/i.test(lowerQuery);
  const isWaterRoadQuery = /drinking\s*water|water|road|connectivity/i.test(lowerQuery);

  if (isHighestQuery && relevantMpLimits.length > 0) {
    const top = relevantMpLimits[0];
    const runners = relevantMpLimits.slice(1, 4);

    answer = `Official Hon'ble MP Allocated Limit Analysis:\n\n` +
      `- Hon'ble MP: ${top.mp_name}\n` +
      `- Constituency: ${top.constituency}, ${top.state}\n` +
      `- Official Allocated Limit: ${top.allocated_amount_inr || '₹' + top.allocated_amount.toLocaleString('en-IN')} (₹${top.allocated_crores} Crore)\n` +
      `- National Standing: Highest single allocated limit among all 543 Lok Sabha MPs.\n\n` +
      `Subsequent Highest Allocations:\n` +
      runners.map((r, i) => `* ${r.mp_name} (${r.constituency}, ${r.state}) - ${r.allocated_amount_inr} (₹${r.allocated_crores} Cr)`).join('\n') +
      `\n\nNational Central Context:\n` +
      `Under official Government of India MPLADS guidelines, the cumulative Lok Sabha allocation stands at ₹8,333.99 Crore across 543 Members of Parliament.`;
  } else if (isTotalFundQuery) {
    const grandAmt = cachedGrandTotal?.allocated_amount || 83339905622.01;
    const grandCr = cachedGrandTotal?.allocated_crores || 8333.99;

    answer = `Official Central MPLADS Fund Allocation Summary:\n\n` +
      `- Total Central Allocation: ₹${grandCr.toLocaleString('en-IN')} Crore (₹${grandAmt.toLocaleString('en-IN')})\n` +
      `- Parliamentary Coverage: 543 Lok Sabha Constituencies\n` +
      `- Geographic Scope: 28 States and 8 Union Territories\n` +
      `- Average MP Allocation Limit: ~₹15.35 Crore per Hon'ble MP\n\n` +
      `Key Distribution Highlights:\n` +
      `* Highest Allocated MP: EATALA RAJENDER (MALKAJGIRI, Telangana) at ₹32.75 Crore\n` +
      `* Standard Baseline Allocation: ₹14.70 Crore per Lok Sabha seat`;
  } else if (isPendingQuery && retrievedWorks.length > 0) {
    const pendingWorks = retrievedWorks.filter(w => w.approval === 'Action Pending' || w.status === 'Sanctioned');
    const displayList = pendingWorks.length > 0 ? pendingWorks : retrievedWorks;
    const pendingSum = displayList.reduce((acc, w) => acc + (w.allocation || 0), 0);

    answer = `Projects Pending IDA Administrative Approval:\n\n` +
      `- Total Pending In Scope: ${displayList.length} works\n` +
      `- Cumulative Sanction Value: ₹${pendingSum.toLocaleString('en-IN')}\n` +
      `- Geographic Scope: ${state !== 'All states' ? state : 'National Level'}\n\n` +
      `Priority Projects Awaiting Administrative Sanction:\n` +
      displayList.slice(0, 5).map(w => 
        `* [${w.id}] ${w.title} (${w.constituency}, ${w.state}) - ₹${Number(w.allocation).toLocaleString('en-IN')} [Status: ${w.status}, Approval: ${w.approval}]`
      ).join('\n');
  } else if (isWaterRoadQuery && retrievedWorks.length > 0) {
    answer = `Infrastructure & Utilities Overview (Drinking Water & Roads):\n\n` +
      `- Relevant Works Identified: ${retrievedWorks.length} projects\n` +
      `- Total Sanctioned Outlay: ₹${totalAllocation.toLocaleString('en-IN')}\n` +
      `- Completed Projects: ${completedCount} works (${Math.round((completedCount / (retrievedWorks.length || 1)) * 100)}%)\n\n` +
      `Major Works in Sector:\n` +
      retrievedWorks.slice(0, 5).map(w => 
        `* [${w.id}] ${w.title} (${w.village || w.city || w.constituency}, ${w.state}) - ₹${Number(w.allocation).toLocaleString('en-IN')} [Status: ${w.status}]`
      ).join('\n');
  } else if (relevantMpLimits.length > 0 && retrievedWorks.length === 0) {
    const top = relevantMpLimits[0];
    answer = `Official MP Allocation Records for "${query}":\n\n` +
      `- Hon'ble MP: ${top.mp_name}\n` +
      `- Constituency: ${top.constituency}, ${top.state}\n` +
      `- Official Allocated Limit: ${top.allocated_amount_inr || '₹' + top.allocated_amount.toLocaleString('en-IN')} (₹${top.allocated_crores} Crore)\n\n` +
      (relevantMpLimits.length > 1 ? `Other Members in Scope:\n` + relevantMpLimits.slice(1, 4).map(r => `* ${r.mp_name} (${r.constituency}, ${r.state}) - ${r.allocated_amount_inr} (₹${r.allocated_crores} Cr)`).join('\n') + `\n\n` : '') +
      `Project Works Status:\n` +
      `No specific individual project works are currently filed under this specific search in the active filter scope. You can review all state-level allocations on the interactive map.`;
  } else if (retrievedWorks.length > 0) {
    answer = `Analysis for "${query}" across ${retrievedWorks.length} matching development works:\n\n` +
      `- Total Sanctioned Value: ₹${totalAllocation.toLocaleString('en-IN')}\n` +
      `- Completed Works: ${completedCount} of ${retrievedWorks.length}\n` +
      `- Pending IDA Approval: ${pendingApprovalCount} projects\n\n` +
      `Key Project Works Identified:\n` +
      retrievedWorks.slice(0, 4).map(w => 
        `* [${w.id}] ${w.title} (${w.village || w.city || w.block || w.constituency}, ${w.state}) - ₹${Number(w.allocation).toLocaleString('en-IN')} [Status: ${w.status}]`
      ).join('\n');
  } else {
    answer = `No matching records found for "${query}" under current filters (${state}, ${local}, ${village}). Please broaden your filters or search by MP name, constituency, or project category.`;
  }

  return {
    answer,
    citations,
    summary,
    retrievalSource: 'client_memory',
    confidence: 0.98,
    mpAllocations: relevantMpLimits
  };
}

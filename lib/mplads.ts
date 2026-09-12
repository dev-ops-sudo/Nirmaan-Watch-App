export const columns = ['WORK_ID','MP_NAME','HOUSE','STATE','CONSTITUENCY','CITY','WARD','BLOCK','VILLAGE','WORK_CATEGORY','WORK_DESCRIPTION','IMPLEMENTING_AUTHORITY','RECOMMENDED_DATE','IDA_APPROVAL','ALLOCATION_AMOUNT','STATUS'] as const;

export type Work = {
  id: string;
  mp: string;
  house: string;
  state: string;
  constituency: string;
  city: string;
  ward: string;
  block: string;
  village: string;
  category: string;
  title: string;
  agency: string;
  recommended: string;
  approval: string;
  allocation: number;
  status: string;
  file: string;
  line: number;
  raw: string[];
  search: string;
};

export type Manifest = {
  source: string;
  recordCount: number;
  allocationTotal: string;
  recommendedFrom: string;
  recommendedTo: string;
  missingStatus: number;
  files: { name: string; state: string; rows: number; sha256: string }[];
  statusCounts: Record<string, number>;
};

export function decodeRows(rows: (string | number)[][]): Work[] {
  return rows.map(row => {
    const raw = row.slice(0, 16).map(String);
    const r = raw.map(s => s.trim());
    return {
      id: r[0],
      mp: r[1],
      house: r[2],
      state: r[3],
      constituency: r[4],
      city: r[5],
      ward: r[6],
      block: r[7],
      village: r[8],
      category: r[9],
      title: r[10],
      agency: r[11],
      recommended: r[12],
      approval: r[13],
      allocation: Number(r[14]) || 0,
      status: r[15] || 'Not reported',
      file: String(row[16] || ''),
      line: Number(row[17] || 0),
      raw,
      search: r.join(' ').toLocaleLowerCase()
    };
  });
}

export type Filters = {
  search: string;
  state: string;
  status: string;
  approval: string;
  house: string;
  mp: string;
  category: string;
  local: string;
  village: string;
  mpSearch: string;
  villageSearch: string;
  from: string;
  to: string;
};

export const emptyFilters: Filters = {
  search: '',
  state: 'All states',
  status: 'All statuses',
  approval: 'All approvals',
  house: 'All houses',
  mp: 'All MPs',
  category: 'All categories',
  local: 'All localities',
  village: 'All villages',
  mpSearch: '',
  villageSearch: '',
  from: '',
  to: ''
};

export function filterWorks(rows: Work[], f: Filters): Work[] {
  const terms = f.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const mpTerm = f.mpSearch.trim().toLocaleLowerCase();
  const villageTerm = f.villageSearch.trim().toLocaleLowerCase();

  return rows.filter(r => {
    if (f.state !== 'All states' && r.state !== f.state) return false;
    if (f.status !== 'All statuses' && r.status !== f.status) return false;
    if (f.approval !== 'All approvals' && r.approval !== f.approval) return false;
    if (f.house !== 'All houses' && r.house !== f.house) return false;
    if (f.mp !== 'All MPs' && r.mp !== f.mp) return false;
    if (f.category !== 'All categories' && r.category !== f.category) return false;
    if (f.local !== 'All localities') {
      const loc = (r.block || r.city || r.constituency).trim();
      if (loc !== f.local) return false;
    }
    if (f.village !== 'All villages' && r.village !== f.village) return false;
    if (mpTerm && !r.mp.toLocaleLowerCase().includes(mpTerm)) return false;
    if (villageTerm) {
      const vStr = [r.village, r.city, r.ward, r.block].filter(Boolean).join(' ').toLocaleLowerCase();
      if (!vStr.includes(villageTerm)) return false;
    }
    if (f.from && r.recommended < f.from) return false;
    if (f.to && r.recommended > f.to) return false;
    if (terms.length > 0 && !terms.every(t => r.search.includes(t))) return false;
    return true;
  });
}

export function groupWorks(
  rows: Work[],
  key: 'state' | 'status' | 'approval' | 'category' | 'mp' | 'agency' | 'recommended' | 'village' | 'local'
): { name: string; count: number; allocation: number }[] {
  const groups = new Map<string, { name: string; count: number; allocation: number }>();
  for (const r of rows) {
    let name = '';
    if (key === 'recommended') {
      name = r.recommended.slice(0, 7) || 'Not reported';
    } else if (key === 'local') {
      name = r.block || r.city || r.constituency || 'Unspecified';
    } else if (key === 'village') {
      name = r.village || 'Unspecified';
    } else {
      name = r[key] || 'Not reported';
    }
    if (!name) name = 'Not reported';

    const g = groups.get(name) || { name, count: 0, allocation: 0 };
    g.count++;
    g.allocation += r.allocation;
    groups.set(name, g);
  }
  return [...groups.values()].sort((a, b) => b.allocation - a.allocation || a.name.localeCompare(b.name));
}

export function sourceCsv(rows: Work[]): string {
  const quote = (s: string) => '"' + (/^[=+@\t\r-]/.test(s) ? "'" : '') + s.replaceAll('"', '""') + '"';
  return '\uFEFF' + [columns.join(','), ...rows.map(r => r.raw.map(quote).join(','))].join('\r\n');
}

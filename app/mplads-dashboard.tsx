'use client';
import { useDeferredValue, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ArrowDownToLine, Building2, CheckCircle2, Clock, Database, ExternalLink, IndianRupee, MapPin, Search, SlidersHorizontal, Sparkles, UserCheck, Users, X } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { compactMoney, money } from '@/lib/domain';
import { columns, decodeRows, emptyFilters, filterWorks, groupWorks, sourceCsv, type Filters, type Manifest, type Work } from '@/lib/mplads';
import { SideNav } from './dashboard';
import CivicBanner from './civic-banner';
import ProjectReviews from './project-reviews';
import ProfileModal from './profile-modal';
import CesiumGlobe from '@/components/geo/CesiumGlobe';
import WorkModal from '@/components/work-modal';
import MpDossierModal from '@/components/mp-dossier-modal';
import StateRagChat from '@/components/state-rag-chat';

function subscribeView(callback:()=>void){window.addEventListener('popstate',callback);return()=>window.removeEventListener('popstate',callback);}
function currentView(){const v=new URLSearchParams(window.location.search).get('view');return v&&titles[v]?v:'overview';}
const count=(n:number)=>n.toLocaleString('en-IN');
const titles:Record<string,string>={
  overview:'Development overview',
  projects:'Projects & works',
  map:'Geographic coverage',
  alerts:'Data review',
  contractors:'Implementing authorities',
  feedback:'Citizen feedback',
  reports:'Reports & insights',
  data:'Dataset & sources'
};

function save(name:string,body:string,type='text/csv;charset=utf-8'){
  const url=URL.createObjectURL(new Blob([body],{type}));
  const a=document.createElement('a');
  a.href=url;
  a.download=name;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function Picker({value,options,onChange,label}:{value:string;options:string[];onChange:(s:string)=>void;label:string}){
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="picker" aria-label={label}>
        <SelectValue/>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Badge({text}:{text:string}){
  return <span className={`badge ${text==='Completed'?'completed':text==='Ongoing'||text==='Sanctioned'?'ongoing':text==='Unsanctioned'||text==='Rejected by IDA'?'medium':'neutral'}`}>{text}</span>;
}

function Metric({title,value,note,icon,color}:{title:string;value:string;note:string;icon:React.ReactNode;color?:string}){
  return (
    <article className="metric flex flex-col justify-between min-h-[148px]">
      <div className="spread items-start">
        <span className="font-medium text-xs text-zinc-600 dark:text-zinc-400 leading-tight">{title}</span>
        <div className="metric-icon shrink-0" style={color ? { color } : undefined}>{icon}</div>
      </div>
      <strong className="metric-value font-mono tabular-nums tracking-tight my-2">{value}</strong>
      <p className="text-xs text-zinc-500 leading-snug line-clamp-1">{note}</p>
    </article>
  );
}

function Empty({children}:{children:React.ReactNode}){
  return <div className="blank"><Database size={28}/><h3>No matching works found</h3><p>{children}</p></div>;
}

export default function MpladsDashboard({onAdvanced,role='official',user,onLogout,onLoginRequest}:{onAdvanced:()=>void;role?:'citizen'|'official'|'guest';user?:any;onLogout?:()=>void;onLoginRequest?:()=>void}){
  const [showProfile,setShowProfile]=useState(false);
  const [selectedMpProfile,setSelectedMpProfile]=useState<string | null>(null);
  const [rows,setRows]=useState<Work[]>([]);
  const [manifest,setManifest]=useState<Manifest|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  const view=useSyncExternalStore(subscribeView,currentView,()=> 'overview');
  const [filters,setFilters]=useState<Filters>(emptyFilters);
  const [advanced,setAdvanced]=useState(false);
  const [page,setPage]=useState(1);
  const [sort,setSort]=useState('Latest recommended');
  const [selected,setSelected]=useState<Work|null>(null);
  const deferred=useDeferredValue(filters);

  useEffect(()=>{
    const abort=new AbortController();
    Promise.all([
      fetch('/data/mplads.json',{signal:abort.signal}).then(r=>{
        if(!r.ok)throw new Error('Dataset could not be loaded');
        return r.json() as Promise<{columns:string[];rows:(string|number)[][]}>;
      }),
      fetch('/data/mplads-manifest.json',{signal:abort.signal}).then(r=>{
        if(!r.ok)throw new Error('Dataset manifest could not be loaded');
        return r.json() as Promise<Manifest>;
      })
    ]).then(([data,info])=>{
      if(data.rows.length!==info.recordCount||JSON.stringify(data.columns)!==JSON.stringify(columns)){
        throw new Error('Dataset validation failed. Rebuild the bundled data.');
      }
      setRows(decodeRows(data.rows));
      setManifest(info);
    }).catch(e=>{
      if(!abort.signal.aborted)setError(e.message);
    }).finally(()=>{
      if(!abort.signal.aborted)setLoading(false);
    });
    return()=>abort.abort();
  },[attempt]);

  const filtered=useMemo(()=>filterWorks(rows,deferred),[rows,deferred]);

  const summary=useMemo(()=>{
    const totalAlloc=filtered.reduce((n,r)=>n+r.allocation,0);
    const completed=filtered.filter(r=>r.status==='Completed').length;
    const ongoing=filtered.filter(r=>r.status==='Ongoing'||r.status==='Sanctioned').length;
    const pending=filtered.filter(r=>r.approval==='Action Pending').length;
    const missing=filtered.filter(r=>r.status==='Not reported').length;
    const completionRate=filtered.length>0?((completed/filtered.length)*100).toFixed(1):'0.0';
    const avgAlloc=filtered.length>0?Math.round(totalAlloc/filtered.length):0;

    return {
      allocation:totalAlloc,
      completed,
      ongoing,
      pending,
      missing,
      completionRate,
      avgAlloc,
      mp:new Set(filtered.map(r=>r.mp)).size,
      villages:new Set(filtered.map(r=>r.village).filter(Boolean)).size,
      localities:new Set(filtered.map(r=>r.block||r.city||r.constituency).filter(Boolean)).size
    };
  },[filtered]);

  const groups=useMemo(()=>({
    states:groupWorks(filtered,'state'),
    statuses:groupWorks(filtered,'status'),
    approvals:groupWorks(filtered,'approval'),
    categories:groupWorks(filtered,'category'),
    villages:groupWorks(filtered,'village').filter(g=>g.name!=='Unspecified').slice(0,8),
    localities:groupWorks(filtered,'local').filter(g=>g.name!=='Unspecified').slice(0,8),
    months:groupWorks(filtered,'recommended').sort((a,b)=>a.name.localeCompare(b.name)),
    agencies:groupWorks(filtered,'agency'),
    mps:groupWorks(filtered,'mp')
  }),[filtered]);

  const options=useMemo(()=>{
    const stateRows=rows.filter(r=>filters.state==='All states'||r.state===filters.state);
    const localRows=stateRows.filter(r=>filters.local==='All localities'||(r.block||r.city||r.constituency)===filters.local);

    const localities=[...new Set(stateRows.map(r=>(r.block||r.city||r.constituency||'').trim()).filter(Boolean))].sort();
    const villages=[...new Set(localRows.map(r=>r.village.trim()).filter(Boolean))].slice(0,300).sort();
    const mps=[...new Set(stateRows.map(r=>r.mp.trim()).filter(Boolean))].sort();

    return {
      states:manifest?.files.map(f=>f.state).sort()||[],
      localities:['All localities',...localities],
      villages:['All villages',...villages],
      categories:['All categories',...[...new Set(rows.map(r=>r.category))].sort()],
      mps:['All MPs',...mps]
    };
  },[rows,manifest,filters.state,filters.local]);

  const sorted=useMemo(()=>[...filtered].sort((a,b)=>
    sort==='Highest allocation'?b.allocation-a.allocation||a.id.localeCompare(b.id):
    sort==='Lowest allocation'?a.allocation-b.allocation||a.id.localeCompare(b.id):
    sort==='Work ID'?a.id.localeCompare(b.id):
    b.recommended.localeCompare(a.recommended)||a.id.localeCompare(b.id)
  ),[filtered,sort]);

  const pages=Math.max(1,Math.ceil(sorted.length/50));
  const currentPage=Math.min(page,pages);
  const shown=sorted.slice((currentPage-1)*50,currentPage*50);

  function filter<K extends keyof Filters>(k:K,v:Filters[K]){
    setFilters(f=>({
      ...f,
      [k]:v,
      ...(k==='state'?{local:'All localities',village:'All villages',mp:'All MPs'}:{}),
      ...(k==='local'?{village:'All villages'}:{})
    }));
    setPage(1);
  }

  function navigate(v:string){
    setPage(1);
    window.history.replaceState(null,'',`?view=${v}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({top:0});
  }

  function reset(){
    setFilters(emptyFilters);
    setPage(1);
  }

  function table(data:Work[]){
    return data.length?(
      <div className="overflow-x-auto w-full">
        <Table className="min-w-[920px]">
          <TableHeader>
            <TableRow className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
              <TableHead className="w-[34%] min-w-[240px] font-semibold text-zinc-600 dark:text-zinc-400 text-xs py-3 pl-6">WORK / LOCATION</TableHead>
              <TableHead className="w-[20%] min-w-[170px] font-semibold text-zinc-600 dark:text-zinc-400 text-xs py-3">RECOMMENDING MP</TableHead>
              <TableHead className="w-[18%] min-w-[150px] font-semibold text-zinc-600 dark:text-zinc-400 text-xs py-3">LOCAL / VILLAGE</TableHead>
              <TableHead className="w-[10%] min-w-[100px] font-semibold text-zinc-600 dark:text-zinc-400 text-xs py-3">STATUS</TableHead>
              <TableHead className="w-[10%] min-w-[120px] font-semibold text-zinc-600 dark:text-zinc-400 text-xs py-3 text-right pr-4">ALLOCATION</TableHead>
              <TableHead className="w-[8%] min-w-[110px] font-semibold text-zinc-600 dark:text-zinc-400 text-xs py-3 text-right pr-6">RECOMMENDED</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(r=>(
              <TableRow key={r.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/60 border-b border-zinc-100 dark:border-zinc-800/60 transition-colors">
                <TableCell className="align-top py-3.5 pl-6">
                  <button className="project-link source-project-title font-medium text-zinc-900 dark:text-zinc-100 hover:text-orange-600 dark:hover:text-orange-400 transition text-left leading-snug" onClick={()=>setSelected(r)}>
                    {r.title||'Description not reported'}
                  </button>
                  <div className="secondary mt-1 text-[11px] text-zinc-500 font-mono">{r.id} · {r.category}</div>
                </TableCell>
                <TableCell className="align-top py-3.5">
                  <button
                    type="button"
                    onClick={() => setSelectedMpProfile(r.mp)}
                    className="source-mp font-semibold text-zinc-900 dark:text-zinc-100 hover:text-orange-600 dark:hover:text-orange-400 text-left transition inline-flex items-center gap-1.5 group cursor-pointer"
                    title="Open MP Analytical Dossier"
                  >
                    <span>{r.mp}</span>
                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-orange-600 transition shrink-0" />
                  </button>
                  <div className="secondary mt-1 text-xs text-zinc-500">{r.constituency} · {r.house}</div>
                </TableCell>
                <TableCell className="align-top py-3.5">
                  <div className="font-medium text-xs text-zinc-800 dark:text-zinc-200">{r.village||'Village not reported'}</div>
                  <div className="secondary mt-1 text-xs text-zinc-500">{[r.city||r.block,r.state].filter(Boolean).join(', ')}</div>
                </TableCell>
                <TableCell className="align-top py-3.5"><Badge text={r.status}/></TableCell>
                <TableCell className="align-top py-3.5 amount font-semibold font-mono text-right tabular-nums pr-4 text-zinc-900 dark:text-zinc-100">{money(r.allocation)}</TableCell>
                <TableCell className="align-top py-3.5 text-xs text-zinc-500 text-right whitespace-nowrap pr-6">{r.recommended}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    ):(
      <Empty>
        Try a different search or <button className="text-button" onClick={reset}>clear filters</button>. No works match your selection.
      </Empty>
    );
  }

  function bars(title:string,data:{name:string;count:number;allocation:number}[],byCount=false,onSelect?:(s:string)=>void){
    const max=Math.max(1,...data.map(g=>byCount?g.count:g.allocation));
    return (
      <section className="panel h-full flex flex-col justify-between mb-0">
        <div className="panel-heading">
          <h2>{title}</h2>
          <span className="secondary">{byCount?'Works Count':'Allocation (INR)'}</span>
        </div>
        <div className="source-bars flex-1 flex flex-col justify-around py-4">
          {data.length?data.map(g=>(
            <div key={g.name} className="space-y-1">
              <div className="spread text-xs">
                {onSelect?<button className="text-button truncate text-left max-w-[70%]" onClick={()=>onSelect(g.name)}>{g.name}</button>:<strong className="truncate max-w-[70%]">{g.name}</strong>}
                <span className="font-mono tabular-nums text-zinc-700 dark:text-zinc-300 font-medium shrink-0">{byCount?count(g.count):compactMoney(g.allocation)}</span>
              </div>
              <div className="budget-track h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="bg-orange-600 h-full rounded-full transition-all duration-500" style={{width:`${Math.max(2, (byCount?g.count:g.allocation)/max*100)}%`}}/>
              </div>
              <small className="secondary text-[11px] text-zinc-400 block">{count(g.count)} works{byCount?` · ${compactMoney(g.allocation)} allocated`:''}</small>
            </div>
          )):<p className="p-4 text-xs text-zinc-500">No records in this selection.</p>}
        </div>
      </section>
    );
  }

  const exportReport=()=>save(
    'mplads-filtered-analysis.json',
    JSON.stringify({
      source:manifest?.source,
      recommendationPeriod:[manifest?.recommendedFrom,manifest?.recommendedTo],
      filters:deferred,
      summary:{works:filtered.length,...summary},
      ...groups,
      definitions:{
        allocation:'ALLOCATION_AMOUNT in supplied CSV; not expenditure or independently verified sanction value',
        state:'STATE as supplied; may describe MP affiliation rather than work-site geography',
        missing:'Unknown fields are not treated as zero'
      }
    },null,2),
    'application/json'
  );

  return (
    <SidebarProvider style={{'--sidebar-width':'252px'} as React.CSSProperties}>
      <SideNav view={view} setView={navigate} alertCount={0} source role={role as any} user={user} onLogout={onLogout} onOpenProfile={()=>setShowProfile(true)}/>
      <main className="workspace source-workspace projects-workspace">
        <div className="civic-utility">
          <div>
            <strong lang="hi">सार्वजनिक निर्माण निगरानी</strong>
            <span>Code Crew · SIH prototype</span>
          </div>
          <a href="#main-content">Skip to main content ↓</a>
        </div>
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger/>
            <span className="portal-name">
              MPLADS Development Monitor
              <small lang="hi">सांसद स्थानीय क्षेत्र विकास योजना · राष्ट्रीय विश्लेषणात्मक डैशबोर्ड</small>
            </span>
          </div>
          <div className="top-actions">
            {role==='guest'?(
              <button onClick={onLoginRequest} className="button bg-orange-600 hover:bg-orange-700 text-white border-none ml-4 shadow-sm">
                Login / Sign Up
              </button>
            ):(
              <div className="flex items-center gap-2 ml-4">
                <button onClick={()=>setShowProfile(true)} className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-950 border border-orange-200 rounded-lg text-xs font-medium transition-colors" title="View Profile & Account">
                  {(user?.user_metadata?.avatar_url || user?.user_metadata?.picture)?(
                    <img src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture} alt="Avatar" className="w-5 h-5 rounded-full object-cover" />
                  ):(
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px] font-bold">
                      {user?.user_metadata?.full_name?.slice(0,1).toUpperCase()||'C'}
                    </span>
                  )}
                  <span>{user?.user_metadata?.full_name?.split(' ')[0]||'Profile'}</span>
                </button>
                {onLogout&&<button onClick={onLogout} className="button outline text-xs">Sign out</button>}
              </div>
            )}
          </div>
        </header>

        <div className="page-content relative pb-24" id="main-content" tabIndex={-1}>
          {view==='overview'&&<CivicBanner source onMap={()=>navigate('map')}/>}

          <div className="page-heading items-start">
            <div>
              <div className="eyebrow">NATIONAL MPLADS REGISTRY</div>
              <h1>{titles[view]}</h1>
              <p>State-to-local hierarchical classification, village and MP analytical register, and verified project intelligence.</p>
            </div>
            <button className="button outline shrink-0" disabled={loading||!!error} onClick={()=>save('mplads-filtered-works.csv',sourceCsv(filtered))}>
              <ArrowDownToLine size={16}/>
              Export {count(filtered.length)} works
            </button>
          </div>



          {/* Integrated State-Level AI RAG Chatbot */}
          <div className="projects-intelligence mb-6">
            <StateRagChat
              currentState={filters.state}
              onSelectWork={workId => {
                const found = rows.find(r => r.id === workId);
                if (found) setSelected(found);
              }}
            />
          </div>

          {/* Hierarchical Multi-Level Filter Toolbar */}
          <div className="projects-filters bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs mb-6" id="project-explorer">
            <div className="projects-filter-heading flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                <MapPin size={15} className="text-zinc-600 dark:text-zinc-400"/>
                <span>Geographic Scope & Entity Classification</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 font-medium">{count(filtered.length)} works in selection</span>
                <button className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 font-semibold" onClick={reset}>Reset All</button>
              </div>
            </div>

            {/* Level 1, 2, 3 Hierarchical Dropdowns */}
            <div className="projects-geography grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">State / Union Territory</label>
                <Picker label="State" value={filters.state} options={['All states',...options.states]} onChange={v=>filter('state',v)}/>
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">Local Unit (Block / City)</label>
                <Picker label="Local Unit" value={filters.local} options={options.localities} onChange={v=>filter('local',v)}/>
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">Village / Locality</label>
                <Picker label="Village" value={filters.village} options={options.villages} onChange={v=>filter('village',v)}/>
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">Recommending MP</label>
                <Picker label="Recommending MP" value={filters.mp} options={options.mps} onChange={v=>filter('mp',v)}/>
              </div>
            </div>

            {/* Dedicated Search Bars for MP Names, Village Names, and Keywords */}
            <div className="projects-searches grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
              <div>
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">Search MP Name</label>
                <div className="search-field">
                  <UserCheck size={15} className="text-zinc-400 shrink-0"/>
                  <input
                    aria-label="Search MP name"
                    placeholder="Search by MP name..."
                    value={filters.mpSearch}
                    onChange={e=>filter('mpSearch',e.target.value)}
                  />
                  {filters.mpSearch&&(
                    <button aria-label="Clear MP search" onClick={()=>filter('mpSearch','')} className="text-zinc-400 hover:text-zinc-600">
                      <X size={14}/>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">Search Village / Ward</label>
                <div className="search-field">
                  <MapPin size={15} className="text-zinc-400 shrink-0"/>
                  <input
                    aria-label="Search Village or locality name"
                    placeholder="Search village or ward..."
                    value={filters.villageSearch}
                    onChange={e=>filter('villageSearch',e.target.value)}
                  />
                  {filters.villageSearch&&(
                    <button aria-label="Clear village search" onClick={()=>filter('villageSearch','')} className="text-zinc-400 hover:text-zinc-600">
                      <X size={14}/>
                    </button>
                  )}
                </div>
              </div>

              <div className="search-field-wide sm:col-span-2 lg:col-span-2">
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">Keyword or Work ID Search</label>
                <div className="search-field">
                  <Search size={15} className="text-zinc-400 shrink-0"/>
                  <input
                    aria-label="Search all MPLADS fields"
                    placeholder="Keyword or work ID search (e.g. solar, hospital, road)..."
                    value={filters.search}
                    onChange={e=>filter('search',e.target.value)}
                  />
                  {filters.search&&(
                    <button aria-label="Clear keyword search" onClick={()=>filter('search','')} className="text-zinc-400 hover:text-zinc-600">
                      <X size={14}/>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filter Toggle for Work Status & Categories */}
            <div className="projects-filter-actions grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 items-end">
              <div>
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">Implementation Status</label>
                <Picker label="Status" value={filters.status} options={['All statuses','Unsanctioned','Sanctioned','Ongoing','Completed','Not reported']} onChange={v=>filter('status',v)}/>
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">Sector Category</label>
                <Picker label="Category" value={filters.category} options={options.categories} onChange={v=>filter('category',v)}/>
              </div>
              <div className="hidden lg:block"/>
              <div className="flex justify-end">
                <button className="button outline filter-toggle-btn text-xs font-medium w-full h-[44px] flex items-center justify-center gap-2" aria-expanded={advanced} onClick={()=>setAdvanced(!advanced)}>
                  <SlidersHorizontal size={14}/>
                  <span>{advanced?'Fewer filters':'More filters'}</span>
                </button>
              </div>
            </div>

            {advanced&&(
              <div className="source-extra-filters grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <div>
                  <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">Approval Status</label>
                  <Picker label="Approval" value={filters.approval} options={['All approvals','Action Pending','Approved by IDA','Rejected by IDA']} onChange={v=>filter('approval',v)}/>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">Parliamentary House</label>
                  <Picker label="House" value={filters.house} options={['All houses','Lok Sabha','Rajya Sabha']} onChange={v=>filter('house',v)}/>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">Recommended From</label>
                  <input aria-label="Recommended from" type="date" value={filters.from} onChange={e=>filter('from',e.target.value)}/>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">Recommended Through</label>
                  <input aria-label="Recommended through" type="date" value={filters.to} onChange={e=>filter('to',e.target.value)}/>
                </div>
              </div>
            )}
          </div>

          {filters.from&&filters.to&&filters.from>filters.to&&(
            <p role="alert" className="error-banner">The start date must be on or before the end date.</p>
          )}

          {error?<div className="error-banner" role="alert">{error} <button onClick={()=>{setLoading(true);setError('');setAttempt(n=>n+1);}}>Retry loading</button></div>:loading?(
            <section className="panel source-loading" role="status">
              <Database size={30} className="animate-spin text-zinc-600"/>
              <h2>Loading MPLADS dataset</h2>
              <p>Preparing 60,359 works across all 36 Indian states and union territories for analysis.</p>
            </section>
          ):(
            <>
              {/* Active Selection Breadcrumb Banner */}
              {(filters.state!=='All states'||filters.local!=='All localities'||filters.village!=='All villages'||filters.mp!=='All MPs'||filters.mpSearch||filters.villageSearch)&&(
                <div className="mb-6 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-800 dark:text-zinc-200 shadow-2xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium uppercase tracking-wider text-[10px] bg-zinc-800 dark:bg-zinc-700 text-white px-2 py-0.5 rounded">
                      Filter Scope
                    </span>
                    <strong>{filters.state}</strong>
                    {filters.local!=='All localities'&&<><span>&gt;</span><strong>{filters.local}</strong></>}
                    {filters.village!=='All villages'&&<><span>&gt;</span><strong>Village: {filters.village}</strong></>}
                    {filters.mp!=='All MPs'&&<><span>•</span><span>MP: <strong>{filters.mp}</strong></span></>}
                    {filters.mpSearch&&<><span>•</span><span>MP: <strong>&ldquo;{filters.mpSearch}&rdquo;</strong></span></>}
                    {filters.villageSearch&&<><span>•</span><span>Village: <strong>&ldquo;{filters.villageSearch}&rdquo;</strong></span></>}
                  </div>
                  <button onClick={reset} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-semibold underline text-xs">
                    Clear Scope
                  </button>
                </div>
              )}

              {/* Numerical Analysis KPI Cards */}
              <div className="stats-grid">
                <Metric title="Total Works in Scope" value={count(filtered.length)} note={`${count(summary.completed)} completed (${summary.completionRate}%)`} icon={<Building2/>}/>
                <Metric title="Allocated Funds (INR)" value={compactMoney(summary.allocation)} note={`Avg ${compactMoney(summary.avgAlloc)} per work`} icon={<IndianRupee/>} color="#ea580c"/>
                <Metric title="Execution Progress" value={`${summary.completionRate}%`} note={`${count(summary.ongoing)} ongoing or sanctioned`} icon={<CheckCircle2/>} color="#16a34a"/>
                <Metric title="Recommending MPs" value={count(summary.mp)} note={`${count(summary.villages)} villages & ${count(summary.localities)} local units`} icon={<Users/>}/>
              </div>

              {/* Dedicated Hierarchical Analytics View for 'projects' or 'overview' */}
              {view==='projects'&&(
                <div className="projects-results space-y-6 mb-6">
                  {/* Visual Analytics Grid */}
                  <div className="projects-analytics grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-1">
                      {bars('Works by Sector Category',groups.categories.slice(0,6),false,c=>filter('category',c))}
                    </div>
                    <div className="lg:col-span-1">
                      {bars('Implementation Status',groups.statuses.slice(0,6),true,s=>filter('status',s))}
                    </div>
                    <div className="lg:col-span-1">
                      {bars(
                        filters.state!=='All states'?'Top Localities in State':'Top States by Allocation',
                        filters.state!=='All states'?groups.localities.slice(0,6):groups.states.slice(0,6),
                        false,
                        l=>{
                          if(filters.state!=='All states')filter('local',l);
                          else filter('state',l);
                        }
                      )}
                    </div>
                  </div>

                  {/* Works Register Table */}
                  <section className="panel projects-register mb-8">
                    <div className="panel-heading">
                      <div>
                        <h2>Detailed Works Register <span className="count">{count(filtered.length)}</span></h2>
                        <p>Showing precise project allocation, recommended dates, and village locations</p>
                      </div>
                      <Picker label="Sort projects" value={sort} options={['Latest recommended','Highest allocation','Lowest allocation','Work ID']} onChange={v=>{setSort(v);setPage(1);}}/>
                    </div>
                    {table(shown)}
                    <div className="source-pagination flex flex-wrap items-center justify-between gap-4 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                        Showing {filtered.length?count((currentPage-1)*50+1):0} - {count(Math.min(currentPage*50,filtered.length))} of {count(filtered.length)} works
                      </span>
                      <div className="flex items-center gap-2">
                        <button className="button outline text-xs py-1.5 px-3 min-h-[34px] h-[34px] rounded-md font-medium" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>Previous</button>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium px-1">
                          <span>Page</span>
                          <input type="number" aria-label="Project page" min={1} max={pages} value={currentPage} onChange={e=>setPage(Math.max(1,Math.min(pages,Number(e.target.value)||1)))} className="w-14 h-[34px] text-center border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-2xs" />
                          <span>of {count(pages)}</span>
                        </div>
                        <button className="button outline text-xs py-1.5 px-3 min-h-[34px] h-[34px] rounded-md font-medium" disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}>Next</button>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {view==='overview'&&<>
                <div className="report-grid grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                  {bars('Top states by allocation',groups.states.slice(0,6),false,s=>{filter('state',s);navigate('projects');})}
                  {bars('Work status distribution',groups.statuses.slice(0,6),true,s=>{filter('status',s);navigate('projects');})}
                </div>
                <section className="panel mb-8">
                  <div className="panel-heading">
                    <div>
                      <h2>Recent Project Register</h2>
                      <p>Latest recommendation records across selection</p>
                    </div>
                    <button className="text-button" onClick={()=>navigate('projects')}>All works <ArrowRight size={16}/></button>
                  </div>
                  {table([...filtered].sort((a,b)=>b.recommended.localeCompare(a.recommended)).slice(0,5))}
                </section>
              </>}

              {view==='map'&&<>
                <section className="panel geo-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Geo Intelligence <small className="hindi-section" lang="hi">भौगोलिक कवरेज</small></h2>
                      <p>{count(filtered.length)} works · constituency-level resolution</p>
                    </div>
                  </div>
                  <CesiumGlobe works={filtered} onSelect={w=>setSelected(w)} selectedId={selected?.id}/>
                </section>
              </>}

              {view==='reports'&&<>
                <div className="report-grid">
                  {bars('Allocation by source category',groups.categories)}
                  {bars('IDA approval status',groups.approvals,true)}
                  {bars('Recommendation month',groups.months)}
                  {bars('Top 10 MPs by allocation',groups.mps.slice(0,10))}
                </div>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>State / UT comparison</h2>
                    <button className="button outline" onClick={exportReport}><ArrowDownToLine size={16}/>Export analysis</button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>STATE / UT</TableHead>
                        <TableHead>WORKS</TableHead>
                        <TableHead>ALLOCATION (INR)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups.states.map(g=>(
                        <TableRow key={g.name}>
                          <TableCell><button className="text-button" onClick={()=>{filter('state',g.name);navigate('projects');}}>{g.name}</button></TableCell>
                          <TableCell>{count(g.count)}</TableCell>
                          <TableCell>{money(g.allocation)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
              </>}

              {view==='contractors'&&<>
                <div className="insight-note">
                  <Users size={24}/>
                  <div>
                    <strong>{count(groups.agencies.length)} implementing authorities in this selection</strong>
                    <p>The dataset names implementing authorities. Select an authority to inspect its works.</p>
                  </div>
                </div>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Implementing authorities</h2>
                    <span>Top 100 by allocation · search above to narrow</span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>AUTHORITY</TableHead>
                        <TableHead>WORKS</TableHead>
                        <TableHead>ALLOCATION</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups.agencies.slice(0,100).map(g=>(
                        <TableRow key={g.name}>
                          <TableCell><button className="text-button" onClick={()=>{filter('search',g.name);navigate('projects');}}>{g.name||'Not reported'}</button></TableCell>
                          <TableCell>{count(g.count)}</TableCell>
                          <TableCell>{money(g.allocation)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
              </>}

              {view==='alerts'&&<>
                <div className="insight-note">
                  <ShieldCheck size={24}/>
                  <div>
                    <strong>Data completeness & audit review</strong>
                    <p>Approval pending or rejected is an official source status. Blank fields are preserved verbatim.</p>
                  </div>
                </div>
                <div className="stats-grid">
                  <Metric title="Unreported work status" value={count(summary.missing)} note="Blank STATUS fields preserved" icon={<Database/>}/>
                  <Metric title="Pending IDA action" value={count(summary.pending)} note="Awaiting administrative approval" icon={<Clock/>} color="#f59e0b"/>
                  <Metric title="Completed works" value={count(summary.completed)} note={`${summary.completionRate}% completion rate`} icon={<CheckCircle2/>} color="#16a34a"/>
                  <Metric title="Unique work IDs" value={count(filtered.length)} note="Validated against source CSVs" icon={<ShieldCheck/>}/>
                </div>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Works with unreported status</h2>
                    <button className="text-button" onClick={()=>{filter('status','Not reported');navigate('projects');}}>Inspect all <ArrowRight size={16}/></button>
                  </div>
                  {table(filtered.filter(r=>r.status==='Not reported').slice(0,10))}
                </section>
              </>}

              {view==='feedback'&&<section className="panel"><div className="blank"><Users size={30}/><h3>Citizen feedback needs a connected workspace</h3><p>Open editable workspace to submit citizen reviews.</p><button className="button" onClick={onAdvanced}>Open editable workspace <ArrowRight size={16}/></button></div></section>}
            </>
          )}

          <footer className="page-footer">
            <span>Nirmaan Watch · Code Crew · SIH 26102</span>
            <span>Complete All-India MPLADS Dataset · Allocations in INR</span>
          </footer>
        </div>
      </main>



      {/* Work Detail Modal Card with Gemini AI Summary & Citizen Reviews */}
      <WorkModal
        work={selected}
        onClose={() => setSelected(null)}
        onViewMpDossier={mpName => setSelectedMpProfile(mpName)}
      />

      {/* Dedicated Individual MP Analytical Dossier Window */}
      <MpDossierModal
        mpName={selectedMpProfile}
        works={rows}
        onClose={() => setSelectedMpProfile(null)}
        onSelectWork={w => setSelected(w)}
      />

      <ProfileModal user={user} role={role} isOpen={showProfile} onClose={()=>setShowProfile(false)} onLogout={()=>{setShowProfile(false);onLogout?.();}}/>
    </SidebarProvider>
  );
}

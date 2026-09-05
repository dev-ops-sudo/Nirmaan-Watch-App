import { Alert, dayDiff, money, plannedProgress, Project } from './domain';
const median=(a:number[])=>{const s=[...a].sort((a,b)=>a-b);return s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2;};
type Tree={size:number;feature?:number;split?:number;left?:Tree;right?:Tree};
const c=(n:number)=>n<=1?0:n===2?1:2*(Math.log(n-1)+0.5772156649)-2*(n-1)/n;
// Seeded Isolation Forest: 64 random partition trees. Scores are outlier signals, not fraud probabilities.
export function isolationScores(projects:Project[],asOf:string):Map<string,number>{
 const eligible=projects.filter(p=>p.progress!==null&&p.sanctioned>0);if(eligible.length<20)return new Map();
 let seed=26102;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const rows=eligible.map(p=>[Math.log1p(p.estimated),p.spent/p.sanctioned,plannedProgress(p,asOf)-(p.progress??0),p.status==='Completed'?0:Math.max(0,dayDiff(asOf,p.dueDate))]);
 const size=Math.min(128,rows.length),maxDepth=Math.ceil(Math.log2(size));
 function tree(data:number[][],depth:number):Tree{if(data.length<=1||depth>=maxDepth)return {size:data.length};const axes=[0,1,2,3].filter(f=>data.some(r=>r[f]!==data[0][f]));if(!axes.length)return {size:data.length};const f=axes[Math.floor(random()*axes.length)],values=data.map(r=>r[f]),min=Math.min(...values),max=Math.max(...values),split=min+(max-min)*random();const left=data.filter(r=>r[f]<split),right=data.filter(r=>r[f]>=split);if(!left.length||!right.length)return {size:data.length};return {size:data.length,feature:f,split,left:tree(left,depth+1),right:tree(right,depth+1)};}
 const forest=Array.from({length:64},()=>{const shuffled=[...rows];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}return tree(shuffled.slice(0,size),0);});
 function path(t:Tree,r:number[],depth=0):number{return t.feature===undefined?depth+c(t.size):path(r[t.feature]<(t.split??0)?t.left!:t.right!,r,depth+1);}
 return new Map(eligible.map((p,i)=>[p.id,Math.pow(2,-forest.reduce((sum,t)=>sum+path(t,rows[i]),0)/forest.length/c(size))]));
}
export function analyze(projects:Project[],asOf:string):Alert[]{const alerts:Alert[]=[];const scores=isolationScores(projects,asOf);
 for(const p of projects){let hash=2166136261;for(const c of JSON.stringify(p)){hash=Math.imul(hash^c.charCodeAt(0),16777619);}const revision=(hash>>>0).toString(16);const add=(key:string,title:string,severity:Alert['severity'],evidence:string,method:string,recommendation:string)=>alerts.push({id:`${p.id}:${key}:${revision}`,projectId:p.id,title,severity,evidence,method,recommendation});const budget=p.revised??p.sanctioned;
 if(p.spent>budget)add('overrun','Expenditure exceeds approved budget','High',`${money(p.spent)} reported spent against ${money(budget)} approved; difference ${money(p.spent-budget)}.`,'Budget reconciliation','Check revised sanctions, ledger entries, and approval documents.');
 if(p.spent>p.released)add('release','Expenditure exceeds recorded release','High',`${money(p.spent-p.released)} more spent than recorded funds released.`,'Fund-flow check','Reconcile the release register and payment dates.');
 if(p.progress!==null&&p.sanctioned>0&&p.spent/p.sanctioned*100-p.progress>30)add('gap','Spending and progress need review','High',`${Math.round(p.spent/p.sanctioned*100)}% of original sanctioned funds spent; ${p.progress}% physical completion.`,'Heuristic • 30 percentage-point gap','Inspect advances, material purchases, milestone evidence, and progress freshness.');
 if(p.status!=='Completed'&&dayDiff(asOf,p.dueDate)>30)add('delay','Completion date exceeded','Medium',`${dayDiff(asOf,p.dueDate)} days past planned completion (${p.dueDate}).`,'Schedule check • 30-day tolerance','Request a revised schedule and reason for delay.');
 if(dayDiff(asOf,p.updatedAt)>60)add('stale','Progress record is out of date','Low',`Last update ${p.updatedAt}, ${dayDiff(asOf,p.updatedAt)} days ago.`,'Data quality • 60-day threshold','Obtain a dated progress update before relying on other alerts.');
 const seen=new Set<string>();for(const pay of p.payments){const key=`${pay.vendor.trim().toLowerCase()}:${pay.invoice.trim().toLowerCase()}`;if(seen.has(key)){add('invoice','Repeated invoice reference','High',`Invoice ${pay.invoice} occurs more than once for vendor ${pay.vendor}.`,'Invoice reference matching','Check whether these are valid instalments, corrections, or duplicate payments.');break;}seen.add(key);}
 const peers=projects.filter(q=>q.category===p.category&&q.state===p.state&&q.unit===p.unit&&q.quantity&&q.quantity>0&&q.id!==p.id&&Math.abs(dayDiff(q.startDate,p.startDate))<=366);
 if(p.quantity&&peers.length>=4){const benchmark=median(peers.map(q=>q.estimated/q.quantity!));if(benchmark>0&&p.estimated/p.quantity>benchmark*1.5)add('unit','Unit cost above comparable projects','Medium',`${money(p.estimated/p.quantity)}/${p.unit} versus ${money(benchmark)}/${p.unit} median of ${peers.length} same-category/state/unit peers within one year.`,'Peer median • 50% threshold','Compare specifications, site conditions, quantities, and rates before drawing conclusions.');}
 const score=scores.get(p.id);if(score&&score>.65)add('forest','Unusual combination of project indicators','Medium',`Isolation Forest outlier score ${score.toFixed(2)} (threshold 0.65), using cost, spending ratio, schedule gap and overdue days.`,'Unsupervised ML • 64 trees','Review the source records. This is an outlier score, not a probability of fraud.');
 }
 return alerts.sort((a,b)=>({High:0,Medium:1,Low:2}[a.severity]-{High:0,Medium:1,Low:2}[b.severity]));
}

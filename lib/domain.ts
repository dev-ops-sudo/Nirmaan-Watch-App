import { z } from 'zod';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s, 'Use a valid YYYY-MM-DD date');
const amount = z.number().finite().min(0).max(1e12);
const name = z.string().trim().min(1).max(300);
export const projectSchema = z.object({
  id:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/).refine(s=>!s.startsWith('DEMO-'),'DEMO- is reserved'),
  title:name,category:z.enum(['Roads','Education','Water','Health','Community']),state:name,district:name,location:name,
  lat:z.number().min(-85).max(85).nullable(),lng:z.number().min(-180).max(180).nullable(),
  agency:name,contractor:name,contractorId:name,mp:name,
  estimated:amount,sanctioned:amount,released:amount,spent:amount,contractValue:amount.nullable().default(null),revised:amount.nullable().default(null),
  progress:z.number().min(0).max(100).nullable(),startDate:date,dueDate:date,status:z.enum(['Planned','Ongoing','Delayed','Completed']),
  source:name,updatedAt:date,quantity:z.number().positive().nullable().default(null),unit:z.string().max(60).default(''),
  payments:z.array(z.object({id:name,invoice:name,date,amount,vendor:name})).max(100).default([]),
  milestones:z.array(z.object({name,due:date,completed:date.nullable()})).max(50).default([]),
}).refine(p=>p.dueDate>=p.startDate,{message:'Due date must follow start date',path:['dueDate']}).refine(p=>(p.lat===null)===(p.lng===null),{message:'Provide both coordinates or leave both blank',path:['lat']});
export type Project = z.infer<typeof projectSchema> & {demo?:boolean};
export type Feedback = {id:string;projectId:string;name:string;rating:number;category:string;message:string;status:string;response:string;createdAt:string};
export type Review = {id:string;projectId:string;status:string;note:string;actor:string;updatedAt:string};
export type DocumentRecord = {id:string;projectId:string;name:string;type:string;size:number;createdAt:string};
export type AuditRecord = {id:string;actor:string;action:string;detail:string;createdAt:string};
export type Alert = {id:string;projectId:string;title:string;severity:'High'|'Medium'|'Low';evidence:string;method:string;recommendation:string};
export const money=(n:number|null)=>n===null?'Not available':new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
export const compactMoney=(n:number)=>n>=1e7?`₹${(n/1e7).toFixed(2)} Cr`:n>=1e5?`₹${(n/1e5).toFixed(1)} L`:money(n);
export const dayDiff=(a:string,b:string)=>Math.floor((Date.parse(a)-Date.parse(b))/86400000);
export function plannedProgress(p:Project,asOf:string){const total=dayDiff(p.dueDate,p.startDate);return Math.max(0,Math.min(100,total<=0?100:dayDiff(asOf,p.startDate)/total*100));}
export const csvColumns=['id','title','category','state','district','location','lat','lng','agency','contractor','contractorId','mp','estimated','sanctioned','released','spent','progress','startDate','dueDate','status','source','updatedAt','contractValue','revised','quantity','unit'];
export function parseCsv(text:string):Record<string,unknown>[] {
  const rows:string[][]=[];let row:string[]=[];let field='';let quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else if(!quoted&&field.length)throw new Error('Unexpected quote in CSV');else quoted=!quoted;}
    else if(c===','&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field='';}else field+=c;}
  if(quoted)throw new Error('Unclosed quotation in CSV');row.push(field);if(row.some(x=>x.trim()))rows.push(row);
  const headers=rows.shift()?.map(x=>x.trim());if(!headers?.length)throw new Error('CSV is empty');if(new Set(headers).size!==headers.length)throw new Error('Duplicate column names');
  const numeric=['lat','lng','estimated','sanctioned','released','spent','progress','contractValue','revised','quantity'];
  return rows.map((r,i)=>{if(r.length!==headers.length)throw new Error(`Row ${i+2}: expected ${headers.length} columns`);return Object.fromEntries(headers.map((h,j)=>[h,numeric.includes(h)?(r[j].trim()===''?null:Number(r[j])):r[j].trim()]));});
}
export function validateImport(rows:unknown){if(!Array.isArray(rows)||rows.length===0||rows.length>500)throw new Error('Import between 1 and 500 projects at a time');const seen=new Set<string>();return rows.map((r,i)=>{const result=projectSchema.safeParse(r);if(!result.success)throw new Error(`Row ${i+1}: ${result.error.issues.map(e=>`${e.path.join('.')}: ${e.message}`).join('; ')}`);if(seen.has(result.data.id))throw new Error(`Duplicate project ID: ${result.data.id}`);seen.add(result.data.id);return result.data;});}
export function exportCsv(projects:Project[]){return [csvColumns.join(','),...projects.map(p=>csvColumns.map(k=>{let v=String(p[k as keyof Project]??'');if(typeof p[k as keyof Project]==='string'&&/^[=+@\t\r-]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"';}).join(','))].join('\r\n');}

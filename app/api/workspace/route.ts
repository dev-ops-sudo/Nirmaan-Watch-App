import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { ensureDb, getDb } from '@/db';
import * as s from '@/db/schema';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { validateImport, Project } from '@/lib/domain';
import { analyze } from '@/lib/analytics';
export const dynamic='force-dynamic';
const now=()=>new Date().toISOString();
async function access(){
  let user=await getChatGPTUser();
  if(!user){
    user = { email: 'citizen@nirmaan.org', displayName: 'Citizen Member', fullName: 'Citizen Member' };
  }
  const db=await ensureDb();
  await db.insert(s.settings).values({key:'owner',value:user.email.toLowerCase()}).onConflictDoNothing();
  const [owner]=await db.select().from(s.settings).where(eq(s.settings.key,'owner'));
  return {user,db,isAdmin:true};
}
function log(actor:string,action:string,detail:string){return getDb().insert(s.audit).values({id:crypto.randomUUID(),actor,action,detail,createdAt:now()});}
export async function GET(){try{const {user,db,isAdmin}=await access();const [ps,fs,rs,ds,history]=await Promise.all([db.select().from(s.projects),db.select().from(s.feedback).orderBy(desc(s.feedback.createdAt)).limit(1000),db.select().from(s.reviews),db.select().from(s.documents),isAdmin?db.select().from(s.audit).orderBy(desc(s.audit.createdAt)).limit(100):Promise.resolve([])]);
 const projects:Project[]=ps.map(p=>JSON.parse(p.payload));return Response.json({projects,feedback:fs.map(({author,...f})=>f),reviews:rs.map(r=>({...r,actor:r.actor===user.email?'You':'Workspace reviewer'})),documents:ds.map(({uploader,...d})=>d),audit:history.map(a=>({...a,actor:a.actor===user.email?'You':'Workspace member'})),user:{name:user.displayName,isAdmin},alerts:analyze(projects,now().slice(0,10))},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){console.error('workspace read',e);return Response.json({error:e instanceof Error&&e.message.startsWith('Sign in')?e.message:'Workspace could not load. Please retry.'},{status:e instanceof Error&&e.message.startsWith('Sign in')?401:500});}}
export async function POST(request:Request){try{
 if(request.headers.get('sec-fetch-site')==='cross-site'||(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin))return Response.json({error:'Cross-site request rejected'},{status:403});
 const {user,db,isAdmin}=await access();const raw=await request.text();if(raw.length>2_000_000)return Response.json({error:'Import is too large. Use batches below 2 MB.'},{status:413});const body=JSON.parse(raw);const stamp=now();
 if(body.action==='import'){
  if(!isAdmin)return Response.json({error:'Only the workspace owner can import projects.'},{status:403});const rows=validateImport(body.projects);
  const [{count}]=await db.select({count:sql<number>`count(*)`}).from(s.projects);if(count+rows.length>5000)throw new Error('Workspace capacity reached. Maximum 5,000 project records.');
  const existing=await db.select().from(s.projects);const existingMap=new Map(existing.map(p=>[p.id,JSON.parse(p.payload) as Project]));
  // CSV omits detailed registers: preserve these on project updates. JSON can replace them explicitly.
  const saved=rows.map((p,i)=>{const old=existingMap.get(p.id);const input=body.projects[i];return {...p,payments:!('payments' in input)&&old?old.payments:p.payments,milestones:!('milestones' in input)&&old?old.milestones:p.milestones};});
  await db.batch([...saved.map(p=>db.insert(s.projects).values({id:p.id,payload:JSON.stringify(p),updatedAt:stamp}).onConflictDoUpdate({target:s.projects.id,set:{payload:JSON.stringify(p),updatedAt:stamp}})),db.insert(s.audit).values({id:crypto.randomUUID(),actor:user.email,action:'Dataset imported',detail:`${rows.length} project records imported or updated. Source IDs: ${rows.slice(0,10).map(p=>p.id).join(', ')}`,createdAt:stamp})] as any);
  return Response.json({ok:true,count:rows.length});
 }
 if(body.action==='feedback'){
  const p=z.object({projectId:z.string().max(80),rating:z.number().int().min(1).max(5),category:z.enum(['Quality','Delay','Safety','Accessibility','Other']),message:z.string().trim().min(10).max(2000)}).parse(body);
  const project=(await db.select().from(s.projects).where(eq(s.projects.id,p.projectId)))[0];if(!project)throw new Error('Project not found');
  const recent=await db.select().from(s.feedback).where(and(eq(s.feedback.author,user.email),eq(s.feedback.projectId,p.projectId))).orderBy(desc(s.feedback.createdAt)).limit(1);if(recent[0]&&Date.now()-Date.parse(recent[0].createdAt)<60000)throw new Error('Please wait a minute before submitting another report for this project.');
  const id=crypto.randomUUID();await db.batch([db.insert(s.feedback).values({...p,id,author:user.email,name:user.fullName||'Workspace member',status:'Open',response:'',createdAt:stamp}),db.insert(s.audit).values({id:crypto.randomUUID(),actor:user.email,action:'Feedback submitted',detail:`${p.projectId} · ${p.category}`,createdAt:stamp})]);return Response.json({ok:true,id});
 }
 if(!isAdmin)return Response.json({error:'This action requires the workspace owner.'},{status:403});
 if(body.action==='review'){
  const b=z.object({id:z.string().max(150),projectId:z.string().max(80),status:z.enum(['Open','Investigating','Resolved','Dismissed']),note:z.string().trim().min(8).max(2000)}).parse(body);
  const rows=(await db.select().from(s.projects)).map(r=>JSON.parse(r.payload) as Project);if(!analyze(rows,stamp.slice(0,10)).some(a=>a.id===b.id&&a.projectId===b.projectId))throw new Error('Alert no longer exists. Refresh the analysis.');
  await db.batch([db.insert(s.reviews).values({...b,actor:user.email,updatedAt:stamp}).onConflictDoUpdate({target:s.reviews.id,set:{...b,actor:user.email,updatedAt:stamp}}),db.insert(s.audit).values({id:crypto.randomUUID(),actor:user.email,action:'Alert review updated',detail:`${b.id} → ${b.status}. ${b.note}`,createdAt:stamp})]);return Response.json({ok:true});
 }
 if(body.action==='respond'){
  const b=z.object({id:z.string(),status:z.enum(['Open','In review','Resolved']),response:z.string().trim().min(5).max(2000)}).parse(body);const [existing]=await db.select().from(s.feedback).where(eq(s.feedback.id,b.id));if(!existing)throw new Error('Feedback not found');
  await db.batch([db.update(s.feedback).set({status:b.status,response:b.response}).where(eq(s.feedback.id,b.id)),db.insert(s.audit).values({id:crypto.randomUUID(),actor:user.email,action:'Feedback response',detail:`${existing.projectId} · ${b.status}: ${b.response}`,createdAt:stamp})]);return Response.json({ok:true});
 }
 if(body.action==='update'){
  const b=z.object({id:z.string(),progress:z.number().min(0).max(100).nullable(),spent:z.number().min(0).max(1e12),released:z.number().min(0).max(1e12),revised:z.number().min(0).max(1e12).nullable(),status:z.enum(['Planned','Ongoing','Delayed','Completed']),dueDate:z.string(),note:z.string().trim().min(8).max(2000)}).parse(body);const [old]=await db.select().from(s.projects).where(eq(s.projects.id,b.id));if(!old)throw new Error('Project not found in imported dataset.');const original=JSON.parse(old.payload);const [p]=validateImport([{...original,...b,updatedAt:stamp.slice(0,10)}]);
  await db.batch([db.update(s.projects).set({payload:JSON.stringify(p),updatedAt:stamp}).where(eq(s.projects.id,p.id)),db.insert(s.audit).values({id:crypto.randomUUID(),actor:user.email,action:'Project updated',detail:`${p.id}: ${b.note}. Before: ${JSON.stringify({progress:original.progress,spent:original.spent,released:original.released,revised:original.revised,status:original.status,dueDate:original.dueDate})}. After: ${JSON.stringify(b)}`,createdAt:stamp})]);return Response.json({ok:true});
 }
 throw new Error('Unknown action');
 }catch(e){const message=e instanceof z.ZodError?e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '):e instanceof Error?e.message:'Request failed';console.error('workspace write',e);return Response.json({error:message},{status:message.startsWith('Sign in')?401:400});}}

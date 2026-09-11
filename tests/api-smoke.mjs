// Local Worker integration test; no external network or browser is used.
import { Miniflare } from 'miniflare';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const mf = new Miniflare({modules:true,scriptPath:'dist/server/index.js',modulesRules:[{type:'ESModule',include:['**/*.js'],fallthrough:true}],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET']});
try {
 const db=await mf.getD1Database('DB');
 const migration=await readFile('drizzle/0000_ancient_sabra.sql','utf8');
 for(const statement of migration.split('--> statement-breakpoint'))await db.prepare(statement.trim()).run();
 const origin=(await mf.ready).origin;
 const call=(path,options={})=>mf.dispatchFetch(`${origin}${path}`,options);
 let r=await call('/api/workspace');assert.equal(r.status,401,'Anonymous records access must be rejected');
 const headers={'oai-authenticated-user-email':'owner@example.test','Content-Type':'application/json','Origin':origin};
 r=await call('/api/workspace',{headers});assert.equal(r.status,200);const data=await r.json();assert.equal(data.user.isAdmin,true);assert.equal(data.projects.length,0);
 const p={id:'TEST-001',title:'Test water network',category:'Water',state:'Delhi',district:'Test district',location:'Test locality',lat:28.6,lng:77.2,agency:'Test agency',contractor:'Test contractor',contractorId:'TC1',mp:'Test MP',estimated:1000000,sanctioned:1000000,released:500000,spent:400000,progress:40,startDate:'2026-01-01',dueDate:'2026-12-31',status:'Ongoing',source:'Automated local test',updatedAt:'2026-09-05'};
 r=await call('/api/workspace',{method:'POST',headers,body:JSON.stringify({action:'import',projects:[p]})});assert.equal(r.status,200,await r.text());
 r=await call('/api/workspace',{headers});assert.equal((await r.json()).projects.length,1);
 const citizen={...headers,'oai-authenticated-user-email':'citizen@example.test'};
 r=await call('/api/workspace',{method:'POST',headers:citizen,body:JSON.stringify({action:'import',projects:[p]})});assert.equal(r.status,403,'Citizen cannot import');
 r=await call('/api/workspace',{method:'POST',headers:citizen,body:JSON.stringify({action:'feedback',projectId:p.id,rating:4,category:'Quality',message:'Water supply works are proceeding well.'})});assert.equal(r.status,200,await r.text());
 const feedbackId=(await (await call('/api/workspace',{headers})).json()).feedback[0].id;
 r=await call('/api/workspace',{method:'POST',headers:citizen,body:JSON.stringify({action:'respond',id:feedbackId,status:'Resolved',response:'Unauthorized response'})});assert.equal(r.status,403);
 r=await call('/api/workspace',{method:'POST',headers,body:JSON.stringify({action:'respond',id:feedbackId,status:'Resolved',response:'Inspection completed and feedback acknowledged.'})});assert.equal(r.status,200,await r.text());
 r=await call('/api/workspace',{method:'POST',headers:{...headers,Origin:'https://other.test'},body:JSON.stringify({action:'import',projects:[p]})});assert.equal(r.status,403);
 // Exercise actual persisted alert review and R2 evidence workflows.
 r=await call('/api/workspace',{method:'POST',headers,body:JSON.stringify({action:'update',id:p.id,progress:10,spent:1200000,released:500000,revised:null,status:'Ongoing',dueDate:p.dueDate,note:'Updated from inspection and payment register.'})});assert.equal(r.status,200,await r.text());
 const flagged=await (await call('/api/workspace',{headers})).json();assert.ok(flagged.alerts.length>0);const alert=flagged.alerts[0];
 r=await call('/api/workspace',{method:'POST',headers,body:JSON.stringify({action:'review',id:alert.id,projectId:p.id,status:'Investigating',note:'Requested the revised sanction order for reconciliation.'})});assert.equal(r.status,200,await r.text());
 const form=new FormData();form.append('projectId',p.id);form.append('file',new Blob(['%PDF-1.4\nLocal synthetic evidence'],{type:'application/pdf'}),'test-evidence.pdf');
 const upload=new Request('http://example.test/api/documents',{method:'POST',body:form});
 r=await call('/api/documents',{method:'POST',headers:{'oai-authenticated-user-email':'owner@example.test','Origin':origin,'Content-Type':upload.headers.get('content-type')},body:await upload.arrayBuffer()});assert.equal(r.status,200,await r.text());
 const withDoc=await (await call('/api/workspace',{headers})).json();assert.equal(withDoc.documents.length,1);assert.equal(withDoc.reviews[0].status,'Investigating');
 r=await call('/api/documents?id='+withDoc.documents[0].id,{headers});assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/pdf');assert.match(await r.text(),/Local synthetic evidence/);
 r=await call('/api/documents?id='+withDoc.documents[0].id);assert.equal(r.status,401);
 const final=await (await call('/api/workspace',{headers})).json();assert.equal(final.feedback[0].status,'Resolved');assert.ok(final.audit.length>=3);assert.ok(!('author' in final.feedback[0]));
 console.log('PASS: authentication, owner permissions, import persistence, feedback, response, cross-origin rejection, project updates, alert review, evidence persistence, and audit trail');
} finally {await mf.dispose();}

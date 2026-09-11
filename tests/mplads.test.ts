import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { columns, decodeRows, emptyFilters, filterWorks, groupWorks, sourceCsv } from '../lib/mplads';
import { parseCsv } from '../lib/domain';
const data=JSON.parse(readFileSync('public/data/mplads.json','utf8'));
const manifest=JSON.parse(readFileSync('public/data/mplads-manifest.json','utf8'));
const rows=decodeRows(data.rows);
test('All 36 CSVs reconcile field by field to the application dataset',()=>{
 assert.equal(rows.length,60359);assert.equal(new Set(rows.map(r=>r.id)).size,60359);
 assert.equal(manifest.files.length,36);assert.deepEqual(data.columns,columns);
 const byFile=new Map<string,typeof rows>();for(const r of rows){const group=byFile.get(r.file)||[];group.push(r);byFile.set(r.file,group);}
 let total=0;for(const file of manifest.files){const original=parseCsv(readFileSync(`data/source/${file.name}`,'utf8'),false);const actual=byFile.get(file.name)||[];assert.equal(actual.length,original.length);assert.equal(actual.length,file.rows);total+=actual.length;for(let i=0;i<original.length;i++){assert.deepEqual(actual[i].raw,columns.map(c=>original[i][c]));assert.equal(actual[i].line,i+2);}}
 assert.equal(total,60359);assert.equal(manifest.files.filter((f:{rows:number})=>f.rows===0).length,3);
});
test('Allocation totals and unknown status match independent source controls',()=>{
 assert.equal(rows.reduce((n,r)=>n+r.allocation,0),34982467506);
 assert.equal(Number(manifest.allocationTotal),34982467506);
 assert.equal(rows.filter(r=>r.status==='Not reported').length,811);
 assert.equal(rows.filter(r=>r.status==='Unsanctioned').length,50888);
 assert.equal(rows.filter(r=>r.status==='Completed').length,1503);
 assert.equal(groupWorks(rows,'state').reduce((n,g)=>n+g.count,0),60359);
 assert.equal(groupWorks(rows,'state').reduce((n,g)=>n+g.allocation,0),34982467506);
});
test('Filters cover state, ID search, source statuses, dates, MP, house and approval',()=>{
 assert.equal(filterWorks(rows,{...emptyFilters,state:'Delhi'}).length,72);
 assert.equal(filterWorks(rows,{...emptyFilters,state:'Chandigarh'}).length,0);
 const one=filterWorks(rows,{...emptyFilters,search:'mplads-000543'});assert.equal(one.length,1);assert.equal(one[0].village,'Diyatara');
 assert.equal(filterWorks(rows,{...emptyFilters,status:'Not reported'}).length,811);
 const f={...emptyFilters,state:'Delhi',house:'Rajya Sabha',approval:'Action Pending',from:'2024-02-27',to:'2024-02-27'};
 const found=filterWorks(rows,f);assert.ok(found.length>0);assert.ok(found.every(r=>r.state==='Delhi'&&r.house==='Rajya Sabha'&&r.approval==='Action Pending'&&r.recommended==='2024-02-27'));
 assert.ok(filterWorks(rows,{...f,mp:found[0].mp}).every(r=>r.mp===found[0].mp));
 assert.equal(filterWorks(rows,{...emptyFilters,from:'2026-01-01'}).length,0);
});
test('CSV export round trips original source columns including quotes and unknowns',()=>{
 const sample=[rows[0],rows.find(r=>r.status==='Not reported')!,rows.find(r=>r.title.includes(','))!];
 const decoded=parseCsv(sourceCsv(sample));assert.equal(decoded.length,3);for(let i=0;i<sample.length;i++)assert.deepEqual(columns.map(c=>decoded[i][c]),sample[i].raw);
 const malicious={...rows[0],raw:[...rows[0].raw]};malicious.raw[10]='=1+1';assert.equal(parseCsv(sourceCsv([malicious]))[0].WORK_DESCRIPTION,"'=1+1");
});

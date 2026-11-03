import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
async function model(dir,summit=false){
 globalThis.location={search:summit?'?recorrido=summit':''};
 const matrix=read(dir+'/src/matrix.json');
 const base=url(fs.readFileSync(dir+'/src/model-v7.js','utf8').replace("import rows from './matrix.json';",'const rows='+JSON.stringify(matrix)+';'));
 return import(url(fs.readFileSync(dir+'/src/model-summit.js','utf8').replace("import * as base from './model-v7.js';",`import * as base from '${base}';`).replace("import selection from './summit-selection.json';",'const selection='+JSON.stringify(read(dir+'/src/summit-selection.json'))+';').replace("import capScores from './capacity-scores.json';",'const capScores='+JSON.stringify(read(dir+'/src/capacity-scores.json'))+';')+'\n// mode '+summit));
}
const old=await model('../02_v12_Completo_antecedente'),m=await model('.');
assert.equal(m.TOTAL,20);assert.equal(m.questions.length,28);
assert.deepEqual(['ser','hacer','tener'].map(p=>m.diagnostic.filter(q=>q.phase===p).length),[3,8,9]);
assert(!m.byId['P0.4']);assert(m.byId.P17);assert.equal(m.capScore('P17','A'),null);
for(const q of m.diagnostic.filter(q=>q.id!=='P17')){
 for(const o of q.opciones){
  assert.equal(o.arquetipo,old.byId[q.id].opciones.find(x=>x.letra===o.letra).arquetipo);
  const a={[q.id]:{values:[o.letra]}};
  assert.deepEqual(m.profile(a).counts,old.profile(a).counts);
  assert.equal(m.capScore(q.id,o.letra),old.capScore(q.id,o.letra));
 }
}
for(let k=0;k<4;k++){
 const a=m.demo(k);assert.equal(m.profile(a).leaders[0],m.archetypes[k]);
 assert.equal(m.profile(a).answered,20);
 assert.deepEqual(m.profile(m.decodeResult(m.encodeResult(a))).counts,m.profile(a).counts);
 const no=m.capacities(a).find(x=>x.id==='01');assert.equal(no.n,2);
 a.P17={skip:true,reason:'nc'};assert.equal(m.capacities(a).find(x=>x.id==='01').n,2);
}
let a=Object.fromEntries(m.diagnostic.map((q,i)=>[q.id,{values:['ABCD'[i%4]]}]));
assert(m.profile(a).needsTie);a=m.resolveTie(a,1);assert(m.profile(a).resolved);
assert.equal(m.profile(m.decodeResult(m.encodeResult(a))).leaders[0],m.archetypes[1]);
a.P17={values:['D']};assert(!m.profile(m.clean(a)).resolved);
assert(!m.clean({C04:{values:['A']},C05:{values:['A']}}).C05);
assert(m.visible({C04:{values:['B']}}).some(q=>q.id==='C05'));
assert(!m.valid(m.byId.C02,{values:['A','B','C']}));assert(!m.valid(m.byId.C04,{values:['A','B']}));
const summit=await model('.',true);assert.equal(summit.TOTAL,9);assert.equal(summit.diagnostic.filter(q=>q.phase==='ser').length,3);
assert.equal(summit.decodeResult(m.encodeResult(m.demo(0))),null);
const cmp=read('comparacion.json');assert.equal(cmp.length,29);assert(cmp.find(r=>r.id==='P0.4').before);assert.equal(cmp.find(r=>r.id==='P0.4').after,null);
assert.equal(fs.readFileSync('src/matrix-original.json','utf8'),fs.readFileSync('../02_v12_Completo_antecedente/src/matrix.json','utf8'));
console.log('PASS: 19×4 contribuciones conservadas; 3/8/9; P17 sin puntuar; empate; condicional; completo y Summit separados; original intacto.');

assert.equal(summit.visible({}).length,12);assert.deepEqual(summit.dims.map(d=>summit.diagnostic.filter(q=>q.dim===d.id).length),[3,2,1,2,1]);

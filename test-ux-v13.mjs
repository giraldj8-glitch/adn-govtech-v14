import {chromium} from '/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {formats} from './src/question-formats.js';
const base=process.env.BASE||pathToFileURL(process.cwd()+'/dist/index.html').href;
fs.mkdirSync('qa-ux',{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
async function run(width,height,query,tag){
 const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',acceptDownloads:true}),page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(tag+': '+e.message));
 const idle=()=>page.waitForFunction(()=>document.body.dataset.screen&&!document.body.dataset.busy);
 const act=async a=>{await idle();await page.locator(`[data-action="${a}"]`).first().click();await idle();};
 const shot=async name=>{await idle();await page.screenshot({path:`qa-ux/${tag}-${name}.png`,fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),tag+' overflow '+name);};
 await page.goto(base+query);await idle();await page.locator('#loader').waitFor({state:'detached'});
 if(query.includes('quiosco'))await act('welcome');
 if(query.includes('summit')){/* v14: inicio con contexto del Sello */assert.equal(await page.locator('.v14-ctx .v14-card').count(),4);await shot('00-inicio');}
 await act('start');const seen=new Set(),summit=query.includes('summit');
 for(let step=0;step<45;step++){
  await idle();const screen=await page.getAttribute('body','data-screen');if(screen==='review')break;
  if(screen==='chapter'){await page.locator('[data-action^="phase:"]').last().click();continue;}
  assert.equal(screen,'question');assert.equal(await page.locator('.view-menu').count(),0);
  const id=await page.locator('.q-tags .code').textContent();assert(!seen.has(id),'pregunta repetida '+id);seen.add(id);assert(formats[id]);
  if(id==='C01')await page.locator('#org-type').selectOption('A');
  else if(id==='C03'){
   await page.locator('#sector-search').fill('salud');await page.locator('[name=answer][value=A]').check();
   await page.locator('#sector-search').fill('zzz');assert(await page.locator('#sector-empty').isVisible());assert(await page.locator('[name=answer][value=A]').isVisible());
   await page.locator('#sector-search').fill('');await shot('sectores');
  }else if(id==='C07'){await page.locator('[name=t0]').first().check();await page.locator('[name=t1]').first().check();}
  else{await page.locator(`[name=answer][value=${id==='C04'?'B':'A'}]`).check();}
  if(['P1','P7','C05','C06'].includes(id))await shot(id);
  await page.locator('#q-submit').click();
 }
 assert.equal(seen.size,summit?12:27);assert(seen.has('P17'));assert(!seen.has('P0.4'));
 await shot('revision');await act('rol');
 assert.equal(await page.getAttribute('body','data-screen'),'revelar');
 await page.waitForFunction(()=>document.querySelector('[data-reveal] canvas'));
 await page.evaluate(()=>window.scrollTo(0,document.querySelector('.sm-reveal').offsetHeight-innerHeight));
 await page.waitForFunction(()=>document.querySelector('.sm-reveal').dataset.stage==='final');
 await page.screenshot({path:`qa-ux/${tag}-revelacion-3d.png`});
 await act('rol');
 await act('ruta');if(summit){/* v14: el radar vuelve al final del Summit */assert.equal(await page.locator('#radar-box .rd-svg').count(),1);assert.equal(await page.locator('.rd-lab').count(),5);assert.equal(await page.locator('.sm-seal li').count(),4);}
 await shot('ruta');await act('opinion');await act('rank:A');await act('rank:C');
 await page.locator('[name=clarity][value="4"]').check();assert.equal(await page.locator('#clarity-value').textContent(),'4 de 5');
 await act('clear-clarity');assert.equal(await page.locator('[name=clarity]:checked').count(),0);
 await page.locator('[name=clarity][value="5"]').check();await shot('estrellas');await act('llevar');
 /* v14: sin descarga de Excel; las respuestas van a la base de datos. */assert.equal(await page.locator('[data-action="excel"]').count(),0);if(query.includes('quiosco'))assert(base.startsWith('file:')||await page.locator('.qr-code').count()===1,'QR del quiosco');
 if(!query.includes('quiosco')){assert.equal(await page.locator('#contact-form').count(),base.startsWith('file:')?0:1);const r=await page.locator('#card-img').evaluate(i=>i.getBoundingClientRect());assert(Math.abs(r.width/r.height-2/3)<.02,'tarjeta 2:3');}
 await act('rol');await act('review');await page.locator('details').filter({has:page.locator('[data-action="edit:P9"]')}).locator('summary').click();await act('edit:P9');
 await page.locator('[name=answer][value="__na"]').check();await page.locator('#q-submit').click();assert.equal(await page.getAttribute('body','data-screen'),'review');
 console.log(tag+' PASS '+seen.size+' preguntas, formatos, exportación, estrellas y edición');await ctx.close();
}
try{await run(1365,900,'','desktop');await run(390,844,'?recorrido=summit','mobile');await run(1080,1920,'?recorrido=summit&modo=quiosco&aviso=600&reinicio=900','kiosk');assert.deepEqual(errors,[]);console.log('PASS sin errores JS');}finally{await browser.close();}

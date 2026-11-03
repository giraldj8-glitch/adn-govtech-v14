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
  if(id==='C01'){assert.equal(await page.locator('.ux-tile').count(),10);await page.locator('.ux-tile:has(input[value="A"])').click();}
  else if(id==='C03'&&query.includes('quiosco')){/* v14: el buscador usa el teclado en pantalla del quiosco */
   const kb=async keys=>{await page.locator('#sector-search').click();await page.locator('#kbd [data-k="clear"]').click();for(const k of keys)await page.locator(`#kbd [data-k="${k}"]`).click();};
   await kb('SALUD');assert.equal(await page.locator('#sector-search').inputValue(),'Salud');assert(await page.locator('[name=answer][value=A]').isVisible());
   await page.locator('#kbd [data-k="ok"]').click();await page.locator('#kbd').waitFor({state:'detached'});await page.locator('.ux-choice:has([name=answer][value=A])').click();
   await kb('ZZZ');assert(await page.locator('#sector-empty').isVisible());await page.locator('#kbd [data-k="clear"]').click();await page.locator('#kbd [data-k="ok"]').click();await page.locator('#kbd').waitFor({state:'detached'});await shot('sectores');
  }else if(id==='C03'){
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
 /* 3-nov: con servidor, el texto abierto del quiosco pasa al celular (página del QR). */
 if(base.startsWith('http'))assert.equal(await page.locator('#fb-add').count(),0);
 else if(query.includes('quiosco')){await page.locator('#fb-add').click();for(const k of ['M','E','N','T','O','R','Í','A'])await page.locator(`#kbd [data-k="${k}"]`).click();await page.locator('#kbd [data-k="ok"]').click();await page.locator('#kbd').waitFor({state:'detached'});assert.equal(await page.locator('#fb-add').inputValue(),'Mentoría');}
 await page.locator('[name=clarity][value="4"]').check();assert.equal(await page.locator('#clarity-value').textContent(),'4 de 5');
 await act('clear-clarity');assert.equal(await page.locator('[name=clarity]:checked').count(),0);
 await page.locator('[name=clarity][value="5"]').check();await shot('estrellas');await act('llevar');
 /* v14: sin descarga de Excel; las respuestas van a la base de datos. */assert.equal(await page.locator('[data-action="excel"]').count(),0);if(query.includes('quiosco')&&base.startsWith('http')){/* v14: nombre al final con el teclado del quiosco y QR de la tarjeta guardada en el servidor */
  await page.locator('#org-name').click();for(const k of ['A','C','M','E'])await page.locator(`#kbd [data-k="${k}"]`).click();await page.locator('#kbd [data-k="ok"]').click();
  assert.equal(await page.locator('#org-name').inputValue(),'Acme');await act('qr-card');await page.locator('#qr-card .qr-code').waitFor({timeout:30000});
  const rid=await page.evaluate(()=>Object.values(sessionStorage).map(v=>{try{return JSON.parse(v).rid}catch{}}).find(Boolean));
  const pg=await page.request.get(base+'t/'+rid);assert.equal(pg.status(),200);assert((await pg.text()).includes('Acme'),'nombre en la página de la tarjeta');
  const im=await page.request.get(base+'t/'+rid+'/tarjeta.png?descargar=1');assert.equal(im.headers()['content-type'],'image/png');assert((im.headers()['content-disposition']||'').includes('ADN_GovTech_Acme.png'));
  console.log('kiosk tarjeta',Math.round((await im.body()).length/1024)+' KB');
  /* 3-nov: en el celular, la página del QR pide los datos de la empresa (todos opcionales; el correo exige autorización). */
  const ph=await browser.newPage({viewport:{width:390,height:844}});ph.on('pageerror',e=>errors.push('t: '+e.message));await ph.goto(base+'t/'+rid);
  assert.equal(await ph.locator('#f-org').inputValue(),'Acme');await ph.fill('#f-mail','prueba@ejemplo.com');await ph.fill('#f-desc','Software para trámites');
  await ph.locator('button[type=submit]').click();assert((await ph.locator('.err').textContent()).includes('autorización'));
  await ph.fill('#f-web','www.acme.test');await ph.fill('#f-int','Conectar con entidades');await ph.fill('#f-add','Mentoría');await ph.check('[name=autoriza]');
  await Promise.all([ph.waitForURL(/gracias=1/),ph.locator('button[type=submit]').click()]);assert.equal(await ph.locator('.ok').count(),1);
  await ph.screenshot({path:`qa-ux/${tag}-celular-gracias.png`,fullPage:true});await ph.close();
  const empty=await page.request.post(base+'t/'+rid,{form:{organizacion:'',email:''},maxRedirects:0});assert((empty.headers().location||'').includes('error=vacio'));
  if(process.env.ADMIN_PASSWORD){const x=await page.request.get(base+'admin/respuestas.json',{headers:{Authorization:'Basic '+Buffer.from('equipo:'+process.env.ADMIN_PASSWORD).toString('base64')}});
   const all=await x.json(),row=all.find(r=>r.id===rid);assert.equal(row.email,'prueba@ejemplo.com');assert.equal(row.empresa_descripcion,'Software para trámites');assert.equal(row.agregaria,'Mentoría');assert.equal(row.interes_futuro,'Conectar con entidades');assert.equal(row.empresa_web,'www.acme.test');globalThis.adminRows=all;}
  /* 3-nov: QR de datos del stand. Flota en el quiosco salvo en «Llévatelo»; /datos solo capta datos (sin «qué agregarían»). */
  assert(await page.locator('#info-qr').isHidden(),'sin QR flotante en Llévatelo');
  const dp=await browser.newPage({viewport:{width:390,height:844}});dp.on('pageerror',e=>errors.push('datos: '+e.message));await dp.goto(base+'datos');assert.equal(await dp.locator('#f-add').count(),0);
  await dp.locator('button[type=submit]').click();assert((await dp.locator('.err').textContent()).includes('al menos'));
  await dp.fill('#f-org','Stand SAS');await dp.fill('#f-mail','stand@ejemplo.com');await dp.fill('#f-desc','Pasó por el stand');await dp.check('[name=autoriza]');
  await Promise.all([dp.waitForURL(/gracias=1/),dp.locator('button[type=submit]').click()]);assert.equal(await dp.locator('.ok').count(),1);await dp.screenshot({path:`qa-ux/${tag}-datos-stand.png`,fullPage:true});await dp.close();
  if(process.env.ADMIN_PASSWORD){const x=await page.request.get(base+'admin/respuestas.json',{headers:{Authorization:'Basic '+Buffer.from('equipo:'+process.env.ADMIN_PASSWORD).toString('base64')}});
   const st=(await x.json()).find(r=>r.email==='stand@ejemplo.com'&&r.empresa_descripcion==='Pasó por el stand');assert.equal(st?.recorrido,'datos-stand');assert.equal(st.organizacion_contacto,'Stand SAS');}await page.screenshot({path:`qa-ux/${tag}-qr-tarjeta.png`,fullPage:true});}
 if(!query.includes('quiosco')&&base.startsWith('http')){/* 3-nov: el formulario del final pide los mismos datos opcionales de la empresa */
  /* 3-nov: también en celular o tableta del stand se puede generar el QR de la tarjeta */
  await act('qr-card');await page.locator('#qr-card .qr-code').waitFor({timeout:30000});
  const wid=await page.evaluate(()=>Object.values(localStorage).concat(Object.values(sessionStorage)).map(v=>{try{return JSON.parse(v).rid}catch{}}).find(Boolean));
  assert.equal((await page.request.get(base+'t/'+wid)).status(),200);
  await page.fill('#contact-desc','Consultoría en datos');await page.fill('#contact-add','Más ejemplos');await page.fill('#contact-mail','web@ejemplo.com');await page.locator('#contact-form button[type=submit]').click();
  assert((await page.locator('#contact-msg').textContent()).includes('autorización'));await page.check('#contact-ok');await page.locator('#contact-form button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#contact-msg').textContent.includes('Gracias'));await shot('llevar');
  if(process.env.ADMIN_PASSWORD){const x=await page.request.get(base+'admin/respuestas.json',{headers:{Authorization:'Basic '+Buffer.from('equipo:'+process.env.ADMIN_PASSWORD).toString('base64')}});
   const rid=await page.evaluate(()=>Object.values(localStorage).concat(Object.values(sessionStorage)).map(v=>{try{return JSON.parse(v).rid}catch{}}).find(Boolean));
   const row=(await x.json()).find(r=>r.id===rid);assert.equal(row?.agregaria,'Más ejemplos');assert.equal(row.empresa_descripcion,'Consultoría en datos');}}
 if(!query.includes('quiosco')){assert.equal(await page.locator('#contact-form').count(),base.startsWith('file:')?0:1);const r=await page.locator('#card-img').evaluate(i=>i.getBoundingClientRect());assert(Math.abs(r.width/r.height-2/3)<.02,'tarjeta 2:3');}
 await act('rol');if(query.includes('quiosco')&&base.startsWith('http')){assert(await page.locator('.v14-info-chip').isVisible(),'QR de datos flotante durante el recorrido');
  await page.locator('.v14-info-hide').click();assert(await page.locator('.v14-info-tab').isVisible(),'se oculta en una pestaña');await page.locator('.v14-info-tab').click();assert(await page.locator('.v14-info-chip').isVisible(),'vuelve a mostrarse');}await act('review');await page.locator('details').filter({has:page.locator('[data-action="edit:P9"]')}).locator('summary').click();await act('edit:P9');
 await page.locator('[name=answer][value="__na"]').check();await page.locator('#q-submit').click();assert.equal(await page.getAttribute('body','data-screen'),'review');
 console.log(tag+' PASS '+seen.size+' preguntas, formatos, exportación, estrellas y edición');await ctx.close();
}
try{await run(1365,900,'?recorrido=completo','desktop');await run(390,844,'?recorrido=summit','mobile');await run(1080,1920,'?recorrido=summit&modo=quiosco&aviso=600&reinicio=900','kiosk');assert.deepEqual(errors,[]);console.log('PASS sin errores JS');}finally{await browser.close();}

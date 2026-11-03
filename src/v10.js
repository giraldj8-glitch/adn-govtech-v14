/* ADN GovTech v10 · base v8 (misma matriz, modelo y reglas del v7; mismas transiciones, pastilla, riel y escenas 3D).
   Cambios v10, a partir del Figma «Servicio 1»:
   - colores por fase de UX/UI en las pantallas de color (intros de fase y portada del resultado);
   - preguntas sobre fondo claro con tarjetas de opción (letra A–D) y caja «Situación»;
   - revisión de respuestas por etapa, desplegable;
   - entregable con «Tu ADN en 3 líneas», rueda de 5 dimensiones y secuencia ADN en 3D,
     y los cuatro arquetipos de la diseñadora llevados a 3D. */
import './styles.css';
import './v7.css';
import './v8.css';
import './v10.css';
import {sealView,priorityText,badgeGallery} from './journey.js';
import {story,rules} from './result-story.js';
import {phases,dims,questions,byId,archetypes,archetypeDescriptions,narratives,tieQuestion,tieOptions,resolveTie,visible,valid,clean,answerText,profile,demo,resultPlan} from './model-v7.js';
import {mountScene,mountFloating,mountHelix,renderStill,renderBadge} from './fx/scenes.js';
import {badges} from './badge-data.js';
import {mountWheel3D,mountSequence3D} from './fx/charts3d.js';
import {glyph,ARCH_BG} from './fx/glyphs.js';
import {applyMotionAttr,toggleMotion,motionOK,onSystemMotionChange,reveal,cleanup,shake,splitWords,gsap} from './fx/motion.js';
import {run,assemble,loader,growBars} from './fx/transitions.js';

const KEY='adn-govtech-v10';
const main=document.querySelector('#main');
const live=document.querySelector('#live');
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* Degradados por fase del Figma (UX/UI): Perfil índigo-violeta, SER violeta-magenta, HACER índigo-lila, TENER magenta-rosa. */
const COLORS={perfil:['#241272','#5a3fd0'],ser:['#2a1478','#a2338e'],hacer:['#20188a','#7b59e6'],tener:['#6d1a7c','#e2508f']};
/* Colores de los arquetipos en la leyenda del Figma: A lavanda, B rosa, C durazno, D lila. */
const ARCH_COLORS=['#9b84ee','#ec4f9c','#f39a6e','#c084f0'];
/* Rasgos de cada arquetipo según la tarjeta de la diseñadora (Figma «Entregable Arquetipo»). */
const ARCH_TAGS=[['Arquitectura técnica','Eficiencia','Gobernanza formal'],['Retos adaptativos','Experimentación','Voz ciudadana'],['Rigor métrico','Estándares de nicho','Asesoría técnica'],['Agilidad temprana','Cercanía ciudadana','Prototipos']];
/* Apoyo en lenguaje sencillo por dimensión (validaciones con empresas). Redacción de trabajo: no cambia las dimensiones. */
const PLAIN={
 '01':['Qué problema público ayudas a resolver, a quién afecta y cómo se nota el cambio.','Ej.: menos filas para un trámite, más personas atendidas.'],
 '02':['Si prueban ideas antes de escalar y construyen con la entidad y los usuarios, en lugar de entregar una solución cerrada.','Ej.: un piloto corto, entrevistas con usuarios, ajustes según lo aprendido.'],
 '03':['Qué tanto conoces cómo funciona lo público: cómo contrata, cómo paga y cómo se toman las decisiones.','Ej.: procesos de contratación, pagos a 60–120 días, supervisión, cambios de equipo directivo.'],
 '04':['Cómo funciona tu tecnología, cómo se conecta con los sistemas de la entidad y cómo cuidas la información.','Ej.: manejo de datos personales, propiedad intelectual, integración con sistemas existentes.'],
 '05':['Si cuentas con equipo, soporte y recursos para sostener lo acordado en el tiempo.','Ej.: soporte después del despliegue, transferencia de conocimiento, plan ante fallas.']
};
const CHECK='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const JOURNEY=[['result','Mi ADN'],['route','Mi ruta'],['badges','Insignias'],['seal','Sello']];
const ARCH_SCENES=['arqA','arqB','arqC','arqD'];
const ARCH_SHORT=['Proveedor','Solucionador','Aliado','Potencial'];
const EXCLUSIVE={C02:'E',C03:'L',C04:'A'};
const FLOW=['chapter','question','review','tie'];
const LONG=['welcome','result','route','badges','seal','rules','demos','review'];
const isJourney=s=>JOURNEY.some(([id])=>id===s);

let priority='',answers={},screen='',current='',editing=false,isDemo=false,storageWarning=false;
let busy=false,queued=null,lastPoint=null;
const scenes=new Map();

function loadSaved(){try{return {answers:clean(JSON.parse(localStorage.getItem(KEY)||'{}')),priority:localStorage.getItem(KEY+'-priority')||''};}catch{storageWarning=true;return {answers:{},priority:''};}}
({answers,priority}=loadSaved());
function save(){if(isDemo)return;try{localStorage.setItem(KEY,JSON.stringify(answers));localStorage.setItem(KEY+'-priority',priority);}catch{storageWarning=true;live.textContent='No fue posible guardar. Mantén esta ventana abierta y descarga tu resultado al terminar.';}}
const hasSaved=()=>Object.keys(loadSaved().answers).length>0;

const button=(text,action,solid=false)=>`<button class="pill-btn ${solid?'solid':''}" type="button" data-action="${action}">${text}</button>`;
const footer=()=>`<footer class="v7-footer">Prototipo v10 · ADN GovTech · No otorga sello ni verifica evidencia.<br>Las respuestas se guardan solo en este navegador. No se envían a ninguna entidad. ${storageWarning?'El guardado local no está disponible; descarga tu resultado antes de cerrar.':''}</footer>`;
const scene=(kind,cls='ch-arch')=>`<div class="arch ${cls}" data-scene="${kind}" aria-hidden="true"></div>`;
const emLast=name=>{const w=name.split(' ');const last=w.pop();return `${w.join(' ')} <em>${last}</em>`;};
function flow(active){return `<nav class="v7-flow" aria-label="Etapas del recorrido">${phases.map(p=>`<span ${p.id===active?'aria-current="step"':''}>${p.label}<small>${p.name}</small></span>`).join('')}</nav>`;}
const phaseOf=(next,arg)=>next==='chapter'?arg:next==='question'?byId[arg]?.phase:null;
const firstOpenIn=phase=>{const qs=visible(answers).filter(q=>q.phase===phase);return qs.find(q=>!valid(q,answers[q.id]))||qs[0];};

/* ---------- Vistas ---------- */
/* Portada como en el Figma: menos texto, título en dos tonos y la doble hélice 3D dentro del arco con las cuatro etapas. */
function welcome(){return `<section class="fig-hero"><div class="landing"><div><h1 data-assemble>Descubre tu <em>ADN GovTech</em></h1><p class="lede">Lo que nos mueve. Cómo lo hacemos. Con qué contamos. Un punto de partida para reconocer tu forma de trabajar con lo público y orientar el siguiente paso.</p><div class="pill-row">${button('Empezar mi ADN →','start',true)}${hasSaved()?button('Continuar recorrido','resume'):''}</div><p class="fine"><strong>Primero conoces tu ADN; el sello viene después.</strong> Responder no equivale a demostrar una capacidad ni a recibir un reconocimiento. No incluyas información confidencial.</p><a class="scroll-cue" href="#cinco">Conoce las cinco dimensiones ↓</a></div>
 <div class="fh-wrap"><div class="fh-arch" aria-hidden="true"><div class="fh-3d" data-helix></div></div><ol class="fh-steps" aria-label="Etapas del recorrido">${phases.map((p,i)=>`<li style="--y:${[18,40,62,84][i]}%"><span class="n">${i+1}</span>${p.label}</li>`).join('')}</ol></div></div></section>
<section class="eight on-color" id="cinco"><div class="eight-inner" data-reveal><h2>Cinco dimensiones. Una lectura de tu organización.</h2><p class="intro">SER, HACER y TENER organizan el recorrido; no son niveles de madurez.</p><ul class="arch-grid v7-five">${dims.map(d=>`<li class="arch-card"><div class="arch" style="--abg:${ARCH_BG[d.icon]}">${glyph(d.icon)}</div><h3>${d.id} · ${d.name}</h3><p>${d.desc}</p><span class="grp">${d.phase}</span></li>`).join('')}</ul></div></section>
<section class="how light" data-reveal><h2>Del autodiagnóstico a un siguiente paso</h2><p class="how-note">20 preguntas de diagnóstico, 7 de contexto y 1 adicional si tienes experiencia pública. Solo si hay empate aparece una pregunta para precisar tu aporte. Al finalizar verás el patrón más frecuente, la explicación de tus respuestas y una ruta sugerida.</p>${flow('')}<div class="gbox ink cells c3"><div class="cell"><h3>01 · Reconocer</h3><p>Describes tu contexto y tus prácticas. Recibes tu ADN autodeclarado, agrupado en las mismas tres líneas.</p></div><div class="cell"><h3>02 · Fortalecer y sustentar</h3><p>Priorizas un aspecto y preparas evidencia. Puedes explorar una ruta de fortalecimiento o presentar lo que ya tienes.</p></div><div class="cell"><h3>03 · Revisar y reconocer</h3><p>El equipo revisa evidencia y criterios antes de reconocer insignias o un sello. Este prototipo no los concede.</p></div></div><p class="pill-row">${button('Explorar los cuatro arquetipos','demos')}${button('Ver flujo, reglas y guiones','rules')}${button('Traigo una necesidad pública','intra')}</p></section>${footer()}`;}

/* Intro de fase: estructura y animaciones del v8 con la tarjeta del Figma (pasos, panel de vidrio con la ilustración
   de la diseñadora en 3D y barra informativa). Los textos y conteos son los del modelo vigente. */
const PH3D={perfil:'phPerfil',ser:'phSer',hacer:'phHacer',tener:'phTener'};
const PH_INFO={perfil:'No necesitas haber contratado con el Estado para empezar. El tipo de organización, el sector y el tamaño no otorgan puntos ni excluyen del diagnóstico.',ser:'Responder no equivale a demostrar una capacidad ni a recibir un reconocimiento.',hacer:'Puedes volver, corregir o dejar una pregunta pendiente en cualquier momento.',tener:'Lo pendiente no se interpreta como falta de capacidad.'};
const DNA='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3c0 6 10 6 10 12s-10 6-10 6M17 3c0 6-10 6-10 12s10 6 10 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8.5 7h7M8.5 17h7M10 12h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function phSteps(n){return `<nav class="ph-steps" aria-label="Etapas del diagnóstico"><ol>${phases.map((p,i)=>`<li class="${i<n?'done':i===n?'now':''}" ${i===n?'aria-current="step"':''}><span class="ph-dot" aria-hidden="true">${i<n?CHECK:i+1}</span><span>${p.label}</span></li>`).join('')}</ol><p class="ph-of">Etapa ${n+1} de 4 <span class="ph-dna">${DNA}</span></p></nav>`;}
function chapter(id){
 const p=phases.find(p=>p.id===id),n=phases.indexOf(p),qs=visible(answers).filter(q=>q.phase===id);
 const panels=id==='perfil'
  ?['No necesitas haber contratado con el Estado para empezar.','El tipo de organización, el sector y el tamaño no otorgan puntos ni excluyen del diagnóstico.'].map((t,i)=>`<article class="panel ${i%2?'flip':''}" data-reveal><div class="panel-arch arch" style="--abg:${ARCH_BG[i?'07':'01']}" aria-hidden="true">${glyph(i?'07':'01')}</div><div><span class="panel-num">Antes de comenzar</span><p class="caption">${t}</p></div></article>`).join('')
  :dims.filter(d=>d.phase===id).map((d,i)=>`<article class="panel ${i%2?'flip':''}" data-reveal><div class="panel-arch arch" style="--abg:${ARCH_BG[d.icon]}" aria-hidden="true">${glyph(d.icon)}</div><div><span class="panel-num">ADN ${d.id}</span><h2>${emLast(d.name)}</h2><p class="caption">${d.desc}</p><p class="plain-note"><b>En palabras simples:</b> ${PLAIN[d.id][0]} <span>${PLAIN[d.id][1]}</span></p><ul class="chips">${d.parts.map(x=>`<li>${x}</li>`).join('')}</ul><p class="panel-meta">${questions.filter(q=>q.dim===d.id).length} preguntas en esta etapa</p></div></article>`).join('');
 const count=id==='perfil'?`${qs.length} preguntas de contexto · 3 opcionales · no puntúan`:`${qs.length} preguntas de diagnóstico · puedes volver y corregir`;
 return `<section class="stage chapter v8-chapter fig-chapter"><div class="stage-inner">${phSteps(n)}<div class="chapter-grid"><div><p class="big-num" aria-hidden="true">${p.label}</p><p class="stage-kicker ph-kicker">Antes de comenzar · ${id==='perfil'?'Perfil':'Fase '+p.label}</p><h1 data-assemble>${p.name}</h1><p class="ch-lede">${p.intro}</p><p class="ph-count">${count}</p><div class="pill-row">${button('Comenzar esta etapa →','phase:'+id,true)}<button class="link-btn" type="button" data-action="chapter-back">← Volver</button></div><a class="scroll-cue" href="#paneles">${id==='perfil'?'Lo que conviene saber':'Lo que exploraremos'} ↓</a></div><div class="ch-glass" aria-hidden="true"><div class="ph3d" data-floating="${PH3D[id]}"></div></div></div>
 <p class="ph-info"><span class="ph-i" aria-hidden="true">i</span>${PH_INFO[id]}</p></div>
 <div class="panels" id="paneles">${panels}<div class="panel-end" data-reveal><p>${p.label} · ${p.name}</p>${button('Comenzar esta etapa →','phase:'+id,true)}</div></div></section>`;
}

function help(q){if(q.id==='C02')return 'Elige primero tu aporte principal y, si corresponde, uno secundario. Máximo dos. “Por definir” es excluyente.';if(q.id==='C03')return 'Elige primero el sector principal y hasta dos secundarios. Son etiquetas de contexto, no puntos.';if(q.id==='C04')return 'Puedes elegir varias experiencias. “Ninguna todavía” es excluyente.';if(q.id==='C07')return 'Ambos campos son opcionales. No incluyas direcciones particulares.';return q.dim?'Elige la opción que más se aproxima a tu práctica actual. Si ninguna te representa, puedes dejarla pendiente de aclarar.':q.optional?'Esta pregunta es opcional.':'Selecciona una opción. Esta información no puntúa.';}

/* Separa la situación del enunciado sin cambiar el texto literal (solo si antes de la pregunta hay una oración completa). */
function splitQuestion(text){const i=text.indexOf('¿');if(i<0)return {situation:'',ask:text};const before=text.slice(0,i),cut=before.lastIndexOf('. ');if(cut<0)return {situation:'',ask:text};return {situation:text.slice(0,cut+1).trim(),ask:text.slice(cut+2).trim()};}
const isFull=t=>/^(otr[ao]|no estoy|ninguna|por definir|prefiero|aún|no sé)/i.test(t)||/cuál\?$/i.test(t);

function question(id){
 const q=byId[id],list=visible(answers),a=answers[id]||{},p=phases.find(p=>p.id===q.phase),inPhase=list.filter(x=>x.phase===q.phase);
 const {situation,ask}=splitQuestion(q.pregunta);
 const tiles=q.id==='C06';
 const wide=q.opciones.some(o=>o.texto.length>120);
 const opt=o=>{const tile=tiles&&!isFull(o.texto);return `<label class="qopt ${tile?'tile':''} ${!tile&&isFull(o.texto)?'full':''}"><input type="${q.multi?'checkbox':'radio'}" name="answer" value="${o.letra}" ${a.values?.includes(o.letra)?'checked':''}>${q.dim?`<span class="qopt-letter" aria-hidden="true">${o.letra}</span>`:''}<span class="qopt-text">${tile?`<b>${e(o.texto)}</b><small>${o.texto==='1'?'persona':'personas'}</small>`:e(o.texto)}${EXCLUSIVE[q.id]===o.letra?'<small class="excl">Excluye las demás opciones</small>':''}</span><span class="qopt-mark ${q.multi?'box':''}" aria-hidden="true">${CHECK}</span></label>`;};
 const options=q.id==='C07'
  ?`<div class="qfields">${q.opciones.map((o,i)=>`<label for="territory-${i}">${e(o.texto)}</label><input id="territory-${i}" name="territory-${i}" type="text" maxlength="300" value="${e(a.fields?.[i]||'')}">`).join('')}</div>`
  :`<fieldset class="qopts ${tiles?'tiles':wide?'one-col':''}" aria-labelledby="q-title"><legend class="sr-only">Opciones de respuesta</legend>${q.opciones.map(opt).join('')}</fieldset>`;
 return `<section class="qv"><div class="qv-inner"><p class="stage-kicker qv-kicker"><span>${p.label}</span><span class="sep">/</span><span>Pregunta ${list.indexOf(q)+1} de ${list.length}</span><span class="sep">·</span><span>${inPhase.indexOf(q)+1} de ${inPhase.length} en esta etapa</span>${isDemo?'<span class="sep">·</span><span>Caso ficticio</span>':''}</p>
 <form id="question-form" class="qv-card" novalidate><div class="q-tags"><span class="tag code">${q.id}</span><span class="tag">${q.dim?'ADN '+q.dim+' · '+dims.find(d=>d.id===q.dim).name:'Contexto · no puntúa'}</span></div>
 <h1 id="q-title">${e(ask)}</h1><p class="hint">${help(q)}</p>
 ${situation?`<div class="situation"><p class="eyebrow">Situación</p><p>${e(situation)}</p></div>`:''}
 ${options}
 ${q.id==='C02'||q.id==='C03'?'<p class="selection-order" id="selection-order" aria-live="polite"></p>':''}
 ${q.opciones.some(o=>/cuál\?/i.test(o.texto))?`<div class="qfields" id="other-field" hidden><label for="other">¿Cuál? (opcional)</label><input id="other" type="text" maxlength="500" value="${e(a.note||'')}"></div>`:''}
 ${q.id==='C05'?`<div class="qfields"><label for="other">¿Qué facilitó o dificultó el proceso? (opcional)</label><textarea id="other" maxlength="700" placeholder="Sin nombres ni datos confidenciales">${e(a.note||'')}</textarea></div>`:''}
 <p class="error" id="error" role="alert"></p>
 <div class="qv-foot"><button class="pill-btn" type="button" data-action="back">← Volver</button><span class="q-status" id="q-status"></span><button class="pill-btn solid" type="submit" id="q-submit">${editing?'Guardar cambio':'Continuar'} →</button></div>
 ${q.optional||q.dim?`<button class="link-btn qv-skip" type="button" data-action="skip">${q.optional?'Omitir esta pregunta opcional':'Dejar pendiente / no aplica a nuestra oferta'}</button>`:''}</form>
 <p class="v7-save">Guardado local · ${button('Pausar y volver al inicio','welcome')}</p></div></section>`;
}

/* Revisión por etapas: clave antes de ver el resultado. */
function review(){
 const list=visible(answers),done=list.filter(q=>valid(q,answers[q.id])).length;
 return `<section class="page light rv10"><p class="eyebrow">Antes de conocer tu ADN</p><h1>Así describes tu organización.</h1><p class="lead">${done===list.length?`Las ${list.length} preguntas tienen respuesta.`:`${done} de ${list.length} preguntas tienen respuesta. Lo pendiente no se interpreta como falta de capacidad.`} Puedes corregir sin repetir el recorrido.</p>
 <div class="rv-list">${phases.map((p,n)=>{const qs=list.filter(q=>q.phase===p.id),k=qs.filter(q=>valid(q,answers[q.id])).length;return `<details class="rv-phase" style="--g1:${COLORS[p.id][0]};--g2:${COLORS[p.id][1]}" ${n===0&&k<qs.length?'open':''}><summary><span class="rv-num">${n+1}</span><span class="rv-name"><b>${p.label} · ${p.name}</b><small>${k} de ${qs.length} preguntas respondidas</small></span><span class="rv-check ${k===qs.length?'ok':''}">${k===qs.length?CHECK:''}</span><span class="rv-open">Revisar</span></summary>${qs.map(q=>`<div class="rv-row"><div><strong>${q.id} · ${e(q.pregunta)}</strong><p>${e(answerText(q,answers[q.id]))}</p></div><button class="link-btn" type="button" data-action="edit:${q.id}">Editar <span class="sr-only">${q.id}</span></button></div>`).join('')}</details>`;}).join('')}</div>
 <div class="pill-row">${button('Ver mi ADN →','result',true)}${button('Volver al inicio','welcome')}</div></section>${footer()}`;
}

/* ---------- Datos de los gráficos ---------- */
const optOf=q=>{const a=answers[q.id];return valid(q,a)&&!a.skip?q.opciones.find(o=>o.letra===a.values[0]):null;};
const colorOf=q=>{const o=optOf(q);return o?ARCH_COLORS[archetypes.indexOf(o.arquetipo)]:null;};
const seqGroups=()=>{const qs=questions.filter(q=>q.dim);let i=0;return phases.filter(p=>p.id!=='perfil').map(p=>{const n=qs.filter(q=>q.phase===p.id).length,g={label:`${p.label} · ${n}`,from:i,to:i+n-1};i+=n;return g;});};
const seqNodes=()=>questions.filter(q=>q.dim).map(q=>{const o=optOf(q);return {id:q.id,letter:o?.letra||'',color:o?ARCH_COLORS[archetypes.indexOf(o.arquetipo)]:null};});
const wheelSectors=()=>dims.map(d=>{const qs=questions.filter(q=>q.dim===d.id);return {num:d.id,name:d.name,total:qs.length,done:qs.filter(q=>optOf(q)).length,rings:qs.map(colorOf)};});
const pendingCount=()=>questions.filter(q=>q.dim&&!optOf(q)).length;

/* Respaldo en SVG (sin WebGL): secuencia y rueda planas, con la misma información. */
function seqSVG(){
 const nodes=seqNodes(),groups=seqGroups(),step=40,gap=28,cy=84;let x=34;const pos=[];
 groups.forEach(g=>{for(let i=g.from;i<=g.to;i++){pos[i]=x;x+=step;}x+=gap;});
 const W=x-gap+34;let s1='',s2='';for(let t=0;t<=W;t+=6){s1+=`${t?'L':'M'}${t} ${(cy+Math.sin(t/20)*22).toFixed(1)}`;s2+=`${t?'L':'M'}${t} ${(cy-Math.sin(t/20)*22).toFixed(1)}`;}
 return `<svg class="seq2d" viewBox="0 0 ${W} 150" role="presentation"><path d="${s1}" class="strand a"/><path d="${s2}" class="strand b"/>${groups.map(g=>`<text x="${(pos[g.from]+pos[g.to])/2}" y="16" class="br-label">${g.label}</text>`).join('')}${nodes.map((n,i)=>`<circle cx="${pos[i]}" cy="${cy}" r="14" fill="${n.color||'#fff'}" stroke="${n.color?'#fff':'#cfc5ea'}" stroke-width="3"/><text x="${pos[i]}" y="${cy+5}" class="node-l">${n.color?n.letter:'·'}</text><text x="${pos[i]}" y="${cy+50}" class="node-id">${n.id}</text>`).join('')}</svg>`;
}
function wheelSVG(){
 const cx=220,cy=210,R0=70,W=24,G=5,pol=(r,a)=>[cx+r*Math.cos(a),cy-r*Math.sin(a)],rad=d=>d*Math.PI/180;
 const arc=(r0,r1,a0,a1)=>{const [x0,y0]=pol(r1,a0),[x1,y1]=pol(r1,a1),[x2,y2]=pol(r0,a1),[x3,y3]=pol(r0,a0);return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r1} ${r1} 0 0 0 ${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}A${r0} ${r0} 0 0 1 ${x3.toFixed(1)} ${y3.toFixed(1)}Z`;};
 return `<svg class="wheel2d" viewBox="-40 0 520 420" role="presentation">${wheelSectors().map((s,k)=>{const mid=Math.PI/2-k*2*Math.PI/5,a0=mid-rad(31),a1=mid+rad(31);return [0,1,2,3,4].map(j=>{const used=j<s.rings.length,c=used?(s.rings[j]||'#ffffff'):'none';return `<path d="${arc(R0+j*(W+G),R0+j*(W+G)+W,a0,a1)}" fill="${c}" stroke="${used?'#e7defb':'#cfc3f3'}" ${used?'':'stroke-dasharray="4 4"'}/>`;}).join('')+(()=>{const [lx,ly]=pol(R0+5*(W+G)+26,mid);return `<text x="${lx.toFixed(0)}" y="${ly.toFixed(0)}" text-anchor="middle" class="wh-num">${s.num} · ${s.done}/${s.total}</text>`;})();}).join('')}<circle cx="${cx}" cy="${cy}" r="${R0-10}" fill="#1e0f5c"/><text x="${cx}" y="${cy+6}" text-anchor="middle" class="wh-core-t">${20-pendingCount()}</text></svg>`;
}

/* Galería de los cuatro perfiles, con el nombre gigante delineado y una escena por perfil. */
function archSlider({start=0,own=[],affinity=[],demoMode=false,title='Los cuatro perfiles GovTech',eyebrow='Explora los demás perfiles'}){
 return `<section class="arch-slider" data-slider data-index="${start}" aria-roledescription="carrusel" aria-label="${title}"><div class="as-head"><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><p class="as-help">Usa las flechas o los puntos para cambiar de perfil.</p></div>
 <div class="as-stage"><p class="as-outline" aria-hidden="true">${ARCH_SHORT[start]}</p><div class="arch as-arch" data-scene="${ARCH_SCENES[start]}" aria-hidden="true"></div>
 <div class="as-slides">${archetypes.map((a,i)=>`<article class="as-slide" role="group" aria-roledescription="diapositiva" aria-label="${i+1} de 4: ${a}" ${i===start?'':'hidden'}><p class="as-num">0${i+1} / 04 ${own.includes(a)?'<span class="as-badge">Tu ADN</span>':affinity.includes(a)?'<span class="as-badge soft">Afinidad</span>':''}</p><h3>${a}</h3><p class="as-desc">${archetypeDescriptions[i]}</p><p class="as-phrase">“${narratives[i].phrase}”</p><ul class="chips">${narratives[i].scenarios.map(s=>`<li>${s}</li>`).join('')}</ul>${demoMode?`<div class="pill-row">${button('Ver este ADN →','demo:'+i,true)}</div>`:''}</article>`).join('')}</div></div>
 <div class="as-controls"><button class="as-btn as-prev" type="button" aria-label="Perfil anterior">←</button><ol class="as-dots">${archetypes.map((a,i)=>`<li><button class="as-dot" type="button" aria-label="Ver ${a}" aria-current="${i===start}"></button></li>`).join('')}</ol><button class="as-btn as-next" type="button" aria-label="Perfil siguiente">→</button></div></section>`;
}

/* ---------- Entregable ---------- */
function result(){
 const plan=resultPlan(answers),r=plan.profile;const one=r.leaders.length===1;const name=one?r.leaders[0]:r.leaders.length?'Perfil combinado':'Perfil por completar';
 const idx=one?archetypes.indexOf(name):-1;const word=idx>=0?ARCH_SHORT[idx]:r.leaders.length?'Combinado':'ADN';
 const route=plan.routes.length===1?plan.routes[0]:null;
 const lines=route?[['Tu patrón',`${r.counts[route.archetype]} de tus ${r.answered} respuestas apuntan a <b>${route.archetype}</b>.`],['Qué significa',route.meaning],['Tu oportunidad',route.opportunity]]
  :r.leaders.length?[['Tu patrón',`Tus respuestas reparten su peso entre <b>${r.leaders.join(' y ')}</b>.`],['Qué significa','No forzamos una etiqueta cuando las respuestas no permiten distinguir un único patrón.'],['Tu oportunidad',plan.routes.map(n=>n.opportunity).join(' ')]]
  :[['Tu patrón','Todavía no hay respuestas diagnósticas seleccionadas.'],['Qué significa','Completa las preguntas para construir esta lectura.'],['Tu oportunidad','Lo pendiente no se interpreta como falta de capacidad.']];
 const status=!r.answered?'':!r.complete?`Lectura parcial: quedan ${20-r.answered} preguntas pendientes. El patrón puede cambiar al completarlas.`:r.resolved?`Tus respuestas empataron. La elección adicional destacó ${r.leaders[0]}; también hay afinidad con ${r.affinities.join(' y ')}. Los conteos no cambian.`:r.leaders.length===1&&r.margin===1?'La diferencia es de una sola respuesta: conviene leer los otros patrones antes de concluir.':'Es el patrón con más respuestas asociadas; no es lo único que tu organización puede aportar.';
 const legend=`<ul class="arch-legend">${archetypes.map((a,i)=>`<li class="${r.leaders.includes(a)?'is-lead':''}"><span class="lg-dot" style="--c:${ARCH_COLORS[i]}">${'ABCD'[i]}</span>${a}<b>${r.counts[a]}</b></li>`).join('')}</ul>`;
 return `<section class="v8-result-hero"><p class="rh-outline" aria-hidden="true"><span>${(word+' · ').repeat(6)}</span><span>${(word+' · ').repeat(6)}</span></p><div class="landing"><div><p class="kicker">${isDemo?'Caso ficticio · ':''}Tu ADN GovTech · Autodeclarado</p><h1 data-assemble>${name}</h1><p class="lede">${one?archetypeDescriptions[idx]:'Tu lectura reúne prácticas diferentes. No necesitas encajar en una sola etiqueta.'}</p><p>Una orientación sobre tu forma de aportar, no una calificación ni un sello.</p>
 <div class="rv-counts"><p class="rc-title">Cómo se reparten tus respuestas diagnósticas</p>${archetypes.map((a,i)=>`<div class="rc ${r.leaders.includes(a)?'lead':''}"><span class="rc-name"><i class="rc-dot" style="--c:${ARCH_COLORS[i]}"></i>${a}</span><span class="rc-bar" aria-hidden="true"><i style="--v:${r.counts[a]/20};--c:${ARCH_COLORS[i]}"></i></span><b>${r.counts[a]}</b></div>`).join('')}<p class="rc-note">Asociaciones de tus respuestas con cada perfil, según la matriz. No es un puntaje, una medida de madurez ni evidencia verificada.</p></div>
 <div class="pill-row">${button('Revisar mis respuestas','review')}${button('Descargar mi resultado','download',true)}</div></div>${scene(idx>=0?ARCH_SCENES[idx]:'hero','hero-arch')}</div></section>

 <section class="page light r10" aria-labelledby="tres-lineas"><p class="eyebrow">Tu resultado, en pocas palabras</p><h2 id="tres-lineas">Tu ADN en 3 líneas</h2>
 <div class="gbox ink cells c3 three-lines" data-reveal>${lines.map(([t,d],i)=>`<div class="cell"><span class="tl-num">${i+1}</span><p class="eyebrow">${t}</p><p>${d}</p></div>`).join('')}</div>${status?`<p class="result-status">${status}</p>`:''}</section>

 <section class="page light r10" data-reveal><div class="dims-card"><div class="dims-copy"><p class="eyebrow">Tus 5 dimensiones</p><h2>Así se ve tu ADN GovTech</h2><p class="muted">Cada sector es una dimensión y cada anillo una de tus respuestas, con el color del arquetipo de la opción elegida. Todos miden lo mismo: no hay niveles.</p>${legend}<p class="fine">${pendingCount()?`${pendingCount()} anillos en blanco: preguntas pendientes.`:'Las 20 preguntas de diagnóstico tienen respuesta.'} Las líneas punteadas solo completan la forma.</p></div>
 <div class="chart3d wheel3d" data-chart="wheel" role="img" aria-label="Rueda del ADN: ${wheelSectors().map(s=>`${s.name}, ${s.done} de ${s.total} respuestas`).join('; ')}."></div><ol class="wheel-key" aria-hidden="true">${wheelSectors().map(s=>`<li><b>${s.num}</b> ${s.name} · ${s.done}/${s.total}</li>`).join('')}</ol></div></section>

 <section class="page light r10" data-reveal><p class="eyebrow">Tu secuencia ADN</p><h2>Tus 20 respuestas, en orden</h2><p class="muted">Cada esfera es una respuesta. La letra y el color indican el arquetipo asociado a la opción elegida.</p>
 <div class="seq-scroll"><div class="chart3d seq3d" data-chart="seq" role="img" aria-label="Secuencia de 20 respuestas. ${pendingCount()} pendientes."></div></div>${legend.replace('arch-legend','arch-legend inline')}</section>

 <section class="page light r10" data-reveal><div class="gbox ink cells c2 practices"><div class="cell"><h3>Lo que aparece en tus respuestas</h3>${plan.highlights.length?plan.highlights.map(t=>`<div class="story-practice"><span class="eyebrow">${t.phase} · ADN ${t.dim} · ${t.id}</span><h4>${dims.find(d=>d.id===t.dim).name}</h4><p>${e(t.answer)}</p><small>Respuesta asociada a ${t.archetype}</small></div>`).join(''):'<p>Completa las preguntas para construir esta lectura.</p>'}</div><div class="cell"><h3>Escenarios donde podrías aportar</h3><div class="scenario-tags">${[...new Set(plan.routes.flatMap(n=>n.scenarios))].map(s=>`<span>${s}</span>`).join('')}</div><p class="fine">Son posibilidades de participación, no convocatorias ni oportunidades confirmadas. La oportunidad es una sugerencia de desarrollo, no una carencia detectada.</p></div></div>
 <details class="decision-detail"><summary>¿Por qué apareció este resultado?</summary><p>Cada respuesta diagnóstica elegida suma una asociación al arquetipo indicado en la matriz. El que acumula más asociaciones es el predominante. No se exige superar la mitad: “más frecuente” no siempre significa “mayoría”. Caracterización y pendientes no suman; todos los ítems pesan igual.</p><div class="trace-scroll"><table><caption>Trazabilidad de tus decisiones</caption><thead><tr><th>Pregunta</th><th>Dimensión</th><th>Arquetipo asociado</th></tr></thead><tbody>${plan.trace.map(t=>`<tr><td>${t.id}</td><td>${t.dim} · ${dims.find(d=>d.id===t.dim).name}</td><td>${t.archetype}</td></tr>`).join('')}</tbody></table></div></details></section>

 <section class="next-band" data-reveal><div><p class="eyebrow">Tu siguiente paso</p><h2>Mira qué puedes preparar para fortalecer tu oferta ante lo público.</h2></div><div class="pill-row">${button('Ver mi ruta →','route',true)}${button('Revisar mis respuestas','review')}</div></section>

 <section class="page light r10" aria-labelledby="cuatro"><p class="eyebrow">Sello B-GovTech</p><h2 id="cuatro">Cuatro formas de aportar al ecosistema GovTech</h2><p class="muted">Ninguna es mejor que otra. Cada una describe cómo tu organización aporta.</p>
 <div class="arch-cards" data-reveal>${archetypes.map((a,i)=>`<article class="arch-card10 ${r.leaders.includes(a)?'own':''}" style="--c:${ARCH_COLORS[i]}"><div class="ac-art" data-still="${ARCH_SCENES[i]}">${r.leaders.includes(a)?'<span class="ac-badge">'+CHECK+'Tu arquetipo</span>':r.affinities.includes(a)?'<span class="ac-badge soft">Afinidad</span>':''}</div><p class="eyebrow">Arquetipo ${'ABCD'[i]} · ${r.counts[a]} respuestas</p><h3>${a}</h3><p>${archetypeDescriptions[i]}</p><ul class="ac-tags">${ARCH_TAGS[i].map(t=>`<li>${t}</li>`).join('')}</ul></article>`).join('')}</div></section>

 <section class="page light r10" id="adn-completo"><details class="v7-method full-adn"><summary>Ver mis 20 respuestas por dimensión</summary>${phases.filter(p=>p.id!=='perfil').map(p=>`<section class="v7-result-phase" id="resultado-${p.id}"><header><span>${p.label}</span><h2>${p.name}</h2></header><div class="v7-dimension-grid">${dims.filter(d=>d.phase===p.id).map(d=>{const qs=questions.filter(q=>q.dim===d.id),done=qs.filter(q=>answers[q.id]&&!answers[q.id].skip);return `<article class="v7-dimension"><span class="eyebrow">ADN ${d.id}</span><h3>${d.name}</h3><p class="tag">${done.length} de ${qs.length} prácticas descritas</p>${qs.map(q=>`<div class="v7-trace"><strong>${q.id} · ${e(q.pregunta)}</strong><p>${e(answerText(q,answers[q.id]))}</p></div>`).join('')}<h4>Un siguiente paso posible</h4><p>${d.next}</p><p class="muted"><strong>Evidencia que podrías preparar:</strong> ${d.evidence}</p></article>`;}).join('')}</div></section>`).join('')}</details>
 <details class="v7-method"><summary>Alcance y relaciones pendientes de revisión</summary><p>Cada opción conserva el arquetipo asociado en la matriz fuente. Para mostrar un perfil orientativo contamos esas asociaciones en las 20 preguntas de diagnóstico y mostramos la más frecuente; si hay empate, una pregunta adicional permite elegir el aporte predominante sin modificar esos conteos. Esta es la regla de decisión implementada para el prototipo a solicitud del equipo; debe contrastarse con empresas antes de su uso operativo. No mide madurez ni genera puntos para insignias o sello.</p><p>La ubicación de P0.4 en preparación para lo público conserva una interpretación provisional de la matriz. Se mantiene el texto de Daniela, incluidos los supuestos de sus casos; no se presentan como reglas generales.</p></details>
 <div class="pill-row">${button('Continuar a mi ruta →','route',true)}${button('Revisar mis respuestas','review')}${button('Imprimir / guardar PDF','print')}${button('Volver al inicio','welcome')}</div><p class="fine">Autodeclarado y sin verificar. No es una calificación ni otorga insignias o sello. Interpretación pendiente de validar con usuarios.</p></section>${footer()}`;
}


/* ---------- Ruta e insignias con la presentación del Figma («Entregable ADN Govtech») ---------- */
/* Textos cortos de las tarjetas de insignia según la diseñadora; el detalle «Qué tener listo» sale del catálogo (badge-data). */
const BADGE_SHORT={'01':'Muestras qué problema público resuelves y qué cambia para las personas.','02':'Pruebas tus ideas con usuarios reales antes de llevarlas a escala.','03':'Construyes junto a entidades, usuarios y aliados, con acuerdos claros.','04':'Conoces cómo compra el Estado y adaptas tu oferta a sus tiempos.','05':'Tu tecnología protege los datos y deja una salida clara si termina el contrato.'};
function route10(){
 const plan=resultPlan(answers);
 const cards=plan.routes.map(n=>`<article class="route10" data-reveal><div><p class="eyebrow">${n.archetype}</p><h2>Tu ruta: ${n.route}</h2><p class="muted">${n.opportunity}</p><ol class="num10">${n.steps.map(st=>`<li>${st}</li>`).join('')}</ol></div><aside class="deliv10"><p class="eyebrow">Entregable de la ruta</p><p><strong>${n.deliverable}</strong></p></aside></article>`).join('')||'<p>Completa el diagnóstico para recibir una ruta vinculada a tus respuestas.</p>';
 return `<section class="page light j10"><p class="eyebrow">Ruta de fortalecimiento</p><h1>Tu siguiente paso.</h1><p class="lead">El patrón orienta una propuesta. Tu prioridad ayuda a decidir por dónde empezar.</p>${cards}
 <section class="card10" id="elegir-prioridad" data-reveal><p class="eyebrow">Tu prioridad</p><h2>¿Qué quieres fortalecer primero?</h2><label for="priority">Mi prioridad</label><select id="priority"><option value="">Selecciona una dimensión</option>${dims.map(d=>`<option value="${d.id}" ${priority===d.id?'selected':''}>${d.id} · ${d.name}</option>`).join('')}</select><div id="priority-detail" class="prio10" aria-live="polite"></div></section>
 <h2 class="j10-h2">Puedes avanzar por distintas vías</h2><div class="gbox ink cells c3" data-reveal><div class="cell"><h3>Ya tengo evidencia</h3><p>Organiza documentos, demostraciones o resultados existentes. No necesitas repetir una formación para mostrar lo que ya has trabajado.</p></div><div class="cell"><h3>Quiero fortalecer</h3><p>Explora puede acompañar el enfoque público, la experimentación y la colaboración. El equipo debe confirmar la actividad y el producto esperado.</p></div><div class="cell"><h3>Tengo un caso o una prueba</h3><p>Registra lo realizado, su alcance y lo que una contraparte puede confirmar. Una prueba aplicada también puede producir evidencia.</p></div></div>
 <p class="fine">Tecnología y continuidad pueden requerir trabajo propio y apoyo especializado. Las rutas no inscriben en servicios ni prometen cupos.</p>
 <div class="pill-row">${button('Explorar las insignias →','badges',true)}${button('Volver a mi ADN','result')}</div><p class="fine">Autodeclarado y sin verificar. No es una calificación ni otorga insignias o sello. Interpretación pendiente de validar con usuarios.</p></section>${footer()}`;
}
function badges10(){
 return `<section class="page light j10"><p class="eyebrow">Tus insignias</p><h1>Cinco logros que puedes ir construyendo.</h1><p class="lead">Cada insignia reconoce algo concreto que hace tu organización. <strong>Todavía no tienes ninguna:</strong> aquí ves qué significa cada una.</p>
 <div class="badge10-grid" data-reveal>${badges.map(b=>`<article class="badge10"><div class="b10-art" data-badge="b${b.id}"><span class="b10-chip">ADN ${b.dim}</span></div><h3>${b.name}</h3><p>${BADGE_SHORT[b.id]}</p><details><summary>Qué tener listo</summary><p>${b.evidence}</p></details><span class="b10-status">Por explorar · no otorgada</span></article>`).join('')}</div>
 <section class="card10 steps10" data-reveal><h2>Así avanza una insignia</h2><ol>${[['Declarar','Cuentas lo que haces.'],['Sustentar','Lo respaldas con evidencia.'],['Verificar','Alguien más lo confirma.']].map(([t,d],i)=>`<li class="${i===0?'here':''}"><span class="st10">${i+1}</span><div><b>${t}</b><small>${d}</small>${i===0?'<em>Aquí estás</em>':''}</div></li>`).join('')}</ol>${button('Ver mi ruta →','route',true)}</section>
 <p class="fine">Escala de trabajo previa, pendiente de conciliar con la propuesta de insignias internas de fortalecimiento de la bitácora. Asistencia, aprendizaje y verificación no significan lo mismo. La dimensión Recursos y continuidad permanece en el ADN, aunque el catálogo actual no le asigna una insignia propia.</p>
 <div class="pill-row">${button('Ver mi avance hacia el sello →','seal',true)}${button('Volver a mi ruta','route')}</div></section>${footer()}`;
}

function demos(){return `<section class="page light demos-head"><p class="eyebrow">Explora sin responder</p><h1>Cuatro formas de aportar.</h1><p class="lead">Casos ficticios que muestran el funcionamiento. No reemplazan tus respuestas guardadas ni representan niveles de calidad.</p><p class="pill-row">${button('Probar un empate →','demo-tie')}${button('Ver flujo, reglas y guiones','rules')}</p></section>${archSlider({demoMode:true,title:'Cuatro casos ficticios',eyebrow:'Desliza entre los perfiles'})}<section class="page light"><p>${button('Volver al inicio','welcome')}</p></section>${footer()}`;}
function intra(){return `<section class="page light"><p class="eyebrow">Una ruta según tu necesidad</p><h1>¿Traes un reto público, más que una oferta?</h1><p class="lead">Intra puede ser una ruta de orientación para una entidad que busca abordar una necesidad. No te trasladamos automáticamente por ser una entidad pública.</p><p>En este prototipo no se envían tus datos ni se realiza una inscripción. El equipo debe confirmar contigo cuál servicio corresponde.</p><div class="pill-row">${button('Tengo una oferta: continuar mi ADN','continue-offer',true)}${button('Dejar esta ruta como orientación','orientation')}${button('Volver a mi aporte','question:C02')}</div></section>${footer()}`;}
function orientation(){return `<section class="page light"><p class="eyebrow">Orientación, no inscripción</p><h1>Tu siguiente conversación es con el equipo de Intra.</h1><p class="lead">Describe la necesidad pública que quieres abordar. El equipo puede ayudarte a confirmar la ruta. No hemos enviado ni registrado una solicitud.</p>${button('Volver al inicio','welcome')}</section>`;}
function tieView(){const p=profile(answers);return `<section class="page light"><p class="eyebrow">Una precisión para personalizar tu ADN</p><h1>Encontramos más de una forma de aportar.</h1><p class="lead">Tus respuestas muestran afinidad con varios perfiles. Esta elección nos ayuda a destacar uno sin perder los otros rasgos.</p><form id="tie-form" novalidate><fieldset><legend><h2>${tieQuestion}</h2></legend>${p.candidates.map(a=>{const i=archetypes.indexOf(a);return `<label class="tie-option"><input required type="radio" name="tie" value="${i}"><span>${tieOptions[i]}</span></label>`;}).join('')}</fieldset><p class="error" id="error" role="alert"></p><div class="pill-row"><button class="pill-btn solid" type="submit">Ver mi ADN →</button>${button('Revisar respuestas','review')}</div></form></section>`;}

function render(next,arg){
 switch(next){
  case 'tie':return tieView();case 'route':return route10();case 'badges':return badges10();case 'seal':return sealView(answers,priority).replace(badgeGallery(true),`<div class="badge10-mini">${badges.map(b=>`<article><div class="b10-art" data-badge="b${b.id}"><span class="b10-chip">ADN ${b.dim}</span></div><h3>${b.name}</h3><span class="b10-status">Por explorar · no otorgada</span></article>`).join('')}</div>`);
  case 'chapter':return chapter(arg);case 'question':return question(arg);case 'review':return review();case 'result':return result();
  case 'demos':return demos();case 'rules':return rules();case 'intra':return intra();case 'orientation':return orientation();
  default:return welcome();
 }
}

/* ---------- Pastilla de etapas y riel de progreso ---------- */
function renderPill(next){
 const pill=document.querySelector('#mode-pill');const ph=phaseOf(next,current);
 if(isJourney(next)){
  pill.setAttribute('aria-label','Después del diagnóstico');
  pill.innerHTML=`<span class="mp-ind" aria-hidden="true"></span>${JOURNEY.map(([id,label],i)=>`<button type="button" data-action="${id}" ${id===next?'aria-current="page"':''}><span class="mp-n">0${i+1}</span>${label}</button>`).join('')}`;
 }else if(FLOW.includes(next)){
  pill.setAttribute('aria-label','Etapas del diagnóstico');
  const reached=p=>p.id===ph||visible(answers).some(q=>q.phase===p.id&&valid(q,answers[q.id]));
  pill.innerHTML=`<span class="mp-ind" aria-hidden="true"></span>${phases.map(p=>`<button type="button" ${reached(p)?`data-action="phase:${p.id}"`:'disabled'} ${p.id===ph?'aria-current="step"':''} title="${p.name}${reached(p)?'':' · se habilita al llegar a esta etapa'}">${p.label}</button>`).join('')}`;
 }else{pill.hidden=true;pill.innerHTML='';return;}
 pill.hidden=false;placeIndicator();
}
function placeIndicator(){
 const pill=document.querySelector('#mode-pill'),ind=pill.querySelector('.mp-ind'),act=pill.querySelector('[aria-current]');
 if(!ind)return;if(!act){ind.style.opacity='0';return;}
 ind.style.opacity='1';ind.style.transform=`translateX(${act.offsetLeft}px)`;ind.style.width=act.offsetWidth+'px';
}
function renderRail(next){
 const rail=document.querySelector('#rail'),bar=document.querySelector('.top-progress span');
 if(FLOW.includes(next)){
  const list=visible(answers),answered=list.filter(q=>valid(q,answers[q.id])).length,open=list.find(q=>!valid(q,answers[q.id]));
  rail.dataset.mode='steps';rail.removeAttribute('aria-hidden');
  rail.innerHTML=`<p class="rail-count"><b>${answered}</b>/${list.length}<span class="sr-only"> preguntas respondidas o marcadas</span></p><ol class="rail-groups">${phases.map(p=>`<li class="rail-group ${phaseOf(next,current)===p.id?'current':''}"><span class="rail-label" aria-hidden="true">${p.label}</span><ol>${list.filter(q=>q.phase===p.id).map(q=>{const n=list.indexOf(q)+1,done=valid(q,answers[q.id]),skip=!!answers[q.id]?.skip,now=next==='question'&&q.id===current,can=!now&&(done||q===open);const state=now?'pregunta actual':skip?'pendiente de aclarar':done?'respondida':'sin responder';return `<li><button type="button" class="rd ${done?'done':''} ${skip?'skip':''} ${now?'now':''}" ${can?`data-action="question:${q.id}"`:'disabled'} ${now?'aria-current="step"':''} aria-label="${p.label}, pregunta ${n} de ${list.length} (${q.id}), ${state}"><span class="rd-tip" aria-hidden="true">${n} · ${q.id} · ${state}</span></button></li>`;}).join('')}</ol></li>`).join('')}</ol>`;
  rail.hidden=false;bar.style.transform=`scaleX(${answered/list.length})`;
 }else if(LONG.includes(next)){
  rail.dataset.mode='scroll';rail.setAttribute('aria-hidden','true');rail.innerHTML='<span class="rail-track"><span class="rail-fill"></span></span>';rail.hidden=false;updateScroll();
 }else{rail.hidden=true;rail.innerHTML='';bar.style.transform='scaleX(0)';}
}
function updateScroll(){
 const rail=document.querySelector('#rail');if(rail.dataset.mode!=='scroll')return;
 const max=document.documentElement.scrollHeight-innerHeight,f=max>0?Math.min(1,Math.max(0,scrollY/max)):1;
 const fill=rail.querySelector('.rail-fill');if(fill)fill.style.transform=`scaleY(${f})`;
 document.querySelector('.top-progress span').style.transform=`scaleX(${f})`;
}
let scrollRaf=0;addEventListener('scroll',()=>{cancelAnimationFrame(scrollRaf);scrollRaf=requestAnimationFrame(updateScroll);},{passive:true});
addEventListener('resize',()=>placeIndicator());

/* ---------- Escenas 3D ---------- */
function mountAll(){
 main.querySelectorAll('[data-scene]').forEach(el=>scenes.set(el,mountScene(el,el.dataset.scene,{})));
 /* Ilustraciones de la diseñadora para las intros de fase, en 3D sobre el panel de vidrio. */
 main.querySelectorAll('[data-floating]').forEach(el=>scenes.set(el,mountFloating(el,el.dataset.floating)));
 main.querySelectorAll('[data-helix]').forEach(el=>scenes.set(el,mountHelix(el)));
 /* Gráficos del entregable en 3D (respaldo en SVG sin WebGL). */
 main.querySelectorAll('[data-chart="wheel"]').forEach(el=>scenes.set(el,mountWheel3D(el,{sectors:wheelSectors(),center:`<b>${20-pendingCount()}</b><small>respuestas</small>`,fallback:wheelSVG()})));
 main.querySelectorAll('[data-chart="seq"]').forEach(el=>scenes.set(el,mountSequence3D(el,{nodes:seqNodes(),groups:seqGroups(),fallback:seqSVG()})));
 /* Insignias: medallas en 3D sobre el panel índigo (respaldo: número de la insignia). */
 main.querySelectorAll('[data-badge]').forEach(el=>{const url=renderBadge(el.dataset.badge,460,280);el.insertAdjacentHTML('beforeend',url?`<img src="${url}" alt="" width="460" height="280" decoding="async">`:`<span class="b10-fallback">${el.dataset.badge.slice(1)}</span>`);});
 /* Tarjetas de arquetipo: imagen fija renderizada en 3D (un solo renderer compartido). */
 main.querySelectorAll('[data-still]').forEach((el,i)=>{const url=renderStill(el.dataset.still,640,480);el.insertAdjacentHTML('afterbegin',url?`<img src="${url}" alt="" width="640" height="480" decoding="async">`:`<span class="ac-fallback">${'ABCD'[i]}</span>`);});
}
function disposeAll(){scenes.forEach(d=>d());scenes.clear();}

function bindSlider(root){
 const slides=[...root.querySelectorAll('.as-slide')],dots=[...root.querySelectorAll('.as-dot')],outline=root.querySelector('.as-outline'),arch=root.querySelector('.as-arch');
 let i=Number(root.dataset.index)||0;
 const go=(n,dir)=>{
  n=(n+slides.length)%slides.length;if(n===i)return;i=n;root.dataset.index=n;
  slides.forEach((s,k)=>s.hidden=k!==n);dots.forEach((d,k)=>d.setAttribute('aria-current',String(k===n)));
  outline.textContent=ARCH_SHORT[n];
  scenes.get(arch)?.();arch.innerHTML='';arch.dataset.scene=ARCH_SCENES[n];scenes.set(arch,mountScene(arch,ARCH_SCENES[n],{}));
  if(motionOK()){
   gsap.fromTo(outline,{xPercent:14*dir,opacity:0},{xPercent:0,opacity:1,duration:.7,ease:'power3.out'});
   gsap.fromTo(slides[n],{x:44*dir,opacity:0},{x:0,opacity:1,duration:.55,ease:'power3.out'});
   gsap.fromTo(arch,{clipPath:'inset(100% 0% 0% 0%)'},{clipPath:'inset(0% 0% 0% 0%)',duration:.75,ease:'power3.inOut'});
  }
  live.textContent=`Perfil ${n+1} de ${slides.length}: ${archetypes[n]}`;
 };
 root.querySelector('.as-prev').addEventListener('click',()=>go(i-1,-1));
 root.querySelector('.as-next').addEventListener('click',()=>go(i+1,1));
 dots.forEach((d,k)=>d.addEventListener('click',()=>go(k,k>i?1:-1)));
 root.addEventListener('keydown',ev=>{if(ev.target.matches('input,textarea,select'))return;if(ev.key==='ArrowRight'){ev.preventDefault();go(i+1,1);}else if(ev.key==='ArrowLeft'){ev.preventDefault();go(i-1,-1);}});
}

/* ---------- Entrada animada de cada pantalla (después del cambio de contenido) ---------- */
function animateIn(next,t){
 if(!motionOK())return;
 const E='power3.out';
 if(next==='question'){
  const ws=splitWords(main.querySelector('#q-title'));
  if(ws.length)gsap.from(ws,{yPercent:105,opacity:0,duration:.6,ease:'power4.out',stagger:.025});
  gsap.from(main.querySelectorAll('.qv-kicker,.q-tags,.hint,.situation'),{opacity:0,y:10*(t.dir||1),duration:.45,ease:E,stagger:.05,delay:.08});
  gsap.from(main.querySelectorAll('.qopt'),{y:16*(t.dir||1),opacity:0,duration:.45,ease:E,stagger:.035,delay:.15});
  gsap.from(main.querySelectorAll('.qv-foot'),{opacity:0,duration:.4,delay:.3});
  return;
 }
 if(next==='welcome'){
  assemble(main.querySelector('[data-assemble]'),.05);
  gsap.from(main.querySelectorAll('.landing .kicker,.landing .lede,.landing .pill-row,.landing .fine,.landing .scroll-cue'),{opacity:0,y:14,duration:.6,ease:E,stagger:.07,delay:.35});
  gsap.from(main.querySelectorAll('.hero-arch,.fh-arch'),{y:70,opacity:0,duration:1.1,ease:'power4.out',delay:.1});
  gsap.from(main.querySelectorAll('.fh-steps li'),{x:30,opacity:0,duration:.6,ease:E,stagger:.12,delay:.7});
 }else if(next==='chapter'){
  gsap.from(main.querySelector('.big-num'),{yPercent:40,opacity:0,duration:.9,ease:'power4.out'});
  assemble(main.querySelector('[data-assemble]'),.1);
  gsap.from(main.querySelectorAll('.chapter-grid .stage-kicker,.ch-lede,.ph-count,.chapter-grid .pill-row,.chapter-grid .scroll-cue,.ph-info'),{opacity:0,y:12,duration:.55,ease:E,stagger:.06,delay:.3});
  gsap.from(main.querySelectorAll('.ph-steps li,.ph-of'),{opacity:0,y:-8,duration:.45,ease:E,stagger:.05});
  gsap.from(main.querySelectorAll('.ch-arch,.ch-glass'),{y:60,opacity:0,scale:.96,duration:1,ease:'power4.out'});
 }else if(next==='result'){
  assemble(main.querySelector('[data-assemble]'),.05);
  gsap.from(main.querySelectorAll('.v8-result-hero .kicker,.v8-result-hero .lede,.v8-result-hero .landing p:not([class]),.rv-counts,.v8-result-hero .fine,.v8-result-hero .pill-row'),{opacity:0,y:14,duration:.6,ease:E,stagger:.07,delay:.3});
  gsap.from(main.querySelectorAll('.hero-arch'),{y:80,opacity:0,duration:1.1,ease:'power4.out',delay:.1});
  growBars(main);
 }else if(next==='review'){
  gsap.from(main.querySelectorAll('.rv10 > *:not(.rv-list),.rv-phase'),{opacity:0,y:18,duration:.5,ease:E,stagger:.06});
 }else{
  const dir=t.axis==='x'?{x:30*(t.dir||1)}:{y:16};
  gsap.from(main.querySelectorAll('.page > *:not([data-reveal]), .arch-slider > *'),{opacity:0,duration:.5,ease:E,stagger:.04,...dir});
 }
 reveal(main);
}

/* ---------- Cambio de pantalla con transición y cola ---------- */
function pick(prev,next,arg,push,opts){
 if(opts.instant||!prev)return {kind:'none'};
 const back=!push||opts.back;
 if(next==='chapter'){const p=phases.find(p=>p.id===arg);return back?{kind:'curtain',color:COLORS[arg][0],dir:-1}:{kind:'portal',color:COLORS[arg][0],label:p.label,sub:p.name};}
 if(next==='result'&&!isJourney(prev))return {kind:'portal',color:'#2a1a5e',label:'Tu ADN',sub:isDemo?'Caso ficticio':'Autodeclarado'};
 if(next==='question'&&(FLOW.includes(prev)||prev==='intra')){
  const list=visible(answers),a=list.findIndex(q=>q.id===current),b=list.findIndex(q=>q.id===arg);
  return {kind:'slide',axis:'y',dir:back||(a>=0&&b<a)?-1:1};
 }
 if(isJourney(next)&&isJourney(prev)){const o=s=>JOURNEY.findIndex(([id])=>id===s);return {kind:'slide',axis:'x',dir:o(next)>=o(prev)?1:-1};}
 const ph=phaseOf(next,arg);
 return {kind:'curtain',color:ph?COLORS[ph][0]:'#211744',dir:back?-1:1};
}
function swap(next,arg,push){
 disposeAll();cleanup();
 screen=next;current=arg;
 const ph=phaseOf(next,arg),cs=COLORS[ph]||COLORS.perfil;
 /* v10: color solo en las intros de fase; las preguntas van sobre fondo claro. */
 document.body.dataset.theme=next==='chapter'?'stage':'light';document.body.dataset.screen=next;
 document.body.style.setProperty('--g1',cs[0]);document.body.style.setProperty('--g2',cs[1]);
 document.querySelector('meta[name="theme-color"]').content=next==='chapter'?cs[0]:'#ffffff';
 main.innerHTML=render(next,arg);
 if(push)try{history.pushState({next,arg},'','#'+(arg||next));}catch{}
 window.scrollTo({top:0,left:0,behavior:'instant'});
 const title=main.querySelector('h1');
 document.title='ADN GovTech · '+(title?.textContent||'Mi recorrido');
 renderPill(next);renderRail(next);mountAll();bind(next);
 if(title){title.tabIndex=-1;title.focus({preventScroll:true});}
}
async function show(next,arg='',push=true,opts={}){
 if(busy){queued=[next,arg,push,opts];return;}
 busy=true;
 try{
  if(isJourney(next)&&profile(answers).needsTie)next='tie';
  const t=pick(screen,next,arg,push,opts);
  const p=lastPoint;lastPoint=null;
  await run(t.kind,{...t,main,x:p?.x,y:p?.y},()=>swap(next,arg,push));
  if(!opts.noEnter)animateIn(next,t);
 }finally{busy=false;}
 if(queued){const q=queued;queued=null;show(...q);}
}

/* ---------- Comportamiento de cada pantalla ---------- */
function bind(next){
 if(next==='question')bindQuestion(byId[current]);
 if(next==='route'){const select=document.querySelector('#priority'),detail=document.querySelector('#priority-detail');detail.innerHTML=priorityText(priority);select.addEventListener('change',ev=>{priority=ev.target.value;save();detail.innerHTML=priorityText(priority);});}
 if(next==='tie')document.querySelector('#tie-form').addEventListener('submit',ev=>{ev.preventDefault();const selected=new FormData(ev.target).get('tie');if(selected===null){document.querySelector('#error').textContent='Elige una opción para ver tu ADN.';return;}answers=resolveTie(answers,Number(selected));save();show('result');});
 main.querySelectorAll('[data-slider]').forEach(bindSlider);
}
function nextQuestion(id){const list=visible(answers),i=list.findIndex(q=>q.id===id),next=list[i+1];if(editing){editing=false;show('review');return;}if(!next){show('review');return;}show(next.phase!==byId[id].phase?'chapter':'question',next.phase!==byId[id].phase?next.phase:next.id);}
function bindQuestion(q){
 let selected=[...(answers[q.id]?.values||[])];const inputs=[...main.querySelectorAll('[name="answer"]')];const error=document.querySelector('#error');
 const max=q.id==='C02'?2:q.id==='C03'?3:6;
 function sync(){
  const order=document.querySelector('#selection-order');
  if(order)order.textContent=`Seleccionadas: ${selected.length} de ${max}`+(selected.length?' · ':'')+selected.map((v,i)=>(i===0?'Principal: ':'Secundario: ')+q.opciones.find(o=>o.letra===v)?.texto).join(' · ');
  const other=document.querySelector('#other-field');if(other)other.hidden=!selected.some(v=>/cuál\?/i.test(q.opciones.find(o=>o.letra===v)?.texto||''));
  const ready=q.id==='C07'||selected.length>0;
  document.querySelector('#q-submit').classList.toggle('is-waiting',!ready);
  document.querySelector('#q-status').textContent=ready?(q.id==='C07'?'Puedes dejar los campos vacíos':'Lista para continuar'):'Elige una opción para continuar';
 }
 inputs.forEach(input=>input.addEventListener('change',()=>{
  if(!q.multi)selected=[input.value];
  else{
   selected=selected.filter(v=>v!==input.value);if(input.checked)selected.push(input.value);
   const excl=EXCLUSIVE[q.id];if(input.checked&&input.value===excl)selected=[excl];else if(input.checked)selected=selected.filter(v=>v!==excl);
   if(selected.length>max){selected=selected.filter(v=>v!==input.value);error.textContent=`Puedes elegir hasta ${max} opciones.`;shake(error);}else error.textContent='';
   inputs.forEach(el=>el.checked=selected.includes(el.value));
  }
  sync();
 }));
 sync();
 document.querySelector('#question-form').addEventListener('submit',ev=>{
  ev.preventDefault();
  const a=q.id==='C07'?{fields:[0,1].map(i=>document.querySelector('#territory-'+i).value.trim())}:{values:selected,note:document.querySelector('#other')?.value.trim()||''};
  if(!valid(q,a)){error.textContent='Selecciona una respuesta para continuar, o usa la opción de omitir si está disponible.';shake(error);return;}
  answers[q.id]=a;answers=clean(answers);save();
  if(q.id==='C02'&&selected[0]==='D'){show('intra');return;}
  nextQuestion(q.id);
 });
}

/* Diálogo propio en lugar de confirm(): foco atrapado por el navegador y Esc para cancelar. */
function ask(title,text,ok){
 const d=document.querySelector('#confirm-dialog');
 if(typeof d.showModal!=='function')return Promise.resolve(window.confirm(text));
 d.querySelector('#confirm-title').textContent=title;d.querySelector('#confirm-text').textContent=text;d.querySelector('#confirm-ok').textContent=ok;
 d.returnValue='';d.showModal();d.querySelector('#confirm-cancel').focus();
 return new Promise(res=>d.addEventListener('close',()=>res(d.returnValue==='ok'),{once:true}));
}

async function handle(action,arg){
 if(action==='start'){
  if(hasSaved()&&!(await ask('¿Empezar de nuevo?','Se borrarán las respuestas guardadas de esta versión v10 en este navegador. Las de otras versiones no cambian.','Sí, empezar de nuevo')))return;
  answers={};priority='';isDemo=false;editing=false;save();show('chapter','perfil');
 }else if(action==='resume'){
  isDemo=false;editing=false;({answers,priority}=loadSaved());const next=visible(answers).find(q=>!valid(q,answers[q.id]));show(next?'question':'review',next?.id||'');
 }else if(action==='phase'){editing=false;show('question',firstOpenIn(arg).id);}
 else if(action==='question'){editing=false;show('question',arg);}
 else if(action==='edit'){editing=true;show('question',arg);}
 else if(action==='skip'){answers[current]={skip:true};answers=clean(answers);save();nextQuestion(current);}
 else if(action==='back'){
  const list=visible(answers),i=list.findIndex(q=>q.id===current),prev=list[i-1],q=byId[current];
  if(editing){editing=false;show('review','',true,{back:true});}
  else if(!prev||prev.phase!==q.phase)show('chapter',q.phase,true,{back:true});
  else show('question',prev.id,true,{back:true});
 }else if(action==='chapter-back'){
  const n=phases.findIndex(p=>p.id===current);
  if(n<=0)show('welcome','',true,{back:true});
  else{const prev=visible(answers).filter(q=>q.phase===phases[n-1].id).pop();show('question',prev.id,true,{back:true});}
 }else if(action==='demo'){answers=demo(Number(arg));priority='';isDemo=true;editing=false;show('result');}
 else if(action==='demo-tie'){answers=demo(0);questions.filter(q=>q.dim).slice(0,10).forEach(q=>answers[q.id]={values:['B']});priority='';isDemo=true;editing=false;show('result');}
 else if(action==='continue-offer'){if(answers.C02)nextQuestion('C02');else show('chapter','perfil');}
 else if(action==='download'){
  const data={version:'v10',fecha:new Date().toISOString(),tipo:isDemo?'Demostración ficticia':'Autodeclarado, sin verificar',perfil:profile(answers),lecturaYRuta:resultPlan(answers),prioridad:dims.find(d=>d.id===priority)?.name||null,respuestas:visible(answers).map(q=>({id:q.id,fase:q.phase,dimension:q.dim,pregunta:q.pregunta,respuesta:answerText(q,answers[q.id]),detalle:answers[q.id]})),aviso:'No otorga insignias ni sello. Regla de frecuencia implementada; interpretación pendiente de validación con usuarios.'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='Mi_ADN_GovTech_v10.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }else if(action==='print')window.print();
 else show(action);
}

document.addEventListener('click',ev=>{
 const link=ev.target.closest('a[href^="#"]');
 if(link&&main.contains(link)){ev.preventDefault();const target=document.getElementById(link.getAttribute('href').slice(1));if(target){target.scrollIntoView({behavior:motionOK()?'smooth':'auto',block:'start'});target.tabIndex=-1;target.focus({preventScroll:true});}return;}
 const b=ev.target.closest('[data-action]');
 if(!b||b.disabled||b.closest('dialog'))return;
 const r=b.getBoundingClientRect();lastPoint={x:r.left+r.width/2,y:r.top+r.height/2};
 const [action,arg]=b.dataset.action.split(':');handle(action,arg);
});

function syncMotion(){document.querySelector('#motion-toggle').setAttribute('aria-pressed',String(!motionOK()));document.querySelector('#motion-label').textContent=motionOK()?'Reducir movimiento':'Movimiento reducido';}
applyMotionAttr();syncMotion();onSystemMotionChange(syncMotion);
document.querySelector('#motion-toggle').onclick=()=>{toggleMotion();syncMotion();show(screen,current,false,{instant:true});};
document.querySelector('#home').onclick=()=>show('welcome');
document.querySelector('#nav-demos').onclick=ev=>{const r=ev.currentTarget.getBoundingClientRect();lastPoint={x:r.left+r.width/2,y:r.top+r.height/2};show('demos');};
window.addEventListener('popstate',ev=>{const s=ev.state;if(!s)return;if(s.next==='question'&&!visible(answers).some(q=>q.id===s.arg)){show('review','',false);return;}show(s.next||'welcome',s.arg||'',false);});
history.replaceState({next:'welcome',arg:''},'','#welcome');
show('welcome','',false,{instant:true,noEnter:true}).then(()=>loader(()=>animateIn('welcome',{})));

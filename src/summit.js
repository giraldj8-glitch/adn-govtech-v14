/* ADN GovTech · formulario completo (v12, 28-oct): la estética y la experiencia del Summit (v11) con todas las preguntas.
   - Preguntas: las 28 de matrix.json (8 de perfil + 20 del ADN), textos literales.
   - Lógica: model-summit.js (mismo conteo por frecuencia y desempate del modelo, con las 20 del ADN).
   - Identidad: la del v10 (Outfit, degradados por fase, portal y títulos del v8, ilustraciones y arquetipos en 3D).
   - Modo quiosco (?modo=quiosco): pantalla de atracción, sesión por visitante, reinicio por inactividad y QR al celular.
   - Datos: nada se envía. Las respuestas quedan en este navegador; el resultado se descarga o se abre por un enlace
     que solo lleva las 14 letras (sin caracterización ni datos personales). */
import './styles.css';
import './v7.css';
import './v8.css';
import './v10.css';
import './summit.css';
import './v13.css';
import './v14.css';
import shortCopy from './short-copy.json';
import {formats,formatNames} from './question-formats.js';
import qrcode from 'qrcode-generator';
import {phases,dims,archetypes,narratives,tieQuestion,tieOptions,questions,byId,diagnostic,TOTAL,visible,valid,clean,answerText,profile,resolveTie,resultPlan,demo,encodeResult,decodeResult,notConsidered,NOT_CONSIDERED,NOT_APPLICABLE,capacities,suggestStrengthen,capScore,capReason} from './model-summit.js';
import {mountScene,mountFloating,mountHelix,mountRevealHelix,renderStill,renderBadge} from './fx/scenes.js';
import {mountSequence3D} from './fx/charts3d.js';
import {badges} from './badge-data.js';
import {applyMotionAttr,toggleMotion,motionOK,onSystemMotionChange,cleanup,shake,splitWords,gsap} from './fx/motion.js';
import {run,assemble,loader} from './fx/transitions.js';
import {downloadCard,cardDataURL,printReport} from './share.js';
import {REMOTE,newId,sendRemote} from './remote.js';

/* ---------- Configuración ---------- */
const params=new URLSearchParams(location.search);
const KIOSK=params.get('modo')==='quiosco';
const IDLE_WARN=(+params.get('aviso')||60)*1000, IDLE_RESET=(+params.get('reinicio')||90)*1000;
const SHORT_ROUTE=params.get('recorrido')!=='completo';
const KEY='adn-govtech-v13-'+(SHORT_ROUTE?'summit-9':'completo');
const LAB=params.get('laboratorio')==='1';
const layout='guiado';
const store=KIOSK?sessionStorage:localStorage;
/* Dirección pública para los QR: la del sitio cuando está alojado (http/https). Abierto como archivo, no hay QR. */
const SITE=location.protocol.startsWith('http')?location.origin+location.pathname:'';

const main=document.querySelector('#main');
const live=document.querySelector('#live');
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COLORS={perfil:['#241272','#5a3fd0'],ser:['#2a1478','#a2338e'],hacer:['#20188a','#7b59e6'],tener:['#6d1a7c','#e2508f'],result:['#1e0f5c','#8a2ba8'],home:['#160b4f','#5a3fc4']};
const ARCH_COLORS=['#9b84ee','#ec4f9c','#f39a6e','#c084f0'];
const ARCH_SCENES=['arqA','arqB','arqC','arqD'];
const ARCH_SHORT=['Proveedor','Solucionador','Aliado','Potencial'];
/* Franja del rol en la tarjeta: el color del arquetipo, un poco más profundo para que el texto blanco se lea. */
const ARCH_BANNER=['#6b4fe0','#d6337f','#d4653a','#8b45d6'];
const ARCH_TAGS=[['Arquitectura técnica','Eficiencia','Gobernanza formal'],['Retos adaptativos','Experimentación','Voz ciudadana'],['Rigor métrico','Estándares de nicho','Asesoría técnica'],['Agilidad temprana','Cercanía ciudadana','Prototipos']];
/* Rol en el ecosistema: misma descripción del modelo, dicha de tú a tú. Redacción de trabajo, no cambia el arquetipo. */
const PLAIN={
 '01':'Qué problema público ayudas a resolver, a quién afecta y cómo se nota el cambio.',
 '02':'Si prueban ideas antes de escalar y construyen con la entidad y los usuarios.',
 '03':'Qué tanto conoces cómo funciona lo público: cómo contrata, cómo paga y cómo decide.',
 '04':'Cómo funciona tu tecnología, cómo se conecta con la entidad y cómo cuidas la información.',
 '05':'Si cuentas con equipo, soporte y recursos para sostener lo acordado en el tiempo.'
};
const PH3D={perfil:'phPerfil',ser:'phSer',hacer:'phHacer',tener:'phTener'};
const PH_INFO={perfil:'No necesitas haber contratado con el Estado para empezar. El tipo de organización, el sector y el tamaño no otorgan puntos.',ser:'Responder no equivale a demostrar una capacidad ni a recibir un reconocimiento.',hacer:'Puedes volver, corregir o marcar que aún no lo tienes contemplado.',tener:'Describe lo que tienen hoy. La lectura es orientativa y no verifica capacidades.'};
const BADGE_SHORT={'01':'Muestras qué problema público resuelves y qué cambia para las personas.','02':'Pruebas tus ideas con usuarios reales antes de llevarlas a escala.','03':'Construyes junto a entidades, usuarios y aliados, con acuerdos claros.','04':'Conoces cómo compra el Estado y adaptas tu oferta a sus tiempos.','05':'Tu tecnología protege los datos y deja una salida clara si termina el contrato.'};
const CHECK='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const DNA='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3c0 6 10 6 10 12s-10 6-10 6M17 3c0 6-10 6-10 12s10 6 10 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8.5 7h7M8.5 17h7M10 12h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const EXCLUSIVE={C02:'E',C03:'L',C04:'A'};
const MAXSEL={C02:2,C03:3,C04:6};
const FLOW=['chapter','question','review','tie','intra'];
/* Reunión del 22-oct: menos pasos. «Tu ruta» y «El sello» quedan en uno solo. */
/* 23-oct: «Tu ADN» deja de ser un paso; su contenido se explica dentro de «Tu rol», en «¿Por qué este rol?». */
const JOURNEY=[['rol','Tu rol'],['ruta','Tu ruta'],['opinion','Tu opinión'],['llevar','Llévatelo']];
/* Quien abre un resultado compartido (QR del stand) ya dio su opinión en la pantalla: no se le vuelve a pedir. */
const steps=()=>shared?JOURNEY.filter(([id])=>id!=='opinion'):JOURNEY;
/* C07 sin texto libre: listas cerradas (el Excel ya preveía selección múltiple para los territorios). Opciones de trabajo, por validar. */
const TERRITORY=[['Bogotá','Otra ciudad de Colombia','Fuera de Colombia'],['Bogotá','Bogotá-Región (Cundinamarca)','Otras regiones de Colombia','América Latina','Otros países']];
const isJourney=s=>JOURNEY.some(([id])=>id===s);

let answers={},seed=0,priority='',org='',feedback={rank:[],unsure:false,add:''},screen='',current='',editing=false,shared=false,isDemo=false,startedAt=0,finishedAt=0,rid='';
let busy=false,queued=null,lastPoint=null;
const scenes=new Map();

/* ---------- Guardado (quiosco: solo esta sesión; celular: este navegador) ---------- */
/* Orden aleatorio de las opciones del ADN (contra el sesgo de posición y de patrón: en la matriz la A siempre es
   Proveedor, la B Solucionador, la C Aliado y la D Potencial). Cada persona recibe una semilla al empezar; con ella,
   cada pregunta tiene su propio orden, estable si vuelve atrás o edita. Se guarda la letra original de la opción
   elegida, así que el conteo, el desempate y el enlace del resultado no cambian. */
function newSeed(){try{return crypto.getRandomValues(new Uint32Array(1))[0]||1;}catch{return (Math.random()*4294967295>>>0)||1;}}
function rand(key){let h=2166136261^seed;for(const ch of key)h=Math.imul(h^ch.charCodeAt(0),16777619);let t=h>>>0;return ()=>{t=t+0x6D2B79F5|0;let r=Math.imul(t^t>>>15,1|t);r=r+Math.imul(r^r>>>7,61|r)^r;return ((r^r>>>14)>>>0)/4294967296;};}
function shuffled(list,key){const r=rand(key),out=[...list];for(let i=out.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
const ordered=q=>q.dim?shuffled(q.opciones,q.id):q.opciones;
function load(){try{const d=JSON.parse(store.getItem(KEY)||'{}');return {answers:clean(d.answers||{}),seed:d.seed||newSeed(),priority:d.priority||'',org:d.org||'',feedback:{rank:[],unsure:false,add:'',...(d.feedback||{})},startedAt:d.startedAt||0,finishedAt:d.finishedAt||0,rid:d.rid||''};}catch{return {answers:{},seed:newSeed(),priority:'',org:'',feedback:{rank:[],unsure:false,add:''},startedAt:0,finishedAt:0};}}
function save(){if(shared||isDemo)return;try{store.setItem(KEY,JSON.stringify({answers,seed,priority,org,feedback,startedAt,finishedAt,rid}));}catch{live.textContent='No fue posible guardar en este navegador. Descarga tu resultado al terminar.';}
 if(finishedAt&&REMOTE)queueRemote();}
/* v14: al llegar al resultado, las respuestas se guardan en la base de datos (si la página la sirve el servidor) y se
   actualizan cuando cambia la opinión, la prioridad o el nombre. Un envío por persona (rid), sin nombre ni correo. */
let remoteT=0;
function queueRemote(){if(!rid)rid=newId();clearTimeout(remoteT);remoteT=setTimeout(flushRemote,900);}
function flushRemote(){if(!remoteT)return;clearTimeout(remoteT);remoteT=0;if(rid&&finishedAt&&!shared&&!isDemo)sendRemote('respuestas',remotePayload());}
function wipe(){flushRemote();document.querySelector('#kbd')?.remove();rid='';answers={};seed=newSeed();priority='';org='';feedback={rank:[],unsure:false,add:''};startedAt=0;finishedAt=0;editing=false;shared=false;isDemo=false;try{store.removeItem(KEY);}catch{}}
const hasSaved=()=>Object.keys(load().answers).length>0;

/* ---------- Utilidades de vista ---------- */
const btn=(text,action,cls='')=>`<button class="pill-btn ${cls}" type="button" data-action="${action}">${text}</button>`;
const phaseOf=(next,arg)=>next==='chapter'?arg:next==='question'?byId[arg]?.phase:next==='intra'?'perfil':null;
const firstOpenIn=phase=>{const qs=visible(answers).filter(q=>q.phase===phase);return qs.find(q=>!valid(q,answers[q.id]))||qs[0];};
const words=q=>(q.pregunta+' '+q.opciones.map(o=>o.texto).join(' ')).split(/\s+/).length;
const minutes=qs=>Math.max(1,Math.round(qs.reduce((t,q)=>t+words(q)/190*60+8,0)/60));
const leaderIndex=()=>{const p=profile(answers);return p.leaders.length?archetypes.indexOf(p.leaders[0]):-1;};
const optOf=q=>{const a=answers[q.id];return valid(q,a)&&!a.skip?q.opciones.find(o=>o.letra===a.values[0]):null;};
const colorOf=q=>{const o=optOf(q);return o?ARCH_COLORS[archetypes.indexOf(o.arquetipo)]:null;};
const isNC=q=>answers[q.id]?.skip&&answers[q.id].reason==='nc';
function seqGroups(){let i=0;return phases.filter(p=>p.id!=='perfil').map(p=>{const n=diagnostic.filter(q=>q.phase===p.id).length,g={label:`${p.label} · ${n}`,from:i,to:i+n-1};i+=n;return g;});}
const seqNodes=()=>diagnostic.map(q=>{const o=optOf(q);return {id:q.id,letter:o?.letra||'',color:colorOf(q)};});
function bar(left,mid,right){return `<div class="sm-bar"><div class="sm-bar-in"><div class="sm-bar-l">${left||''}</div><div class="sm-bar-m">${mid||''}</div><div class="sm-bar-r">${right||''}</div></div></div>`;}
function qrSVG(url,label){
 if(!url)return `<div class="qr-off"><p>El código QR se activa cuando la experiencia esté alojada en un sitio web.</p></div>`;
 const qr=qrcode(0,'M');qr.addData(url);qr.make();
 return `<figure class="qr"><div class="qr-code" role="img" aria-label="${e(label)}">${qr.createSvgTag({cellSize:4,margin:2,scalable:true})}</div><figcaption>${label}</figcaption></figure>`;
}
function phSteps(n){return `<nav class="ph-steps" aria-label="Etapas del diagnóstico"><ol>${phases.map((p,i)=>`<li class="${i<n?'done':i===n?'now':''}" ${i===n?'aria-current="step"':''}><span class="ph-dot" aria-hidden="true">${i<n?CHECK:i+1}</span><span>${p.label}</span></li>`).join('')}</ol><p class="ph-of">Etapa ${n+1} de 4 <span class="ph-dna">${DNA}</span></p></nav>`;}

/* ---------- Pantallas ---------- */
function attract(){
 return `<section class="sm-attract" data-action="welcome"><div class="sa-glow" aria-hidden="true"></div>
 <p class="sa-brand"><small>Bogotá Capital</small><strong>GOVTECH</strong></p>
 <h1 data-assemble>¿Cuál es tu rol en el ecosistema <em>GovTech</em>?</h1>
 <div class="sa-arch" aria-hidden="true"><div class="sa-3d" data-helix></div></div>
 <p class="sa-lede">${SHORT_ROUTE?'Descubre el ADN GovTech de tu empresa: tu rol, tus capacidades y qué fortalecer.':'Descubre tu ADN: lo que te mueve, cómo lo haces y con qué cuentas.'}</p>
 <button class="pill-btn solid sa-cta" type="button" data-action="welcome">Toca para empezar</button>
 ${qrSVG(SITE?(SITE+(SHORT_ROUTE?'?recorrido=summit':'?recorrido=completo')):'','¿Prefieres tu celular? Escanea y hazlo allí')}</section>`;
}
/* v14 · 2-nov (solo Summit): pantalla inicial con el contexto del Word «Pantalla inicial del Sello» y la fórmula de la
   «Ficha de Valor y Narrativa», muy resumidos. No cambia preguntas, selección ni reglas. Lo que aún no existe
   (niveles del sello, insignias verificables, directorio) se dice como camino, no como algo que se obtiene hoy. */
function summitWelcome(){
 const saved=!KIOSK&&hasSaved(),n=visible({}).length;
 return `<section class="sm-home v14-hero"><div class="fh-wrap sm-helix"><div class="fh-arch" aria-hidden="true"><div class="fh-3d" data-helix></div></div><ol class="fh-steps" aria-label="Etapas del recorrido">${phases.map((p,i)=>`<li style="--y:${[14,36,58,80][i]}%"><span class="n">${i+1}</span>${p.label}</li>`).join('')}</ol></div>
 <div class="sm-home-text"><p class="kicker">Bogotá Capital GovTech · Sello B-GovTech</p><h1 data-assemble>Descubre el ADN <em>GovTech</em> de tu empresa</h1>
 <p class="lede">Conoce tu rol en el ecosistema, tus rasgos como aliado del Estado y qué fortalecer para resolver retos de Bogotá.</p>
 <p class="v14-tag">Autodiagnóstico gratuito · ${n} preguntas</p>
 <p class="v14-promise">Sin documentos · Sin propuestas · Avance visible${KIOSK?'':' · Sigue después'}</p>${hashCode&&!decoded?'<p class="v13-note">Este enlace de resultado pertenece a otra versión o está incompleto. Puedes iniciar un nuevo recorrido; no se ha reinterpretado el resultado anterior.</p>':''}</div></section>
 <section class="v14-ctx" data-in>
  <article class="v14-card"><h2>¿Qué es GovTech?</h2><p>Empresas y entidades públicas que <b>resuelven juntas</b> problemas de la ciudad con tecnología. No es solo venderle al Estado: es crear soluciones con él.</p><p class="v14-ex"><span>Ejemplo</span>Una startup y una secretaría prueban juntas una app para reducir filas en un trámite.</p></article>
  <article class="v14-card v14-flow"><h2>El Sello B-GovTech en 3 pasos</h2><ol>
   <li class="here"><span>1</span><div><b>Conoce dónde estás</b><small>Tu ADN GovTech</small></div><em>Hoy</em></li>
   <li><span>2</span><div><b>Prepárate paso a paso</b><small>Tu ruta y tus insignias</small></div></li>
   <li><span>3</span><div><b>Hazte visible</b><small>Conexión con el ecosistema</small></div></li></ol>
   <p class="v14-eq"><b>=</b> Aliado estratégico para resolver retos de Bogotá</p></article>
  <article class="v14-card"><h2>Al terminar recibes</h2><ul class="v14-get">
   <li><b>Tu rol</b><span>y tus rasgos como aliado</span></li><li><b>Tu radar</b><span>tus 5 capacidades de un vistazo</span></li>
   <li><b>Tu ruta</b><span>qué fortalecer primero</span></li><li><b>Tus insignias</b><span>las que puedes empezar a sustentar</span></li></ul>
   <p class="v14-small">Según tu rol en el ecosistema, no según el tamaño de tu empresa.</p></article>
  <article class="v14-card v14-not"><h2>Lo que no es</h2><ul>
   <li>No es una licitación ni garantiza contratos.</li><li>No es un examen: no hay respuestas buenas o malas.</li>
   <li>No es solo para quien ya trabajó con el Estado.</li><li>No pide documentos, propuestas ni saber de contratación.</li></ul></article>
 </section>
 <p class="v14-close"><b>¿Es para tu empresa?</b> Sí, si quieres aportar a resolver retos de la ciudad, no solo vender. <span>${REMOTE?'Guardamos tus respuestas, sin tu nombre, para analizar y mejorar el servicio':'Tus respuestas solo se usan para construir tu resultado'}${KIOSK?'; esta pantalla se borra al terminar':REMOTE?'':'; no se envían a ninguna entidad'}.</span></p>
 ${bar(saved?btn('Continuar donde iba','resume','ghost'):'','',btn('Descubrir mi ADN GovTech →','start','solid big'))}`;
}
function welcome(){
 if(SHORT_ROUTE)return summitWelcome();
 const saved=!KIOSK&&hasSaved();
 return `<section class="sm-home"><div class="fh-wrap sm-helix"><div class="fh-arch" aria-hidden="true"><div class="fh-3d" data-helix></div></div><ol class="fh-steps" aria-label="Etapas del recorrido">${phases.map((p,i)=>`<li style="--y:${[14,36,58,80][i]}%"><span class="n">${i+1}</span>${p.label}</li>`).join('')}</ol></div>
 <div class="sm-home-text"><p class="kicker">Bogotá Capital GovTech · Sello B-GovTech</p><h1 data-assemble>Descubre tu rol en el ecosistema <em>GovTech</em></h1>
 <p class="lede">Conoce cómo puede aportar tu organización y qué fortalecer. <b>${TOTAL} preguntas del ADN</b>, ${SHORT_ROUTE?'más 3 sobre tu organización':'más tu contexto'}. No necesitas haber contratado con el Estado.</p><p class="v13-note">Propuesta para validar · ${SHORT_ROUTE?'Summit':'recorrido completo'}</p>${hashCode&&!decoded?'<p class="v13-note">Este enlace de resultado pertenece a otra versión o está incompleto. Puedes iniciar un nuevo recorrido; no se ha reinterpretado el resultado anterior.</p>':''}
 <ul class="sm-facts" data-in><li><b>A tu ritmo</b><span>Sin subir documentos</span></li><li><b>Tu ADN</b><span>Autodeclarado: no es un sello</span></li><li><b>Privado</b><span>${REMOTE?'Sin datos personales':KIOSK?'Se borra al terminar':'Se queda en tu navegador'}</span></li></ul></div></section>
 ${bar(saved?btn('Continuar donde iba','resume','ghost'):'','',btn('Empezar mi ADN →','start','solid big'))}`;
}
function chapter(id){
 const p=phases.find(p=>p.id===id),n=phases.indexOf(p),qs=visible(answers).filter(q=>q.phase===id);
 const explore=id==='perfil'
  ?`<p class="sm-why">Tu organización, su aporte y su contexto. <b>No puntúa</b>: orienta tu resultado.</p>
`
  :`<ul class="sm-dims">${dims.filter(d=>d.phase===id).map(d=>`<li><b>${d.name}</b><span>${PLAIN[d.id]}</span></li>`).join('')}</ul>`;
 return `<section class="stage chapter sm-chapter"><div class="stage-inner">${phSteps(n)}
 <div class="ch-glass" aria-hidden="true"><div class="ph3d" data-floating="${PH3D[id]}"></div></div>
 <p class="big-num" aria-hidden="true">${p.label}</p><h1 data-assemble>${p.name}</h1>
 <p class="ph-count" data-in>${qs.length} preguntas breves${id==='perfil'&&!SHORT_ROUTE?' · 2 opcionales':''}</p>
 <div data-in>${explore}</div>
 <p class="ph-info" data-in><span class="ph-i" aria-hidden="true">i</span>${PH_INFO[id]}</p></div></section>
 ${bar(btn('← Volver','chapter-back','ghost'),'',btn('Comenzar →','phase:'+id,'solid big'))}`;
}
function help(q){
 if(shortCopy[q.id]?.help)return shortCopy[q.id].help;
 if(MAXSEL[q.id])return q.id==='C04'?'Elige todas las que apliquen. «Ninguna todavía» excluye las demás.':`Elige hasta ${MAXSEL[q.id]}: la primera que toques será la principal.`;
 if(q.id==='C07')return 'Elige las que apliquen en cada grupo. Es opcional.';
 if(q.dim)return 'Elige la opción que más se parece a lo que hacen hoy. Si aún no lo tienen contemplado, también es una respuesta válida.';
 return q.optional?'Esta pregunta es opcional.':'Selecciona una opción. Esta información no puntúa.';
}
function splitQuestion(text){const i=text.indexOf('¿');if(i<0)return {situation:'',ask:text};const before=text.slice(0,i),cut=before.lastIndexOf('. ');if(cut<0)return {situation:'',ask:text};return {situation:text.slice(0,cut+1).trim(),ask:text.slice(cut+2).trim()};}
const isFull=t=>/^(otr[ao]|no estoy|ninguna|por definir|prefiero|aún|no sé)/i.test(t)||/cuál\?$/i.test(t);
const neutralIcon=doubt=>doubt?`<svg class="neutral-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .2c0 1.8-2.5 2-2.5 3.8M12 16.5h.01"/></svg>`:`<svg class="neutral-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m6 18 12-12"/></svg>`;
function guidedOptions(q,a){
 const f=formats[q.id],type=f?.type||'list';
 const radio=(o)=>`<input type="${q.multi?'checkbox':'radio'}" name="answer" value="${o.letra}" ${a.values?.includes(o.letra)?'checked':''}>`;
 const title=o=>f?.titles?.[q.opciones.indexOf(o)];
 const item=o=>`<label class="ux-choice">${radio(o)}<span>${title(o)?`<strong>${e(title(o))}</strong>`:''}<span>${e(o.texto)}</span>${q.id==='C02'||q.id==='C03'?'<small class="ux-order"></small>':''}</span></label>`;
 const legend='<legend class="sr-only">Elige tu respuesta</legend>';
 if(type==='tiles'){const extra=o=>/^(otr[ao]|no estoy)/i.test(o.texto),tile=o=>`<label class="ux-choice ux-tile">${radio(o)}<span>${e(o.texto)}</span><i class="ux-tick" aria-hidden="true">${CHECK}</i></label>`;
  return `<fieldset class="ux-options ux-tiles">${legend}${q.opciones.filter(o=>!extra(o)).map(tile).join('')}</fieldset><fieldset class="ux-options ux-tiles ux-tiles-extra"><legend class="sr-only">Otras respuestas</legend>${q.opciones.filter(extra).map(tile).join('')}</fieldset>`;}
 if(type==='select')return `<label class="sr-only" for="org-type">Tipo de organización</label><select id="org-type" class="ux-select" name="answer"><option value="">Selecciona el tipo de organización</option>${q.opciones.map(o=>`<option value="${o.letra}" ${a.values?.includes(o.letra)?'selected':''}>${e(o.texto)}</option>`).join('')}</select>`;
 if(type==='comparison')return `<table class="ux-comparison"><caption class="sr-only">Elige la práctica que más se parece a la de tu organización.</caption><thead><tr><th scope="col">Enfoque</th><th scope="col">En qué consiste</th></tr></thead><tbody>${ordered(q).map(o=>`<tr><th scope="row"><label for="choice-${o.letra}">${e(title(o))}</label></th><td><label class="ux-choice"><input id="choice-${o.letra}" type="radio" name="answer" value="${o.letra}" ${a.values?.includes(o.letra)?'checked':''}><span><span class="ux-mobile-title">${e(title(o))}</span>${e(o.texto)}</span></label></td></tr>`).join('')}</tbody></table>`;
 if(type==='outcome')return `<fieldset class="ux-options ux-outcomes">${legend}${['C','B','A'].map(l=>item(q.opciones.find(o=>o.letra===l))).join('')}</fieldset><fieldset class="ux-options ux-outcome-other"><legend class="sr-only">Otras respuestas</legend>${q.opciones.filter(o=>'DE'.includes(o.letra)).map(item).join('')}</fieldset>`;
 if(type==='ranges')return `<fieldset class="ux-options ux-ranges">${legend}${q.opciones.filter(o=>o.letra!=='G').map(item).join('')}</fieldset><fieldset class="ux-options ux-outcome-other"><legend class="sr-only">Otra respuesta</legend>${item(q.opciones.find(o=>o.letra==='G'))}</fieldset>`;
 if(type==='territories')return q.opciones.map((o,i)=>{const chosen=(a.fields?.[i]||'').split(' · ');return `<fieldset class="ux-options ux-territories"><legend>${i===0?'Dónde operan hoy':'Dónde les interesa trabajar'}</legend>${TERRITORY[i].map(t=>`<label class="ux-choice"><input type="checkbox" name="t${i}" value="${e(t)}" ${chosen.includes(t)?'checked':''}><span>${e(t)}</span></label>`).join('')}</fieldset>`;}).join('');
 const search=type==='chips'?'<label class="ux-search-label" for="sector-search">Buscar un sector <span>(opcional)</span></label><input type="search" id="sector-search" class="ux-search" placeholder="Por ejemplo, salud" autocomplete="off"><p id="sector-empty" role="status" hidden>No encontramos ese sector. Borra la búsqueda para ver todas las opciones.</p>':'';
 return `${search}<fieldset class="ux-options ux-${type}">${legend}${(q.dim?ordered(q):q.opciones).map(item).join('')}</fieldset>`;
}
function question(id){
 if(byId[id].dim && layout==='bloques')return blockQuestion(id);
 const q=byId[id],list=visible(answers),a=answers[id]||{},p=phases.find(p=>p.id===q.phase),inPhase=list.filter(x=>x.phase===q.phase);
 const {situation,ask}=splitQuestion(q.pregunta);
 const tiles=q.id==='C06';
 const opt=o=>{const tile=tiles&&!isFull(o.texto);return `<label class="qopt ${tile?'tile':''} ${!tile&&isFull(o.texto)?'full':''}"><input type="${q.multi?'checkbox':'radio'}" name="answer" value="${o.letra}" ${a.values?.includes(o.letra)?'checked':''}><span class="qopt-text">${tile?`<b>${e(o.texto)}</b><small>${o.texto==='1'?'persona':'personas'}</small>`:e(o.texto)}${EXCLUSIVE[q.id]===o.letra?'<small class="excl">Excluye las demás opciones</small>':''}</span><span class="qopt-mark ${q.multi?'box':''}" aria-hidden="true">${CHECK}</span></label>`;};
 const options=q.id==='C07'
  ?q.opciones.map((o,i)=>{const label=o.texto.split(':')[0],chosen=(a.fields?.[i]||'').split(' · ');return `<fieldset class="qopts chips"><legend class="sm-legend">${e(label)}</legend>${TERRITORY[i].map(t=>`<label class="qopt chip"><input type="checkbox" name="t${i}" value="${e(t)}" ${chosen.includes(t)?'checked':''}><span class="qopt-text">${e(t)}</span><span class="qopt-mark box" aria-hidden="true">${CHECK}</span></label>`).join('')}</fieldset>`;}).join('')
  :`<fieldset class="qopts ${tiles?'tiles':'one-col'}" aria-labelledby="q-title"><legend class="sr-only">Opciones de respuesta</legend>${ordered(q).map(opt).join('')}</fieldset>`;
 const skipLink=q.dim?`<button class="link-btn qv-skip" type="button" data-action="skip:na">${NOT_APPLICABLE}</button>`:q.optional?`<button class="link-btn qv-skip" type="button" data-action="skip">Omitir esta pregunta opcional</button>`:'';
 const guided=!q.dim||layout==='guiado',fmt=formats[id]?.type||'list';
 const neutralGuided=q.dim?`<fieldset class="ux-options ux-neutral"><legend class="sr-only">Otras respuestas</legend><label class="ux-choice neutral-doubt"><input type="radio" name="answer" value="__nc" ${a.skip&&a.reason==='nc'?'checked':''}>${neutralIcon(true)}<span>${NOT_CONSIDERED}</span></label><label class="ux-choice neutral-na"><input type="radio" name="answer" value="__na" ${a.skip&&a.reason==='na'?'checked':''}>${neutralIcon(false)}<span>${NOT_APPLICABLE}</span></label></fieldset>`:'';
 return `<section class="qv sm-q ${guided?'ux-guided ux-'+fmt:''}"><div class="qv-inner"><p class="stage-kicker qv-kicker"><span>${p.label}</span><span class="sep">/</span><span>Pregunta ${list.indexOf(q)+1} de ${list.length}</span><span class="sep">·</span><span>${inPhase.indexOf(q)+1} de ${inPhase.length} en esta etapa</span></p>
 <form id="question-form" class="qv-card" novalidate><div class="q-tags"><span class="tag code">${q.id}</span><span class="tag">${q.dim?'ADN '+q.dim+' · '+dims.find(d=>d.id===q.dim).name:'Contexto · no puntúa'}</span>${MAXSEL[q.id]?`<span class="tag multi" id="sel-count">0 de ${MAXSEL[q.id]}</span>`:''}</div>
 ${situation?`<div class="situation"><p class="eyebrow">Situación</p><p>${e(situation)}</p></div>`:''}
 <h1 id="q-title">${e(ask)}</h1><p class="hint">${help(q)}</p>
 ${guided?guidedOptions(q,a):options}${neutralGuided}
 <p class="error" id="error" role="alert"></p>${q.dim?'':skipLink}
 ${bar(btn('← Volver','back','ghost'),'<span class="q-status" id="q-status"></span>',`<button class="pill-btn solid big" type="submit" id="q-submit">${editing?'Guardar':'Continuar'} →</button>`)}</form></div></section>`;
}
function blockFor(id){
 const q=byId[id],list=visible(answers),i=list.findIndex(x=>x.id===id);
 let start=i,end=i+1;
 // Agrupar solo preguntas contiguas: una dimensión puede reaparecer más adelante.
 while(start>0&&list[start-1].dim===q.dim&&list[start-1].phase===q.phase)start--;
 while(end<list.length&&list[end].dim===q.dim&&list[end].phase===q.phase)end++;
 start+=Math.floor((i-start)/2)*2;
 return list.slice(start,Math.min(start+2,end));
}
function blockQuestion(id){
 const group=blockFor(id),q=byId[id],d=dims.find(x=>x.id===q.dim);
 const cell=(x,o)=>`<label class="v13-choice"><input type="radio" name="block-${x.id}" value="${o.letra}" ${answers[x.id]?.values?.includes(o.letra)?'checked':''}><span>${e(o.texto)}</span></label>`;
 return `<section class="v13-block"><p class="eyebrow">${phases.find(p=>p.id===q.phase).label} · ${d.name}</p><h1 id="q-title">${group.length===2?'Dos situaciones, una respuesta en cada una.':'Una última situación de esta dimensión.'}</h1><p class="hint">Las alternativas cambian en cada fila: no son niveles de mejor a peor.</p>
 <form id="block-form"><table class="v13-matrix"><caption class="sr-only">Elige una alternativa o una opción neutra por pregunta.</caption><thead><tr><th scope="col">Situación</th>${[1,2,3,4].map(n=>`<th scope="col">Alternativa ${n}</th>`).join('')}</tr></thead>
 ${group.map(x=>`<tbody data-block="${x.id}"><tr><th scope="row" id="b-${x.id}"><small>${x.id}</small><span>${e(x.pregunta)}</span></th>${ordered(x).map(o=>`<td>${cell(x,o)}</td>`).join('')}</tr><tr class="v13-neutral"><td colspan="5"><div class="ux-neutral" role="group" aria-labelledby="b-${x.id}">${[['__nc',NOT_CONSIDERED],['__na',NOT_APPLICABLE]].map(([v,t])=>`<label class="ux-choice ${v==='__nc'?'neutral-doubt':'neutral-na'}"><input type="radio" name="block-${x.id}" value="${v}" ${answers[x.id]?.skip&&answers[x.id].reason===(v==='__nc'?'nc':'na')?'checked':''}>${neutralIcon(v==='__nc')}<span>${t}</span></label>`).join('')}<span class="v13-saved" id="saved-${x.id}" aria-live="polite">${valid(x,answers[x.id])?'Respuesta guardada':''}</span></div></td></tr></tbody>`).join('')}</table>
 <p id="error" class="error" role="alert"></p>${bar(btn('← Volver','back','ghost'),`<span id="block-count">${group.filter(x=>valid(x,answers[x.id])).length} de ${group.length}</span>`,'<button type="submit" class="pill-btn solid big">Continuar →</button>')}</form></section>`;
}
function bindBlock(){
 const form=document.querySelector('#block-form'),group=blockFor(current);
 form.addEventListener('change',ev=>{
  const input=ev.target;if(!input.matches('input[type=radio]'))return;
  const id=input.name.slice(6),v=input.value;
  answers[id]=v==='__nc'?{skip:true,reason:'nc'}:v==='__na'?{skip:true,reason:'na'}:{values:[v]};
  answers=clean(answers);save();
  document.getElementById('saved-'+id).textContent='Respuesta guardada';
  document.querySelector('#block-count').textContent=`${group.filter(x=>valid(x,answers[x.id])).length} de ${group.length}`;
  document.querySelector('#error').textContent='';
 });
 form.addEventListener('submit',ev=>{
  ev.preventDefault();const missing=group.find(x=>!valid(x,answers[x.id]));
  if(missing){document.querySelector('#error').textContent='Responde cada situación o indica que aún no la tienes contemplada / no aplica.';form.querySelector(`[name="block-${missing.id}"]`).focus();return;}
  nextQuestion(current);
 });
}
function intra(){
 return `<section class="page light sm-page"><p class="eyebrow">Una ruta según tu necesidad</p><h1>¿Traes un reto público, más que una oferta?</h1><p class="lead">Si representas una entidad que busca abordar una necesidad, el equipo de Bogotá Capital GovTech puede orientarte por otra ruta. Si además tienes una oferta, continúa tu ADN.</p><p class="fine">No se envía ni se registra una solicitud desde esta pantalla.</p></section>
 ${bar(btn('← Volver a mi aporte','question:C02','ghost'),'',btn('Continuar mi ADN →','continue-offer','solid big'))}`;
}
function review(){
 const list=visible(answers),done=list.filter(q=>valid(q,answers[q.id])).length;
 return `<section class="page light rv10 sm-page"><p class="eyebrow">Antes de conocer tu ADN</p><h1>Revisa tus respuestas.</h1><p class="lead">${done===list.length?`Las ${list.length} preguntas tienen respuesta.`:`${done} de ${list.length} tienen respuesta.`} Toca una etapa para ver o corregir.</p>
 <div class="rv-list">${phases.map((p,n)=>{const qs=list.filter(q=>q.phase===p.id),k=qs.filter(q=>valid(q,answers[q.id])).length;return `<details class="rv-phase" style="--g1:${COLORS[p.id][0]};--g2:${COLORS[p.id][1]}" ${k<qs.length?'open':''}><summary><span class="rv-num">${n+1}</span><span class="rv-name"><b>${p.label} · ${p.name}</b><small>${k} de ${qs.length}</small></span><span class="rv-check ${k===qs.length?'ok':''}">${k===qs.length?CHECK:''}</span><span class="rv-open">Ver</span></summary>${qs.map(q=>`<div class="rv-row"><div><strong>${q.id} · ${e(splitQuestion(q.pregunta).ask)}</strong><p>${e(answerText(q,answers[q.id]))}</p></div><button class="pill-btn ghost sm-edit" type="button" data-action="edit:${q.id}">Editar <span class="sr-only">${q.id}</span></button></div>`).join('')}</details>`;}).join('')}</div></section>
 ${bar('','',btn('Ver mi ADN →','rol','solid big'))}`;
}
function tieView(){
 const p=profile(answers);
 return `<section class="page light sm-page"><p class="eyebrow">Una precisión para tu ADN</p><h1>Encontramos más de una forma de aportar.</h1><p class="lead">Tus respuestas se reparten por igual entre ${p.candidates.length} perfiles. Elige la que mejor te describe.</p>
 <form id="tie-form" novalidate><fieldset class="qopts one-col"><legend><h2 class="sm-tie-q">${tieQuestion}</h2></legend>${shuffled(p.candidates,'tie').map(a=>{const i=archetypes.indexOf(a);return `<label class="qopt"><input type="radio" name="tie" value="${i}"><span class="qopt-text">${tieOptions[i]}</span><span class="qopt-mark" aria-hidden="true">${CHECK}</span></label>`;}).join('')}</fieldset><p class="error" id="error" role="alert"></p>
 ${bar(btn('Revisar respuestas','review','ghost'),'','<button class="pill-btn solid big" type="submit">Ver mi ADN →</button>')}</form></section>`;
}

/* ---------- «Desliza para ver tu ADN»: la revelación guiada por el dedo ----------
   Una sección alta con un escenario fijo: al deslizar, la hélice 3D se arma respuesta por respuesta (SER → HACER → TENER),
   los contadores por arquetipo suben y, al final, la cámara se aleja y aparece el rol. Nada avanza solo: lo mueve la persona. */
function revealMarks(){const g=seqGroups(),unit=.9/((TOTAL-1)+(g.length-1)*.5),m=[];let k=.05;g.forEach(gr=>{for(let i=gr.from;i<=gr.to;i++){m[i]=k;k+=unit;}k+=unit*.5;});return m;}
function revelar(){
 const i=leaderIndex();
 const chips=seqGroups().map(g=>`<div class="rv-g"><span>${g.label.split(' ·')[0]}</span><ol>${diagnostic.slice(g.from,g.to+1).map((q,k)=>{const o=optOf(q);return `<li data-n="${g.from+k}" class="${o?'':'empty'}" style="--c:${colorOf(q)||'transparent'}"><b>${o?o.letra:'–'}</b></li>`;}).join('')}</ol></div>`).join('');
 return `<section class="sm-reveal" style="--g1:${COLORS.result[0]};--g2:${COLORS.result[1]}" aria-labelledby="rv-title">
 <div class="rv-stage">
  <div class="rv-3d" data-reveal aria-hidden="true"></div>
  <div class="rv-hud">
   <p class="rv-kicker" id="rv-kicker">Tu ADN GovTech</p>
   <h1 id="rv-title">Desliza para ver tu ADN</h1>
   <p class="rv-sub" id="rv-sub">Cada respuesta es una pieza de tu hélice. Desliza y mira cómo se arma.</p>
   <p class="rv-now" id="rv-now" aria-hidden="true"></p>
  </div>
  <div class="rv-hint" id="rv-hint" aria-hidden="true"><span class="rv-hand"><svg viewBox="0 0 24 24"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1a1.5 1.5 0 0 1 3 0v1.5m0-.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.2a5 5 0 0 1-4-2l-2.7-3.6a1.5 1.5 0 0 1 2.3-1.9L9 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="rv-chev"></span>Desliza hacia arriba</div>
  <div class="rv-foot">
   <div class="rv-chips" aria-hidden="true">${chips}</div>
   <ul class="rv-tally" aria-hidden="true">${archetypes.map((a,k)=>`<li style="--c:${ARCH_COLORS[k]}" data-a="${k}"><span class="lg-dot" style="--c:${ARCH_COLORS[k]}">${'ABCD'[k]}</span><small>${ARCH_SHORT[k]}</small><b>0</b></li>`).join('')}</ul>
   <div class="rv-load"><span id="rv-pct">Cargando tu ADN · 0%</span><i><b id="rv-bar"></b></i></div>
   <div class="rv-cta" id="rv-cta">${btn(i>=0?'Ver tu rol →':'Ver tu resultado →','rol','solid big')}</div>
  </div>
  <button type="button" class="rv-skip" data-action="rol">Saltar animación</button>
 </div>
</section>`;
}
function bindReveal(){
 const sec=main.querySelector('.sm-reveal'),box=main.querySelector('[data-reveal]');if(!sec)return;
 const marks=revealMarks(),i=leaderIndex(),lead=i>=0?archetypes[i]:null;
 const nodes=diagnostic.map(q=>{const o=optOf(q);return {id:q.id,letter:o?.letra||'',color:colorOf(q),lead:!!o&&o.arquetipo===lead};});
 const scene=mountRevealHelix(box,{nodes,marks});scenes.set(box,scene);
 const $=id=>document.getElementById(id);
 const chips=[...sec.querySelectorAll('.rv-chips li')],counts=[...sec.querySelectorAll('.rv-tally li')];
 const clamp=x=>Math.min(1,Math.max(0,x));
 const title=t=>{const h=$('rv-title');if(h.textContent===t&&!h.dataset.split)return;delete h.dataset.split;h.removeAttribute('aria-label');h.textContent=t;};
 let shown=-1,stage='',raf=0;
 const n=i>=0?narratives[i]:null;
 function paint(){
  raf=0;
  const max=sec.offsetHeight-innerHeight,p=max>0?clamp(scrollY/max):1;
  const b=clamp((p-.04)/.7),f=clamp((p-.78)/.13);
  scene.set?.(b,f);
  sec.style.setProperty('--p',p.toFixed(3));
  $('rv-hint').classList.toggle('off',p>.02);
  $('rv-bar').style.width=(clamp(p/.9)*100).toFixed(1)+'%';
  const k=marks.filter(m=>b>=m+.012).length;
  if(k!==shown){
   shown=k;
   chips.forEach((c,j)=>c.classList.toggle('on',j<k));
   const tally=archetypes.map(a=>diagnostic.slice(0,k).filter(q=>optOf(q)?.arquetipo===a).length);
   counts.forEach((c,j)=>{c.querySelector('b').textContent=tally[j];c.classList.toggle('up',tally[j]>0);});
   const q=diagnostic[k-1],o=q&&optOf(q);
   $('rv-now').innerHTML=q?(o?`<b>${q.id}</b> Opción ${o.letra} · <span style="--c:${colorOf(q)}">${o.arquetipo}</span>`:`<b>${q.id}</b> <span class="nc">${isNC(q)?'Aún no lo tenemos contemplado':'Sin respuesta'}</span>`):'';
  }
  const next=p>=.9?'final':f>0?'join':k>0?'build':'intro';
  if(next==='build'){const q=diagnostic[Math.max(0,k-1)],ph=phases.find(x=>x.id===q.phase);title(`${ph.label} · ${ph.name}`);$('rv-sub').textContent=`Respuesta ${k} de ${TOTAL}`;}
  $('rv-pct').textContent=p>=.9?'ADN completo':`Cargando tu ADN · ${Math.round(clamp(p/.9)*100)}%`;
  if(next===stage)return;
  stage=next;sec.dataset.stage=next;
  if(next==='intro'){$('rv-kicker').textContent='Tu ADN GovTech';title('Desliza para ver tu ADN');$('rv-sub').textContent='Cada respuesta es una pieza de tu hélice. Desliza y mira cómo se arma.';}
  else if(next==='build')$('rv-kicker').textContent='Armando tu hélice';
  else if(next==='join'){$('rv-kicker').textContent=`Tus ${TOTAL} respuestas, juntas`;title('Ensamblando tu ADN…');$('rv-sub').textContent='SER · HACER · TENER';}
  else{
   $('rv-kicker').textContent=`${org?org+' · ':''}Tu rol en el ecosistema GovTech`;
   title(i>=0?archetypes[i]:'Tu ADN está por descubrir');
   $('rv-sub').textContent=n?n.phrase:'Marcaste tus respuestas como aún no contempladas. Es un punto de partida.';
   if(motionOK())assemble($('rv-title'),0);
   live.textContent=`Tu rol en el ecosistema GovTech: ${i>=0?archetypes[i]:'por descubrir'}.`;
  }
 }
 const onScroll=()=>{if(!raf)raf=requestAnimationFrame(paint);};
 addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll);
 scenes.set(sec,()=>{removeEventListener('scroll',onScroll);removeEventListener('resize',onScroll);cancelAnimationFrame(raf);});
 paint();
}

/* ---------- Resultado en cinco pasos ---------- */
function stepper(id){const J=steps(),n=J.findIndex(([s])=>s===id);return bar(n>0?btn('← Anterior',J[n-1][0],'ghost'):shared?'':btn('Revisar respuestas','review','ghost'),`<span class="sm-step">${n+1} / ${J.length}</span>`,n<J.length-1?btn(J[n+1][1]+' →',J[n+1][0],'solid big'):btn(KIOSK?'Terminar y borrar':shared?'Hacer mi propio ADN':'Volver al inicio',KIOSK?'finish':shared?'own':'home','solid big'));}
function countsBlock(){
 const p=profile(answers),nc=notConsidered(answers).length;
 const rows=archetypes.map((a,i)=>({a,i,n:p.counts[a]})).sort((x,y)=>y.n-x.n);
 return `<div class="sm-counts"><p class="eyebrow">Cómo se reparten tus ${TOTAL} respuestas</p><ul>${rows.map(r=>`<li class="${p.leaders.includes(r.a)?'is-lead':''}"><span class="lg-dot" style="--c:${ARCH_COLORS[r.i]}">${'ABCD'[r.i]}</span><span class="nm">${r.a}</span><span class="bar"><i style="width:${r.n/TOTAL*100}%;background:${ARCH_COLORS[r.i]}"></i></span><b>${r.n}</b></li>`).join('')}${nc?`<li class="nc"><span class="lg-dot nc">–</span><span class="nm">Aún no contemplado</span><span class="bar"><i style="width:${nc/TOTAL*100}%"></i></span><b>${nc}</b></li>`:''}</ul></div>`;
}
/* Frase que abre «¿Por qué este rol?»: qué arrojaron las respuestas, en palabras simples. */
function whyLead(i,p){
 const n=p.counts[archetypes[i]],nc=notConsidered(answers).length;
 const tie=p.affinities.length?` Hubo empate con <b>${p.affinities.join(' y ')}</b> y lo resolviste en la pregunta de precisión.`:'';
 return `Tus respuestas arrojaron que tu organización se parece más a <b>${archetypes[i]}</b>: ${n} de tus ${TOTAL} respuestas eligieron una práctica de este perfil${nc?` y ${nc} ${nc>1?'quedaron':'quedó'} como aún no ${nc>1?'contempladas':'contemplada'}`:''}.${tie} ${narratives[i].meaning||''}`;
}
function rol(){
 const p=profile(answers),i=leaderIndex(),n=i>=0?narratives[i]:null;
 if(i<0)return `<section class="sm-result stage" style="--g1:${COLORS.result[0]};--g2:${COLORS.result[1]}"><div class="stage-inner"><p class="kicker">Tu rol en el ecosistema GovTech</p><h1 data-assemble>Tu ADN está por descubrir</h1><p class="lede">Marcaste las ${TOTAL} preguntas como aún no contempladas o pendientes. No es una falta: es un punto de partida. Revisa las dimensiones y elige por dónde empezar.</p>${countsBlock()}</div></section>${stepper('rol')}`;
 /* Tarjeta de rol (diseño acordado con el equipo): organización grande, arco con el arquetipo y el rol en una franja.
    Las respuestas no se muestran aquí; el reparto queda plegado en «¿Por qué este rol?». */
 return `<section class="sm-result stage sm-rolcard" style="--g1:${COLORS.result[0]};--g2:${COLORS.result[1]};--band:${ARCH_BANNER[i]}"><div class="stage-inner">
 ${shared?'<p class="rc-shared">Resultado compartido</p>':''}
 ${org?`<p class="rc-kicker">Organización</p><p class="rc-org" data-assemble>${e(org)}</p>`:'<p class="rc-kicker">Mi resultado</p><p class="rc-org" data-assemble>Mi ADN GovTech</p>'}
 <div class="rc-stage"><div class="arch sm-arch" data-scene="${ARCH_SCENES[i]}" aria-hidden="true"></div>
  <div class="rc-band"><small>${SHORT_ROUTE?'Mi afinidad inicial GovTech':'Mi rol en el ecosistema GovTech'}</small><h1>${archetypes[i]}</h1></div></div>
 <p class="lede rc-phrase" data-in>${n.phrase}</p>
 <ul class="sm-tags rc-tags" data-in>${ARCH_TAGS[i].map(t=>`<li>${t}</li>`).join('')}</ul>
 <details class="rc-why" data-in><summary>¿Por qué este rol?</summary><div class="rc-why-in">
  <p class="rc-why-lead">${whyLead(i,p)}</p>${countsBlock()}${adnBody()}</div></details>
 <p class="fine" data-in>${SHORT_ROUTE?'Primera aproximación con 9 preguntas: no sustituye el diagnóstico completo. ':''}ADN autodeclarado. No es un sello, una certificación ni una calificación.</p></div></section>${stepper('rol')}`;
}
function adnBody(){
 const line=ph=>{const p=phases.find(x=>x.id===ph);return `<article class="sm-line" style="--g1:${COLORS[ph][0]};--g2:${COLORS[ph][1]}"><header><span class="sm-line-l">${p.label}</span><h2>${p.name}</h2></header>${dims.filter(d=>d.phase===ph).map(d=>{const qs=diagnostic.filter(q=>q.dim===d.id);const by=archetypes.map((a,i)=>({a,i,n:qs.filter(q=>optOf(q)?.arquetipo===a).length})).filter(x=>x.n);const nc=qs.filter(isNC).length;return `<div class="sm-dim"><h3>${d.name}</h3><ol class="sm-chips">${qs.map(q=>{const o=optOf(q);return `<li style="--c:${o?ARCH_COLORS[archetypes.indexOf(o.arquetipo)]:'transparent'}" class="${o?'':'empty'}" title="${q.id}"><b>${o?o.letra:'–'}</b><small>${q.id}</small></li>`;}).join('')}</ol><p>${by.length?'Elegiste '+by.map(x=>`${x.n} de ${ARCH_SHORT[x.i]}`).join(', '):'Aún sin respuestas con arquetipo'}${nc?` · ${nc} aún no ${nc>1?'contempladas':'contemplada'}`:''}.</p><p class="sm-plain">${PLAIN[d.id]}</p></div>`;}).join('')}</article>`;};
 return `<div class="sm-adn rc-why-body"><h3 class="rc-h">Tu ADN en SER · HACER · TENER</h3><p class="lead">Cada esfera es una de tus ${TOTAL} respuestas, en orden. La letra y el color indican el arquetipo de la opción elegida.</p>
 <div class="seq-scroll"><div class="chart3d seq3d" data-chart="seq" role="img" aria-label="Secuencia de ${TOTAL} respuestas"></div></div>
 <ul class="arch-legend inline">${archetypes.map((a,i)=>`<li><span class="lg-dot" style="--c:${ARCH_COLORS[i]}">${'ABCD'[i]}</span>${a}</li>`).join('')}<li><span class="lg-dot nc">–</span>Aún no contemplado</li></ul>
 <div class="sm-lines">${['ser','hacer','tener'].map(line).join('')}</div>
 <p class="fine">Cinco dimensiones, no cinco niveles: ninguna mide madurez.</p></div>`;
}
function badgeFor(dimId){return badges.filter(b=>b.dim===dimId);}
/* ---------- Tu ruta con radar de capacidades (propuesta del 23-oct, por validar con Daniela) ----------
   Cada respuesta suma 1–3 a la capacidad que mide su pregunta (capacity-scores.json); el eje de cada dimensión es el
   promedio (0–3). El radar sugiere qué fortalecer (la dimensión más baja) y la persona puede elegir otra tocando el eje.
   No cambia el arquetipo y no es una calificación ni un sello. */
const CAP_SHORT={'01':'Propósito','02':'Experimentación','03':'Preparación','04':'Tecnología','05':'Recursos'};
const capName=q=>String(q.capacidad||'').replace(/^Cap\.\s*[\d.]+:\s*/,'');
const chosenDim=caps=>priority||suggestStrengthen(caps);
function radar(caps){
 const sel=chosenDim(caps),sug=suggestStrengthen(caps),W=440,H=400,cx=220,cy=205,R=128;
 const pt=(i,r)=>{const a=(-90+i*72)*Math.PI/180;return [cx+Math.cos(a)*r,cy+Math.sin(a)*r];};
 const poly=caps.map((c,i)=>pt(i,(c.value||0)/3*R).map(n=>n.toFixed(1)).join(',')).join(' ');
 const rings=[1,2,3].map(k=>`<circle cx="${cx}" cy="${cy}" r="${(R*k/3).toFixed(1)}" class="rd-ring"/>`).join('');
 const axes=caps.map((c,i)=>{const [x,y]=pt(i,R+22);return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="rd-axis ${c.id===sel?'on':''}" marker-end="url(#rd-arrow)"/>`;}).join('');
 const dots=caps.map((c,i)=>{const [x,y]=pt(i,(c.value||0)/3*R);return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${c.id===sel?8:5.5}" class="rd-dot ${c.id===sel?'on':''} ${c.band==='Por fortalecer'?'low':''}"/>`;}).join('');
 const labels=caps.map((c,i)=>{const [x,y]=pt(i,R+58);return `<button type="button" class="rd-lab ${c.id===sel?'on':''}" style="left:${(x/W*100).toFixed(2)}%;top:${(y/H*100).toFixed(2)}%" data-action="prio:${c.id}" aria-pressed="${c.id===sel}" aria-label="${c.name}: ${c.band}"><b>${CAP_SHORT[c.id]}</b><small class="band-${c.band==='Sólida'?'hi':c.band==='En desarrollo'?'mid':'low'}">${c.band}</small>${c.id===sug?'<em>Sugerida</em>':''}</button>`;}).join('');
 return `<div class="rd-wrap"><svg viewBox="0 0 ${W} ${H}" class="rd-svg" role="img" aria-label="Radar de tus 5 capacidades: ${caps.map(c=>`${c.name} ${c.band}`).join('; ')}">
  <defs><marker id="rd-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="rd-head"/></marker>
  <linearGradient id="rd-fill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5fa8" stop-opacity=".55"/><stop offset="1" stop-color="#6a3df0" stop-opacity=".55"/></linearGradient></defs>
  ${rings}${axes}<polygon points="${poly}" class="rd-poly"/>${dots}</svg>${labels}</div>
  <p class="rd-key"><span><i class="band-low"></i>Por fortalecer</span><span><i class="band-mid"></i>En desarrollo</span><span><i class="band-hi"></i>Sólida</span></p>`;
}
function priorityDetail(caps=capacities(answers)){
 const id=chosenDim(caps),d=dims.find(x=>x.id===id),c=caps.find(x=>x.id===id);if(!d)return '<p class="sm-hint">Toca un eje del radar para ver tu siguiente paso.</p>';
 const bs=badgeFor(d.id),qs=diagnostic.filter(q=>q.dim===d.id);
 const rows=qs.map(q=>{const a=answers[q.id],o=optOf(q);const v=q.id==='P17'?null:o?capScore(q.id,o.letra):a?.skip&&a.reason==='nc'?0:null;
  return `<li><span class="cap-v v${v??'x'}" aria-hidden="true">${v==null?'·':v}</span><div><b>${e(capName(q))}</b><small>${q.id==='P17'?'Pregunta nueva: su puntuación está pendiente de validar.':o?e(capReason(q.id,o.letra)):a?.skip&&a.reason==='nc'?'Aún no lo tienes contemplado: buen punto para empezar.':'No aplica a tu oferta.'}</small></div></li>`;}).join('');
 return `<div class="sm-prio"><p class="eyebrow">${id===suggestStrengthen(caps)&&!priority?'Te sugerimos fortalecer':'Elegiste fortalecer'}</p><h3>${d.name} <span class="band-${c.band==='Sólida'?'hi':c.band==='En desarrollo'?'mid':'low'} cap-band">${c.band}</span></h3>
 <ul class="cap-rows">${rows}</ul>
 <p><b>Siguiente paso:</b> ${d.next}</p><p class="sm-ev"><b>Qué podrías preparar:</b> ${d.evidence}</p>
 ${bs.length?`<p class="sm-ev"><b>Insignia relacionada:</b> ${bs.map(b=>b.name).join(' · ')}</p>`:''}</div>`;
}
/* Insignias «tipo Duolingo»: pequeñas y solo las que aplican: las de dimensiones En desarrollo o Sólidas en el radar.
   No se otorgan: el estado es «por sustentar». */
function badgeRow(caps=capacities(answers)){
 const ok=new Set(caps.filter(c=>c.value!=null&&c.value>=1.5).map(c=>c.id)),sel=chosenDim(caps);
 const bs=badges.filter(b=>ok.has(b.dim));
 if(!bs.length)return '<p class="sm-hint">Cuando una dimensión esté en desarrollo, aquí verás la insignia que puedes empezar a sustentar.</p>';
 return `<ul class="sm-duo">${bs.map(b=>`<li class="${sel===b.dim?'on':''}"><span class="duo-art" data-badge="b${b.id}"></span><b>${b.name}</b><small>Por sustentar</small></li>`).join('')}</ul>`;
}
function ruta(){
 if(SHORT_ROUTE)return summitRoute();
 const caps=capacities(answers);
 return `<section class="page light sm-page sm-ruta"><p class="eyebrow">Tu siguiente paso</p><h1>Tus dimensiones y qué fortalecer</h1>
 <p class="lead">Lectura experimental de tus prácticas. P17 aún no tiene puntaje. Toca una dimensión para explorar el siguiente paso.</p>
 <div id="radar-box">${radar(caps)}</div>
 <div id="priority-detail" aria-live="polite">${priorityDetail(caps)}</div>
 <h2 class="sm-h2">Insignias que tu ADN puede empezar a sustentar</h2>
 <div id="badge-row">${badgeRow(caps)}</div>
 <div class="sm-seal"><p class="eyebrow">Tu ADN no es el sello</p><ol>${[['Declarar',1],['Sustentar'],['Verificar'],['Sello B-GovTech']].map(([t,here],k)=>`<li class="${here?'here':''}"><span>${here?CHECK:k+1}</span>${t}${here?'<em>Aquí estás</em>':''}</li>`).join('')}</ol><p class="fine">Las insignias y el sello se obtienen con evidencia y verificación. Las reglas de emisión siguen en definición.</p></div>
 <p class="fine">Lectura orientativa de lo que declaraste: no es una calificación ni un sello. Propuesta de puntajes en revisión.</p></section>${stepper('ruta')}`;
}
/* v14 · 2-nov: vuelve el radar (araña) al final del Summit, con la misma regla del completo (capacity-scores.json).
   Con 9 preguntas cada eje se arma con 1 o 2 respuestas: se dice en pantalla. P17 sigue sin puntaje de radar. */
function summitRoute(){
 const caps=capacities(answers),per=dims.map(d=>diagnostic.filter(q=>q.dim===d.id&&capScore(q.id,'A')!=null).length),lo=Math.min(...per),hi=Math.max(...per);
 const path=[['Conoce dónde estás','Tu ADN',1],['Prepárate paso a paso','Ruta e insignias'],['Hazte visible','Ecosistema'],['Aliado estratégico','Sello B-GovTech']];
 return `<section class="page light sm-page sm-ruta"><p class="eyebrow">Tu siguiente paso</p><h1>Tus capacidades y qué fortalecer</h1>
 <p class="lead">Cada respuesta suma a una capacidad. Toca un eje para ver qué la arma y por dónde empezar.</p>
 <div id="radar-box">${radar(caps)}</div>
 <p class="v14-few">Lectura inicial: en el Summit cada eje se arma con ${lo===hi?lo:`${lo} a ${hi}`} ${hi>1?'respuestas':'respuesta'}. El diagnóstico completo la afina.</p>
 <div id="priority-detail" aria-live="polite">${priorityDetail(caps)}</div>
 <h2 class="sm-h2">Insignias que tu ADN puede empezar a sustentar</h2>
 <div id="badge-row">${badgeRow(caps)}</div>
 <div class="sm-seal"><p class="eyebrow">Tu camino al Sello B-GovTech</p><ol>${path.map(([t,sub,here],k)=>`<li class="${here?'here':''}"><span>${here?CHECK:k+1}</span>${t}<small>${sub}</small>${here?'<em>Aquí estás</em>':''}</li>`).join('')}</ol><p class="fine">Las insignias y el sello se obtienen con evidencia y verificación; sus reglas y niveles siguen en definición. Responder no los otorga.</p></div>
 <p class="fine">Lectura orientativa de lo que declaraste: no es una calificación ni un sello. Propuesta de puntajes en revisión.</p></section>${stepper('ruta')}`;
}
/* v14 · QR de la tarjeta (quiosco): la tarjeta, con el nombre de la empresa, se guarda en el servidor y el QR abre
   /t/<id> en el celular para descargarla. Si cambia el nombre, hay que volver a generarlo. */
const qrCardIdle=()=>`${btn('Generar el QR de mi tarjeta','qr-card','solid big')}<p class="v14-qr-hint">${org?'Tu tarjeta llevará el nombre de tu empresa.':'Si quieres, escribe arriba el nombre de tu empresa antes de generarlo.'}</p>`;
async function makeCardQR(){
 const box=document.querySelector('#qr-card');if(!box)return;const id=shared?sharedId:rid;
 box.innerHTML='<p class="v14-qr-hint" role="status">Generando tu QR…</p>';
 const img=await cardDataURL(cardData());
 const ok=img&&await sendRemote('tarjeta',{id,organizacion:org,imagen:img,codigo:encodeResult(answers),recorrido:SHORT_ROUTE?'summit':'completo'});
 const link=SITE+(SHORT_ROUTE?'?recorrido=summit':'?recorrido=completo')+'#r='+encodeResult(answers)+'&s='+id;
 box.innerHTML=ok?`${qrSVG(location.origin+'/t/'+id,'Escanea con tu celular para descargar tu tarjeta')}`
  :`${qrSVG(link,'Escanea con tu celular para ver tu resultado y descargar tu tarjeta')}<p class="v14-qr-hint">No pudimos guardar la tarjeta; este QR abre tu resultado.</p>`;
}
/* v14 · 2-nov: sin descarga de Excel (las respuestas van a la base de datos). En el quiosco, el QR lleva el resultado al
   celular, donde se descargan tarjeta e informe. En el celular: descargas, invitación opcional por correo (con
   autorización) y nota de tratamiento de datos. */
function llevar(){
 const id=shared?sharedId:rid;
 const link=SITE?SITE+(SHORT_ROUTE?'?recorrido=summit':'?recorrido=completo')+'#r='+encodeResult(answers)+(REMOTE&&id?'&s='+id:''):'';
 const mins=startedAt&&finishedAt?Math.max(1,Math.round((finishedAt-startedAt)/60000)):0;
 return `<section class="page light sm-page sm-llevar"><p class="eyebrow">Tu tarjeta ADN</p><h1>Llévate tu ADN</h1>
 <div class="sm-card-prev"><img id="card-img" hidden alt="Tarjeta con tu rol en el ecosistema GovTech" width="540" height="810"></div>
 <div class="qfields sm-org"><label for="org-name">Nombre de tu empresa (opcional)</label><input id="org-name" type="text" maxlength="40" autocomplete="organization" placeholder="${KIOSK?'Toca para escribir':'Si prefieres no darlo, déjalo vacío'}" value="${e(org)}" ${KIOSK?'readonly inputmode="none"':''}><small>Aparece en tu tarjeta${KIOSK?'':' y tu informe'}.</small></div>
 <div class="sm-take">${KIOSK?(REMOTE&&id?`<div class="v14-qrcard" id="qr-card">${qrCardIdle()}</div>`:qrSVG(link,'Escanea con tu celular para descargar tu tarjeta y tu informe')):''}
 <div class="sm-take-b">${KIOSK?'':btn('Descargar tarjeta (imagen)','card','solid')}${KIOSK?'':btn('Descargar informe (PDF)','pdf')}${!KIOSK&&navigator.share?btn('Compartir','share'):''}</div>
 ${!KIOSK&&REMOTE&&id?`<form class="v14-contact" id="contact-form" novalidate><p class="eyebrow">Conexión con el ecosistema · opcional</p>
  <label for="contact-mail">¿Quieres recibir invitaciones a eventos de Bogotá Capital GovTech y Campus 2600? Déjanos tu correo.</label>
  <div class="v14-contact-row"><input id="contact-mail" type="email" inputmode="email" autocomplete="email" maxlength="120" placeholder="nombre@empresa.com"></div>
  <label class="v14-check"><input id="contact-ok" type="checkbox"> Autorizo el tratamiento de mi correo para recibir invitaciones y novedades del ecosistema, según la Ley 1581 de 2012. Puedo pedir que lo borren cuando quiera.</label>
  <button class="pill-btn solid" type="submit">Quiero recibirlas</button>
  <p class="v14-contact-msg" id="contact-msg" role="status"></p></form>`:''}
 <details class="v14-data"><summary>Tratamiento de datos</summary>${REMOTE?`<ul>
  <li>Guardamos tus respuestas del ADN y tu opinión para analizar y mejorar el servicio. No pedimos tu nombre.</li>
  <li>El nombre de tu empresa solo se guarda si lo escribes. Si generas el QR, tu tarjeta se guarda para que la descargues. Tu correo, solo si lo dejas y lo autorizas.</li>
  <li>Los datos los consulta únicamente el equipo de Bogotá Capital GovTech y no se usan para calificar ni contratar.</li>
  <li>Puedes pedir consultar, corregir o borrar tus datos al equipo de Bogotá Capital GovTech.</li></ul>`:`<p>Esta versión no envía tus respuestas: todo se genera en tu dispositivo.</p>`}</details>
 <p class="fine">${KIOSK?`${REMOTE?'Escanea el QR antes de terminar.':`El enlace solo lleva tus ${TOTAL} respuestas del ADN.`} Al terminar, esta pantalla se borra.`:'Tu tarjeta y tu informe se generan en tu dispositivo.'}${mins?` · Tu recorrido tomó ${mins===1?'1 minuto':`unos ${mins} minutos`}.`:''}</p></div></section>${stepper('llevar')}`;
}

/* C08 al final, como opinión: mismo texto y opciones. A–E se ordenan tocándolas; «Aún no lo sabemos» va aparte;
   «Otra expectativa» se escribe solo en el celular (en el stand no hay teclado). Se guarda C08 = la primera prioridad. */
/* v14: las elegidas suben arriba en el orden en que se tocaron (1, 2, 3…); las demás quedan debajo. */
function rankList(){const os=byId.C08.opciones.filter(o=>'ABCDE'.includes(o.letra)),r=l=>{const n=feedback.rank.indexOf(l);return n<0?99+os.findIndex(o=>o.letra===l):n;};return [...os].sort((a,b)=>r(a.letra)-r(b.letra)).map(o=>{const n=feedback.rank.indexOf(o.letra);return `<li><button type="button" class="sm-rank-b ${n>=0?'on':''}" data-action="rank:${o.letra}" aria-pressed="${n>=0}"><span class="sm-rank-n" aria-hidden="true">${n>=0?n+1:''}</span><span class="sm-rank-t">${e(o.texto)}${C08_COMPONENT[o.letra]?`<small class="sm-rank-c">${e(C08_COMPONENT[o.letra])}</small>`:''}</span>${n>=0?`<span class="sr-only">, prioridad ${n+1}</span>`:''}</button></li>`;}).join('');}
function rankAlt(){const f=byId.C08.opciones.find(o=>o.letra==='F');return `<button type="button" class="pill-btn ghost ${feedback.unsure?'on':''}" data-action="rank-unsure" aria-pressed="${feedback.unsure}">${e(f.texto)}</button>${feedback.rank.length?btn('Reiniciar el orden','rank-reset','ghost'):''}`;}
/* C08 redactada hacia el valor (23-oct, pedido de Santiago; pendiente de confirmar con el equipo).
   Las opciones A–G son las aprobadas, sin cambios. Texto original: «¿Qué le gustaría obtener primero de este servicio?». */
const C08_ASK='¿Qué parte del servicio les aporta más valor?';
/* 28-oct (pedido de Santiago): a qué parte del servicio corresponde cada opción, entre paréntesis. Las opciones aprobadas
   no cambian; la etiqueta es de trabajo y se exporta para el análisis. */
const C08_COMPONENT={A:'tu rol y tu ADN',B:'guía para trabajar con entidades públicas',C:'la ruta para fortalecer',D:'conexiones con el ecosistema',E:'las insignias y el sello'};
const c08Label=l=>{const o=byId.C08.opciones.find(x=>x.letra===l);return o?o.texto+(C08_COMPONENT[l]?` (${C08_COMPONENT[l]})`:''):'';};
function opinion(){
 const g=byId.C08.opciones.find(o=>o.letra==='G');
 return `<section class="page light sm-page sm-opinion"><p class="eyebrow">Tu opinión · opcional</p><h1>${C08_ASK}</h1>
 <p class="lead">Toca primero el que más valor le ves: sube al puesto 1. Luego el siguiente, y así. Puedes elegir solo algunos; toca de nuevo para quitarlo.</p>
 <ol class="sm-rank" id="rank">${rankList()}</ol><div class="sm-rank-alt" id="rank-alt">${rankAlt()}</div>
 <fieldset class="ux-rating"><legend>¿Qué tan clara fue esta experiencia? <small>Opcional</small></legend><div class="ux-stars">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="clarity" value="${n}" ${feedback.clarity===n?'checked':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 14.78 8.63 21 9.54 16.5 13.93 17.56 20.12 12 17.2 6.44 20.12 7.5 13.93 3 9.54 9.22 8.63Z"/></svg><span class="sr-only">${n} de 5: ${['nada clara','poco clara','medianamente clara','clara','muy clara'][n-1]}</span><span aria-hidden="true">${n}</span></label>`).join('')}</div><div class="ux-rating-labels"><span>1 · Nada clara</span><span>5 · Muy clara</span></div><p id="clarity-value" aria-live="polite">${feedback.clarity?feedback.clarity+' de 5':'Sin valoración'}</p><button type="button" class="link-btn" data-action="clear-clarity">Quitar valoración</button></fieldset>
 <div class="qfields sm-add"><label for="fb-add">¿Qué otro componente le agregarías? (opcional)</label><input id="fb-add" type="text" maxlength="200" autocomplete="off" value="${e(feedback.add)}"></div>
 <p class="fine">Puedes saltar este paso. ${REMOTE?'Tu opinión se guarda con tus respuestas, sin tu nombre, y aparece en tu informe.':`Tu opinión se queda en ${KIOSK?'esta sesión':'este navegador'} y aparece en tu informe; no se envía.`}</p></section>${stepper('opinion')}`;
}
function syncC08(){if(feedback.rank.length)answers.C08={values:[feedback.rank[0]]};else if(feedback.unsure)answers.C08={values:['F']};else delete answers.C08;answers=clean(answers);save();}
function refreshOpinion(focus){const r=document.querySelector('#rank'),a=document.querySelector('#rank-alt');
 if(r){const before=new Map([...r.querySelectorAll('[data-action]')].map(b=>[b.dataset.action,b.getBoundingClientRect().top]));r.innerHTML=rankList();
  r.querySelectorAll('[data-action]').forEach(b=>{const y=before.get(b.dataset.action);if(y!=null&&motionOK()){const d=y-b.getBoundingClientRect().top;if(d){gsap.killTweensOf(b);gsap.fromTo(b,{y:d},{y:0,duration:.45,ease:'expo.out',clearProps:'transform'});}}});
  if(focus){const f=r.querySelector(`[data-action="${focus}"]`);f?.classList.add('pop');f?.focus({preventScroll:true});}}
 if(a)a.innerHTML=rankAlt();}

function render(next,arg){
 switch(next){
  case 'attract':return attract();case 'chapter':return chapter(arg);case 'question':return question(arg);case 'intra':return intra();
  case 'review':return review();case 'revelar':return revelar();case 'tie':return tieView();case 'rol':return rol();case 'ruta':return ruta();case 'opinion':return opinion();case 'llevar':return llevar();
  default:return welcome();
 }
}

/* ---------- Pastilla de etapas y riel de puntos («la ruta hacia abajo» del v8) ---------- */
function renderPill(next){
 const pill=document.querySelector('#mode-pill');const ph=phaseOf(next,current);
 if(isJourney(next)){
  pill.setAttribute('aria-label','Tu resultado');
  pill.innerHTML=`<span class="mp-ind" aria-hidden="true"></span>${steps().map(([id,label])=>`<button type="button" data-action="${id}" ${id===next?'aria-current="page"':''}>${label}</button>`).join('')}`;
 }else if(FLOW.includes(next)){
  pill.setAttribute('aria-label','Etapas del diagnóstico');
  const reached=p=>p.id===ph||visible(answers).some(q=>q.phase===p.id&&valid(q,answers[q.id]));
  pill.innerHTML=`<span class="mp-ind" aria-hidden="true"></span>${phases.map(p=>`<button type="button" ${reached(p)?`data-action="phase:${p.id}"`:'disabled'} ${p.id===ph?'aria-current="step"':''}>${p.label}</button>`).join('')}`;
 }else{pill.hidden=true;pill.innerHTML='';return;}
 pill.hidden=false;requestAnimationFrame(placeIndicator);
}
function placeIndicator(){
 const pill=document.querySelector('#mode-pill'),ind=pill.querySelector('.mp-ind'),act=pill.querySelector('[aria-current]');
 if(!ind)return;if(!act){ind.style.opacity='0';return;}
 ind.style.opacity='1';ind.style.transform=`translateX(${act.offsetLeft}px)`;ind.style.width=act.offsetWidth+'px';
 act.scrollIntoView({block:'nearest',inline:'center'});
}
function renderRail(next){
 const rail=document.querySelector('#rail');
 if(!['chapter','question'].includes(next)){rail.hidden=true;rail.innerHTML='';return;}
 const list=visible(answers),answered=list.filter(q=>valid(q,answers[q.id])).length,open=list.find(q=>!valid(q,answers[q.id]));
 rail.dataset.mode='steps';
 rail.innerHTML=`<p class="rail-count"><b>${answered}</b>/${list.length}<span class="sr-only"> preguntas respondidas</span></p><ol class="rail-groups">${phases.map(p=>`<li class="rail-group ${phaseOf(next,current)===p.id?'current':''}"><span class="rail-label" aria-hidden="true">${p.label}</span><ol>${list.filter(q=>q.phase===p.id).map(q=>{const n=list.indexOf(q)+1,done=valid(q,answers[q.id]),skip=!!answers[q.id]?.skip,now=next==='question'&&q.id===current,can=!now&&(done||q===open);return `<li><button type="button" class="rd ${done?'done':''} ${skip?'skip':''} ${now?'now':''}" ${can?`data-action="question:${q.id}"`:'disabled'} ${now?'aria-current="step"':''} aria-label="${p.label}, pregunta ${n} de ${list.length}"></button></li>`;}).join('')}</ol></li>`).join('')}</ol>`;
 rail.hidden=false;
}

/* ---------- 3D y gráficos ---------- */
function mountAll(){
 main.querySelectorAll('[data-scene]').forEach(el=>scenes.set(el,mountScene(el,el.dataset.scene,{})));
 main.querySelectorAll('[data-floating]').forEach(el=>scenes.set(el,mountFloating(el,el.dataset.floating)));
 main.querySelectorAll('[data-helix]').forEach(el=>scenes.set(el,mountHelix(el)));
 main.querySelectorAll('[data-chart="seq"]').forEach(el=>scenes.set(el,mountSequence3D(el,{nodes:seqNodes(),groups:seqGroups(),fallback:''})));
 main.querySelectorAll('[data-badge]').forEach(el=>{const url=renderBadge(el.dataset.badge,460,280);el.insertAdjacentHTML('beforeend',url?`<img src="${url}" alt="" width="460" height="280" decoding="async">`:`<span class="b10-fallback">${el.dataset.badge.slice(1)}</span>`);});
}
function disposeAll(){scenes.forEach(d=>d());scenes.clear();}
function cardData(){
 const i=leaderIndex(),p=profile(answers);
 return {org,banner:i>=0?ARCH_BANNER[i]:'#8b45d6',index:i,name:i>=0?archetypes[i]:'ADN por descubrir',phrase:i>=0?(SHORT_ROUTE?'Summit · afinidad inicial: ':'')+narratives[i].phrase:'Un punto de partida para conocer tu forma de aportar a lo público.',tags:i>=0?ARCH_TAGS[i]:[],color:i>=0?ARCH_COLORS[i]:'#9b84ee',
  still:i>=0?renderStill(ARCH_SCENES[i],1000,900):'',groups:seqGroups(),nodes:diagnostic.map(q=>{const o=optOf(q);return {id:q.id,letter:o?.letra||'–',color:colorOf(q)};}),counts:p.counts,colors:ARCH_COLORS,archetypes};
}

/* ---------- Animación de entrada ---------- */
function animateIn(next){
 if(!motionOK()||next==='question')return;
 const E='power3.out';
 assemble(main.querySelector('[data-assemble]'),.05);
 const ins=main.querySelectorAll('[data-in],.lede,.kicker');
 if(ins.length)gsap.from(ins,{opacity:0,y:14,duration:.45,ease:E,stagger:.06,delay:.2,clearProps:'transform,opacity'});
 if(next==='question'){const ws=splitWords(main.querySelector('#q-title'));if(ws.length)gsap.from(ws,{yPercent:105,opacity:0,duration:.5,ease:'power4.out',stagger:.025});gsap.from(main.querySelectorAll('.qopt'),{y:14,opacity:0,duration:.35,ease:E,stagger:.04,delay:.1,clearProps:'transform,opacity'});}
 if(next==='chapter'){gsap.from(main.querySelector('.big-num'),{yPercent:40,opacity:0,duration:.7,ease:'power4.out'});gsap.from(main.querySelectorAll('.ch-glass'),{y:50,opacity:0,scale:.96,duration:.8,ease:'power4.out'});gsap.from(main.querySelectorAll('.ph-steps li'),{opacity:0,y:-8,duration:.35,stagger:.05});}
 if(next==='welcome'||next==='attract'){gsap.from(main.querySelectorAll('.fh-arch,.sa-arch'),{y:60,opacity:0,duration:.9,ease:'power4.out'});gsap.from(main.querySelectorAll('.fh-steps li'),{x:24,opacity:0,duration:.5,ease:E,stagger:.1,delay:.5});}
 if(next==='rol'){gsap.from(main.querySelectorAll('.sm-arch'),{y:70,opacity:0,duration:.9,ease:'power4.out'});gsap.from(main.querySelectorAll('.sm-counts .bar i'),{scaleX:0,transformOrigin:'0 50%',duration:.8,ease:E,stagger:.08,delay:.5});}
 if(next==='adn')gsap.from(main.querySelectorAll('.sm-line'),{y:24,opacity:0,duration:.5,ease:E,stagger:.1,delay:.3,clearProps:'transform,opacity'});
 if(isJourney(next)||['review','tie','intra'].includes(next))gsap.from(main.querySelectorAll('.sm-page > :not(h1):not(:has(.sm-bar))'),{opacity:0,y:12,duration:.4,ease:E,stagger:.04,clearProps:'transform,opacity'});
}

/* ---------- Navegación ---------- */
function pick(prev,next,arg,push,opts){
 if(next==='question'||(prev==='question'&&next==='review'))return {kind:'none'};
 if(opts.instant||!prev)return {kind:'none'};
 const back=!push||opts.back;
 if(next==='chapter'){const p=phases.find(p=>p.id===arg);return back?{kind:'curtain',color:COLORS[arg][0],dir:-1}:{kind:'portal',color:COLORS[arg][0],label:p.label,sub:p.name};}
 if(next==='revelar')return {kind:'portal',color:COLORS.result[0],label:'ADN',sub:'Tu resultado está listo'};
 if(next==='rol'&&prev==='revelar')return {kind:'curtain',color:COLORS.result[0],dir:1};
 if(next==='rol'&&!isJourney(prev)){const i=leaderIndex();return {kind:'portal',color:COLORS.result[0],label:i>=0?ARCH_SHORT[i]:'ADN',sub:'Tu rol en el ecosistema'};}
 if(next==='question'&&['question','chapter','review','intra'].includes(prev)){const list=visible(answers),a=list.findIndex(q=>q.id===current),b=list.findIndex(q=>q.id===arg);return {kind:'slide',axis:'y',dir:back||(a>=0&&b<a)?-1:1};}
 if(isJourney(next)&&isJourney(prev)){const o=s=>JOURNEY.findIndex(([id])=>id===s);return {kind:'slide',axis:'x',dir:o(next)>=o(prev)?1:-1};}
 const ph=phaseOf(next,arg);
 return {kind:'curtain',color:ph?COLORS[ph][0]:'#211744',dir:back?-1:1};
}
function swap(next,arg,push){
 disposeAll();cleanup();
 screen=next;current=arg;
 const ph=phaseOf(next,arg),cs=COLORS[ph]||COLORS.perfil;
 const dark=['chapter','attract','rol','revelar'].includes(next);
 document.body.dataset.theme=dark?'stage':'light';document.body.dataset.screen=next;document.body.dataset.layout=layout;
 document.body.style.setProperty('--g1',cs[0]);document.body.style.setProperty('--g2',cs[1]);
 document.querySelector('meta[name="theme-color"]').content=dark?cs[0]:'#ffffff';
 main.innerHTML=render(next,arg);
 if(push)try{history.pushState({next,arg},'',(shared?'#r='+encodeResult(answers)+'&':'#')+next+(arg?':'+arg:''));}catch{}
 window.scrollTo({top:0,left:0,behavior:'instant'});
 const title=main.querySelector('h1');
 document.title='ADN GovTech · '+(title?.textContent?.trim()||'Formulario');
 renderPill(next);renderRail(next);mountAll();bind(next);
 if(title){title.tabIndex=-1;title.focus({preventScroll:true});}
}
async function show(next,arg='',push=true,opts={}){
 if(busy){queued=[next,arg,push,opts];return;}
 busy=true;document.body.dataset.busy='1';
 try{
  if(next==='adn')next='rol';
  if(isJourney(next)&&!shared&&profile(answers).needsTie)next='tie';
  /* Al pasar de la revisión (o del desempate) al resultado, primero la revelación «Desliza para ver tu ADN». */
  if(next==='rol'&&['review','tie'].includes(screen)&&!shared)next='revelar';
  if((isJourney(next)||next==='revelar')&&!finishedAt&&!shared){finishedAt=Date.now();save();}
  const t=pick(screen,next,arg,push,opts);
  const p=lastPoint;lastPoint=null;
  await run(t.kind,{...t,main,x:p?.x,y:p?.y},()=>swap(next,arg,push));
  if(!opts.noEnter)animateIn(next);
 }finally{busy=false;delete document.body.dataset.busy;}
 if(queued){const q=queued;queued=null;show(...q);}
}
function nextQuestion(id){
 const list=visible(answers),last=layout==='bloques'&&byId[id].dim?blockFor(id).at(-1).id:id,i=list.findIndex(q=>q.id===last),next=list[i+1];
 if(editing){editing=false;show('review');return;}
 if(!next){show('review');return;}
 const chapter=next.phase!==byId[id].phase;show(chapter?'chapter':'question',chapter?next.phase:next.id);
}
function bind(next){
 wireKioskInputs();
 if(next==='question'){if(byId[current].dim&&layout==='bloques')bindBlock();else bindQuestion(byId[current]);}
 if(next==='revelar')bindReveal();
 if(next==='chapter'&&current==='perfil'){const inp=document.querySelector('#org-start');if(inp){if(KIOSK)inp.addEventListener('click',()=>openKeyboard(inp));else inp.addEventListener('input',()=>{org=inp.value.trim().slice(0,40);save();});}}
 if(next==='tie')document.querySelector('#tie-form').addEventListener('submit',ev=>{ev.preventDefault();const sel=new FormData(ev.target).get('tie');if(sel===null){document.querySelector('#error').textContent='Elige una opción para ver tu ADN.';return;}answers=resolveTie(answers,Number(sel));save();show('rol');});
 if(next==='llevar'){
  const img=document.querySelector('#card-img'),paint=()=>cardDataURL(cardData()).then(u=>{if(u&&img){img.src=u;img.hidden=false;}});paint();
  let t=0;const on=document.querySelector('#org-name');
  on?.addEventListener('input',ev=>{org=ev.target.value.trim().slice(0,40);save();clearTimeout(t);t=setTimeout(paint,350);const q=document.querySelector('#qr-card');if(q)q.innerHTML=qrCardIdle();});
  document.querySelector('#contact-form')?.addEventListener('submit',async ev=>{ev.preventDefault();
   const mail=document.querySelector('#contact-mail').value.trim(),ok=document.querySelector('#contact-ok').checked,msg=document.querySelector('#contact-msg');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)){msg.textContent='Revisa tu correo.';return;}
   if(!ok){msg.textContent='Para guardarlo necesitamos tu autorización.';return;}
   msg.textContent='Enviando…';const sent=await sendRemote('contacto',{id:shared?sharedId:rid,email:mail,organizacion:org,autoriza:true,recorrido:SHORT_ROUTE?'summit':'completo'});
   msg.textContent=sent?'¡Listo! Te escribiremos con las próximas invitaciones.':'No pudimos guardarlo. Intenta de nuevo en un momento.';if(sent)ev.target.querySelector('button').disabled=true;});
 }
 if(next==='opinion'){
  document.querySelector('#fb-add')?.addEventListener('input',ev=>{feedback.add=ev.target.value.slice(0,200);save();});
  document.querySelectorAll('[name=clarity]').forEach(input=>input.addEventListener('change',()=>{feedback.clarity=Number(input.value);save();document.querySelector('#clarity-value').textContent=input.value+' de 5';}));
 }
}
function bindQuestion(q){
 let selected=answers[q.id]?.skip?answers[q.id].reason==='nc'?['__nc']:answers[q.id].reason==='na'?['__na']:[]:[...(answers[q.id]?.values||[])];
 const inputs=[...main.querySelectorAll('[name="answer"]')];const error=document.querySelector('#error');const form=document.querySelector('#question-form');
 const max=MAXSEL[q.id]||1;let pointer=false,timer=0;
 form.addEventListener('pointerdown',()=>{pointer=true;});
 function sync(){
  const cnt=document.querySelector('#sel-count');if(cnt)cnt.textContent=`${selected.length} de ${max} elegidas`;
  const ready=q.id==='C07'||selected.length>0;
  document.querySelector('#q-submit').classList.toggle('is-waiting',!ready);
  document.querySelector('#q-status').textContent=ready?'':'Elige una opción';
  main.querySelectorAll('.ux-order').forEach(el=>{const value=el.closest('label').querySelector('input').value,i=selected.indexOf(value);el.textContent=i<0?'':i===0?'Principal':q.id==='C02'?'Secundario':'Adicional';});
 }
 const search=document.querySelector('#sector-search');
 search?.addEventListener('input',()=>{const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),term=norm(search.value.trim());let matches=0;main.querySelectorAll('.ux-chips .ux-choice').forEach(label=>{const match=norm(label.textContent).includes(term);if(match)matches++;label.hidden=!match&&!label.querySelector('input').checked;});document.querySelector('#sector-empty').hidden=matches>0;});
 inputs.forEach(input=>input.addEventListener('change',()=>{
  if(!q.multi){selected=[input.value];}else{
   selected=selected.filter(v=>v!==input.value);if(input.checked)selected.push(input.value);
   const excl=EXCLUSIVE[q.id];if(input.checked&&input.value===excl)selected=[excl];else if(input.checked)selected=selected.filter(v=>v!==excl);
   if(selected.length>max){selected=selected.filter(v=>v!==input.value);error.textContent=`Puedes elegir hasta ${max}.`;shake(error);}else error.textContent='';
   inputs.forEach(el=>el.checked=selected.includes(el.value));
  }
  sync();
  if(q.id!=='C07'){const a=selected[0]==='__nc'?{skip:true,reason:'nc'}:selected[0]==='__na'?{skip:true,reason:'na'}:{values:selected};if(valid(q,a)){answers[q.id]=a;answers=clean(answers);save();}else{delete answers[q.id];save();}}
 }));
 /* Avance automático en preguntas de una opción: solo al tocar (no con teclado), también si se vuelve a tocar
    la opción ya elegida. Ya no hay campos de texto que completar. */
 // Avance explícito: permite leer, corregir o cambiar de formato sin saltos inesperados.
 sync();
 form.addEventListener('submit',ev=>{
  ev.preventDefault();clearTimeout(timer);
  const a=selected[0]==='__nc'?{skip:true,reason:'nc'}:selected[0]==='__na'?{skip:true,reason:'na'}:q.id==='C07'?{fields:[0,1].map(i=>[...form.querySelectorAll(`[name="t${i}"]:checked`)].map(x=>x.value).join(' · '))}:{values:selected};
  if(q.id==='C07'&&!valid(q,a)){answers[q.id]={skip:true};answers=clean(answers);save();nextQuestion(q.id);return;}
  if(!valid(q,a)){error.textContent='Elige una respuesta para continuar.';shake(error);return;}
  answers[q.id]=a;answers=clean(answers);save();
  if(q.id==='C02'&&selected[0]==='D'&&!editing){show('intra');return;}
  nextQuestion(q.id);
 });
}

/* Teclado en pantalla solo para el nombre de la organización en el stand (un único campo opcional).
   Mayúscula automática al empezar cada palabra; ⇧ cambia la siguiente letra. */
/* Teclado en pantalla del quiosco (no hay teclado físico ni del sistema). Sirve para cualquier campo de texto:
   toma su etiqueta y su límite, escribe en vivo (el buscador filtra mientras se teclea) y al cerrar deja el valor final. */
function openKeyboard(inp){
 document.querySelector('#kbd')?.remove();
 const raw=document.querySelector(`label[for="${inp.id}"]`)?.textContent||inp.placeholder||'Escribe',optional=/opcional/i.test(raw);
 const label=raw.replace(/\s*\(?opcional\)?\s*/i,' ').trim(),max=inp.maxLength>0?inp.maxLength:60,words=inp.id==='org-name';
 const rows=['1234567890','QWERTYUIOP','ASDFGHJKLÑ','ZXCVBNM&.-','ÁÉÍÓÚ,¿?@_'];
 const box=document.createElement('div');box.id='kbd';box.className='sm-kbd';box.setAttribute('role','dialog');box.setAttribute('aria-label','Teclado: '+label);
 box.innerHTML=`<div class="kbd-in"><p class="kbd-label">${e(label)}${optional?' <small>opcional</small>':''}</p><output class="kbd-out" id="kbd-out"></output>
 ${rows.map(r=>`<div class="kbd-row">${[...r].map(k=>`<button type="button" data-k="${e(k)}">${e(k)}</button>`).join('')}</div>`).join('')}
 <div class="kbd-row"><button type="button" data-k="shift" class="kbd-w" aria-label="Mayúscula">⇧</button><button type="button" data-k=" " class="kbd-space">espacio</button><button type="button" data-k="del" class="kbd-w" aria-label="Borrar">⌫</button></div>
 <div class="kbd-row kbd-act"><button type="button" data-k="clear" class="pill-btn ghost">Borrar todo</button><button type="button" data-k="ok" class="pill-btn solid big">Listo</button></div></div>`;
 document.body.appendChild(box);
 let val=inp.value||'',shift=false;const out=box.querySelector('#kbd-out');
 const paint=()=>{out.textContent=val||'Escribe aquí';out.classList.toggle('empty',!val);box.querySelector('[data-k="shift"]').classList.toggle('on',shift);};
 const sync=()=>{inp.value=val;inp.dispatchEvent(new Event('input',{bubbles:true}));};
 const done=()=>{val=val.trim();sync();closeKbd(box);};
 paint();
 box.addEventListener('click',ev=>{
  if(ev.target===box){done();return;}
  const k=ev.target.closest('[data-k]')?.dataset.k;if(k==null)return;
  if(k==='ok'||k==='close'){done();return;}
  if(k==='del')val=val.slice(0,-1);else if(k==='clear')val='';else if(k==='shift'){shift=!shift;paint();return;}
  else if(val.length<max){const start=!val||(words?val.endsWith(' '):/[.?¿]\s$/.test(val));const ch=/[A-ZÑÁÉÍÓÚ]/.test(k)?(start||shift?k:k.toLowerCase()):k;val+=ch;shift=false;}
  paint();sync();
 });
}
/* En el quiosco todos los campos de texto usan el teclado en pantalla. */
function wireKioskInputs(){
 if(!KIOSK)return;
 main.querySelectorAll('input[type="text"],input[type="search"],input[type="email"],textarea').forEach(i=>{
  if(i.dataset.kbd)return;i.dataset.kbd='1';i.readOnly=true;i.inputMode='none';if(!i.placeholder)i.placeholder='Toca para escribir';
  i.addEventListener('click',()=>openKeyboard(i));i.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();openKeyboard(i);}});
 });
}
/* El teclado sale por donde entró (abajo). No bloquea: deja de recibir toques desde el primer instante de la salida. */
function closeKbd(box){
 box.style.pointerEvents='none';const sheet=box.querySelector('.kbd-in');
 if(!motionOK()||!sheet?.animate){box.remove();return;}
 const opt={duration:240,easing:'cubic-bezier(.32,.72,0,1)',fill:'forwards'};
 box.animate([{opacity:1},{opacity:0}],opt);sheet.animate([{transform:getComputedStyle(sheet).transform==='none'?'translateY(0)':getComputedStyle(sheet).transform},{transform:'translateY(100%)'}],opt).finished.then(()=>box.remove(),()=>box.remove());
}
function ask(title,text,ok){
 const d=document.querySelector('#confirm-dialog');
 if(typeof d.showModal!=='function')return Promise.resolve(window.confirm(text));
 d.querySelector('#confirm-title').textContent=title;d.querySelector('#confirm-text').textContent=text;d.querySelector('#confirm-ok').textContent=ok;
 d.returnValue='';d.showModal();d.querySelector('#confirm-cancel').focus();
 return new Promise(res=>d.addEventListener('close',()=>res(d.returnValue==='ok'),{once:true}));
}
function home(){show(KIOSK?'attract':'welcome','',true,{back:true});}

async function handle(action,arg){
 if(action==='start'){
  if(!KIOSK&&hasSaved()&&!(await ask('¿Empezar de nuevo?','Se borrarán las respuestas guardadas en este navegador.','Sí, empezar de nuevo')))return;
  wipe();seed=newSeed();startedAt=Date.now();rid=newId();save();show('chapter','perfil');
 }else if(action==='resume'){({answers,seed,priority,org,feedback,startedAt,finishedAt,rid}=load());const next=visible(answers).find(q=>!valid(q,answers[q.id]));show(next?'question':'review',next?.id||'');}
 else if(action==='phase'){editing=false;show('question',firstOpenIn(arg).id);}
 else if(action==='question'){editing=false;show('question',arg);}
 else if(action==='edit'){editing=true;show('question',arg);}
 else if(action==='skip'){answers[current]=arg?{skip:true,reason:arg}:{skip:true};answers=clean(answers);save();nextQuestion(current);}
 else if(action==='back'){
  const list=visible(answers),first=layout==='bloques'&&byId[current].dim?blockFor(current)[0].id:current,i=list.findIndex(q=>q.id===first),prev=list[i-1],q=byId[current];
  if(editing){editing=false;show('review','',true,{back:true});}
  else if(!prev||prev.phase!==q.phase)show('chapter',q.phase,true,{back:true});
  else show('question',prev.id,true,{back:true});
 }else if(action==='chapter-back'){
  const n=phases.findIndex(p=>p.id===current);
  if(n<=0)home();else{const prev=visible(answers).filter(q=>q.phase===phases[n-1].id).pop();show('question',prev.id,true,{back:true});}
 }else if(action==='continue-offer')nextQuestion('C02');
 else if(action==='prio'){priority=arg;save();const caps=capacities(answers);document.querySelector('#radar-box').innerHTML=radar(caps);const box=document.querySelector('#priority-detail');box.innerHTML=priorityDetail(caps);const br=document.querySelector('#badge-row');br.innerHTML=badgeRow(caps);mountBadges(br);if(motionOK())gsap.from(box.children,{opacity:0,y:12,duration:.35,stagger:.05});box.scrollIntoView({behavior:motionOK()?'smooth':'auto',block:'nearest'});}
 else if(action==='rank'){feedback.rank=feedback.rank.includes(arg)?feedback.rank.filter(x=>x!==arg):[...feedback.rank,arg];feedback.unsure=false;syncC08();refreshOpinion('rank:'+arg);}
 else if(action==='rank-reset'){feedback.rank=[];syncC08();refreshOpinion();}
 else if(action==='rank-unsure'){feedback.unsure=!feedback.unsure;if(feedback.unsure)feedback.rank=[];syncC08();refreshOpinion();}
 else if(action==='clear-clarity'){delete feedback.clarity;save();document.querySelectorAll('[name=clarity]').forEach(x=>x.checked=false);document.querySelector('#clarity-value').textContent='Sin valoración';}
 else if(action==='card')downloadCard(cardData());
 else if(action==='qr-card')makeCardQR();
 else if(action==='pdf')printReport(reportHTML());
 else if(action==='share'){try{const blob=await (await fetch(await cardDataURL(cardData()))).blob();const file=new File([blob],'Mi_ADN_GovTech.png',{type:'image/png'});const data={title:'Mi ADN GovTech',text:'Descubrí mi rol en el ecosistema GovTech.',...(SITE?{url:SITE}:{})};if(navigator.canShare?.({files:[file]}))data.files=[file];await navigator.share(data);}catch{}}
 else if(action==='finish'){if(await ask('¿Terminar y borrar?','Tus respuestas se borrarán de esta pantalla para la siguiente persona.','Sí, terminar')){wipe();show('attract');}}
 else if(action==='own'){wipe();shared=false;history.replaceState(null,'',location.pathname+location.search);show('welcome');}
 else if(action==='home')home();
 else if(action==='result')show('rol');
 else if(action==='sello')show('ruta');
 else if(action==='adn')show('rol');
 else show(action,arg||'');
}
function mountBadges(scope){scope.querySelectorAll('[data-badge]').forEach(el=>{if(el.querySelector('img'))return;const url=renderBadge(el.dataset.badge,460,280);el.insertAdjacentHTML('beforeend',url?`<img src="${url}" alt="" width="460" height="280">`:'');});}

/* Informe para PDF (impresión del navegador): resultado, ruta y respuestas. Solo se genera en este dispositivo. */
function reportHTML(){
 const p=profile(answers),i=leaderIndex(),n=i>=0?narratives[i]:null,d=dims.find(x=>x.id===chosenDim(capacities(answers)));
 return `<h1>Mi ADN GovTech</h1><p class="r-meta">${org?e(org)+' · ':''}Bogotá Capital GovTech · ${new Date().toLocaleDateString('es-CO',{dateStyle:'long'})} · ADN autodeclarado, no es un sello.</p>
 <h2>${i>=0?archetypes[i]:'ADN por descubrir'}</h2>${n?`<p>${n.phrase}</p><p>${n.meaning}</p><p><b>Oportunidad:</b> ${n.opportunity}</p>`:''}
 <p>${archetypes.map(a=>`${a}: ${p.counts[a]}`).join(' · ')} · Aún no contemplado: ${notConsidered(answers).length} (de ${TOTAL})</p>
 ${SHORT_ROUTE?'<p>Summit: primera aproximación con 9 preguntas; no sustituye el diagnóstico completo.</p>':''}${`<h2>Tus capacidades (propuesta de lectura)</h2><ul>${capacities(answers).map(c=>`<li><b>${c.name}:</b> ${c.band}${c.value!=null?` (${c.value.toFixed(1)} de 3)`:''}</li>`).join('')}</ul>`}
 ${d?`<h2>Tu prioridad: ${d.name}</h2><p>${d.next}</p><p><b>Qué podrías preparar:</b> ${d.evidence}</p>`:''}
 <h2>Tus respuestas</h2>${phases.map(ph=>`<h3>${ph.label} · ${ph.name}</h3><ol>${visible(answers).filter(q=>q.phase===ph.id).map(q=>`<li><b>${q.id}.</b> ${e(q.pregunta)}<br><i>${e(answerText(q,answers[q.id]))}</i></li>`).join('')}</ol>`).join('')}
 ${feedback.clarity?`<p><b>Claridad de la experiencia:</b> ${feedback.clarity} de 5 (opinión, no puntúa en el ADN).</p>`:''}
 ${feedback.rank.length||feedback.unsure||feedback.add?`<h2>Componentes del servicio a los que más valor le ves</h2>${feedback.unsure?'<p>Aún no lo sabemos.</p>':`<ol>${feedback.rank.map(l=>`<li>${e(c08Label(l))}</li>`).join('')}</ol>`}${feedback.add?`<p><b>Agregarías:</b> ${e(feedback.add)}</p>`:''}`:''}
 <p class="r-meta">Las insignias y el sello requieren evidencia y verificación posteriores. Este informe no otorga reconocimientos.</p>`;
}

/* Excel para validar y analizar (28-oct, solo formulario completo; en el quiosco no hay descarga).
   Lleva lo mismo que la persona ve: preguntas, respuestas en texto, resultado, capacidades y opinión. No expone la lógica
   del modelo: ni letras originales, ni el arquetipo de cada opción, ni puntajes por opción, ni el orden aleatorio. */
const fmtDate=t=>new Date(t).toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'});
function answerCell(q){const a=answers[q.id];if(!a)return '';if(a.skip)return a.reason==='nc'?NOT_CONSIDERED:a.reason==='na'?NOT_APPLICABLE:'Omitida';return answerText(q,a);}
function excelSheets(){
 const p=profile(answers),i=leaderIndex(),caps=capacities(answers),sug=suggestStrengthen(caps),sel=chosenDim(caps),dn=id=>dims.find(d=>d.id===id)?.name||'';
 const mins=startedAt&&finishedAt?Math.max(1,Math.round((finishedAt-startedAt)/60000)):'';
 const na=diagnostic.filter(q=>answers[q.id]?.skip&&answers[q.id].reason!=='nc').length;
 const arch=i>=0?archetypes[i]:'Por descubrir',tie=p.affinities.length?`Sí, con ${p.affinities.join(' y ')}`:'No';
 const rank=[0,1,2,3,4].map(k=>feedback.rank[k]?c08Label(feedback.rank[k]):'');
 const qs=questions.filter(q=>q.id!=='C08'),shown=new Set(visible(answers).map(q=>q.id));
 const resumen=[['Sección','Campo','Valor','Detalle'],
  ['Registro','Fecha de descarga',fmtDate(Date.now()),''],
  ['Registro','Versión','ADN GovTech · v13 formatos guiados · '+(SHORT_ROUTE?'Summit 9':'Completo'),'Prototipo; ADN autodeclarado, no es un sello'],
  ['Registro','Formato al finalizar',layout,layout==='guiado'?'Formato asignado por pregunta · revisión UX 30-oct':'Vista de laboratorio'],
  ['Registro','Cambio de instrumento','P17 nueva; P0.4 retirada','No comparar automáticamente con v12/v11. P17 sin puntaje de radar.'],
  ['Registro','Organización',org||'(no indicada)',''],
  ['Registro','Inicio del recorrido',startedAt?fmtDate(startedAt):'',''],
  ['Registro','Duración (minutos)',mins,''],
  ['Resultado','Rol en el ecosistema (arquetipo)',arch,i>=0?narratives[i].phrase:''],
  ['Resultado','Empate resuelto en la pregunta de precisión',tie,''],
  ...archetypes.map(a=>['Resultado',`Respuestas con práctica ${a}`,p.counts[a],`de ${TOTAL}`]),
  ['Resultado',NOT_CONSIDERED,notConsidered(answers).length,`de ${TOTAL}`],
  ['Resultado',NOT_APPLICABLE,na,`de ${TOTAL}`],
  ...caps.map(c=>['Capacidades',c.name,c.value!=null?Math.round(c.value*100)/100:'',c.band+(c.value!=null?' (escala 0 a 3)':'')+(SHORT_ROUTE?' · lectura inicial Summit':'')]),
  ['Capacidades','Sugerida para fortalecer',dn(sug),''],
  ['Capacidades','Elegida para fortalecer',dn(sel),priority?'La eligió la persona':'Igual a la sugerida'],
  ...rank.map((t,k)=>['Opinión',`Componente con más valor · prioridad ${k+1}`,t,'']),
  ['Opinión','Aún no lo sabemos',feedback.unsure?'Sí':'No',''],
  ['Opinión','Otro componente que agregaría',feedback.add||'',''],
  ['Opinión','Claridad de la experiencia (1–5)',feedback.clarity||'','Opcional; 1 nada clara, 5 muy clara. No modifica el ADN.']];
 const respuestas=[['Fase','Dimensión','ID','Pregunta','Respuesta'],
  ...qs.filter(q=>shown.has(q.id)).map(q=>[phases.find(x=>x.id===q.phase)?.label||'',dn(q.dim),q.id,q.pregunta,answerCell(q)]),
  ['Opinión','','C08',C08_ASK,feedback.unsure?'Aún no lo sabemos':feedback.rank.map((l,k)=>`${k+1}. ${c08Label(l)}`).join(' | ')]];
 const head=['Fecha','Organización','Duración (min)','Arquetipo','Empate',...archetypes.map(a=>`N ${a}`),'N aún no contemplado','N no aplica',...caps.map(c=>`Cap. ${CAP_SHORT[c.id]}`),...caps.map(c=>`Banda ${CAP_SHORT[c.id]}`),'Fortalecer (sugerida)','Fortalecer (elegida)',...rank.map((_,k)=>`Valor ${k+1}`),'Aún no lo sabemos','Agregaría',...qs.map(q=>q.id),'Claridad experiencia (1–5)'];
 const row=[fmtDate(Date.now()),org,mins,arch,tie,...archetypes.map(a=>p.counts[a]),notConsidered(answers).length,na,...caps.map(c=>c.value!=null?Math.round(c.value*100)/100:''),...caps.map(c=>c.band),dn(sug),dn(sel),...rank,feedback.unsure?'Sí':'No',feedback.add,...qs.map(q=>shown.has(q.id)?answerCell(q):''),feedback.clarity||''];
 return [{name:'Resumen',rows:resumen,widths:[14,42,46,40]},{name:'Respuestas',rows:respuestas,widths:[10,26,7,70,70]},{name:'Fila para consolidar',rows:[head,row],widths:head.map(()=>22)}];
}
/* v14: lo que se guarda en la base de datos. «resumen» es la fila para consolidar (lo mismo que veía la persona);
   «detalle» agrega, solo para el equipo, la letra original, el arquetipo de la opción, su puntaje y la posición en pantalla. */
function remotePayload(){
 const [, , fila]=excelSheets(),[head,row]=fila.rows;
 const detalle=[...visible(answers),byId.C08].filter(Boolean).map(q=>{const a=answers[q.id],o=q.dim?optOf(q):null;
  return {id:q.id,fase:phases.find(x=>x.id===q.phase)?.label||'',dimension:dims.find(d=>d.id===q.dim)?.name||'',pregunta:q.id==='C08'?C08_ASK:q.pregunta,
   respuesta:q.id==='C08'?(feedback.unsure?'Aún no lo sabemos':feedback.rank.map((l,k)=>`${k+1}. ${c08Label(l)}`).join(' | ')):answerCell(q),
   letras:q.id==='C08'?feedback.rank.join(''):a?.skip?(a.reason||'omitida'):(a?.values||[]).join(','),
   arquetipo:o?.arquetipo||'',puntaje:o?capScore(q.id,o.letra):null,posicion:o?ordered(q).findIndex(x=>x.letra===o.letra)+1:null};});
 return {id:rid,recorrido:SHORT_ROUTE?'summit':'completo',modo:KIOSK?'quiosco':'web',version:'v14',inicio:startedAt?new Date(startedAt).toISOString():'',fin:finishedAt?new Date(finishedAt).toISOString():'',
  arquetipo:leaderIndex()>=0?archetypes[leaderIndex()]:'',organizacion:org,resumen:Object.fromEntries(head.map((h,i)=>[h,row[i]??''])),detalle};
}
const excelName=()=>`ADN_GovTech_${(org||'respuestas').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,40)||'respuestas'}_${new Date().toISOString().slice(0,10)}.xlsx`;

/* ---------- Quiosco: inactividad y reinicio ---------- */
let idleT=0,idleW=0;
function idleReset(){
 if(!KIOSK)return;clearTimeout(idleT);clearTimeout(idleW);document.querySelector('#idle')?.remove();
 if(screen==='attract')return;
 idleW=setTimeout(()=>{
  const box=document.createElement('div');box.id='idle';box.className='sm-idle';box.setAttribute('role','alertdialog');box.setAttribute('aria-labelledby','idle-t');
  box.innerHTML=`<div><h2 id="idle-t">¿Sigues ahí?</h2><p>Por privacidad, la pantalla se reiniciará en <b id="idle-n">${Math.round((IDLE_RESET-IDLE_WARN)/1000)}</b> s.</p><button class="pill-btn solid big" type="button" id="idle-ok">Sigo aquí</button></div>`;
  document.body.appendChild(box);document.querySelector('#idle-ok').focus();
  let left=Math.round((IDLE_RESET-IDLE_WARN)/1000);const tick=setInterval(()=>{left--;const n=document.querySelector('#idle-n');if(n)n.textContent=left;else clearInterval(tick);},1000);
 },IDLE_WARN);
 idleT=setTimeout(()=>{document.querySelector('#idle')?.remove();document.querySelector('#confirm-dialog').open&&document.querySelector('#confirm-dialog').close();wipe();show('attract','',true,{instant:true});},IDLE_RESET);
}
['pointerdown','keydown','scroll','touchstart'].forEach(t=>addEventListener(t,()=>{if(document.querySelector('#idle')&&t==='scroll')return;idleReset();},{passive:true,capture:true}));

/* ---------- Eventos globales ---------- */
document.addEventListener('click',ev=>{
 const b=ev.target.closest('[data-action]');
 if(!b||b.disabled||b.closest('dialog'))return;
 if(b.matches('label,input')||ev.target.closest('label'))return;
 const r=b.getBoundingClientRect();lastPoint={x:r.left+r.width/2,y:r.top+r.height/2};
 const [action,arg]=b.dataset.action.split(':');handle(action,arg);
});
function syncMotion(){document.querySelector('#motion-toggle').setAttribute('aria-pressed',String(!motionOK()));document.querySelector('#motion-label').textContent=motionOK()?'Reducir movimiento':'Movimiento reducido';}
applyMotionAttr();syncMotion();onSystemMotionChange(syncMotion);
document.querySelector('#motion-toggle').onclick=()=>{toggleMotion();syncMotion();show(screen,current,false,{instant:true});};
document.querySelector('#home').onclick=async()=>{if(KIOSK&&screen!=='attract'){if(await ask('¿Volver al inicio?','Se borrarán las respuestas de esta sesión.','Sí, volver')){wipe();show('attract');}}else if(!KIOSK)show('welcome');};
window.addEventListener('popstate',ev=>{const s=ev.state;if(!s)return;if(s.next==='question'&&!visible(answers).some(q=>q.id===s.arg)){show('review','',false);return;}show(s.next||'welcome',s.arg||'',false);});
addEventListener('resize',()=>placeIndicator());
document.documentElement.classList.toggle('kiosk',KIOSK);

/* ---------- Arranque: enlace de resultado (#r=…), demo (?demo=0..3) o inicio ---------- */
const hashCode=/[#&]r=([A-Dx.\-0-3]+)/.exec(location.hash)?.[1];
const decoded=hashCode?decodeResult(hashCode):null;
const sharedId=/[#&]s=([A-Za-z0-9-]{8,64})/.exec(location.hash)?.[1]||'';
let first=KIOSK?'attract':'welcome';
if(decoded){answers=decoded;shared=true;first='rol';}
else if(params.has('demo')){answers=demo(+params.get('demo')||0);isDemo=true;first=params.has('revelar')?'revelar':'rol';}
else ({answers,seed,priority,org,feedback,startedAt,finishedAt,rid}=load());
if(finishedAt&&!rid&&!shared&&!isDemo){rid=newId();save();}
if(KIOSK&&!decoded&&!isDemo){wipe();}
history.replaceState({next:first,arg:''},'',location.hash||'#'+first);
const example=LAB&&byId[params.get('ejemplo')]?params.get('ejemplo'):'';
if(example){isDemo=true;answers=example==='C05'?{C04:{values:['B']}}:{};first=example==='C08'?'opinion':'question';}
show(first,example,false,{instant:true,noEnter:true}).then(()=>loader(()=>{animateIn(first);idleReset();}));

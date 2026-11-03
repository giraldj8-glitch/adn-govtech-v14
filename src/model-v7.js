import rows from './matrix.json';
export const phases=[
 {id:'perfil',name:'Conozcámonos',label:'Perfil',intro:'Tu organización, su aporte y su contexto. Esta información orienta el recorrido; no puntúa ni determina un arquetipo.',scene:'perfil'},
 {id:'ser',name:'Lo que nos mueve',label:'SER',intro:'Reconocemos el propósito que conecta a tu organización con una necesidad pública y el cambio que busca generar.',scene:'f1'},
 {id:'hacer',name:'Cómo lo hacemos',label:'HACER',intro:'Miramos cómo experimentan, colaboran y adaptan su forma de trabajar al contexto público.',scene:'f2'},
 {id:'tener',name:'Con qué contamos',label:'TENER',intro:'Describimos la tecnología, los recursos y las condiciones actuales para cumplir y dar continuidad a lo acordado.',scene:'f3'}
];
export const dims=[
 {id:'01',name:'Propósito y valor público',phase:'ser',icon:'01',desc:'Conectar la oferta con un problema público y un cambio observable para las personas.',parts:['Necesidad pública','Personas y contexto','Cambio esperado','Observación del valor'],next:'Precisar el problema, a quién afecta y cómo observar el cambio.',evidence:'Ficha del problema, investigación con usuarios e indicadores pertinentes.',badges:['Brújula pública']},
 {id:'02',name:'Experimentación y colaboración',phase:'hacer',icon:'02',desc:'Probar ideas y construir con otros, incorporando hallazgos y aportes en las decisiones.',parts:['Hipótesis y pruebas','Aprendizaje e iteración','Participación de usuarios','Acuerdos y decisiones compartidas'],next:'Diseñar una prueba y acordar con usuarios y aliados qué aprender y cómo decidir.',evidence:'Plan de prueba, registros de hallazgos, acuerdos y cambios realizados.',badges:['Explorador de hipótesis','Articulador de alianzas']},
 {id:'03',name:'Preparación para lo público',phase:'hacer',icon:'06',desc:'Entender el contexto institucional y adaptar la propuesta y la relación de trabajo al sector público.',parts:['Necesidades y actores','Condiciones de colaboración','Modelo de negocio y tiempos públicos','Alcance y acuerdos'],next:'Traducir la oferta a un caso público y reconocer qué ajustes necesita el modelo de trabajo.',evidence:'Propuesta contextualizada, mapa de actores y acuerdos de alcance.',badges:['Navegante institucional']},
 {id:'04',name:'Tecnología responsable',phase:'tener',icon:'04',desc:'Conocer qué hace la tecnología, cómo se integra y cómo protege los datos y los derechos de las personas.',parts:['Funcionamiento y límites','Integración con sistemas existentes','Datos, permisos y seguridad','Portabilidad y salida'],next:'Documentar una integración real o prevista, sus límites y el tratamiento de la información.',evidence:'Demostración, arquitectura, pruebas de integración y controles de datos.',badges:['Estratega de tecnología']},
 {id:'05',name:'Recursos y continuidad',phase:'tener',icon:'07',desc:'Contar con las condiciones operativas para entregar, sostener y transferir lo acordado.',parts:['Oferta y equipo disponible','Soporte y transferencia','Recursos para operar','Riesgos y contingencias'],next:'Precisar responsables, recursos, soporte y respuesta ante cambios o fallas.',evidence:'Plan de implementación, responsables, recursos y contingencias.',badges:[]}
];
export const archetypes=['Proveedor Tecnológico de Escala','Solucionador GovTech','Aliado Especializado','Potencial GovTech'];
export const tieQuestion='Ante un reto de una entidad pública, ¿cuál sería el aporte principal de tu organización?';
export const tieOptions=['Adaptar e implementar una solución tecnológica que ya tenemos.','Explorar el reto con la entidad y probar una solución conjuntamente.','Aportar conocimiento o un servicio especializado junto con otros aliados.','Definir cómo podríamos contribuir y preparar una primera prueba.'];
export const answerSignature=answers=>JSON.stringify(questions.filter(q=>q.dim).map(q=>[q.id,valid(q,answers[q.id])?answers[q.id].values||null:null]));
export function resolveTie(answers,index){const p=profile(answers);if(!p.candidates.includes(archetypes[index])||p.candidates.length<2)return answers;return {...answers,__tie:{choice:archetypes[index],signature:answerSignature(answers)}};}
export const archetypeDescriptions=['Aporta una oferta tecnológica estructurada y capacidad de despliegue.','Adapta soluciones al problema público mediante aprendizaje y trabajo conjunto.','Aporta conocimiento o servicios especializados a la construcción de soluciones.','Está explorando cómo orientar su aporte y desarrollar su vínculo con lo público.'];
export const narratives=[
 {phrase:'Llevas una oferta tecnológica estructurada a retos públicos.',meaning:'Tu patrón se orienta a desplegar y sostener una oferta tecnológica con procesos definidos.',opportunity:'Explorar qué ajustes necesita esa oferta para un contexto institucional y unas personas concretas.',scenarios:['Integración de sistemas','Despliegue de servicios','Operación y soporte'],route:'Contextualizar la oferta',steps:['Escoge una necesidad pública y explica qué parte de tu oferta responde a ella.','Contrasta integraciones, datos y condiciones de operación con la entidad.','Prepara una demostración contextualizada y evidencia de soporte.'],deliverable:'Ficha de ajuste al contexto público + demostración y condiciones de operación.'},
 {phrase:'Conviertes un reto público en una solución que aprende con otros.',meaning:'Tu patrón se orienta a adaptar la solución mediante evidencia, colaboración y comprensión del contexto público.',opportunity:'Conectar lo aprendido en las pruebas con un plan de implementación y continuidad.',scenarios:['Pilotos con entidades','Cocreación con usuarios','Adaptación de soluciones'],route:'Del aprendizaje a la continuidad',steps:['Resume una hipótesis, la prueba realizada y la decisión que cambió.','Acuerda un alcance viable con usuarios, entidad y aliados.','Conecta el piloto con responsables, recursos y soporte.'],deliverable:'Caso de aprendizaje documentado + plan de continuidad del piloto.'},
 {phrase:'Aportas una pieza especializada para resolver un reto compartido.',meaning:'Tu patrón se orienta a contribuir con conocimiento o servicios específicos dentro de una solución construida con otros.',opportunity:'Hacer explícitos el alcance de tu aporte, sus dependencias y los acuerdos con quienes lo complementan.',scenarios:['Investigación aplicada','Componentes especializados','Alianzas de implementación'],route:'Articular un aporte complementario',steps:['Describe qué resuelves, qué entregas y qué queda fuera de tu alcance.','Identifica quién complementa tu aporte y qué dependencias existen.','Acuerda responsabilidades, criterios de aceptación y transferencia.'],deliverable:'Ficha del aporte especializado + mapa de aliados y responsabilidades.'},
 {phrase:'Estás encontrando tu forma de aportar a lo público.',meaning:'Tu patrón se orienta a explorar cómo conectar tu oferta con necesidades y formas de trabajo del sector público.',opportunity:'Delimitar un primer caso de uso público y una prueba pequeña que permita aprender.',scenarios:['Exploración de retos','Primeros casos de uso','Pruebas de bajo alcance'],route:'Definir y probar un primer aporte',steps:['Elige una necesidad concreta y a quién afecta.','Formula una hipótesis y conversa con personas que conocen el problema.','Diseña una prueba acotada y registra lo que cambia en tu propuesta.'],deliverable:'Ficha de problema y aporte + plan de primera prueba.'}
];
const mapping={'01':'01','02':'02','03':'02','04':'04','05':'04','06':'03','07':'05','08':'05'};
export const questions=rows.map(r=>{
 const dim=mapping[r.dimension.slice(0,2)]||null;
 return {...r,dim,phase:dim?dims.find(d=>d.id===dim).phase:'perfil',multi:['C02','C03','C04'].includes(r.id),optional:['C06','C07','C08'].includes(r.id)};
}).sort((a,b)=>phases.findIndex(p=>p.id===a.phase)-phases.findIndex(p=>p.id===b.phase));
export const byId=Object.fromEntries(questions.map(q=>[q.id,q]));
export function visible(answers){return questions.filter(q=>q.id!=='C05'||(answers.C04?.values?.some(v=>v!=='A')&&!answers.C04?.skip));}
export function valid(q,a){
 if(!a)return false;
 if(a.skip)return true;
 if(q.id==='C07')return !!a.fields?.some(v=>typeof v==='string'&&v.trim());
 if(!Array.isArray(a.values)||!a.values.length||new Set(a.values).size!==a.values.length||a.values.some(v=>!q.opciones.some(o=>o.letra===v)))return false;
 if(!q.multi&&a.values.length!==1)return false;
 if(q.id==='C02'&&(a.values.length>2||(a.values.includes('E')&&a.values.length>1)))return false;
 if(q.id==='C03'&&(a.values.length>3||(a.values.includes('L')&&a.values.length>1)))return false;
 if(q.id==='C04'&&a.values.includes('A')&&a.values.length>1)return false;
 return true;
}
export function clean(answers){
 const out={};
 for(const q of questions)if(valid(q,answers?.[q.id]))out[q.id]=answers[q.id];
 if(!visible(out).some(q=>q.id==='C05'))delete out.C05;
 if(answers?.__tie){const p=profile({...out,__tie:answers.__tie});if(p.resolved)out.__tie=answers.__tie;}
 return out;
}
export function answerText(q,a){
 if(!a)return 'Sin responder';
 if(a.skip)return q.optional?'Omitida (opcional)':'Pendiente de aclarar / no aplica a nuestra oferta';
 if(q.id==='C07')return (a.fields||[]).filter(Boolean).join(' · ');
 return (a.values||[]).map(v=>q.opciones.find(o=>o.letra===v)?.texto||'').join(' · ');
}
export function profile(answers){
 const counts=Object.fromEntries(archetypes.map(a=>[a,0]));let answered=0;
 for(const q of questions.filter(q=>q.dim)){const a=answers[q.id];if(!valid(q,a)||a.skip)continue;const option=q.opciones.find(o=>o.letra===a.values[0]);if(option.arquetipo in counts){counts[option.arquetipo]++;answered++;}}
 const max=Math.max(...Object.values(counts));
 const candidates=max?archetypes.filter(a=>counts[a]===max):[];
 const resolved=candidates.length>1&&candidates.includes(answers.__tie?.choice)&&answers.__tie?.signature===answerSignature(answers);
 const leaders=resolved?[answers.__tie.choice]:candidates;
 const ranked=Object.values(counts).sort((a,b)=>b-a);
 return {counts,answered,leaders,candidates,resolved,needsTie:candidates.length>1&&!resolved,affinities:resolved?candidates.filter(a=>a!==answers.__tie.choice):[],max,margin:ranked[0]-ranked[1],complete:answered===20};
}
export function resultPlan(answers){
 const p=profile(answers);
 const indexes=p.leaders.map(a=>archetypes.indexOf(a));
 const trace=questions.filter(q=>q.dim&&valid(q,answers[q.id])&&!answers[q.id].skip).map(q=>({id:q.id,dim:q.dim,phase:q.phase,question:q.pregunta,answer:answerText(q,answers[q.id]),archetype:q.opciones.find(o=>o.letra===answers[q.id].values[0]).arquetipo}));
 const matching=trace.filter(t=>p.leaders.includes(t.archetype));
 const highlights=[];
 for(const t of matching)if(highlights.length<2&&!highlights.some(h=>h.dim===t.dim))highlights.push(t);
 if(highlights.length<2)for(const t of matching)if(highlights.length<2&&!highlights.some(h=>h.id===t.id))highlights.push(t);
 return {profile:p,indexes,trace,highlights,routes:indexes.map(i=>({archetype:archetypes[i],...narratives[i]}))};
}
export function demo(index){return Object.fromEntries(questions.map(q=>[q.id,q.id==='C07'?{fields:['Bogotá, Colombia','Colombia']}:{values:[q.dim?q.opciones[index].letra:q.opciones[0].letra]}]).filter(([id])=>id!=='C05'));}

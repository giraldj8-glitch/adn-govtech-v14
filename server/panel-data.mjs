/* Datos del panel /panel: solo los dos días del Summit y sin pruebas. Lo que queda fuera no se borra de la base:
   se cuenta y se explica en el panel. «posible» = caso dudoso, excluido por defecto pero que se puede incluir. */
const DIAS = ['2026-11-03', '2026-11-04'];
const ORG_PRUEBA = ['acme', 'prueba', 'stand sas'];
const ORG_DUDOSA = { consentido: 'El nombre coincide con el del dominio que aloja la app' };
const MIN_SEG = 90;
const CAPS = ['Propósito', 'Experimentación', 'Preparación', 'Tecnología', 'Recursos'];

const bogota = iso => new Date(new Date(iso).getTime() - 5 * 3600 * 1000).toISOString();
const multi = v => String(v || '').split(' · ').map(s => s.trim().replace(/: ¿cuál\?$/, '')).filter(Boolean);
const nombre = r => (r.organizacion_contacto || r.organizacion || '').trim();

function clasificar(r) {
  const org = nombre(r).toLowerCase(), mail = (r.email || '').toLowerCase();
  if (!DIAS.includes(bogota(r.creado).slice(0, 10))) return { fuera: 'Fuera de los días del Summit' };
  if (ORG_PRUEBA.includes(org) || ORG_PRUEBA.includes((r.organizacion || '').trim().toLowerCase()) || mail.endsWith('@ejemplo.com')) return { fuera: 'Prueba' };
  if (ORG_DUDOSA[org]) return { posible: ORG_DUDOSA[org] };
  if (r.datos) {
    if (!r.datos.inicio) return { posible: 'Sin hora de inicio' };
    const seg = (new Date(r.datos.fin) - new Date(r.datos.inicio)) / 1000;
    if (seg < MIN_SEG) return { posible: `Recorrido de ${Math.round(seg)} segundos` };
  }
  return {};
}
function registro(r, posible) {
  const b = bogota(r.creado), s = r.datos?.resumen || {}, seg = r.datos?.inicio ? (new Date(r.datos.fin) - new Date(r.datos.inicio)) / 1000 : null;
  const det = r.datos?.detalle || [], by = id => det.find(d => d.id === id);
  return {
    id: r.id, dia: b.slice(0, 10), hora: +b.slice(11, 13), reloj: b.slice(11, 16), tipo: r.datos ? 'diagnostico' : 'datos', posible: posible || '',
    modo: r.modo === 'quiosco' ? 'Quiosco' : r.modo === 'web' ? 'Celular o tableta' : 'QR de datos',
    org: nombre(r), mail: r.autoriza ? r.email || '' : '', web: r.empresa_web || '', desc: r.empresa_descripcion || '', interes: r.interes_futuro || '',
    agrega: [r.agregaria, s['Agregaría']].filter(Boolean).join(' · '), obs: r.observaciones || '',
    arq: s['Arquetipo'] || '', empate: !!s['Empate'] && s['Empate'] !== 'No', min: seg == null ? null : Math.round(seg / 6) / 10,
    claridad: +s['Claridad experiencia (1–5)'] || null, nc: +s['N aún no contemplado'] || 0, na: +s['N no aplica'] || 0,
    caps: Object.fromEntries(CAPS.map(c => [c, typeof s['Cap. ' + c] === 'number' ? s['Cap. ' + c] : null])),
    bandas: Object.fromEntries(CAPS.map(c => [c, s['Banda ' + c] || 'Sin datos'])),
    sug: s['Fortalecer (sugerida)'] || '', ele: s['Fortalecer (elegida)'] || '',
    valor: [1, 2, 3, 4, 5].map(i => s['Valor ' + i]).filter(Boolean), noSabe: s['Aún no lo sabemos'] === 'Sí',
    c01: by('C01')?.respuesta || '', c02: multi(by('C02')?.respuesta), c03: multi(by('C03')?.respuesta),
    resp: Object.fromEntries(det.filter(d => d.dimension).map(d => [d.id, { t: d.respuesta, l: d.letras, a: d.arquetipo, p: d.posicion }]))
  };
}
export function panelData(rows) {
  const incluidos = [], excluidos = [], preguntas = new Map();
  for (const r of rows) {
    const c = clasificar(r);
    if (c.fuera) { excluidos.push({ razon: c.fuera }); continue; }
    incluidos.push(registro(r, c.posible));
    for (const d of r.datos?.detalle || []) if (d.dimension && !preguntas.has(d.id)) preguntas.set(d.id, { id: d.id, fase: d.fase, dimension: d.dimension, pregunta: d.pregunta });
  }
  return { incluidos, excluidos, preguntas: [...preguntas.values()], caps: CAPS, dias: DIAS, generado: bogota(new Date().toISOString()).slice(0, 16).replace('T', ' ') };
}
/* Para el Excel del Summit: las mismas respuestas del panel, sin los casos dudosos. */
export const delSummit = r => { const c = clasificar(r); return !c.fuera && !c.posible; };

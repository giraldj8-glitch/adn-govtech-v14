/* Modelo de la experiencia breve del Summit.
   Usa las mismas preguntas, opciones, arquetipos, validaciones, conteo y desempate de model-v7.js,
   restringidos a la selección aprobada en el Excel (src/summit-selection.json):
   8 preguntas de caracterización (C05 condicional) y 14 diagnósticas: SER 2 · HACER 5 · TENER 7.
   Las 6 aplazadas no se muestran ni cuentan como faltantes. No hay pesos nuevos ni reglas nuevas. */
import * as base from './model-v7.js';
import selection from './summit-selection.json';
import capScores from './capacity-scores.json';

export const { phases, dims, archetypes, archetypeDescriptions, narratives, tieQuestion, tieOptions, valid } = base;

/* Respuesta neutra en las 14 preguntas ADN: «Aún no lo tenemos contemplado».
   Usa el mismo estado «pendiente» del modelo (skip): no suma a ningún arquetipo y no se interpreta como menor capacidad.
   Se guarda con reason:'nc' para distinguirla de «No aplica a nuestra oferta» (reason:'na'). Las opciones A–D no cambian. */
export const NOT_CONSIDERED = 'Aún no lo tenemos contemplado';
export const NOT_APPLICABLE = 'No aplica a nuestra oferta';
export function answerText(q, a) {
  if (a?.skip && q.dim) return a.reason === 'nc' ? NOT_CONSIDERED : a.reason === 'na' ? NOT_APPLICABLE : 'Pendiente de aclarar';
  return base.answerText(q, a);
}
export const notConsidered = answers => diagnostic.filter(q => answers[q.id]?.skip && answers[q.id].reason === 'nc');
export const SUMMIT_MODE = typeof location !== 'undefined' && new URLSearchParams(location.search).get('recorrido') === 'summit';
export const KEEP = SUMMIT_MODE ? selection.summit : selection.conservar;
export const DEFERRED = selection.aplazar;

const order = id => KEEP.indexOf(id);
export const questions = base.questions
  .filter(q => KEEP.includes(q.id))
  .sort((a, b) => phases.findIndex(p => p.id === a.phase) - phases.findIndex(p => p.id === b.phase) || order(a.id) - order(b.id));
export const byId = Object.fromEntries(questions.map(q => [q.id, q]));
export const diagnostic = questions.filter(q => q.dim);
export const TOTAL = diagnostic.length;

/* C08 («¿Qué le gustaría obtener primero de este servicio?») se pregunta al final, después del resultado,
   como opinión: la persona ordena sus opciones de más a menos importante. Mismo texto y opciones; no puntúa. */
export const AT_END = ['C08'];
export function visible(answers) {
  return questions.filter(q => !AT_END.includes(q.id) && (q.id !== 'C05' || (answers.C04?.values?.some(v => v !== 'A') && !answers.C04?.skip)));
}
export const answerSignature = answers => JSON.stringify(diagnostic.map(q => [q.id, valid(q, answers[q.id]) ? answers[q.id].values || null : null]));

export function profile(answers) {
  const counts = Object.fromEntries(archetypes.map(a => [a, 0])); let answered = 0;
  for (const q of diagnostic) {
    const a = answers[q.id];
    if (!valid(q, a) || a.skip) continue;
    const option = q.opciones.find(o => o.letra === a.values[0]);
    if (option.arquetipo in counts) { counts[option.arquetipo]++; answered++; }
  }
  const max = Math.max(...Object.values(counts));
  const candidates = max ? archetypes.filter(a => counts[a] === max) : [];
  const resolved = candidates.length > 1 && candidates.includes(answers.__tie?.choice) && answers.__tie?.signature === answerSignature(answers);
  const leaders = resolved ? [answers.__tie.choice] : candidates;
  const ranked = Object.values(counts).sort((a, b) => b - a);
  return { counts, answered, leaders, candidates, resolved, needsTie: candidates.length > 1 && !resolved, affinities: resolved ? candidates.filter(a => a !== answers.__tie.choice) : [], max, margin: ranked[0] - ranked[1], complete: answered === TOTAL };
}
export function resolveTie(answers, index) {
  const p = profile(answers);
  if (!p.candidates.includes(archetypes[index]) || p.candidates.length < 2) return answers;
  return { ...answers, __tie: { choice: archetypes[index], signature: answerSignature(answers) } };
}
export function clean(answers) {
  const out = {};
  for (const q of questions) if (valid(q, answers?.[q.id])) out[q.id] = answers[q.id];
  if (!visible(out).some(q => q.id === 'C05')) delete out.C05;
  if (answers?.__tie) { const p = profile({ ...out, __tie: answers.__tie }); if (p.resolved) out.__tie = answers.__tie; }
  return out;
}
export function resultPlan(answers) {
  const p = profile(answers);
  const indexes = p.leaders.map(a => archetypes.indexOf(a));
  const trace = diagnostic.filter(q => valid(q, answers[q.id]) && !answers[q.id].skip).map(q => ({ id: q.id, dim: q.dim, phase: q.phase, question: q.pregunta, answer: answerText(q, answers[q.id]), letter: answers[q.id].values[0], archetype: q.opciones.find(o => o.letra === answers[q.id].values[0]).arquetipo }));
  return { profile: p, indexes, trace, routes: indexes.map(i => ({ archetype: archetypes[i], ...narratives[i] })) };
}
export function demo(index) {
  return Object.fromEntries(questions.map(q => [q.id, q.id === 'C07' ? { fields: ['Bogotá, Colombia', 'Colombia'] } : { values: [q.dim ? q.opciones[index].letra : q.opciones[0].letra] }]).filter(([id]) => id !== 'C05'));
}

/* Enlace de resultado sin datos personales: solo la letra elegida en cada una de las 14 preguntas
   (o «-» si quedó pendiente) y, si hubo desempate, el arquetipo elegido. No incluye la caracterización. */
export function encodeResult(answers) {
  const letters = diagnostic.map(q => { const a = answers[q.id]; return !valid(q, a) ? '-' : a.skip ? (a.reason === 'nc' ? 'x' : '-') : a.values[0]; }).join('');
  const tie = answers.__tie ? archetypes.indexOf(answers.__tie.choice) : -1;
  return letters + (tie >= 0 ? '.' + tie : '');
}
export function decodeResult(code) {
  const m = /^([A-Dx-]+)(?:\.([0-3]))?$/.exec(String(code || ''));
  if (!m || m[1].length !== TOTAL) return null;
  const answers = {};
  diagnostic.forEach((q, i) => { const l = m[1][i]; answers[q.id] = l === 'x' ? { skip: true, reason: 'nc' } : l === '-' ? { skip: true } : { values: [l] }; });
  return m[2] !== undefined ? resolveTie(answers, +m[2]) : answers;
}

/* ---------- Capacidades (radar): PROPUESTA del 23-oct para revisión de Daniela, no regla oficial ----------
   Cada opción A–D suma 1, 2 o 3 según qué tanto practica la capacidad que mide su pregunta (capacity-scores.json, con
   la justificación de cada valor). «Aún no lo tenemos contemplado» suma 0 y cuenta; «No aplica» y lo pendiente no cuentan.
   El valor de cada dimensión es el promedio (0–3). Esto NO cambia el arquetipo: el rol sigue saliendo del conteo por frecuencia. */
export const CAPACITY_SCORES = capScores;
export const capScore = (id, letter) => capScores[id]?.[letter]?.[0] ?? null;
export const capReason = (id, letter) => capScores[id]?.[letter]?.[1] ?? '';
export const CAP_BANDS = [[2.5, 'Sólida'], [1.5, 'En desarrollo'], [0, 'Por fortalecer']];
export const capBand = v => v == null ? 'Sin datos' : CAP_BANDS.find(([min]) => v >= min - 1e-9)[1];
export function capacities(answers) {
  return base.dims.map(d => {
    const qs = diagnostic.filter(q => q.dim === d.id);
    let sum = 0, n = 0, nc = 0;
    qs.forEach(q => {
      const a = answers[q.id];
      if (!a || (a.skip && a.reason !== 'nc') || (!a.skip && !valid(q, a))) return;
      // P17 tiene asociación experimental a arquetipos, pero aún no puntaje de capacidad.
      if (!capScores[q.id]) return;
      n++; if (a.skip) { nc++; return; }
      sum += capScore(q.id, a.values[0]);
    });
    const value = n ? sum / n : null;
    return { id: d.id, name: d.name, phase: d.phase, value, n, nc, total: qs.length, band: capBand(value) };
  });
}
/* Qué fortalecer primero (sugerencia): la dimensión con menor valor; si empatan, la que tiene más «aún no contemplado»;
   si siguen empatadas, el orden SER → HACER → TENER. La persona puede elegir otra tocando el radar. */
export function suggestStrengthen(caps) {
  return caps.map((c, i) => ({ ...c, i })).filter(c => c.value != null).sort((a, b) => a.value - b.value || b.nc - a.nc || a.i - b.i)[0]?.id || '';
}

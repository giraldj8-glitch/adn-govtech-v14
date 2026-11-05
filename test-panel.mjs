/* Reglas del panel: qué entra, qué se excluye y qué queda como dudoso. Usa datos inventados. */
import assert from 'node:assert/strict';
import { panelData, delSummit } from './server/panel-data.mjs';
const res = { Arquetipo: 'Solucionador GovTech', Empate: 'No', 'Duración (min)': 5, 'Cap. Recursos': 2, 'Banda Recursos': 'Sólida', 'Valor 1': 'Algo (x)', 'Claridad experiencia (1–5)': '5' };
const det = [{ id: 'C01', respuesta: 'Empresa privada' }, { id: 'C03', respuesta: 'Salud (HealthTech) · Otro: ¿cuál?' }, { id: 'P1', dimension: 'Propósito', fase: 'SER', pregunta: '¿?', respuesta: 'R', letras: 'A', arquetipo: 'Solucionador GovTech', posicion: 2 }];
const diag = (creado, o = {}, seg = 300) => ({ id: creado + JSON.stringify(o), creado, recorrido: 'summit', modo: 'quiosco', organizacion: '', autoriza: 0, ...o, datos: { inicio: new Date(new Date(creado) - seg * 1000).toISOString(), fin: creado, resumen: res, detalle: det } });
const rows = [
  diag('2026-11-03T15:00:00.000Z', { organizacion: 'Real SAS' }),
  diag('2026-11-05T04:30:00.000Z', { organizacion: 'Noche del 4 en Bogotá' }),
  diag('2026-11-05T05:30:00.000Z', { organizacion: 'Ya es 5 en Bogotá' }),
  diag('2026-11-03T04:30:00.000Z', { organizacion: 'Aún es 2 en Bogotá' }),
  diag('2026-11-03T15:00:01.000Z', { organizacion: 'Acme' }),
  diag('2026-11-03T15:00:02.000Z', { email: 'x@ejemplo.com', autoriza: 1 }),
  diag('2026-11-03T15:00:03.000Z', {}, 40),
  diag('2026-11-03T15:00:04.000Z', { organizacion: 'Consentido' }),
  { id: 'd1', creado: '2026-11-04T15:00:00.000Z', recorrido: 'datos-stand', organizacion_contacto: 'Stand Real', email: 'a@b.co', autoriza: 1, perfil_fecha: 'x' }
];
const p = panelData(rows), names = p.incluidos.map(r => r.org);
assert.deepEqual(p.excluidos.map(e => e.razon).sort(), ['Fuera de los días del Summit', 'Fuera de los días del Summit', 'Prueba', 'Prueba']);
assert.deepEqual(names, ['Real SAS', 'Noche del 4 en Bogotá', '', 'Consentido', 'Stand Real']);
assert.equal(p.incluidos.filter(r => r.posible).length, 2);
assert.equal(rows.filter(delSummit).length, 3);
const r = p.incluidos[0];
assert.equal(r.dia, '2026-11-03'); assert.equal(r.hora, 10); assert.equal(r.min, 5); assert.deepEqual(r.c03, ['Salud (HealthTech)', 'Otro']); assert.equal(r.caps.Recursos, 2);
assert.equal(p.incluidos[4].tipo, 'datos'); assert.equal(p.incluidos[4].mail, 'a@b.co');
assert.equal(panelData([{ ...rows[8], autoriza: 0 }]).incluidos[0].mail, '', 'sin autorización no se muestra el correo');
console.log('PASS panel: fechas de Bogotá, pruebas, dudosos y correos');

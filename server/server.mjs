/* Servidor del ADN GovTech para Coolify: un solo proceso, sin dependencias.
   - Sirve la app (dist/index.html) y le avisa que hay base de datos (<meta name="adn-api">).
   - Guarda las respuestas en SQLite (node:sqlite), en DATA_DIR (montar un volumen persistente en /data).
   - /admin (usuario y clave por variables de entorno) muestra el conteo y descarga todo en Excel o JSON.
   Variables: PORT (3000), DATA_DIR (/data), ADMIN_USER (equipo), ADMIN_PASSWORD (obligatoria para /admin). */
import http from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { xlsxBlob } from '../src/xlsx.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || '/data';
const ADMIN_USER = process.env.ADMIN_USER || 'equipo';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const MAX_BODY = 256 * 1024;

mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(join(DATA_DIR, 'adn-govtech.sqlite'));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS respuestas (
  id TEXT PRIMARY KEY, creado TEXT NOT NULL, actualizado TEXT NOT NULL,
  recorrido TEXT, modo TEXT, version TEXT, arquetipo TEXT, organizacion TEXT,
  datos TEXT,
  email TEXT, autoriza INTEGER DEFAULT 0, autoriza_fecha TEXT, organizacion_contacto TEXT
);`);

const upsertAnswers = db.prepare(`INSERT INTO respuestas (id, creado, actualizado, recorrido, modo, version, arquetipo, organizacion, datos)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET actualizado=excluded.actualizado, recorrido=excluded.recorrido, modo=excluded.modo,
  version=excluded.version, arquetipo=excluded.arquetipo, organizacion=excluded.organizacion, datos=excluded.datos`);
const upsertContact = db.prepare(`INSERT INTO respuestas (id, creado, actualizado, recorrido, email, autoriza, autoriza_fecha, organizacion_contacto)
  VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  ON CONFLICT(id) DO UPDATE SET actualizado=excluded.actualizado, email=excluded.email, autoriza=1,
  autoriza_fecha=excluded.autoriza_fecha, organizacion_contacto=excluded.organizacion_contacto`);

const INDEX = readFileSync(join(ROOT, 'dist', 'index.html'), 'utf8').replace('</head>', '<meta name="adn-api" content="1"></head>');
const ID = /^[A-Za-z0-9-]{8,64}$/;
const MAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const str = (v, n = 200) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, n);
const now = () => new Date().toISOString();
const bogota = iso => iso ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' }) : '';

/* Límite simple de escrituras por IP (el quiosco y el wifi del evento comparten IP: margen amplio). */
const hits = new Map();
function limited(ip) {
  const t = Math.floor(Date.now() / 60000), k = ip + ':' + t, n = (hits.get(k) || 0) + 1;
  hits.set(k, n); if (hits.size > 5000) for (const key of hits.keys()) if (!key.endsWith(':' + t)) hits.delete(key);
  return n > 600;
}
function send(res, code, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(code, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function readJSON(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(new Error('grande')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('json')); } });
    req.on('error', reject);
  });
}
const hash = s => createHash('sha256').update(s).digest();
function isAdmin(req) {
  if (!ADMIN_PASSWORD) return false;
  const m = /^Basic (.+)$/.exec(req.headers.authorization || ''); if (!m) return false;
  const [u, ...p] = Buffer.from(m[1], 'base64').toString('utf8').split(':');
  return timingSafeEqual(hash(u), hash(ADMIN_USER)) & timingSafeEqual(hash(p.join(':')), hash(ADMIN_PASSWORD));
}

/* ---------- Exportación para el análisis ---------- */
function rows() { return db.prepare('SELECT * FROM respuestas ORDER BY creado').all().map(r => ({ ...r, datos: r.datos ? JSON.parse(r.datos) : null })); }
function workbook() {
  const all = rows(), keys = [];
  for (const r of all) for (const k of Object.keys(r.datos?.resumen || {})) if (!keys.includes(k)) keys.push(k);
  const base = ['ID', 'Creado (Bogotá)', 'Actualizado (Bogotá)', 'Recorrido', 'Modo', 'Versión', 'Inicio', 'Fin'];
  const respuestas = [[...base, ...keys], ...all.filter(r => r.datos).map(r => [r.id, bogota(r.creado), bogota(r.actualizado), r.recorrido, r.modo, r.version,
    bogota(r.datos.inicio), bogota(r.datos.fin), ...keys.map(k => r.datos.resumen?.[k] ?? '')])];
  const detalle = [['ID respuesta', 'Creado (Bogotá)', 'Recorrido', 'Modo', 'Pregunta', 'Fase', 'Dimensión', 'Texto de la pregunta', 'Respuesta', 'Letra(s) original(es)', 'Arquetipo de la opción', 'Puntaje de capacidad', 'Posición en pantalla']];
  for (const r of all) for (const d of r.datos?.detalle || []) detalle.push([r.id, bogota(r.creado), r.recorrido, r.modo, d.id, d.fase, d.dimension, d.pregunta, d.respuesta, d.letras, d.arquetipo, d.puntaje ?? '', d.posicion ?? '']);
  const contactos = [['ID respuesta', 'Correo', 'Organización', 'Autorizó (Bogotá)', 'Recorrido', 'Arquetipo'],
    ...all.filter(r => r.autoriza && r.email).map(r => [r.id, r.email, r.organizacion_contacto || r.organizacion || '', bogota(r.autoriza_fecha), r.recorrido, r.arquetipo || ''])];
  return xlsxBlob([
    { name: 'Respuestas', rows: respuestas, widths: [...base.map(() => 16), ...keys.map(() => 22)] },
    { name: 'Detalle por pregunta', rows: detalle, widths: [16, 16, 10, 9, 8, 8, 24, 60, 60, 10, 26, 10, 10] },
    { name: 'Contactos autorizados', rows: contactos, widths: [16, 30, 30, 18, 10, 24] }
  ]);
}
function adminPage() {
  const c = db.prepare(`SELECT COUNT(*) n, SUM(datos IS NOT NULL) completos, SUM(recorrido='summit') summit, SUM(recorrido='completo') completo,
    SUM(modo='quiosco') quiosco, SUM(autoriza=1) contactos, MAX(actualizado) ultimo FROM respuestas`).get();
  const arch = db.prepare(`SELECT arquetipo, COUNT(*) n FROM respuestas WHERE datos IS NOT NULL GROUP BY arquetipo ORDER BY n DESC`).all();
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ADN GovTech · datos</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:32px auto;padding:0 16px;color:#211744}h1{font-size:24px}table{border-collapse:collapse;width:100%;margin:16px 0}
td,th{border-bottom:1px solid #e3dbfb;padding:8px;text-align:left}a.b,button{display:inline-block;background:#3b1f96;color:#fff;border:0;border-radius:999px;padding:12px 20px;margin:4px 8px 4px 0;text-decoration:none;font:inherit;cursor:pointer}
input{font:inherit;padding:10px;border:1px solid #cfc4ee;border-radius:8px;min-width:260px}small{color:#6b628f}</style></head><body>
<h1>ADN GovTech · respuestas guardadas</h1>
<table><tr><th>Registros</th><td>${c.n || 0}</td></tr><tr><th>Con respuestas completas</th><td>${c.completos || 0}</td></tr>
<tr><th>Summit / Completo</th><td>${c.summit || 0} / ${c.completo || 0}</td></tr><tr><th>Desde el quiosco</th><td>${c.quiosco || 0}</td></tr>
<tr><th>Contactos autorizados</th><td>${c.contactos || 0}</td></tr><tr><th>Última actualización</th><td>${bogota(c.ultimo)}</td></tr></table>
<table><tr><th>Arquetipo</th><th>Respuestas</th></tr>${arch.map(a => `<tr><td>${(a.arquetipo || 'Sin arquetipo').replace(/[<&]/g, '')}</td><td>${a.n}</td></tr>`).join('')}</table>
<p><a class="b" href="/admin/respuestas.xlsx">Descargar Excel</a><a class="b" href="/admin/respuestas.json">Descargar JSON</a></p>
<h2>Borrar datos de una persona</h2><form method="post" action="/admin/borrar"><input name="q" placeholder="Correo o ID de respuesta" required> <button>Borrar</button></form>
<p><small>Para atender solicitudes de consulta o supresión. No se puede deshacer.</small></p></body></html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'), path = url.pathname, ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '';
  try {
    if (req.method === 'GET' && path === '/api/estado') return send(res, 200, { ok: true });
    if (req.method === 'POST' && (path === '/api/respuestas' || path === '/api/contacto')) {
      if (limited(ip)) return send(res, 429, { ok: false });
      const b = await readJSON(req);
      if (!ID.test(b?.id || '')) return send(res, 400, { ok: false });
      const t = now();
      if (path === '/api/respuestas') {
        const datos = { inicio: str(b.inicio, 40), fin: str(b.fin, 40), resumen: b.resumen && typeof b.resumen === 'object' ? b.resumen : {}, detalle: Array.isArray(b.detalle) ? b.detalle.slice(0, 80) : [] };
        upsertAnswers.run(b.id, t, t, str(b.recorrido, 20), str(b.modo, 20), str(b.version, 20), str(b.arquetipo, 80), str(b.organizacion, 80), JSON.stringify(datos));
      } else {
        if (b.autoriza !== true || !MAIL.test(b.email || '')) return send(res, 400, { ok: false });
        upsertContact.run(b.id, t, t, str(b.recorrido, 20), str(b.email, 200).toLowerCase(), t, str(b.organizacion, 80));
      }
      return send(res, 200, { ok: true });
    }
    if (path === '/admin' || path.startsWith('/admin/')) {
      if (!isAdmin(req)) return send(res, 401, ADMIN_PASSWORD ? 'Acceso restringido' : 'Configura ADMIN_PASSWORD para activar /admin', 'text/plain; charset=utf-8', { 'WWW-Authenticate': 'Basic realm="ADN GovTech", charset="UTF-8"' });
      if (req.method === 'GET' && path === '/admin') return send(res, 200, adminPage(), 'text/html; charset=utf-8', { 'Cache-Control': 'no-store' });
      if (req.method === 'GET' && path === '/admin/respuestas.json') return send(res, 200, JSON.stringify(rows(), null, 1), 'application/json; charset=utf-8', { 'Content-Disposition': 'attachment; filename="adn-govtech-respuestas.json"', 'Cache-Control': 'no-store' });
      if (req.method === 'GET' && path === '/admin/respuestas.xlsx') {
        const buf = Buffer.from(await workbook().arrayBuffer()), day = new Date().toISOString().slice(0, 10);
        return send(res, 200, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', { 'Content-Disposition': `attachment; filename="ADN_GovTech_respuestas_${day}.xlsx"`, 'Cache-Control': 'no-store' });
      }
      if (req.method === 'POST' && path === '/admin/borrar') {
        const origin = req.headers.origin; if (origin && new URL(origin).host !== req.headers.host) return send(res, 403, 'Origen no válido', 'text/plain; charset=utf-8');
        let raw = ''; for await (const c of req) { raw += c; if (raw.length > 2000) break; }
        const q = (new URLSearchParams(raw).get('q') || '').trim();
        const r = q ? db.prepare('DELETE FROM respuestas WHERE id = ? OR lower(email) = lower(?)').run(q, q) : { changes: 0 };
        return send(res, 200, `<!doctype html><meta charset="utf-8"><p style="font-family:system-ui">Registros borrados: ${r.changes}. <a href="/admin">Volver</a></p>`, 'text/html; charset=utf-8');
      }
      return send(res, 404, 'No encontrado', 'text/plain; charset=utf-8');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { ok: false });
    /* Accesos cortos para el evento: /summit (celular) y /quiosco (pantalla vertical). */
    const go = { '/summit': '/?recorrido=summit', '/quiosco': '/?recorrido=summit&modo=quiosco', '/completo': '/?recorrido=completo' }[path.replace(/\/$/, '')];
    if (go) return send(res, 302, '', 'text/plain', { Location: go });
    /* Por ahora el sitio es para el Summit: la raíz abre el recorrido Summit (el completo queda en /completo). */
    if ((path === '/' || path === '/index.html') && !url.searchParams.has('recorrido')) {
      url.searchParams.set('recorrido', process.env.RECORRIDO_INICIAL || 'summit');
      return send(res, 302, '', 'text/plain', { Location: '/?' + url.searchParams.toString() });
    }
    if (path.startsWith('/api/')) return send(res, 404, { ok: false });
    return send(res, 200, INDEX, 'text/html; charset=utf-8', { 'Cache-Control': 'no-cache' });
  } catch (err) {
    if (!res.headersSent) send(res, err.message === 'grande' ? 413 : 400, { ok: false });
  }
});
server.listen(PORT, () => console.log(`ADN GovTech en el puerto ${PORT} · datos en ${DATA_DIR}${ADMIN_PASSWORD ? '' : ' · /admin desactivado (falta ADMIN_PASSWORD)'}`));
for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => { server.close(); db.close(); process.exit(0); });

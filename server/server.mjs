/* Servidor del ADN GovTech para Coolify: un solo proceso, sin dependencias.
   - Sirve la app (dist/index.html) y le avisa que hay base de datos (<meta name="adn-api">).
   - Guarda las respuestas en SQLite (node:sqlite), en DATA_DIR (montar un volumen persistente en /data).
   - /admin (usuario y clave por variables de entorno) muestra el conteo y descarga todo en Excel o JSON.
   Variables: PORT (3000), DATA_DIR (/data), ADMIN_USER (equipo), ADMIN_PASSWORD (obligatoria para /admin). */
import http from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual, createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { xlsxBlob } from '../src/xlsx.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || '/data';
const ADMIN_USER = process.env.ADMIN_USER || 'equipo';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const MAX_BODY = 256 * 1024;
const MAX_CARD = 6 * 1024 * 1024;

mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(join(DATA_DIR, 'adn-govtech.sqlite'));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS respuestas (
  id TEXT PRIMARY KEY, creado TEXT NOT NULL, actualizado TEXT NOT NULL,
  recorrido TEXT, modo TEXT, version TEXT, arquetipo TEXT, organizacion TEXT,
  datos TEXT,
  email TEXT, autoriza INTEGER DEFAULT 0, autoriza_fecha TEXT, organizacion_contacto TEXT
);
CREATE TABLE IF NOT EXISTS tarjetas (
  id TEXT PRIMARY KEY, creado TEXT NOT NULL, actualizado TEXT NOT NULL,
  organizacion TEXT, recorrido TEXT, codigo TEXT, tipo TEXT, imagen BLOB
);`);
/* 3-nov: datos de la empresa que la persona deja en su celular (página del QR o final del recorrido), todos opcionales. */
const cols = db.prepare('PRAGMA table_info(respuestas)').all().map(c => c.name);
for (const c of ['empresa_web', 'empresa_descripcion', 'interes_futuro', 'agregaria', 'perfil_fecha']) if (!cols.includes(c)) db.exec(`ALTER TABLE respuestas ADD COLUMN ${c} TEXT`);
const upsertCard = db.prepare(`INSERT INTO tarjetas (id, creado, actualizado, organizacion, recorrido, codigo, tipo, imagen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET actualizado=excluded.actualizado, organizacion=excluded.organizacion, recorrido=excluded.recorrido,
  codigo=excluded.codigo, tipo=excluded.tipo, imagen=excluded.imagen`);

const upsertAnswers = db.prepare(`INSERT INTO respuestas (id, creado, actualizado, recorrido, modo, version, arquetipo, organizacion, datos)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET actualizado=excluded.actualizado, recorrido=excluded.recorrido, modo=excluded.modo,
  version=excluded.version, arquetipo=excluded.arquetipo, organizacion=excluded.organizacion, datos=excluded.datos`);
/* El correo solo se guarda con autorización; si no viene, se conserva el que ya hubiera. Los demás datos se reemplazan. */
const upsertContact = db.prepare(`INSERT INTO respuestas (id, creado, actualizado, recorrido, email, autoriza, autoriza_fecha, organizacion_contacto,
  empresa_web, empresa_descripcion, interes_futuro, agregaria, perfil_fecha)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET actualizado=excluded.actualizado, email=COALESCE(excluded.email, email), autoriza=MAX(autoriza, excluded.autoriza),
  autoriza_fecha=COALESCE(excluded.autoriza_fecha, autoriza_fecha), organizacion_contacto=excluded.organizacion_contacto,
  empresa_web=excluded.empresa_web, empresa_descripcion=excluded.empresa_descripcion, interes_futuro=excluded.interes_futuro,
  agregaria=COALESCE(excluded.agregaria, agregaria), perfil_fecha=excluded.perfil_fecha`);
const PERFIL = { organizacion: 80, email: 120, web: 200, descripcion: 600, interes: 600, agregaria: 600 };
/* Valida y guarda; devuelve el error para mostrarlo, o '' si quedó guardado. */
function saveContact(id, b, recorrido) {
  const v = Object.fromEntries(Object.entries(PERFIL).map(([k, n]) => [k, str(b[k], n).trim()]));
  if (!Object.values(v).some(Boolean)) return 'vacio';
  if (v.email && !MAIL.test(v.email)) return 'correo';
  if (v.email && b.autoriza !== true) return 'autoriza';
  const t = now();
  upsertContact.run(id, t, t, str(recorrido, 20), v.email ? v.email.toLowerCase() : null, v.email ? 1 : 0, v.email ? t : null, v.organizacion,
    v.web, v.descripcion, v.interes, 'agregaria' in b ? v.agregaria : null, t);
  return '';
}

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
function readJSON(req, max = MAX_BODY) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > max) { reject(new Error('grande')); req.destroy(); } else chunks.push(c); });
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
  const contactos = [['ID respuesta', 'Organización', 'Correo (autorizado)', 'Autorizó (Bogotá)', 'Página web', 'Descripción de la empresa', 'Le interesaría a futuro', 'Le agregaría a la experiencia', 'Datos enviados (Bogotá)', 'Recorrido', 'Modo', 'Arquetipo'],
    ...all.filter(r => r.perfil_fecha || (r.autoriza && r.email)).map(r => [r.id, r.organizacion_contacto || r.organizacion || '', r.autoriza ? r.email || '' : '', bogota(r.autoriza_fecha),
      r.empresa_web || '', r.empresa_descripcion || '', r.interes_futuro || '', r.agregaria || '', bogota(r.perfil_fecha), r.recorrido === 'datos-stand' ? 'QR de datos (sin recorrido)' : r.recorrido || '', r.modo || '', r.arquetipo || ''])];
  return xlsxBlob([
    { name: 'Respuestas', rows: respuestas, widths: [...base.map(() => 16), ...keys.map(() => 22)] },
    { name: 'Detalle por pregunta', rows: detalle, widths: [16, 16, 10, 9, 8, 8, 24, 60, 60, 10, 26, 10, 10] },
    { name: 'Empresas y contactos', rows: contactos, widths: [16, 28, 30, 16, 28, 50, 50, 50, 16, 10, 9, 24] }
  ]);
}
function adminPage() {
  const c = db.prepare(`SELECT COUNT(*) n, SUM(datos IS NOT NULL) completos, SUM(recorrido='summit') summit, SUM(recorrido='completo') completo,
    SUM(modo='quiosco') quiosco, SUM(autoriza=1) contactos, SUM(perfil_fecha IS NOT NULL) perfiles, SUM(recorrido='datos-stand') stand, MAX(actualizado) ultimo FROM respuestas`).get();
  const tarjetas = db.prepare('SELECT COUNT(*) n FROM tarjetas').get().n;
  const arch = db.prepare(`SELECT arquetipo, COUNT(*) n FROM respuestas WHERE datos IS NOT NULL GROUP BY arquetipo ORDER BY n DESC`).all();
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ADN GovTech · datos</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:32px auto;padding:0 16px;color:#211744}h1{font-size:24px}table{border-collapse:collapse;width:100%;margin:16px 0}
td,th{border-bottom:1px solid #e3dbfb;padding:8px;text-align:left}a.b,button{display:inline-block;background:#3b1f96;color:#fff;border:0;border-radius:999px;padding:12px 20px;margin:4px 8px 4px 0;text-decoration:none;font:inherit;cursor:pointer}
input{font:inherit;padding:10px;border:1px solid #cfc4ee;border-radius:8px;min-width:260px}small{color:#6b628f}</style></head><body>
<h1>ADN GovTech · respuestas guardadas</h1>
<table><tr><th>Registros</th><td>${c.n || 0}</td></tr><tr><th>Con respuestas completas</th><td>${c.completos || 0}</td></tr>
<tr><th>Summit / Completo</th><td>${c.summit || 0} / ${c.completo || 0}</td></tr><tr><th>Desde el quiosco</th><td>${c.quiosco || 0}</td></tr>
<tr><th>Correos autorizados</th><td>${c.contactos || 0}</td></tr><tr><th>Empresas que dejaron sus datos</th><td>${c.perfiles || 0}</td></tr><tr><th>…de ellas, con el QR de datos del stand (sin recorrido)</th><td>${c.stand || 0}</td></tr><tr><th>Tarjetas generadas con QR</th><td>${tarjetas}</td></tr><tr><th>Última actualización</th><td>${bogota(c.ultimo)}</td></tr></table>
<table><tr><th>Arquetipo</th><th>Respuestas</th></tr>${arch.map(a => `<tr><td>${(a.arquetipo || 'Sin arquetipo').replace(/[<&]/g, '')}</td><td>${a.n}</td></tr>`).join('')}</table>
<p><a class="b" href="/admin/respuestas.xlsx">Descargar Excel</a><a class="b" href="/admin/respuestas.json">Descargar JSON</a></p>
<h2>Borrar datos de una persona</h2><form method="post" action="/admin/borrar"><input name="q" placeholder="Correo o ID de respuesta" required> <button>Borrar</button></form>
<p><small>Para atender solicitudes de consulta o supresión. No se puede deshacer.</small></p></body></html>`;
}

/* ---------- Tarjeta para descargar desde el QR del quiosco ---------- */
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fileName = org => 'ADN_GovTech_' + ((org || 'tarjeta').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'tarjeta');
const ERRORES = { vacio: 'Escribe al menos un dato.', correo: 'Revisa tu correo.', autoriza: 'Para guardar tu correo necesitamos tu autorización (casilla de abajo).' };
/* Páginas para el celular (QR de la tarjeta y QR de datos del stand): mismo estilo y mismo formulario de empresa. */
const page = (title, body) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${title}</title><style>
body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:linear-gradient(160deg,#160b4f,#3b1f96 55%,#8a2ba8);color:#fff;min-height:100svh}
main{max-width:440px;margin:0 auto;padding:24px 16px 40px;text-align:center}.k{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#ffc6e1;margin:8px 0}
h1{font-size:28px;line-height:1.1;margin:0 0 16px}img{width:100%;height:auto;aspect-ratio:2/3;border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,.35);background:#2a1690}
a.b{display:block;margin:18px 0 8px;padding:16px;border-radius:999px;background:#fff;color:#211744;font-weight:700;text-decoration:none;font-size:17px}
a.g{display:block;padding:14px;border-radius:999px;border:1.5px solid rgba(255,255,255,.6);color:#fff;text-decoration:none;font-weight:600}
p{font-size:14px;line-height:1.45;color:#eadcff}p.lead{font-size:16px}small{display:block;margin-top:22px;font-size:12px;color:#d9ccf5}
form{margin:28px 0 0;padding:20px 16px;border-radius:20px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);text-align:left}
form h2{font-size:20px;margin:0 0 4px}form>p{margin:0 0 14px}label{display:block;font-size:14px;font-weight:600;margin:14px 0 6px}label i{font-weight:400;font-style:normal;color:#d9ccf5}
input,textarea{box-sizing:border-box;width:100%;font:inherit;font-size:16px;padding:12px 14px;border:1.5px solid rgba(255,255,255,.35);border-radius:12px;background:#fff;color:#211744}
textarea{min-height:88px;resize:vertical}label.ck{display:flex;gap:10px;align-items:flex-start;font-weight:400;font-size:13px;line-height:1.4;color:#eadcff}label.ck input{width:22px;height:22px;flex:none;margin:1px 0 0}
button{display:block;width:100%;margin:18px 0 0;padding:16px;border:0;border-radius:999px;background:#fff;color:#211744;font:inherit;font-weight:700;font-size:17px}
button:active,a.b:active,a.g:active{transform:scale(.97)}.err{background:#ffe1ec;color:#7a0b3b;padding:10px 12px;border-radius:10px;font-weight:600}
.ok{margin:28px 0 0;padding:18px 16px;border-radius:20px;background:rgba(255,255,255,.14);font-size:16px;color:#fff}</style></head><body><main>
<p class="k">Bogotá Capital GovTech · Sello B-GovTech</p>${body}</main></body></html>`;
/* withAdd: «¿Qué le agregarían a esta experiencia?» solo para quien hizo el recorrido. */
function dataForm({ action, org = '', estado = '', title, intro, withAdd }) {
  if (estado === 'ok') return '<p class="ok" role="status">¡Gracias! Guardamos los datos de tu empresa.</p>';
  return `<form method="post" action="${esc(action)}">
<h2>${title}</h2><p>${intro}</p>
${ERRORES[estado] ? `<p class="err" role="alert">${ERRORES[estado]}</p>` : ''}
<label for="f-org">Nombre de la empresa</label><input id="f-org" name="organizacion" maxlength="80" autocomplete="organization" value="${esc(org)}">
<label for="f-mail">Correo de contacto <i>· para invitarte a eventos del ecosistema</i></label><input id="f-mail" name="email" type="email" inputmode="email" autocomplete="email" maxlength="120" placeholder="nombre@empresa.com">
<label for="f-web">Página web</label><input id="f-web" name="web" inputmode="url" autocomplete="url" maxlength="200" placeholder="www.tuempresa.com">
<label for="f-desc">Descripción de la empresa</label><textarea id="f-desc" name="descripcion" maxlength="600" placeholder="¿Qué hace tu empresa y a quién sirve?"></textarea>
<label for="f-int">¿Qué le interesaría a futuro?</label><textarea id="f-int" name="interes" maxlength="600" placeholder="Temas, apoyos o conexiones que les gustaría encontrar"></textarea>
${withAdd ? '<label for="f-add">¿Qué le agregarían a esta experiencia?</label><textarea id="f-add" name="agregaria" maxlength="600"></textarea>' : ''}
<label class="ck"><input type="checkbox" name="autoriza" value="1"> Si dejo mi correo, autorizo su tratamiento para recibir invitaciones y novedades de Bogotá Capital GovTech, según la Ley 1581 de 2012. Puedo pedir que lo borren cuando quiera.</label>
<button type="submit">Enviar</button></form>
<script>document.querySelector('form').addEventListener('submit',function(ev){var f=ev.target,m=f.email.value.trim(),e=f.querySelector('.err');
if(!e){e=document.createElement('p');e.className='err';e.setAttribute('role','alert');f.querySelector('h2').nextElementSibling.after(e);}
var msg=![].some.call(f.querySelectorAll('input:not([type=checkbox]),textarea'),function(i){return i.value.trim();})?'${ERRORES.vacio}':m&&!f.autoriza.checked?'${ERRORES.autoriza}':'';
if(msg){ev.preventDefault();e.textContent=msg;e.scrollIntoView({block:'center'});}else{f.querySelector('button').disabled=true;f.querySelector('button').textContent='Enviando…';}});</script>`;
}
function cardPage(c, estado = '') {
  const result = c.codigo ? `/?recorrido=${c.recorrido === 'completo' ? 'completo' : 'summit'}#r=${encodeURIComponent(c.codigo)}&s=${encodeURIComponent(c.id)}` : '';
  const ext = c.tipo === 'image/jpeg' ? 'jpg' : 'png';
  return page('Mi tarjeta ADN GovTech', `<h1>Tu tarjeta ADN GovTech${c.organizacion ? `<br><span style="color:#cdb0fb">${esc(c.organizacion)}</span>` : ''}</h1>
<img src="/t/${esc(c.id)}/tarjeta.${ext}" alt="Tarjeta ADN GovTech" width="540" height="810">
<a class="b" href="/t/${esc(c.id)}/tarjeta.${ext}?descargar=1" download="${fileName(c.organizacion)}.${ext}">Descargar mi tarjeta</a>
<p>Si no se descarga, mantén presionada la imagen y elige «Guardar imagen».</p>
${result ? `<a class="g" href="${esc(result)}">Ver mi resultado y descargar el informe (PDF)</a>` : ''}
${dataForm({ action: '/t/' + c.id, org: c.organizacion, estado, title: 'Cuéntanos de tu empresa', intro: 'Todo es opcional. Es más fácil escribirlo aquí, en tu celular.', withAdd: true })}
<small>ADN autodeclarado. No es un sello ni una certificación.</small>`);
}
/* 3-nov · QR de datos del stand (quiosco): para quien pasa y no alcanza a hacer el recorrido. Solo capta datos. */
function datosPage(estado = '') {
  return page('Déjanos tus datos · Bogotá Capital GovTech', `<h1>Conozcamos tu empresa</h1>
<p class="lead">¿No alcanzaste a hacer el ADN GovTech en el stand? Déjanos tus datos y te compartimos información del Sello B-GovTech y de los próximos encuentros del ecosistema.</p>
${dataForm({ action: '/datos', estado, title: 'Datos de tu empresa', intro: 'Todo es opcional. Para que te escribamos, deja tu correo y marca la autorización.' })}`);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'), path = url.pathname, ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '';
  try {
    if (req.method === 'GET' && path === '/api/estado') return send(res, 200, { ok: true });
    if (req.method === 'POST' && path === '/api/tarjeta') {
      if (limited(ip)) return send(res, 429, { ok: false });
      const b = await readJSON(req, MAX_CARD), m = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(b?.imagen || '');
      if (!ID.test(b?.id || '') || !m) return send(res, 400, { ok: false });
      const img = Buffer.from(m[2], 'base64'), png = img.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])), jpg = img[0] === 0xff && img[1] === 0xd8;
      if (!(png || jpg) || img.length > 4.5 * 1024 * 1024) return send(res, 400, { ok: false });
      const codigo = /^[A-Dx-]{1,40}(?:\.[0-3])?$/.test(b.codigo || '') ? b.codigo : '', t = now();
      upsertCard.run(b.id, t, t, str(b.organizacion, 80), str(b.recorrido, 20), codigo, png ? 'image/png' : 'image/jpeg', img);
      return send(res, 200, { ok: true, url: '/t/' + b.id });
    }
    /* QR de datos del stand: cada envío es un registro nuevo (recorrido «datos-stand»). */
    if (path === '/datos' || path === '/datos/') {
      if (req.method === 'POST') {
        const origin = req.headers.origin; if (origin && origin !== 'null' && new URL(origin).host !== req.headers.host) return send(res, 403, 'Origen no válido', 'text/plain; charset=utf-8');
        if (limited(ip)) return send(res, 429, 'Intenta de nuevo en un minuto', 'text/plain; charset=utf-8');
        let raw = ''; for await (const ch of req) { raw += ch; if (raw.length > 8000) return send(res, 413, 'Texto muy largo', 'text/plain; charset=utf-8'); }
        const f = Object.fromEntries(new URLSearchParams(raw)); f.autoriza = f.autoriza === '1'; delete f.agregaria;
        const err = saveContact(randomUUID(), f, 'datos-stand');
        return send(res, 303, '', 'text/plain', { Location: `/datos?${err ? 'error=' + err : 'gracias=1'}` });
      }
      if (req.method === 'GET' || req.method === 'HEAD') return send(res, 200, datosPage(url.searchParams.has('gracias') ? 'ok' : str(url.searchParams.get('error'), 20)), 'text/html; charset=utf-8', { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
    }
    const card = /^\/t\/([A-Za-z0-9-]{8,64})(?:\/tarjeta\.(png|jpg))?\/?$/.exec(path);
    if (card && !card[2] && req.method === 'POST') {
      const origin = req.headers.origin; if (origin && origin !== 'null' && new URL(origin).host !== req.headers.host) return send(res, 403, 'Origen no válido', 'text/plain; charset=utf-8');
      if (limited(ip)) return send(res, 429, 'Intenta de nuevo en un minuto', 'text/plain; charset=utf-8');
      const c = db.prepare('SELECT id, recorrido FROM tarjetas WHERE id = ?').get(card[1]);
      if (!c) return send(res, 404, 'Esta tarjeta no existe', 'text/plain; charset=utf-8');
      let raw = ''; for await (const ch of req) { raw += ch; if (raw.length > 8000) return send(res, 413, 'Texto muy largo', 'text/plain; charset=utf-8'); }
      const f = Object.fromEntries(new URLSearchParams(raw)); f.autoriza = f.autoriza === '1';
      const err = saveContact(c.id, f, c.recorrido);
      return send(res, 303, '', 'text/plain', { Location: `/t/${c.id}?${err ? 'error=' + err : 'gracias=1'}` });
    }
    if (card && (req.method === 'GET' || req.method === 'HEAD')) {
      const c = db.prepare('SELECT * FROM tarjetas WHERE id = ?').get(card[1]);
      if (!c) return send(res, 404, '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><p style="font-family:system-ui;padding:24px">Esta tarjeta no existe o ya fue borrada.</p>', 'text/html; charset=utf-8', { 'X-Robots-Tag': 'noindex' });
      if (!card[2]) return send(res, 200, cardPage(c, url.searchParams.has('gracias') ? 'ok' : str(url.searchParams.get('error'), 20)), 'text/html; charset=utf-8', { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
      const ext = c.tipo === 'image/jpeg' ? 'jpg' : 'png';
      return send(res, 200, Buffer.from(c.imagen), c.tipo, { 'Cache-Control': 'private, max-age=600', 'X-Robots-Tag': 'noindex',
        ...(url.searchParams.has('descargar') ? { 'Content-Disposition': `attachment; filename="${fileName(c.organizacion)}.${ext}"` } : {}) });
    }
    if (req.method === 'POST' && (path === '/api/respuestas' || path === '/api/contacto')) {
      if (limited(ip)) return send(res, 429, { ok: false });
      const b = await readJSON(req);
      if (!ID.test(b?.id || '')) return send(res, 400, { ok: false });
      const t = now();
      if (path === '/api/respuestas') {
        const datos = { inicio: str(b.inicio, 40), fin: str(b.fin, 40), resumen: b.resumen && typeof b.resumen === 'object' ? b.resumen : {}, detalle: Array.isArray(b.detalle) ? b.detalle.slice(0, 80) : [] };
        upsertAnswers.run(b.id, t, t, str(b.recorrido, 20), str(b.modo, 20), str(b.version, 20), str(b.arquetipo, 80), str(b.organizacion, 80), JSON.stringify(datos));
      } else {
        const err = saveContact(b.id, b, b.recorrido);
        if (err) return send(res, 400, { ok: false, error: err });
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
        const ids = q ? db.prepare('SELECT id FROM respuestas WHERE id = ? OR lower(email) = lower(?)').all(q, q).map(x => x.id) : [];
        if (q && !ids.includes(q)) ids.push(q);
        let changes = 0; for (const i of ids) changes += db.prepare('DELETE FROM respuestas WHERE id = ?').run(i).changes + db.prepare('DELETE FROM tarjetas WHERE id = ?').run(i).changes;
        const r = { changes };
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

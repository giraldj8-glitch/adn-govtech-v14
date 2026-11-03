/* Tarjeta ADN para llevar (imagen 1080×1620, vertical) e informe para PDF.
   Diseño acordado con el equipo (22-oct, propuesta de Ani): organización grande, ilustración del arquetipo en el arco
   y el rol en una franja; sin las respuestas. Todo se dibuja en el navegador: no hay servidor ni se envían respuestas. */
const W = 1080, H = 1620;
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
const img = src => new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
/* Parte un texto en líneas que caben en max; devuelve las líneas. */
function lines(c, text, max) {
  const out = []; let line = '';
  for (const w of String(text).split(' ')) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > max && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}
/* Tamaño de letra más grande (entre max y min) con el que el texto cabe en maxLines líneas. */
function fit(c, text, F, weight, max, min, width, maxLines) {
  for (let s = max; s >= min; s -= 2) { c.font = F(weight, s); const ls = lines(c, text, width); if (ls.length <= maxLines && ls.every(l => c.measureText(l).width <= width)) return { size: s, ls }; }
  c.font = F(weight, min); return { size: min, ls: lines(c, text, width).slice(0, maxLines) };
}
const spaced = (c, px) => { if ('letterSpacing' in c) c.letterSpacing = px + 'px'; };
async function draw(d) {
  try { await document.fonts?.ready; } catch { /* sin fuentes web */ }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  const F = (w, s) => `${w} ${s}px Outfit, "Avenir Next", "Segoe UI", sans-serif`;
  const CX = W / 2;
  /* Fondo: índigo profundo a violeta, con halos suaves. */
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d0d5e'); g.addColorStop(.55, '#2c1488'); g.addColorStop(1, '#55199e'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  [[W * .5, 760, 560, 'rgba(255,120,200,.20)'], [W * .9, 120, 420, 'rgba(160,130,255,.22)'], [W * .1, H - 120, 420, 'rgba(255,120,200,.14)']].forEach(([x, y, r, col]) => { const h = c.createRadialGradient(x, y, 0, x, y, r); h.addColorStop(0, col); h.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = h; c.fillRect(0, 0, W, H); });
  /* Marco interior fino */
  rr(c, 30, 30, W - 60, H - 60, 52); c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 2; c.stroke();
  /* Marca y sello del evento */
  c.fillStyle = '#fff'; c.font = F(600, 24); c.fillText('Bogotá Capital', 92, 118); c.font = F(800, 46); c.fillText('GOVTECH', 92, 164);
  c.font = F(700, 21); spaced(c, 2); const tag = 'SELLO B-GOVTECH · ADN', tw = c.measureText(tag).width + 48;
  rr(c, W - 92 - tw, 106, tw, 52, 26); c.strokeStyle = 'rgba(255,198,225,.6)'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#ffc6e1'; c.fillText(tag, W - 92 - tw + 24, 140); spaced(c, 0);
  /* Organización (si la dio): lo más grande de la tarjeta */
  c.textAlign = 'center'; let top = 250, orgLines = 0;
  /* Sin nombre, «Mi ADN GovTech» ocupa el mismo lugar y tamaño, para que la tarjeta no se vea vacía arriba. */
  const title = d.org || 'Mi ADN GovTech';
  c.fillStyle = '#ff8fc7'; c.font = F(700, 24); spaced(c, 6); c.fillText(d.org ? 'ORGANIZACIÓN' : 'MI RESULTADO', CX, top); spaced(c, 0);
  const t = fit(c, title, F, 800, 112, 58, W - 200, 2); c.fillStyle = '#fff';
  t.ls.forEach((l, i) => c.fillText(l, CX, top + 20 + t.size * (i + 1) * .98));
  top += 20 + t.size * t.ls.length * .98 + 46; orgLines = t.ls.length;
  /* El arco cede espacio cuando el nombre ocupa dos líneas, para que nada choque abajo. */
  const aw = orgLines > 1 ? 540 : 620, ah = orgLines > 1 ? 500 : 600, ax = CX - aw / 2, ay = top;
  const arch = () => { c.beginPath(); c.moveTo(ax, ay + ah); c.lineTo(ax, ay + aw / 2); c.arc(CX, ay + aw / 2, aw / 2, Math.PI, 0); c.lineTo(ax + aw, ay + ah); c.closePath(); };
  c.save(); c.shadowColor = 'rgba(255,120,200,.45)'; c.shadowBlur = 60; arch(); c.fillStyle = '#e9b6f0'; c.fill(); c.restore();
  c.save(); arch(); c.clip();
  const ag = c.createLinearGradient(0, ay, 0, ay + ah); ag.addColorStop(0, '#f7c9e2'); ag.addColorStop(.5, '#e9b6f0'); ag.addColorStop(1, '#c9a7ff'); c.fillStyle = ag; c.fillRect(ax, ay, aw, ah);
  const still = await img(d.still); if (still) { const s = Math.max(aw / still.width, ah / still.height) * 1.02; const iw = still.width * s, ih = still.height * s; c.drawImage(still, CX - iw / 2, ay + (ah - ih) / 2 - 10, iw, ih); }
  c.restore();
  arch(); c.strokeStyle = 'rgba(190,160,255,.55)'; c.lineWidth = 10; c.stroke();
  /* Franja con el rol, montada sobre la base del arco */
  const bw = 800, by = ay + ah - 70; c.font = F(800, 74); const rt = fit(c, d.name, F, 800, 74, 46, bw - 80, 1); const bh = 150 + (rt.size - 46) * .4;
  c.save(); c.shadowColor = 'rgba(20,6,60,.45)'; c.shadowBlur = 40; c.shadowOffsetY = 14; rr(c, CX - bw / 2, by, bw, bh, 30); c.fillStyle = d.banner || '#d6337f'; c.fill(); c.restore();
  c.fillStyle = 'rgba(255,255,255,.88)'; c.font = F(700, 20); spaced(c, 4); c.fillText('MI ROL EN EL ECOSISTEMA GOVTECH', CX, by + 46); spaced(c, 0);
  c.fillStyle = '#fff'; c.font = F(800, rt.size); c.fillText(rt.ls[0], CX, by + 50 + rt.size * .95);
  /* Frase y rasgos */
  let y = by + bh + 70; c.font = F(400, 34); c.fillStyle = 'rgba(255,255,255,.9)';
  lines(c, d.phrase, 860).forEach(l => { c.fillText(l, CX, y); y += 46; });
  c.font = F(600, 24); const pills = d.tags.map(t => ({ t, w: c.measureText(t).width + 44 })); const pw = pills.reduce((a, p) => a + p.w, 0) + 14 * (pills.length - 1);
  let px = CX - pw / 2; y += 14;
  pills.forEach(p => { rr(c, px, y - 34, p.w, 50, 25); c.fillStyle = 'rgba(255,255,255,.14)'; c.fill(); c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(p.t, px + 22, y); px += p.w + 14; });
  c.textAlign = 'center';
  /* Pie */
  c.textAlign = 'left'; c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2; c.beginPath(); c.moveTo(92, H - 170); c.lineTo(W - 92, H - 170); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.75)'; c.font = F(500, 22); c.fillText('ADN autodeclarado. No es un sello ni una certificación.', 92, H - 122);
  c.fillStyle = '#fff'; c.font = F(700, 28); c.fillText('Descubre el tuyo en Bogotá Capital GovTech', 92, H - 80);
  return cv;
}
export async function cardDataURL(d) { try { return (await draw(d)).toDataURL('image/png'); } catch { return ''; } }
export async function downloadCard(d) {
  const cv = await draw(d);
  cv.toBlob(b => { if (!b) return; const url = URL.createObjectURL(b); const a = document.createElement('a'); a.href = url; a.download = 'Mi_ADN_GovTech.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); }, 'image/png');
}
/* El informe se imprime con el diálogo del navegador («Guardar como PDF»). */
export function printReport(html) {
  let box = document.querySelector('#print-report');
  if (!box) { box = document.createElement('article'); box.id = 'print-report'; document.body.appendChild(box); }
  box.innerHTML = html;
  document.documentElement.classList.add('printing');
  const done = () => { document.documentElement.classList.remove('printing'); removeEventListener('afterprint', done); };
  addEventListener('afterprint', done);
  window.print();
}

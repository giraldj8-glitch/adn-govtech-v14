/* v14 · Base de datos para analizar las respuestas (servidor de server/server.mjs, desplegado en Coolify).
   Solo se activa cuando la página la entrega ese servidor: él agrega <meta name="adn-api">. Abierta como archivo
   o desde el servidor de desarrollo, no envía nada y la app funciona igual que antes. */
export const REMOTE = !!document.querySelector('meta[name="adn-api"]');
const API = REMOTE ? new URL('api/', location.origin + '/') : null;

export function newId() {
  try { return crypto.randomUUID(); } catch { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12); }
}
export function sendRemote(path, data) {
  if (!API) return Promise.resolve(false);
  /* keepalive deja terminar el envío aunque el quiosco se reinicie, pero el navegador lo limita a 64 KB: la tarjeta (imagen) va sin él. */
  const body = JSON.stringify(data);
  return fetch(new URL(path, API), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: body.length < 60000 })
    .then(r => r.ok).catch(() => false);
}

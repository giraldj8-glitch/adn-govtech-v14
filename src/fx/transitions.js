/* Transiciones de escena del v8, inspiradas en la navegación de santionispirits.com
   (cargador, portal que se abre, cortinas de color, títulos que se arman por letras),
   adaptadas a la identidad ADN: arcos, morado, rosa y crema. Sin estética de cómic ni sonido.
   Regla: con movimiento reducido no se anima nada; el cambio de pantalla es directo. */
import { gsap, motionOK } from "./motion.js";

const veil = () => document.querySelector("#veil");
const wait = ms => new Promise(r => setTimeout(r, ms));
const done = tl => new Promise(r => { tl.eventCallback("onComplete", r); });
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* Divide un título en letras dentro de máscaras por palabra. Conserva el texto completo
   para lectores de pantalla con aria-label y no parte palabras al cambiar de línea. */
export function splitChars(el) {
  if (!el || el.dataset.split) return [];
  el.dataset.split = "1";
  el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
  const out = [];
  const walk = node => {
    [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
          const w = document.createElement("span"); w.className = "w"; w.setAttribute("aria-hidden", "true");
          [...part].forEach(c => { const s = document.createElement("span"); s.className = "ci"; s.textContent = c; w.appendChild(s); out.push(s); });
          frag.appendChild(w);
        });
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1) walk(ch);
    });
  };
  walk(el);
  return out;
}

/* Título que se arma letra por letra desde abajo de su máscara. */
export function assemble(el, delay = 0) {
  if (!motionOK() || !el) return null;
  const chars = splitChars(el);
  if (!chars.length) return null;
  return gsap.from(chars, { yPercent: 115, rotate: 6, duration: .7, ease: "power4.out", stagger: Math.min(.03, .9 / chars.length), delay });
}

/* ---------- Cargador inicial: emblema en arco que se dibuja y línea fina de progreso ---------- */
export function loader(onExit) {
  const el = document.querySelector("#loader");
  if (!el || !motionOK()) { el?.remove(); onExit?.(); return Promise.resolve(); }
  return new Promise(resolve => {
    const path = el.querySelector(".ld-arch path");
    const len = path.getTotalLength();
    const pct = el.querySelector(".ld-pct");
    const n = { v: 0 };
    const skip = () => tl.progress(1);
    const tl = gsap.timeline({ onComplete: () => { window.removeEventListener("keydown", skip); el.remove(); resolve(); } });
    tl.set(path, { strokeDasharray: len, strokeDashoffset: len })
      .to(path, { strokeDashoffset: 0, duration: .75, ease: "power2.inOut" }, 0)
      .from(el.querySelectorAll(".ld-brand,.ld-title"), { opacity: 0, y: 12, duration: .45, ease: "power3.out", stagger: .08 }, .1)
      .to(el.querySelector(".ld-line span"), { scaleX: 1, duration: .75, ease: "power2.inOut" }, 0)
      .to(n, { v: 100, duration: .75, ease: "power2.inOut", onUpdate: () => { pct.textContent = Math.round(n.v) + "%"; } }, 0)
      .add(() => onExit?.(), .8)
      .to(el, { yPercent: -105, duration: .5, ease: "power3.inOut" }, .8);
    el.addEventListener("click", skip, { once: true });
    window.addEventListener("keydown", skip, { once: true });
  });
}

/* ---------- Portal en arco: para cambiar de etapa y para revelar el resultado ---------- */
async function portalCover({ x, y, color, accent = "#ee3998", label = "", sub = "" }) {
  const v = veil(); const W = innerWidth, H = innerHeight;
  const cx = x ?? W / 2, cy = y ?? H * .62;
  const S = 3 * Math.hypot(W, H) / 200;
  v.innerHTML = `<div class="pv pv-a" style="background:${accent}"></div><div class="pv pv-b" style="background:${color}"></div>
    <div class="pv-text">${label ? `<p class="pv-label">${esc(label)}</p>` : ""}${sub ? `<p class="pv-sub">${esc(sub)}</p>` : ""}</div>`;
  v.hidden = false; v.classList.add("on");
  const arcs = v.querySelectorAll(".pv");
  gsap.set(arcs, { left: cx - 100, top: cy - 120, scale: 0, transformOrigin: "50% 50%" });
  const tl = gsap.timeline();
  tl.to(arcs[0], { scale: S, duration: .55, ease: "power3.in" }, 0)
    .to(arcs[1], { scale: S, duration: .55, ease: "power3.in" }, .08);
  const lab = v.querySelector(".pv-label"), s = v.querySelector(".pv-sub");
  if (lab) tl.add(assemble(lab), .38);
  if (s) tl.from(s, { opacity: 0, y: 14, duration: .4, ease: "power3.out" }, .52);
  await done(tl);
  if (label) await wait(200);
}
async function portalReveal({ color, accent = "#ee3998" }) {
  const v = veil();
  v.querySelectorAll(".pv").forEach(a => a.remove());
  v.insertAdjacentHTML("afterbegin", `<div class="pv-fill pv-fill-a" style="background:${accent}"></div><div class="pv-fill pv-fill-b" style="background:${color}"></div>`);
  const tl = gsap.timeline();
  tl.to(v.querySelector(".pv-text"), { yPercent: -40, opacity: 0, duration: .35, ease: "power2.in" }, 0)
    .to(v.querySelector(".pv-fill-b"), { yPercent: -112, duration: .62, ease: "power3.inOut" }, 0)
    .to(v.querySelector(".pv-fill-a"), { yPercent: -112, duration: .62, ease: "power3.inOut" }, .07);
  await done(tl);
}

/* ---------- Cortina de color: bienvenida, casos, Intra y vistas de equipo ---------- */
async function curtainCover({ color = "#211744", accent = "#ee3998", dir = 1 }) {
  const v = veil();
  v.innerHTML = `<div class="cv cv-a" style="background:${accent}"></div><div class="cv cv-b" style="background:${color}"></div>`;
  v.hidden = false; v.classList.add("on");
  const from = dir > 0 ? "0% 50%" : "100% 50%";
  const tl = gsap.timeline();
  tl.fromTo(v.querySelectorAll(".cv"), { scaleX: 0, transformOrigin: from }, { scaleX: 1, duration: .42, ease: "power3.inOut", stagger: .08 });
  await done(tl);
}
async function curtainReveal({ dir = 1 }) {
  const v = veil();
  const to = dir > 0 ? "100% 50%" : "0% 50%";
  const tl = gsap.timeline();
  tl.set(v.querySelectorAll(".cv"), { transformOrigin: to })
    .to([v.querySelector(".cv-b"), v.querySelector(".cv-a")], { scaleX: 0, duration: .42, ease: "power3.inOut", stagger: .08 });
  await done(tl);
}

function clearVeil() { const v = veil(); if (!v) return; v.classList.remove("on"); v.hidden = true; v.innerHTML = ""; }

/* ---------- Deslizamiento corto entre preguntas o páginas de una misma sección ---------- */
async function slideOut(main, { axis = "y", dir = 1 }) {
  if (!main.firstElementChild) return;
  const prop = axis === "x" ? { x: -36 * dir } : { y: -22 * dir };
  await done(gsap.timeline().to(main.children, { opacity: 0, duration: .2, ease: "power2.in", ...prop }));
}

/* Ejecuta la transición elegida alrededor del cambio de contenido (swap).
   La animación de entrada del contenido nuevo la hace quien llama, después de swap. */
export async function run(kind, opts, swap) {
  if (!motionOK() || kind === "none") { clearVeil(); swap(); return; }
  try {
    if (kind === "portal") { await portalCover(opts); swap(); await portalReveal(opts); }
    else if (kind === "curtain") { await curtainCover(opts); swap(); await curtainReveal(opts); }
    else { await slideOut(opts.main, opts); swap(); }
  } finally { clearVeil(); }
}

/* Barras que crecen (conteos del resultado). */
export function growBars(scope) {
  if (!motionOK()) return;
  const bars = scope.querySelectorAll(".rc-bar i");
  if (bars.length) gsap.from(bars, { scaleX: 0, transformOrigin: "0 50%", duration: .9, ease: "power3.out", stagger: .09, delay: .5 });
}

/* Coreografía de movimiento con GSAP.
   Regla: el contenido es legible desde el primer cuadro; la animación solo acompaña.
   Con movimiento reducido (sistema o botón del encabezado) no se anima nada. */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

const KEY = "adn-govtech-v6-motion";
const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
let pref = null;
try { const m = localStorage.getItem(KEY); if (m === "reduce" || m === "full") pref = m; } catch (e) { /* sin almacenamiento */ }

export function motionOK() { return pref === "full" || (pref !== "reduce" && !mq.matches); }
export function motionPref() { return pref; }
export function toggleMotion() {
  pref = motionOK() ? "reduce" : "full";
  try { localStorage.setItem(KEY, pref); } catch (e) { /* ignorar */ }
  applyMotionAttr();
  if (!motionOK()) { gsap.globalTimeline.getChildren(true, true, true).forEach(t => t.progress(1)); ScrollTrigger.getAll().forEach(st => st.kill(true)); clearHidden(document); }
  return motionOK();
}
export function applyMotionAttr() {
  const root = document.documentElement;
  if (pref === null) root.removeAttribute("data-motion"); else root.setAttribute("data-motion", pref);
}
export function onSystemMotionChange(cb) { mq.addEventListener && mq.addEventListener("change", cb); }

const EASE = "power3.out";

/* Divide un título en palabras para que suban una a una. El texto sigue siendo texto. */
export function splitWords(el) {
  if (!el || el.dataset.split) return [];
  el.dataset.split = "1";
  const walk = node => {
    const out = [];
    node.childNodes.forEach(ch => {
      if (ch.nodeType === 3) {
        const parts = ch.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach(p => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          const w = document.createElement("span"); w.className = "w";
          const i = document.createElement("span"); i.className = "wi"; i.textContent = p;
          w.appendChild(i); frag.appendChild(w); out.push(i);
        });
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1) { out.push(...walk(ch)); }
    });
    return out;
  };
  return walk(el);
}

/* Dibuja la retícula: las líneas crecen como en un trazo, sin ocultar el texto. */
export function drawGrid(scope, delay = 0) {
  if (!motionOK()) return null;
  const tl = gsap.timeline({ delay });
  scope.querySelectorAll(".gbox").forEach((box, b) => {
    const cells = box.querySelectorAll(".cell");
    tl.fromTo(box, { "--lx": "0%", "--ly": "0%" }, { "--lx": "100%", "--ly": "100%", duration: .7, ease: "power2.inOut" }, b * .08);
    tl.fromTo(cells, { "--lx": "0%", "--ly": "0%" }, { "--lx": "100%", "--ly": "100%", duration: .55, ease: "power2.inOut", stagger: { each: .045, from: "start" } }, b * .08 + .12);
  });
  return tl;
}

function words(scope, sel, delay) {
  const tl = gsap.timeline({ delay });
  scope.querySelectorAll(sel).forEach(h => {
    const ws = splitWords(h);
    if (ws.length) tl.from(ws, { yPercent: 105, opacity: 0, duration: .75, ease: "power4.out", stagger: .045 }, 0);
  });
  return tl;
}

/* Entrada de cada tipo de pantalla */
export function enter(scope, type, dir = 1) {
  if (!motionOK()) return;
  const tl = gsap.timeline();
  if (type === "question") {
    tl.from(scope.querySelectorAll(".stage-kicker,.stage-note,.cond-banner"), { y: 10, opacity: 0, duration: .45, ease: EASE, stagger: .06 }, 0)
      .add(words(scope, ".qcell h1", 0), .05)
      .from(scope.querySelectorAll(".q-tags,.hint,.role-note"), { opacity: 0, y: 8, duration: .5, ease: EASE, stagger: .05 }, .15)
      .add(drawGrid(scope), 0)
      .from(scope.querySelectorAll(".ocell .opt"), { x: 18 * dir, opacity: 0, duration: .5, ease: EASE, stagger: .035 }, .18)
      .from(scope.querySelectorAll(".map"), { opacity: 0, x: 24, duration: .6, ease: EASE }, .25)
      .from(scope.querySelectorAll(".dots .d"), { scale: 0, duration: .35, ease: "back.out(2)", stagger: .015 }, .2);
  } else if (type === "chapter") {
    tl.from(scope.querySelector(".big-num"), { yPercent: 40, opacity: 0, duration: .9, ease: "power4.out" }, 0)
      .from(scope.querySelectorAll(".stage-kicker"), { opacity: 0, y: 10, duration: .45 }, .1)
      .add(words(scope, ".chapter h1", 0), .12)
      .from(scope.querySelectorAll(".ch-lede"), { opacity: 0, y: 12, duration: .6, ease: EASE }, .35)
      .from(scope.querySelectorAll(".f-node"), { opacity: 0, y: 12, scale: .9, duration: .45, ease: "back.out(1.8)", stagger: .16 }, .45)
      .from(scope.querySelectorAll(".f-link"), { scaleX: 0, transformOrigin: "left center", duration: .3, ease: "power2.out", stagger: .16 }, .55)
      .add(drawGrid(scope), .5)
      .from(scope.querySelectorAll(".ch-arch"), { y: 60, opacity: 0, duration: 1, ease: "power4.out" }, 0)
      .from(scope.querySelectorAll(".stage-actions"), { opacity: 0, y: 10, duration: .4 }, .8);
  } else if (type === "welcome") {
    tl.from(scope.querySelectorAll(".landing .kicker"), { opacity: 0, y: 10, duration: .5 }, 0)
      .add(words(scope, ".landing h1", 0), .05)
      .from(scope.querySelectorAll(".landing .lede,.landing .pill-row,.landing .fine,.landing .resume,.landing .intra-link"), { opacity: 0, y: 14, duration: .6, ease: EASE, stagger: .07 }, .35)
      .from(scope.querySelectorAll(".hero-arch"), { y: 70, opacity: 0, duration: 1.1, ease: "power4.out" }, .1)
      .add(drawGrid(scope.querySelector(".facts4") || scope), .6);
    reveal(scope);
  } else if (type === "result") {
    tl.from(scope.querySelectorAll(".demo-strip,.result-hero .stage-kicker"), { opacity: 0, y: 10, duration: .45, stagger: .05 }, 0)
      .add(words(scope, ".rh-grid h1", 0), .05)
      .from(scope.querySelectorAll(".rh-tag,.rh-disc,.rh-grid .pill-row,.scroll-cue"), { opacity: 0, y: 14, duration: .6, ease: EASE, stagger: .08 }, .45)
      .from(scope.querySelectorAll(".rh-arch"), { y: 80, opacity: 0, duration: 1.1, ease: "power4.out" }, .1)
      .add(drawGrid(scope.querySelector(".story") ? scope.querySelector(".story").parentNode : scope), .7)
      .from(scope.querySelectorAll(".story p"), { opacity: 0, duration: .8 }, .9);
    reveal(scope);
  } else {
    tl.from(scope.querySelectorAll(".page > *"), { opacity: 0, y: 16, duration: .5, ease: EASE, stagger: .05 }, 0)
      .add(drawGrid(scope), .1);
  }
  return tl;
}

/* Revelado al hacer scroll para secciones largas (solo con movimiento completo). */
export function reveal(scope) {
  if (!motionOK()) return;
  scope.querySelectorAll("[data-reveal]").forEach(sec => {
    sec.classList.add("pre-reveal");
    ScrollTrigger.create({
      trigger: sec, start: "top 88%", once: true,
      onEnter: () => {
        sec.classList.remove("pre-reveal");
        gsap.fromTo(sec, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: .7, ease: EASE, clearProps: "transform,opacity" });
        drawGrid(sec, .05);
        const arches = sec.querySelectorAll(".arch-card");
        if (arches.length) gsap.from(arches, { y: 40, opacity: 0, duration: .8, ease: "power4.out", stagger: .07 });
        const rungs = sec.querySelectorAll(".dna-rows li");
        if (rungs.length) gsap.from(rungs, { x: -12, opacity: 0, duration: .4, stagger: .05, ease: EASE });
      }
    });
  });
  requestAnimationFrame(() => ScrollTrigger.refresh());
}
export function clearHidden(scope) {
  scope.querySelectorAll(".pre-reveal").forEach(s => s.classList.remove("pre-reveal"));
  gsap.set(scope.querySelectorAll("[data-reveal], .gbox, .cell"), { clearProps: "all" });
}

/* Salida corta antes de cambiar de pantalla */
export function leave(scope) {
  if (!motionOK() || !scope.firstElementChild) return Promise.resolve();
  return new Promise(res => {
    gsap.to(scope.children, { opacity: 0, y: -8, duration: .18, ease: "power1.in", onComplete: res });
    setTimeout(res, 260);
  });
}

export function cleanup() {
  ScrollTrigger.getAll().forEach(st => st.kill());
  gsap.killTweensOf("*");
}

/* Un punto nuevo en la barra cuando se abre una pregunta condicional */
export function popIn(els) {
  if (!motionOK() || !els.length) return;
  gsap.fromTo(els, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: .6, ease: "elastic.out(1,.45)", stagger: .05 });
}
export function pulse(el) {
  if (!motionOK() || !el) return;
  gsap.fromTo(el, { scale: 1 }, { scale: 1.04, duration: .18, yoyo: true, repeat: 1, ease: "power1.inOut" });
}
export function shake(el) {
  if (!motionOK() || !el) return;
  gsap.fromTo(el, { x: -6 }, { x: 0, duration: .5, ease: "elastic.out(1,.3)" });
}

window.addEventListener("beforeprint", () => { clearHidden(document); });

export { gsap, ScrollTrigger };

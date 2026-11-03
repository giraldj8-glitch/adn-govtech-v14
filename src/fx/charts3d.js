/* Gráficos del entregable diseñados por UX/UI en el Figma «Servicio 1», llevados a 3D con Three.js:
   - Rueda «Tus 5 dimensiones»: un sector por dimensión y un anillo por pregunta, del color del arquetipo
     de la opción elegida. Todos los anillos tienen la misma altura: no mide nivel ni madurez.
   - «Tu secuencia ADN»: doble hélice con las 20 respuestas en orden.
   Son decorativos frente a la información, que siempre está también en texto (aria-label y listas).
   Sin WebGL se usa el gráfico en SVG; con movimiento reducido se dibuja una imagen fija. */
import * as THREE from "three";
import { mountStage } from "./scenes.js";
import { motionOK } from "./motion.js";

const mat = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .5, metalness: 0 }, o));
/* Color fiel a la leyenda: sin mapeo de tonos y con luz contenida, para que la esfera A se vea del violeta de A
   y no del lila de D (los dos tonos del Figma son cercanos). */
const flat = color => new THREE.MeshStandardMaterial({ color, roughness: .38, metalness: 0, emissive: color, emissiveIntensity: .32, toneMapped: false });
const ease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

function labelLayer(container) {
  const layer = document.createElement("div"); layer.className = "c3d-labels"; layer.setAttribute("aria-hidden", "true");
  container.appendChild(layer); return layer;
}
function shadowFloor(scene, y = 0, size = 30) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShadowMaterial({ opacity: .12 }));
  f.rotation.x = -Math.PI / 2; f.position.y = y; f.receiveShadow = true; scene.add(f);
}

/* ---------- Rueda de las 5 dimensiones ----------
   sectors: [{num, name, total, done, rings:[color|null]}]  (null = pendiente) */
export function mountWheel3D(container, { sectors, center = "", fallback = "" }) {
  let layer;
  const dispose = mountStage(container, {
    fallback,
    pointer: true,
    camera: { fov: 30, base: new THREE.Vector3(0, 10.4, 10.6), look: new THREE.Vector3(0, -.3, .25), sway: .9, swayY: .5, fit: a => a < 1.1 ? Math.min(46, 31 / Math.max(a, .6)) : 30 },
    setup(scene, camera, api) {
      const { HemisphereLight, DirectionalLight } = THREE;
      scene.add(new HemisphereLight(0xffffff, 0xb9a8ee, 1.6));
      const key = new DirectionalLight(0xffffff, 2.2); key.position.set(4, 9, 6); key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: .5, far: 30 }); key.shadow.bias = -.0005;
      scene.add(key);
      shadowFloor(scene, 0);
      const wheel = new THREE.Group(); scene.add(wheel);
      const R0 = 1.05, W = .36, GAP = .08, H = .26, MAXR = 5, half = 31 * Math.PI / 180;
      const arcs = [];
      sectors.forEach((s, k) => {
        const mid = Math.PI / 2 - k * 2 * Math.PI / sectors.length;
        for (let j = 0; j < MAXR; j++) {
          const r0 = R0 + j * (W + GAP), r1 = r0 + W, used = j < s.rings.length, color = used ? s.rings[j] : null;
          const sh = new THREE.Shape();
          sh.absarc(0, 0, r1, mid - half, mid + half, false);
          sh.absarc(0, 0, r0, mid + half, mid - half, true);
          const h = used ? (color ? H : H * .35) : .025;
          const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: used && !!color, bevelSize: .025, bevelThickness: .025, bevelSegments: 2, curveSegments: 40 });
          g.rotateX(-Math.PI / 2);
          const m = new THREE.Mesh(g, used ? (color ? mat(color) : mat(0xffffff, { transparent: true, opacity: .7 })) : mat(0xcfc3f3, { transparent: true, opacity: .35 }));
          m.castShadow = used; m.receiveShadow = true; wheel.add(m);
          if (used) arcs.push({ m, delay: k * .12 + j * .09 });
        }
      });
      const core = new THREE.Mesh(new THREE.CylinderGeometry(R0 - .16, R0 - .16, .42, 64), mat(0x1e0f5c, { roughness: .35 }));
      core.position.y = .21; core.castShadow = true; wheel.add(core);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R0 - .16, .035, 12, 80), mat(0xec4f9c, { emissive: 0xec4f9c, emissiveIntensity: .35 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = .43; wheel.add(ring);
      layer = labelLayer(container);
      const Rmax = R0 + MAXR * (W + GAP);
      const labs = sectors.map((s, k) => {
        const mid = Math.PI / 2 - k * 2 * Math.PI / sectors.length;
        const el = document.createElement("div"); el.className = "c3d-lab"; el.innerHTML = `<div class="in"><b>${s.num} · ${s.done}/${s.total}</b><span>${s.name}</span></div>`;
        layer.appendChild(el);
        const c = Math.cos(mid); el.dataset.side = Math.abs(c) < .3 ? "c" : c > 0 ? "r" : "l";
        return { el, p: new THREE.Vector3(Math.cos(mid) * (Rmax + .35), .1, -Math.sin(mid) * (Rmax + .35)) };
      });
      const cen = document.createElement("div"); cen.className = "c3d-center"; cen.innerHTML = `<div class="in">${center}</div>`; layer.appendChild(cen);
      let start = null;
      return (t, cam) => {
        if (start === null) start = t;
        const e = t - start;
        arcs.forEach(a => { const f = motionOK() ? ease((e - a.delay) / .6) : 1; a.m.scale.y = Math.max(.001, f); });
        wheel.rotation.y = motionOK() ? Math.sin(t * .35) * .1 : 0;
        labs.forEach(l => { const v = l.p.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), wheel.rotation.y); const q = api.project(v); l.el.style.transform = `translate(${q.x}px,${q.y}px)`; });
        const q = api.project(new THREE.Vector3(0, .45, 0)); cen.style.transform = `translate(${q.x}px,${q.y}px)`;
      };
    }
  });
  return () => { dispose(); layer?.remove(); };
}

/* ---------- Secuencia ADN en doble hélice ----------
   nodes: [{id, letter, color|null}] en orden; groups: [{label, from, to}] (índices). */
export function mountSequence3D(container, { nodes, groups, fallback = "" }) {
  let layer;
  const STEP = .62, GROUPGAP = .7, R = .62;
  const xs = []; let x = 0;
  groups.forEach((g, gi) => { for (let i = g.from; i <= g.to; i++) { xs[i] = x; x += STEP; } x += GROUPGAP; });
  const L = x - GROUPGAP - STEP, off = -L / 2;
  const dispose = mountStage(container, {
    fallback,
    camera: { fov: 20, base: new THREE.Vector3(0, 1.4, 21), look: new THREE.Vector3(0, 0, 0), sway: 1.2, swayY: .8, fit: a => Math.max(5, 2 * Math.atan((L + 1.6) / 2 / 21 / a) * 180 / Math.PI) },
    setup(scene, camera, api) {
      scene.add(new THREE.HemisphereLight(0xffffff, 0x8f84b8, .75));
      const key = new THREE.DirectionalLight(0xffffff, .95); key.position.set(3, 6, 8); scene.add(key);
      const rim = new THREE.PointLight(0xffffff, 6, 30); rim.position.set(-6, 2, 4); scene.add(rim);
      const helix = new THREE.Group(); scene.add(helix);
      const twist = .62;
      const strand = sgn => {
        const pts = [];
        for (let k = 0; k <= 220; k++) { const xx = -.6 + k / 220 * (L + 1.2); const a = xx * twist / STEP * .9; pts.push(new THREE.Vector3(off + xx, sgn * Math.cos(a) * R, sgn * Math.sin(a) * R)); }
        /* Hebras neutras: el color queda solo para las respuestas, igual que en las convenciones. */
        return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, .05, 10, false), mat(sgn > 0 ? 0xe6dffb : 0xcfc5f2, { roughness: .4, emissive: sgn > 0 ? 0xe6dffb : 0xcfc5f2, emissiveIntensity: .45 }));
      };
      helix.add(strand(1), strand(-1));
      const spheres = [];
      nodes.forEach((n, i) => {
        const xx = off + xs[i], a = xs[i] * twist / STEP * .9;
        const A = new THREE.Vector3(xx, Math.cos(a) * R, Math.sin(a) * R), B = A.clone().multiply(new THREE.Vector3(1, -1, -1));
        const len = A.distanceTo(B), rung = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, len, 10), n.color ? flat(n.color) : mat(0xdcd2fb, { transparent: true, opacity: .9 }));
        rung.position.set(xx, 0, 0); rung.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); helix.add(rung);
        const sph = new THREE.Mesh(new THREE.SphereGeometry(.27, 40, 20), n.color ? flat(n.color) : mat(0xffffff, { transparent: true, opacity: .75 }));
        sph.position.set(xx, 0, 0); scene.add(sph);
        spheres.push({ m: sph, delay: i * .05 });
      });
      layer = labelLayer(container);
      const lab = nodes.map((n, i) => { const el = document.createElement("div"); el.className = "c3d-node" + (n.color ? "" : " pending"); el.innerHTML = `<div class="in"><b>${n.color ? n.letter : "·"}</b></div><small>${n.id}</small>`; layer.appendChild(el); return { el, p: new THREE.Vector3(off + xs[i], 0, .3) }; });
      const brs = groups.map(g => { const el = document.createElement("div"); el.className = "c3d-bracket"; el.innerHTML = `<span>${g.label}</span>`; layer.appendChild(el); return { el, a: new THREE.Vector3(off + xs[g.from] - .3, R + .55, 0), b: new THREE.Vector3(off + xs[g.to] + .3, R + .55, 0) }; });
      let start = null;
      return t => {
        if (start === null) start = t;
        const e = t - start;
        helix.rotation.x = motionOK() ? -t * .45 : -.6;
        spheres.forEach(s => { const f = motionOK() ? ease((e - s.delay) / .5) : 1; s.m.scale.setScalar(Math.max(.001, f)); });
        lab.forEach((l, i) => { const q = api.project(l.p); l.el.style.transform = `translate(${q.x}px,${q.y}px)`; l.el.style.opacity = motionOK() ? Math.min(1, Math.max(0, (e - spheres[i].delay - .2) / .3)) : 1; });
        brs.forEach(b => { const qa = api.project(b.a), qb = api.project(b.b); b.el.style.transform = `translate(${qa.x}px,${qa.y}px)`; b.el.style.width = Math.max(0, qb.x - qa.x) + "px"; });
      };
    }
  });
  return () => { dispose(); layer?.remove(); };
}

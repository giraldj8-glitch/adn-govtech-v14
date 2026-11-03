/* Escenas 3D con Three.js: una habitación con ventana en arco, pedestal acanalado y formas
   geométricas propias (escalón, esfera, medio disco, anillos, puente, hélice del ADN).
   Inspiradas en el vocabulario espacial de Creative Types, sin reutilizar sus modelos ni personajes.
   Son decorativas (aria-hidden); la información siempre está también en texto. */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { motionOK } from "./motion.js";
import { scene2D } from "./glyphs.js";

const C = { pink: 0xee3998, rose: 0xf184b9, blush: 0xffc6e1, cream: 0xfff1e2, violet: 0x8f4dec, lav: 0xcdbcf0, gold: 0xffc15e, deep: 0x2a1f63 };
/* v10: tonos de las salas tomados de los degradados del Figma «Servicio 1» (Perfil índigo, SER violeta-magenta,
   HACER índigo-lila, TENER magenta) y salas pastel para las ilustraciones de los arquetipos de la diseñadora. */
const TONES = {
  hero: [0x5b34d6, 0x4626b0], perfil: [0x4a32c0, 0x3a24a0], f1: [0x8a2a9e, 0x6d1f80], f2: [0x4a45c8, 0x3a36a8],
  f3: [0xb4307f, 0x93246a], f4: [0x8a2a9e, 0x6d1f80], cierre: [0x5b34d6, 0x4626b0], result: [0x4d2bb8, 0x3c2196],
  arqA: [0xdcd3ff, 0xc9bcf7], arqB: [0xffd6e8, 0xf6bfd7], arqC: [0xffdccb, 0xf6c3ac], arqD: [0xead6ff, 0xd9bff6]
};

let glCache = null;
export function webglOK() {
  if (glCache !== null) return glCache;
  try { const c = document.createElement("canvas"); glCache = !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); }
  catch (e) { glCache = false; }
  return glCache;
}

const mat = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .62, metalness: 0 }, o));

function fluted(r, h, ribs = 26, depth = .035) {
  const g = new THREE.CylinderGeometry(r, r, h, 96, 1, false);
  const p = g.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const rad = Math.hypot(v.x, v.z);
    if (rad > r * .98) { const a = Math.atan2(v.z, v.x); const k = 1 - depth * (0.5 + 0.5 * Math.cos(a * ribs)); v.x *= k; v.z *= k; p.setXYZ(i, v.x, v.y, v.z); }
  }
  g.computeVertexNormals();
  return g;
}
function shadowed(m, cast = true, receive = true) { m.castShadow = cast; m.receiveShadow = receive; return m; }

function room(scene, wallC, floorC) {
  const floor = shadowed(new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat(floorC, { roughness: .95 })), false, true);
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const s = new THREE.Shape(); s.moveTo(-9, 0); s.lineTo(9, 0); s.lineTo(9, 12); s.lineTo(-9, 12); s.lineTo(-9, 0);
  const hole = new THREE.Path(); const R = 1.85, base = 1.05, top = 3.25;
  hole.moveTo(-R, base); hole.lineTo(R, base); hole.lineTo(R, top); hole.absarc(0, top, R, 0, Math.PI, false); hole.lineTo(-R, base);
  s.holes.push(hole);
  const wall = shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: .5, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 3, curveSegments: 48 }), mat(wallC, { roughness: .9 })), false, true);
  wall.position.set(0, 0, -2.8); scene.add(wall);
}

function plinth(scene, r = 1.05, h = .62, color = C.lav) {
  const m = shadowed(new THREE.Mesh(fluted(r, h), mat(color, { roughness: .7 })));
  m.position.y = h / 2; scene.add(m);
  const cap = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, .06, 96), mat(C.cream, { roughness: .6 })));
  cap.position.y = h + .03; scene.add(cap);
  return h + .06;
}

function sparkle(scene, x, y, z, s = 1, color = C.cream) {
  const g = new THREE.OctahedronGeometry(.12, 0); g.scale(.55, 1.6, .55);
  const m = new THREE.Mesh(g, mat(color, { emissive: color, emissiveIntensity: .45, roughness: .3 }));
  m.position.set(x, y, z); m.scale.setScalar(s); scene.add(m);
  return m;
}

/* Hélice del ADN. states: arreglo de 8 {s:0|1|2, alert:bool}; null = decorativa. 01 queda arriba. */
function helix(group, states, opts = {}) {
  const n = 8, R = opts.R || .56, step = opts.step || .36, top = opts.top || 3.7, twist = .78;
  const nodes = [];
  const lerpV = (a, b, t) => new THREE.Vector3().lerpVectors(a, b, t);
  for (let i = 0; i < n; i++) {
    const y = top - i * step, a = i * twist;
    const A = new THREE.Vector3(Math.cos(a) * R, y, Math.sin(a) * R);
    const B = new THREE.Vector3(-Math.cos(a) * R, y, -Math.sin(a) * R);
    nodes.push({ A, B, y });
    const st = states ? states[i] : { s: 2, alert: false };
    const cyl = (p, q, rad, color, o) => {
      const len = p.distanceTo(q); const g = new THREE.CylinderGeometry(rad, rad, len, 20);
      const m = shadowed(new THREE.Mesh(g, mat(color, o))); m.position.copy(lerpV(p, q, .5));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(q, p).normalize());
      group.add(m); return m;
    };
    const solid = states ? C.cream : (i % 2 ? C.cream : C.blush);
    if (st.s === 2) cyl(A, B, .075, solid);
    else if (st.s === 1) { const M = lerpV(A, B, .5); cyl(A, M, .075, solid); cyl(M, B, .026, C.lav, { transparent: true, opacity: .55 }); }
    else cyl(A, B, .026, C.lav, { transparent: true, opacity: .42 });
    const nodeR = st.s === 0 ? .09 : .125;
    const na = shadowed(new THREE.Mesh(new THREE.SphereGeometry(nodeR, 32, 16), mat(st.s === 0 ? C.lav : C.pink, { roughness: .45 })));
    na.position.copy(A); group.add(na);
    const nb = shadowed(new THREE.Mesh(new THREE.SphereGeometry(nodeR, 32, 16), mat(st.s === 2 ? C.violet : C.lav, { roughness: .45 })));
    nb.position.copy(B); group.add(nb);
    if (st.alert) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.22, .028, 12, 48), mat(C.gold, { emissive: C.gold, emissiveIntensity: .35 }));
      ring.position.copy(B); ring.userData.billboard = true; group.add(ring);
    }
  }
  const strand = key => {
    const pts = [];
    for (let k = 0; k <= 70; k++) {
      const t = k / 70 * (n - 1), a = t * twist, y = top - t * step, sgn = key === "A" ? 1 : -1;
      pts.push(new THREE.Vector3(sgn * Math.cos(a) * R, y, sgn * Math.sin(a) * R));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const m = shadowed(new THREE.Mesh(new THREE.TubeGeometry(curve, 160, .034, 10, false), mat(key === "A" ? C.pink : C.violet, { roughness: .4 })));
    group.add(m);
  };
  strand("A"); strand("B");
  return nodes;
}

const BUILDERS = {

  /* ---- Arquetipos (ilustraciones del Figma «Entregable Arquetipo», llevadas a 3D) ---- */
  /* A · Proveedor Tecnológico de Escala: capas de servidor apiladas y flecha que sube. */
  arqA(scene) {
    const g = new THREE.Group(); scene.add(g);
    const tones = [0x7a5be0, 0x9b84ee, 0xc4b6fb];
    const slabs = tones.map((c, i) => {
      const s = shadowed(new THREE.Mesh(new RoundedBoxGeometry(1.9 - i * .35, .34, 1.9 - i * .35, 6, .07), mat(c, { roughness: .5 })));
      s.position.y = .2 + i * .48; g.add(s);
      const top = shadowed(new THREE.Mesh(new RoundedBoxGeometry(1.86 - i * .35, .05, 1.86 - i * .35, 3, .02), mat(0xf4f0ff)));
      top.position.y = .2 + i * .48 + .17; g.add(top);
      for (let k = 0; k < 3; k++) { const led = new THREE.Mesh(new THREE.SphereGeometry(.045, 16, 8), mat(k ? 0xffffff : C.pink, { emissive: k ? 0xffffff : C.pink, emissiveIntensity: .5 })); led.position.set(-.55 + i * .17 + k * .16, .2 + i * .48, (1.9 - i * .35) / 2 + .01); g.add(led); }
      return s;
    });
    g.rotation.y = -.65;
    const dots = [0, 1, 2, 3].map(i => { const d = new THREE.Mesh(new THREE.SphereGeometry(.06, 16, 8), mat(C.pink, { emissive: C.pink, emissiveIntensity: .4 })); scene.add(d); return d; });
    const tip = shadowed(new THREE.Mesh(new THREE.ConeGeometry(.17, .3, 4), mat(C.pink, { roughness: .4 }))); tip.rotation.y = Math.PI / 4; scene.add(tip);
    const sp = [sparkle(scene, -1.45, 2.9, .3, .8), sparkle(scene, 1.4, 2.2, .3, .6, C.blush)];
    return t => {
      slabs[2].position.y = .2 + 2 * .48 + Math.sin(t * 1.3) * .05;
      dots.forEach((d, i) => { const f = ((t * .45 + i / 4) % 1); d.position.set(0, 1.55 + f * 1.25, 0); d.scale.setScalar(1 - f * .5); });
      tip.position.set(0, 2.95 + Math.sin(t * 1.6) * .06, 0);
      sp.forEach((s, i) => { s.rotation.y = t + i; });
    };
  },
  /* B · Solucionador GovTech: edificio público con un bombillo encendido y un visto bueno. */
  arqB(scene) {
    const g = new THREE.Group(); g.rotation.y = -.45; scene.add(g);
    const base1 = shadowed(new THREE.Mesh(new RoundedBoxGeometry(2.3, .16, 1.3, 4, .04), mat(0xf7a6c8))); base1.position.y = .08;
    const base2 = shadowed(new THREE.Mesh(new RoundedBoxGeometry(2.05, .14, 1.1, 4, .04), mat(0xffd1e4))); base2.position.y = .23;
    g.add(base1, base2);
    for (let i = 0; i < 4; i++) { const c = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(.1, .11, 1.05, 24), mat(0xfff6fb))); c.position.set(-.72 + i * .48, .82, .15); g.add(c); }
    const beam = shadowed(new THREE.Mesh(new RoundedBoxGeometry(2.1, .14, 1.12, 4, .04), mat(0xffd1e4))); beam.position.y = 1.42; g.add(beam);
    const tri = new THREE.Shape(); tri.moveTo(-1.1, 0); tri.lineTo(1.1, 0); tri.lineTo(0, .55); tri.lineTo(-1.1, 0);
    const ped = shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 1.0, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 2 }), mat(0xf06aa6))); ped.position.set(0, 1.49, -.5); g.add(ped);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.3, 40, 20), mat(0xffd66b, { emissive: 0xffc23d, emissiveIntensity: .55, roughness: .3 })); bulb.position.set(0, 2.75, 0); scene.add(bulb);
    const neck = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(.13, .15, .2, 24), mat(0xb9a8f0))); neck.position.set(0, 2.4, 0); scene.add(neck);
    const rays = new THREE.Group(); rays.position.copy(bulb.position); scene.add(rays);
    for (let i = 0; i < 7; i++) { const a = Math.PI * (.08 + i / 6 * .84); const r = new THREE.Mesh(new RoundedBoxGeometry(.05, .2, .05, 2, .02), mat(0xffd66b, { emissive: 0xffc23d, emissiveIntensity: .4 })); r.position.set(Math.cos(a) * .52, Math.sin(a) * .52, 0); r.rotation.z = a - Math.PI / 2; rays.add(r); }
    const badge = new THREE.Group(); badge.position.set(1.3, 1.35, .7); scene.add(badge);
    badge.add(shadowed(new THREE.Mesh(new THREE.CylinderGeometry(.26, .26, .08, 40).rotateX(Math.PI / 2), mat(0xec4f9c))));
    const ck = new THREE.CatmullRomCurve3([new THREE.Vector3(-.11, 0, .05), new THREE.Vector3(-.03, -.08, .05), new THREE.Vector3(.12, .09, .05)]);
    badge.add(new THREE.Mesh(new THREE.TubeGeometry(ck, 20, .03, 8, false), mat(0xffffff)));
    return t => { const k = .5 + .5 * Math.sin(t * 2); bulb.material.emissiveIntensity = .35 + k * .45; rays.scale.setScalar(.92 + k * .14); badge.rotation.y = Math.sin(t * 1.1) * .4; badge.position.y = 1.35 + Math.sin(t * 1.4) * .05; };
  },
  /* C · Aliado Especializado: lupa con visto bueno y una red de nodos a su alrededor. */
  arqC(scene) {
    const lens = new THREE.Group(); lens.position.set(-.15, 1.85, 0); lens.rotation.z = .5; scene.add(lens);
    lens.add(shadowed(new THREE.Mesh(new THREE.TorusGeometry(.72, .11, 24, 80), mat(0xfff1e8, { roughness: .4 }))));
    lens.add(new THREE.Mesh(new THREE.CircleGeometry(.66, 64), mat(0xffc9b0, { transparent: true, opacity: .55, roughness: .15 })));
    const handle = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, 1.1, 24), mat(0xf07a52, { roughness: .45 }))); handle.position.set(0, -1.3, 0); lens.add(handle);
    const ring = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .16, 24), mat(0xffd5c2))); ring.position.set(0, -.78, 0); lens.add(ring);
    const ck = new THREE.CatmullRomCurve3([new THREE.Vector3(-.26, .02, .04), new THREE.Vector3(-.06, -.18, .04), new THREE.Vector3(.3, .2, .04)]);
    const ckm = new THREE.Mesh(new THREE.TubeGeometry(ck, 24, .06, 10, false), mat(0xf07a52, { emissive: 0xf07a52, emissiveIntensity: .2 })); ckm.rotation.z = -.5; lens.add(ckm);
    const pts = [[-1.5, 2.8, .2], [1.35, 3.0, .1], [1.6, 1.4, .3], [-1.6, 1.0, .3], [.2, 3.35, -.2]].map(p => new THREE.Vector3(...p));
    const nodes = pts.map(p => { const m = shadowed(new THREE.Mesh(new THREE.SphereGeometry(.13, 24, 12), mat(0xf38b63, { roughness: .4 }))); m.position.copy(p); scene.add(m); return m; });
    const center = new THREE.Vector3(-.15, 1.85, 0);
    pts.forEach(p => { const len = p.distanceTo(center) - .8; const dir = new THREE.Vector3().subVectors(p, center).normalize(); const l = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, len, 8), mat(0xf7b49a, { transparent: true, opacity: .8 })); l.position.copy(center.clone().add(dir.clone().multiplyScalar(.8 + len / 2))); l.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); scene.add(l); });
    return t => { lens.rotation.z = .5 + Math.sin(t * .9) * .08; lens.rotation.y = Math.sin(t * .6) * .25; nodes.forEach((n, i) => { n.position.y = pts[i].y + Math.sin(t * 1.5 + i) * .06; }); };
  },
  /* D · Potencial GovTech: un brote que crece desde una caja, con el sol detrás. */
  arqD(scene) {
    const box = shadowed(new THREE.Mesh(new RoundedBoxGeometry(1.7, .8, 1.7, 6, .1), mat(0x8a63ea, { roughness: .55 }))); box.position.y = .4; box.rotation.y = .7; scene.add(box);
    const soil = shadowed(new THREE.Mesh(new RoundedBoxGeometry(1.5, .06, 1.5, 3, .03), mat(0x5b3fb8))); soil.position.y = .81; soil.rotation.y = .7; scene.add(soil);
    const sprout = new THREE.Group(); sprout.position.y = .82; scene.add(sprout);
    const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(.05, .5, 0), new THREE.Vector3(-.04, 1.0, 0), new THREE.Vector3(.02, 1.35, 0)]);
    sprout.add(shadowed(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 40, .045, 10, false), mat(0xf6eaff))));
    const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.bezierCurveTo(.25, .12, .55, .2, .7, 0); leafShape.bezierCurveTo(.5, -.12, .2, -.1, 0, 0);
    const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: .03, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 2 });
    const l1 = shadowed(new THREE.Mesh(leafGeo, mat(0xec4f9c, { roughness: .45 }))); l1.position.set(.02, 1.0, 0); l1.rotation.z = .5;
    const l2 = shadowed(new THREE.Mesh(leafGeo, mat(0xc4a6ff, { roughness: .45 }))); l2.position.set(0, .75, 0); l2.rotation.set(0, Math.PI, .45);
    sprout.add(l1, l2);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(.3, 40, 20), mat(0xffe08a, { emissive: 0xffd060, emissiveIntensity: .5 })); sun.position.set(.95, 3.0, -1.2); scene.add(sun);
    const sp = sparkle(scene, -1.3, 2.6, .3, .8, C.blush);
    return t => { const grow = motionOK() ? Math.min(1, .55 + (t - 1.2) * .5) : 1; sprout.scale.set(1, grow, 1); sprout.rotation.z = Math.sin(t * 1.1) * .06; sprout.rotation.y = t * .3; sun.scale.setScalar(1 + Math.sin(t * 1.5) * .05); sp.rotation.y = t; };
  },
  hero(scene) {
    const h = plinth(scene, .95, .5);
    const g = new THREE.Group(); scene.add(g);
    helix(g, null, { top: h + 2.85, step: .37 });
    const sp = [sparkle(scene, -1.35, 3.6, .2, 1), sparkle(scene, 1.3, 2.9, .4, .8, C.blush), sparkle(scene, -1.1, 1.6, .6, .7, C.blush)];
    return t => { g.rotation.y = t * .42; sp.forEach((s, i) => { s.rotation.y = t * 1.2 + i; s.scale.setScalar(.75 + .25 * Math.sin(t * 2 + i * 2)); }); };
  },
  result(scene, data) {
    const h = plinth(scene, .95, .5);
    const g = new THREE.Group(); scene.add(g);
    const nodes = helix(g, data.states, { top: h + 2.85, step: .37 });
    data.rungY = nodes.map(nd => nd.y);
    const sp = [sparkle(scene, -1.35, 3.7, .2, .9), sparkle(scene, 1.35, 3.1, .3, .7, C.blush)];
    return (t, cam) => { g.rotation.y = t * .3; g.children.forEach(c => { if (c.userData.billboard) c.quaternion.copy(cam.quaternion); }); sp.forEach((s, i) => { s.rotation.y = t + i; }); };
  },
  cierre(scene) { return BUILDERS.hero(scene); },
  perfil(scene) {
    const h = plinth(scene, 1.45, .45);
    const a = shadowed(new THREE.Mesh(new THREE.SphereGeometry(.42, 48, 24), mat(C.pink, { roughness: .45 }))); a.position.set(-.8, h + .42, .1);
    const b = shadowed(new THREE.Mesh(new RoundedBoxGeometry(.62, 1.25, .62, 6, .12), mat(C.cream))); b.position.set(.05, h + .625, -.1);
    const cg = new THREE.CylinderGeometry(.5, .5, .32, 64, 1, false, 0, Math.PI);
    cg.rotateX(Math.PI / 2); cg.rotateZ(Math.PI / 2); /* medio disco de pie, lado plano abajo */
    const c = shadowed(new THREE.Mesh(cg, mat(C.violet))); c.position.set(.9, h, .05);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.38, .03, 12, 64), mat(C.cream, { transparent: true, opacity: .7 })); ring.position.set(1.35, 3.25, .2);
    scene.add(a, b, c, ring);
    const sp = sparkle(scene, -1.4, 3.2, .3, .9, C.blush);
    return t => { a.position.y = h + .42 + Math.sin(t * 1.6) * .08; b.rotation.y = Math.sin(t * .7) * .25; ring.rotation.y = t * .9; ring.rotation.x = .4 + Math.sin(t) * .2; sp.rotation.y = t * 1.3; };
  },
  f1(scene) {
    const g = new THREE.Group(); g.position.set(0, 2.35, 0); scene.add(g);
    const t1 = shadowed(new THREE.Mesh(new THREE.TorusGeometry(1.05, .07, 20, 96), mat(C.cream)));
    const d1 = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(.72, .72, .12, 96), mat(C.rose))); d1.rotation.x = Math.PI / 2;
    const d2 = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .16, 96), mat(C.cream))); d2.rotation.x = Math.PI / 2;
    const core = shadowed(new THREE.Mesh(new THREE.SphereGeometry(.15, 32, 16), mat(C.pink))); core.position.z = .12;
    g.add(t1, d1, d2, core);
    const people = [-1, 0, 1].map((x, i) => { const p = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(.14, .22, 6, 16), mat(i === 1 ? C.pink : C.cream))); p.position.set(x * .75, .26, .9); scene.add(p); return p; });
    return t => { g.rotation.y = Math.sin(t * .6) * .35; people.forEach((p, i) => { p.position.y = .26 + Math.abs(Math.sin(t * 2 + i)) * .1; }); };
  },
  f2(scene) {
    const steps = [];
    for (let i = 0; i < 4; i++) {
      const hh = .42 * (i + 1);
      const s = shadowed(new THREE.Mesh(new RoundedBoxGeometry(.7, hh, .9, 4, .05), mat(i % 2 ? C.lav : C.cream))); s.position.set(-1.05 + i * .7, hh / 2, 0); scene.add(s); steps.push(hh);
    }
    const ball = shadowed(new THREE.Mesh(new THREE.SphereGeometry(.2, 40, 20), mat(C.pink, { roughness: .4 })));
    scene.add(ball);
    /* Símbolo de iteración: arco con punta de flecha que gira despacio. */
    const loop = new THREE.Group(); loop.position.set(-.55, 2.75, .1); scene.add(loop);
    const arcLen = Math.PI * 1.55;
    loop.add(shadowed(new THREE.Mesh(new THREE.TorusGeometry(.42, .055, 12, 64, arcLen), mat(C.blush, { roughness: .45 }))));
    const tip = shadowed(new THREE.Mesh(new THREE.ConeGeometry(.12, .24, 24), mat(C.blush, { roughness: .45 })));
    tip.position.set(Math.cos(arcLen) * .42, Math.sin(arcLen) * .42, 0); tip.rotation.z = arcLen; loop.add(tip);
    return t => {
      const cyc = (t * .55) % 4, i = Math.floor(cyc), f = cyc - i;
      const x0 = -1.05 + i * .7, x1 = -1.05 + Math.min(i + 1, 3) * .7;
      const y0 = steps[i] + .2, y1 = steps[Math.min(i + 1, 3)] + .2;
      if (i < 3) { ball.position.set(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f + Math.sin(f * Math.PI) * .45, 0); }
      else { ball.position.set(x0, y0 + Math.sin(f * Math.PI) * .2, 0); }
      loop.rotation.z = t * .6;
    };
  },
  f3(scene) {
    const g = new THREE.Group(); g.position.set(-.8, 0, 0); scene.add(g);
    const cols = [C.cream, C.rose, C.cream];
    const slabs = cols.map((col, i) => { const s = shadowed(new THREE.Mesh(new RoundedBoxGeometry(1.2 - i * .22, .36, .9 - i * .12, 5, .08), mat(col))); s.position.y = .2 + i * .42; g.add(s); return s; });
    const sh = new THREE.Shape(); sh.moveTo(0, 1.1); sh.bezierCurveTo(.35, .95, .62, .92, .72, .92); sh.lineTo(.72, .35); sh.bezierCurveTo(.72, -.2, .3, -.5, 0, -.65); sh.bezierCurveTo(-.3, -.5, -.72, -.2, -.72, .35); sh.lineTo(-.72, .92); sh.bezierCurveTo(-.62, .92, -.35, .95, 0, 1.1);
    const shield = shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .18, bevelEnabled: true, bevelSize: .04, bevelThickness: .04, bevelSegments: 4, curveSegments: 32 }), mat(C.lav)));
    shield.position.set(1.05, 1.55, -.1); scene.add(shield);
    const key = shadowed(new THREE.Mesh(new THREE.SphereGeometry(.13, 32, 16), mat(C.pink))); key.position.set(1.05, 1.75, .18); scene.add(key);
    return t => { slabs[2].position.y = .2 + 2 * .42 + Math.sin(t * 1.4) * .06; shield.rotation.y = Math.sin(t * .8) * .3; key.position.x = 1.05 + Math.sin(t * .8) * .06; };
  },
  f4(scene) {
    const p1 = shadowed(new THREE.Mesh(new RoundedBoxGeometry(.42, 1.6, .5, 4, .06), mat(C.cream))); p1.position.set(-1.2, .8, 0);
    const p2 = p1.clone(); p2.position.x = 1.2; scene.add(p1, p2);
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-1.2, 1.62, 0), new THREE.Vector3(0, 3.3, 0), new THREE.Vector3(1.2, 1.62, 0));
    const arc = shadowed(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, .07, 12, false), mat(C.rose))); scene.add(arc);
    const deck = shadowed(new THREE.Mesh(new RoundedBoxGeometry(2.9, .1, .4, 3, .04), mat(C.cream))); deck.position.set(0, 1.62, 0); scene.add(deck);
    const ball = shadowed(new THREE.Mesh(new THREE.SphereGeometry(.17, 32, 16), mat(C.pink, { roughness: .4 }))); scene.add(ball);
    const sp = sparkle(scene, 1.35, 3.3, .2, .8, C.blush);
    return t => { const f = (Math.sin(t * .9) + 1) / 2; const p = curve.getPoint(f); ball.position.set(p.x, p.y + .2, p.z); sp.rotation.y = t; };
  }
};

/* Luces comunes: cielo suave, luz principal con sombra y un contraluz rosado. */
export function addLights(scene, ground = 0x2a1f63) {
  scene.add(new THREE.HemisphereLight(0xfff4ff, ground, 1.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.5); key.position.set(3.5, 7.5, 5.5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -4, near: .5, far: 30 }); key.shadow.bias = -.0006; key.shadow.normalBias = .02;
  scene.add(key);
  const rim = new THREE.PointLight(0xff9fd0, 22, 22); rim.position.set(-4, 3.5, 2.5); scene.add(rim);
}
function newRenderer(opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power", ...opts });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}
const PASTEL = k => /^arq/.test(k);
function roomScene(kind, data) {
  const scene = new THREE.Scene();
  addLights(scene, PASTEL(kind) ? 0x8b78c9 : 0x2a1f63);
  const [wallC, floorC] = TONES[kind] || TONES.hero;
  room(scene, wallC, floorC);
  const update = (BUILDERS[kind] || BUILDERS.hero)(scene, data);
  return { scene, update };
}

/* Escenario genérico: renderer, cámara, tamaño, bucle, pausa fuera de pantalla y limpieza.
   setup(scene, camera) devuelve update(t, camera, api); api.project(v3) da la posición en píxeles. */
export function mountStage(container, { setup, scene: given, camera: cam = {}, pointer: usePointer = true, fallback = "" }) {
  if (!webglOK()) { container.insertAdjacentHTML("beforeend", fallback); return () => {}; }
  const renderer = newRenderer();
  const canvas = renderer.domElement; canvas.className = "scene-canvas"; canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);
  const scene = given || new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(cam.fov || 30, 1, .1, 100);
  const base = cam.base || new THREE.Vector3(0, 2.25, 10.2), look = cam.look || new THREE.Vector3(0, 1.85, 0);
  camera.position.copy(base); camera.lookAt(look);
  let w = 0, h = 0;
  const api = { project: v => { const p = v.clone().project(camera); return { x: (p.x + 1) / 2 * w, y: (1 - (p.y + 1) / 2) * h }; }, get w() { return w; }, get h() { return h; } };
  const update = setup(scene, camera, api);
  const size = () => {
    const r = container.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = cam.fit ? cam.fit(w / h) : (w / h < .8 ? 34 : (cam.fov || 30)); camera.updateProjectionMatrix();
  };
  size();
  const t0 = performance.now();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let raf = 0, visible = true, alive = true;
  const frame = () => {
    if (!alive) return;
    const t = motionOK() ? (performance.now() - t0) / 1000 + 1.2 : 1.2;
    pointer.x += (pointer.tx - pointer.x) * .06; pointer.y += (pointer.ty - pointer.y) * .06;
    camera.position.set(base.x + pointer.x * (cam.sway ?? .6), base.y + pointer.y * (cam.swayY ?? .35), base.z); camera.lookAt(look);
    update(t, camera, api);
    renderer.render(scene, camera);
  };
  const loop = () => { frame(); if (alive && visible && motionOK()) raf = requestAnimationFrame(loop); };
  const start = () => { cancelAnimationFrame(raf); if (motionOK()) { raf = requestAnimationFrame(loop); } else { frame(); } };
  const onMove = e => { const r = container.getBoundingClientRect(); pointer.tx = ((e.clientX - r.left) / r.width - .5) * 2; pointer.ty = -((e.clientY - r.top) / r.height - .5) * 2; };
  const onLeave = () => { pointer.tx = 0; pointer.ty = 0; };
  if (motionOK() && usePointer) { container.addEventListener("pointermove", onMove); container.addEventListener("pointerleave", onLeave); }
  const ro = new ResizeObserver(() => { size(); if (!motionOK()) frame(); });
  ro.observe(container);
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); else cancelAnimationFrame(raf); });
  io.observe(container);
  const onVis = () => { if (document.hidden) cancelAnimationFrame(raf); else if (visible) start(); };
  document.addEventListener("visibilitychange", onVis);
  start();
  container.dataset.mounted = "1";
  const dispose = function dispose() {
    alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
    container.removeEventListener("pointermove", onMove); container.removeEventListener("pointerleave", onLeave);
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
    renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); canvas.remove();
  };
  /* Para escenas guiadas desde fuera (p. ej. por el desplazamiento): pinta un cuadro aunque no haya bucle. */
  dispose.frame = frame;
  return dispose;
}

/* Monta una escena de sala (arco, pedestal y figura) en un contenedor y devuelve la función para desmontarla. */
export function mountScene(container, kind, data = {}) {
  const built = webglOK() ? roomScene(kind, data) : null;
  return mountStage(container, { scene: built?.scene, setup: () => built.update, fallback: scene2D(kind === "hero" || kind === "result" || PASTEL(kind) ? "cierre" : kind) });
}

/* Imagen fija de una escena (para tarjetas): un solo renderer compartido, sin bucle. Devuelve un data URL o "". */
let stillRenderer = null;
const stills = new Map();
export function renderStill(kind, w = 520, h = 400) {
  const id = kind + w + "x" + h;
  if (stills.has(id)) return stills.get(id);
  if (!webglOK()) return "";
  try {
    stillRenderer = stillRenderer || newRenderer({ preserveDrawingBuffer: true });
    /* Nitidez: se dibuja al menos al doble de resolución (y hasta 3x en pantallas retina) y con sombras más finas. */
    const pr = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
    stillRenderer.setPixelRatio(pr); stillRenderer.setSize(w, h, false);
    const { scene, update } = roomScene(kind, {});
    scene.traverse(o => { if (o.isDirectionalLight && o.castShadow) { o.shadow.mapSize.set(2048, 2048); o.shadow.radius = 3; } });
    const camera = new THREE.PerspectiveCamera(30, w / h, .1, 100);
    camera.position.set(0, 2.3, 9.4); camera.lookAt(0, 1.75, 0);
    update(2.4, camera);
    stillRenderer.render(scene, camera);
    let url = stillRenderer.domElement.toDataURL("image/webp", .95);
    if (!url.startsWith("data:image/webp")) url = stillRenderer.domElement.toDataURL("image/png");
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
    stills.set(id, url);
    return url;
  } catch (e) { return ""; }
}

/* ---------- Insignias en 3D (medallas del Figma «Entregable ADN Govtech · Insignias») ----------
   Se dibujan sobre fondo transparente para ir encima del panel índigo de cada tarjeta. */
const shapeFrom = pts => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return s; };
const polygon = (n, r, rot = 0) => shapeFrom(Array.from({ length: n }, (_, i) => { const a = rot + i * 2 * Math.PI / n; return [Math.cos(a) * r, Math.sin(a) * r]; }));
const scallop = (n, r, amp) => shapeFrom(Array.from({ length: 240 }, (_, i) => { const a = i / 240 * 2 * Math.PI, rr = r + amp * Math.cos(n * a); return [Math.cos(a) * rr, Math.sin(a) * rr]; }));
function circleShape(r) { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); return s; }
function shieldShape(w, h) { const s = new THREE.Shape(); s.moveTo(0, h * .55); s.bezierCurveTo(w * .35, h * .45, w * .55, h * .48, w * .62, h * .48); s.lineTo(w * .62, -h * .02); s.bezierCurveTo(w * .62, -h * .3, w * .3, -h * .48, 0, -h * .6); s.bezierCurveTo(-w * .3, -h * .48, -w * .62, -h * .3, -w * .62, -h * .02); s.lineTo(-w * .62, h * .48); s.bezierCurveTo(-w * .55, h * .48, -w * .35, h * .45, 0, h * .55); return s; }
function slab(shape, depth, color, o = {}, bevel = .07) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 5, curveSegments: 64 });
  g.translate(0, 0, -depth / 2);
  return shadowed(new THREE.Mesh(g, mat(color, { roughness: .32, metalness: .08, ...o })));
}
function medal(g, shape, inner, base, rim) {
  const back = slab(shape, .34, rim, { roughness: .28, metalness: .25 }); g.add(back);
  const face = slab(inner, .1, base, {}, .04); face.position.z = .24; g.add(face);
  return .24 + .09;
}
const tube = (pts, r, color, o) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 40, r, 12, false), mat(color, o));
const BADGES = {
  /* 01 · Brújula pública: medalla circular rosa con rosa de los vientos. */
  b01(g) {
    const z = medal(g, circleShape(1.25), circleShape(1.02), 0xe85a9e, 0xf7b3d2);
    for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; const d = new THREE.Mesh(new THREE.SphereGeometry(.025, 8, 6), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: .3 })); d.position.set(Math.cos(a) * .92, Math.sin(a) * .92, z); g.add(d); }
    const star = (len, w, color, rot) => { const s = shapeFrom([[0, len], [w, w], [len, 0], [w, -w], [0, -len], [-w, -w], [-len, 0], [-w, w]]); const m = slab(s, .06, color, {}, .03); m.rotation.z = rot; m.position.z = z + .06; return m; };
    g.add(star(.78, .13, 0xffffff, 0), star(.5, .09, 0xffd3e6, Math.PI / 4));
    const c = new THREE.Mesh(new THREE.SphereGeometry(.1, 24, 12), mat(0xc2185b)); c.position.z = z + .16; g.add(c);
  },
  /* 02 · Explorador de hipótesis: hexágono violeta con una lupa y un signo de pregunta. */
  b02(g) {
    const z = medal(g, polygon(6, 1.32, Math.PI / 2), polygon(6, 1.08, Math.PI / 2), 0x6c47d9, 0xb79cf6);
    const lens = new THREE.Group(); lens.position.set(-.08, .1, z + .08); lens.rotation.z = .15; g.add(lens);
    lens.add(shadowed(new THREE.Mesh(new THREE.TorusGeometry(.42, .07, 20, 64), mat(0xffffff, { roughness: .3 }))));
    lens.add(new THREE.Mesh(new THREE.CircleGeometry(.38, 48), mat(0xe9defd, { roughness: .2 })));
    const h = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(.07, .08, .5, 20), mat(0xffffff))); h.position.set(.42, -.42, 0); h.rotation.z = Math.PI / 4; lens.add(h);
    lens.add(tube([[-.13, .14, .05], [-.05, .23, .05], [.1, .2, .05], [.12, .06, .05], [0, -.02, .05], [0, -.1, .05]], .045, 0x6c47d9));
    const dot = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 8), mat(0x6c47d9)); dot.position.set(0, -.22, .05); lens.add(dot);
    const sp = new THREE.Mesh(new THREE.OctahedronGeometry(.08, 0), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: .5 })); sp.scale.set(.6, 1.6, .6); sp.position.set(.6, .62, z + .1); g.add(sp);
  },
  /* 03 · Articulador de alianzas: escudo lila con tres círculos que se cruzan. */
  b03(g) {
    const z = medal(g, shieldShape(2.2, 2.4), shieldShape(1.8, 2.0), 0x9d7cf0, 0xd9c9ff);
    [[-.2, .12, 0xffffff], [.2, .12, 0xf4a3cb], [0, -.2, 0xc9b4ff]].forEach(([x, y, c], i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(.3, .055, 16, 56), mat(c, { roughness: .3 })); r.position.set(x, y, z + .06 + i * .02); g.add(r); });
  },
  /* 04 · Navegante institucional: octágono coral con un edificio público y un camino punteado. */
  b04(g) {
    const z = medal(g, polygon(8, 1.3, Math.PI / 8), polygon(8, 1.08, Math.PI / 8), 0xf07a7f, 0xffc2c0);
    const b = new THREE.Group(); b.position.set(0, .08, z + .02); g.add(b);
    const box = (w, h, d, x, y) => { const m = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, .02), mat(0xffffff))); m.position.set(x, y, d / 2); b.add(m); };
    box(1.0, .1, .14, 0, -.42); box(.9, .08, .14, 0, -.33);
    for (let i = 0; i < 4; i++) { const c = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .5, 16), mat(0xffffff))); c.position.set(-.3 + i * .2, -.04, .07); b.add(c); }
    box(.9, .08, .14, 0, .25);
    const tri = slab(shapeFrom([[-.5, 0], [.5, 0], [0, .3]]), .1, 0xffffff, {}, .02); tri.position.set(0, .3, .07); b.add(tri);
    for (let i = 0; i <= 10; i++) { const t = i / 10; const d = new THREE.Mesh(new THREE.SphereGeometry(i === 10 ? .06 : .028, 12, 8), mat(0xffffff)); d.position.set(-.55 + t * 1.1, -.62 + Math.sin(t * Math.PI) * .12, z + .08); g.add(d); }
  },
  /* 05 · Estratega de tecnología responsable: sello ondulado con un chip y un escudo con visto bueno. */
  b05(g) {
    const z = medal(g, scallop(16, 1.22, .07), circleShape(.98), 0xa94fc4, 0xe6b5f2);
    const chip = shadowed(new THREE.Mesh(new RoundedBoxGeometry(.9, .9, .14, 4, .1), mat(0xffffff))); chip.position.z = z + .07; g.add(chip);
    for (let s = 0; s < 4; s++) for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new RoundedBoxGeometry(.06, .18, .06, 2, .02), mat(0xffffff)); const o = -.22 + i * .22; const a = s * Math.PI / 2; p.position.set(Math.cos(a) * .54 - Math.sin(a) * o, Math.sin(a) * .54 + Math.cos(a) * o, z + .05); p.rotation.z = a + Math.PI / 2; g.add(p); }
    const sh = slab(shieldShape(.62, .72), .08, 0xd63384, {}, .02); sh.position.set(0, .02, z + .16); g.add(sh);
    const ck = tube([[-.13, .02, 0], [-.03, -.08, 0], [.15, .12, 0]], .035, 0xffffff); ck.position.set(0, .02, z + .24); g.add(ck);
  }
};
export function renderBadge(kind, w = 420, h = 260) {
  const id = "badge" + kind + w + "x" + h;
  if (stills.has(id)) return stills.get(id);
  if (!webglOK()) return "";
  try {
    stillRenderer = stillRenderer || newRenderer({ preserveDrawingBuffer: true });
    const pr = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
    stillRenderer.setPixelRatio(pr); stillRenderer.setSize(w, h, false); stillRenderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x4a2bb0, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-3, 4, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0005; scene.add(key);
    const rim = new THREE.PointLight(0xff9fd0, 18, 20); rim.position.set(3, -1, 3); scene.add(rim);
    const g = new THREE.Group(); scene.add(g);
    BADGES[kind](g);
    g.rotation.set(-.08, .32, 0);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x0d0530, transparent: true, opacity: .35 }));
    shadow.scale.set(1.05, .16, 1); shadow.position.set(0, -1.62, -.4); scene.add(shadow);
    const camera = new THREE.PerspectiveCamera(26, w / h, .1, 100); camera.position.set(0, .05, 7.3); camera.lookAt(0, -.2, 0);
    stillRenderer.render(scene, camera);
    let url = stillRenderer.domElement.toDataURL("image/webp", .95);
    if (!url.startsWith("data:image/webp")) url = stillRenderer.domElement.toDataURL("image/png");
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
    stills.set(id, url);
    return url;
  } catch (e) { return ""; }
}

/* ---------- Ilustraciones de las intros de fase (Figma «Servicio 1»), llevadas a 3D ----------
   Flotan sobre el panel de vidrio de la tarjeta de fase: fondo transparente, sombra suave y movimiento lento. */
function softShadow(scene, y = 0, opacity = .22) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity }));
  f.rotation.x = -Math.PI / 2; f.position.y = y; f.receiveShadow = true; scene.add(f);
}
const glossy = (c, o = {}) => mat(c, { roughness: .28, metalness: .05, ...o });
const PHASES = {
  /* Perfil · Conozcámonos: tarjeta con una persona y burbujas de conversación. */
  phPerfil: {
    cam: { base: new THREE.Vector3(0, .9, 9.4), look: new THREE.Vector3(0, .9, 0) },
    build(scene) {
      const card = new THREE.Group(); card.position.y = .95; scene.add(card);
      card.add(shadowed(new THREE.Mesh(new RoundedBoxGeometry(2.3, 2.6, .22, 6, .28), glossy(0x3b22b0))));
      const disc = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, .14, 72).rotateX(Math.PI / 2), glossy(0xf08cc4))); disc.position.set(0, .22, .2); card.add(disc);
      const head = shadowed(new THREE.Mesh(new THREE.SphereGeometry(.4, 48, 24), glossy(0xfdf0f7))); head.position.set(0, .42, .55); card.add(head);
      const bust = shadowed(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.92, 0], [.88, .3], [.66, .58], [.3, .72], [0, .74]].map(([x, y]) => new THREE.Vector2(x, y)), 64), glossy(0xf1e6ff)));
      bust.scale.set(1, 1, .45); bust.position.set(0, -1.18, .5); card.add(bust);
      const pill = (w, c, dot, bar, x, y) => { const g = new THREE.Group(); g.position.set(x, y, .7); const b = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, .38, .18, 6, .18), glossy(c))); g.add(b); const d = new THREE.Mesh(new THREE.SphereGeometry(.08, 20, 10), glossy(dot)); d.position.set(-w / 2 + .24, 0, .1); g.add(d); const r = new THREE.Mesh(new RoundedBoxGeometry(w * .55, .1, .04, 2, .05), glossy(bar)); r.position.set(.08, 0, .1); g.add(r); card.add(g); return g; };
      const pills = [pill(1.25, 0xfff6fb, 0xe8338a, 0xb9a6f0, -1.15, .95), pill(1.25, 0xf06aa8, 0xffffff, 0xffffff, 1.2, .1), pill(1.3, 0x6b4fd6, 0xffffff, 0xe6dcff, -1.0, -.9)];
      const sp = [sparkle(scene, 1.55, 2.3, .4, .9), sparkle(scene, -1.3, .5, .6, .6, C.blush), sparkle(scene, 1.5, -.4, .4, .7)];
      return t => { card.rotation.y = Math.sin(t * .5) * .18; card.position.y = .95 + Math.sin(t * .9) * .05; pills.forEach((p, i) => { p.position.z = .7 + Math.sin(t * 1.3 + i * 2) * .08; p.rotation.z = Math.sin(t * 1.1 + i) * .03; }); sp.forEach((s, i) => { s.rotation.y = t + i; s.scale.setScalar(.7 + .3 * Math.sin(t * 2 + i * 2)); }); };
    }
  },
  /* SER · Lo que nos mueve: brújula con marcas, órbita y dos puntos que la recorren. */
  phSer: {
    cam: { base: new THREE.Vector3(0, .4, 9.2), look: new THREE.Vector3(0, .9, 0) },
    build(scene) {
      const g = new THREE.Group(); g.position.y = .95; scene.add(g);
      g.add(shadowed(new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, .26, 96).rotateX(Math.PI / 2), glossy(0x3424a8))));
      const face = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, .04, 96).rotateX(Math.PI / 2), glossy(0x2b1d92)); face.position.z = .14; g.add(face);
      for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, long = i % 5 === 0; const m = new THREE.Mesh(new RoundedBoxGeometry(.03, long ? .2 : .11, .03, 1, .01), glossy(0xffd6ea, { emissive: 0xffc6e1, emissiveIntensity: .25 })); m.position.set(Math.cos(a) * 1.48, Math.sin(a) * 1.48, 0); m.rotation.z = a - Math.PI / 2; g.add(m); }
      for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; const d = new THREE.Mesh(new THREE.SphereGeometry(.018, 8, 6), glossy(0xf4a8d0)); d.position.set(Math.cos(a) * .92, Math.sin(a) * .92, .17); g.add(d); }
      const star = (len, w, color) => { const s = shapeFrom([[0, len], [w, w], [len, 0], [w, -w], [0, -len], [-w, -w], [-len, 0], [-w, w]]); const m = slab(s, .07, color, {}, .02); m.position.z = .22; return m; };
      const needle = new THREE.Group(); g.add(needle);
      const d2 = star(.72, .12, 0xb9a0ff); d2.rotation.z = Math.PI / 4; needle.add(d2, star(1.12, .15, 0xfff6fb));
      const north = slab(shapeFrom([[0, 1.12], [.15, .15], [-.15, .15]]), .08, 0xe8338a, {}, .015); north.position.z = .27; needle.add(north);
      const hub = new THREE.Mesh(new THREE.SphereGeometry(.13, 24, 12), glossy(0x1a1060)); hub.position.z = .3; needle.add(hub);
      const hubRing = new THREE.Mesh(new THREE.TorusGeometry(.15, .03, 10, 40), glossy(0xffffff)); hubRing.position.z = .3; needle.add(hubRing);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(.07, .14, 3), glossy(0xe8338a)); tip.position.set(0, 1.68, 0); g.add(tip);
      const orbit = new THREE.Group(); orbit.rotation.set(1.18, .32, .35); g.add(orbit);
      orbit.add(new THREE.Mesh(new THREE.TorusGeometry(1.78, .016, 8, 160), glossy(0xffffff, { emissive: 0xffffff, emissiveIntensity: .3 })));
      const p1 = shadowed(new THREE.Mesh(new THREE.SphereGeometry(.11, 24, 12), glossy(0xf472b6))), p2 = shadowed(new THREE.Mesh(new THREE.SphereGeometry(.08, 24, 12), glossy(0xffffff)));
      orbit.add(p1, p2);
      const sp = [sparkle(scene, -1.5, 2.5, .3, .8), sparkle(scene, 1.6, -.3, .4, .6, C.blush)];
      return t => { needle.rotation.z = Math.sin(t * .8) * .12; g.rotation.y = Math.sin(t * .45) * .22; g.rotation.x = Math.sin(t * .35) * .06; const a = t * .55; p1.position.set(Math.cos(a) * 1.78, Math.sin(a) * 1.78, 0); p2.position.set(Math.cos(a + Math.PI) * 1.78, Math.sin(a + Math.PI) * 1.78, 0); sp.forEach((s, i) => { s.rotation.y = t + i; }); };
    }
  },
  /* HACER · Cómo lo hacemos: escalera de cubos que termina en un cubo rosa y un cubo punteado por construir. */
  phHacer: {
    cam: { base: new THREE.Vector3(4.2, 4.0, 7.4), look: new THREE.Vector3(.1, 1.05, 0), fov: 30 },
    build(scene) {
      softShadow(scene, 0, .2);
      const S = .62, cubes = [], g = new THREE.Group(); g.rotation.y = -.25; scene.add(g);
      const cube = (x, y, z, side, top) => { const m = shadowed(new THREE.Mesh(new RoundedBoxGeometry(S, S, S, 3, .03), glossy(side))); m.position.set(x * S, y * S + S / 2, z * S); g.add(m); const tp = shadowed(new THREE.Mesh(new RoundedBoxGeometry(S * .98, .05, S * .98, 2, .02), glossy(top))); tp.position.set(x * S, y * S + S + .01, z * S); g.add(tp); cubes.push(m); return [m, tp]; };
      [[0, 3], [1, 2], [2, 1]].forEach(([i, h]) => { for (let y = 0; y < h; y++) cube(i - 1.5, y, 0, y === h - 1 ? 0xb9a0f0 : 0xa98ad6, y === h - 1 ? 0xfff4e6 : 0xa98ad6); });
      const [pink, pinkTop] = cube(1.5, 0, 0, 0xe0337f, 0xff9ccf);
      const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(S, S, S)), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: .06, gapSize: .05 }));
      wire.computeLineDistances(); wire.position.set(1.05, 1.85, -.1); scene.add(wire);
      const target = new THREE.Mesh(new THREE.TorusGeometry(.17, .025, 10, 40), glossy(0xffffff)); target.position.set(1.3, 2.35, .15); scene.add(target);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(.07, 20, 10), glossy(0xf472b6, { emissive: 0xf472b6, emissiveIntensity: .4 })); dot.position.copy(target.position); scene.add(dot);
      const arcPts = Array.from({ length: 40 }, (_, i) => { const a = Math.PI * (.15 + i / 39 * .7); return new THREE.Vector3(-.75 + Math.cos(a) * .55, 2.25 + Math.sin(a) * .35, 0); });
      const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: .05, gapSize: .05 })); arc.computeLineDistances(); scene.add(arc);
      const sp = [sparkle(scene, -1.6, 1.0, .6, .8), sparkle(scene, 2.2, 1.2, .4, .6, C.blush)];
      return t => { const hop = Math.abs(Math.sin(t * 1.6)) * .14; pink.position.y = S / 2 + hop; pinkTop.position.y = S + .01 + hop; wire.rotation.y = t * .4; wire.position.y = 1.85 + Math.sin(t) * .06; target.scale.setScalar(1 + Math.sin(t * 2.4) * .12); g.rotation.y = -.25 + Math.sin(t * .4) * .08; sp.forEach((s, i) => { s.rotation.y = t + i; }); };
    }
  },
  /* TENER · Con qué contamos: plataforma con tres cilindros, monedas, un planeta con anillo y un cubo rosa. */
  phTener: {
    cam: { base: new THREE.Vector3(0, 3.2, 10.2), look: new THREE.Vector3(0, 1.4, 0) },
    build(scene) {
      softShadow(scene, 0, .2);
      const base = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(1.95, 2.0, .22, 96), glossy(0x7d5ce0))); base.position.y = .11; scene.add(base);
      const top = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, .04, 96), glossy(0xd9ccff))); top.position.y = .24; scene.add(top);
      const col = (x, r, h, c) => { const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 64), glossy(c))); m.position.set(x, .26 + h / 2, 0); scene.add(m); const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * .98, r * .98, .02, 64), glossy(0xffffff, { roughness: .2 })); cap.position.set(x, .27 + h, 0); scene.add(cap); return .26 + h; };
      const hl = col(-1.0, .4, 1.25, 0xb9a6f0), hm = col(0, .44, 2.05, 0xec5a9c); col(1.0, .4, .85, 0xf6f1ff);
      const coins = [0xffb547, 0xffc864, 0xffda7a].map((c, i) => { const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .1, 48), glossy(c, { metalness: .3 }))); m.position.set(-1.0, hl + .06 + i * .11, 0); scene.add(m); return m; });
      const planet = new THREE.Group(); planet.position.set(0, hm + .5, 0); scene.add(planet);
      planet.add(shadowed(new THREE.Mesh(new THREE.SphereGeometry(.38, 48, 24), glossy(0xe94793))));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.62, .025, 10, 96), glossy(0xffffff, { emissive: 0xffffff, emissiveIntensity: .25 })); ring.rotation.set(1.25, .25, 0); planet.add(ring);
      const cube = shadowed(new THREE.Mesh(new RoundedBoxGeometry(.3, .3, .3, 4, .06), glossy(0xf472b6))); cube.position.set(.95, 1.95, .3); scene.add(cube);
      const sp = [sparkle(scene, -1.6, 2.6, .3, .8), sparkle(scene, 1.7, 2.9, .3, .6), sparkle(scene, 1.8, 1.4, .5, .5, C.blush)];
      return t => { planet.position.y = hm + .5 + Math.sin(t * 1.2) * .07; planet.rotation.y = t * .5; ring.rotation.z = t * .3; cube.rotation.set(t * .7, t * .5, 0); cube.position.y = 1.95 + Math.sin(t * 1.5 + 1) * .1; coins[2].rotation.y = t; sp.forEach((s, i) => { s.rotation.y = t + i; }); };
    }
  }
};
export function mountFloating(container, kind) {
  const def = PHASES[kind];
  const fb = { phPerfil: "perfil", phSer: "f1", phHacer: "f2", phTener: "f3" }[kind] || "cierre";
  return mountStage(container, {
    fallback: scene2D(fb),
    camera: { fov: def.cam.fov || 28, base: def.cam.base, look: def.cam.look, sway: .7, swayY: .4, fit: a => a < .9 ? Math.min(44, 28 * .9 / a) : (def.cam.fov || 28) },
    setup(scene) {
      scene.add(new THREE.HemisphereLight(0xfff4ff, 0x5b3fc4, 1.5));
      const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-3, 7, 6); key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 6, bottom: -3, near: .5, far: 30 }); key.shadow.bias = -.0005; key.shadow.normalBias = .02; key.shadow.radius = 4;
      scene.add(key);
      const rim = new THREE.PointLight(0xff9fd0, 22, 22); rim.position.set(4, 2.5, 3); scene.add(rim);
      return def.build(scene);
    }
  });
}

/* ---------- Portada (Figma «Descubre tu ADN GovTech»): doble hélice vertical dentro del arco, en 3D ----------
   Hebra rosa y hebra lila con cuentas, peldaños blancos y giro lento; fondo transparente sobre el arco en CSS. */
export function mountHelix(container) {
  const H = 10, R = 1.05, TURNS = 2.6;
  return mountStage(container, {
    fallback: scene2D("cierre"),
    camera: { fov: 30, base: new THREE.Vector3(0, 0, 17.5), look: new THREE.Vector3(0, 0, 0), sway: 1.4, swayY: .8, fit: a => Math.max(30, 2 * Math.atan(H * .52 / 17.5) * 180 / Math.PI) },
    setup(scene) {
      scene.add(new THREE.HemisphereLight(0xffffff, 0xc9b6ff, 1.35));
      const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-4, 6, 9); scene.add(key);
      const rim = new THREE.PointLight(0xff9fd0, 18, 30); rim.position.set(5, -2, 4); scene.add(rim);
      const helix = new THREE.Group(); helix.rotation.z = -.08; scene.add(helix);
      const at = (k, phase) => { const y = -H / 2 + k * H, a = k * TURNS * Math.PI * 2 + phase; return new THREE.Vector3(Math.cos(a) * R, y, Math.sin(a) * R); };
      const strand = (phase, color, rad) => {
        const pts = Array.from({ length: 241 }, (_, i) => at(i / 240, phase));
        helix.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 480, rad, 12, false), glossy(color, { roughness: .3 })));
      };
      strand(0, 0xf0479a, .085); strand(Math.PI, 0xb3a0f5, .085);
      const N = 34, beads = [];
      for (let i = 0; i <= N; i++) {
        const k = i / N, A = at(k, 0), B = at(k, Math.PI);
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, A.distanceTo(B), 10), glossy(0xfff6fb, { roughness: .4 }));
        rung.position.copy(A).add(B).multiplyScalar(.5); rung.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); helix.add(rung);
        if (i % 2 === 0) [[A, 0xff5aa8], [B, 0x9f86f2]].forEach(([p, c]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(.16, 24, 12), glossy(c)); b.position.copy(p); helix.add(b); beads.push(b); });
      }
      const sp = [sparkle(scene, -2.2, 3.2, .5, 1.1), sparkle(scene, 2.1, -1.4, .5, .9), sparkle(scene, -1.9, -3.4, .5, .8, C.blush)];
      return t => { helix.rotation.y = t * .35; beads.forEach((b, i) => b.scale.setScalar(1 + .12 * Math.sin(t * 2 + i * .5))); sp.forEach((s, i) => { s.rotation.y = t + i; s.scale.setScalar(.75 + .25 * Math.sin(t * 1.8 + i * 2)); }); };
    }
  });
}

/* ---------- Summit · «Desliza para ver tu ADN»: la hélice se arma a medida que la persona desliza ----------
   nodes: [{id, letter, color|null}] en orden; marks: posición de cada respuesta en la hélice (0 arriba … 1 abajo).
   Devuelve dispose con .set(p): p = avance de la construcción (0..1) y .final(f): f = apertura final (0..1).
   El dibujo de las hebras crece de arriba abajo (setDrawRange), cada respuesta aparece cuando la hebra la alcanza
   y la cámara acompaña el frente; al final se aleja para ver la hélice completa girando. */
export function mountRevealHelix(container, { nodes, marks }) {
  const H = 11, R = 1.2, TURNS = 2.3, SEG = 480, RAD = 12;
  const st = { p: 0, f: 0, sp: 0, sf: 0 };
  const clamp = x => Math.min(1, Math.max(0, x));
  const back = x => { const c = 1.9; x = clamp(x) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };
  const dispose = mountStage(container, {
    fallback: "",
    pointer: false,
    camera: { fov: 30, base: new THREE.Vector3(0, 0, 20), look: new THREE.Vector3(0, 0, 0), fit: () => 33 },
    setup(scene, camera, api) {
      scene.add(new THREE.HemisphereLight(0xffffff, 0x8a6fe0, 1.25));
      const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-4, 6, 9); scene.add(key);
      const rim = new THREE.PointLight(0xff9fd0, 30, 40); rim.position.set(5, 0, 5); scene.add(rim);
      const helix = new THREE.Group(); scene.add(helix);
      const at = (k, ph) => { const y = H / 2 - k * H, a = k * TURNS * Math.PI * 2 + ph; return new THREE.Vector3(Math.cos(a) * R, y, Math.sin(a) * R); };
      const curve = ph => new THREE.CatmullRomCurve3(Array.from({ length: 241 }, (_, i) => at(i / 240, ph)));
      /* Hebra fantasma completa (lo que falta por cargar) y hebra viva que crece. */
      const strands = [[0, 0xf0479a], [Math.PI, 0xb3a0f5]].map(([ph, c]) => {
        const ghost = new THREE.Mesh(new THREE.TubeGeometry(curve(ph), SEG, .05, 8, false), mat(0xffffff, { transparent: true, opacity: .12, depthWrite: false }));
        const live = new THREE.Mesh(new THREE.TubeGeometry(curve(ph), SEG, .095, RAD, false), glossy(c, { roughness: .3 }));
        helix.add(ghost, live); return live.geometry;
      });
      /* Peldaños decorativos que aparecen con la hebra. */
      const deco = [];
      for (let i = 0; i <= 40; i++) {
        const k = i / 40; if (marks.some(m => Math.abs(m - k) < .018)) continue;
        const A = at(k, 0), B = at(k, Math.PI);
        const r = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, A.distanceTo(B), 8), glossy(0xfff6fb, { roughness: .4 }));
        r.position.copy(A).add(B).multiplyScalar(.5); r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
        r.visible = false; helix.add(r); deco.push({ r, k });
      }
      /* Las respuestas: peldaño y esfera en el color del arquetipo; las «aún no contempladas», translúcidas. */
      const items = nodes.map((n, i) => {
        const k = marks[i], A = at(k, 0), B = at(k, Math.PI);
        const g = new THREE.Group(); g.position.set(0, A.y, 0); helix.add(g);
        const m = n.color ? glossy(n.color, { emissive: n.color, emissiveIntensity: .25 }) : mat(0xffffff, { transparent: true, opacity: .45 });
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, A.distanceTo(B), 12), m);
        rung.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); g.add(rung);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(.3, 40, 20), m); g.add(ball);
        g.scale.setScalar(.001);
        return { g, ball, k, n };
      });
      const sp = [sparkle(scene, -2.4, 2.6, .8, 1), sparkle(scene, 2.3, -1.2, .8, .9), sparkle(scene, -2, -3.8, .8, .8, C.blush)];
      sp.forEach(s => s.scale.setScalar(.001));
      const layer = document.createElement("div"); layer.className = "rv3-labels"; layer.setAttribute("aria-hidden", "true"); container.appendChild(layer);
      const labels = items.map(it => { const el = document.createElement("span"); el.className = "rv3-l" + (it.n.color ? "" : " nc"); el.textContent = it.n.color ? it.n.letter : "–"; layer.appendChild(el); return el; });
      const v = new THREE.Vector3();
      return (t, cam) => {
        const smooth = motionOK() ? .14 : 1;
        st.sp += (st.p - st.sp) * smooth; st.sf += (st.f - st.sf) * smooth;
        const p = st.sp, f = st.sf, moving = motionOK();
        const n = Math.ceil(clamp(p) * SEG) * RAD * 6;
        strands.forEach(g => g.setDrawRange(0, n));
        deco.forEach(d => { d.r.visible = d.k <= p; });
        items.forEach((it, i) => {
          const a = clamp((p - it.k) / .035 + .02);
          const pulse = f > 0 && it.n.lead ? 1 + .14 * f * Math.sin(t * 3.2 + i) * (moving ? 1 : 0) : 1;
          it.g.scale.setScalar(Math.max(.001, back(a) * pulse));
        });
        /* Giro: lo mueve el dedo (avance) y, si hay movimiento, un poco el tiempo. */
        helix.rotation.y = p * Math.PI * 3 + (moving ? t * .12 : 0) + f * Math.PI * .5;
        helix.rotation.z = -.06;
        /* Cámara: sigue el frente de la hebra y al final se aleja para ver todo. */
        const front = H / 2 - clamp(p) * H, near = 11.5, far = 18.5;
        /* El frente queda en la mitad baja de la franja: arriba se ve lo ya armado. */
        const fy = Math.min(H / 2 - 1.6, front + 1.4);
        cam.position.set(Math.sin(p * Math.PI) * 1.4 * (1 - f), fy * (1 - f) + .5 * (1 - f), near + (far - near) * f);
        cam.lookAt(0, fy * (1 - f), 0);
        sp.forEach((s, i) => { s.scale.setScalar(Math.max(.001, f * (.8 + .2 * Math.sin(t * 1.8 + i * 2)))); s.rotation.y = t + i; });
        cam.updateMatrixWorld();
        items.forEach((it, i) => {
          it.ball.getWorldPosition(v); const q = api.project(v);
          const a = clamp((p - it.k) / .035);
          labels[i].style.transform = `translate(${q.x}px,${q.y}px) translate(-50%,-50%) scale(${(1 - f * .45).toFixed(3)})`;
          labels[i].style.opacity = a.toFixed(2);
        });
      };
    }
  });
  const wrapped = () => { dispose(); container.querySelector(".rv3-labels")?.remove(); };
  wrapped.set = (p, f = 0) => { if (st.p === p && st.f === f) return; st.p = p; st.f = f; if (!motionOK()) dispose.frame?.(); };
  return wrapped;
}

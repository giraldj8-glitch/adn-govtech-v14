/* Glifos planos de las ocho capacidades y fondos de arco.
   Formas geométricas propias (sin personajes ni recursos de Adobe). */
export const ARCH_BG = {
  "01": "linear-gradient(180deg,#a3286f,#ee3998)",
  "02": "linear-gradient(180deg,#46308f,#8f4dec)",
  "03": "linear-gradient(180deg,#8a2a6e,#f184b9)",
  "04": "linear-gradient(180deg,#231a63,#6440c4)",
  "05": "linear-gradient(180deg,#3b3fa3,#8f4dec)",
  "06": "linear-gradient(180deg,#4a1242,#a3286f)",
  "07": "linear-gradient(180deg,#46308f,#ee3998)",
  "08": "linear-gradient(180deg,#161a4f,#7a3bb0)"
};

const G = {
  "01": '<circle cx="60" cy="62" r="40" fill="none" stroke="#fff8ee" stroke-width="3"/><circle cx="60" cy="62" r="26" fill="#f184b9"/><circle cx="60" cy="62" r="10" fill="#fff8ee"/>',
  "02": '<path d="M18 100h24V80h22V60h22V40h18v60H18z" fill="#fff8ee" opacity=".92"/><circle cx="95" cy="28" r="11" fill="#ee3998"/>',
  "03": '<circle cx="46" cy="62" r="28" fill="#f184b9" opacity=".92"/><circle cx="74" cy="62" r="28" fill="#fff8ee" opacity=".72"/>',
  "04": '<rect x="28" y="72" width="64" height="24" rx="6" fill="#fff8ee"/><rect x="36" y="46" width="48" height="22" rx="6" fill="#f184b9"/><rect x="44" y="22" width="32" height="20" rx="6" fill="#fff8ee" opacity=".85"/>',
  "05": '<path d="M60 18c14 10 28 12 36 12v26c0 24-16 38-36 46C40 94 24 80 24 56V30c8 0 22-2 36-12z" fill="none" stroke="#fff8ee" stroke-width="3"/><circle cx="60" cy="54" r="9" fill="#ee3998"/><rect x="56" y="58" width="8" height="18" rx="3" fill="#ee3998"/>',
  "06": '<rect x="16" y="56" width="14" height="44" rx="3" fill="#fff8ee"/><rect x="90" y="56" width="14" height="44" rx="3" fill="#fff8ee"/><path d="M23 58Q60 14 97 58" fill="none" stroke="#f184b9" stroke-width="5" stroke-linecap="round"/><line x1="16" y1="62" x2="104" y2="62" stroke="#fff8ee" stroke-width="3"/>',
  "07": '<line x1="14" y1="88" x2="106" y2="88" stroke="#fff8ee" stroke-width="3" stroke-dasharray="6 6"/><path d="M26 40l18 18-18 18M52 40l18 18-18 18M78 40l18 18-18 18" fill="none" stroke="#f184b9" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>',
  "08": '<path d="M10 66C28 36 44 36 60 66S92 96 110 66" fill="none" stroke="#fff8ee" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="66" r="10" fill="#ee3998"/><path d="M92 26l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#ffc6e1"/>'
};

export function glyph(d) {
  return '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">' + G[d] + "</svg>";
}

export function arrow() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
}

/* Respaldo 2D para escenas 3D cuando no hay WebGL: una composición plana por momento. */
const SCENES2D = {
  perfil: '<rect x="40" y="270" width="220" height="24" rx="8" fill="#fff8ee" opacity=".2"/><circle cx="92" cy="238" r="32" fill="#ee3998"/><rect x="128" y="178" width="48" height="92" rx="10" fill="#fff8ee"/><path d="M186 270a36 36 0 0 1 72 0z" fill="#8f4dec"/><circle cx="236" cy="110" r="22" fill="none" stroke="#fff8ee" stroke-width="2" stroke-dasharray="5 6" opacity=".7"/>',
  f1: '<circle cx="150" cy="170" r="84" fill="none" stroke="#fff8ee" stroke-width="2" opacity=".5"/><circle cx="150" cy="170" r="58" fill="#f184b9" opacity=".85"/><circle cx="150" cy="170" r="30" fill="#fff8ee"/><circle cx="150" cy="170" r="10" fill="#ee3998"/><circle cx="96" cy="292" r="9" fill="#fff8ee"/><circle cx="150" cy="292" r="9" fill="#fff8ee"/><circle cx="204" cy="292" r="9" fill="#fff8ee"/>',
  f2: '<path d="M30 300h60v-44h60v-44h60v-44h60v132H30z" fill="#fff8ee" opacity=".9"/><circle cx="240" cy="146" r="18" fill="#ee3998"/>',
  f3: '<rect x="40" y="226" width="120" height="40" rx="10" fill="#fff8ee"/><rect x="52" y="180" width="96" height="38" rx="10" fill="#f184b9"/><rect x="64" y="136" width="72" height="36" rx="10" fill="#fff8ee" opacity=".85"/><path d="M226 120c18 12 34 14 44 14v34c0 32-20 50-44 60-24-10-44-28-44-60v-34c10 0 26-2 44-14z" fill="none" stroke="#fff8ee" stroke-width="3"/><circle cx="226" cy="170" r="11" fill="#ee3998"/>',
  f4: '<rect x="34" y="170" width="34" height="130" rx="6" fill="#fff8ee"/><rect x="232" y="170" width="34" height="130" rx="6" fill="#fff8ee"/><path d="M51 176Q150 60 249 176" fill="none" stroke="#f184b9" stroke-width="8" stroke-linecap="round"/><line x1="34" y1="186" x2="266" y2="186" stroke="#fff8ee" stroke-width="4"/><circle cx="150" cy="118" r="10" fill="#ee3998"/>',
  cierre: '<circle cx="150" cy="180" r="90" fill="none" stroke="#fff8ee" stroke-width="1.5" stroke-dasharray="3 7" opacity=".6"/>' +
    [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4; return '<circle cx="' + (150 + 90 * Math.cos(a)).toFixed(1) + '" cy="' + (180 + 90 * Math.sin(a)).toFixed(1) + '" r="8" fill="' + (i % 2 ? "#fff8ee" : "#ee3998") + '"/>'; }).join("") +
    '<path d="M150 150l8 20 20 8-20 8-8 20-8-20-20-8 20-8z" fill="#ffc6e1"/>'
};
export function scene2D(kind) {
  const body = SCENES2D[kind] || SCENES2D.cierre;
  return '<svg class="scene-fallback" viewBox="0 0 300 360" aria-hidden="true" focusable="false">' + body + "</svg>";
}

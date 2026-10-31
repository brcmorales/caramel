// Roleta da Caramel: desenho em SVG + giro. Só transform no giro (sem layout/paint de filhos).
const NS = 'http://www.w3.org/2000/svg';
const COLORS = [
  { bg: '#3a2519', fg: '#faf3e6' },
  { bg: '#f2e0b8', fg: '#3a2519' },
  { bg: '#9a5517', fg: '#fff6e6' },
  { bg: '#6d1f3f', fg: '#fdeedd' }
];
const R = 140;
const el = (n, a = {}, p) => {
  const e = document.createElementNS(NS, n);
  for (const k in a) e.setAttribute(k, a[k]);
  if (p) p.appendChild(e);
  return e;
};
const pt = (deg, r) => {
  const t = (deg * Math.PI) / 180;
  return [r * Math.sin(t), -r * Math.cos(t)];
};
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function sorteio(premios) {
  const total = premios.reduce((s, p) => s + p.peso, 0);
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  let r = (buf[0] / 4294967296) * total;
  for (let i = 0; i < premios.length; i++) {
    r -= premios[i].peso;
    if (r < 0) return i;
  }
  return premios.length - 1;
}

export function criarRoleta(svg, premios, selo, pointerEl) {
  const n = premios.length;
  const seg = 360 / n;
  svg.innerHTML = '';
  const defs = el('defs', {}, svg);
  const g1 = el('linearGradient', { id: 'rim', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
  el('stop', { offset: '0', 'stop-color': '#f0d58b' }, g1);
  el('stop', { offset: '.5', 'stop-color': '#c79a3b' }, g1);
  el('stop', { offset: '1', 'stop-color': '#9c7022' }, g1);
  const sh = el('radialGradient', { id: 'shine' }, defs);
  el('stop', { offset: '.55', 'stop-color': '#fff', 'stop-opacity': 0 }, sh);
  el('stop', { offset: '1', 'stop-color': '#000', 'stop-opacity': .22 }, sh);

  el('circle', { r: 157, fill: 'url(#rim)' }, svg);
  el('circle', { r: 148, fill: '#faf3e6' }, svg);
  for (let i = 0; i < 16; i++) {
    const [x, y] = pt(i * 22.5, 152.5);
    el('circle', { cx: x.toFixed(2), cy: y.toFixed(2), r: 2.4, fill: '#3a2519' }, svg);
  }

  const rot = el('g', { id: 'rot' }, svg);
  premios.forEach((p, i) => {
    const c = COLORS[i % 4];
    const a0 = i * seg - seg / 2, a1 = i * seg + seg / 2;
    const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R);
    el('path', { d: `M0 0 L${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`, fill: c.bg, stroke: '#faf3e6', 'stroke-width': 1.5 }, rot);
    const g = el('g', { transform: `rotate(${i * seg})` }, rot);
    const lines = p.rotulo;
    const baixo = i * seg > 90 && i * seg < 270; // metade de baixo: texto de cabeça para cima
    const rotTxt = baixo ? 90 : -90;
    const fs = lines.length > 1 ? 13 : 15;
    lines.forEach((t, k) => {
      let y = lines.length > 1 ? (k === 0 ? -1.5 : 12.5) : 5.5;
      if (baixo) y = lines.length > 1 ? (k === 0 ? 12.5 : -1.5) : 5.5;
      const tx = el('text', { transform: `translate(0,-88) rotate(${rotTxt})`, y, 'font-size': k === 1 && lines.length > 1 ? 11 : fs, fill: c.fg, 'letter-spacing': '.01em' }, g);
      tx.textContent = t;
    });
  });
  el('circle', { r: R, fill: 'url(#shine)', 'pointer-events': 'none' }, rot);

  el('circle', { r: 40, fill: '#faf3e6', stroke: '#c79a3b', 'stroke-width': 4 }, svg);
  const cp = el('clipPath', { id: 'hubclip' }, defs);
  el('circle', { r: 31 }, cp);
  const im = el('image', { x: -31, y: -31, width: 62, height: 62, href: selo, 'clip-path': 'url(#hubclip)' }, svg);
  im.setAttribute('preserveAspectRatio', 'xMidYMid slice');

  let ang = 0;
  const set = (a) => { ang = a; rot.style.transform = `rotate(${a}deg)`; };
  rot.style.transformOrigin = '0 0';
  let lastTick = 0, raf = 0;

  const tick = (speed) => {
    const now = performance.now();
    if (now - lastTick < 60) return;
    lastTick = now;
    pointerEl?.animate(
      [{ transform: 'rotate(0)' }, { transform: `rotate(${-Math.min(18, 6 + speed * 600)}deg)` }, { transform: 'rotate(0)' }],
      { duration: 110, easing: 'cubic-bezier(.23,1,.32,1)' }
    );
    if (speed > 0.02) { try { navigator.vibrate?.(6); } catch (e) {} }
  };

  return {
    // rotação em que o centro do segmento i fica sob o ponteiro (topo)
    colocar(i) { set(((-i * seg) % 360 + 360) % 360); },
    girar(i, ms = 5200) {
      cancelAnimationFrame(raf);
      const off = (Math.random() - 0.5) * seg * 0.62;
      const alvoMod = (((-(i * seg + off)) % 360) + 360) % 360;
      const base = ((ang % 360) + 360) % 360;
      let delta = alvoMod - base;
      if (delta < 0) delta += 360;
      const total = 360 * 6 + delta;
      const from = ang;
      if (reduced()) { set(from + total); return Promise.resolve(); }
      return new Promise((res) => {
        const t0 = performance.now();
        let lastIdx = Math.floor((from + seg / 2) / seg), prev = from, prevT = t0;
        const frame = (now) => {
          const t = Math.min(1, (now - t0) / ms);
          const e = 1 - Math.pow(1 - t, 4); // ease-out forte: arranca rápido, assenta devagar
          const a = from + total * e;
          set(a);
          const idx = Math.floor((a + seg / 2) / seg);
          if (idx !== lastIdx) { lastIdx = idx; tick((a - prev) / Math.max(1, now - prevT)); }
          prev = a; prevT = now;
          if (t < 1) raf = requestAnimationFrame(frame); else res();
        };
        raf = requestAnimationFrame(frame);
      });
    }
  };
}

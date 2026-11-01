import { criarRoleta, sorteio } from './wheel.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NUM = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let D;
try {
  D = await (await fetch('data/produtos.json')).json();
} catch (e) {
  document.querySelector('main').insertAdjacentHTML('afterbegin', '<p class="warn" style="margin:24px">Não consegui carregar os produtos. Fale com a gente no WhatsApp.</p>');
  throw e;
}
const consulta = D.consulta || [];
const waConsulta = (c) => waUrl(`Olá, Caramel! Queria saber se a ${c.nome.toLowerCase()} está disponível e os valores.`);
const sabor = (id) => D.sabores.find((s) => s.id === id);
const tamanho = (id) => D.tamanhos.find((t) => t.id === id);
const minPreco = (s) => Math.min(...Object.values(s.precos));
const thumb = (s) => s.fotoPote || s.foto || 'img/selo.webp';
const isCover = (s) => !!s.fotoPote;
const waUrl = (txt) => `https://wa.me/${D.whatsapp}?text=${encodeURIComponent(txt)}`;

/* ---------- estado ---------- */
const sel = { sabor: D.sabores[0].id, tam: '150', qtd: 1 };
let cart = store.get('caramel:cart:v2', []).filter((i) => sabor(i.sabor)?.precos[i.tam]);
let presente = store.get('caramel:presente', false);
let roleta = store.get('caramel:roleta:v1', { usado: false, premio: null });
let premioLigado = true;
const R = D.roleta;
if (roleta.premio && Date.now() > roleta.premio.ts + R.validadeDias * 864e5) roleta.premio = null;
const salvar = () => { store.set('caramel:cart:v2', cart); store.set('caramel:presente', presente); store.set('caramel:roleta:v1', roleta); };

/* ---------- toast ---------- */
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2200);
}
const goto = (sel_) => $(sel_)?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });

/* ---------- desenho dos potes (SVG, proporção ilustrativa) ---------- */
document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
  <linearGradient id="lid-g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#7a5a14"/><stop offset=".3" stop-color="#e3c46a"/><stop offset=".6" stop-color="#b08a2e"/><stop offset="1" stop-color="#7a5a14"/></linearGradient>
  ${D.sabores.map((s) => { const v = s.visual; return v.topo !== v.corpo
    ? `<linearGradient id="g-${s.id}" x1="0" x2="0" y1="0" y2="1"><stop offset=".28" stop-color="${v.topo}"/><stop offset=".33" stop-color="${v.corpo}"/><stop offset="1" stop-color="${v.corpo}"/></linearGradient>`
    : `<linearGradient id="g-${s.id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${v.corpo}"/><stop offset="1" stop-color="${v.corpo}"/></linearGradient>`; }).join('')}
</defs></svg>`);
const FLOCOS = [[.2,.36],[.46,.3],[.7,.4],[.33,.58],[.6,.6],[.8,.7],[.25,.8],[.5,.86],[.72,.52],[.42,.46]];
function jar(s, t, vazio = false) {
  const W = t.larg, H = t.alt, lh = +(H * .16).toFixed(1), top = +(lh + H * .07).toFixed(1), bot = +(H - W * .035).toFixed(1), lq = +(bot - top).toFixed(1);
  const x = +(W * .04).toFixed(1), w = +(W * .92).toFixed(1);
  let liq = '';
  if (!vazio) {
    const v = s.visual;
    liq = `<rect x="${x}" y="${top}" width="${w}" height="${lq}" rx="${(W * .07).toFixed(1)}" fill="url(#g-${s.id})"/>
      <ellipse cx="${W / 2}" cy="${top + 1}" rx="${(W * .4).toFixed(1)}" ry="${(H * .022).toFixed(1)}" fill="${v.topo}" opacity=".6"/>` +
      (v.flocos ? FLOCOS.map(([fx, fy]) => `<circle cx="${(x + w * fx).toFixed(1)}" cy="${(top + lq * fy).toFixed(1)}" r="${(W * .02).toFixed(1)}" fill="${v.flocos}" opacity=".85"/>`).join('') : '') +
      `<rect x="${(W * .11).toFixed(1)}" y="${(top + lq * .18).toFixed(1)}" width="${(W * .07).toFixed(1)}" height="${(lq * .55).toFixed(1)}" rx="${(W * .035).toFixed(1)}" fill="#fff" opacity=".2"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" style="width:calc(var(--u) * ${W})" aria-hidden="true" focusable="false">
    <rect x="${(W * .02).toFixed(1)}" y="${lh - 2}" width="${(W * .96).toFixed(1)}" height="${(H - lh + 1.5).toFixed(1)}" rx="${(W * .09).toFixed(1)}" fill="rgba(255,240,215,.05)" stroke="rgba(255,235,200,.34)" stroke-width="1"/>
    ${liq}<g class="lid" style="${vazio ? 'opacity:.4' : ''}"><rect width="${W}" height="${lh}" rx="${(W * .035).toFixed(1)}" fill="url(#lid-g)"/><rect x="${(W * .06).toFixed(1)}" y="${(lh * .22).toFixed(1)}" width="${(W * .88).toFixed(1)}" height="1.3" rx=".6" fill="#fff8dc" opacity=".55"/></g></svg>`;
}

/* ---------- monte o seu ---------- */
const bases = D.bases;
const baseDe = (id) => bases.find((b) => b.id === id);
const variantes = (b) => D.sabores.filter((s) => s.base === b);
const listaMl = (s) => { const m = Object.keys(s.precos).map((k) => tamanho(k).ml); return m.length < 2 ? `${m[0]} ml` : `${m.slice(0, -1).join(', ')} e ${m.at(-1)} ml`; };
const ease = 'cubic-bezier(.23,1,.32,1)';

function ajustaTam() { const s = sabor(sel.sabor); if (s.precos[sel.tam] == null) sel.tam = Object.keys(s.precos)[0]; }
function dimensoes(t) {
  const m = t.medidasMm; if (!m) return '';
  return `<span class="dim-v"><i></i><b>${m.alt} mm</b></span><span class="dim-h"><i></i><b>Ø ${m.diam} mm</b></span>`;
}
let primeiro = true;
function updateBuilder(animar = true) {
  ajustaTam();
  const s = sabor(sel.sabor), t = tamanho(sel.tam), b = baseDe(s.base), vs = variantes(s.base);
  $('#pick-base').innerHTML = bases.map((x) => `<button type="button" class="pill" role="radio" aria-checked="${x.id === s.base}" data-b="${x.id}"><span class="dot" style="background:${x.cor}"></span>${esc(x.nome)}</button>`).join('') + consulta.map((c) => `<a class="pill pill-link" href="${waConsulta(c)}" target="_blank" rel="noopener"><span class="dot" style="background:${c.cor}"></span>${esc(c.nome)} · sob consulta</a>`).join('');
  $('#var-wrap').hidden = vs.length < 2;
  $('#pick-var').innerHTML = vs.map((x) => `<button type="button" class="pill" role="radio" aria-checked="${x.id === s.id}" data-v="${x.id}"><span class="dot" style="background:linear-gradient(${x.visual.topo} 0 45%,${x.visual.corpo} 45%)"></span>${esc(x.variedade)}</button>`).join('');
  $('#hint-disp').textContent = `${b.nome}${vs.length > 1 ? ' · ' + s.variedade : ''}: potes de ${listaMl(s)}.${s.consulta ? ' Disponibilidade sob consulta.' : ''}`;
  $('#pick-tamanho').innerHTML = D.tamanhos.map((x) => {
    const p = s.precos[x.id];
    return `<button type="button" class="jb" role="radio" aria-checked="${x.id === sel.tam}" aria-disabled="${p == null}" data-t="${x.id}" aria-label="${x.rotulo}${p == null ? ', indisponível' : ', ' + BRL.format(p)}">${jar(s, x)}<b>${x.ml}</b><small>ML</small><em>${p == null ? '—' : BRL.format(p)}</em></button>`;
  }).join('');
  $('#stage-art').innerHTML = `<div class="stage-jar">${jar(s, t)}${dimensoes(t)}</div>`;
  $('#stage-nome').textContent = `Pote de ${t.ml} ml`;
  $('#stage-sub').textContent = `${b.nome}${vs.length > 1 ? ' · ' + s.variedade : ''}`;
  if (animar && !primeiro && !reduced()) {
    const art = $('#stage-art .stage-jar');
    art.animate([{ opacity: .55, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: ease });
    $('#stage-art .lid')?.animate([{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-7px) rotate(-3deg)' }, { transform: 'none' }], { duration: 300, easing: ease });
  }
  primeiro = false;
  $('#qtd').textContent = sel.qtd;
  $('#qtd-menos').disabled = sel.qtd <= 1;
  setPreco(NUM.format(s.precos[sel.tam] * sel.qtd), animar);
  $('#preco-rotulo').textContent = sel.qtd > 1 ? `Total · ${BRL.format(s.precos[sel.tam])} cada` : 'Total';
  $$('.cell').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.s === sel.sabor && c.dataset.t === sel.tam)));
}

let rollToken = 0;
function setPreco(txt, animar) {
  const v = $('#preco-val');
  if (!animar || reduced() || v.textContent === txt) { v.textContent = txt; return; }
  const my = ++rollToken;
  v.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-55%)', opacity: 0 }], { duration: 110, easing: ease, fill: 'forwards' }).finished.then(() => {
    if (my !== rollToken) return;
    v.textContent = txt;
    v.animate([{ transform: 'translateY(55%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 180, easing: ease });
  }).catch(() => {});
}

$('#pick-base').addEventListener('click', (e) => {
  const b = e.target.closest('[data-b]'); if (!b || b.dataset.b === sabor(sel.sabor).base) return;
  const atual = sabor(sel.sabor).variedade, vs = variantes(b.dataset.b);
  sel.sabor = (vs.find((x) => x.variedade === atual) || vs[0]).id; updateBuilder();
});
$('#pick-var').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { sel.sabor = b.dataset.v; updateBuilder(); } });
$('#pick-tamanho').addEventListener('click', (e) => {
  const b = e.target.closest('[data-t]'); if (!b || b.getAttribute('aria-disabled') === 'true') return;
  sel.tam = b.dataset.t; updateBuilder();
});
$('#qtd-menos').onclick = () => { sel.qtd = Math.max(1, sel.qtd - 1); updateBuilder(false); };
$('#qtd-mais').onclick = () => { sel.qtd = Math.min(99, sel.qtd + 1); updateBuilder(false); };
$('#add').onclick = (e) => {
  addItem(sel.sabor, sel.tam, sel.qtd);
  const b = e.currentTarget, old = b.textContent;
  b.textContent = 'Adicionado ✓';
  setTimeout(() => (b.textContent = old), 1300);
  sel.qtd = 1; updateBuilder(false);
};

/* ---------- sabores e tabela ---------- */
$('#t-sabores').textContent = `${D.sabores.length + consulta.length} jeitos de pedir colher`;
$('#lista-sabores').innerHTML = D.sabores.map((s, i) => `
  <li class="fl rv" style="transition-delay:${Math.min(i, 5) * 50}ms">
    <div class="fl-img"><img src="${thumb(s)}" alt="${esc(s.alt)}" width="96" height="96" loading="lazy" class="${isCover(s) ? 'cover' : ''}"></div>
    <div>
      <h3>${esc(s.nome)}${s.consulta ? '<span class="tag">sob consulta</span>' : ''}</h3>
      <p>${esc(s.descricao)}</p>
      <span class="from">a partir de ${BRL.format(minPreco(s))}</span><br>
      <button type="button" data-escolher="${s.id}">Escolher este</button>
    </div>
  </li>`).join('') + consulta.map((c) => `
  <li class="fl rv">
    <div class="fl-img"><img src="${c.foto}" alt="${esc(c.alt)}" width="96" height="96" loading="lazy"></div>
    <div>
      <h3>${esc(c.nome)}<span class="tag">sob consulta</span></h3>
      <p>${esc(c.descricao)}</p>
      <a class="consult-link" href="${waConsulta(c)}" target="_blank" rel="noopener">Consultar no WhatsApp</a>
    </div>
  </li>`).join('');
$('#lista-sabores').addEventListener('click', (e) => {
  const b = e.target.closest('[data-escolher]'); if (!b) return;
  sel.sabor = b.dataset.escolher; updateBuilder(false); goto('#monte');
});

$('#tabela').innerHTML = `<div class="tr head" role="row"><span role="columnheader">Sabor · R$</span>${D.tamanhos.map((t) => `<span role="columnheader">${t.rotulo}</span>`).join('')}</div>` +
  D.sabores.map((s) => `<div class="tr" role="row"><span class="nm" role="rowheader">${esc(s.nome)}</span>${D.tamanhos.map((t) => {
    const p = s.precos[t.id];
    return p == null
      ? `<span class="cell off" role="cell" aria-label="indisponível">—</span>`
      : `<button type="button" class="cell" role="cell" data-s="${s.id}" data-t="${t.id}" aria-pressed="false" aria-label="${esc(s.nome)}, ${t.rotulo}, ${BRL.format(p)}">${NUM.format(p)}</button>`;
  }).join('')}</div>`).join('') + consulta.map((c) => `<div class="tr" role="row"><span class="nm" role="rowheader">${esc(c.nome)}</span><a class="cell cons" role="cell" href="${waConsulta(c)}" target="_blank" rel="noopener">Sob consulta · WhatsApp</a></div>`).join('');
$('#tabela').addEventListener('click', (e) => {
  const c = e.target.closest('.cell[data-s]'); if (!c) return;
  sel.sabor = c.dataset.s; sel.tam = c.dataset.t; updateBuilder(false); goto('#monte');
  toast(`${sabor(sel.sabor).nome} · ${tamanho(sel.tam).rotulo}`);
});

/* kit festa: 20 potinhos de 40 ml com mix de sabores */
const kp = D.kitFesta, t40 = tamanho('40');
const kitSabores = D.sabores.filter((x) => x.precos['40'] != null);
const kit = Object.fromEntries(kitSabores.map((x) => [x.id, 0]));
const kitTotal = () => Object.values(kit).reduce((s, n) => s + n, 0);
$('#kit-list').innerHTML = kitSabores.map((x) => `<li class="kl" data-k="${x.id}">
  <span class="dot" style="background:linear-gradient(${x.visual.topo} 0 45%,${x.visual.corpo} 45%)"></span>
  <span class="kl-nm">${esc(x.nome)}${x.consulta ? ' <small>sob consulta</small>' : ''}</span>
  <span class="qty"><button type="button" data-d="-1" aria-label="Menos ${esc(x.nome)}">−</button><output>0</output><button type="button" data-d="1" aria-label="Mais ${esc(x.nome)}">+</button></span></li>`).join('');
function kitMsg(comMix) {
  const L = [`Olá, Caramel! Quero um Kit Festa (${kp.unidades} potinhos de ${kp.tamanho}).`];
  if (comMix) { L.push('', '*Sabores*'); kitSabores.forEach((x) => kit[x.id] && L.push(`• ${kit[x.id]}× ${x.nome}`)); }
  else L.push('Quero combinar os sabores com vocês.');
  L.push('', `Preciso do kit com ${kp.antecedenciaDias} dias de antecedência. Pode confirmar valor e prazo?`);
  return L.join('\n');
}
let kitUltimo = -1;
function renderKit() {
  const tot = kitTotal(), falta = kp.unidades - tot;
  const ordem = kitSabores.flatMap((x) => Array(kit[x.id]).fill(x));
  $('#kit-grid').innerHTML = Array.from({ length: kp.unidades }, (_, i) => `<span class="kj${i === kitUltimo ? ' novo' : ''}">${jar(ordem[i], t40, !ordem[i])}</span>`).join('');
  $$('#kit-list .kl').forEach((li) => {
    const n = kit[li.dataset.k]; li.querySelector('output').textContent = n;
    const [m, p] = li.querySelectorAll('button'); m.disabled = n === 0; p.disabled = falta === 0;
  });
  $('#kit-prog').textContent = `${tot} de ${kp.unidades} potinhos`;
  $('#kit-sub').textContent = falta === 0 ? 'Kit completo. É só pedir.' : falta === kp.unidades ? 'Toque no + para escolher os sabores.' : `Faltam ${falta} para fechar o kit.`;
  const a = $('#kit-pedir'); a.setAttribute('aria-disabled', String(falta > 0));
  a.textContent = falta > 0 ? `Faltam ${falta} potinhos` : 'Pedir o Kit Festa';
  a.href = falta > 0 ? '#' : waUrl(kitMsg(true));
  const ref = kitSabores.reduce((s, x) => s + kit[x.id] * x.precos['40'], 0);
  $('#kit-preco').innerHTML = (kp.preco == null ? 'Valor do kit: <span class="ph">[PREÇO A DEFINIR]</span>' : `${BRL.format(kp.preco)} · ${BRL.format(kp.preco / kp.unidades)} por pote`) +
    (tot ? `<br><small>Pelo valor avulso dos potes de 40 ml, a sua escolha soma ${BRL.format(ref)}.</small>` : '');
  kitUltimo = -1;
}
$('#kit-list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-d]'); if (!b) return;
  const id = b.closest('.kl').dataset.k, d = +b.dataset.d;
  if (d > 0 && kitTotal() >= kp.unidades) return;
  kit[id] = Math.max(0, kit[id] + d);
  kitUltimo = d > 0 ? kitTotal() - 1 : -1; renderKit();
});
$('#kit-pedir').addEventListener('click', (e) => { if (e.currentTarget.getAttribute('aria-disabled') === 'true') e.preventDefault(); });
$('#kit-combinar').href = waUrl(kitMsg(false));
renderKit();
$('#foot-wa').href = waUrl('Olá, Caramel!');
$$('[data-validade]').forEach((n) => (n.textContent = R.validadeDias));
$$('[data-brinde-min]').forEach((n) => (n.textContent = R.brindeMinimoPedido));

/* ---------- carrinho ---------- */
function addItem(sid, tid, q) {
  const it = cart.find((i) => i.sabor === sid && i.tam === tid);
  if (it) it.qtd = Math.min(99, it.qtd + q); else cart.push({ sabor: sid, tam: tid, qtd: q });
  lastAdded = `${sid}|${tid}`;
  salvar(); renderCart();
  toast(`${q}× ${sabor(sid).nome} ${tamanho(tid).rotulo} no carrinho`);
  const c = $('#contador'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
}
let lastAdded = '';

function calc() {
  const sub = cart.reduce((s, i) => s + sabor(i.sabor).precos[i.tam] * i.qtd, 0);
  const p = roleta.premio ? R.premios.find((x) => x.id === roleta.premio.id) : null;
  const r = { sub, desc: 0, rot: '', p, brinde: false, faltaBrinde: 0, embGratis: false };
  if (p && premioLigado) {
    if (p.tipo === 'percent') { r.desc = +(sub * p.valor / 100).toFixed(2); r.rot = `${p.valor}% OFF`; }
    if (p.tipo === 'fixed') { r.desc = Math.min(p.valor, sub); r.rot = `R$ ${p.valor} OFF`; }
    if (p.tipo === 'embalagem') r.embGratis = true;
    if (p.tipo === 'brinde') { if (sub >= R.brindeMinimoPedido) r.brinde = true; else r.faltaBrinde = R.brindeMinimoPedido - sub; }
  }
  r.total = Math.max(0, sub - r.desc);
  return r;
}

function renderCart() {
  const n = cart.reduce((s, i) => s + i.qtd, 0);
  const cnt = $('#contador'); cnt.hidden = n === 0; cnt.textContent = n > 99 ? '99+' : n;
  $('#abrir-carrinho').setAttribute('aria-label', `Abrir carrinho, ${n} ${n === 1 ? 'item' : 'itens'}`);
  $('#cart-vazio').hidden = cart.length > 0;
  $('#cart-cheio').hidden = cart.length === 0;
  const c = calc();
  $('#cart-list').innerHTML = cart.map((i) => {
    const s = sabor(i.sabor), t = tamanho(i.tam), key = `${i.sabor}|${i.tam}`;
    return `<li class="ci ${key === lastAdded ? 'in' : ''}" data-k="${key}">
      <img src="${thumb(s)}" alt="" style="${isCover(s) ? 'object-fit:cover' : ''}">
      <div><div class="nm">${esc(s.nome)}</div><div class="sub">${t.rotulo} · ${BRL.format(s.precos[i.tam])}</div>
        <div class="qty"><button type="button" data-a="menos" aria-label="Diminuir ${esc(s.nome)}">−</button><output>${i.qtd}</output><button type="button" data-a="mais" aria-label="Aumentar ${esc(s.nome)}">+</button></div></div>
      <div><div class="pr">${BRL.format(s.precos[i.tam] * i.qtd)}</div><button type="button" class="rm" data-a="rm" aria-label="Remover ${esc(s.nome)}">remover</button></div></li>`;
  }).join('') + (c.brinde ? brindeLi() : '');
  lastAdded = '';
  $('#presente').checked = presente || c.embGratis;
  $('#presente-info').textContent = c.embGratis ? '· grátis com seu prêmio' : D.embalagemPresente.preco == null ? '· valor combinado no WhatsApp' : `· ${BRL.format(D.embalagemPresente.preco)}`;
  const pb = $('#premio-box');
  if (c.p && c.p.tipo !== 'nada' && c.p.tipo !== 'giro') {
    pb.hidden = false;
    let msg = `<strong>🎁 ${esc(c.p.titulo)}</strong> <span class="muted">· código ${roleta.premio.code}</span>`;
    if (!premioLigado) msg += '<br><span class="muted">Prêmio desligado neste pedido.</span>';
    else if (c.faltaBrinde > 0) msg += `<br>Faltam ${BRL.format(c.faltaBrinde)} para liberar o brinde (pedido a partir de ${BRL.format(R.brindeMinimoPedido)}).`;
    pb.innerHTML = `${msg}<br><button type="button" id="toggle-premio">${premioLigado ? 'Não usar neste pedido' : 'Usar prêmio'}</button>`;
  } else pb.hidden = true;
  $('#t-sub').textContent = BRL.format(c.sub);
  $('#t-desc-row').hidden = c.desc <= 0;
  $('#t-desc-rot').textContent = `Desconto · ${c.rot}`;
  $('#t-desc').textContent = '−' + BRL.format(c.desc);
  $('#t-total').textContent = BRL.format(c.total);
  checarMin();
}
function brindeLi() {
  const p = roleta.premio, ops = R.premios.find((x) => x.id === p.id).opcoes;
  const escolha = p.escolha && ops.includes(p.escolha) ? p.escolha : ops[0];
  const s = sabor(escolha);
  return `<li class="ci free"><img src="${thumb(s)}" alt="" style="${isCover(s) ? 'object-fit:cover' : ''}"><div><div class="nm">Brinde: pote 40 ml</div>
    <select id="brinde-sel" aria-label="Sabor do brinde">${ops.map((o) => `<option value="${o}" ${o === escolha ? 'selected' : ''}>${esc(sabor(o).nome)}</option>`).join('')}</select></div><div class="pr">Grátis</div></li>`;
}
function checarMin() {
  const w = $('#aviso-min'), min = D.pedidoMinimoEntrega;
  const modo = new FormData($('#form-pedido')).get('modo');
  const c = calc();
  if (min != null && modo === 'Entrega' && c.total < min) {
    w.hidden = false; w.textContent = `Para entrega, o pedido mínimo é ${BRL.format(min)}. Faltam ${BRL.format(min - c.total)}, ou escolha retirada, que não tem mínimo.`;
  } else w.hidden = true;
}

$('#cart-list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const [sid, tid] = b.closest('.ci').dataset.k.split('|');
  const it = cart.find((i) => i.sabor === sid && i.tam === tid);
  if (b.dataset.a === 'mais') it.qtd = Math.min(99, it.qtd + 1);
  if (b.dataset.a === 'menos') it.qtd = Math.max(1, it.qtd - 1);
  if (b.dataset.a === 'rm') cart = cart.filter((i) => i !== it);
  salvar(); renderCart();
});
$('#cart-list').addEventListener('change', (e) => {
  if (e.target.id === 'brinde-sel') { roleta.premio.escolha = e.target.value; salvar(); renderCart(); }
});
$('#premio-box').addEventListener('click', (e) => {
  if (e.target.id === 'toggle-premio') { premioLigado = !premioLigado; renderCart(); }
});
$('#presente').addEventListener('change', (e) => {
  if (calc().embGratis) { e.target.checked = true; return; }
  presente = e.target.checked; salvar();
});
$('#form-pedido').addEventListener('change', (e) => { if (e.target.name === 'modo') checarMin(); });

const saved = store.get('caramel:form', {});
$('#f-nome').value = saved.nome || ''; $('#f-tel').value = saved.tel || '';
$('#form-pedido').addEventListener('input', () => store.set('caramel:form', { nome: $('#f-nome').value, tel: $('#f-tel').value }));

$('#form-pedido').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target), nome = (f.get('nome') || '').trim(), tel = (f.get('tel') || '').trim(), err = $('#f-erro');
  err.hidden = true;
  if (!nome) { err.textContent = 'Diga seu nome para a gente te chamar no WhatsApp.'; err.hidden = false; $('#f-nome').focus(); return; }
  if (tel && tel.replace(/\D/g, '').length < 10) { err.textContent = 'Confira o telefone: faltam números (com DDD).'; err.hidden = false; $('#f-tel').focus(); return; }
  const c = calc();
  const L = ['Olá, Caramel! Quero fazer um pedido 🐶', '', '*Itens*'];
  cart.forEach((i) => { const s = sabor(i.sabor); L.push(`• ${i.qtd}× ${s.nome} ${tamanho(i.tam).rotulo} — ${BRL.format(s.precos[i.tam] * i.qtd)}`); });
  if (c.brinde) { const p = roleta.premio, ops = c.p.opcoes, ch = p.escolha && ops.includes(p.escolha) ? p.escolha : ops[0]; L.push(`🎁 Brinde da roleta: 1× ${sabor(ch).nome} 40 ml (grátis, código ${roleta.premio.code})`); }
  if (presente || c.embGratis) L.push(`🎀 Embalagem para presente${c.embGratis ? ` (grátis, código ${roleta.premio.code})` : ''}`);
  L.push('', `Subtotal: ${BRL.format(c.sub)}`);
  if (c.desc > 0) L.push(`Desconto ${c.rot} (código ${roleta.premio.code}): −${BRL.format(c.desc)}`);
  L.push(`*Total: ${BRL.format(c.total)}*`, '', `Nome: ${nome}`);
  if (tel) L.push(`Telefone: ${tel}`);
  L.push(`${f.get('modo')}`);
  const obs = (f.get('obs') || '').trim(); if (obs) L.push(`Obs.: ${obs}`);
  L.push('', 'Pode confirmar valor, prazo e pagamento? Obrigado!');
  const url = waUrl(L.join('\n'));
  window.open(url, '_blank', 'noopener');
  sucesso(url);
});
function sucesso(url) {
  $('#cart-cheio').hidden = true;
  let ok = $('#cart-ok');
  if (!ok) { ok = document.createElement('div'); ok.id = 'cart-ok'; ok.className = 'empty'; $('#dlg-carrinho .sheet-body').appendChild(ok); }
  ok.hidden = false;
  ok.innerHTML = `<img src="img/selo.webp" width="88" height="88" alt=""><p><strong>Pedido pronto no WhatsApp!</strong></p><p class="muted">Envie a mensagem por lá e a Caramel confirma valor, prazo e entrega.</p><a class="btn primary" href="${url}" target="_blank" rel="noopener">Abrir o WhatsApp de novo</a><p><button type="button" class="rm" id="novo-pedido">Fazer outro pedido</button></p>`;
  $('#novo-pedido').onclick = () => {
    cart = []; if (roleta.premio && ['percent', 'fixed', 'embalagem', 'brinde'].includes(roleta.premio.tipo)) roleta.premio = null;
    presente = false; salvar(); ok.hidden = true; renderCart(); closeSheet($('#dlg-carrinho'));
  };
  $('#t-cart').scrollIntoView?.({ block: 'nearest' });
}

/* ---------- sheets (bottom sheet com arrasto) ---------- */
const sheets = $$('dialog.sheet');
function openSheet(d) {
  if (d.open) return;
  d.showModal();
  document.documentElement.style.overflow = 'hidden';
  requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('open')));
  $('#fab-roleta').classList.add('hide');
}
function closeSheet(d) {
  if (!d.open) return;
  d.classList.remove('open');
  let done = false;
  const fin = () => { if (done) return; done = true; d.close(); d.style.transform = ''; document.documentElement.style.overflow = ''; $('#fab-roleta').classList.remove('hide'); };
  d.addEventListener('transitionend', (e) => { if (e.target === d && e.propertyName !== 'opacity' || reduced()) fin(); }, { once: false });
  setTimeout(fin, 420);
}
sheets.forEach((d) => {
  d.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(d); });
  d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-fechar]')) closeSheet(d); });
  const g = $('.grab', d); let drag = null;
  g.addEventListener('pointerdown', (e) => {
    if (drag) return;
    drag = { id: e.pointerId, y0: e.clientY, hist: [[performance.now(), e.clientY]] };
    g.setPointerCapture(e.pointerId); d.classList.add('dragging');
  });
  g.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    let dy = e.clientY - drag.y0;
    if (dy < 0) dy = -(Math.abs(dy) * 40) / (Math.abs(dy) + 40); // resistência acima do topo
    d.style.transform = `translateY(${dy}px)`;
    drag.hist.push([performance.now(), e.clientY]); if (drag.hist.length > 6) drag.hist.shift();
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y0, h = drag.hist, a = h[0], b = h[h.length - 1];
    const v = (b[1] - a[1]) / Math.max(1, b[0] - a[0]);
    drag = null; d.classList.remove('dragging');
    const proj = dy + v * 180;
    d.getBoundingClientRect(); // fixa a posição atual antes de retomar a transição
    if (proj > 140 || v > 0.5) { d.style.transform = ''; closeSheet(d); } else d.style.transform = '';
  };
  g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
});
$('#abrir-carrinho').onclick = () => { const ok = $('#cart-ok'); if (ok) ok.hidden = true; renderCart(); openSheet($('#dlg-carrinho')); };

/* ---------- roleta ---------- */
const svg = $('#wheel');
const wheel = criarRoleta(svg, R.premios, 'img/selo.webp', $('.pointer'));
const gerarCodigo = () => {
  const al = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint8Array(4); crypto.getRandomValues(b);
  return 'CARAMEL-' + [...b].map((x) => al[x % al.length]).join('');
};
const premioDe = (id) => R.premios.find((p) => p.id === id);
let girando = false;

function mostrarResultado(p, extra = '') {
  const box = $('#resultado'); box.hidden = false; box.classList.remove('in'); void box.offsetWidth; box.classList.add('in');
  setTimeout(() => box.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }), 60);
  const cod = roleta.premio?.code;
  if (p.tipo === 'nada') {
    box.innerHTML = `<h3>${esc(p.titulo)} 🐶</h3><p>Hoje não foi dessa vez. Siga a Caramel no Instagram e fique de olho nas próximas promoções.</p><div class="row"><a class="btn ghost" href="${D.instagram}" target="_blank" rel="noopener">@potcaramel</a><a class="btn primary" href="#monte" data-fechar>Montar meu pote</a></div>`;
  } else {
    const regra = p.tipo === 'brinde' ? `Vale em pedidos a partir de ${BRL.format(R.brindeMinimoPedido)}.` : p.tipo === 'embalagem' ? 'A embalagem de presente sai de graça no seu pedido.' : 'O desconto entra sozinho no carrinho.';
    box.innerHTML = `<h3>${extra}${esc(p.titulo)}!</h3><p>${regra} Válido por ${R.validadeDias} dias neste aparelho.</p><span class="code">${cod}</span><div class="row"><a class="btn primary" href="#monte" data-fechar>Montar meu pote</a><button class="btn ghost" type="button" id="ver-carrinho">Ver no carrinho</button></div>`;
    $('#ver-carrinho').onclick = () => { closeSheet($('#dlg-roleta')); setTimeout(() => $('#abrir-carrinho').click(), 340); };
  }
}
function atualizarFab() {
  const p = roleta.premio && premioDe(roleta.premio.id);
  const useful = p && p.tipo !== 'nada' && p.tipo !== 'giro';
  $('#fab-texto').textContent = useful ? 'Meu prêmio' : 'Gire e ganhe';
  $('#fab-roleta').hidden = roleta.usado && !useful;
  $$('.spin-teaser,.wheel-banner .btn').forEach((b) => (b.hidden = roleta.usado));
  $('.wheel-banner').hidden = roleta.usado && !useful ? true : false;
}
function abrirRoleta() {
  if (!R.ativa) return;
  const btn = $('#girar'), box = $('#resultado');
  if (roleta.usado) {
    btn.disabled = true; btn.textContent = 'Você já girou';
    const p = roleta.premio && premioDe(roleta.premio.id);
    $('#wheel-sub').textContent = 'Cada pessoa gira uma vez.';
    if (p) { wheel.colocar(R.premios.indexOf(p)); mostrarResultado(p, 'Seu prêmio: '); } else { box.hidden = true; }
  } else { btn.disabled = false; btn.textContent = 'Girar'; box.hidden = true; $('#wheel-sub').textContent = 'Gire e veja o que o Caramel trouxe para você.'; }
  openSheet($('#dlg-roleta'));
}
$$('[data-abrir-roleta]').forEach((b) => b.addEventListener('click', abrirRoleta));
$('#girar').onclick = async () => {
  if (girando || roleta.usado) return;
  girando = true; const btn = $('#girar'); btn.disabled = true; btn.textContent = 'Girando…'; $('#resultado').hidden = true;
  const i = sorteio(R.premios), p = R.premios[i];
  await wheel.girar(i);
  girando = false;
  if (p.tipo === 'giro') {
    btn.disabled = false; btn.textContent = 'Girar de novo';
    const box = $('#resultado'); box.hidden = false; box.classList.add('in'); box.innerHTML = '<h3>Giro extra! ✨</h3><p>Você ganhou mais uma chance. Gire de novo.</p>';
    return;
  }
  roleta.usado = true;
  roleta.premio = { id: p.id, code: gerarCodigo(), ts: Date.now(), tipo: p.tipo };
  premioLigado = true; salvar(); renderCart(); atualizarFab();
  btn.textContent = 'Você já girou';
  mostrarResultado(p, p.tipo === 'nada' ? '' : '🎉 ');
  if (p.tipo === 'nada') roleta.premio = null, salvar();
  toast(p.tipo === 'nada' ? p.titulo : `Prêmio guardado: ${p.titulo}`);
};

/* ---------- movimento sutil ---------- */
if ('IntersectionObserver' in window && !reduced()) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.sec-head,.kit,.story-grid,.steps li,.faq,.wb-inner').forEach((n) => n.classList.add('rv'));
  $$('.rv').forEach((n) => io.observe(n));
} else $$('.rv').forEach((n) => n.classList.add('on'));

const hero = $('.hero-photo img');
if (hero && !reduced()) {
  let tick = false;
  addEventListener('scroll', () => {
    if (tick) return; tick = true;
    requestAnimationFrame(() => { const p = Math.min(1, scrollY / 500); hero.style.transform = `translate3d(0,${(-p * 9).toFixed(2)}%,0)`; tick = false; });
  }, { passive: true });
}
const vid = $('#selo-video');
if (vid && !reduced() && 'IntersectionObserver' in window) {
  new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? vid.play().catch(() => {}) : vid.pause())), { threshold: 0.4 }).observe(vid);
}

updateBuilder(false); renderCart(); atualizarFab();

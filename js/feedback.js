const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2.8 2.7 5.8 6.3.7-4.7 4.3 1.3 6.3L12 16.7 6.4 19.9l1.3-6.3L3 9.3l6.3-.7L12 2.8Z"/></svg>';
const stars = (n) => `<span class="stars" role="img" aria-label="${n} de 5 estrelas">${[1, 2, 3, 4, 5].map((i) => `<span class="${i <= n ? '' : 'off'}">${STAR}</span>`).join('')}</span>`;
const iniciais = (nome) => {
  const w = nome.trim().split(/\s+/).filter(Boolean);
  const seg = (t) => [...(new Intl.Segmenter('pt-BR', { granularity: 'grapheme' }).segment(t))][0]?.segment || '';
  return ((w[0] ? seg(w[0]) : '') + (w.length > 1 ? seg(w[w.length - 1]) : '')).toUpperCase() || '🐶';
};
const fmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

/* lista publicada */
try {
  const data = await (await fetch('data/depoimentos.json')).json();
  const lista = (data.depoimentos || []).filter((d) => d && d.nome && d.texto && d.estrelas >= 1 && d.estrelas <= 5);
  const ul = $('#lista-dep');
  if (!lista.length) { $('#dep-vazio').hidden = false; ul.hidden = true; }
  else {
    const media = lista.reduce((s, d) => s + d.estrelas, 0) / lista.length;
    $('#dep-resumo').textContent = `Nota média ${media.toFixed(1).replace('.', ',')} em ${lista.length} ${lista.length === 1 ? 'avaliação' : 'avaliações'}.`;
    ul.innerHTML = lista.map((d) => {
      const okFoto = typeof d.foto === 'string' && /^img\/[\w\-./]+$/.test(d.foto) && !d.foto.includes('..');
      const quando = d.data && !isNaN(new Date(d.data)) ? fmt.format(new Date(d.data + 'T12:00:00')) : '';
      return `<li class="rev"><div class="rev-top">${okFoto ? `<img class="avatar" src="${d.foto}" alt="Foto de ${esc(d.nome)}" width="48" height="48" loading="lazy">` : `<span class="avatar" aria-hidden="true">${esc(iniciais(d.nome))}</span>`}
        <div style="min-width:0"><div class="rev-name">${esc(d.nome)}</div>${quando ? `<div class="rev-date">${quando}</div>` : ''}</div></div>
        ${stars(d.estrelas)}<p>${esc(d.texto)}</p></li>`;
    }).join('');
  }
} catch { $('#dep-vazio').hidden = false; $('#lista-dep').hidden = true; }

/* estrelas */
const box = $('#stars-in'), nota = $('#fb-nota');
let val = 0;
box.innerHTML = [1, 2, 3, 4, 5].map((i) => `<button type="button" role="radio" aria-checked="false" aria-label="${i} ${i === 1 ? 'estrela' : 'estrelas'}" data-v="${i}" tabindex="${i === 1 ? 0 : -1}">${STAR}</button>`).join('');
const pintar = () => [...box.children].forEach((b, i) => { b.classList.toggle('on', i < val); b.setAttribute('aria-checked', String(i + 1 === val)); b.tabIndex = (val ? i + 1 === val : i === 0) ? 0 : -1; });
const set = (v) => { val = v; nota.value = v; pintar(); };
box.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) set(+b.dataset.v); });
box.addEventListener('keydown', (e) => {
  const k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]; if (!k) return;
  e.preventDefault(); set(Math.min(5, Math.max(1, (val || 0) + k))); box.children[val - 1].focus();
});

/* foto: reduz no navegador antes de enviar (limite de envio do Netlify) */
const inp = $('#fb-foto'), prev = $('#fb-prev'); let fotoBlob = null;
async function reduzir(file) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
}
inp.addEventListener('change', async () => {
  const f = inp.files[0]; const err = $('#fb-erro'); err.hidden = true;
  if (!f) return;
  if (!f.type.startsWith('image/')) { err.textContent = 'Escolha um arquivo de imagem.'; err.hidden = false; inp.value = ''; return; }
  try {
    fotoBlob = await reduzir(f);
    prev.querySelector('img').src = URL.createObjectURL(fotoBlob); prev.hidden = false;
  } catch { err.textContent = 'Não consegui ler essa foto. Tente outra.'; err.hidden = false; inp.value = ''; fotoBlob = null; }
});
$('#fb-rm').onclick = () => { inp.value = ''; fotoBlob = null; prev.hidden = true; };

/* envio */
$('#form-fb').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target, err = $('#fb-erro'), ok = $('#fb-sucesso'), btn = $('#fb-enviar');
  err.hidden = true; ok.hidden = true;
  const bad = (m, el) => { err.textContent = m; err.hidden = false; el?.focus(); };
  if (!val) return bad('Escolha de 1 a 5 estrelas.', box.querySelector('button'));
  if (!$('#fb-nome').value.trim()) return bad('Escreva seu nome.', $('#fb-nome'));
  if ($('#fb-texto').value.trim().length < 5) return bad('Conte um pouco mais no comentário.', $('#fb-texto'));
  if (!$('#fb-ok').checked) return bad('Marque a autorização para podermos publicar.', $('#fb-ok'));
  const fd = new FormData(f);
  fd.delete('foto');
  if (fotoBlob) fd.append('foto', fotoBlob, 'foto.jpg');
  btn.disabled = true; btn.textContent = 'Enviando…';
  try {
    const r = await fetch('/', { method: 'POST', body: fd });
    if (!r.ok) throw new Error(r.status);
    ok.textContent = 'Obrigada! Recebemos seu depoimento. Ele aparece aqui depois que a Caramel ler.';
    ok.hidden = false; f.reset(); set(0); fotoBlob = null; prev.hidden = true;
  } catch {
    bad('Não consegui enviar agora. Tente de novo ou mande seu depoimento pelo WhatsApp.');
  } finally { btn.disabled = false; btn.textContent = 'Enviar depoimento'; }
});

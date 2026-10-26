/* Evolua — utilitários de interface */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NF = [0, 1, 2, 3].map((d) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: 0 }));
const fmt = (v, d = 0) => (v == null || isNaN(v)) ? '—' : (NF[d] || NF[2]).format(v);
const sinal = (v, d = 1) => (v == null || isNaN(v)) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + NF[d].format(Math.abs(v));
const hojeISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const addDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const dataBR = (iso) => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
const dataCurta = (iso) => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';
const dataLonga = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const mmss = (s) => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); };
const hhmm = (s) => { s = Math.round(s / 60); return s >= 60 ? Math.floor(s / 60) + ' h ' + (s % 60) + ' min' : s + ' min'; };
const num = (v) => { if (v == null || v === '') return null; const n = Number(String(v).replace(',', '.')); return isFinite(n) ? n : null; };

const UI = {
  toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(UI._tt); UI._tt = setTimeout(() => t.classList.remove('on'), 2600);
  },
  /* Bottom sheet. html: conteúdo; bind(el, close) liga eventos. Retorna close. */
  sheet(html, bind, aoFechar) {
    const bg = $('#sheet-bg'), sh = $('#sheet');
    if (UI._fechar) UI._fechar(true);
    sh.innerHTML = '<div class="grab" aria-hidden="true"></div>' + html;
    bg.hidden = false; requestAnimationFrame(() => bg.classList.add('on'));
    document.body.classList.add('lock');
    let aberto = true;
    const close = (imediato) => {
      if (!aberto) return; aberto = false; UI._fechar = null;
      document.removeEventListener('keydown', onKey);
      if (imediato === true) { sh.innerHTML = ''; } else { bg.classList.remove('on'); document.body.classList.remove('lock'); setTimeout(() => { if (!UI._fechar) { bg.hidden = true; sh.innerHTML = ''; } }, 200); }
      if (aoFechar) aoFechar();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    bg.onclick = (e) => { if (e.target === bg) close(); };
    $$('[data-close]', sh).forEach((b) => b.addEventListener('click', () => close()));
    UI._fechar = close;
    if (bind) bind(sh, close);
    const f = sh.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 250);
    return close;
  },
  confirmar(msg, ok = 'Confirmar', perigo = true) {
    return new Promise((res) => {
      let r = false;
      UI.sheet(`<h3>${esc(msg)}</h3><div class="row gap end"><button class="btn ghost" data-close>Cancelar</button><button class="btn ${perigo ? 'danger' : ''}" id="cf-ok">${esc(ok)}</button></div>`,
        (el, close) => { $('#cf-ok', el).onclick = () => { r = true; close(); }; }, () => res(r));
    });
  },
  ring(valor, meta, rotulo, sub) {
    const r = 52, c = 2 * Math.PI * r, f = meta ? Math.min(1, valor / meta) : 0, over = meta && valor > meta;
    return `<svg class="ring" viewBox="0 0 128 128" role="img" aria-label="${esc(rotulo)}">
      <circle cx="64" cy="64" r="${r}" class="ring-bg"/>
      <circle cx="64" cy="64" r="${r}" class="ring-fg ${over ? 'over' : ''}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}" transform="rotate(-90 64 64)"/>
      <text x="64" y="62" text-anchor="middle" class="ring-v">${esc(rotulo)}</text>
      <text x="64" y="82" text-anchor="middle" class="ring-s">${esc(sub || '')}</text></svg>`;
  },
  barra(valor, meta, rotulo, unidade) {
    const f = meta ? Math.min(100, valor / meta * 100) : 0;
    return `<div class="mbar"><div class="mbar-h"><span>${esc(rotulo)}</span><span><b>${fmt(valor)}</b> / ${fmt(meta)} ${unidade}</span></div><div class="mbar-t"><div style="width:${f}%" class="${valor > meta * 1.1 ? 'over' : ''}"></div></div></div>`;
  },
  /* Gráfico de linha simples. pts: [{x:'AAAA-MM-DD', y}] */
  linha(pts, { unidade = '', dec = 1, ref = null, refRot = '' } = {}) {
    pts = pts.filter((p) => p.y != null).sort((a, b) => a.x < b.x ? -1 : 1);
    if (pts.length < 2) return `<p class="muted small center pad">Registre pelo menos duas datas para ver a evolução.</p>`;
    const W = 320, H = 150, ml = 38, mr = 44, mt = 12, mb = 22;
    const xs = pts.map((p) => new Date(p.x + 'T12:00').getTime());
    let ys = pts.map((p) => p.y); if (ref != null) ys = ys.concat(ref);
    let y0 = Math.min(...ys), y1 = Math.max(...ys); const pad = (y1 - y0) * 0.15 || 1; y0 -= pad; y1 += pad;
    const X = (t) => ml + (t - xs[0]) / ((xs[xs.length - 1] - xs[0]) || 1) * (W - ml - mr);
    const Y = (v) => mt + (1 - (v - y0) / (y1 - y0)) * (H - mt - mb);
    const ticks = [y0 + pad, (y0 + y1) / 2, y1 - pad];
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">`;
    ticks.forEach((t) => { s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/><text x="${ml - 5}" y="${Y(t) + 3.5}" text-anchor="end" class="tick">${fmt(t, dec)}</text>`; });
    if (ref != null) s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(ref)}" y2="${Y(ref)}" class="refl"/><text x="${W - mr + 4}" y="${Y(ref) + 3.5}" class="tick">${esc(refRot)}</text>`;
    s += `<polyline points="${pts.map((p, i) => X(xs[i]) + ',' + Y(p.y)).join(' ')}" class="ln"/>`;
    pts.forEach((p, i) => { s += `<circle cx="${X(xs[i])}" cy="${Y(p.y)}" r="${i === pts.length - 1 ? 4 : 2.5}" class="pt ${i === pts.length - 1 ? 'last' : ''}"/>`; });
    const L = pts[pts.length - 1];
    s += `<text x="${X(xs[xs.length - 1]) + 7}" y="${Y(L.y) + 4}" class="endl">${fmt(L.y, dec)}${unidade}</text>`;
    s += `<text x="${ml}" y="${H - 5}" class="tick">${dataCurta(pts[0].x)}</text><text x="${W - mr}" y="${H - 5}" text-anchor="end" class="tick">${dataCurta(L.x)}</text></svg>`;
    return s;
  },
  /* Barras diárias. dias: [iso], valores: Map(iso -> v) */
  barras(dias, valores, { meta = null, dec = 0, unidade = '' } = {}) {
    const W = 320, H = 140, ml = 34, mr = 6, mt = 10, mb = 20;
    const vals = dias.map((d) => valores.get(d) || 0);
    const max = Math.max(meta || 0, ...vals) * 1.1 || 1;
    const bw = (W - ml - mr) / dias.length;
    const Y = (v) => mt + (1 - v / max) * (H - mt - mb);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">`;
    [0, max / 2, max / 1.1].forEach((t) => { s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/><text x="${ml - 4}" y="${Y(t) + 3.5}" text-anchor="end" class="tick">${fmt(t >= 1000 ? Math.round(t / 100) * 100 : t, dec)}</text>`; });
    dias.forEach((d, i) => {
      const v = vals[i]; if (v > 0) s += `<rect x="${ml + i * bw + bw * 0.18}" y="${Y(v)}" width="${bw * 0.64}" height="${Y(0) - Y(v)}" rx="3" class="bar ${meta && v >= meta ? 'hit' : ''}"><title>${dataCurta(d)}: ${fmt(v, dec)} ${unidade}</title></rect>`;
      if (i % Math.ceil(dias.length / 5) === (dias.length - 1) % Math.ceil(dias.length / 5)) s += `<text x="${ml + i * bw + bw / 2}" y="${H - 5}" text-anchor="middle" class="tick">${dataCurta(d)}</text>`;
    });
    if (meta) s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(meta)}" y2="${Y(meta)}" class="refl"/>`;
    return s + '</svg>';
  },
  icon(n) {
    const P = {
      hoje: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
      treino: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
      dieta: '<path d="M12 7c-1.5-2.5-6-2.6-6.8 1.6C4.4 13 7 20 9.5 20c1.2 0 1.6-.8 2.5-.8s1.3.8 2.5.8C17 20 19.6 13 18.8 8.6 18 4.4 13.5 4.5 12 7z"/><path d="M12 7c0-2 1-3.5 3-4"/>',
      medidas: '<path d="M4 17 17 4l3 3L7 20z"/><path d="M8 13l1.5 1.5M10.5 10.5l2 2M13 8l1.5 1.5"/>',
      mais: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
      play: '<path d="M8 5v14l11-7z"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/>',
      plus: '<path d="M12 5v14M5 12h14"/>', back: '<path d="M15 5l-7 7 7 7"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', trash: '<path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3"/>',
      cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>', barcode: '<path d="M4 6v12M7 6v12M10 6v12M14 6v12M16 6v12M20 6v12"/>',
      left: '<path d="M14 6l-6 6 6 6"/>', right: '<path d="M10 6l6 6-6 6"/>', watch: '<rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 9.5V12l1.5 1.5"/>'
    };
    return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
  }
};

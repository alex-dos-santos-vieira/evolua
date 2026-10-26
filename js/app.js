/* Evolua — telas e navegação */
const App = { perfil: null, plano: [], sessao: null, calMes: null, diaDieta: null, instalar: null };
const REFEICOES = ['Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia'];
const MEDIDAS_CAMPOS = [
  { g: 'Principais', c: [['peso', 'Peso', 'kg'], ['cintura', 'Cintura', 'cm'], ['abdomen', 'Abdômen', 'cm'], ['pescoco', 'Pescoço', 'cm'], ['quadril', 'Quadril', 'cm']] },
  { g: 'Tronco', c: [['peito', 'Peito', 'cm'], ['costas', 'Costas', 'cm']] },
  { g: 'Membros', c: [['braco_d', 'Braço direito', 'cm'], ['braco_e', 'Braço esquerdo', 'cm'], ['antebraco_d', 'Antebraço direito', 'cm'], ['antebraco_e', 'Antebraço esquerdo', 'cm'], ['coxa_d', 'Coxa direita', 'cm'], ['coxa_e', 'Coxa esquerda', 'cm'], ['panturrilha_d', 'Panturrilha direita', 'cm'], ['panturrilha_e', 'Panturrilha esquerda', 'cm']] }
];
const TODOS_CAMPOS = MEDIDAS_CAMPOS.flatMap((g) => g.c);
const ATIV = {
  passos: { nome: 'Passos do dia', campos: [['passos', 'Passos', ''], ['distancia_km', 'Distância', 'km'], ['kcal', 'Calorias', 'kcal']] },
  caminhada: { nome: 'Caminhada', campos: [['duracao_min', 'Duração', 'min'], ['distancia_km', 'Distância', 'km'], ['passos', 'Passos', ''], ['kcal', 'Calorias', 'kcal'], ['fc_media', 'FC média', 'bpm']] },
  corrida: { nome: 'Corrida', campos: [['duracao_min', 'Duração', 'min'], ['distancia_km', 'Distância', 'km'], ['passos', 'Passos', ''], ['kcal', 'Calorias', 'kcal'], ['fc_media', 'FC média', 'bpm']] },
  sono: { nome: 'Sono', campos: [['sono_total_h', 'Sono total', 'h'], ['sono_profundo_h', 'Profundo', 'h'], ['sono_leve_h', 'Leve', 'h'], ['sono_rem_h', 'REM', 'h'], ['acordado_min', 'Acordado', 'min']] }
};
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const porData = (a, b) => a.data < b.data ? -1 : a.data > b.data ? 1 : (a.id || 0) - (b.id || 0);

/* ---------- Navegação ---------- */
const ROTAS = {};
const ABA = { hoje: 'hoje', treino: 'treino', 'treino-det': 'treino', sessao: 'treino', editar: 'treino', dieta: 'dieta', medidas: 'medidas', 'medida-nova': 'medidas', diag: 'medidas', mais: 'mais', relogio: 'mais', perfil: 'mais', backup: 'mais', sobre: 'mais' };
function topo(titulo, voltar, acoes) {
  $('#titulo').textContent = titulo;
  const v = $('#voltar'); v.hidden = !voltar; v.innerHTML = UI.icon('back'); v.onclick = () => { location.hash = voltar; };
  const a = $('#top-acao'); a.innerHTML = '';
  (acoes || []).forEach(([ic, rot, fn]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'icon-btn'; b.setAttribute('aria-label', rot); b.title = rot; b.innerHTML = UI.icon(ic); b.onclick = fn; a.append(b); });
}
async function navegar() {
  const partes = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const r = ROTAS[partes[0]] ? partes[0] : 'hoje';
  $$('.tabs a').forEach((a) => { if (a.dataset.tab === ABA[r]) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const main = $('#main'); main.innerHTML = '';
  try { await ROTAS[r](main, ...partes.slice(1)); } catch (e) { console.error(e); main.innerHTML = `<div class="card"><h2>Algo deu errado</h2><p class="muted">${esc(e.message || e)}</p><a class="btn" href="#/hoje">Voltar ao início</a></div>`; }
  window.scrollTo(0, 0);
  atualizarPill();
}
window.addEventListener('hashchange', navegar);
window.addEventListener('scroll', () => $('.top').classList.toggle('sombra', window.scrollY > 4), { passive: true });

async function salvarSessao() { await DB.setCfg('sessao', App.sessao); }
async function ultimaMedida() { const ms = (await DB.all('medidas')).sort(porData); return { todas: ms, ult: ms[ms.length - 1] || null, pesoAtual: [...ms].reverse().find((m) => m.peso)?.peso || 80 }; }
const somar = (rows) => rows.reduce((t, r) => ({ kcal: t.kcal + (r.kcal || 0), p: t.p + (r.p || 0), c: t.c + (r.c || 0), g: t.g + (r.g || 0) }), { kcal: 0, p: 0, c: 0, g: 0 });
const letra = (id) => ['A', 'B', 'C', 'D'].includes(id) ? id : 'X';

/* ---------- HOJE ---------- */
ROTAS.hoje = async (el) => {
  topo('Hoje');
  const hoje = hojeISO();
  const [{ ult, pesoAtual, todas }, comidas, sessoes, ativ] = await Promise.all([ultimaMedida(), DB.porData('comidas', hoje), DB.entre('sessoes', addDias(hoje, -6), hoje), DB.porData('atividades', hoje)]);
  const metas = Calc.metas(App.perfil, pesoAtual);
  const t = somar(comidas);
  const primeiroNome = (App.perfil.nome || '').split(' ')[0];
  const ultimaSess = (await DB.all('sessoes')).sort(porData).pop();
  const idx = ultimaSess ? App.plano.findIndex((p) => p.id === ultimaSess.treino_id) : -1;
  const sug = App.plano[(idx + 1) % App.plano.length];
  const porDia = new Map(); sessoes.forEach((s) => porDia.set(s.data, s));
  const dias = Array.from({ length: 7 }, (_, i) => addDias(hoje, i - 6));
  const passos = ativ.filter((a) => a.tipo === 'passos').reduce((m, a) => Math.max(m, a.passos || 0), 0) || ativ.filter((a) => a.tipo !== 'sono').reduce((s, a) => s + (a.passos || 0), 0);
  const sono = ativ.filter((a) => a.tipo === 'sono').reduce((m, a) => Math.max(m, a.sono_total_h || 0), 0);
  const d = ult ? Calc.diagnostico(App.perfil, ult) : null;
  const ant = todas.length > 1 ? todas[todas.length - 2] : null;
  el.innerHTML = `
    <div><p class="muted small" style="text-transform:capitalize">${esc(dataLonga(hoje))}</p><h2 style="font-size:24px">Olá, ${esc(primeiroNome)}</h2></div>
    ${App.sessao ? `<a class="card" href="#/sessao" style="text-decoration:none;color:inherit;border-color:var(--accent)"><div class="row gap"><span class="tag ${letra(App.sessao.treino_id)}">${esc(App.sessao.treino_id)}</span><div class="grow"><h2>Treino em andamento</h2><p class="muted small">${esc(App.sessao.nome)} · toque para continuar</p></div>${UI.icon('right')}</div></a>` : ''}
    <section class="card" aria-label="Calorias de hoje">
      <div class="row between"><h2>Alimentação</h2><a class="linkbtn" href="#/dieta">Abrir dieta</a></div>
      <div class="row gap">${UI.ring(t.kcal, metas.kcal, fmt(t.kcal), 'de ' + fmt(metas.kcal) + ' kcal')}
        <div class="grow" style="display:flex;flex-direction:column;gap:10px">${UI.barra(t.p, metas.prot, 'Proteína', 'g')}${UI.barra(t.c, metas.carb, 'Carboidrato', 'g')}${UI.barra(t.g, metas.gord, 'Gordura', 'g')}</div></div>
      <p class="small ${t.kcal > metas.kcal ? 'warn' : 'muted'}">${t.kcal ? (t.kcal > metas.kcal ? `${fmt(t.kcal - metas.kcal)} kcal acima da meta` : `Restam ${fmt(metas.kcal - t.kcal)} kcal para hoje`) : 'Nada registrado hoje ainda.'}</p>
    </section>
    <section class="card" aria-label="Treino">
      <div class="row between"><h2>Treino</h2><a class="linkbtn" href="#/treino">Calendário</a></div>
      <div class="semana">${dias.map((x) => { const s = porDia.get(x); return `<div><i class="${s ? letra(s.treino_id) : ''} ${x === hoje ? 'hoje' : ''}">${s ? esc(s.treino_id) : ''}</i>${'DSTQQSS'[new Date(x + 'T12:00').getDay()]}</div>`; }).join('')}</div>
      <p class="small muted">${sessoes.length} de 4 treinos nos últimos 7 dias</p>
      ${!App.sessao && sug ? `<a class="btn block" href="#/treino-det/${encodeURIComponent(sug.id)}">${UI.icon('play')} Próximo: Treino ${esc(sug.id)} · ${esc(sug.nome)}</a>` : ''}
    </section>
    <section class="card" aria-label="Corpo">
      <div class="row between"><h2>Corpo</h2><a class="linkbtn" href="#/medidas">Medidas</a></div>
      ${d ? `<div class="grid3">
        <div class="stat"><span class="l">Peso</span><span class="v">${fmt(ult.peso, 1)}<small>kg</small></span><span class="s muted">${ant && ant.peso ? sinal(ult.peso - ant.peso, 1) + ' kg' : dataCurta(ult.data)}</span></div>
        <div class="stat"><span class="l">IMC</span><span class="v">${fmt(d.imc, 1)}</span><span class="s ${d.imcClasse ? d.imcClasse[1] : ''}">${d.imcClasse ? esc(d.imcClasse[0]) : ''}</span></div>
        <div class="stat"><span class="l">Cintura</span><span class="v">${fmt(ult.cintura)}<small>cm</small></span><span class="s ${ant && ant.cintura && ult.cintura < ant.cintura ? 'ok' : 'muted'}">${ant && ant.cintura ? sinal(ult.cintura - ant.cintura, 1) + ' cm' : ''}</span></div></div>
        <div class="row gap"><a class="btn soft grow" href="#/diag/${ult.id}">Diagnóstico</a><a class="btn ghost grow" href="#/medida-nova">Nova medida</a></div>`
        : `<a class="btn" href="#/medida-nova">Registrar primeira medida</a>`}
    </section>
    <section class="card" aria-label="Relógio">
      <div class="row between"><h2>Relógio</h2><a class="linkbtn" href="#/relogio">Registros</a></div>
      <div class="grid2"><div class="stat"><span class="l">Passos hoje</span><span class="v ${passos >= App.perfil.meta_passos ? 'ok' : ''}">${passos ? fmt(passos) : '—'}</span><span class="s muted">meta ${fmt(App.perfil.meta_passos)}</span></div>
      <div class="stat"><span class="l">Sono da noite</span><span class="v">${sono ? fmt(sono, 1) : '—'}<small>h</small></span><span class="s muted">meta ${fmt(App.perfil.meta_sono_h)} h</span></div></div>
      <button type="button" class="btn ghost" id="h-reg">${UI.icon('plus')} Registrar dados do relógio</button>
    </section>`;
  $('#h-reg').onclick = () => formAtividade(null, () => navegar());
};

/* ---------- TREINO ---------- */
ROTAS.treino = async (el) => {
  topo('Treino', null, [['edit', 'Editar plano de treino', () => { location.hash = '#/editar/' + (App.plano[0]?.id || 'A'); }]]);
  const sessoes = (await DB.all('sessoes')).sort(porData);
  const ultimoPor = {}; sessoes.forEach((s) => { ultimoPor[s.treino_id] = s.data; });
  el.innerHTML = `
    ${App.sessao ? `<a class="btn block" href="#/sessao">${UI.icon('play')} Continuar treino ${esc(App.sessao.treino_id)}</a>` : ''}
    <p class="sec">Escolha o treino</p>
    <div class="card flat" style="padding:4px 16px"><div class="list">${App.plano.map((t) => {
      const n = t.exercicios.filter((e) => !e.cardio).reduce((s, e) => s + Number(e.series || 0), 0);
      return `<a class="li" href="#/treino-det/${encodeURIComponent(t.id)}" style="text-decoration:none"><span class="tag ${letra(t.id)}">${esc(t.id)}</span><div class="grow"><div class="t">${esc(t.nome)}</div><div class="d">${t.exercicios.length} exercícios · ${n} séries${ultimoPor[t.id] ? ' · feito em ' + dataCurta(ultimoPor[t.id]) : ''}</div></div>${UI.icon('right')}</a>`;
    }).join('')}</div></div>
    <p class="sec">Calendário</p>
    <div class="card" id="cal-card"></div>
    <p class="sec">Últimos treinos</p>
    <div class="card flat" style="padding:4px 16px"><div class="list" id="hist">${sessoes.length ? '' : '<p class="muted pad small">Os treinos concluídos aparecem aqui e ganham um check no calendário.</p>'}</div></div>`;
  const hist = $('#hist');
  sessoes.slice(-12).reverse().forEach((s) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'li';
    const series = (s.exercicios || []).reduce((n, e) => n + (e.sets ? e.sets.length : 0), 0);
    b.innerHTML = `<span class="tag ${letra(s.treino_id)}">${esc(s.treino_id)}</span><div class="grow"><div class="t">${esc(s.treino_nome || 'Treino')}</div><div class="d">${dataBR(s.data)}${s.duracao_s ? ' · ' + hhmm(s.duracao_s) : ''}${series ? ' · ' + series + ' séries' : s.rapido ? ' · marcado como feito' : ''}</div></div>`;
    b.onclick = () => detalheSessao(s);
    hist.append(b);
  });
  if (!App.calMes) App.calMes = hojeISO().slice(0, 7);
  desenharCalendario($('#cal-card'), sessoes);
};

function desenharCalendario(box, sessoes) {
  const [a, m] = App.calMes.split('-').map(Number);
  const primeiro = new Date(a, m - 1, 1), diasMes = new Date(a, m, 0).getDate(), ini = primeiro.getDay();
  const por = new Map(); sessoes.forEach((s) => { if (!por.has(s.data)) por.set(s.data, []); por.get(s.data).push(s); });
  const hoje = hojeISO();
  const nome = primeiro.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const noMes = sessoes.filter((s) => s.data.startsWith(App.calMes)).length;
  let h = `<div class="cal-h"><button type="button" class="icon-btn" id="cal-ant" aria-label="Mês anterior">${UI.icon('left')}</button><div class="center"><h3>${esc(nome)}</h3><p class="small muted">${noMes} ${noMes === 1 ? 'treino' : 'treinos'} no mês</p></div><button type="button" class="icon-btn" id="cal-prox" aria-label="Próximo mês" style="margin-right:-8px">${UI.icon('right')}</button></div><div class="cal">`;
  'DSTQQSS'.split('').forEach((d) => { h += `<div class="dw">${d}</div>`; });
  for (let i = 0; i < ini; i++) h += '<div></div>';
  for (let d = 1; d <= diasMes; d++) {
    const iso = `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const ss = por.get(iso);
    h += `<button type="button" data-d="${iso}" class="${ss ? 'feito ' + letra(ss[0].treino_id) : ''} ${iso === hoje ? 'hoje' : ''}" aria-label="${d}${ss ? ', treino ' + ss.map((s) => s.treino_id).join(' e ') + ' feito' : ''}">${d}${ss ? `<svg class="ic ck" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>` : ''}</button>`;
  }
  h += '</div>';
  box.innerHTML = h;
  const mover = (n) => { const dt = new Date(a, m - 1 + n, 1); App.calMes = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`; desenharCalendario(box, sessoes); };
  $('#cal-ant', box).onclick = () => mover(-1); $('#cal-prox', box).onclick = () => mover(1);
  $$('.cal button', box).forEach((b) => { b.onclick = () => diaCalendario(b.dataset.d, por.get(b.dataset.d) || []); });
}

function diaCalendario(iso, ss) {
  UI.sheet(`<h3 style="text-transform:capitalize">${esc(dataLonga(iso))}</h3>
    ${ss.length ? `<div class="list">${ss.map((s, i) => `<button type="button" class="li" data-i="${i}"><span class="tag ${letra(s.treino_id)}">${esc(s.treino_id)}</span><div class="grow"><div class="t">${esc(s.treino_nome || 'Treino')}</div><div class="d">${s.duracao_s ? hhmm(s.duracao_s) : s.rapido ? 'marcado como feito' : ''}</div></div>${UI.icon('right')}</button>`).join('')}</div>` : '<p class="muted">Nenhum treino neste dia.</p>'}
    <p class="sec" style="margin:0">Iniciar treino com esta data</p>
    <div class="grid2">${App.plano.map((t) => `<button type="button" class="btn soft" data-ini="${esc(t.id)}"><span class="tag ${letra(t.id)}" style="width:22px;height:22px;font-size:12px">${esc(t.id)}</span>${esc(t.nome.split(' · ')[0])}</button>`).join('')}</div>
    <p class="sec" style="margin:0">Só marcar como feito</p>
    <div class="grid2">${App.plano.map((t) => `<button type="button" class="btn ghost" data-t="${esc(t.id)}">${UI.icon('check')} Treino ${esc(t.id)}</button>`).join('')}</div>`,
  (sh, close) => {
    $$('[data-i]', sh).forEach((b) => { b.onclick = () => { close(); detalheSessao(ss[b.dataset.i]); }; });
    $$('[data-t]', sh).forEach((b) => { b.onclick = async () => { const t = App.plano.find((x) => x.id === b.dataset.t); await DB.put('sessoes', { data: iso, treino_id: t.id, treino_nome: t.nome, rapido: true, exercicios: [] }); close(); UI.toast('Treino ' + t.id + ' marcado em ' + dataCurta(iso)); navegar(); }; });
    $$('[data-ini]', sh).forEach((b) => { b.onclick = () => { close(); App.dataInicio = iso; location.hash = '#/treino-det/' + encodeURIComponent(b.dataset.ini); }; });
  });
}

function detalheSessao(s) {
  const ex = (s.exercicios || []);
  const vol = ex.reduce((t, e) => t + (e.sets || []).reduce((a, x) => a + (x.kg || 0) * (x.reps || 0), 0), 0);
  UI.sheet(`<div class="row gap"><span class="tag ${letra(s.treino_id)}">${esc(s.treino_id)}</span><div><h3>${esc(s.treino_nome || 'Treino')}</h3><p class="small muted">${dataBR(s.data)}${s.duracao_s ? ' · ' + hhmm(s.duracao_s) : ''}${vol ? ' · volume ' + fmt(vol) + ' kg' : ''}</p></div></div>
    ${ex.length ? `<div class="list">${ex.map((e) => `<div class="li" style="cursor:default;align-items:flex-start"><div class="grow"><div class="t">${esc(e.nome)}</div><div class="d">${e.cardio ? (e.min ? fmt(e.min) + ' min' : 'feito') : (e.sets || []).map((x) => `${x.kg ? fmt(x.kg, 1) + ' kg × ' : ''}${x.reps || '?'}`).join(' · ') || 'não feito'}</div></div></div>`).join('')}</div>` : '<p class="muted">Treino marcado como feito, sem detalhes das séries.</p>'}
    ${s.obs ? `<p class="note">${esc(s.obs)}</p>` : ''}
    <div class="row gap"><button type="button" class="btn ghost grow" data-close>Fechar</button><button type="button" class="btn danger" id="ds-del">${UI.icon('trash')} Excluir</button></div>`,
  (sh, close) => { $('#ds-del', sh).onclick = async () => { close(); if (await UI.confirmar('Excluir este treino do histórico?', 'Excluir')) { await DB.del('sessoes', s.id); UI.toast('Treino excluído'); navegar(); } }; });
}

async function ultimasCargas() {
  const ss = (await DB.all('sessoes')).sort(porData);
  const m = {};
  ss.forEach((s) => (s.exercicios || []).forEach((e) => { if (e.sets && e.sets.length) m[e.nome] = { data: s.data, sets: e.sets }; }));
  return m;
}

ROTAS['treino-det'] = async (el, id) => {
  const t = App.plano.find((x) => x.id === id);
  if (!t) { location.hash = '#/treino'; return; }
  topo('Treino ' + t.id, '#/treino', [['edit', 'Editar este treino', () => { location.hash = '#/editar/' + encodeURIComponent(t.id); }]]);
  const cargas = await ultimasCargas();
  const data = App.dataInicio || hojeISO(); App.dataInicio = null;
  el.innerHTML = `
    <div class="row gap"><span class="tag ${letra(t.id)}" style="width:40px;height:40px;font-size:18px;border-radius:12px">${esc(t.id)}</span><div><h2 style="font-size:20px">${esc(t.nome)}</h2><p class="muted small">${t.exercicios.length} exercícios · cerca de ${Math.round(t.exercicios.reduce((s, e) => s + (e.cardio ? e.duracao_min * 60 : e.series * (45 + e.descanso_s)), 0) / 60)} min</p></div></div>
    <div class="card flat" style="padding:4px 16px"><div class="list">${t.exercicios.map((e, i) => {
      const u = cargas[e.nome];
      return `<div class="li" style="cursor:default"><div class="ex-n">${i + 1}</div><div class="grow"><div class="t">${esc(e.nome)}</div><div class="d">${e.cardio ? e.duracao_min + ' min' : `${e.series} × ${esc(e.reps)} · descanso ${mmss(e.descanso_s)}`}${u ? ` · última: ${u.sets.map((x) => x.kg ? fmt(x.kg, 1) : '').filter(Boolean).slice(-1)[0] || '—'} kg` : ''}</div></div></div>`;
    }).join('')}</div></div>
    <label class="field"><span>Data do treino</span><input type="date" id="td-data" value="${data}" max="${hojeISO()}"></label>
    <div class="sticky-foot"><button type="button" class="btn" id="td-ini">${UI.icon('play')} Iniciar treino</button></div>`;
  $('#td-ini').onclick = async () => {
    if (App.sessao && !(await UI.confirmar(`Há um treino ${App.sessao.treino_id} em andamento. Descartar e começar o ${t.id}?`, 'Descartar e começar'))) return;
    const dt = $('#td-data').value || hojeISO();
    App.sessao = {
      treino_id: t.id, nome: t.nome, data: dt, inicio: Date.now(), atual: 0,
      ex: t.exercicios.map((e) => {
        const u = cargas[e.nome];
        if (e.cardio) return { ...e, feito: false, min: e.duracao_min };
        return { ...e, sets: Array.from({ length: Number(e.series) || 1 }, (_, i) => { const p = u && (u.sets[i] || u.sets[u.sets.length - 1]); return { kg: '', reps: '', pkg: p ? p.kg : '', preps: p ? p.reps : String(e.reps).match(/\d+/)?.[0] || '', feito: false }; }) };
      })
    };
    await salvarSessao();
    Wake.on();
    location.hash = '#/sessao';
  };
};

ROTAS.sessao = async (el) => {
  const s = App.sessao;
  if (!s) { location.hash = '#/treino'; return; }
  topo('Treino ' + s.treino_id, '#/treino');
  Wake.on();
  const render = () => {
    const feitas = s.ex.reduce((n, e) => n + (e.cardio ? (e.feito ? 1 : 0) : e.sets.filter((x) => x.feito).length), 0);
    const total = s.ex.reduce((n, e) => n + (e.cardio ? 1 : e.sets.length), 0);
    el.innerHTML = `
      <div class="card"><div class="sess-top"><div><p class="small muted">${esc(s.nome)} · ${dataBR(s.data)}</p><div class="sess-clock" id="sess-clock">${mmss((Date.now() - s.inicio) / 1000)}</div></div>
        <div class="center"><div class="big">${feitas}<small>/${total}</small></div><p class="small muted">séries</p></div></div>
        <div class="mbar-t"><div style="width:${total ? feitas / total * 100 : 0}%"></div></div></div>
      ${s.ex.map((e, i) => exHTML(e, i, s.atual === i)).join('')}
      <label class="field"><span>Observação do treino</span><input type="text" id="ss-obs" maxlength="200" value="${esc(s.obs || '')}" placeholder="Ex.: dor no ombro, aumentar carga no supino"></label>
      <div class="sticky-foot"><button type="button" class="btn ghost" id="ss-cancel" style="flex:0 0 auto">Descartar</button><button type="button" class="btn" id="ss-fim">${UI.icon('check')} Concluir treino</button></div>`;
    bind();
  };
  const exHTML = (e, i, aberto) => {
    const done = e.cardio ? e.feito : e.sets.every((x) => x.feito);
    const head = `<button type="button" class="ex-h" data-tog="${i}" aria-expanded="${aberto}"><span class="ex-n">${done ? '✓' : i + 1}</span><div class="grow"><div class="t">${esc(e.nome)}</div><div class="d">${e.cardio ? e.duracao_min + ' min' : `${e.sets.length} × ${esc(e.reps)} · descanso ${mmss(e.descanso_s)}`}</div></div>${UI.icon(aberto ? 'left' : 'right')}</button>`;
    if (!aberto) return `<div class="ex ${done ? 'done' : ''}">${head}</div>`;
    if (e.cardio) return `<div class="ex ${done ? 'done' : ''}">${head}<div class="ex-b">
      <div class="row gap"><label class="field grow"><span>Minutos feitos</span><input type="number" inputmode="numeric" min="0" id="cd-min-${i}" value="${esc(e.min)}"></label></div>
      <div class="row gap"><button type="button" class="btn ghost grow" data-cardio="${i}">${UI.icon('timer')} Cronômetro ${e.duracao_min} min</button><button type="button" class="btn ${e.feito ? 'soft' : ''} grow" data-cfeito="${i}">${UI.icon('check')} ${e.feito ? 'Feito' : 'Marcar feito'}</button></div></div></div>`;
    return `<div class="ex ${done ? 'done' : ''}">${head}<div class="ex-b">
      <div class="set-h"><span>Série</span><span>Carga (kg)</span><span>Reps</span><span></span></div>
      ${e.sets.map((x, j) => `<div class="set ${x.feito ? 'feito' : ''}"><span class="sn">${j + 1}</span>
        <input type="number" inputmode="decimal" step="0.5" min="0" data-kg="${i}-${j}" value="${esc(x.kg)}" placeholder="${esc(x.pkg || '')}" aria-label="Carga da série ${j + 1}">
        <input type="number" inputmode="numeric" min="0" data-reps="${i}-${j}" value="${esc(x.reps)}" placeholder="${esc(x.preps || '')}" aria-label="Repetições da série ${j + 1}">
        <button type="button" class="okb" data-ok="${i}-${j}" aria-label="Concluir série ${j + 1}" aria-pressed="${x.feito}">${UI.icon('check')}</button></div>`).join('')}
      <div class="row between"><span class="ultima">${e.sets.some((x) => x.pkg) ? 'Em cinza: carga e repetições da última vez' : 'Meta: ' + esc(e.reps) + ' repetições'}</span><button type="button" class="linkbtn" data-desc="${i}">${UI.icon('timer')}</button></div>
      <div class="row gap"><button type="button" class="btn ghost sm" data-addset="${i}">+ Série</button>${e.sets.length > 1 ? `<button type="button" class="btn ghost sm" data-rmset="${i}">− Série</button>` : ''}</div></div></div>`;
  };
  const prox = (i) => { for (let k = i + 1; k < s.ex.length; k++) { const e = s.ex[k]; if (e.cardio ? !e.feito : e.sets.some((x) => !x.feito)) return k; } return -1; };
  const bind = () => {
    $$('[data-tog]', el).forEach((b) => { b.onclick = () => { const i = Number(b.dataset.tog); s.atual = s.atual === i ? -1 : i; salvarSessao(); render(); }; });
    $$('[data-kg],[data-reps]', el).forEach((inp) => { inp.onchange = () => { const [i, j] = (inp.dataset.kg || inp.dataset.reps).split('-').map(Number); s.ex[i].sets[j][inp.dataset.kg ? 'kg' : 'reps'] = inp.value; salvarSessao(); }; });
    $$('[data-ok]', el).forEach((b) => {
      b.onclick = () => {
        const [i, j] = b.dataset.ok.split('-').map(Number); const e = s.ex[i], x = e.sets[j];
        x.feito = !x.feito;
        if (x.feito) {
          if (x.kg === '' && x.pkg !== '') x.kg = String(x.pkg);
          if (x.reps === '' && x.preps !== '') x.reps = String(x.preps);
          navigator.vibrate && navigator.vibrate(30);
          const restam = e.sets.some((y) => !y.feito);
          let nxt;
          if (restam) nxt = `Próximo: ${e.nome}, série ${e.sets.findIndex((y) => !y.feito) + 1}`;
          else { const k = prox(i); if (k >= 0) { s.atual = k; nxt = 'Próximo: ' + s.ex[k].nome; } }
          if (nxt && e.descanso_s) Timer.iniciar(e.descanso_s, 'Descanso', nxt);
        }
        salvarSessao(); render();
      };
    });
    $$('[data-desc]', el).forEach((b) => { b.onclick = () => { const e = s.ex[Number(b.dataset.desc)]; Timer.iniciar(e.descanso_s || 60, 'Descanso', e.nome); }; });
    $$('[data-addset]', el).forEach((b) => { b.onclick = () => { const e = s.ex[Number(b.dataset.addset)]; const l = e.sets[e.sets.length - 1]; e.sets.push({ kg: '', reps: '', pkg: l.kg || l.pkg, preps: l.reps || l.preps, feito: false }); salvarSessao(); render(); }; });
    $$('[data-rmset]', el).forEach((b) => { b.onclick = () => { const e = s.ex[Number(b.dataset.rmset)]; e.sets.pop(); salvarSessao(); render(); }; });
    $$('[data-cardio]', el).forEach((b) => { b.onclick = () => { const e = s.ex[Number(b.dataset.cardio)]; Timer.iniciar(e.duracao_min * 60, 'Cardio · ' + e.nome, 'Ao terminar, marque como feito'); }; });
    $$('[data-cfeito]', el).forEach((b) => { b.onclick = () => { const i = Number(b.dataset.cfeito), e = s.ex[i]; e.feito = !e.feito; e.min = num($('#cd-min-' + i).value) ?? e.duracao_min; if (e.feito) { const k = prox(i); if (k >= 0) s.atual = k; } salvarSessao(); render(); }; });
    $$('[id^="cd-min-"]', el).forEach((inp) => { inp.onchange = () => { s.ex[Number(inp.id.slice(7))].min = num(inp.value); salvarSessao(); }; });
    $('#ss-obs').onchange = (ev) => { s.obs = ev.target.value; salvarSessao(); };
    $('#ss-cancel').onclick = async () => { if (await UI.confirmar('Descartar este treino? Nada será salvo.', 'Descartar')) { App.sessao = null; await salvarSessao(); Timer.parar(); Wake.off(); location.hash = '#/treino'; } };
    $('#ss-fim').onclick = concluir;
  };
  const concluir = async () => {
    const feitas = s.ex.reduce((n, e) => n + (e.cardio ? (e.feito ? 1 : 0) : e.sets.filter((x) => x.feito).length), 0);
    if (!feitas && !(await UI.confirmar('Nenhuma série foi marcada. Salvar mesmo assim como treino feito?', 'Salvar', false))) return;
    const fim = Date.now();
    const reg = {
      data: s.data, treino_id: s.treino_id, treino_nome: s.nome, inicio: s.inicio, fim, duracao_s: Math.round((fim - s.inicio) / 1000), obs: s.obs || '',
      exercicios: s.ex.map((e) => e.cardio ? { nome: e.nome, grupo: e.grupo, cardio: true, min: e.feito ? (e.min || e.duracao_min) : 0 } : { nome: e.nome, grupo: e.grupo, sets: e.sets.filter((x) => x.feito).map((x) => ({ kg: num(x.kg) || 0, reps: num(x.reps) || 0 })) })
    };
    await DB.put('sessoes', reg);
    App.sessao = null; await salvarSessao(); Timer.parar(); Wake.off();
    const vol = reg.exercicios.reduce((t, e) => t + (e.sets || []).reduce((a, x) => a + x.kg * x.reps, 0), 0);
    App.calMes = reg.data.slice(0, 7);
    location.hash = '#/treino';
    UI.sheet(`<div class="center" style="display:flex;flex-direction:column;gap:10px;align-items:center"><span class="tag ${letra(reg.treino_id)}" style="width:56px;height:56px;border-radius:50%;font-size:24px">✓</span><h3>Treino ${esc(reg.treino_id)} concluído</h3>
      <div class="grid3" style="width:100%"><div class="stat"><span class="l">Duração</span><span class="v">${Math.round(reg.duracao_s / 60)}<small>min</small></span></div><div class="stat"><span class="l">Séries</span><span class="v">${feitas}</span></div><div class="stat"><span class="l">Volume</span><span class="v">${fmt(vol)}<small>kg</small></span></div></div>
      <p class="muted small">O dia ${dataBR(reg.data)} ganhou um check no calendário.</p><button type="button" class="btn block" data-close>Fechar</button></div>`);
  };
  render();
};

/* Editor do plano */
ROTAS.editar = async (el, id) => {
  let idx = Math.max(0, App.plano.findIndex((x) => x.id === id));
  const plano = JSON.parse(JSON.stringify(App.plano));
  topo('Editar treinos', '#/treino');
  const DESC = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240];
  const render = () => {
    const t = plano[idx];
    el.innerHTML = `
      <div class="seg" role="group" aria-label="Treino">${plano.map((p, i) => `<button type="button" data-ti="${i}" aria-pressed="${i === idx}">${esc(p.id)}</button>`).join('')}</div>
      <label class="field"><span>Nome do treino ${esc(t.id)}</span><input id="ed-nome" value="${esc(t.nome)}" maxlength="40"></label>
      ${t.exercicios.map((e, i) => `<div class="card flat" data-ex="${i}">
        <div class="row gap"><span class="ex-n">${i + 1}</span><input class="inp grow" data-f="nome" value="${esc(e.nome)}" aria-label="Nome do exercício"></div>
        ${e.cardio ? `<label class="field"><span>Duração (min)</span><input type="number" inputmode="numeric" data-f="duracao_min" value="${esc(e.duracao_min)}"></label>`
          : `<div class="grid3"><label class="field"><span>Séries</span><input type="number" inputmode="numeric" min="1" data-f="series" value="${esc(e.series)}"></label><label class="field"><span>Repetições</span><input data-f="reps" value="${esc(e.reps)}"></label><label class="field"><span>Descanso</span><select data-f="descanso_s">${DESC.map((d) => `<option value="${d}" ${Number(e.descanso_s) === d ? 'selected' : ''}>${d ? mmss(d) : 'sem'}</option>`).join('')}</select></label></div>`}
        <div class="row gap end"><button type="button" class="btn ghost sm" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button><button type="button" class="btn ghost sm" data-down="${i}" ${i === t.exercicios.length - 1 ? 'disabled' : ''} aria-label="Descer">↓</button><button type="button" class="btn ghost sm" data-rm="${i}">${UI.icon('trash')} Remover</button></div></div>`).join('')}
      <div class="row gap"><button type="button" class="btn ghost grow" id="ed-add">${UI.icon('plus')} Exercício</button><button type="button" class="btn ghost grow" id="ed-addc">${UI.icon('plus')} Cardio</button></div>
      <div class="sticky-foot"><button type="button" class="btn" id="ed-salvar">Salvar alterações</button></div>`;
    $$('[data-ti]', el).forEach((b) => { b.onclick = () => { ler(); idx = Number(b.dataset.ti); render(); }; });
    $$('[data-up]', el).forEach((b) => { b.onclick = () => { ler(); const i = Number(b.dataset.up); const a = t.exercicios; [a[i - 1], a[i]] = [a[i], a[i - 1]]; render(); }; });
    $$('[data-down]', el).forEach((b) => { b.onclick = () => { ler(); const i = Number(b.dataset.down); const a = t.exercicios; [a[i + 1], a[i]] = [a[i], a[i + 1]]; render(); }; });
    $$('[data-rm]', el).forEach((b) => { b.onclick = () => { ler(); t.exercicios.splice(Number(b.dataset.rm), 1); render(); }; });
    $('#ed-add').onclick = () => { ler(); t.exercicios.push({ nome: 'Novo exercício', grupo: '', series: 3, reps: '10–12', descanso_s: 60 }); render(); window.scrollTo(0, document.body.scrollHeight); };
    $('#ed-addc').onclick = () => { ler(); t.exercicios.push({ nome: 'Cardio', grupo: 'Cardio', cardio: true, duracao_min: 15 }); render(); };
    $('#ed-salvar').onclick = async () => { ler(); if (plano.some((p) => p.exercicios.some((e) => !e.nome.trim()))) { UI.toast('Dê um nome a todos os exercícios.'); return; } App.plano = plano; await DB.setCfg('plano', plano); UI.toast('Plano salvo'); location.hash = '#/treino-det/' + encodeURIComponent(plano[idx].id); };
  };
  const ler = () => {
    const t = plano[idx]; const n = $('#ed-nome'); if (n) t.nome = n.value.trim() || t.nome;
    $$('[data-ex]', el).forEach((c) => { const e = t.exercicios[Number(c.dataset.ex)]; $$('[data-f]', c).forEach((inp) => { const f = inp.dataset.f; e[f] = ['series', 'descanso_s', 'duracao_min'].includes(f) ? (num(inp.value) ?? 0) : inp.value; }); });
  };
  render();
};

/* ---------- Timer de descanso ---------- */
const Timer = {
  fim: 0, total: 0, iv: null, ctx: null, acabou: false,
  iniciar(seg, rotulo, proximo) {
    try { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.ctx.resume(); } catch (e) { this.ctx = null; }
    this.total = seg; this.fim = Date.now() + seg * 1000; this.acabou = false;
    $('#timer-lbl').textContent = rotulo; $('#timer-next').textContent = proximo || '';
    $('#timer').classList.remove('fim'); $('#timer-pular').textContent = 'Pular descanso';
    try { localStorage.setItem('evolua-timer', JSON.stringify({ fim: this.fim, total: this.total, rotulo, proximo })); } catch (e) { /* opcional */ }
    this.abrir(); this.loop();
  },
  abrir() { $('#timer').hidden = false; $('#descanso-pill').hidden = true; },
  minimizar() { $('#timer').hidden = true; atualizarPill(); },
  loop() { clearInterval(this.iv); this.tick(); this.iv = setInterval(() => this.tick(), 250); },
  restante() { return (this.fim - Date.now()) / 1000; },
  tick() {
    const r = this.restante(); const c = 2 * Math.PI * 96;
    $('#timer-num').textContent = mmss(Math.ceil(Math.max(0, r)));
    const arc = $('#timer-arc'); arc.style.strokeDasharray = c; arc.style.strokeDashoffset = c * (1 - Math.max(0, r) / (this.total || 1));
    atualizarPill();
    if (r <= 0 && !this.acabou) this.terminar();
  },
  terminar() {
    this.acabou = true; clearInterval(this.iv);
    $('#timer').classList.add('fim'); $('#timer-lbl').textContent = 'Tempo!'; $('#timer-pular').textContent = 'Começar próxima série';
    try { navigator.vibrate && navigator.vibrate([400, 150, 400, 150, 400]); } catch (e) { /* opcional */ }
    this.bipe();
    try { localStorage.removeItem('evolua-timer'); } catch (e) { /* opcional */ }
    if ($('#timer').hidden) { UI.toast('Descanso terminado: hora da próxima série'); $('#descanso-pill').hidden = true; }
  },
  bipe() {
    if (!this.ctx) return;
    try { const t0 = this.ctx.currentTime; [0, 0.3, 0.6].forEach((d) => { const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(this.ctx.destination); g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.4, t0 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.22); o.start(t0 + d); o.stop(t0 + d + 0.25); }); } catch (e) { /* sem som */ }
  },
  somar(s) { if (this.acabou) return; this.fim += s * 1000; if (s > 0) this.total += s; this.tick(); },
  parar() { clearInterval(this.iv); this.fim = 0; this.acabou = true; $('#timer').hidden = true; $('#descanso-pill').hidden = true; try { localStorage.removeItem('evolua-timer'); } catch (e) { /* opcional */ } },
  restaurar() {
    try { const t = JSON.parse(localStorage.getItem('evolua-timer') || 'null'); if (t && t.fim > Date.now()) { this.fim = t.fim; this.total = t.total; this.acabou = false; $('#timer-lbl').textContent = t.rotulo; $('#timer-next').textContent = t.proximo || ''; this.loop(); this.minimizar(); } } catch (e) { /* opcional */ }
  }
};
function atualizarPill() {
  const p = $('#descanso-pill');
  if (!Timer.fim || Timer.acabou || !$('#timer').hidden) { p.hidden = true; return; }
  p.hidden = false; p.innerHTML = UI.icon('timer') + ' ' + mmss(Math.ceil(Timer.restante()));
}
$('#timer-mais').onclick = () => Timer.somar(15);
$('#timer-menos').onclick = () => Timer.somar(-15);
$('#timer-min').onclick = () => Timer.minimizar();
$('#timer-pular').onclick = () => Timer.parar();
$('#descanso-pill').onclick = () => Timer.abrir();

/* Mantém a tela acesa durante o treino */
const Wake = {
  lock: null,
  async on() { try { if ('wakeLock' in navigator && !this.lock) { this.lock = await navigator.wakeLock.request('screen'); this.lock.addEventListener('release', () => { this.lock = null; }); } } catch (e) { this.lock = null; } },
  async off() { try { if (this.lock) await this.lock.release(); } catch (e) { /* opcional */ } this.lock = null; }
};
document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (App.sessao) Wake.on(); if (Timer.fim && !Timer.acabou) Timer.tick(); } });
setInterval(() => { const c = $('#sess-clock'); if (c && App.sessao) c.textContent = mmss((Date.now() - App.sessao.inicio) / 1000); }, 1000);

/* ---------- DIETA ---------- */
ROTAS.dieta = async (el, dataParam) => {
  const dia = dataParam || App.diaDieta || hojeISO(); App.diaDieta = dia;
  topo('Dieta');
  const [comidas, { pesoAtual }] = await Promise.all([DB.porData('comidas', dia), ultimaMedida()]);
  const metas = Calc.metas(App.perfil, pesoAtual);
  const t = somar(comidas);
  const ehHoje = dia === hojeISO();
  el.innerHTML = `
    <div class="datebar"><button type="button" class="icon-btn" id="dd-ant" aria-label="Dia anterior">${UI.icon('left')}</button>
      <label class="d" for="dd-data">${ehHoje ? 'Hoje' : esc(dataLonga(dia))}<input type="date" id="dd-data" value="${dia}" style="position:absolute;opacity:0;width:1px;height:1px"></label>
      <button type="button" class="icon-btn" id="dd-prox" aria-label="Próximo dia" style="margin-right:-8px">${UI.icon('right')}</button></div>
    <section class="card"><div class="row gap">${UI.ring(t.kcal, metas.kcal, fmt(t.kcal), 'de ' + fmt(metas.kcal) + ' kcal')}
      <div class="grow" style="display:flex;flex-direction:column;gap:10px">${UI.barra(t.p, metas.prot, 'Proteína', 'g')}${UI.barra(t.c, metas.carb, 'Carboidrato', 'g')}${UI.barra(t.g, metas.gord, 'Gordura', 'g')}</div></div>
      <p class="small ${t.kcal > metas.kcal ? 'warn' : 'muted'}">${t.kcal ? (t.kcal > metas.kcal ? `${fmt(t.kcal - metas.kcal)} kcal acima da meta do dia` : `Restam ${fmt(metas.kcal - t.kcal)} kcal`) : 'Toque em "Adicionar" em uma refeição para registrar o que comeu.'}</p></section>
    ${REFEICOES.map((r) => { const it = comidas.filter((c) => c.refeicao === r); const k = somar(it).kcal; return `<section class="card meal"><div class="meal-h"><h3>${esc(r)}</h3><span class="k">${k ? fmt(k) + ' kcal' : ''}</span></div>
      ${it.map((c) => `<button type="button" class="food" data-c="${c.id}"><div class="grow"><div class="t">${esc(c.nome)}</div><div class="d">${esc(c.porcao_txt || fmt(c.gramas) + ' g')} · P ${fmt(c.p)} · C ${fmt(c.c)} · G ${fmt(c.g)}</div></div><span class="r">${fmt(c.kcal)}</span></button>`).join('')}
      <button type="button" class="linkbtn addfood" data-add="${esc(r)}">+ Adicionar</button></section>`; }).join('')}
    ${!comidas.length ? `<button type="button" class="btn ghost" id="dd-copiar">Copiar refeições do dia anterior</button>` : ''}
    <p class="note">Valores aproximados (Tabela TACO e Open Food Facts). Meta: GET − ${fmt(App.perfil.deficit_kcal)} kcal, proteína ${fmt(App.perfil.proteina_g_kg, 1)} g/kg.</p>`;
  const ir = (d) => { App.diaDieta = d; navegar(); };
  $('#dd-ant').onclick = () => ir(addDias(dia, -1));
  $('#dd-prox').onclick = () => ir(addDias(dia, 1));
  const di = $('#dd-data'); $('.datebar .d').onclick = (e) => { e.preventDefault(); try { di.showPicker(); } catch (x) { di.focus(); di.click(); } };
  di.onchange = () => { if (di.value) ir(di.value); };
  $$('[data-add]', el).forEach((b) => { b.onclick = () => buscarAlimento(dia, b.dataset.add); });
  $$('[data-c]', el).forEach((b) => { b.onclick = () => { const c = comidas.find((x) => String(x.id) === b.dataset.c); quantidade(c.base, { dia, refeicao: c.refeicao, edit: c }); }; });
  const cp = $('#dd-copiar'); if (cp) cp.onclick = async () => { const ont = await DB.porData('comidas', addDias(dia, -1)); if (!ont.length) { UI.toast('O dia anterior está vazio.'); return; } for (const c of ont) { const n = { ...c, data: dia }; delete n.id; await DB.put('comidas', n); } UI.toast(ont.length + ' itens copiados'); navegar(); };
};

async function recentes() {
  const rows = await DB.entre('comidas', addDias(hojeISO(), -45), addDias(hojeISO(), 1));
  const m = new Map(); rows.sort(porData).reverse().forEach((r) => { if (r.base && !m.has(r.nome)) m.set(r.nome, r.base); });
  return [...m.values()].slice(0, 25);
}

function linhaAlimento(f) { return `<div class="grow"><div class="t">${esc(f.n)}</div><div class="d">${esc(f.marca ? f.marca + ' · ' : '')}${fmt(f.k)} kcal · P ${fmt(f.p, 1)} · C ${fmt(f.h, 1)} · G ${fmt(f.g, 1)} <span class="muted">/100 g</span></div></div>`; }

async function buscarAlimento(dia, refeicao) {
  const [rec, meus] = await Promise.all([recentes(), DB.all('alimentos')]);
  let modo = 'tabela', resultados = [], pararCamExt = () => {};
  UI.sheet(`<div class="row between"><h3>${esc(refeicao)}</h3><button type="button" class="linkbtn" data-close>Fechar</button></div>
    <div class="seg" role="group" aria-label="Fonte"><button type="button" data-m="tabela" aria-pressed="true">Tabela</button><button type="button" data-m="internet" aria-pressed="false">Internet</button><button type="button" data-m="codigo" aria-pressed="false">Código</button><button type="button" data-m="meus" aria-pressed="false">Meus</button></div>
    <div id="ba-top"></div><div class="results" id="ba-res"></div>`,
  (sh, close) => {
    const top = $('#ba-top', sh), res = $('#ba-res', sh);
    const listar = (arr, vazio) => {
      res.innerHTML = '';
      if (!arr.length) { res.innerHTML = `<p class="muted small pad center">${esc(vazio)}</p>`; return; }
      arr.forEach((f) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'li'; b.innerHTML = linhaAlimento(f) + UI.icon('plus'); b.onclick = () => { close(); quantidade(f, { dia, refeicao }); }; res.append(b); });
    };
    const modoTabela = () => {
      top.innerHTML = `<input class="inp" id="ba-q" type="search" placeholder="Buscar: arroz, frango, banana…" autocomplete="off" aria-label="Buscar alimento">`;
      const q = $('#ba-q', top);
      const filtrar = () => { const t = semAcento(q.value.trim()); if (!t) { listar(rec.length ? rec : FOODS.slice(0, 30), ''); if (rec.length) res.insertAdjacentHTML('afterbegin', '<p class="sec" style="margin:4px 0">Recentes</p>'); return; } const ws = t.split(/\s+/); listar([...meus.map((m) => ({ ...m, fonte: 'Meus' })), ...FOODS].filter((f) => ws.every((w) => semAcento(f.n).includes(w))).slice(0, 60), 'Nada encontrado na tabela. Tente "Internet" ou crie em "Meus".'); };
      q.oninput = filtrar; filtrar(); setTimeout(() => q.focus(), 250);
    };
    const offMap = (p) => { const n = p.nutriments || {}; let k = n['energy-kcal_100g']; if (k == null && n.energy_100g != null) k = n.energy_100g / 4.184; if (k == null) return null; return { n: (p.product_name_pt || p.product_name || 'Produto sem nome').trim(), marca: (p.brands || '').split(',')[0], k: +k, p: +(n.proteins_100g || 0), h: +(n.carbohydrates_100g || 0), g: +(n.fat_100g || 0), q: p.serving_quantity ? [[`porção${p.serving_size ? ' (' + p.serving_size + ')' : ''}`, +p.serving_quantity]] : [], fonte: 'Open Food Facts', codigo: p.code }; };
    const CAMPOS_OFF = 'code,product_name,product_name_pt,brands,nutriments,serving_quantity,serving_size';
    const buscarJSON = async (url) => { const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 15000); try { const r = await fetch(url, { signal: ac.signal }); if (!r.ok) throw new Error('http ' + r.status); return await r.json(); } finally { clearTimeout(to); } };
    const modoInternet = () => {
      top.innerHTML = `<form id="ba-f" class="row gap"><input class="inp grow" id="ba-q" type="search" placeholder="Produto ou marca: iogurte grego, granola…" aria-label="Buscar na internet"><button class="btn" type="submit">${UI.icon('search')}</button></form>`;
      res.innerHTML = '<p class="muted small pad center">Busca na base aberta Open Food Facts, com produtos industrializados e marcas.</p>';
      $('#ba-f', top).onsubmit = async (e) => {
        e.preventDefault(); const q = $('#ba-q', top).value.trim(); if (!q) return;
        if (!navigator.onLine) { res.innerHTML = '<p class="muted small pad center">Sem internet agora. Use a aba Tabela.</p>'; return; }
        res.innerHTML = '<p class="muted small pad center">Buscando…</p>';
        try {
          const j = await buscarJSON(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=30&fields=${CAMPOS_OFF}&lc=pt&cc=br`);
          resultados = (j.products || []).map(offMap).filter(Boolean);
          listar(resultados, 'Nenhum produto com informação nutricional encontrado.');
        } catch (err) { res.innerHTML = '<p class="muted small pad center">Não foi possível buscar agora. Verifique a internet e tente de novo.</p>'; }
      };
      setTimeout(() => $('#ba-q', top).focus(), 250);
    };
    let stream = null;
    const pararCam = () => { if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } };
    const porCodigo = async (cod) => {
      res.innerHTML = '<p class="muted small pad center">Procurando o código ' + esc(cod) + '…</p>';
      try {
        const j = await buscarJSON(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cod)}.json?fields=${CAMPOS_OFF}`);
        const f = j && j.status === 1 ? offMap(j.product) : null;
        if (f) { pararCam(); close(); quantidade(f, { dia, refeicao }); } else res.innerHTML = '<p class="muted small pad center">Produto não encontrado. Cadastre em "Meus" com os dados do rótulo.</p>';
      } catch (err) { res.innerHTML = '<p class="muted small pad center">Sem conexão para buscar o código agora.</p>'; }
    };
    const modoCodigo = () => {
      const temCam = 'BarcodeDetector' in window && navigator.mediaDevices;
      top.innerHTML = `${temCam ? `<button type="button" class="btn block" id="ba-cam">${UI.icon('cam')} Ler código com a câmera</button><div class="scanbox" id="ba-scan" hidden><video id="ba-vid" playsinline muted></video></div>` : '<p class="note">Este navegador não lê código pela câmera. Digite os números do código de barras.</p>'}
        <form id="ba-f" class="row gap"><input class="inp grow" id="ba-cod" inputmode="numeric" pattern="[0-9]*" placeholder="7891234567890" aria-label="Código de barras"><button class="btn" type="submit">Buscar</button></form>`;
      res.innerHTML = '';
      $('#ba-f', top).onsubmit = (e) => { e.preventDefault(); const c = $('#ba-cod', top).value.replace(/\D/g, ''); if (c) porCodigo(c); };
      const cam = $('#ba-cam', top);
      if (cam) cam.onclick = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          const v = $('#ba-vid', top); v.srcObject = stream; await v.play(); $('#ba-scan', top).hidden = false; cam.hidden = true;
          const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
          const ler = async () => { if (!stream) return; try { const cs = await det.detect(v); if (cs.length) { navigator.vibrate && navigator.vibrate(60); porCodigo(cs[0].rawValue); return; } } catch (e) { /* tenta de novo */ } requestAnimationFrame(ler); };
          ler();
        } catch (e) { UI.toast('Não foi possível abrir a câmera.'); }
      };
    };
    const modoMeus = () => {
      top.innerHTML = `<button type="button" class="btn ghost block" id="ba-novo">${UI.icon('plus')} Cadastrar alimento pelo rótulo</button>`;
      listar(meus.map((m) => ({ ...m, fonte: 'Meus' })), 'Você ainda não cadastrou alimentos. Use o botão acima com os dados do rótulo.');
      $('#ba-novo', top).onclick = () => { close(); novoAlimento(dia, refeicao); };
    };
    pararCamExt = pararCam;
    const MODOS = { tabela: modoTabela, internet: modoInternet, codigo: modoCodigo, meus: modoMeus };
    $$('[data-m]', sh).forEach((b) => { b.onclick = () => { pararCam(); modo = b.dataset.m; $$('[data-m]', sh).forEach((x) => x.setAttribute('aria-pressed', x === b)); MODOS[modo](); }; });
    modoTabela();
  }, () => pararCamExt());
}

function novoAlimento(dia, refeicao) {
  UI.sheet(`<h3>Cadastrar alimento</h3><p class="note">Copie da tabela nutricional do rótulo. Os valores são da porção indicada.</p>
    <label class="field"><span>Nome</span><input id="na-n" maxlength="60" placeholder="Ex.: Pão integral marca X" autofocus></label>
    <div class="grid2"><label class="field"><span>Nome da porção</span><input id="na-pn" placeholder="fatia, unidade, pote…" value="porção"></label><label class="field"><span>Porção (g ou ml)</span><input id="na-pg" type="number" inputmode="decimal" value="100"></label></div>
    <div class="grid2"><label class="field"><span>Calorias (kcal)</span><input id="na-k" type="number" inputmode="decimal"></label><label class="field"><span>Proteína (g)</span><input id="na-p" type="number" inputmode="decimal"></label>
    <label class="field"><span>Carboidrato (g)</span><input id="na-h" type="number" inputmode="decimal"></label><label class="field"><span>Gordura (g)</span><input id="na-g" type="number" inputmode="decimal"></label></div>
    <button type="button" class="btn" id="na-ok">Salvar e usar</button>`,
  (sh, close) => {
    $('#na-ok', sh).onclick = async () => {
      const nome = $('#na-n', sh).value.trim(), pg = num($('#na-pg', sh).value), k = num($('#na-k', sh).value);
      if (!nome || !pg || k == null) { UI.toast('Preencha nome, porção e calorias.'); return; }
      const f = (v) => Math.round((num(v) || 0) / pg * 100 * 10) / 10;
      const ali = { n: nome, c: 'Meus', k: f($('#na-k', sh).value), p: f($('#na-p', sh).value), h: f($('#na-h', sh).value), g: f($('#na-g', sh).value), q: [[$('#na-pn', sh).value.trim() || 'porção', pg]] };
      ali.id = await DB.put('alimentos', ali); close(); quantidade({ ...ali, fonte: 'Meus' }, { dia, refeicao });
    };
  });
}

function quantidade(f, { dia, refeicao, edit }) {
  const porcoes = [['gramas', 1], ...(f.q || [])];
  let pi = edit ? Math.max(0, porcoes.findIndex((p) => p[0] === edit.porcao)) : (f.q && f.q.length ? 1 : 0);
  let qtd = edit ? edit.qtd : (pi === 0 ? 100 : 1);
  UI.sheet(`<div><h3>${esc(f.n)}</h3><p class="small muted">${esc(f.marca ? f.marca + ' · ' : '')}${esc(f.fonte || 'Tabela')} · ${fmt(f.k)} kcal em 100 g</p></div>
    <div class="qty"><label class="field"><span>Quantidade</span><input id="q-n" type="number" inputmode="decimal" min="0" step="any" value="${qtd}"></label>
    <label class="field"><span>Medida</span><select id="q-p">${porcoes.map((p, i) => `<option value="${i}" ${i === pi ? 'selected' : ''}>${esc(p[0])}${i ? ' (' + fmt(p[1], 1) + ' g)' : ''}</option>`).join('')}</select></label></div>
    <div class="macro4" id="q-m"></div>
    <label class="field"><span>Refeição</span><select id="q-r">${REFEICOES.map((r) => `<option ${r === refeicao ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></label>
    <div class="row gap">${edit ? `<button type="button" class="btn ghost" id="q-del" aria-label="Excluir">${UI.icon('trash')}</button>` : ''}<button type="button" class="btn grow" id="q-ok">${edit ? 'Salvar' : 'Adicionar'}</button></div>`,
  (sh, close) => {
    const calc = () => { const n = num($('#q-n', sh).value) || 0; const p = porcoes[Number($('#q-p', sh).value)]; const gr = n * p[1]; return { gr, n, p, kcal: f.k * gr / 100, pr: f.p * gr / 100, c: f.h * gr / 100, g: f.g * gr / 100 }; };
    const upd = () => { const r = calc(); $('#q-m', sh).innerHTML = `<div><b>${fmt(r.kcal)}</b><span>kcal</span></div><div><b>${fmt(r.pr, 1)}</b><span>prot. g</span></div><div><b>${fmt(r.c, 1)}</b><span>carb. g</span></div><div><b>${fmt(r.g, 1)}</b><span>gord. g</span></div>`; };
    $('#q-n', sh).oninput = upd;
    $('#q-p', sh).onchange = () => { const i = Number($('#q-p', sh).value); $('#q-n', sh).value = i === 0 ? Math.round(calc().gr || 100) : 1; upd(); };
    upd(); setTimeout(() => { const i = $('#q-n', sh); i.focus(); i.select(); }, 260);
    $('#q-ok', sh).onclick = async () => {
      const r = calc(); if (!r.gr) { UI.toast('Informe a quantidade.'); return; }
      const reg = { data: dia, refeicao: $('#q-r', sh).value, nome: f.n, fonte: f.fonte || 'Tabela', gramas: Math.round(r.gr * 10) / 10, qtd: r.n, porcao: r.p[0],
        porcao_txt: Number($('#q-p', sh).value) === 0 ? fmt(r.gr) + ' g' : `${fmt(r.n, 1)} ${r.p[0]} (${fmt(r.gr)} g)`,
        kcal: Math.round(r.kcal), p: Math.round(r.pr * 10) / 10, c: Math.round(r.c * 10) / 10, g: Math.round(r.g * 10) / 10,
        base: { n: f.n, marca: f.marca || '', k: f.k, p: f.p, h: f.h, g: f.g, q: f.q || [], fonte: f.fonte || 'Tabela' } };
      if (edit) reg.id = edit.id;
      await DB.put('comidas', reg); close(); UI.toast(edit ? 'Alterado' : `${fmt(reg.kcal)} kcal adicionadas em ${reg.refeicao}`); App.diaDieta = dia;
      if (location.hash.startsWith('#/dieta')) navegar(); else location.hash = '#/dieta';
    };
    const d = $('#q-del', sh); if (d) d.onclick = async () => { await DB.del('comidas', edit.id); close(); UI.toast('Item removido'); navegar(); };
  });
}

/* ---------- MEDIDAS ---------- */
ROTAS.medidas = async (el) => {
  topo('Medidas', null, [['plus', 'Nova avaliação', () => { location.hash = '#/medida-nova'; }]]);
  const { todas, ult } = await ultimaMedida();
  if (!ult) { el.innerHTML = `<div class="card empty"><p>Nenhuma avaliação ainda.</p><a class="btn" href="#/medida-nova">Registrar medidas</a></div>`; return; }
  const ds = todas.map((m) => ({ m, d: Calc.diagnostico(App.perfil, m) }));
  const d = ds[ds.length - 1].d;
  el.innerHTML = `
    <section class="card"><div class="row between"><div><h2>Última avaliação</h2><p class="small muted">${dataBR(ult.data)}</p></div><a class="btn soft sm" href="#/diag/${ult.id}">Diagnóstico</a></div>
      <div class="grid2"><div class="stat"><span class="l">Peso</span><span class="v">${fmt(ult.peso, 1)}<small>kg</small></span><span class="s ${d.imcClasse ? d.imcClasse[1] : ''}">IMC ${fmt(d.imc, 1)}</span></div>
      <div class="stat"><span class="l">Cintura</span><span class="v">${fmt(ult.cintura)}<small>cm</small></span><span class="s ${d.cinturaClasse ? d.cinturaClasse[1] : ''}">${d.cinturaClasse ? esc(d.cinturaClasse[0]) : ''}</span></div>
      <div class="stat"><span class="l">Gordura (${esc(d.gordMetodo)})</span><span class="v">${fmt(d.gord, 1)}<small>%</small></span><span class="s ${d.gordClasse ? d.gordClasse[1] : ''}">${d.gordClasse ? esc(d.gordClasse[0]) : ''}</span></div>
      <div class="stat"><span class="l">Massa magra</span><span class="v">${fmt(d.massaMagra, 1)}<small>kg</small></span><span class="s muted">estimada</span></div></div>
      <a class="btn block" href="#/medida-nova">${UI.icon('plus')} Nova avaliação</a></section>
    <p class="sec">Evolução</p>
    <section class="card"><div class="seg" role="group" aria-label="Gráfico"><button type="button" data-g="peso" aria-pressed="true">Peso</button><button type="button" data-g="cintura" aria-pressed="false">Cintura</button><button type="button" data-g="gord" aria-pressed="false">Gordura</button><button type="button" data-g="imc" aria-pressed="false">IMC</button></div><div id="m-ch"></div></section>
    <p class="sec">Avaliações</p>
    <div class="card flat" style="padding:4px 16px"><div class="list">${[...ds].reverse().map(({ m, d: x }) => `<a class="li" href="#/diag/${m.id}" style="text-decoration:none"><div class="grow"><div class="t">${dataBR(m.data)}</div><div class="d">${m.peso ? fmt(m.peso, 1) + ' kg' : ''}${m.cintura ? ' · cintura ' + fmt(m.cintura) + ' cm' : ''}${x.gord != null ? ' · ' + fmt(x.gord, 1) + '% gordura' : ''}</div></div>${UI.icon('right')}</a>`).join('')}</div></div>`;
  const G = {
    peso: () => UI.linha(ds.map(({ m }) => ({ x: m.data, y: m.peso })), { unidade: ' kg', dec: 1, ref: d.pesoMax, refRot: 'IMC 25' }),
    cintura: () => UI.linha(ds.map(({ m }) => ({ x: m.data, y: m.cintura })), { unidade: ' cm', dec: 0, ref: Calc.cinturaLimites(App.perfil.sexo)[0], refRot: 'risco' }),
    gord: () => UI.linha(ds.map(({ m, d: x }) => ({ x: m.data, y: x.gord })), { unidade: '%', dec: 1, ref: d.gordFaixa ? d.gordFaixa[1] : null, refRot: 'limite' }),
    imc: () => UI.linha(ds.map(({ m, d: x }) => ({ x: m.data, y: x.imc })), { dec: 1, ref: 25, refRot: '25' })
  };
  const show = (k) => { $('#m-ch').innerHTML = G[k](); $$('[data-g]', el).forEach((b) => b.setAttribute('aria-pressed', b.dataset.g === k)); };
  $$('[data-g]', el).forEach((b) => { b.onclick = () => show(b.dataset.g); });
  show('peso');
};

ROTAS['medida-nova'] = async (el, id) => {
  const { todas, ult } = await ultimaMedida();
  const edit = id ? todas.find((m) => String(m.id) === id) : null;
  topo(edit ? 'Editar avaliação' : 'Nova avaliação', edit ? '#/diag/' + edit.id : '#/medidas');
  const base = edit || {};
  el.innerHTML = `
    <label class="field"><span>Data da avaliação</span><input type="date" id="mf-data" value="${edit ? edit.data : hojeISO()}" max="${hojeISO()}"></label>
    <p class="note">Deixe em branco o que não mediu. Os valores em cinza são da última avaliação. Pescoço é opcional e deixa a estimativa de gordura mais precisa.</p>
    ${MEDIDAS_CAMPOS.map((g) => `<p class="sec">${esc(g.g)}</p><div class="card flat"><div class="mgrid">${g.c.map(([k, l, u]) => `<label class="field"><span>${esc(l)} (${u})</span><input type="number" inputmode="decimal" step="0.1" min="0" data-k="${k}" value="${base[k] ?? ''}" placeholder="${ult && ult[k] != null && !edit ? esc(String(ult[k]).replace('.', ',')) : ''}"></label>`).join('')}</div></div>`).join('')}
    <label class="field"><span>Observação</span><input id="mf-obs" maxlength="200" value="${esc(base.obs || '')}" placeholder="Ex.: medido em jejum, de manhã"></label>
    <div class="sticky-foot"><button type="button" class="btn" id="mf-ok">Salvar e ver diagnóstico</button></div>`;
  $('#mf-ok').onclick = async () => {
    const m = { data: $('#mf-data').value || hojeISO(), obs: $('#mf-obs').value.trim() };
    let n = 0; $$('[data-k]', el).forEach((i) => { const v = num(i.value); if (v != null && v > 0) { m[i.dataset.k] = v; n++; } });
    if (!n) { UI.toast('Preencha pelo menos uma medida.'); return; }
    if (edit) m.id = edit.id;
    const novo = await DB.put('medidas', m);
    UI.toast('Avaliação salva'); location.hash = '#/diag/' + novo;
  };
};

ROTAS.diag = async (el, id) => {
  const { todas } = await ultimaMedida();
  const i = todas.findIndex((m) => String(m.id) === id);
  if (i < 0) { location.hash = '#/medidas'; return; }
  const m = todas[i], ant = i > 0 ? todas[i - 1] : null, P = App.perfil;
  const d = Calc.diagnostico(P, m);
  topo('Diagnóstico', '#/medidas', [['edit', 'Editar avaliação', () => { location.hash = '#/medida-nova/' + m.id; }], ['trash', 'Excluir avaliação', async () => { if (await UI.confirmar('Excluir a avaliação de ' + dataBR(m.data) + '?', 'Excluir')) { await DB.del('medidas', m.id); UI.toast('Avaliação excluída'); location.hash = '#/medidas'; } }]]);
  const chip = (c) => c ? `<span class="chip ${c[1]}">${esc(c[0])}</span>` : '';
  const resumo = [];
  if (d.imc) resumo.push(`<li><b>IMC ${fmt(d.imc, 1)}</b> ${chip(d.imcClasse)} Peso saudável para ${fmt(P.altura_cm / 100, 2)} m: ${fmt(d.pesoMin, 1)} a ${fmt(d.pesoMax, 1)} kg.</li>`);
  if (m.cintura) resumo.push(`<li><b>Cintura ${fmt(m.cintura)} cm</b> ${chip(d.cinturaClasse)} ${ant && ant.cintura ? `${sinal(m.cintura - ant.cintura, 1)} cm desde ${dataCurta(ant.data)}.` : ''}</li>`);
  if (d.rce) resumo.push(`<li><b>Cintura/altura ${fmt(d.rce, 2)}</b> ${chip(d.rceClasse)} Alvo: cintura abaixo de ${fmt(d.cinturaAlvo, 1)} cm.</li>`);
  if (d.gord != null) resumo.push(`<li><b>Gordura ${fmt(d.gord, 1)}%</b> ${chip(d.gordClasse)} Faixa saudável para ${d.idade} anos: ${d.gordFaixa[0]} a ${d.gordFaixa[1]}%.</li>`);
  if (d.metas) resumo.push(`<li><b>Meta diária ${fmt(d.metas.kcal)} kcal</b> para perder cerca de ${fmt(d.metas.perda_sem_g)} g por semana.</li>`);
  const pos = (v, a, b) => Math.max(0, Math.min(100, (v - a) / (b - a) * 100));
  const comp = TODOS_CAMPOS.filter(([k]) => m[k] != null || (ant && ant[k] != null));
  const pares = [['braco', 'Braço'], ['antebraco', 'Antebraço'], ['coxa', 'Coxa'], ['panturrilha', 'Panturrilha']].filter(([k]) => m[k + '_d'] && m[k + '_e']);
  const assim = pares.filter(([k]) => Math.abs(m[k + '_d'] - m[k + '_e']) >= 1);
  el.innerHTML = `
    <div><p class="small muted">Avaliação de ${dataBR(m.data)} · ${d.idade} anos · ${fmt(P.altura_cm)} cm</p></div>
    <section class="card"><h2>Resumo</h2><ul class="ul">${resumo.join('')}</ul></section>
    ${d.imc ? `<section class="card"><h2>IMC · Índice de Massa Corporal</h2><p class="note">Peso ÷ altura². Faixas da OMS. Não diferencia músculo de gordura, por isso é lido junto com cintura e % de gordura.</p>
      <div class="diag-line"><span class="big">${fmt(d.imc, 1)}</span>${chip(d.imcClasse)}</div>
      <div class="gauge">${[['#7FB5D9', 15, 18.5], ['var(--ok)', 18.5, 25], ['var(--gold)', 25, 30], ['#D9773A', 30, 35], ['var(--bad)', 35, 45]].map(([c, a, b]) => `<span style="background:${c};flex:${b - a}"></span>`).join('')}
        <i class="mk" style="left:${pos(d.imc, 15, 45)}%"></i>${[18.5, 25, 30, 35, 40].map((v) => `<span class="lb" style="left:${pos(v, 15, 45)}%;flex:none;background:none">${fmt(v, 1)}</span>`).join('')}</div></section>` : ''}
    ${m.cintura ? `<section class="card"><h2>Gordura abdominal</h2><p class="note">Cintura (OMS/IDF: risco a partir de ${Calc.cinturaLimites(P.sexo)[0]} cm e muito aumentado a partir de ${Calc.cinturaLimites(P.sexo)[1]} cm para ${P.sexo === 'F' ? 'mulheres' : 'homens'}) e relação cintura/altura (ideal abaixo de 0,50).</p>
      <div class="grid2"><div class="stat"><span class="l">Cintura</span><span class="v">${fmt(m.cintura)}<small>cm</small></span>${chip(d.cinturaClasse)}</div><div class="stat"><span class="l">Cintura/altura</span><span class="v">${fmt(d.rce, 2)}</span>${chip(d.rceClasse)}</div></div></section>` : ''}
    ${d.gord != null ? `<section class="card"><h2>Composição corporal</h2><p class="note">${d.navy != null ? 'Fórmula da Marinha dos EUA (cintura, pescoço e altura).' : 'Fórmula RFM (Woolcott & Bergman, 2018), só com altura e cintura. Informe o pescoço para usar também a fórmula da Marinha dos EUA.'} É estimativa: bioimpedância ou DEXA dão o valor medido.</p>
      <div class="grid3"><div class="stat"><span class="l">Gordura</span><span class="v">${fmt(d.gord, 1)}<small>%</small></span>${chip(d.gordClasse)}</div><div class="stat"><span class="l">Massa gorda</span><span class="v">${fmt(d.massaGorda, 1)}<small>kg</small></span></div><div class="stat"><span class="l">Massa magra</span><span class="v">${fmt(d.massaMagra, 1)}<small>kg</small></span></div></div>
      ${d.navy != null && d.rfm != null ? `<p class="small muted">Pela RFM: ${fmt(d.rfm, 1)}%.</p>` : ''}</section>` : ''}
    ${d.metas ? `<section class="card"><h2>Gasto energético</h2><p class="note">TMB é o gasto em repouso; GET é o gasto total do dia (TMB × fator de atividade ${fmt(P.fator_atividade, 3)}).</p>
      <div class="list">
        <div class="li" style="cursor:default"><div class="grow"><div class="t">TMB · Mifflin-St Jeor</div><div class="d">referência principal</div></div><span class="r"><b>${fmt(d.tmbMifflin)}</b> kcal</span></div>
        <div class="li" style="cursor:default"><div class="grow"><div class="t">TMB · Harris-Benedict revisada</div></div><span class="r">${fmt(d.tmbHarris)} kcal</span></div>
        ${d.tmbKatch ? `<div class="li" style="cursor:default"><div class="grow"><div class="t">TMB · Katch-McArdle</div><div class="d">usa a massa magra</div></div><span class="r">${fmt(d.tmbKatch)} kcal</span></div>` : ''}
        <div class="li" style="cursor:default"><div class="grow"><div class="t">GET · gasto total</div></div><span class="r"><b>${fmt(d.metas.get)}</b> kcal</span></div>
        <div class="li" style="cursor:default"><div class="grow"><div class="t">Meta da dieta</div><div class="d">GET − ${fmt(P.deficit_kcal)} kcal</div></div><span class="r"><b class="ok">${fmt(d.metas.kcal)}</b> kcal</span></div></div>
      <div class="macro4"><div><b>${fmt(d.metas.prot)}</b><span>proteína g</span></div><div><b>${fmt(d.metas.carb)}</b><span>carbo g</span></div><div><b>${fmt(d.metas.gord)}</b><span>gordura g</span></div><div><b>${fmt(d.metas.agua_l, 1)}</b><span>água L</span></div></div></section>` : ''}
    ${comp.length ? `<section class="card"><h2>${ant ? 'Comparação com ' + dataBR(ant.data) : 'Medidas'}</h2><div style="overflow-x:auto"><table class="cmp"><thead><tr><th>Medida</th>${ant ? '<th class="n">Antes</th>' : ''}<th class="n">Agora</th>${ant ? '<th class="n">Dif.</th>' : ''}</tr></thead><tbody>
      ${comp.map(([k, l, u]) => { const a = ant ? ant[k] : null, v = m[k]; const df = a != null && v != null ? v - a : null; const bomBaixo = ['peso', 'cintura', 'abdomen', 'quadril'].includes(k); const cls = df == null || df === 0 ? 'muted' : (df < 0) === bomBaixo ? 'ok' : 'warn'; return `<tr><td>${esc(l)}</td>${ant ? `<td class="n">${a != null ? fmt(a, 1) : '—'}</td>` : ''}<td class="n">${v != null ? fmt(v, 1) + ' ' + u : '—'}</td>${ant ? `<td class="n ${cls}">${df != null ? sinal(df, 1) : '—'}</td>` : ''}</tr>`; }).join('')}
      </tbody></table></div>${ant ? '<p class="note">Verde: mudança favorável (menos cintura e peso, mais músculo nos membros).</p>' : ''}</section>` : ''}
    ${pares.length ? `<section class="card"><h2>Simetria</h2><p>${assim.length ? `Diferença de 1 cm ou mais entre os lados em: ${assim.map(([k, l]) => `<b>${esc(l)}</b> (${fmt(Math.abs(m[k + '_d'] - m[k + '_e']), 1)} cm)`).join(', ')}. Vale incluir exercícios unilaterais.` : 'Lados direito e esquerdo equilibrados (diferença menor que 1 cm).'}</p></section>` : ''}
    ${m.obs ? `<p class="note">Obs.: ${esc(m.obs)}</p>` : ''}
    <section class="card"><h2>Referências</h2><p class="note">Os cálculos são feitos no aparelho e funcionam sem internet. Para saber mais:</p>
      <div class="list"><a class="li" href="https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight" target="_blank" rel="noopener">OMS · obesidade e sobrepeso${UI.icon('right')}</a><a class="li" href="https://abeso.org.br/diretrizes/" target="_blank" rel="noopener">ABESO · diretrizes brasileiras de obesidade${UI.icon('right')}</a><a class="li" href="https://pubmed.ncbi.nlm.nih.gov/30029216/" target="_blank" rel="noopener">RFM · Woolcott & Bergman, 2018${UI.icon('right')}</a><a class="li" href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener">Mifflin-St Jeor, 1990${UI.icon('right')}</a></div></section>
    <p class="note">Estimativas a partir de medidas e equações de referência. Não substituem avaliação de médico e nutricionista.</p>`;
};

/* ---------- MAIS ---------- */
ROTAS.mais = async (el) => {
  topo('Mais');
  const tema = (() => { try { return localStorage.getItem('evolua-tema') || 'auto'; } catch (e) { return 'auto'; } })();
  const ultBk = await DB.cfg('ultimoBackup');
  el.innerHTML = `
    <div class="card flat" style="padding:4px 16px"><div class="list">
      <a class="li" href="#/relogio">${UI.icon('watch')}<div class="grow"><div class="t">Relógio</div><div class="d">Passos, sono, caminhadas e corridas</div></div>${UI.icon('right')}</a>
      <a class="li" href="#/perfil">${UI.icon('edit')}<div class="grow"><div class="t">Perfil e metas</div><div class="d">Altura, atividade, déficit e macros</div></div>${UI.icon('right')}</a>
      <a class="li" href="#/editar/A">${UI.icon('treino')}<div class="grow"><div class="t">Editar plano de treino</div><div class="d">Exercícios, séries e descanso</div></div>${UI.icon('right')}</a>
      <a class="li" href="#/backup">${UI.icon('check')}<div class="grow"><div class="t">Backup dos dados</div><div class="d">${ultBk ? 'Último: ' + dataBR(ultBk.slice(0, 10)) : 'Nenhum backup ainda'}</div></div>${UI.icon('right')}</a>
      <a class="li" href="#/sobre">${UI.icon('search')}<div class="grow"><div class="t">Sobre e referências</div></div>${UI.icon('right')}</a>
    </div></div>
    <section class="card"><h2>Aparência</h2><div class="seg" role="group" aria-label="Tema">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(([k, l]) => `<button type="button" data-tema="${k}" aria-pressed="${tema === k}">${l}</button>`).join('')}</div></section>
    <section class="card" id="inst"><h2>Instalar no celular</h2>
      ${App.instalar ? `<p class="note">Adicione o Evolua à tela inicial para abrir como um aplicativo, mesmo sem internet.</p><button type="button" class="btn" id="inst-btn">Instalar app</button>`
        : window.matchMedia('(display-mode: standalone)').matches ? '<p class="note ok">O app já está instalado neste aparelho.</p>'
        : '<p class="note"><b>Android (Chrome):</b> menu ⋮ → Instalar app ou Adicionar à tela inicial.<br><b>iPhone (Safari):</b> botão Compartilhar → Adicionar à Tela de Início.</p>'}</section>`;
  $$('[data-tema]', el).forEach((b) => { b.onclick = () => { aplicarTema(b.dataset.tema); try { localStorage.setItem('evolua-tema', b.dataset.tema); } catch (e) { /* opcional */ } $$('[data-tema]', el).forEach((x) => x.setAttribute('aria-pressed', x === b)); }; });
  const ib = $('#inst-btn'); if (ib) ib.onclick = async () => { App.instalar.prompt(); await App.instalar.userChoice; App.instalar = null; navegar(); };
};
function aplicarTema(t) { if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }

ROTAS.perfil = async (el) => {
  topo('Perfil e metas', '#/mais');
  const P = App.perfil;
  el.innerHTML = `
    <div class="card flat">
      <label class="field"><span>Nome</span><input id="pf-nome" value="${esc(P.nome)}" maxlength="60"></label>
      <div class="grid2"><label class="field"><span>Nascimento</span><input type="date" id="pf-nasc" value="${esc(P.nascimento)}"></label>
      <label class="field"><span>Sexo</span><select id="pf-sexo"><option value="M" ${P.sexo === 'M' ? 'selected' : ''}>Masculino</option><option value="F" ${P.sexo === 'F' ? 'selected' : ''}>Feminino</option></select></label></div>
      <label class="field"><span>Altura (cm)</span><input type="number" inputmode="decimal" id="pf-alt" value="${P.altura_cm}"></label>
      <label class="field"><span>Nível de atividade</span><select id="pf-fa">${Calc.FATORES.map(([v, l]) => `<option value="${v}" ${Number(P.fator_atividade) === v ? 'selected' : ''}>${esc(l)} · ${fmt(v, 3)}</option>`).join('')}</select></label></div>
    <p class="sec">Dieta</p>
    <div class="card flat">
      <div class="grid2"><label class="field"><span>Déficit diário (kcal)</span><input type="number" inputmode="numeric" id="pf-def" value="${P.deficit_kcal}"></label>
      <label class="field"><span>Proteína (g por kg)</span><input type="number" inputmode="decimal" step="0.1" id="pf-prot" value="${P.proteina_g_kg}"></label>
      <label class="field"><span>Gordura (% das kcal)</span><input type="number" inputmode="numeric" id="pf-gord" value="${Math.round(P.gordura_pct * 100)}"></label>
      <label class="field"><span>Água (ml por kg)</span><input type="number" inputmode="numeric" id="pf-agua" value="${P.agua_ml_kg}"></label></div>
      <p class="note">Déficit de 300 a 500 kcal leva a uma perda gradual. Use 0 para manter o peso.</p></div>
    <p class="sec">Relógio e atividade</p>
    <div class="card flat"><div class="grid3"><label class="field"><span>Passos/dia</span><input type="number" inputmode="numeric" id="pf-passos" value="${P.meta_passos}"></label>
      <label class="field"><span>Sono (h)</span><input type="number" inputmode="decimal" step="0.5" id="pf-sono" value="${P.meta_sono_h}"></label>
      <label class="field"><span>Cardio/sem (min)</span><input type="number" inputmode="numeric" id="pf-cardio" value="${P.meta_cardio_min}"></label></div></div>
    <div class="card" id="pf-prev"></div>
    <div class="sticky-foot"><button type="button" class="btn" id="pf-ok">Salvar</button></div>`;
  const ler = () => ({ ...P, nome: $('#pf-nome').value.trim() || P.nome, nascimento: $('#pf-nasc').value || P.nascimento, sexo: $('#pf-sexo').value, altura_cm: num($('#pf-alt').value) || P.altura_cm, fator_atividade: Number($('#pf-fa').value),
    deficit_kcal: num($('#pf-def').value) ?? P.deficit_kcal, proteina_g_kg: num($('#pf-prot').value) || P.proteina_g_kg, gordura_pct: (num($('#pf-gord').value) || 30) / 100, agua_ml_kg: num($('#pf-agua').value) || 35,
    meta_passos: num($('#pf-passos').value) || 8000, meta_sono_h: num($('#pf-sono').value) || 7, meta_cardio_min: num($('#pf-cardio').value) || 150 });
  const { pesoAtual } = await ultimaMedida();
  const prev = () => { const x = Calc.metas(ler(), pesoAtual); $('#pf-prev').innerHTML = `<h2>Suas metas com ${fmt(pesoAtual, 1)} kg</h2><div class="macro4"><div><b>${fmt(x.kcal)}</b><span>kcal</span></div><div><b>${fmt(x.prot)}</b><span>prot. g</span></div><div><b>${fmt(x.carb)}</b><span>carb. g</span></div><div><b>${fmt(x.gord)}</b><span>gord. g</span></div></div><p class="note">TMB ${fmt(x.tmb)} · GET ${fmt(x.get)} kcal · perda de cerca de ${fmt(x.perda_sem_g)} g por semana.</p>`; };
  $$('input,select', el).forEach((i) => i.addEventListener('input', prev)); prev();
  $('#pf-ok').onclick = async () => { App.perfil = ler(); await DB.setCfg('perfil', App.perfil); UI.toast('Perfil salvo'); location.hash = '#/mais'; };
};

/* Relógio: passos, sono e atividades */
ROTAS.relogio = async (el) => {
  topo('Relógio', '#/mais', [['plus', 'Novo registro', () => formAtividade(null, () => navegar())]]);
  const hoje = hojeISO(), d14 = Array.from({ length: 14 }, (_, i) => addDias(hoje, i - 13)), d7 = d14.slice(7);
  const todos = (await DB.all('atividades')).sort(porData).reverse();
  const mapa = (tipo, campo, agg) => { const m = new Map(); todos.filter((a) => (Array.isArray(tipo) ? tipo.includes(a.tipo) : a.tipo === tipo) && a[campo] != null).forEach((a) => m.set(a.data, agg === 'max' ? Math.max(m.get(a.data) || 0, a[campo]) : (m.get(a.data) || 0) + a[campo])); return m; };
  const passos = mapa('passos', 'passos', 'max'); const pa = mapa(['caminhada', 'corrida'], 'passos', 'sum'); pa.forEach((v, k) => { if (!passos.has(k)) passos.set(k, v); });
  const sono = mapa('sono', 'sono_total_h', 'max'), cardio = mapa(['caminhada', 'corrida'], 'duracao_min', 'sum'), km = mapa(['caminhada', 'corrida'], 'distancia_km', 'sum');
  const media = (m, ds) => { const v = ds.map((d) => m.get(d)).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const soma = (m, ds) => ds.reduce((a, d) => a + (m.get(d) || 0), 0);
  const P = App.perfil, mp = media(passos, d7), ms = media(sono, d7), mc = soma(cardio, d7);
  el.innerHTML = `
    <button type="button" class="btn" id="rl-novo">${UI.icon('plus')} Registrar dados do relógio</button>
    <div class="grid2">
      <div class="stat"><span class="l">Passos (média 7 dias)</span><span class="v ${mp != null ? (mp >= P.meta_passos ? 'ok' : 'warn') : ''}">${fmt(mp)}</span><span class="s muted">meta ${fmt(P.meta_passos)}</span></div>
      <div class="stat"><span class="l">Sono (média 7 dias)</span><span class="v ${ms != null ? (ms >= P.meta_sono_h ? 'ok' : 'warn') : ''}">${fmt(ms, 1)}<small>h</small></span><span class="s muted">meta ${fmt(P.meta_sono_h)} h</span></div>
      <div class="stat"><span class="l">Caminhada e corrida</span><span class="v ${mc >= P.meta_cardio_min ? 'ok' : ''}">${fmt(mc)}<small>min</small></span><span class="s muted">7 dias · meta ${fmt(P.meta_cardio_min)}</span></div>
      <div class="stat"><span class="l">Distância</span><span class="v">${fmt(soma(km, d7), 1)}<small>km</small></span><span class="s muted">7 dias</span></div></div>
    <section class="card"><h2>Passos · 14 dias</h2>${UI.barras(d14, passos, { meta: P.meta_passos, unidade: 'passos' })}</section>
    <section class="card"><h2>Sono · 14 dias</h2>${UI.barras(d14, sono, { meta: P.meta_sono_h, dec: 1, unidade: 'h' })}</section>
    <section class="card"><h2>Caminhada e corrida · 14 dias</h2>${UI.barras(d14, cardio, { meta: Math.round(P.meta_cardio_min / 7), unidade: 'min' })}</section>
    <p class="sec">Registros</p>
    <div class="card flat" style="padding:4px 16px"><div class="list" id="rl-list">${todos.length ? '' : '<p class="muted small pad">Registre passos, sono e atividades com a data que o relógio mostra. Pode anexar a imagem do Fitcloud Pro.</p>'}</div></div>`;
  $('#rl-novo').onclick = () => formAtividade(null, () => navegar());
  const lst = $('#rl-list');
  todos.slice(0, 80).forEach((a) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'li';
    const res = (ATIV[a.tipo]?.campos || []).filter(([k]) => a[k] != null).map(([k, l, u]) => `${fmt(a[k], k.includes('_h') || k === 'distancia_km' ? 1 : 0)}${u ? ' ' + u : ' ' + l.toLowerCase()}`).slice(0, 3).join(' · ');
    b.innerHTML = `${a.foto ? '<img class="foto" alt="">' : `<span class="ex-n">${UI.icon(a.tipo === 'sono' ? 'timer' : 'watch')}</span>`}<div class="grow"><div class="t">${esc(ATIV[a.tipo]?.nome || a.tipo)}</div><div class="d">${dataBR(a.data)}${res ? ' · ' + esc(res) : ''}</div></div>`;
    if (a.foto) { const u = URL.createObjectURL(a.foto); $('img', b).src = u; }
    b.onclick = () => formAtividade(a, () => navegar());
    lst.append(b);
  });
};

async function reduzirFoto(file) {
  try {
    const bmp = await createImageBitmap(file); const max = 1280, s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((ok) => c.toBlob((b) => ok(b || file), 'image/jpeg', 0.82));
  } catch (e) { return file; }
}

function formAtividade(reg, depois) {
  let tipo = reg ? reg.tipo : 'passos', foto = reg ? reg.foto || null : null;
  UI.sheet(`<div class="row between"><h3>${reg ? 'Editar registro' : 'Dados do relógio'}</h3><button type="button" class="linkbtn" data-close>Fechar</button></div>
    <div class="seg" role="group" aria-label="Tipo">${Object.entries(ATIV).map(([k, v]) => `<button type="button" data-t="${k}" aria-pressed="${k === tipo}">${esc(v.nome.split(' ')[0])}</button>`).join('')}</div>
    <label class="field"><span>Data informada pelo relógio</span><input type="date" id="fa-data" value="${reg ? reg.data : hojeISO()}" max="${hojeISO()}"></label>
    <div class="mgrid" id="fa-campos"></div>
    <div class="row gap"><label class="btn ghost grow" for="fa-foto" style="cursor:pointer">${UI.icon('cam')} ${foto ? 'Trocar imagem' : 'Anexar imagem'}</label><input type="file" id="fa-foto" accept="image/*" hidden></div>
    <img id="fa-prev" class="foto-big" alt="Imagem do registro" ${foto ? '' : 'hidden'}>
    <label class="field"><span>Observação</span><input id="fa-obs" maxlength="200" value="${esc(reg?.obs || '')}"></label>
    <div class="row gap">${reg ? `<button type="button" class="btn ghost" id="fa-del" aria-label="Excluir">${UI.icon('trash')}</button>` : ''}<button type="button" class="btn grow" id="fa-ok">Salvar</button></div>`,
  (sh, close) => {
    const campos = () => { $('#fa-campos', sh).innerHTML = ATIV[tipo].campos.map(([k, l, u]) => `<label class="field"><span>${esc(l)}${u ? ' (' + u + ')' : ''}</span><input type="number" inputmode="decimal" step="any" min="0" data-k="${k}" value="${reg && reg.tipo === tipo && reg[k] != null ? reg[k] : ''}"></label>`).join(''); };
    $$('[data-t]', sh).forEach((b) => { b.onclick = () => { tipo = b.dataset.t; $$('[data-t]', sh).forEach((x) => x.setAttribute('aria-pressed', x === b)); campos(); }; });
    campos();
    if (foto) $('#fa-prev', sh).src = URL.createObjectURL(foto);
    $('#fa-foto', sh).onchange = async (e) => { const f = e.target.files[0]; if (!f) return; foto = await reduzirFoto(f); const p = $('#fa-prev', sh); p.src = URL.createObjectURL(foto); p.hidden = false; };
    $('#fa-ok', sh).onclick = async () => {
      const r = { tipo, data: $('#fa-data', sh).value || hojeISO(), obs: $('#fa-obs', sh).value.trim() };
      let n = 0; $$('[data-k]', sh).forEach((i) => { const v = num(i.value); if (v != null) { r[i.dataset.k] = v; n++; } });
      if (!n && !foto) { UI.toast('Preencha um número ou anexe a imagem.'); return; }
      if (foto) r.foto = foto; if (reg) r.id = reg.id;
      await DB.put('atividades', r); close(); UI.toast('Registro salvo'); depois && depois();
    };
    const d = $('#fa-del', sh); if (d) d.onclick = async () => { close(); if (await UI.confirmar('Excluir este registro?', 'Excluir')) { await DB.del('atividades', reg.id); UI.toast('Registro excluído'); depois && depois(); } };
  });
}

ROTAS.backup = async (el) => {
  topo('Backup', '#/mais');
  const ult = await DB.cfg('ultimoBackup');
  el.innerHTML = `
    <section class="card"><h2>Seus dados ficam neste aparelho</h2><p class="note">Medidas, treinos, refeições e registros do relógio são guardados só no celular. Faça um backup de vez em quando e guarde o arquivo (Google Drive, e-mail, WhatsApp). Para trocar de celular, importe o arquivo no novo aparelho.</p>
      <p class="small ${ult ? 'muted' : 'warn'}">${ult ? 'Último backup: ' + dataBR(ult.slice(0, 10)) : 'Você ainda não fez nenhum backup.'}</p>
      <button type="button" class="btn" id="bk-exp">Exportar backup</button></section>
    <section class="card"><h2>Restaurar backup</h2><p class="note">Substitui todos os dados deste aparelho pelos do arquivo.</p>
      <label class="btn ghost" for="bk-file" style="cursor:pointer">Escolher arquivo de backup</label><input type="file" id="bk-file" accept="application/json,.json" hidden></section>
    <section class="card"><h2>Recomeçar</h2><p class="note">Apaga tudo e volta aos dados iniciais.</p><button type="button" class="btn ghost" id="bk-reset" style="color:var(--bad)">Apagar todos os dados</button></section>`;
  $('#bk-exp').onclick = async () => {
    const dados = await DB.exportar(); const nome = `evolua-backup-${hojeISO()}.json`;
    const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' });
    const file = new File([blob], nome, { type: 'application/json' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Backup Evolua' }); } else throw new Error('sem share'); }
    catch (e) { if (e && e.name === 'AbortError') return; const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.append(a); a.click(); a.remove(); }
    await DB.setCfg('ultimoBackup', new Date().toISOString()); UI.toast('Backup gerado'); navegar();
  };
  $('#bk-file').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (!(await UI.confirmar('Substituir todos os dados deste aparelho pelos do backup?', 'Restaurar'))) return;
    try { await DB.importar(JSON.parse(await f.text())); await carregar(); UI.toast('Backup restaurado'); location.hash = '#/hoje'; } catch (err) { UI.toast('Arquivo inválido: ' + (err.message || '')); }
  };
  $('#bk-reset').onclick = async () => { if (!(await UI.confirmar('Apagar todos os dados? Faça um backup antes se quiser guardar algo.', 'Apagar tudo'))) return; for (const n of DB.stores) await DB.clear(n); await DB.iniciar(); await carregar(); UI.toast('Dados apagados'); location.hash = '#/hoje'; };
};

ROTAS.sobre = async (el) => {
  topo('Sobre', '#/mais');
  el.innerHTML = `<section class="card"><h2>Evolua</h2><p class="note">App pessoal de treino, dieta e medidas. Funciona sem internet; a internet é usada só para buscar alimentos industrializados na base aberta Open Food Facts.</p></section>
    <section class="card"><h2>Métodos</h2><ul class="ul small">
      <li><b>IMC</b>: classificação da OMS.</li><li><b>Cintura</b>: pontos de corte da OMS/IDF; <b>cintura/altura</b> ideal abaixo de 0,50.</li>
      <li><b>Gordura corporal</b>: RFM (Woolcott & Bergman, 2018) e fórmula da Marinha dos EUA quando há pescoço; faixas saudáveis por idade de Gallagher et al. (2000).</li>
      <li><b>TMB</b>: Mifflin-St Jeor (1990), Harris-Benedict revisada (Roza & Shizgal, 1984) e Katch-McArdle. <b>GET</b> = TMB × fator de atividade (FAO/OMS).</li>
      <li><b>Proteína</b>: 1,6 g/kg ou mais (Morton et al., 2018). <b>Treino</b>: 10 a 20 séries semanais por músculo (Schoenfeld et al., 2017); aeróbico de 150 a 250 min por semana (ACSM).</li>
      <li><b>Alimentos</b>: valores aproximados da Tabela TACO/UNICAMP e USDA; industrializados pelo Open Food Facts.</li></ul></section>
    <p class="note">Este app faz estimativas e não substitui avaliação de médico e nutricionista.</p>`;
};

/* ---------- Início ---------- */
async function carregar() {
  App.perfil = await DB.cfg('perfil');
  App.plano = await DB.cfg('plano', []);
  App.sessao = await DB.cfg('sessao', null);
}
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); App.instalar = e; });
(async () => {
  try { aplicarTema(localStorage.getItem('evolua-tema') || 'auto'); } catch (e) { /* opcional */ }
  $$('[data-ic]').forEach((s) => { s.innerHTML = UI.icon(s.dataset.ic); });
  await DB.iniciar();
  await carregar();
  Timer.restaurar();
  if (!location.hash) location.replace('#/hoje');
  navegar();
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
})();

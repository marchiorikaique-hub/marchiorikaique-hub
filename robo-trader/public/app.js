const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = (v, sinal = true) => (sinal && v > 0 ? '+' : '') + v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const n = (v, d = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const cls = (v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : '');
const dt = (t) => new Date(t);
const hora = (t) => dt(t).toISOString().slice(11, 16);
const diaBR = (iso) => iso.split('-').reverse().join('/');
const api = async (url, opt) => {
  const r = await fetch(url, opt);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || `Erro ${r.status}`);
  return j;
};
const post = (url, corpo) => api(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });

// ---------- Abas ----------
const abas = [...document.querySelectorAll('#abas button')];
function abrir(nome) {
  if (!abas.some((b) => b.dataset.aba === nome)) nome = 'projeto';
  abas.forEach((b) => b.setAttribute('aria-selected', b.dataset.aba === nome));
  document.querySelectorAll('.aba').forEach((s) => (s.hidden = s.id !== nome));
  if (nome === 'mercado') carregarMercado();
  if (nome === 'sinais') carregarSinais();
  if (location.hash.slice(1) !== nome) history.replaceState(null, '', '#' + nome);
}
abas.forEach((b) => b.addEventListener('click', () => abrir(b.dataset.aba)));

// ---------- Projeto e validação ----------
let projeto = null;
const CAMPOS = {
  grid: [
    ['niveis', 'Níveis de recuo (pontos)', 'largo'], ['alvoAdicional', 'Alvo do adicional'], ['alvoPrincipal', 'Alvo da principal'],
    ['stopGlobal', 'Stop global'], ['tfDirecao', 'Candle de direção (min)'], ['qtdPrincipal', 'Contratos principal'], ['qtdAdicional', 'Contratos adicional'],
    ['perdaDiaria', 'Perda máx. no dia (R$)'], ['maxCiclos', 'Ciclos por dia'], ['inicio', 'Início'], ['fim', 'Fim das entradas'],
    ['zeragem', 'Zeragem'], ['custo', 'Custo por contrato (R$)'], ['rearmar', 'Reabrir nível após o alvo do adicional', 'marcar'],
  ],
  scalper: [
    ['emaRapida', 'EMA rápida'], ['emaLenta', 'EMA lenta'], ['emaTendencia', 'EMA de tendência'], ['mediaVolume', 'Média de volume'],
    ['stop', 'Stop (pontos)'], ['alvo', 'Alvo (pontos)'], ['contratos', 'Contratos'], ['maxOperacoes', 'Operações por dia'],
    ['perdaDiaria', 'Perda máx. no dia (R$)'], ['custo', 'Custo por contrato (R$)'], ['inicio', 'Início'], ['fim', 'Fim das entradas'], ['zeragem', 'Zeragem'],
  ],
};
const roboAtual = () => new FormData($('#form-sim')).get('robo');
function montarCampos() {
  const robo = roboAtual(), pad = projeto.padroes[robo];
  $('#campos').innerHTML = CAMPOS[robo].map(([k, rot, tipo]) => tipo === 'marcar'
    ? `<label class="marcar"><input type="checkbox" name="${k}" ${pad[k] ? 'checked' : ''}>${rot}</label>`
    : `<div class="${tipo || ''}"><label for="p-${k}">${rot}</label><input id="p-${k}" name="${k}" value="${esc(pad[k])}" ${/^(inicio|fim|zeragem)$/.test(k) ? 'type="time"' : 'inputmode="decimal"'}></div>`).join('');
}
function infoCsv() {
  const c = projeto.csv;
  $('#csv-info').textContent = c ? `Arquivo atual: ${c.nome}, ${n(c.candles)} candles de ${c.tf} min, de ${dt(c.de).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} a ${dt(c.ate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.` : 'Nenhum arquivo enviado ainda.';
}
function desenharProjeto() {
  $('#robos').innerHTML = projeto.robos.map((r) => `<article class="cartao robo">
    <h3>${esc(r.nome)}</h3><p class="meta">${esc(r.mercado)} · ${esc(r.tecnologia)}</p>
    <span class="estado ${r.estado.includes('pronto') ? 'pronto' : ''}">${esc(r.estado)}</span><p>${esc(r.nota)}</p></article>`).join('');
  const pend = projeto.pontos.filter((p) => p.status === 'pendente').length;
  $('#pend').textContent = pend || '';
  $('#pontos').innerHTML = projeto.pontos.map((p) => `<article class="cartao ponto ${p.status}" data-id="${p.id}">
    <h3>${esc(p.titulo)}</h3><p class="premissa">${esc(p.premissa)}</p>
    <div class="acoes">
      <button class="ok" aria-pressed="${p.status === 'confirmado'}" data-acao="confirmado">É assim</button>
      <button class="aj" aria-pressed="${p.status === 'ajustar'}" data-acao="ajustar">Precisa ajustar</button>
      <span class="registro">${p.em ? `${p.status === 'confirmado' ? 'Confirmado' : p.status === 'ajustar' ? 'Ajuste pedido' : 'Reaberto'}${p.quem ? ' por ' + esc(p.quem) : ''} em ${new Date(p.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : 'Aguardando resposta'}</span>
    </div>
    <div class="ajuste" ${p.status === 'ajustar' ? '' : 'hidden'}>
      <label for="c-${p.id}">Como deve ficar</label>
      <textarea id="c-${p.id}" rows="2" maxlength="2000">${esc(p.comentario)}</textarea>
      <p class="erro" role="alert"></p>
      <button data-acao="salvar">Salvar ajuste</button>
    </div></article>`).join('');
}
$('#pontos').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-acao]');
  if (!b) return;
  const art = b.closest('.ponto'), id = art.dataset.id, caixa = $('.ajuste', art);
  const acao = b.dataset.acao;
  if (acao === 'ajustar' && caixa.hidden) { caixa.hidden = false; $('textarea', caixa).focus(); return; }
  const atual = projeto.pontos.find((p) => p.id === id);
  const status = acao === 'salvar' ? 'ajustar' : acao === 'confirmado' && atual.status === 'confirmado' ? 'pendente' : acao;
  const quem = $('#quem').value.trim();
  try { localStorage.setItem('quem', quem); } catch {}
  try {
    await post('/api/validacao/' + id, { status, quem, comentario: status === 'ajustar' ? $('textarea', caixa).value : '' });
    projeto = await api('/api/projeto');
    desenharProjeto();
  } catch (err) { caixa.hidden = false; $('.erro', caixa).textContent = err.message; }
});

// ---------- Simulador ----------
let sim = null, diaSel = null;
$('#form-sim').addEventListener('change', (e) => {
  if (e.target.name === 'robo') montarCampos();
  if (e.target.id === 'fonte') $('#csv-box').hidden = e.target.value !== 'csv';
});
$('#csv').addEventListener('change', async (e) => {
  const arq = e.target.files[0];
  if (!arq) return;
  $('#sim-erro').textContent = '';
  $('#csv-info').textContent = 'Enviando…';
  try {
    await api('/api/dados/csv?nome=' + encodeURIComponent(arq.name), { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: await arq.text() });
    projeto = await api('/api/projeto');
  } catch (err) { $('#sim-erro').textContent = err.message; }
  infoCsv();
  e.target.value = '';
});
$('#form-sim').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target), params = {};
  for (const [k] of CAMPOS[fd.get('robo')]) params[k] = k === 'rearmar' ? fd.has(k) : fd.get(k);
  const bt = $('#rodar');
  bt.disabled = true; bt.textContent = 'Simulando…'; $('#sim-erro').textContent = '';
  try {
    sim = await post('/api/simular', { robo: fd.get('robo'), fonte: fd.get('fonte'), params });
    diaSel = sim.dias.length ? sim.dias[0].dia : null;
    desenharResultado();
  } catch (err) { $('#sim-erro').textContent = err.message; }
  bt.disabled = false; bt.textContent = 'Rodar simulação';
});

function desenharResultado() {
  const s = sim, el = $('#resultado');
  const periodo = `${dt(s.de).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} a ${dt(s.ate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`;
  if (!s.operacoes) { el.innerHTML = `<div class="faixa">${esc(s.rotulo)} Período: ${periodo}.</div><div class="vazio">Nenhuma operação com esses parâmetros nesse período.</div>`; return; }
  const k = (rot, val, c = '', g = '') => `<div class="kpi ${g}"><span>${rot}</span><b class="${c}">${val}</b></div>`;
  el.innerHTML = `
    <div class="faixa ${s.fonte === 'csv' ? '' : 'alerta'}">${esc(s.rotulo)} Período: ${periodo}.${s.semVolume ? ' Sem dado de volume: o filtro de volume foi ignorado.' : ''}</div>
    <div class="kpis">
      ${k('Resultado', brl(s.total), cls(s.total), 'grande')}
      ${k('Maior queda acumulada', brl(-s.drawdown, false), 'neg')}
      ${k('Operações', n(s.operacoes))}
      ${k('Acerto', n(s.acerto * 100, 1) + '%')}
      ${k('Fator de lucro', s.fatorLucro == null ? '—' : n(s.fatorLucro, 2))}
      ${k('Dias positivos', `${s.diasPositivos}/${s.diasOperados}`)}
      ${k('Pior dia', brl(s.piorDia, false), cls(s.piorDia))}
      ${s.robo === 'grid' ? k('Pior posição aberta', brl(s.piorFlutuante, false), 'neg') + k('Máx. contratos', s.maxContratos) : k('Melhor dia', brl(s.melhorDia), cls(s.melhorDia))}
    </div>
    <h2>Resultado acumulado</h2><canvas id="curva" height="200"></canvas>
    <h2>Como as operações terminaram</h2>
    <ul class="motivos">${Object.entries(s.motivos).sort((a, b) => b[1] - a[1]).map(([m, q]) => `<li>${esc(m)} <b>${q}</b></li>`).join('')}</ul>
    <h2>Dia a dia</h2>
    <div class="duas">
      <div class="rolagem"><table><thead><tr><th>Dia</th><th class="d">Operações</th><th class="d">Resultado</th></tr></thead>
        <tbody id="dias">${s.dias.map((d) => `<tr class="clicavel" data-dia="${d.dia}" tabindex="0"><td>${diaBR(d.dia)}</td><td class="d num">${d.trades}</td><td class="d num ${cls(d.brl)}">${brl(d.brl)}</td></tr>`).join('')}</tbody></table></div>
      <div><canvas id="graf" height="300"></canvas>
        <div class="legenda"><span><i style="background:var(--acento)"></i>Entrada principal</span><span><i style="background:#4b8fd6"></i>Entrada adicional</span><span><i style="background:var(--alta)"></i>Saída com ganho</span><span><i style="background:var(--baixa)"></i>Saída com perda</span></div></div>
    </div>
    <h2 id="tit-ops"></h2>
    <div class="rolagem"><table><thead><tr><th>Tipo</th><th>Lado</th><th>Entrada</th><th class="d">Preço</th><th>Saída</th><th class="d">Preço</th><th class="d">Pontos</th><th class="d">R$</th><th>Motivo</th></tr></thead><tbody id="ops"></tbody></table></div>`;
  const escolher = (tr) => { if (tr) { diaSel = tr.dataset.dia; desenharDia(); } };
  $('#dias').addEventListener('click', (e) => escolher(e.target.closest('tr')));
  $('#dias').addEventListener('keydown', (e) => { if (e.key === 'Enter') escolher(e.target.closest('tr')); });
  desenharCurva(); desenharDia();
}

function tela(cv) {
  const r = devicePixelRatio || 1, w = cv.clientWidth, h = Number(cv.getAttribute('height'));
  cv.width = w * r; cv.height = h * r; cv.style.height = h + 'px';
  const c = cv.getContext('2d'); c.scale(r, r);
  c.font = '11px ui-monospace, Menlo, Consolas, monospace';
  return { c, w, h };
}
const cor = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

function desenharCurva() {
  const cv = $('#curva'); if (!cv) return;
  const { c, w, h } = tela(cv), pts = sim.curva.map((p) => p.v);
  const mn = Math.min(0, ...pts), mx = Math.max(0, ...pts), m = { l: 8, r: 64, t: 12, b: 12 };
  const x = (i) => m.l + (i / Math.max(1, pts.length - 1)) * (w - m.l - m.r);
  const y = (v) => m.t + (1 - (v - mn) / (mx - mn || 1)) * (h - m.t - m.b);
  c.strokeStyle = cor('--linha'); c.setLineDash([3, 3]); c.beginPath(); c.moveTo(m.l, y(0)); c.lineTo(w - m.r, y(0)); c.stroke(); c.setLineDash([]);
  c.strokeStyle = cor(sim.total >= 0 ? '--alta' : '--baixa'); c.lineWidth = 1.6; c.beginPath();
  pts.forEach((v, i) => (i ? c.lineTo(x(i), y(v)) : c.moveTo(x(i), y(v)))); c.stroke();
  c.fillStyle = cor('--suave'); c.textBaseline = 'middle';
  [mx, 0, mn].filter((v, i, a) => a.indexOf(v) === i).forEach((v) => c.fillText('R$ ' + n(v), w - m.r + 6, y(v)));
}

function desenharDia() {
  document.querySelectorAll('#dias tr').forEach((tr) => tr.classList.toggle('ativa', tr.dataset.dia === diaSel));
  const ops = sim.trades.filter((t) => t.dia === diaSel);
  $('#tit-ops').textContent = `Operações de ${diaBR(diaSel)}`;
  $('#ops').innerHTML = ops.map((t) => `<tr><td>${esc(t.tipo)}${t.nivel ? ' ' + t.nivel : ''}</td><td>${t.lado > 0 ? 'Compra' : 'Venda'}</td><td class="num">${hora(t.tEntrada)}</td><td class="d num">${n(t.pEntrada)}</td><td class="num">${hora(t.tSaida)}</td><td class="d num">${n(t.pSaida)}</td><td class="d num ${cls(t.pts)}">${n(t.pts)}</td><td class="d num ${cls(t.brl)}">${brl(t.brl)}</td><td>${esc(t.motivo)}</td></tr>`).join('');
  const cv = $('#graf'); if (!cv) return;
  const { c, w, h } = tela(cv);
  const cs = sim.grafico.filter((k) => new Date(k[0]).toISOString().slice(0, 10) === diaSel);
  if (!cs.length) return;
  const precos = [...cs.flatMap((k) => [k[2], k[3]]), ...ops.flatMap((t) => [t.pEntrada, t.pSaida])];
  const mn = Math.min(...precos), mx = Math.max(...precos), m = { l: 8, r: 64, t: 14, b: 22 };
  const t0 = cs[0][0], t1 = cs.at(-1)[0] + sim.tfGrafico * 60000;
  const x = (t) => m.l + ((t - t0) / (t1 - t0)) * (w - m.l - m.r);
  const y = (p) => m.t + (1 - (p - mn) / (mx - mn || 1)) * (h - m.t - m.b);
  const larg = Math.max(2, ((w - m.l - m.r) / ((t1 - t0) / (sim.tfGrafico * 60000))) * 0.7);
  c.fillStyle = cor('--suave'); c.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) { const p = mn + ((mx - mn) * i) / 4; c.fillText(n(Math.round(p / 5) * 5), w - m.r + 6, y(p)); c.strokeStyle = cor('--linha'); c.globalAlpha = .5; c.beginPath(); c.moveTo(m.l, y(p)); c.lineTo(w - m.r, y(p)); c.stroke(); c.globalAlpha = 1; }
  c.textBaseline = 'alphabetic'; c.textAlign = 'center';
  for (let hh = 9; hh <= 18; hh++) { const t = Date.parse(diaSel + 'T' + String(hh).padStart(2, '0') + ':00:00Z'); if (t >= t0 && t <= t1) c.fillText(hh + 'h', x(t), h - 6); }
  c.textAlign = 'left';
  for (const [t, o, hi, lo, cl] of cs) {
    const cx = x(t + (sim.tfGrafico * 60000) / 2);
    c.strokeStyle = c.fillStyle = cl >= o ? '#5d6b7a' : '#39424d';
    c.beginPath(); c.moveTo(cx, y(hi)); c.lineTo(cx, y(lo)); c.stroke();
    c.fillRect(cx - larg / 2, Math.min(y(o), y(cl)), larg, Math.max(1, Math.abs(y(o) - y(cl))));
  }
  for (const t of ops) {
    const g = cor(t.brl >= 0 ? '--alta' : '--baixa');
    c.strokeStyle = g; c.globalAlpha = .55; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(x(t.tEntrada), y(t.pEntrada)); c.lineTo(x(t.tSaida), y(t.pSaida)); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    c.fillStyle = t.tipo === 'Adicional' ? '#4b8fd6' : cor('--acento');
    const ex = x(t.tEntrada), ey = y(t.pEntrada), s = t.lado * 6;
    c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex - 5, ey + s); c.lineTo(ex + 5, ey + s); c.closePath(); c.fill();
    c.fillStyle = g; c.beginPath(); c.arc(x(t.tSaida), y(t.pSaida), 3.5, 0, 7); c.fill();
  }
}
let rs; addEventListener('resize', () => { clearTimeout(rs); rs = setTimeout(() => { if (sim && sim.operacoes) { desenharCurva(); desenharDia(); } }, 150); });

// ---------- Sinais ----------
const ROTULO = { alvo: ['Bateu o alvo', 'pos'], stop: ['Bateu o stop', 'neg'], zerado: ['Zerado no fim do dia', ''], aberto: ['Em aberto', ''], 'sem dados': ['Sem dados para conferir', ''] };
const pct = (t) => (t.n ? n((t.acertos / t.n) * 100, 0) + '%' : '—');
async function carregarSinais() {
  let d;
  try { d = await api('/api/sinais'); } catch (e) { $('#sinais-aviso').hidden = false; $('#sinais-aviso').textContent = e.message; return; }
  const p = d.placar, av = $('#sinais-aviso');
  av.hidden = !d.erro;
  if (d.erro) av.textContent = `Não consegui atualizar os dados agora (${d.erro}). A lista mostra o que já estava registrado.`;
  const k = (rot, val, c = '') => `<div class="kpi"><span>${rot}</span><b class="${c}">${val}</b></div>`;
  $('#placar').innerHTML =
    k('Acerto do robô', pct(p.robo), p.robo.n ? (p.robo.acertos / p.robo.n > p.empate ? 'pos' : 'neg') : '') +
    k('Acerto para empatar', n(p.empate * 100, 0) + '%') +
    k('Saldo em pontos', (p.pontos > 0 ? '+' : '') + n(p.pontos), cls(p.pontos)) +
    k('Indicações conferidas', `${p.robo.n}`) +
    k('Acerto quando o Vitor concordou', pct(p.concordou)) +
    k('Acerto quando discordou', pct(p.discordou));
  $('#sinais-nota').textContent = `Regra atual: Scalper V1, stop de ${d.regra.stop} e alvo de ${d.regra.alvo} pontos, no Ibovespa à vista de 1 minuto (Yahoo). ${p.total} indicações registradas, ${p.abertos} em aberto, ${p.votados} com opinião.` + (d.ultimoCandle ? ` Último candle recebido: ${dt(d.ultimoCandle).toLocaleString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.` : '');
  $('#lista-sinais').innerHTML = d.lista.length ? d.lista.map((s) => {
    const [rot, c] = ROTULO[s.status] || [s.status, ''];
    return `<tr data-t="${s.t}"><td class="num">${dt(s.t).toLocaleString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
      <td class="${s.lado > 0 ? 'pos' : 'neg'}">${s.lado > 0 ? 'Comprar' : 'Vender'}</td><td class="d num">${n(s.preco)}</td><td class="d num">${n(s.stop)}</td><td class="d num">${n(s.alvo)}</td>
      <td class="${c}">${rot}</td><td class="d num ${cls(s.pts)}">${s.pts == null ? '—' : n(s.pts)}</td>
      <td><div class="voto"><button data-voto="certo" aria-pressed="${s.voto === 'certo'}">Eu entraria</button><button data-voto="errado" aria-pressed="${s.voto === 'errado'}">Não entraria</button></div></td></tr>`;
  }).join('') : '<tr><td colspan="8" class="suave">Nenhuma indicação registrada ainda.</td></tr>';
}
$('#lista-sinais').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-voto]');
  if (!b) return;
  const voto = b.getAttribute('aria-pressed') === 'true' ? null : b.dataset.voto;
  await post(`/api/sinais/${b.closest('tr').dataset.t}/voto`, { voto, quem: $('#quem').value.trim() });
  carregarSinais();
});
$('#buscar').addEventListener('click', async () => {
  const bt = $('#buscar');
  bt.disabled = true; bt.textContent = 'Buscando…'; $('#busca-erro').textContent = '';
  try {
    const r = await post('/api/otimizar', { fonte: $('#fonte-busca').value });
    $('#busca').innerHTML = `<div class="faixa ${$('#fonte-busca').value === 'csv' ? '' : 'alerta'}">${esc(r.rotulo)} Busca em ${r.diasTreino} dias, conferência em ${r.diasTeste} dias. Das ${r.combinacoes} combinações, ${r.positivasNoTeste} ficaram positivas nos dias não vistos.</div>
      <div class="rolagem"><table><thead><tr><th>Médias</th><th class="d">Stop</th><th class="d">Alvo</th><th class="d">Dias da busca</th><th class="d">Dias não vistos</th><th class="d">Operações</th><th class="d">Acerto</th></tr></thead><tbody>
      ${r.melhores.map((l) => `<tr><td class="num">${l.emaRapida}/${l.emaLenta}</td><td class="d num">${l.stop}</td><td class="d num">${l.alvo}</td><td class="d num ${cls(l.treino)}">${brl(l.treino)}</td><td class="d num ${cls(l.teste)}">${brl(l.teste)}</td><td class="d num">${l.opsTeste}</td><td class="d num">${n(l.acertoTeste * 100, 0)}%</td></tr>`).join('')}</tbody></table></div>`;
  } catch (e) { $('#busca-erro').textContent = e.message; }
  bt.disabled = false; bt.textContent = 'Buscar';
});

// ---------- Mercado ----------
let mercadoEm = 0;
async function carregarMercado() {
  if (Date.now() - mercadoEm < 60000) return;
  mercadoEm = Date.now();
  if (!$('#indicadores').children.length) $('#indicadores').innerHTML = '<p class="suave">Carregando…</p>';
  let d;
  try { d = await api('/api/contexto'); } catch (e) { $('#indicadores').innerHTML = `<p class="erro">${esc(e.message)}</p>`; mercadoEm = 0; return; }
  $('#ctx-hora').textContent = 'Atualizado às ' + new Date(d.atualizado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '.';
  const v = (x) => (x == null ? '' : `<span class="${cls(x)}">${x > 0 ? '+' : ''}${n(x, 2)}%</span>`);
  const ind = (rot, o, val, sub) => `<div class="cartao ind"><span>${rot}</span>${o.ok ? `<b>${val()}</b><small>${sub()}</small>` : `<b>—</b><small>Fonte indisponível agora</small>`}</div>`;
  $('#indicadores').innerHTML =
    ind('Dólar PTAX (venda)', d.dolar, () => 'R$ ' + n(d.dolar.valor, 4), () => `${v(d.dolar.variacao)} · ${d.dolar.data} · Banco Central`) +
    ind('Ibovespa', d.ibov, () => n(d.ibov.valor), () => `${v(d.ibov.variacao)} · Yahoo, com atraso`) +
    ind('Selic meta', d.selic, () => n(d.selic.valor, 2) + '%', () => 'ao ano · Banco Central') +
    ind('IPCA 12 meses', d.ipca, () => n(d.ipca.valor, 2) + '%', () => `${d.ipca.data} · Banco Central`) +
    ind('Bitcoin', d.cripto, () => 'R$ ' + n(d.cripto.btc), () => `${v(d.cripto.btcVar)} em 24h · CoinGecko`) +
    ind('Ethereum', d.cripto, () => 'R$ ' + n(d.cripto.eth), () => `${v(d.cripto.ethVar)} em 24h · CoinGecko`);
  $('#noticias').innerHTML = d.noticias.ok ? d.noticias.itens.map((i) => `<li><a href="${esc(i.link)}" target="_blank" rel="noopener noreferrer">${esc(i.titulo)}</a><small>${i.destaque ? '<span class="tag">Pode mexer com o índice</span> · ' : ''}${esc(i.fonte)} · ${new Date(i.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small></li>`).join('') : '<li class="suave">Notícias indisponíveis agora.</li>';
  $('#clima').innerHTML = d.clima.ok ? d.clima.polos.map((p) => { const mx = Math.max(10, ...p.chuva); return `<div class="polo"><div class="cab"><span>${esc(p.nome)} <span class="suave">· ${esc(p.cultura)}</span></span><b class="num">${n(p.total, 0)} mm</b></div><div class="barras" role="img" aria-label="Chuva diária prevista: ${p.chuva.map((c) => n(c || 0, 0)).join(', ')} mm">${p.chuva.map((c) => `<i style="height:${Math.round(((c || 0) / mx) * 100)}%"></i>`).join('')}</div></div>`; }).join('') : '<p class="suave">Previsão indisponível agora.</p>';
}

// ---------- Início ----------
(async () => {
  try { $('#quem').value = localStorage.getItem('quem') || ''; } catch {}
  projeto = await api('/api/projeto');
  desenharProjeto(); montarCampos(); infoCsv();
  if (projeto.csv) { $('#fonte').value = 'csv'; $('#csv-box').hidden = false; }
  abrir(location.hash.slice(1) || 'projeto');
})();

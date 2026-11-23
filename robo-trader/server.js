const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const dados = require('./lib/dados');
const { simularGrid, simularScalper, GRID_PADRAO, SCALPER_PADRAO } = require('./lib/motor');
const { contexto } = require('./lib/contexto');
const { ROBOS, PONTOS } = require('./lib/projeto');

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ACCESS_CODE = (process.env.ACCESS_CODE || '').trim();
fs.mkdirSync(DATA_DIR, { recursive: true });
const CSV_PATH = path.join(DATA_DIR, 'candles.json');

const db = new DatabaseSync(path.join(DATA_DIR, 'app.db'));
db.exec(`CREATE TABLE IF NOT EXISTS validacao (
  id TEXT PRIMARY KEY, status TEXT NOT NULL, comentario TEXT NOT NULL DEFAULT '', quem TEXT NOT NULL DEFAULT '', em TEXT NOT NULL
);`);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));

// ---------- Acesso (opcional, por código) ----------
const assinatura = () => crypto.createHmac('sha256', ACCESS_CODE).update('robo-trader').digest('hex');
const igual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const logado = (req) => {
  if (!ACCESS_CODE) return true;
  const m = /(?:^|;\s*)rt=([a-f0-9]+)/.exec(req.headers.cookie || '');
  return !!m && igual(m[1], assinatura());
};
app.post('/entrar', (req, res) => {
  const codigo = String(req.body?.codigo || '');
  if (!ACCESS_CODE || !igual(crypto.createHash('sha256').update(codigo).digest('hex'), crypto.createHash('sha256').update(ACCESS_CODE).digest('hex')))
    return res.status(401).json({ erro: 'Código incorreto.' });
  res.setHeader('Set-Cookie', `rt=${assinatura()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
  res.json({ ok: true });
});
app.use((req, res, next) => {
  if (logado(req) || req.path === '/style.css') return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ erro: 'Sessão expirada. Recarregue a página.' });
  res.sendFile(path.join(__dirname, 'public', 'entrar.html'));
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0 }));

// ---------- Dados ----------
let csvCache = null;
const csv = () => {
  if (csvCache === null) csvCache = fs.existsSync(CSV_PATH) ? JSON.parse(fs.readFileSync(CSV_PATH, 'utf8')) : false;
  return csvCache || null;
};
const yahooCache = new Map();
async function carregar(fonte, tfDesejado) {
  if (fonte === 'csv') {
    const c = csv();
    if (!c) throw new Error('Nenhum arquivo enviado ainda.');
    return { candles: c.candles, tf: c.tf, rotulo: `Arquivo enviado (${c.nome}), candles de ${c.tf} min` };
  }
  if (fonte === 'yahoo') {
    const tf = tfDesejado === 1 ? 1 : 15;
    const h = yahooCache.get(tf);
    if (h && Date.now() - h.em < 15 * 60000) return h.v;
    const candles = await dados.buscarYahoo(tf);
    const v = { candles, tf, rotulo: `Ibovespa à vista (Yahoo), candles de ${tf} min. Não é o WIN: serve como aproximação.` };
    yahooCache.set(tf, { em: Date.now(), v });
    return v;
  }
  return { candles: dados.gerarSintetico({ dias: 60 }), tf: 1, rotulo: 'Série sintética de 1 min (60 pregões gerados por computador). Não é mercado real.' };
}

app.get('/api/projeto', (req, res) => {
  const resp = Object.fromEntries(db.prepare('SELECT * FROM validacao').all().map((r) => [r.id, r]));
  const c = csv();
  res.json({
    robos: ROBOS,
    pontos: PONTOS.map((p) => ({ ...p, ...(resp[p.id] || { status: 'pendente', comentario: '', quem: '', em: null }) })),
    padroes: { grid: GRID_PADRAO, scalper: SCALPER_PADRAO },
    csv: c ? { nome: c.nome, tf: c.tf, candles: c.candles.length, de: c.candles[0].t, ate: c.candles.at(-1).t } : null,
  });
});

app.post('/api/validacao/:id', (req, res) => {
  if (!PONTOS.some((p) => p.id === req.params.id)) return res.status(404).json({ erro: 'Ponto não encontrado.' });
  const status = ['pendente', 'confirmado', 'ajustar'].includes(req.body?.status) ? req.body.status : 'pendente';
  const comentario = String(req.body?.comentario || '').slice(0, 2000);
  const quem = String(req.body?.quem || '').slice(0, 60);
  if (status === 'ajustar' && !comentario.trim()) return res.status(400).json({ erro: 'Escreva como a regra deve ficar.' });
  db.prepare(`INSERT INTO validacao (id, status, comentario, quem, em) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET status = excluded.status, comentario = excluded.comentario, quem = excluded.quem, em = excluded.em`)
    .run(req.params.id, status, comentario, quem, new Date().toISOString());
  res.json({ ok: true });
});

app.post('/api/dados/csv', express.text({ type: '*/*', limit: '40mb' }), (req, res) => {
  try {
    const { candles, tf } = dados.lerCsv(req.body);
    const nome = String(req.query.nome || 'arquivo.csv').slice(0, 80);
    fs.writeFileSync(CSV_PATH, JSON.stringify({ nome, tf, candles }));
    csvCache = { nome, tf, candles };
    res.json({ ok: true, nome, tf, candles: candles.length, de: candles[0].t, ate: candles.at(-1).t });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

const NUMERICOS = new Set(['tfDirecao', 'alvoAdicional', 'alvoPrincipal', 'stopGlobal', 'qtdPrincipal', 'qtdAdicional', 'perdaDiaria', 'maxCiclos', 'custo', 'emaRapida', 'emaLenta', 'emaTendencia', 'mediaVolume', 'stop', 'alvo', 'contratos', 'maxOperacoes']);
function limpar(params, padrao) {
  const out = {};
  for (const k of Object.keys(padrao)) {
    if (params?.[k] === undefined || params[k] === '' || k === 'valorPonto') continue;
    if (NUMERICOS.has(k)) {
      const n = Number(String(params[k]).replace(',', '.'));
      if (!Number.isFinite(n) || n < 0) throw new Error(`Valor inválido em "${k}".`);
      out[k] = n;
    } else if (typeof padrao[k] === 'boolean') out[k] = params[k] === true || params[k] === 'true';
    else out[k] = String(params[k]).slice(0, 40);
  }
  return out;
}

app.post('/api/simular', async (req, res) => {
  try {
    const robo = req.body?.robo === 'scalper' ? 'scalper' : 'grid';
    const fonte = ['csv', 'yahoo', 'sintetico'].includes(req.body?.fonte) ? req.body.fonte : 'sintetico';
    const { candles, tf, rotulo } = await carregar(fonte, robo === 'scalper' ? 1 : 15);
    let r;
    if (robo === 'scalper') {
      if (tf !== 1) throw new Error('O Scalper V1 opera no gráfico de 1 minuto. Envie candles de 1 min ou use a série sintética.');
      r = simularScalper(candles, limpar(req.body.params, SCALPER_PADRAO));
    } else {
      const p = limpar(req.body.params, GRID_PADRAO);
      if ((p.tfDirecao || 15) < tf || (p.tfDirecao || 15) % tf) throw new Error(`Os candles são de ${tf} min; o candle de direção precisa ser múltiplo disso.`);
      if (!(p.stopGlobal ?? 1) || !(p.alvoPrincipal ?? 1)) throw new Error('Stop global e alvo da principal precisam ser maiores que zero.');
      r = simularGrid(candles, p);
    }
    const tfGrafico = robo === 'scalper' ? 5 : Math.max(tf, 15);
    res.json({ robo, fonte, rotulo, tfBase: tf, tfGrafico, de: candles[0].t, ate: candles.at(-1).t, grafico: dados.agregar(candles, tfGrafico).map((c) => [c.t, c.o, c.h, c.l, c.c]), ...r });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.get('/api/contexto', async (req, res) => res.json(await contexto()));
app.get('/saude', (req, res) => res.json({ ok: true }));

if (require.main === module) app.listen(PORT, () => console.log(`Painel no ar na porta ${PORT}${ACCESS_CODE ? '' : ' (sem código de acesso)'}`));
module.exports = app;

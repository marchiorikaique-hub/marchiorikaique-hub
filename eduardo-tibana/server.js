const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const { PERGUNTAS, DIMENSOES, calcular } = require('./lib/diagnostico');

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const SETUP_CODE = (process.env.SETUP_CODE || '').trim();
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- Banco ----------
const db = new DatabaseSync(path.join(DATA_DIR, 'app.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS diagnosticos (
    id TEXT PRIMARY KEY,
    criado_em TEXT NOT NULL,
    nome TEXT, email TEXT, whatsapp TEXT, empresa TEXT, cargo TEXT, setor TEXT, porte TEXT,
    respostas TEXT NOT NULL,
    resultado TEXT NOT NULL,
    score INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Novo',
    notas TEXT NOT NULL DEFAULT ''
  );
`);

const DEFAULTS = {
  nome: 'Eduardo Tibana',
  titulo: 'Governança, conselho e IA aplicada a projetos',
  chamada: 'Ajudo empresas a transformar inteligência artificial em resultado, com governança, método e gente.',
  empresa: '',
  bio: [
    'Construí minha carreira na operação de telecomunicações e infraestrutura: projetos de rede, contratos com grandes operadoras e equipes de campo espalhadas pelo país. Foi ali que aprendi que tecnologia só gera valor quando vem acompanhada de processo, disciplina e gente preparada.',
    'Hoje uno essa vivência executiva a duas frentes: a formação como conselheiro de administração e a certificação AI-Driven Project Manager (AIPM). Meu trabalho é ajudar lideranças a decidir onde a IA faz sentido, como governar o seu uso e como levar os projetos do papel para a entrega.',
  ].join('\n\n'),
  whatsapp: '',
  linkedin: '',
  email: '',
  foto: '',
};

const getSetting = (k) => db.prepare('SELECT value FROM settings WHERE key = ?').get(k)?.value;
const setSetting = (k, v) =>
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(k, v);
const perfil = () => {
  const p = {};
  for (const k of Object.keys(DEFAULTS)) p[k] = getSetting(`perfil.${k}`) ?? DEFAULTS[k];
  return p;
};

// Segredo de sessão persistido no volume para sobreviver a reinícios.
let SESSION_SECRET = process.env.SESSION_SECRET || getSetting('session_secret');
if (!SESSION_SECRET) {
  SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  setSetting('session_secret', SESSION_SECRET);
}

// ---------- CLI: node server.js reset-senha ----------
if (process.argv[2] === 'reset-senha') {
  db.prepare("DELETE FROM settings WHERE key = 'senha_hash'").run();
  console.log('Senha removida. O próximo acesso ao /painel pedirá o código de primeiro acesso (SETUP_CODE).');
  process.exit(0);
}

// ---------- Auth ----------
function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function confereSenha(senha, armazenado) {
  const [salt, hash] = (armazenado || '').split(':');
  if (!salt || !hash) return false;
  const teste = crypto.scryptSync(senha, salt, 64);
  return crypto.timingSafeEqual(teste, Buffer.from(hash, 'hex'));
}
const assinar = (payload) => crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
function criaSessao(res) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 1000 * 60 * 60 * 24 * 14 })).toString('base64url');
  res.cookie('sid', `${payload}.${assinar(payload)}`, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 24 * 14,
  });
}
function sessaoValida(req) {
  const raw = (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith('sid='));
  if (!raw) return false;
  const [payload, sig] = raw.slice(4).split('.');
  if (!payload || !sig) return false;
  const esperado = assinar(payload);
  if (sig.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esperado))) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now();
  } catch {
    return false;
  }
}
const exigeLogin = (req, res, next) => (sessaoValida(req) ? next() : res.status(401).json({ erro: 'Não autenticado' }));

// Limite simples de tentativas de login por IP.
const tentativas = new Map();
function limitaTentativas(req, res, next) {
  const ip = req.ip;
  const agora = Date.now();
  const t = (tentativas.get(ip) || []).filter((ts) => agora - ts < 15 * 60 * 1000);
  if (t.length >= 10) return res.status(429).json({ erro: 'Muitas tentativas. Aguarde 15 minutos.' });
  t.push(agora);
  tentativas.set(ip, t);
  next();
}

// ---------- App ----------
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '6mb' }));

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const soDigitos = (s) => String(s || '').replace(/\D/g, '');

function renderHome() {
  const p = perfil();
  const iniciais = p.nome.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const foto = p.foto
    ? `<img src="${esc(p.foto)}" alt="${esc(p.nome)}" class="retrato-img">`
    : `<div class="retrato-vazio" aria-hidden="true">${esc(iniciais)}</div>`;
  const bio = p.bio.split(/\n\s*\n/).map((par) => `<p>${esc(par.trim())}</p>`).join('');
  const wa = soDigitos(p.whatsapp);
  const contatos = [
    wa && `<a class="btn btn-claro" href="https://wa.me/${wa}" target="_blank" rel="noopener">WhatsApp</a>`,
    p.linkedin && `<a class="btn btn-claro" href="${esc(p.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`,
    p.email && `<a class="btn btn-claro" href="mailto:${esc(p.email)}">E-mail</a>`,
  ].filter(Boolean).join('');
  const tpl = fs.readFileSync(path.join(__dirname, 'views', 'home.html'), 'utf8');
  return tpl
    .replaceAll('{{nome}}', esc(p.nome))
    .replaceAll('{{titulo}}', esc(p.titulo))
    .replaceAll('{{chamada}}', esc(p.chamada))
    .replaceAll('{{empresa}}', p.empresa ? `<span class="marca-empresa">${esc(p.empresa)}</span>` : '')
    .replaceAll('{{foto}}', foto)
    .replaceAll('{{bio}}', bio)
    .replaceAll('{{contatos}}', contatos || '<a class="btn btn-claro" href="/diagnostico">Começar pelo diagnóstico</a>')
    .replaceAll('{{ano}}', String(new Date().getFullYear()));
}

app.get('/', (req, res) => res.type('html').send(renderHome()));
app.get('/diagnostico', (req, res) => res.sendFile(path.join(__dirname, 'views', 'diagnostico.html')));
app.get('/resultado/:id', (req, res) => res.sendFile(path.join(__dirname, 'views', 'diagnostico.html')));
app.get('/painel', (req, res) => res.sendFile(path.join(__dirname, 'views', 'painel.html')));

app.use('/fonts/inter', express.static(path.join(__dirname, 'node_modules/@fontsource/inter/files'), { maxAge: '30d' }));
app.use('/fonts/fraunces', express.static(path.join(__dirname, 'node_modules/@fontsource/fraunces/files'), { maxAge: '30d' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// ---------- API pública ----------
app.get('/api/perfil', (req, res) => {
  const p = perfil();
  res.json({ nome: p.nome, whatsapp: soDigitos(p.whatsapp), foto: p.foto });
});

app.get('/api/perguntas', (req, res) => res.json({ dimensoes: DIMENSOES, perguntas: PERGUNTAS }));

const envios = new Map();
app.post('/api/diagnosticos', (req, res) => {
  const ip = req.ip;
  const agora = Date.now();
  const t = (envios.get(ip) || []).filter((ts) => agora - ts < 60 * 60 * 1000);
  if (t.length >= 20) return res.status(429).json({ erro: 'Limite de envios atingido. Tente mais tarde.' });

  const { contato = {}, respostas = {} } = req.body || {};
  const campo = (k, max = 120) => String(contato[k] || '').trim().slice(0, max);
  const dados = {
    nome: campo('nome'), email: campo('email'), whatsapp: campo('whatsapp', 30), empresa: campo('empresa'),
    cargo: campo('cargo'), setor: campo('setor', 60), porte: campo('porte', 30),
  };
  if (!dados.nome || !dados.empresa || !/^\S+@\S+\.\S+$/.test(dados.email)) {
    return res.status(400).json({ erro: 'Preencha nome, empresa e um e-mail válido.' });
  }
  let resultado;
  try {
    resultado = calcular(respostas);
  } catch (e) {
    return res.status(400).json({ erro: 'Responda todas as perguntas.' });
  }
  t.push(agora);
  envios.set(ip, t);

  const id = crypto.randomBytes(9).toString('base64url');
  const limpas = Object.fromEntries(PERGUNTAS.map((p) => [p.id, Number(respostas[p.id])]));
  db.prepare(`INSERT INTO diagnosticos (id, criado_em, nome, email, whatsapp, empresa, cargo, setor, porte, respostas, resultado, score)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, new Date().toISOString(), dados.nome, dados.email, dados.whatsapp, dados.empresa, dados.cargo, dados.setor,
      dados.porte, JSON.stringify(limpas), JSON.stringify(resultado), resultado.score);
  res.json({ id });
});

app.get('/api/diagnosticos/:id/publico', (req, res) => {
  const row = db.prepare('SELECT id, criado_em, nome, empresa, resultado FROM diagnosticos WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ erro: 'Diagnóstico não encontrado' });
  res.json({ ...row, resultado: JSON.parse(row.resultado) });
});

// ---------- Auth API ----------
app.get('/api/auth/estado', (req, res) => {
  res.json({ configurado: Boolean(getSetting('senha_hash')), logado: sessaoValida(req) });
});

app.post('/api/auth/primeiro-acesso', limitaTentativas, (req, res) => {
  if (getSetting('senha_hash')) return res.status(400).json({ erro: 'Acesso já configurado. Use sua senha.' });
  const { codigo, senha } = req.body || {};
  if (!SETUP_CODE) return res.status(500).json({ erro: 'Código de primeiro acesso não configurado no servidor.' });
  const a = Buffer.from(String(codigo || '').trim().toUpperCase());
  const b = Buffer.from(SETUP_CODE.toUpperCase());
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ erro: 'Código de acesso inválido.' });
  if (String(senha || '').length < 8) return res.status(400).json({ erro: 'A senha precisa ter pelo menos 8 caracteres.' });
  setSetting('senha_hash', hashSenha(String(senha)));
  criaSessao(res);
  res.json({ ok: true });
});

app.post('/api/auth/login', limitaTentativas, (req, res) => {
  if (!confereSenha(String(req.body?.senha || ''), getSetting('senha_hash'))) {
    return res.status(401).json({ erro: 'Senha incorreta.' });
  }
  criaSessao(res);
  res.json({ ok: true });
});

app.post('/api/auth/sair', (req, res) => {
  res.clearCookie('sid');
  res.json({ ok: true });
});

app.post('/api/auth/senha', exigeLogin, (req, res) => {
  const { atual, nova } = req.body || {};
  if (!confereSenha(String(atual || ''), getSetting('senha_hash'))) return res.status(401).json({ erro: 'Senha atual incorreta.' });
  if (String(nova || '').length < 8) return res.status(400).json({ erro: 'A nova senha precisa ter pelo menos 8 caracteres.' });
  setSetting('senha_hash', hashSenha(String(nova)));
  res.json({ ok: true });
});

// ---------- API do painel ----------
app.get('/api/admin/resumo', exigeLogin, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS n, ROUND(AVG(score)) AS media FROM diagnosticos').get();
  const mes = db.prepare("SELECT COUNT(*) AS n FROM diagnosticos WHERE criado_em >= ?")
    .get(new Date(Date.now() - 30 * 864e5).toISOString());
  const novos = db.prepare("SELECT COUNT(*) AS n FROM diagnosticos WHERE status = 'Novo'").get();
  res.json({ total: total.n, media: total.media ?? 0, ultimos30: mes.n, novos: novos.n });
});

app.get('/api/admin/diagnosticos', exigeLogin, (req, res) => {
  const rows = db.prepare(`SELECT id, criado_em, nome, email, whatsapp, empresa, cargo, setor, porte, score, status, resultado
                           FROM diagnosticos ORDER BY criado_em DESC`).all();
  res.json(rows.map((r) => ({ ...r, nivel: JSON.parse(r.resultado).nivel, resultado: undefined })));
});

app.get('/api/admin/diagnosticos/:id', exigeLogin, (req, res) => {
  const row = db.prepare('SELECT * FROM diagnosticos WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ erro: 'Não encontrado' });
  res.json({ ...row, respostas: JSON.parse(row.respostas), resultado: JSON.parse(row.resultado), perguntas: PERGUNTAS });
});

const STATUS = ['Novo', 'Em contato', 'Proposta', 'Cliente', 'Arquivado'];
app.patch('/api/admin/diagnosticos/:id', exigeLogin, (req, res) => {
  const { status, notas } = req.body || {};
  if (status !== undefined && !STATUS.includes(status)) return res.status(400).json({ erro: 'Status inválido' });
  const row = db.prepare('SELECT status, notas FROM diagnosticos WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ erro: 'Não encontrado' });
  db.prepare('UPDATE diagnosticos SET status = ?, notas = ? WHERE id = ?')
    .run(status ?? row.status, notas !== undefined ? String(notas).slice(0, 5000) : row.notas, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/admin/diagnosticos/:id', exigeLogin, (req, res) => {
  db.prepare('DELETE FROM diagnosticos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/exportar.csv', exigeLogin, (req, res) => {
  const rows = db.prepare('SELECT * FROM diagnosticos ORDER BY criado_em DESC').all();
  const cols = ['criado_em', 'nome', 'email', 'whatsapp', 'empresa', 'cargo', 'setor', 'porte', 'score', 'nivel', 'status', 'notas'];
  const cel = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const linhas = rows.map((r) => cols.map((c) => cel(c === 'nivel' ? JSON.parse(r.resultado).nivel : r[c])).join(';'));
  res.type('text/csv; charset=utf-8').attachment('diagnosticos.csv').send('﻿' + [cols.join(';'), ...linhas].join('\n'));
});

app.get('/api/admin/perfil', exigeLogin, (req, res) => res.json(perfil()));

app.put('/api/admin/perfil', exigeLogin, (req, res) => {
  const body = req.body || {};
  for (const k of ['nome', 'titulo', 'chamada', 'empresa', 'bio', 'whatsapp', 'linkedin', 'email']) {
    if (body[k] !== undefined) setSetting(`perfil.${k}`, String(body[k]).slice(0, k === 'bio' ? 4000 : 300));
  }
  res.json(perfil());
});

app.post('/api/admin/foto', exigeLogin, (req, res) => {
  const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(String(req.body?.imagem || ''));
  if (!m) return res.status(400).json({ erro: 'Imagem inválida' });
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 4 * 1024 * 1024) return res.status(400).json({ erro: 'Imagem muito grande' });
  const antigo = getSetting('perfil.foto');
  const nome = `foto-${Date.now()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, nome), buf);
  setSetting('perfil.foto', `/uploads/${nome}`);
  if (antigo?.startsWith('/uploads/')) fs.rm(path.join(UPLOAD_DIR, path.basename(antigo)), { force: true }, () => {});
  res.json({ foto: `/uploads/${nome}` });
});

app.use((req, res) => res.status(404).type('html').send('<p style="font-family:sans-serif;padding:40px">Página não encontrada. <a href="/">Voltar</a></p>'));

app.listen(PORT, () => {
  console.log(`Rodando em http://localhost:${PORT}`);
  if (!getSetting('senha_hash') && !SETUP_CODE) console.warn('ATENÇÃO: defina SETUP_CODE para permitir o primeiro acesso ao painel.');
});

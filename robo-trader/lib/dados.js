// Candles: { t (ms, relógio de Brasília codificado como UTC), o, h, l, c, v }
const TICK = 5;
const arred = (p) => Math.round(p / TICK) * TICK;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Série SINTÉTICA de 1 minuto (passeio aleatório com regimes). Serve só para testar a mecânica.
function gerarSintetico({ dias = 60, semente = 7, base = 160000 } = {}) {
  const rnd = mulberry32(semente);
  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const out = [];
  let preco = base;
  const d = new Date(Date.UTC(2026, 7, 3));
  let feitos = 0;
  while (feitos < dias) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      const volDia = 22 + rnd() * 30; // desvio por minuto, em pontos
      let tendencia = gauss() * 1.6;
      preco = arred(preco + gauss() * 250); // gap de abertura
      for (let m = 9 * 60; m < 17 * 60 + 55; m++) {
        const frac = (m - 540) / 535;
        const u = 1 + 1.3 * Math.pow(2 * frac - 1, 2); // mais volátil na abertura e no fim
        if (rnd() < 0.004) tendencia = gauss() * 1.6;
        const o = preco;
        let hi = o, lo = o, p = o;
        for (let k = 0; k < 4; k++) {
          p += tendencia / 4 + (gauss() * volDia * u) / 2;
          hi = Math.max(hi, p);
          lo = Math.min(lo, p);
        }
        const c = arred(p);
        const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, m);
        out.push({ t, o, h: Math.max(arred(hi), o, c), l: Math.min(arred(lo), o, c), c, v: Math.round((800 + rnd() * 2400) * u) });
        preco = c;
      }
      feitos++;
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function agregar(candles, minutos) {
  const ms = minutos * 60000;
  const out = [];
  let cur = null;
  for (const c of candles) {
    const k = Math.floor(c.t / ms);
    if (!cur || cur.k !== k) {
      cur = { k, t: k * ms, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v || 0 };
      out.push(cur);
    } else {
      cur.h = Math.max(cur.h, c.h);
      cur.l = Math.min(cur.l, c.l);
      cur.c = c.c;
      cur.v += c.v || 0;
    }
  }
  return out.map(({ k, ...r }) => r);
}

function intervaloMinutos(candles) {
  const cont = new Map();
  for (let i = 1; i < Math.min(candles.length, 400); i++) {
    const d = Math.round((candles[i].t - candles[i - 1].t) / 60000);
    if (d > 0) cont.set(d, (cont.get(d) || 0) + 1);
  }
  let melhor = 0, n = 0;
  for (const [d, q] of cont) if (q > n) { melhor = d; n = q; }
  return melhor;
}

const num = (s) => {
  s = String(s).trim().replace(/[^\d.,-]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  return Number(s);
};

// CSV exportado do Profit (ou similar). Aceita ; , ou tab; data dd/mm/aaaa ou aaaa-mm-dd; com ou sem cabeçalho.
function lerCsv(texto) {
  const linhas = String(texto).replace(/^﻿/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!linhas.length) throw new Error('Arquivo vazio.');
  const sep = [';', '\t', ','].find((s) => linhas[Math.min(1, linhas.length - 1)].split(s).length >= 5);
  if (!sep) throw new Error('Não reconheci o separador (use ; , ou tab).');
  const reData = /^(\d{2})\/(\d{2})\/(\d{4})|^(\d{4})-(\d{2})-(\d{2})/;
  const reHora = /(\d{1,2}):(\d{2})(?::(\d{2}))?/;
  let idx = null;
  const cab = linhas[0].split(sep).map((s) => s.trim().toLowerCase());
  if (!cab.some((c) => reData.test(c))) {
    const acha = (...nomes) => cab.findIndex((c) => nomes.some((n) => c.startsWith(n)));
    idx = { d: acha('data', 'date'), h: acha('hora', 'time'), o: acha('abertura', 'open'), hi: acha('máxim', 'maxim', 'high'), lo: acha('mínim', 'minim', 'low'), c: acha('fechamento', 'close', 'último', 'ultimo'), v: acha('quantidade', 'qtd') };
    if (idx.v < 0) idx.v = acha('volume', 'vol');
    linhas.shift();
  }
  const out = [];
  for (const l of linhas) {
    const col = l.split(sep).map((s) => s.trim());
    let iD, iH, o, h, lo, c, v = 0;
    if (idx && idx.d >= 0 && idx.o >= 0 && idx.c >= 0) {
      iD = idx.d; iH = idx.h;
      o = num(col[idx.o]); h = num(col[idx.hi]); lo = num(col[idx.lo]); c = num(col[idx.c]);
      if (idx.v >= 0) v = num(col[idx.v]) || 0;
    } else {
      iD = col.findIndex((x) => reData.test(x));
      if (iD < 0) continue;
      iH = col.findIndex((x, i) => i !== iD && /^\d{1,2}:\d{2}/.test(x));
      const resto = col.map((x, i) => (i === iD || i === iH ? NaN : num(x))).filter((x) => Number.isFinite(x));
      if (resto.length < 4) continue;
      [o, h, lo, c] = resto;
      v = resto[4] || 0;
    }
    const md = reData.exec(col[iD] || '');
    if (!md || ![o, h, lo, c].every(Number.isFinite)) continue;
    const [ano, mes, dia] = md[1] ? [md[3], md[2], md[1]] : [md[4], md[5], md[6]];
    const mh = reHora.exec(iH >= 0 ? col[iH] : col[iD].slice(10)) || [0, 0, 0];
    const t = Date.UTC(+ano, +mes - 1, +dia, +mh[1], +mh[2]);
    out.push({ t, o, h: Math.max(h, lo, o, c), l: Math.min(h, lo, o, c), c, v });
  }
  if (out.length < 50) throw new Error(`Só consegui ler ${out.length} candles. Confira se o arquivo tem data, hora, abertura, máxima, mínima e fechamento.`);
  out.sort((a, b) => a.t - b.t);
  const tf = intervaloMinutos(out);
  if (!tf || tf > 15) throw new Error(`O intervalo dos candles parece ser de ${tf || '?'} min. Exporte em 1, 5 ou 15 minutos.`);
  return { candles: out, tf };
}

// Ibovespa à vista pelo Yahoo (não oficial, pode falhar). É um substituto aproximado do WIN.
async function buscarYahoo(tf) {
  const range = tf === 1 ? '7d' : '60d';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP?interval=${tf}m&range=${range}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`Yahoo respondeu ${r.status}`);
  const j = await r.json();
  const res = j.chart?.result?.[0];
  const q = res?.indicators?.quote?.[0];
  if (!res?.timestamp || !q) throw new Error('Yahoo não devolveu candles');
  const out = [];
  res.timestamp.forEach((ts, i) => {
    if (q.open[i] == null || q.close[i] == null) return;
    out.push({ t: (ts - 3 * 3600) * 1000, o: arred(q.open[i]), h: arred(q.high[i]), l: arred(q.low[i]), c: arred(q.close[i]), v: q.volume[i] || 0 });
  });
  if (out.length < 50) throw new Error('Yahoo devolveu poucos candles');
  return out;
}

module.exports = { TICK, gerarSintetico, agregar, lerCsv, buscarYahoo, intervaloMinutos };

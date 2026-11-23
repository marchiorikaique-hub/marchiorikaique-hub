// Motores de simulação. Preço em pontos do WIN; R$ 0,20 por ponto por contrato.
const { TICK } = require('./dados');

const diaDe = (t) => new Date(t).toISOString().slice(0, 10);
const minDe = (t) => { const d = new Date(t); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const hhmm = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };

// Caminho do preço dentro do candle, de tick em tick. Candle de alta: abre, vai à mínima, à máxima e fecha.
// Candle de baixa: abre, vai à máxima, à mínima e fecha. É uma aproximação: o OHLC não diz a ordem real.
function caminho(c) {
  const pts = c.c >= c.o ? [c.o, c.l, c.h, c.c] : [c.o, c.h, c.l, c.c];
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const s = Math.sign(b - a);
    if (!s) continue;
    for (let p = a + s * TICK; s > 0 ? p <= b : p >= b; p += s * TICK) out.push(p);
  }
  return out;
}

function resumo(trades, extras = {}) {
  const porDia = new Map();
  let saldo = 0, pico = 0, dd = 0, ganho = 0, perda = 0, acertos = 0;
  const curva = [];
  const motivos = {};
  for (const t of trades) {
    saldo += t.brl;
    pico = Math.max(pico, saldo);
    dd = Math.max(dd, pico - saldo);
    if (t.brl > 0) { ganho += t.brl; acertos++; } else perda -= t.brl;
    curva.push({ t: t.tSaida, v: Math.round(saldo * 100) / 100 });
    motivos[t.motivo] = (motivos[t.motivo] || 0) + 1;
    const d = porDia.get(t.dia) || { dia: t.dia, brl: 0, trades: 0 };
    d.brl += t.brl; d.trades++;
    porDia.set(t.dia, d);
  }
  const dias = [...porDia.values()].map((d) => ({ ...d, brl: Math.round(d.brl * 100) / 100 }));
  return {
    total: Math.round(saldo * 100) / 100,
    operacoes: trades.length,
    acerto: trades.length ? acertos / trades.length : 0,
    fatorLucro: perda ? ganho / perda : null,
    drawdown: Math.round(dd * 100) / 100,
    diasOperados: dias.length,
    diasPositivos: dias.filter((d) => d.brl > 0).length,
    piorDia: dias.reduce((m, d) => Math.min(m, d.brl), 0),
    melhorDia: dias.reduce((m, d) => Math.max(m, d.brl), 0),
    motivos, dias, curva, ...extras,
  };
}

const GRID_PADRAO = {
  tfDirecao: 15, niveis: '200,600', alvoAdicional: 800, alvoPrincipal: 1000, stopGlobal: 1000,
  qtdPrincipal: 1, qtdAdicional: 1, inicio: '09:15', fim: '16:30', zeragem: '16:50',
  perdaDiaria: 500, maxCiclos: 3, rearmar: false, custo: 0, valorPonto: 0.2,
};

// Grid 15M: direção pelo candle fechado, posição principal + entradas adicionais nos recuos.
// Cada entrada tem preço e quantidade próprios (não usa preço médio consolidado).
function simularGrid(base, params = {}) {
  const P = { ...GRID_PADRAO, ...params };
  const niveis = String(P.niveis).split(/[,; ]+/).map(Number).filter((n) => n > 0).sort((a, b) => a - b);
  const ini = hhmm(P.inicio), fim = hhmm(P.fim), zer = hhmm(P.zeragem);
  const tfMs = P.tfDirecao * 60000;
  const trades = [];
  let pos = null, balde = null, ultimo = null;
  let dia = null, realizadoDia = 0, ciclos = 0, travado = false;
  let maxContratos = 0, piorFlutuante = 0, ciclosTotal = 0;

  const fechar = (e, preco, t, motivo) => {
    const pts = (preco - e.preco) * pos.lado;
    const brl = pts * e.qtd * P.valorPonto - P.custo * e.qtd * 2;
    e.aberta = false;
    realizadoDia += brl;
    trades.push({ dia, tipo: e.tipo, nivel: e.nivel, lado: pos.lado, qtd: e.qtd, tEntrada: e.t, pEntrada: e.preco, tSaida: t, pSaida: preco, pts, brl: Math.round(brl * 100) / 100, motivo });
  };
  const fecharTudo = (preco, t, motivo) => {
    for (const e of pos.entradas) if (e.aberta) fechar(e, preco, t, motivo);
    pos = null; ciclos++; ciclosTotal++;
  };
  const flutuante = (p) => pos.entradas.reduce((s, e) => s + (e.aberta ? (p - e.preco) * pos.lado * e.qtd * P.valorPonto : 0), 0);

  const passo = (p, t) => {
    const s = pos.lado, pr = pos.entradas[0];
    const contra = (pr.preco - p) * s;
    if (contra >= P.stopGlobal) return fecharTudo(p, t, 'Stop global');
    niveis.forEach((dist, i) => {
      if (contra >= dist && !pos.armado[i]) {
        pos.armado[i] = true;
        pos.entradas.push({ tipo: 'Adicional', nivel: dist, preco: pr.preco - s * dist, qtd: P.qtdAdicional, t, aberta: true, i });
      }
    });
    for (const e of pos.entradas) {
      if (e.aberta && e.tipo === 'Adicional' && (p - e.preco) * s >= P.alvoAdicional) {
        fechar(e, e.preco + s * P.alvoAdicional, t, 'Alvo do adicional');
        if (P.rearmar) pos.armado[e.i] = false;
      }
    }
    if ((p - pr.preco) * s >= P.alvoPrincipal) return fecharTudo(p, t, 'Alvo da principal');
    const abertos = pos.entradas.reduce((n, e) => n + (e.aberta ? e.qtd : 0), 0);
    maxContratos = Math.max(maxContratos, abertos);
    const f = flutuante(p);
    piorFlutuante = Math.min(piorFlutuante, f);
    if (P.perdaDiaria > 0 && realizadoDia + f <= -P.perdaDiaria) { travado = true; return fecharTudo(p, t, 'Limite de perda diária'); }
  };

  let anterior = null;
  for (const c of base) {
    const d = diaDe(c.t);
    if (d !== dia) {
      if (pos && anterior) fecharTudo(anterior.c, anterior.t, 'Fim dos dados do dia');
      dia = d; realizadoDia = 0; ciclos = 0; travado = false; balde = null; ultimo = null;
    }
    const k = Math.floor(c.t / tfMs);
    let novo = false;
    if (balde && balde.k !== k) { ultimo = balde; balde = null; novo = true; }
    if (!balde) balde = { k, o: c.o, c: c.c }; else balde.c = c.c;
    const m = minDe(c.t);
    if (!pos && novo && ultimo && m >= ini && m <= fim && !travado && ciclos < P.maxCiclos) {
      const lado = Math.sign(ultimo.c - ultimo.o);
      if (lado) pos = { lado, armado: [], entradas: [{ tipo: 'Principal', nivel: 0, preco: c.o, qtd: P.qtdPrincipal, t: c.t, aberta: true }] };
    }
    if (pos) {
      if (m >= zer) fecharTudo(c.o, c.t, 'Zeragem do dia');
      else for (const p of caminho(c)) { passo(p, c.t); if (!pos) break; }
    }
    anterior = c;
  }
  if (pos && anterior) fecharTudo(anterior.c, anterior.t, 'Fim dos dados');
  return { params: P, trades, ...resumo(trades, { maxContratos, piorFlutuante: Math.round(piorFlutuante * 100) / 100, ciclos: ciclosTotal }) };
}

const SCALPER_PADRAO = {
  emaRapida: 9, emaLenta: 21, emaTendencia: 200, mediaVolume: 20, stop: 100, alvo: 150, contratos: 1,
  maxOperacoes: 5, perdaDiaria: 60, inicio: '09:15', fim: '16:30', zeragem: '16:50', custo: 0, valorPonto: 0.2,
};

// WIN Scalper V1: cruzamento EMA 9/21, filtro EMA 200, candle a favor e volume acima da média.
function simularScalper(base, params = {}) {
  const P = { ...SCALPER_PADRAO, ...params };
  const ini = hhmm(P.inicio), fim = hhmm(P.fim), zer = hhmm(P.zeragem);
  const semVolume = !base.some((c) => c.v > 0);
  const k = (n) => 2 / (n + 1);
  const trades = [];
  let eR = null, eL = null, eT = null, aR = null, aL = null;
  const vols = [];
  let pos = null, sinal = 0, dia = null, ops = 0, realizadoDia = 0;

  const fechar = (preco, t, motivo) => {
    const pts = (preco - pos.preco) * pos.lado;
    const brl = pts * P.contratos * P.valorPonto - P.custo * P.contratos * 2;
    realizadoDia += brl;
    trades.push({ dia, tipo: 'Scalp', nivel: 0, lado: pos.lado, qtd: P.contratos, tEntrada: pos.t, pEntrada: pos.preco, tSaida: t, pSaida: preco, pts, brl: Math.round(brl * 100) / 100, motivo });
    pos = null;
  };

  let anterior = null;
  base.forEach((c, i) => {
    const d = diaDe(c.t);
    if (d !== dia) {
      if (pos && anterior) fechar(anterior.c, anterior.t, 'Fim dos dados do dia');
      dia = d; ops = 0; realizadoDia = 0; sinal = 0;
    }
    const m = minDe(c.t);
    if (!pos && sinal && m >= ini && m <= fim && ops < P.maxOperacoes && realizadoDia > -P.perdaDiaria) {
      pos = { lado: sinal, preco: c.o, t: c.t };
      ops++;
    }
    sinal = 0;
    if (pos) {
      if (m >= zer) fechar(c.o, c.t, 'Zeragem do dia');
      else for (const p of caminho(c)) {
        const pts = (p - pos.preco) * pos.lado;
        if (pts <= -P.stop) { fechar(pos.preco - pos.lado * P.stop, c.t, 'Stop'); break; }
        if (pts >= P.alvo) { fechar(pos.preco + pos.lado * P.alvo, c.t, 'Alvo'); break; }
      }
    }
    aR = eR; aL = eL;
    eR = eR == null ? c.c : eR + k(P.emaRapida) * (c.c - eR);
    eL = eL == null ? c.c : eL + k(P.emaLenta) * (c.c - eL);
    eT = eT == null ? c.c : eT + k(P.emaTendencia) * (c.c - eT);
    const mv = vols.length >= P.mediaVolume ? vols.slice(-P.mediaVolume).reduce((a, b) => a + b, 0) / P.mediaVolume : Infinity;
    const volOk = semVolume || c.v > mv;
    if (i >= P.emaTendencia && aR != null && !pos) {
      if (aR <= aL && eR > eL && c.c > eT && c.c > c.o && volOk) sinal = 1;
      else if (aR >= aL && eR < eL && c.c < eT && c.c < c.o && volOk) sinal = -1;
    }
    vols.push(c.v || 0);
    anterior = c;
  });
  if (pos && anterior) fechar(anterior.c, anterior.t, 'Fim dos dados');
  return { params: P, trades, semVolume, ...resumo(trades, { maxContratos: P.contratos }) };
}

module.exports = { simularGrid, simularScalper, caminho, GRID_PADRAO, SCALPER_PADRAO };

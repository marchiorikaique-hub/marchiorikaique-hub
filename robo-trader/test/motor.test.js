const test = require('node:test');
const assert = require('node:assert');
const { simularGrid, simularScalper } = require('../lib/motor');
const { lerCsv, gerarSintetico, agregar } = require('../lib/dados');

const T0 = Date.UTC(2026, 10, 3, 9, 0);
const vela = (i, o, h, l, c) => ({ t: T0 + i * 15 * 60000, o, h, l, c, v: 1000 });

test('grid: adicional sai no alvo próprio e a principal continua até o alvo dela', () => {
  const base = [
    vela(0, 100000, 100100, 99950, 100050), // 09:00 alta -> direção compra
    vela(1, 100050, 100100, 99800, 99900),  // 09:15 entra a 100050; recua 250 -> adicional em 99850
    vela(2, 99900, 100700, 99880, 100650),  // adicional bate 100650 (+800)
    vela(3, 100650, 101100, 100600, 101080), // principal bate 101050 (+1000)
  ];
  const r = simularGrid(base, { niveis: '200,600' });
  assert.deepStrictEqual(r.trades.map((t) => [t.tipo, t.pEntrada, t.pSaida, t.motivo]), [
    ['Adicional', 99850, 100650, 'Alvo do adicional'],
    ['Principal', 100050, 101050, 'Alvo da principal'],
  ]);
  assert.strictEqual(r.total, (800 + 1000) * 0.2);
  assert.strictEqual(r.maxContratos, 2);
});

test('grid: stop global zera principal e adicionais, cada um com seu preço', () => {
  const base = [
    vela(0, 100000, 100100, 99950, 100050),
    vela(1, 100050, 100060, 98900, 99000), // recua 1000 -> adicionais em 99850 e 99450, stop em 99050
  ];
  const r = simularGrid(base, { perdaDiaria: 0 });
  assert.deepStrictEqual(r.trades.map((t) => [t.tipo, t.nivel, t.pts]), [['Principal', 0, -1000], ['Adicional', 200, -800], ['Adicional', 600, -400]]);
  assert.strictEqual(r.total, -2200 * 0.2);
});

test('grid: limite de perda diária conta a posição aberta e trava o dia', () => {
  const base = [
    vela(0, 100000, 100100, 99950, 100050),
    vela(1, 100050, 100060, 98900, 99000),
    vela(2, 99000, 99400, 98990, 99390),
    vela(3, 99390, 99800, 99380, 99700),
  ];
  const r = simularGrid(base, { perdaDiaria: 200 });
  assert.ok(r.trades.every((t) => t.motivo === 'Limite de perda diária'));
  assert.ok(r.total <= -200 && r.total > -210);
  assert.strictEqual(r.ciclos, 1);
});

test('scalper: resultado por operação fica entre o stop e o alvo', () => {
  const r = simularScalper(gerarSintetico({ dias: 10 }));
  assert.ok(r.operacoes > 0);
  for (const t of r.trades) assert.ok(t.pts >= -100 && t.pts <= 150);
  for (const d of r.dias) assert.ok(d.trades <= 5);
});

test('csv do Profit: ordem decrescente, ponto de milhar e vírgula decimal', () => {
  const linhas = ['Ativo;Data;Hora;Abertura;Máximo;Mínimo;Fechamento;Volume;Quantidade'];
  for (let i = 59; i >= 0; i--) linhas.push(`WINZ26;03/11/2026;09:${String(i).padStart(2, '0')}:00;128.450,00;128.500,00;128.400,00;128.455,00;1.000,00;10`);
  const { candles, tf } = lerCsv(linhas.join('\r\n'));
  assert.strictEqual(tf, 1);
  assert.strictEqual(candles.length, 60);
  assert.deepStrictEqual(candles[0], { t: Date.UTC(2026, 10, 3, 9, 0), o: 128450, h: 128500, l: 128400, c: 128455, v: 10 });
  assert.strictEqual(agregar(candles, 15).length, 4);
});

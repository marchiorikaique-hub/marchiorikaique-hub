// Contexto de mercado a partir de APIs públicas. Cada fonte falha sozinha, sem derrubar as outras.
const pega = async (url, tipo = 'json') => {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (painel-robo-trader)' }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return tipo === 'json' ? r.json() : r.text();
};
const sgs = (serie, n) => pega(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados/ultimos/${n}?formato=json`);
const tenta = async (fn) => { try { return { ok: true, ...(await fn()) }; } catch (e) { return { ok: false, erro: String(e.message || e) }; } };

const POLOS = [
  { nome: 'Sorriso (MT)', cultura: 'soja e milho', lat: -12.55, lon: -55.72 },
  { nome: 'Ribeirão Preto (SP)', cultura: 'cana', lat: -21.18, lon: -47.81 },
  { nome: 'Rio Verde (GO)', cultura: 'soja e milho', lat: -17.8, lon: -50.92 },
];
const TEMAS = /copom|selic|fed\b|juros|d[oó]lar|c[aâ]mbio|ipca|infla[cç][aã]o|payroll|fiscal|ibovespa|petrobras|vale\b|china|tarifa/i;

const limpa = (s) => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#8217;|&#8216;/g, "'").replace(/&#8220;|&#8221;|&quot;/g, '"').replace(/&#\d+;/g, '').trim();
function lerRss(xml, fonte) {
  const itens = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const tag = (n) => limpa((new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`).exec(m[1]) || [])[1] || '');
    const titulo = tag('title');
    const link = tag('link');
    if (!titulo || !/^https?:\/\//.test(link)) continue;
    itens.push({ titulo, link, data: new Date(tag('pubDate')).toISOString(), fonte, destaque: TEMAS.test(titulo) });
  }
  return itens;
}

let cache = { em: 0, dados: null };
async function contexto() {
  if (cache.dados && Date.now() - cache.em < 5 * 60000) return cache.dados;
  const [dolar, selic, ipca, ibov, cripto, clima, noticias] = await Promise.all([
    tenta(async () => {
      const s = (await sgs(1, 20)).map((x) => ({ data: x.data, valor: Number(x.valor) }));
      const u = s.at(-1), a = s.at(-2);
      return { valor: u.valor, data: u.data, variacao: (u.valor / a.valor - 1) * 100, serie: s };
    }),
    tenta(async () => { const u = (await sgs(432, 1))[0]; return { valor: Number(u.valor), data: u.data }; }),
    tenta(async () => { const u = (await sgs(13522, 1))[0]; return { valor: Number(u.valor), data: u.data }; }),
    tenta(async () => {
      const r = (await pega('https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP?interval=1d&range=5d')).chart.result[0];
      const f = r.indicators.quote[0].close.filter((x) => x != null);
      const atual = r.meta.regularMarketPrice ?? f.at(-1);
      return { valor: atual, variacao: (atual / f.at(-2) - 1) * 100 };
    }),
    tenta(async () => {
      const j = await pega('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=brl&include_24hr_change=true');
      return { btc: j.bitcoin.brl, btcVar: j.bitcoin.brl_24h_change, eth: j.ethereum.brl, ethVar: j.ethereum.brl_24h_change };
    }),
    tenta(async () => {
      const j = await pega(`https://api.open-meteo.com/v1/forecast?latitude=${POLOS.map((p) => p.lat)}&longitude=${POLOS.map((p) => p.lon)}&daily=precipitation_sum&forecast_days=7&timezone=America%2FSao_Paulo`);
      const arr = Array.isArray(j) ? j : [j];
      return { polos: POLOS.map((p, i) => ({ nome: p.nome, cultura: p.cultura, dias: arr[i].daily.time, chuva: arr[i].daily.precipitation_sum, total: arr[i].daily.precipitation_sum.reduce((a, b) => a + (b || 0), 0) })) };
    }),
    tenta(async () => {
      const feeds = [['InfoMoney Mercados', 'https://www.infomoney.com.br/mercados/feed/'], ['InfoMoney', 'https://www.infomoney.com.br/feed/']];
      const r = await Promise.allSettled(feeds.map(async ([f, u]) => lerRss(await pega(u, 'texto'), f)));
      const vistos = new Set();
      const itens = r.flatMap((x) => (x.status === 'fulfilled' ? x.value : [])).filter((i) => !vistos.has(i.link) && vistos.add(i.link));
      if (!itens.length) throw new Error('nenhum feed respondeu');
      itens.sort((a, b) => b.data.localeCompare(a.data));
      return { itens: itens.slice(0, 20) };
    }),
  ]);
  const dados = { atualizado: new Date().toISOString(), dolar, selic, ipca, ibov, cripto, clima, noticias };
  cache = { em: Date.now(), dados };
  return dados;
}

module.exports = { contexto, lerRss };

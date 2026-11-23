// Estado do projeto e pontos que o Vitor precisa confirmar.
const ROBOS = [
  { id: 'grid', nome: 'WIN Grid 15M', mercado: 'Mini-índice B3', tecnologia: 'NTSL / Profit', estado: 'Simulador pronto', nota: 'Regras no simulador com premissas a confirmar. Código NTSL só depois da validação.' },
  { id: 'scalper', nome: 'WIN Scalper V1', mercado: 'Mini-índice B3', tecnologia: 'NTSL / Profit', estado: 'Simulador pronto', nota: 'Protótipo NTSL existe, ainda não compilado nem testado no Profit.' },
  { id: 'smart', nome: 'Smart Money + IA', mercado: 'Mini-índice B3', tecnologia: 'A definir', estado: 'Planejado', nota: 'Indicadores e modelo de IA ainda não definidos.' },
  { id: 'cripto', nome: 'Crypto Scalper', mercado: 'Binance', tecnologia: 'Python / Docker', estado: 'Planejado', nota: 'Começa em simulação, com operação real desligada.' },
];

const PONTOS = [
  { id: 'direcao', titulo: 'Direção do candle de 15 minutos', premissa: 'Candle fechou acima da abertura: compra. Fechou abaixo: venda. Fechou igual: não entra.' },
  { id: 'entrada', titulo: 'Entrada da posição principal', premissa: 'A mercado, na abertura do candle seguinte ao que deu a direção, só se não houver posição aberta.' },
  { id: 'niveis', titulo: 'Níveis de recuo', premissa: 'Uma entrada adicional a 200 pontos e outra a 600 pontos contra, medidos a partir do preço da principal.' },
  { id: 'alvo-adicional', titulo: 'Alvo das entradas adicionais', premissa: '800 pontos a partir do preço da própria entrada adicional. Ela sai sozinha e a principal continua.' },
  { id: 'saida-principal', titulo: 'Quando encerrar a posição principal', premissa: 'Alvo de 1.000 pontos ou zeragem às 16h50, o que vier primeiro. Ao sair, fecha também os adicionais abertos.' },
  { id: 'stop', titulo: 'Reversão prolongada', premissa: 'Stop global a 1.000 pontos contra a principal: zera tudo. Não abre mais entradas além dos dois níveis e não vira a mão.' },
  { id: 'contratos', titulo: 'Quantidade de contratos', premissa: '1 contrato na principal e 1 em cada adicional, no máximo 3 contratos ao mesmo tempo.' },
  { id: 'rearme', titulo: 'Reabrir um nível já usado', premissa: 'Não. Depois que o adicional de um nível sai no alvo, aquele nível não é reaberto no mesmo ciclo.' },
  { id: 'horario', titulo: 'Horários de operação', premissa: 'Entradas entre 09h15 e 16h30, zeragem obrigatória às 16h50.' },
  { id: 'risco-dia', titulo: 'Limites do dia', premissa: 'Perda máxima de R$ 500 no dia (contando posição aberta) e até 3 ciclos por dia. Ao bater o limite, zera e para.' },
  { id: 'preco-medio', titulo: 'Preço médio consolidado no Profit', premissa: 'O robô guarda preço e quantidade de cada entrada em variáveis próprias e ignora o preço médio da plataforma.' },
  { id: 'conta', titulo: 'Ambiente de teste', premissa: 'Tudo roda primeiro no simulador do Profit. Conta real só depois de resultado consistente e com limite de perda na corretora.' },
];

module.exports = { ROBOS, PONTOS };

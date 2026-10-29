// Diagnóstico de Maturidade em IA & Governança: perguntas, pontuação e recomendações.

const DIMENSOES = [
  { id: 'estrategia', nome: 'Estratégia & Governança' },
  { id: 'processos', nome: 'Processos & Projetos' },
  { id: 'dados', nome: 'Dados & Tecnologia' },
  { id: 'pessoas', nome: 'Pessoas & Cultura' },
];

// Cada resposta vale de 0 a 3 (posição na lista de opções).
const PERGUNTAS = [
  {
    id: 'q1', acao: 'Levar a pauta de IA para a diretoria com um responsável e orçamento definidos.', dim: 'estrategia',
    texto: 'A inteligência artificial está na pauta da diretoria ou do conselho?',
    opcoes: ['Não é discutida', 'Aparece de forma pontual', 'Tem um responsável e orçamento', 'Faz parte da estratégia, com metas'],
  },
  {
    id: 'q2', acao: 'Escrever uma política curta de uso de IA: que dados podem entrar, riscos e quem responde.', dim: 'estrategia',
    texto: 'A empresa tem regras claras para o uso de IA (dados, riscos, ética)?',
    opcoes: ['Não existem regras', 'Há orientações informais', 'Existe política escrita', 'Política aplicada e revisada periodicamente'],
  },
  {
    id: 'q3', acao: 'Montar um portfólio de iniciativas priorizado por valor e risco, com caso de negócio.', dim: 'estrategia',
    texto: 'Como são escolhidas as iniciativas de IA e automação?',
    opcoes: ['Não há iniciativas', 'Por iniciativa individual ou fornecedor', 'Com caso de negócio', 'Portfólio priorizado por valor e risco'],
  },
  {
    id: 'q4', acao: 'Padronizar o acompanhamento de projetos com indicadores visíveis para a liderança.', dim: 'processos',
    texto: 'Como os projetos são acompanhados hoje?',
    opcoes: ['Planilhas e e-mail', 'Ferramenta com atualização manual', 'Ferramenta integrada com indicadores', 'Indicadores em tempo real e alertas automáticos'],
  },
  {
    id: 'q5', acao: 'Mapear os 5 processos mais repetitivos e automatizar o primeiro em até 30 dias.', dim: 'processos',
    texto: 'Quanto das tarefas repetitivas (relatórios, cobranças, follow-ups) já é automatizado?',
    opcoes: ['Quase nada', 'Algumas tarefas isoladas', 'Boa parte dos processos-chave', 'A maioria, com monitoramento'],
  },
  {
    id: 'q6', acao: 'Usar IA com método em um projeto real: termo de abertura, matriz de riscos e status.', dim: 'processos',
    texto: 'A IA já apoia planejamento, riscos ou cronogramas dos projetos?',
    opcoes: ['Não', 'Uso individual e esporádico', 'Em alguns projetos, com método', 'É prática padrão do PMO'],
  },
  {
    id: 'q7', acao: 'Consolidar os dados críticos da operação em uma única fonte confiável.', dim: 'dados',
    texto: 'Onde estão os dados da operação?',
    opcoes: ['Espalhados em planilhas', 'Em sistemas que não conversam', 'Parcialmente integrados', 'Centralizados e confiáveis'],
  },
  {
    id: 'q8', acao: 'Liberar ferramentas de IA corporativas e encerrar o uso de contas pessoais.', dim: 'dados',
    texto: 'Quais ferramentas de IA a equipe usa?',
    opcoes: ['Nenhuma', 'Contas pessoais, sem controle', 'Ferramentas corporativas liberadas', 'Agentes integrados aos sistemas da empresa'],
  },
  {
    id: 'q9', acao: 'Definir controles de acesso, regras de LGPD e trilha de auditoria para dados usados com IA.', dim: 'dados',
    texto: 'Como a empresa trata segurança e LGPD no uso de IA?',
    opcoes: ['Não trata', 'Depende de cada pessoa', 'Há controles básicos de acesso', 'Controles, auditoria e treinamento'],
  },
  {
    id: 'q10', acao: 'Capacitar as lideranças primeiro e depois criar uma trilha prática por área.', dim: 'pessoas',
    texto: 'As equipes foram capacitadas para usar IA no trabalho?',
    opcoes: ['Não', 'Cada um aprende sozinho', 'Treinamentos pontuais', 'Programa contínuo de capacitação'],
  },
  {
    id: 'q11', acao: 'Colocar um patrocinador da diretoria em cada iniciativa, usando a ferramenta ele mesmo.', dim: 'pessoas',
    texto: 'A liderança patrocina e dá exemplo na adoção de novas tecnologias?',
    opcoes: ['Resiste à mudança', 'Apoia no discurso', 'Patrocina projetos específicos', 'Lidera pelo exemplo'],
  },
  {
    id: 'q12', acao: 'Definir 2 ou 3 indicadores de resultado para cada iniciativa e reportar o retorno.', dim: 'pessoas',
    texto: 'Os resultados das iniciativas de tecnologia são medidos?',
    opcoes: ['Não são medidos', 'Percepção geral', 'Indicadores em alguns projetos', 'ROI acompanhado e reportado'],
  },
];

const NIVEIS = [
  { min: 0, nome: 'Inicial', resumo: 'A IA ainda não faz parte da gestão. O maior ganho agora está em organizar a base: prioridades, regras e dados.' },
  { min: 25, nome: 'Em desenvolvimento', resumo: 'Há iniciativas, mas isoladas. O próximo passo é dar direção, dono e método para que virem resultado.' },
  { min: 50, nome: 'Estruturado', resumo: 'A empresa já tem base e governança. O desafio é escalar o que funciona e medir o retorno.' },
  { min: 75, nome: 'Avançado', resumo: 'IA integrada à estratégia e à operação. Foco em inovação contínua, riscos e vantagem competitiva.' },
];

const RECOMENDACOES = {
  estrategia: [
    'Levar a pauta de IA para a diretoria com um responsável definido.',
    'Criar uma política simples de uso de IA (dados, riscos e responsabilidades).',
    'Montar um portfólio de iniciativas priorizado por valor e risco.',
  ],
  processos: [
    'Mapear os 5 processos mais repetitivos e automatizar o primeiro em até 30 dias.',
    'Padronizar o acompanhamento de projetos com indicadores visíveis para a liderança.',
    'Usar IA para gerar termos de abertura, matrizes de risco e relatórios de status.',
  ],
  dados: [
    'Consolidar os dados críticos da operação em uma única fonte confiável.',
    'Liberar ferramentas de IA corporativas e encerrar o uso de contas pessoais.',
    'Definir controles de acesso e regras de LGPD para dados usados com IA.',
  ],
  pessoas: [
    'Capacitar as lideranças primeiro: elas puxam a adoção nas equipes.',
    'Criar uma trilha prática de IA aplicada à rotina de cada área.',
    'Definir 2 ou 3 indicadores de resultado para cada iniciativa.',
  ],
};

function nivelDe(score) {
  return [...NIVEIS].reverse().find((n) => score >= n.min);
}

function calcular(respostas) {
  const porDim = {};
  for (const d of DIMENSOES) porDim[d.id] = { soma: 0, max: 0 };
  for (const p of PERGUNTAS) {
    const v = Number(respostas[p.id]);
    if (!Number.isInteger(v) || v < 0 || v > 3) throw new Error(`Resposta inválida: ${p.id}`);
    porDim[p.dim].soma += v;
    porDim[p.dim].max += 3;
  }
  const dimensoes = DIMENSOES.map((d) => ({
    id: d.id,
    nome: d.nome,
    score: Math.round((porDim[d.id].soma / porDim[d.id].max) * 100),
  }));
  const score = Math.round(dimensoes.reduce((s, d) => s + d.score, 0) / dimensoes.length);
  const nivel = nivelDe(score);

  // Prioridades: as duas dimensões mais fracas, com as ações das perguntas de pior resposta.
  const fracas = [...dimensoes].sort((a, b) => a.score - b.score).slice(0, 2);
  const prioridades = fracas.map((d) => {
    const lacunas = PERGUNTAS.filter((p) => p.dim === d.id && Number(respostas[p.id]) < 3)
      .sort((a, b) => Number(respostas[a.id]) - Number(respostas[b.id]));
    const acoes = lacunas.length ? lacunas.map((p) => p.acao) : RECOMENDACOES[d.id];
    return { dimensao: d.nome, acoes };
  });

  // Plano de 90 dias ancorado na pergunta mais fraca de todas.
  const pior = [...PERGUNTAS].sort((a, b) => Number(respostas[a.id]) - Number(respostas[b.id]))[0];
  const plano = [
    { periodo: 'Dias 1 a 30', foco: `Começar por ${fracas[0].nome}: ${pior.acao.charAt(0).toLowerCase()}${pior.acao.slice(1)}` },
    { periodo: 'Dias 31 a 60', foco: 'Um projeto-piloto de IA ou automação, com dono e indicador de resultado definidos antes de começar.' },
    { periodo: 'Dias 61 a 90', foco: 'Revisão com a liderança: o que o piloto entregou, ajustes de governança e decisão sobre escala.' },
  ];

  return { score, nivel: nivel.nome, resumo: nivel.resumo, dimensoes, prioridades, plano };
}

module.exports = { DIMENSOES, PERGUNTAS, calcular };

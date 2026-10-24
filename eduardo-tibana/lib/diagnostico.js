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
    id: 'q1', dim: 'estrategia',
    texto: 'A inteligência artificial está na pauta da diretoria ou do conselho?',
    opcoes: ['Não é discutida', 'Aparece de forma pontual', 'Tem um responsável e orçamento', 'Faz parte da estratégia, com metas'],
  },
  {
    id: 'q2', dim: 'estrategia',
    texto: 'A empresa tem regras claras para o uso de IA (dados, riscos, ética)?',
    opcoes: ['Não existem regras', 'Há orientações informais', 'Existe política escrita', 'Política aplicada e revisada periodicamente'],
  },
  {
    id: 'q3', dim: 'estrategia',
    texto: 'Como são escolhidas as iniciativas de IA e automação?',
    opcoes: ['Não há iniciativas', 'Por iniciativa individual ou fornecedor', 'Com caso de negócio', 'Portfólio priorizado por valor e risco'],
  },
  {
    id: 'q4', dim: 'processos',
    texto: 'Como os projetos são acompanhados hoje?',
    opcoes: ['Planilhas e e-mail', 'Ferramenta com atualização manual', 'Ferramenta integrada com indicadores', 'Indicadores em tempo real e alertas automáticos'],
  },
  {
    id: 'q5', dim: 'processos',
    texto: 'Quanto das tarefas repetitivas (relatórios, cobranças, follow-ups) já é automatizado?',
    opcoes: ['Quase nada', 'Algumas tarefas isoladas', 'Boa parte dos processos-chave', 'A maioria, com monitoramento'],
  },
  {
    id: 'q6', dim: 'processos',
    texto: 'A IA já apoia planejamento, riscos ou cronogramas dos projetos?',
    opcoes: ['Não', 'Uso individual e esporádico', 'Em alguns projetos, com método', 'É prática padrão do PMO'],
  },
  {
    id: 'q7', dim: 'dados',
    texto: 'Onde estão os dados da operação?',
    opcoes: ['Espalhados em planilhas', 'Em sistemas que não conversam', 'Parcialmente integrados', 'Centralizados e confiáveis'],
  },
  {
    id: 'q8', dim: 'dados',
    texto: 'Quais ferramentas de IA a equipe usa?',
    opcoes: ['Nenhuma', 'Contas pessoais, sem controle', 'Ferramentas corporativas liberadas', 'Agentes integrados aos sistemas da empresa'],
  },
  {
    id: 'q9', dim: 'dados',
    texto: 'Como a empresa trata segurança e LGPD no uso de IA?',
    opcoes: ['Não trata', 'Depende de cada pessoa', 'Há controles básicos de acesso', 'Controles, auditoria e treinamento'],
  },
  {
    id: 'q10', dim: 'pessoas',
    texto: 'As equipes foram capacitadas para usar IA no trabalho?',
    opcoes: ['Não', 'Cada um aprende sozinho', 'Treinamentos pontuais', 'Programa contínuo de capacitação'],
  },
  {
    id: 'q11', dim: 'pessoas',
    texto: 'A liderança patrocina e dá exemplo na adoção de novas tecnologias?',
    opcoes: ['Resiste à mudança', 'Apoia no discurso', 'Patrocina projetos específicos', 'Lidera pelo exemplo'],
  },
  {
    id: 'q12', dim: 'pessoas',
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

  // Prioridades: as duas dimensões mais fracas.
  const fracas = [...dimensoes].sort((a, b) => a.score - b.score).slice(0, 2);
  const prioridades = fracas.map((d) => ({ dimensao: d.nome, acoes: RECOMENDACOES[d.id] }));

  const plano = [
    { periodo: 'Primeiros 30 dias', foco: `Diagnóstico aprofundado em ${fracas[0].nome} e definição de um responsável.` },
    { periodo: '31 a 60 dias', foco: 'Um projeto-piloto de IA ou automação com indicador de resultado definido.' },
    { periodo: '61 a 90 dias', foco: 'Revisão com a liderança, ajustes de governança e decisão sobre escala.' },
  ];

  return { score, nivel: nivel.nome, resumo: nivel.resumo, dimensoes, prioridades, plano };
}

module.exports = { DIMENSOES, PERGUNTAS, calcular };

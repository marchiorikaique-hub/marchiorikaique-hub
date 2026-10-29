# DESIGN.md · Eduardo Tibana

Mundo visual: **Cronograma de Projeto**. O site é lido como o plano de um projeto de IA bem governado (Gantt de PMO, linha de base, caminho crítico). Escolhido em 28/10/2026 (seed 929499ae). Substitui o visual creme + cobre + Fraunces de 24/10.

## Lei de cor

| Token | Valor | Uso |
|---|---|---|
| `--papel` | `#eef1ef` | fundo (prancheta fria, nunca creme) |
| `--folha` | `#f9faf9` | seções e cartões |
| `--tinta` | `#0b1a2b` | texto forte, barras, faixa noturna do diagnóstico |
| `--texto` / `--suave` | `#2a3a4b` / `#566577` | corpo / secundário |
| `--grade` / `--grade-forte` | `#d2d9d6` / `#aab6b2` | linhas de semana e divisórias |
| `--base` | `#c3cdc9` | barra de linha de base (fase futura) |
| `--critico` | `#ff4f14` | **só** caminho crítico, item em andamento, escolha feita e ação principal |
| `--critico-texto` | `#b8340a` | laranja quando é texto sobre fundo claro (AA) |

Botão laranja leva texto `--tinta`, nunca branco (contraste).

## Tipografia

- **Archivo** variável (wght 100 a 900, wdth 62 a 125), self-hosted em `/fonts`. Títulos em caixa alta, `font-stretch` 68 a 75%, peso 750 a 800. Corpo em 100%.
- Piso de tamanho: mono nunca abaixo de .72rem no desktop e .64rem no celular; corpo em 17px a partir de 900px.
- **Martian Mono** só para dado e medida: escala de semanas, notas, status, KPIs. Nunca como enfeite.

## Componentes

- **Gantt** (`.gantt`, `.g-escala`, `.g-linha`, `.g-trilho`, `.g-barra`, `.g-marco`): grade de 13 semanas (90 dias). Barras posicionadas por `--de` e `--ate`. Marco em losango laranja. Linha "hoje" laranja (some no celular).
- **Leitura por área**: trilho com marcas em 25/50/75 (limites de nível); as duas áreas mais fracas em laranja.
- **Nota**: numeral monumental em Martian Mono condensada.
- **Opções do diagnóstico**: linhas com tecla 1 a 4 e escada de 4 quadrados; a escolhida inunda de laranja.
- **Status**: linhas em mono que se escrevem sozinhas ("Pergunta 6 de 12 · 5 respondidas") no lugar de chrome.
- Cantos 0 a 2px, réguas de 1.5px em tinta no topo de cada bloco. Sem sombras, sem cards empilhados, sem kicker acima de título.

## Hero de apresentação

Nome enorme à esquerda, com frase, quatro credenciais em grade 2x2 e as ações. À direita, o retrato real: recorte sem fundo (`public/img/eduardo-tibana.webp`, tirado do post do CELINT, fundo removido com rembg) assentado na base de um quadro cinza com a grade de semanas e a linha laranja. As laterais do terno somem em gradiente. Se o Eduardo enviar foto pelo painel, ela substitui o recorte e preenche o quadro.

## Movimento

Um só gesto: barras se estendem da esquerda (ease-out exponencial, escalonado). Respeita `prefers-reduced-motion`.

## Painel

Mesmo mundo, modo operar: topo em tinta, aba ativa sublinhada em laranja, KPIs em mono, tabela com régua no topo.

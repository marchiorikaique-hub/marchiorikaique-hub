# Robô Trader — painel de simulação e validação

Painel web para testar as regras dos robôs de mini-índice (WIN) em dados históricos e registrar o que o Vitor confirma. **Não envia ordens.** A execução real continua no Profit (NTSL), depois que as regras estiverem validadas.

## O que tem

| Aba | Função |
|---|---|
| Projeto | Estado dos quatro robôs e o caminho até operar |
| Simulador | Roda o **Grid 15M** e o **Scalper V1** com parâmetros editáveis; resultado, queda máxima, dia a dia e gráfico das entradas |
| Sinais | Registra cada indicação de compra/venda do Scalper V1 no Ibovespa de 1 min (Yahoo, com atraso), confere sozinho se bateu alvo ou stop, guarda a opinião do Vitor e mostra o placar. Inclui busca de parâmetros com conferência em dias não vistos |
| Validação | 12 premissas do Grid para o Vitor marcar "É assim" ou "Precisa ajustar" (fica salvo) |
| Mercado | Dólar PTAX, Selic e IPCA (Banco Central), Ibovespa (Yahoo), cripto (CoinGecko), notícias (RSS InfoMoney), chuva em polos agrícolas (Open-Meteo) |

## Dados do simulador

- **Série sintética**: gerada por computador, só para conferir a mecânica. Não diz nada sobre lucro.
- **Ibovespa à vista (Yahoo)**: 60 dias em 15 min. Fonte não oficial, pode falhar; é o índice, não o contrato WIN.
- **Arquivo do Profit**: exporte os candles do WIN (de preferência 1 minuto) em CSV e envie na aba Simulador. É a fonte que vale.

## Regras do Grid no simulador

Direção pelo candle de 15 min fechado, entrada principal na abertura do seguinte, adicionais a 200 e 600 pontos contra, alvo de 800 pontos por adicional, alvo de 1.000 e stop global de 1.000 na principal, zeragem às 16h50, perda máxima de R$ 500 no dia. Cada entrada guarda preço e quantidade próprios, sem depender do preço médio consolidado do Profit. Vários desses números são premissas: estão na aba Validação.

Limite do modelo: dentro de cada candle o simulador supõe a ordem abertura → extremo contrário → extremo a favor → fechamento. Com candles de 1 minuto o erro é pequeno; com 15 minutos é maior. Sem derrapagem (slippage); custo por contrato é parâmetro.

## Rodar

```bash
npm install
npm start          # http://localhost:3000
npm test
```

## Publicar no EasyPanel

1. Criar um serviço **App** apontando para este repositório, com caminho de build `robo-trader` (usa o `Dockerfile`).
2. Porta do contêiner: `3000`.
3. Montar um volume em `/app/data` (guarda as respostas da validação e o CSV enviado).
4. Variável `ACCESS_CODE`: código que o painel pede para entrar. Sem ela o painel fica aberto para quem tiver o link.

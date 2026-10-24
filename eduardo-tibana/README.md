# Site + Diagnóstico · Eduardo Tibana

Site pessoal com **diagnóstico de maturidade em IA e governança** e **painel privado** para o Eduardo acompanhar quem respondeu.

| Rota | O que é |
|---|---|
| `/` | Site: foto, história, atuação, contato |
| `/diagnostico` | 12 perguntas → nota 0–100, leitura por área, prioridades e plano de 90 dias |
| `/resultado/:id` | Relatório do respondente (link compartilhável) |
| `/painel` | Área do Eduardo: diagnósticos recebidos, status/anotações, exportar planilha, editar site e foto, trocar senha |

Stack: Node 22 + Express + SQLite nativo (`node:sqlite`). Sem banco externo. Dados em `/app/data` (banco + fotos).

## Deploy no Easypanel (VPS)

1. **Create Service → App**, nome `site` dentro de um projeto `tibana`.
2. **Source → GitHub**: repositório `marchiorikaique-hub/marchiorikaique-hub`, branch `main`, **Build Path** `/eduardo-tibana`.
3. **Build → Dockerfile** (`Dockerfile`).
4. **Environment**:
   ```
   SETUP_CODE=<código de primeiro acesso enviado ao Eduardo>
   ```
5. **Mounts → Volume**: nome `data`, mount path `/app/data` (sem isso os dados somem a cada deploy).
6. **Domains**: porta `3000`. Domínio padrão: `tibana-site.<seu-hash>.easypanel.host` ou domínio próprio (ex.: `eduardotibana.com.br`).
7. **Deploy**.

Alternativa sem Easypanel: `SETUP_CODE=... docker compose up -d --build` dentro desta pasta.

## Acesso do Eduardo

- Primeiro acesso em `/painel`: informa o `SETUP_CODE` e cria a própria senha. Depois disso o código não vale mais.
- Esqueceu a senha: no terminal do container rode `node server.js reset-senha` e o primeiro acesso volta a valer com o `SETUP_CODE`.

## Rodar local

```
npm install
SETUP_CODE=TESTE-1234 npm start   # http://localhost:3000
```

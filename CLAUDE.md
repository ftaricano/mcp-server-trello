# CLAUDE.md -- mcp-server-trello

MCP server e CLI local para Trello, mantido como `@ftaricano/mcp-server-trello`. Expoe 23 ferramentas tipadas via Model Context Protocol e um binario `trello` para workflows de agente no terminal.

## O que e

Servidor MCP + CLI que conecta agentes ao Trello: boards, listas, cards, checklists, workspace e atividade recente. Publicado no npm (`@ftaricano/mcp-server-trello`). Consumido pelo ecossistema Jarvis via skill `trello` e por qualquer cliente MCP-compativel. Fork do projeto original de Jarad DeLorenzo (MIT); proveniencia documentada em `NOTICE.md`.

## Stack & estrutura

TypeScript 5 + Node.js >=20 + MCP SDK 1.29 + Zod + axios + Commander | testes: Vitest | lint: ESLint + Prettier

```
src/
  index.ts          # entry point do servidor MCP (stdio)
  cli.ts            # entry point do binario trello
  cli/              # subcomandos do CLI
  mcp-tools.ts      # 23 ferramentas MCP registradas
  trello-client.ts  # wrapper da API Trello com rate limiter
  rate-limiter.ts   # token bucket (300/10s por key, 100/10s por token)
  validators.ts     # validacao Zod dos inputs
  types.ts          # tipos compartilhados
build/              # compilado TypeScript (gerado; nao editar)
tests/
  mcp-tools.test.ts
  trello-client.test.ts
  rate-limiter.test.ts
  validators.test.ts
  parity.test.ts
  fixtures/
.env.example        # variaveis de ambiente documentadas
.env.template       # template alternativo
```

## Como rodar / validar

```bash
# Setup (instalar sem disparar build via prepare)
SKIP_PREPARE=true npm install

# Build
npm run build

# Validar (lint + typecheck + testes) -- rodar ANTES de DONE
npm run lint
npm run typecheck
npm test

# Servidor MCP local (apos build)
node build/index.js

# CLI local
node build/cli.js list-boards --md
```

## Invariantes / regras criticas

- Credenciais (`TRELLO_API_KEY`, `TRELLO_TOKEN`) so via env, `.env`, ou macOS Keychain -- nunca hardcoded, nunca comitadas. Ver `.env.example` para os nomes corretos.
- `SKIP_PREPARE=true` e obrigatorio no `npm install` de dev para evitar build automatico do `prepare` hook.
- `build/` e gerado por `tsc` + `terser` -- nao editar arquivos em `build/` diretamente; a fonte e sempre `src/`.
- Rate limiter (`rate-limiter.ts`) nao pode ser bypassado: a API Trello limita 300 req/10s por key e 100 req/10s por token; ultrapassar resulta em banimento temporario.
- O binario `trello` (CLI) e o servidor MCP (`mcp-server-trello`) compartilham `trello-client.ts` -- mudancas ali afetam ambas as superficies.
- Toda nova ferramenta MCP deve ser registrada em `mcp-tools.ts` com schema Zod completo e aparecer nos testes de paridade (`parity.test.ts`).
- `ruvector.db` (SQLite de embeddings) e gerado em runtime -- nao commitar.

## Gotchas

- `npm run build` usa `terser` para minificar `build/index.js` (drop_console); `npm run build:dev` nao minifica -- usar `build:dev` ao debugar saida do servidor.
- `.env.template` e `.env.example` coexistem com conteudo levemente diferente -- a documentacao canonica das variaveis e `.env.example`.
- O CLI resolve credenciais na ordem: env > `.env` > Keychain. Em agentes, preferir Keychain com `TRELLO_KEYCHAIN_PREFIX=TRELLO` para nao depender de arquivo `.env` no cwd.
- `logs/` e gerado localmente e esta no `.gitignore` -- nao e fonte de verdade.

## Documentacao canonica

- Skill: `trello` (hub skills) | Proveniencia: `NOTICE.md` | Seguranca: `SECURITY.md`

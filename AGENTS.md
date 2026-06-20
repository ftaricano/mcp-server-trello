# AGENTS.md -- mcp-server-trello

As regras operacionais deste repo sao canonicas em [CLAUDE.md](CLAUDE.md) (fonte unica para Claude/Codex/Hermes). Leia-o antes de tocar em codigo.

TL;DR das invariantes:
- Credenciais nunca hardcoded nem comitadas -- usar env, `.env`, ou macOS Keychain com `TRELLO_KEYCHAIN_PREFIX`
- `SKIP_PREPARE=true npm install` obrigatorio em dev -- sem isso o `prepare` hook dispara build prematuro
- `build/` e gerado; editar somente `src/` -- fonte de verdade e sempre TypeScript
- Rate limiter nao bypassar -- 300/10s por key, 100/10s por token; violar gera banimento temporario
- Nova ferramenta MCP: registrar em `mcp-tools.ts` com schema Zod e cobrir em `parity.test.ts`

Validar: `npm run lint && npm run typecheck && npm test`

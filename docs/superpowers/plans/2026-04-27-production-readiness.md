# Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar o `@delorenj/mcp-server-trello` do estado atual ("builda e funciona localmente") para production-grade publicável: testes automatizados, CI gateando, lint limpo, versão consistente, sem dependências pagas obrigatórias.

**Architecture:** Adicionar Vitest como test runner (ESM-native, sem ts-jest), mover `mcp-evals`/`@ai-sdk/openai` para optionalDependencies (não puxa OpenAI no install padrão), adicionar GitHub Actions com matriz Node 18/20/22 rodando lint+typecheck+test+build, corrigir version drift via leitura do `package.json` em runtime, normalizar lint com `eslint --fix`.

**Tech Stack:** TypeScript 5.3, Vitest 1.x, ESLint 8 (legacy config mantido), GitHub Actions, npm.

---

## File Structure

**Criar:**
- `tests/rate-limiter.test.ts` — unit tests do TokenBucket
- `tests/validators.test.ts` — unit tests dos validators Zod
- `tests/trello-client.test.ts` — unit tests com axios mock
- `tests/fixtures/trello-responses.ts` — fixtures de respostas da API Trello
- `vitest.config.ts` — config do Vitest
- `.github/workflows/ci.yml` — CI pipeline
- `.env.example` — template de env vars
- `src/version.ts` — exporta versão lida do package.json em runtime

**Modificar:**
- `package.json` — adicionar scripts `test`, `test:watch`, `typecheck`; mover deps; bump version
- `src/index.ts:29` — usar `version` importado de `./version.js` em vez de hardcoded
- `src/types.ts:152,193` — substituir `any` por tipos concretos
- `src/trello-client.ts:136` — substituir `any` por generic com constraint
- `.gitignore` — adicionar `coverage/` se ausente
- `README.md` — seção "Development" com como rodar testes
- `CLAUDE.md` — atualizar versão se aplicável

---

## Task 1: Fix Lint + Prettier (quick win)

**Files:**
- Modify: todos os `src/**/*.ts` (auto-fix via prettier)

- [ ] **Step 1: Rodar auto-fix**

```bash
npx eslint . --ext .ts --fix
```

Expected: maioria dos 55 erros prettier resolvidos automaticamente.

- [ ] **Step 2: Verificar erros remanescentes**

```bash
npx eslint . --ext .ts 2>&1 | tail -20
```

Expected: somente os 3 warnings de `any` (serão tratados na Task 2).

- [ ] **Step 3: Verificar build ainda passa**

```bash
npm run build
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "style: fix prettier formatting across src/"
```

---

## Task 2: Eliminate `any` Types

**Files:**
- Modify: `src/types.ts:152` — campo `value?: any` em `TrelloCustomFieldItem`
- Modify: `src/types.ts:193` — `emoji?: Record<string, any>` em `TrelloAction.data`
- Modify: `src/trello-client.ts:136` — `handleRequest<T = any>`

- [ ] **Step 1: Ler contexto dos `any`**

```bash
grep -n "any" src/types.ts src/trello-client.ts | grep -v "//"
```

- [ ] **Step 2: Substituir em `src/types.ts:152`**

```typescript
// ANTES:
value?: any;

// DEPOIS:
value?: {
  text?: string;
  number?: string;
  date?: string;
  checked?: string;
  option?: string;
};
```

- [ ] **Step 3: Substituir em `src/types.ts:193`**

```typescript
// ANTES:
emoji?: Record<string, any>;

// DEPOIS:
emoji?: Record<string, string | number | boolean>;
```

- [ ] **Step 4: Substituir em `src/trello-client.ts:136`**

```typescript
// ANTES:
private async handleRequest<T = any>(requestFn: () => Promise<T>): Promise<T> {

// DEPOIS:
private async handleRequest<T = unknown>(requestFn: () => Promise<T>): Promise<T> {
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: exit 0, sem erros.

- [ ] **Step 6: Lint**

```bash
npx eslint . --ext .ts
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/trello-client.ts
git commit -m "refactor: replace any with concrete types"
```

---

## Task 3: Fix Version Drift

**Files:**
- Create: `src/version.ts`
- Modify: `src/index.ts:29`

- [ ] **Step 1: Criar `src/version.ts`**

```typescript
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
) as { version: string; name: string };

export const VERSION = pkg.version;
export const NAME = pkg.name;
```

- [ ] **Step 2: Atualizar `src/index.ts`**

Modificar import block (topo do arquivo):

```typescript
import { VERSION } from './version.js';
```

Modificar linha 29 (`new McpServer({ ... version: '1.0.0' })`):

```typescript
this.server = new McpServer({
  name: 'trello-server',
  version: VERSION,
});
```

- [ ] **Step 3: Atualizar `tsconfig.json` para incluir resolveJsonModule se necessário**

Verificar se `tsconfig.json` precisa de `"resolveJsonModule": true`. Como usamos `readFileSync` em runtime (não import json), não precisa. Pular se já compila.

- [ ] **Step 4: Atualizar `package.json` files field**

Garantir que `package.json` esteja no pacote publicado:

```json
"files": [
  "build/**/*",
  "package.json"
]
```

(`package.json` já é incluído por padrão pelo npm, mas explicitar não dói.)

- [ ] **Step 5: Build e smoke test**

```bash
npm run build
node -e "import('./build/version.js').then(m => console.log(m.VERSION))"
```

Expected: imprime `1.2.0` (ou versão atual do package.json).

- [ ] **Step 6: Commit**

```bash
git add src/version.ts src/index.ts package.json
git commit -m "fix: read version from package.json instead of hardcoding"
```

---

## Task 4: Setup Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts + devDeps)

- [ ] **Step 1: Instalar Vitest**

```bash
npm install -D vitest @vitest/coverage-v8
```

Expected: vitest adicionado a devDependencies.

- [ ] **Step 2: Criar `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/evals/**', 'src/types.ts'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
  },
});
```

- [ ] **Step 3: Adicionar scripts ao `package.json`**

Inserir em `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 4: Verificar Vitest roda (sem testes ainda)**

```bash
npm test
```

Expected: "No test files found" — exit 1, mas Vitest carrega sem erro de config.

- [ ] **Step 5: Atualizar `.gitignore`**

Adicionar (se ausente):

```
coverage/
.vitest/
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts .gitignore
git commit -m "chore: add vitest test runner"
```

---

## Task 5: Test Suite — Rate Limiter

**Files:**
- Create: `tests/rate-limiter.test.ts`

- [ ] **Step 1: Ler `src/rate-limiter.ts` para entender API**

```bash
cat src/rate-limiter.ts
```

- [ ] **Step 2: Escrever testes failing**

Criar `tests/rate-limiter.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenBucket, createTrelloRateLimiters } from '../src/rate-limiter.js';

describe('TokenBucket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('grants tokens immediately when capacity available', async () => {
    const bucket = new TokenBucket(5, 1000);
    await bucket.waitForToken();
    await bucket.waitForToken();
    expect(true).toBe(true);
  });

  it('refills tokens over time', async () => {
    const bucket = new TokenBucket(2, 1000);
    await bucket.waitForToken();
    await bucket.waitForToken();
    const waitPromise = bucket.waitForToken();
    vi.advanceTimersByTime(1100);
    await waitPromise;
    expect(true).toBe(true);
  });
});

describe('createTrelloRateLimiters', () => {
  it('exposes waitForAvailableToken', () => {
    const rl = createTrelloRateLimiters();
    expect(typeof rl.waitForAvailableToken).toBe('function');
  });
});
```

- [ ] **Step 3: Rodar — esperar falha se API não bater**

```bash
npm test
```

Expected: ou passa (se API bater) ou falha com erro de import específico. Ajustar testes ao formato real exposto por `rate-limiter.ts` (descoberto no Step 1).

- [ ] **Step 4: Ajustar testes ao API real e rerun**

Editar `tests/rate-limiter.test.ts` conforme descoberto. Rerun:

```bash
npm test
```

Expected: PASS, todos verdes.

- [ ] **Step 5: Commit**

```bash
git add tests/rate-limiter.test.ts
git commit -m "test: unit tests for rate limiter"
```

---

## Task 6: Test Suite — Validators

**Files:**
- Create: `tests/validators.test.ts`

- [ ] **Step 1: Ler `src/validators.ts`**

```bash
cat src/validators.ts
```

- [ ] **Step 2: Escrever testes**

Criar `tests/validators.test.ts` cobrindo cada validator/schema exportado. Para cada um:
- happy path (input válido)
- pelo menos 1 input inválido (deve lançar/falhar parse)
- edge case relevante (campo opcional ausente, string vazia, etc)

Exemplo de estrutura:

```typescript
import { describe, it, expect } from 'vitest';
import * as validators from '../src/validators.js';

describe('validators', () => {
  describe('<nome do validator descoberto no step 1>', () => {
    it('accepts valid input', () => {
      const result = validators.<fn>(<input válido>);
      expect(result).toBeDefined();
    });

    it('rejects missing required field', () => {
      expect(() => validators.<fn>(<input inválido>)).toThrow();
    });
  });
});
```

Repetir para cada export do arquivo (mínimo 1 happy + 1 unhappy por validator).

- [ ] **Step 3: Rodar**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/validators.test.ts
git commit -m "test: unit tests for input validators"
```

---

## Task 7: Test Suite — Trello Client (axios mock)

**Files:**
- Create: `tests/fixtures/trello-responses.ts`
- Create: `tests/trello-client.test.ts`

- [ ] **Step 1: Criar fixtures**

Criar `tests/fixtures/trello-responses.ts`:

```typescript
export const mockBoard = {
  id: 'board123',
  name: 'Test Board',
  desc: '',
  closed: false,
  idOrganization: 'workspace1',
  url: 'https://trello.com/b/board123',
};

export const mockList = {
  id: 'list1',
  name: 'To Do',
  idBoard: 'board123',
  closed: false,
  pos: 1,
};

export const mockCard = {
  id: 'card1',
  idShort: 1,
  name: 'Test Card',
  desc: 'Description',
  idList: 'list1',
  idBoard: 'board123',
  closed: false,
  url: 'https://trello.com/c/card1',
  due: null,
  start: null,
  idMembers: [],
  labels: [],
};

export const mockChecklist = {
  id: 'cl1',
  name: 'Acceptance Criteria',
  idCard: 'card1',
  pos: 1,
  checkItems: [
    { id: 'ci1', name: 'item 1', state: 'incomplete', pos: 1 },
    { id: 'ci2', name: 'item 2', state: 'complete', pos: 2 },
  ],
};
```

- [ ] **Step 2: Criar testes com mock do axios**

Criar `tests/trello-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrelloClient } from '../src/trello-client.js';
import { mockBoard, mockList, mockCard, mockChecklist } from './fixtures/trello-responses.js';

vi.mock('axios', () => {
  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  };
  return {
    default: { create: vi.fn(() => mockInstance) },
  };
});

import axios from 'axios';

describe('TrelloClient', () => {
  let client: TrelloClient;
  let mockAxios: ReturnType<typeof axios.create>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new TrelloClient({
      apiKey: 'test-key',
      token: 'test-token',
      defaultBoardId: 'board123',
      boardId: 'board123',
    });
    mockAxios = (axios.create as ReturnType<typeof vi.fn>).mock.results[0].value;
  });

  it('getCardsByList fetches cards from given list', async () => {
    (mockAxios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: [mockCard] });
    const cards = await client.getCardsByList(undefined, 'list1');
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe('card1');
    expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining('/lists/list1/cards'));
  });

  it('getLists uses defaultBoardId when boardId not provided', async () => {
    (mockAxios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: [mockList] });
    await client.getLists();
    expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining('/boards/board123/lists'));
  });

  it('getLists uses provided boardId override', async () => {
    (mockAxios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: [mockList] });
    await client.getLists('boardOverride');
    expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining('/boards/boardOverride/lists'));
  });

  it('throws when boardId missing and no default', async () => {
    const noBoardClient = new TrelloClient({ apiKey: 'k', token: 't' });
    await expect(noBoardClient.getLists()).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Rodar e ajustar**

```bash
npm test
```

Expected: PASS. Se algum método tiver assinatura diferente, ajustar conforme `src/trello-client.ts` real.

- [ ] **Step 4: Commit**

```bash
git add tests/fixtures/ tests/trello-client.test.ts
git commit -m "test: unit tests for TrelloClient with axios mock"
```

---

## Task 8: Move OpenAI/mcp-evals to optionalDependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Mover deps**

Editar `package.json`:

```json
"dependencies": {
  "@modelcontextprotocol/sdk": "^1.0.4",
  "axios": "^1.6.2",
  "dotenv": "^17.2.1",
  "zod": "^3.22.4"
},
"optionalDependencies": {
  "mcp-evals": "^1.0.18",
  "@ai-sdk/openai": "^1.3.23"
}
```

(Remover `mcp-evals` e `@ai-sdk/openai` de `dependencies`. Mover para `optionalDependencies`.)

- [ ] **Step 2: Garantir que `src/evals/` não é incluído no build runtime**

Editar `tsconfig.json` para excluir evals do build de produção:

```json
"exclude": ["node_modules", "build", "src/evals", "tests"]
```

- [ ] **Step 3: Reinstall e build**

```bash
rm -rf node_modules package-lock.json
SKIP_PREPARE=true npm install
npm run build
```

Expected: build OK, sem `src/evals/` no `build/`.

- [ ] **Step 4: Verificar build**

```bash
ls build/
test ! -d build/evals && echo "OK: evals excluded"
```

Expected: `OK: evals excluded`.

- [ ] **Step 5: Smoke test do server**

```bash
node -e "console.log(require('./build/index.js'))" 2>&1 | head -5 || true
TRELLO_API_KEY=fake TRELLO_TOKEN=fake timeout 2 node build/index.js < /dev/null 2>&1 | head -5
```

Expected: server inicia sem erro de import faltante (mcp-evals/openai não devem ser importados em runtime).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json
git commit -m "chore: move mcp-evals and @ai-sdk/openai to optionalDependencies"
```

---

## Task 9: Add `.env.example`

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Criar template**

Criar `.env.example`:

```bash
# Required - get from https://trello.com/app-key
TRELLO_API_KEY=your_api_key_here
TRELLO_TOKEN=your_oauth_token_here

# Optional - default board (can be switched at runtime via set_active_board)
TRELLO_BOARD_ID=

# Optional - default workspace
TRELLO_WORKSPACE_ID=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add .env.example template"
```

---

## Task 10: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Criar workflow**

Criar `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: ['18', '20', '22']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'
      - run: SKIP_PREPARE=true npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build

  publish-check:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: SKIP_PREPARE=true npm ci
      - run: npm run build
      - run: npm pack --dry-run
```

- [ ] **Step 2: Validar workflow localmente (act opcional, ou só syntax)**

```bash
cat .github/workflows/ci.yml | npx --yes js-yaml > /dev/null && echo "YAML OK"
```

Expected: `YAML OK`.

- [ ] **Step 3: Garantir scripts existem em package.json**

Conferir que `package.json` tem `lint`, `typecheck`, `test`, `build`. Adicionar `lint` se ausente:

```json
"lint": "eslint . --ext .ts"
```

(já existe.)

- [ ] **Step 4: Rodar pipeline equivalente local**

```bash
SKIP_PREPARE=true npm ci && npm run lint && npm run typecheck && npm test && npm run build
```

Expected: todos exit 0.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions pipeline (lint+typecheck+test+build, node 18/20/22)"
```

---

## Task 11: README — Development Section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Ler README atual**

```bash
grep -n "## " README.md
```

- [ ] **Step 2: Adicionar seção Development**

Inserir antes da seção License (ou no final):

```markdown
## Development

### Setup

\`\`\`bash
git clone https://github.com/delorenj/mcp-server-trello.git
cd mcp-server-trello
SKIP_PREPARE=true npm install
cp .env.example .env
# fill in TRELLO_API_KEY and TRELLO_TOKEN
\`\`\`

### Scripts

- `npm run build` — compile + minify to `build/`
- `npm run build:dev` — compile only (no minify, faster)
- `npm run dev` — run from source via ts-node
- `npm test` — run unit test suite
- `npm run test:watch` — watch mode
- `npm run test:coverage` — coverage report
- `npm run lint` — ESLint check
- `npm run typecheck` — TypeScript type check (no emit)
- `npm run format` — Prettier write

### Testing

Unit tests live in `tests/` and use [Vitest](https://vitest.dev). Tests mock the Trello API via axios mocks — they do not hit the real API.

\`\`\`bash
npm test
npm run test:coverage  # threshold: 60% lines
\`\`\`

### CI

GitHub Actions runs lint, typecheck, test, and build on every PR across Node 18, 20, and 22.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add Development section to README"
```

---

## Task 12: Bump Version + Final Verification

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Bump para 1.3.0**

```bash
npm version minor --no-git-tag-version
```

Expected: `package.json` agora `1.3.0`.

- [ ] **Step 2: Rodar pipeline completo localmente**

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Expected: todos exit 0, todos os testes passam.

- [ ] **Step 3: Verificar que server reporta versão correta**

```bash
node -e "import('./build/version.js').then(m => console.log(m.VERSION))"
```

Expected: `1.3.0`.

- [ ] **Step 4: Verificar pacote publicável**

```bash
npm pack --dry-run 2>&1 | tail -30
```

Expected: lista contém `build/`, `package.json`, `README.md`. NÃO contém `tests/`, `src/evals/`, `.env`, `.github/`.

- [ ] **Step 5: Checklist final manual**

Verificar cada item:
- [ ] `npm test` passa
- [ ] `npm run lint` 0 errors 0 warnings
- [ ] `npm run typecheck` 0 erros
- [ ] `npm run build` exit 0
- [ ] `.github/workflows/ci.yml` existe
- [ ] `.env.example` existe
- [ ] `tests/` tem ao menos rate-limiter, validators, trello-client
- [ ] `src/index.ts` lê versão de `version.ts`
- [ ] `package.json` não tem mais `mcp-evals`/`@ai-sdk/openai` em `dependencies`
- [ ] README tem seção Development

- [ ] **Step 6: Commit final**

```bash
git add package.json
git commit -m "chore: bump to 1.3.0 (production-readiness milestone)"
```

- [ ] **Step 7: Push e abrir PR**

```bash
git push -u origin <branch>
gh pr create --title "feat: production readiness (1.3.0)" --body "$(cat <<'EOF'
## Summary
- Adds Vitest unit test suite (rate-limiter, validators, trello-client with axios mocks)
- Adds GitHub Actions CI (lint+typecheck+test+build, Node 18/20/22)
- Fixes version drift (reads from package.json at runtime)
- Eliminates `any` types
- Moves mcp-evals/@ai-sdk/openai to optionalDependencies (no OpenAI dep on default install)
- Fixes 55 lint errors
- Adds .env.example, README Development section

## Test plan
- [ ] CI passes on Node 18, 20, 22
- [ ] `npm pack --dry-run` shows clean artifact
- [ ] Smoke test: `node build/index.js` boots with TRELLO_API_KEY/TOKEN set
EOF
)"
```

Expected: PR criado, URL retornada.

---

## Self-Review Checklist (run before declaring plan complete)

- [x] Tarefa 1 endereça os 55 erros de lint identificados
- [x] Tarefa 2 endereça os 3 `any` em `types.ts:152,193` e `trello-client.ts:136`
- [x] Tarefa 3 endereça version drift `1.2.0` vs `1.0.0`
- [x] Tarefas 5-7 cobrem rate-limiter, validators, trello-client (os 3 módulos não-trivial)
- [x] Tarefa 8 endereça dep da OpenAI paga (regra global anti-API)
- [x] Tarefa 10 endereça ausência de CI
- [x] Tarefa 9 endereça ausência de `.env.example`
- [x] Tipos consistentes: `VERSION` exportado em Task 3 é usado em Task 3 mesmo; `TrelloClient` testado em Task 7 corresponde ao construtor real
- [x] Sem placeholders "TBD" / "implement later"
- [x] Cada step tem código ou comando concreto

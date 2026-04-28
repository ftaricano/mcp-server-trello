# MCP Server Trello

[![CI](https://github.com/ftaricano/mcp-server-trello/actions/workflows/ci.yml/badge.svg)](https://github.com/ftaricano/mcp-server-trello/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@delorenj/mcp-server-trello.svg)](https://www.npmjs.com/package/@delorenj/mcp-server-trello)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A [Model Context Protocol](https://modelcontextprotocol.io/) server for Trello. Exposes 23 tools for managing boards, lists, cards, checklists, and workspaces — with built-in rate limiting, input validation, and full TypeScript type safety.

## Highlights

- **23 tools** covering cards, lists, boards, workspaces, checklists, and activity
- **Multi-board support** — switch active board/workspace at runtime, with persistent state
- **Built-in rate limiting** — automatic backpressure against Trello's API limits (300 req/10s per key, 100 req/10s per token)
- **Type-safe** — all inputs validated with Zod schemas; outputs strongly typed
- **Production-ready** — 93 unit tests, CI on Node 20/22, zero runtime vulnerabilities

## Changelog

### 1.4.0 — Local CLI

- New `trello` CLI binary for local agent use, sharing the existing `TrelloClient` and `.env` contract with the MCP server
- 8 commands cover the create/update/move/read flow:
  - `list-boards`, `set-board <id>`, `active-board`
  - `lists [--board <id>]`
  - `card add <listId> <name> [--desc --due --start --labels --board]`
  - `card update <cardId> [--name --desc --due --start --done --labels --board]`
  - `card move <cardId> <listId> [--board]`
  - `card get <cardId>`
  - `cards mine`
- JSON output by default (agent-friendly); `--md` flag for human-readable markdown
- Exit codes: 0 success, 1 missing config / validation error, 2 Trello API error

### 1.3.0 — Production Readiness

- **Test suite (Vitest):** 93 unit tests across rate-limiter, validators, and `TrelloClient` (axios-mocked, no network)
- **CI:** GitHub Actions pipeline (lint + typecheck + test + build + `npm pack --dry-run`) on every PR, matrix Node 20/22, with `concurrency` and `permissions: contents: read`
- **Type hygiene:** eliminated remaining `any` types; narrow per-call `@ts-expect-error` for 5 pre-existing TS2589 errors, pinned to SDK 1.29.0 so they auto-flag when upstream fixes inference depth
- **Version drift fix:** server now reads its version from `package.json` at runtime via `src/version.ts` (was hardcoded `1.0.0`)
- **Dependency hygiene:** moved `mcp-evals` and `@ai-sdk/openai` to `optionalDependencies`; excluded `src/evals/` from production tsconfig
- **Build:** baked `NODE_OPTIONS=--max-old-space-size=8192` into `build`/`build:dev`/`typecheck` to avoid `tsc` OOM
- **DX:** added `.env.example`, `LICENSE` (MIT), and an expanded Development section
- **`engines.node`:** bumped to `>=20.0.0` to match the CI matrix
- **Supply chain:** `npm audit --omit=dev --omit=optional` returns 0 vulnerabilities

### 1.2.0 — Checklist Management Suite

- 5 new tools for checklist management:
  - `get_checklist_items(name)` — retrieve all items from a checklist by name
  - `add_checklist_item(text, checkListName)` — add a new item to an existing checklist
  - `find_checklist_items_by_description(description)` — search checklist items by text content
  - `get_acceptance_criteria()` — convenience method for "Acceptance Criteria" checklists
  - `get_checklist_by_name(name)` — get a complete checklist with completion percentage
- Refactored to the modern MCP SDK pattern (`registerTool()` + Zod input validation)
- New `CheckList` and `CheckListItem` interfaces
- Consistent error responses with descriptive messages

### 1.1.0 — Complete Card Data Extraction

- New `get_card` tool returning a single card with full context:
  - Checklists with items, completion states, member assignments, and due dates
  - Attachments with previews, file metadata, and inline image detection
  - Labels (names and colors, not just IDs), assigned members, comments, badges, cover images
  - Board and list context, plus custom fields
- New `includeMarkdown` parameter formats card data as human-readable markdown
- Automatic detection and extraction of images embedded in card descriptions

### 1.0.0

- Fixed MCP protocol compatibility by removing all console output that interfered with JSON-RPC communication
- Improved pnpx support - now works seamlessly with `pnpx @delorenj/mcp-server-trello`
- Updated installation docs to feature pnpx as the primary installation method
- Added mise installation instructions for convenient tool management
- Production-ready release with stable API

### 0.3.0

- Added multi-board support - all methods now accept optional `boardId` parameter (thanks @blackoutnet!)
- `TRELLO_BOARD_ID` environment variable is now optional and serves as default board
- Added board and workspace management capabilities:
  - `list_boards` - List all boards the user has access to
  - `set_active_board` - Set the active board for future operations
  - `list_workspaces` - List all workspaces the user has access to
  - `set_active_workspace` - Set the active workspace for future operations
  - `list_boards_in_workspace` - List all boards in a specific workspace
  - `get_active_board_info` - Get information about the currently active board
- Added persistent configuration storage to remember active board/workspace
- Improved error handling with MCP-specific error types
- Full backward compatibility maintained

### 0.2.1

- Added detailed JSDoc comments to rate limiter functions
- Improved error handling for image attachment functionality
- Updated documentation for attach_image_to_card tool

### 0.2.0

- Added `attach_image_to_card` tool to attach images to cards from URLs
- Added Docker support with multi-stage build
- Improved security by moving environment variables to `.env`
- Added Docker Compose configuration
- Added `.env.template` for easier setup

### 0.1.1

- Added `move_card` tool to move cards between lists
- Improved documentation

### 0.1.0

- Initial release with basic Trello board management features

## Installation

### Quick Start with pnpx (Recommended)

The easiest way to use the Trello MCP server is with `pnpx`, which doesn't require a global install:

```json
{
  "mcpServers": {
    "trello": {
      "command": "pnpx",
      "args": ["@delorenj/mcp-server-trello"],
      "env": {
        "TRELLO_API_KEY": "your-api-key",
        "TRELLO_TOKEN": "your-token"
      }
    }
  }
}
```

Or if you're using mise:

```json
{
  "mcpServers": {
    "trello": {
      "command": "mise",
      "args": ["x", "--", "pnpx", "@delorenj/mcp-server-trello"],
      "env": {
        "TRELLO_API_KEY": "your-api-key",
        "TRELLO_TOKEN": "your-token"
      }
    }
  }
}
```

To connect a Trello workspace, you'll need to manually retrieve a `TRELLO_TOKEN` once per workspace. After setting up your Trello Power-Up, visit the following URL:

```
https://trello.com/1/authorize?expiration=never&name=YOUR_APP_NAME&scope=read,write&response_type=token&key=YOUR_API_KEY
```

Replace:

* `YOUR_APP_NAME` with a name for your application (e.g., "My Trello Integration"). This name is shown to the user on the Trello authorization screen.
* `YOUR_API_KEY` with the API key for your Trello Power-Up

This will generate the token required for integration.

> [!NOTE]
> The `expiration=never` parameter creates a token that does not expire. For enhanced security, consider using `expiration=30days` and renewing the token periodically if your setup allows for it.


#### Don't have pnpm?

The simplest way to get `pnpm` (and thus `pnpx`) is through [mise](https://mise.jdx.dev/):

```bash
# Install mise (if you don't have it)
curl https://mise.run | sh

# Install pnpm with mise
mise install pnpm
```

### Installing via npm

If you prefer using npm directly:

```bash
npm install -g @delorenj/mcp-server-trello
```

Then use `mcp-server-trello` as the command in your MCP configuration.

### Installing via Smithery

To install Trello Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@modelcontextprotocol/mcp-server-trello):

```bash
npx -y @smithery/cli install @modelcontextprotocol/mcp-server-trello --client claude
```

### Docker Installation

For containerized environments:

1. Clone the repository:

```bash
git clone https://github.com/delorenj/mcp-server-trello
cd mcp-server-trello
```

2. Copy the environment template and fill in your Trello credentials:

```bash
cp .env.template .env
```

3. Build and run with Docker Compose:

```bash
docker compose up --build
```

## Configuration

### Environment Variables

The server can be configured using environment variables. Create a `.env` file in the root directory with the following variables:

```env
# Required: Your Trello API credentials
TRELLO_API_KEY=your-api-key
TRELLO_TOKEN=your-token

# Optional (Deprecated): Default board ID (can be changed later using set_active_board)
TRELLO_BOARD_ID=your-board-id

# Optional: Initial workspace ID (can be changed later using set_active_workspace)
TRELLO_WORKSPACE_ID=your-workspace-id
```

You can get these values from:

- API Key: <https://trello.com/app-key>
- Token: Generate using your API key
- Board ID (optional, deprecated): Found in the board URL (e.g., <https://trello.com/b/BOARD_ID/board-name>)
- Workspace ID: Found in workspace settings or using `list_workspaces` tool

### Board and Workspace Management

Starting with version 0.3.0, the MCP server supports multiple ways to work with boards:

1. **Multi-board support**: All methods now accept an optional `boardId` parameter
   - Omit `TRELLO_BOARD_ID` and provide `boardId` in each API call
   - Set `TRELLO_BOARD_ID` as default and optionally override with `boardId` parameter

2. **Dynamic board selection**: Use workspace management tools
   - The `TRELLO_BOARD_ID` in your `.env` file is used as the initial/default board ID
   - You can change the active board at any time using the `set_active_board` tool
   - The selected board persists between server restarts (stored in `~/.trello-mcp/config.json`)
   - Similarly, you can set and persist an active workspace using `set_active_workspace`

This allows you to work with multiple boards and workspaces without restarting the server.

#### Example Workflow

1. Start by listing available boards:

```typescript
{
  name: 'list_boards',
  arguments: {}
}
```

2. Set your active board:

```typescript
{
  name: 'set_active_board',
  arguments: {
    boardId: "abc123"  // ID from list_boards response
  }
}
```

3. List workspaces if needed:

```typescript
{
  name: 'list_workspaces',
  arguments: {}
}
```

4. Set active workspace if needed:

```typescript
{
  name: 'set_active_workspace',
  arguments: {
    workspaceId: "xyz789"  // ID from list_workspaces response
  }
}
```

5. Check current active board info:

```typescript
{
  name: 'get_active_board_info',
  arguments: {}
}
```

## CLI Usage

The package also installs a `trello` CLI for local agent use. Same env-var contract as the MCP server (`TRELLO_API_KEY`, `TRELLO_TOKEN`, optional `TRELLO_BOARD_ID`); a `.env` file in the cwd is loaded automatically.

```bash
# Discover boards
trello list-boards --md

# Pin a board for subsequent commands (persisted to ~/.trello-mcp/config.json)
trello set-board <boardId>

# Inspect lists
trello lists --md

# Card lifecycle
trello card add <listId> "Task name" --desc "details" --due 2026-05-01T12:00:00Z
trello card update <cardId> --name "Renamed" --done
trello card move <cardId> <listId>
trello card get <cardId> --md

# Your assigned cards
trello cards mine --md
```

Default output is JSON (one object/array per command) for agent consumption. Add `--md` for human-readable markdown.

Exit codes: `0` success, `1` missing config / validation error, `2` Trello API error. Errors are written to stderr; results to stdout.

## Date Format Guidelines

When working with dates in the Trello MCP server, please note the different format requirements:

- **Due Date (`dueDate`)**: Accepts full ISO 8601 format with time (e.g., `2023-12-31T12:00:00Z`)
- **Start Date (`start`)**: Accepts date only in YYYY-MM-DD format (e.g., `2025-08-05`)

This distinction follows Trello's API conventions where start dates are day-based markers while due dates can include specific times.

## Available Tools

### Checklist Management Tools

#### get_checklist_items

Get all items from a checklist by name.

```typescript
{
  name: 'get_checklist_items',
  arguments: {
    name: string,        // Name of the checklist to retrieve items from
    boardId?: string     // Optional: ID of the board (uses default if not provided)
  }
}
```

#### add_checklist_item

Add a new item to an existing checklist.

```typescript
{
  name: 'add_checklist_item',
  arguments: {
    text: string,           // Text content of the checklist item
    checkListName: string,  // Name of the checklist to add the item to
    boardId?: string        // Optional: ID of the board (uses default if not provided)
  }
}
```

#### find_checklist_items_by_description

Search for checklist items containing specific text.

```typescript
{
  name: 'find_checklist_items_by_description',
  arguments: {
    description: string,  // Text to search for in checklist item descriptions
    boardId?: string      // Optional: ID of the board (uses default if not provided)
  }
}
```

#### get_acceptance_criteria

Get all items from the "Acceptance Criteria" checklist.

```typescript
{
  name: 'get_acceptance_criteria',
  arguments: {
    boardId?: string  // Optional: ID of the board (uses default if not provided)
  }
}
```

#### get_checklist_by_name

Get a complete checklist with all items and completion percentage.

```typescript
{
  name: 'get_checklist_by_name',
  arguments: {
    name: string,     // Name of the checklist to retrieve
    boardId?: string  // Optional: ID of the board (uses default if not provided)
  }
}
```

**Returns:** `CheckList` object with:
- `id`: Checklist identifier
- `name`: Checklist name
- `items`: Array of `CheckListItem` objects
- `percentComplete`: Completion percentage (0-100)

### get_card

Get comprehensive details of a specific Trello card with human-level parity.

```typescript
{
  name: 'get_card',
  arguments: {
    cardId: string,          // ID of the Trello card (short ID like 'FdhbArbK' or full ID)
    includeMarkdown?: boolean // Return formatted markdown instead of JSON (default: false)
  }
}
```

**Returns:** Complete card data including:
- ✅ Checklists with item states and assignments
- 📎 Attachments with previews and metadata
- 🏷️ Labels with names and colors
- 👥 Assigned members
- 💬 Comments and activity
- 📊 Statistics (badges)
- 🎨 Cover images
- 📍 Board and list context

### get_cards_by_list_id

Fetch all cards from a specific list.

```typescript
{
  name: 'get_cards_by_list_id',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    listId: string    // ID of the Trello list
  }
}
```

### get_lists

Retrieve all lists from a board.

```typescript
{
  name: 'get_lists',
  arguments: {
    boardId?: string  // Optional: ID of the board (uses default if not provided)
  }
}
```

### get_recent_activity

Fetch recent activity on a board.

```typescript
{
  name: 'get_recent_activity',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    limit?: number    // Optional: Number of activities to fetch (default: 10)
  }
}
```

### add_card_to_list

Add a new card to a specified list.

```typescript
{
  name: 'add_card_to_list',
  arguments: {
    boardId?: string,     // Optional: ID of the board (uses default if not provided)
    listId: string,       // ID of the list to add the card to
    name: string,         // Name of the card
    description?: string, // Optional: Description of the card
    dueDate?: string,     // Optional: Due date (ISO 8601 format with time)
    start?: string,       // Optional: Start date (YYYY-MM-DD format, date only)
    labels?: string[]     // Optional: Array of label IDs
  }
}
```

### update_card_details

Update an existing card's details.

```typescript
{
  name: 'update_card_details',
  arguments: {
    boardId?: string,     // Optional: ID of the board (uses default if not provided)
    cardId: string,       // ID of the card to update
    name?: string,        // Optional: New name for the card
    description?: string, // Optional: New description
    dueDate?: string,     // Optional: New due date (ISO 8601 format with time)
    start?: string,       // Optional: New start date (YYYY-MM-DD format, date only)
    dueComplete?: boolean,// Optional: Mark the due date as complete (true) or incomplete (false)
    labels?: string[]     // Optional: New array of label IDs
  }
}
```

### archive_card

Send a card to the archive.

```typescript
{
  name: 'archive_card',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    cardId: string    // ID of the card to archive
  }
}
```

### add_list_to_board

Add a new list to a board.

```typescript
{
  name: 'add_list_to_board',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    name: string      // Name of the new list
  }
}
```

### archive_list

Send a list to the archive.

```typescript
{
  name: 'archive_list',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    listId: string    // ID of the list to archive
  }
}
```

### get_my_cards

Fetch all cards assigned to the current user.

```typescript
{
  name: 'get_my_cards',
  arguments: {}
}
```

### move_card

Move a card to a different list.

```typescript
{
  name: 'move_card',
  arguments: {
    boardId?: string,  // Optional: ID of the target board (uses default if not provided)
    cardId: string,    // ID of the card to move
    listId: string     // ID of the target list
  }
}
```

### attach_image_to_card

Attach an image to a card directly from a URL.

```typescript
{
  name: 'attach_image_to_card',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    cardId: string,   // ID of the card to attach the image to
    imageUrl: string, // URL of the image to attach
    name?: string     // Optional: Name for the attachment (defaults to "Image Attachment")
  }
}
```

### list_boards

List all boards the user has access to.

```typescript
{
  name: 'list_boards',
  arguments: {}
}
```

### set_active_board

Set the active board for future operations.

```typescript
{
  name: 'set_active_board',
  arguments: {
    boardId: string  // ID of the board to set as active
  }
}
```

### list_workspaces

List all workspaces the user has access to.

```typescript
{
  name: 'list_workspaces',
  arguments: {}
}
```

### set_active_workspace

Set the active workspace for future operations.

```typescript
{
  name: 'set_active_workspace',
  arguments: {
    workspaceId: string  // ID of the workspace to set as active
  }
}
```

### list_boards_in_workspace

List all boards in a specific workspace.

```typescript
{
  name: 'list_boards_in_workspace',
  arguments: {
    workspaceId: string  // ID of the workspace to list boards from
  }
}
```

### get_active_board_info

Get information about the currently active board.

```typescript
{
  name: 'get_active_board_info',
  arguments: {}
}
```

## Integration Examples

### 🎨 Pairing with Ideogram MCP Server

The Trello MCP server pairs beautifully with [@flowluap/ideogram-mcp-server](https://github.com/flowluap/ideogram-mcp-server) for AI-powered visual content creation. Generate images with Ideogram and attach them directly to your Trello cards!

![Ideogram + Trello Integration Example](https://ss.delo.sh/hosted/20250717-0619.png)

#### Example Workflow

1. **Generate an image with Ideogram:**
```typescript
// Using ideogram-mcp-server
{
  name: 'generate_image',
  arguments: {
    prompt: "A futuristic dashboard design with neon accents",
    aspect_ratio: "16:9"
  }
}
// Returns: { image_url: "https://..." }
```

2. **Attach the generated image to a Trello card:**
```typescript
// Using trello-mcp-server
{
  name: 'attach_image_to_card',
  arguments: {
    cardId: "your-card-id",
    imageUrl: "https://...", // URL from Ideogram
    name: "Dashboard Mockup v1"
  }
}
```

#### Setting up both servers

Add both servers to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "trello": {
      "command": "pnpx",
      "args": ["@delorenj/mcp-server-trello"],
      "env": {
        "TRELLO_API_KEY": "your-trello-api-key",
        "TRELLO_TOKEN": "your-trello-token"
      }
    },
    "ideogram": {
      "command": "pnpx",
      "args": ["@flowluap/ideogram-mcp-server"],
      "env": {
        "IDEOGRAM_API_KEY": "your-ideogram-api-key"
      }
    }
  }
}
```

Now you can seamlessly create visual content and organize it in Trello, all within Claude!

## Rate Limiting

The server implements a token bucket algorithm for rate limiting to comply with Trello's API limits:

- 300 requests per 10 seconds per API key
- 100 requests per 10 seconds per token

Rate limiting is handled automatically, and requests will be queued if limits are reached.

## Error Handling

The server provides detailed error messages for various scenarios:

- Invalid input parameters
- Rate limit exceeded
- API authentication errors
- Network issues
- Invalid board/list/card IDs

## Development

### Prerequisites

- Node.js 18 or higher (CI runs against 18, 20, 22)
- npm

### Setup

```bash
git clone https://github.com/delorenj/mcp-server-trello
cd mcp-server-trello
SKIP_PREPARE=true npm install
cp .env.example .env
# fill in TRELLO_API_KEY and TRELLO_TOKEN
```

### Scripts

- `npm run build` — compile + minify to `build/`
- `npm run build:dev` — compile only (no minify, faster iteration)
- `npm run dev` — run from source via ts-node
- `npm test` — run unit test suite
- `npm run test:watch` — vitest watch mode
- `npm run test:coverage` — coverage report (thresholds: 60% lines)
- `npm run lint` — ESLint check
- `npm run typecheck` — TypeScript type check (no emit)
- `npm run format` — Prettier write

### Testing

Unit tests live in `tests/` and use [Vitest](https://vitest.dev). Tests mock the Trello API via axios mocks — they do not hit the real API.

```bash
npm test
npm run test:coverage
```

### CI

GitHub Actions runs lint, typecheck, test, and build on every push and PR to `main` across Node 18, 20, and 22. See `.github/workflows/ci.yml`.

## Running evals

The evals package loads an mcp client that then runs the index.ts file, so there is no need to rebuild between tests. You can load environment variables by prefixing the npx command. Full documentation can be found [here](https://www.mcpevals.io/docs).

```bash
OPENAI_API_KEY=your-key  npx mcp-eval src/evals/evals.ts src/index.ts
```

## Contributing

Contributions are welcome!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Uses the [Trello REST API](https://developer.atlassian.com/cloud/trello/rest/)

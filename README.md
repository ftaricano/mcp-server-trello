# MCP Server Trello

[![CI](https://github.com/ftaricano/mcp-server-trello/actions/workflows/ci.yml/badge.svg)](https://github.com/ftaricano/mcp-server-trello/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)
![MCP](https://img.shields.io/badge/MCP-compatible-8A2BE2.svg)

Professional Model Context Protocol (MCP) server and local CLI for Trello. It exposes 23 typed tools for boards, lists, cards, checklists, activity, and workspace navigation, with Trello-aware rate limiting and validation built in.

This repository is maintained as `ftaricano/mcp-server-trello`. It is derived from MIT-licensed original work by Jarad DeLorenzo, with original copyright preserved and current ownership/provenance documented in [NOTICE.md](NOTICE.md).

## Highlights

- 23 MCP tools for cards, lists, boards, workspaces, checklists, attachments, and activity.
- Multi-board and workspace support with persisted active board/workspace state.
- Trello API rate limiting for the documented per-key and per-token limits.
- Zod input validation and TypeScript declarations in the published package.
- `trello` CLI for local agent workflows.
- CI on Node.js 20 and 22 for lint, typecheck, tests, build, and `npm pack --dry-run`.

## Requirements

- Node.js 20 or newer.
- A Trello API key from <https://trello.com/app-key>.
- A Trello token created from that API key.

## Install

Use the package directly from npm-compatible MCP clients:

```json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["-y", "@ftaricano/mcp-server-trello"],
      "env": {
        "TRELLO_API_KEY": "replace_with_trello_api_key",
        "TRELLO_TOKEN": "replace_with_trello_token"
      }
    }
  }
}
```

With `pnpx`:

```json
{
  "mcpServers": {
    "trello": {
      "command": "pnpx",
      "args": ["@ftaricano/mcp-server-trello"],
      "env": {
        "TRELLO_API_KEY": "replace_with_trello_api_key",
        "TRELLO_TOKEN": "replace_with_trello_token"
      }
    }
  }
}
```

Global install is also supported:

```bash
npm install -g @ftaricano/mcp-server-trello
mcp-server-trello
```

## Trello Token

Create a Trello token by visiting this URL after replacing the app name and API key:

```text
https://trello.com/1/authorize?expiration=never&name=YOUR_APP_NAME&scope=read,write&response_type=token&key=YOUR_API_KEY
```

Use `expiration=30days` or another shorter value when your operating model can tolerate periodic token renewal. Treat the token like a password.

## Configuration

The server reads credentials from environment variables:

```env
TRELLO_API_KEY=replace_with_trello_api_key
TRELLO_TOKEN=replace_with_trello_token

# Optional defaults. These can also be changed at runtime by MCP tools.
TRELLO_BOARD_ID=
TRELLO_WORKSPACE_ID=
```

The CLI also loads a `.env` file from the current working directory and can read credentials from the macOS Keychain when `TRELLO_KEYCHAIN_PREFIX` is set:

```bash
security add-generic-password -s TRELLO_API_KEY -a "$USER" -w "replace_with_trello_api_key"
security add-generic-password -s TRELLO_TOKEN -a "$USER" -w "replace_with_trello_token"

export TRELLO_KEYCHAIN_PREFIX=TRELLO
trello list-boards --md
```

Credential resolution order for the CLI:

1. Process environment.
2. `.env` file in the current working directory.
3. macOS Keychain entries named `<PREFIX>_API_KEY`, `<PREFIX>_TOKEN`, and optionally `<PREFIX>_BOARD_ID`.

## Tools

Card tools:

- `add_card_to_list`
- `update_card_details`
- `archive_card`
- `move_card`
- `get_card`
- `get_cards_by_list_id`
- `get_my_cards`
- `attach_image_to_card`

List, board, and workspace tools:

- `get_lists`
- `add_list_to_board`
- `archive_list`
- `list_boards`
- `set_active_board`
- `list_workspaces`
- `set_active_workspace`
- `list_boards_in_workspace`
- `get_active_board_info`
- `get_recent_activity`

Checklist tools:

- `get_checklist_items`
- `add_checklist_item`
- `find_checklist_items_by_description`
- `get_acceptance_criteria`
- `get_checklist_by_name`

Most board-scoped tools accept an optional `boardId`. If omitted, the configured or persisted active board is used.

## CLI

The package installs a `trello` binary for local agent and terminal workflows.

```bash
trello list-boards --md
trello set-board <boardId>
trello active-board --md
trello lists --md
trello board labels --md
trello board members --md

trello card add <listId> "Task name" --desc "details" --due 2026-05-01T12:00:00Z
trello card update <cardId> --name "Renamed" --done
trello card move <cardId> <listId>
trello card get <cardId> --md
trello card archive <cardId>
trello card comment <cardId> "Status update"
trello card attach <cardId> https://example.com/cover.png --name "Cover"
trello card assign <cardId> <memberId>
trello card unassign <cardId> <memberId>

trello cards mine --md
trello cards list <listId> --md
```

Default output is JSON for agent consumption. Add `--md` for markdown output. Exit codes are `0` for success, `1` for missing config or validation errors, and `2` for Trello API errors.

## Date Formats

- `dueDate`: full ISO 8601 timestamp, for example `2026-05-01T12:00:00Z`.
- `start`: date only, for example `2026-05-01`.

## Rate Limiting

Requests are queued through a token bucket limiter for Trello's published API limits:

- 300 requests per 10 seconds per API key.
- 100 requests per 10 seconds per token.

## Development

```bash
git clone https://github.com/ftaricano/mcp-server-trello.git
cd mcp-server-trello
SKIP_PREPARE=true npm install
cp .env.example .env
```

Useful commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

## Security

Do not commit real Trello credentials, `.env` files, local logs, generated databases, or machine-specific agent configuration. See [SECURITY.md](SECURITY.md) for supported reporting channels and credential rotation guidance.

## Contributing

Before opening a PR, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

Keep changes focused and include tests for behavior changes.

## License

MIT. See [LICENSE](LICENSE).

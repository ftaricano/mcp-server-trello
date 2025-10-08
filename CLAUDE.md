# CLAUDE.md - Trello MCP Server Guide for Claude Code

This file provides guidance to Claude Code (claude.ai/code) when working with the Trello MCP Server.

## 📖 ESSENTIAL READING

For complete documentation, see `/Users/fernandotaricano/mcp/mcp-server-trello/README.md`

## 🚨 CRITICAL: MCP Hub Integration

**ALWAYS USE MCP HUB** to interact with Trello. Never attempt direct API calls or library imports.

### Required MCP Hub Pattern

```typescript
// 1. DISCOVER tools (intelligent search in Portuguese)
smart-search({ query: "gerenciar cards trello", context: "produtividade" })

// 2. EXECUTE with call-tool
call-tool("trello", "add_card_to_list", {
  listId: "list_id",
  name: "Card Name",
  description: "Description"
})
```

### Alternative Discovery (Category-based)

```typescript
// Discover by category
get-recommendations({ category: "Produtividade", popular: true })

// Traditional discovery
list-all-tools({ server_id: "trello" })
```

## 📋 Available Tools (23 Total)

### Card Management
- `get_cards_by_list_id` - Fetch cards from a specific list
- `add_card_to_list` - Add new card to list (supports dueDate ISO8601, start YYYY-MM-DD)
- `update_card_details` - Update existing card details
- `archive_card` - Archive a card
- `move_card` - Move card between lists/boards
- `get_card` - Get complete card details with checklists, attachments, labels, members
- `get_my_cards` - Fetch cards assigned to current user
- `attach_image_to_card` - Attach image from URL

### Checklist Management (v1.2.0)
- `get_checklist_items` - Get all items from checklist by name
- `add_checklist_item` - Add new item to existing checklist
- `find_checklist_items_by_description` - Search checklist items by text
- `get_acceptance_criteria` - Quick access to "Acceptance Criteria" checklists
- `get_checklist_by_name` - Get complete checklist with completion percentage

### List Management
- `get_lists` - Retrieve all lists from board
- `add_list_to_board` - Add new list to board
- `archive_list` - Archive a list

### Board & Workspace Management
- `list_boards` - List all accessible boards
- `set_active_board` - Set active board for operations
- `get_active_board_info` - Get current active board info
- `list_workspaces` - List all accessible workspaces
- `set_active_workspace` - Set active workspace
- `list_boards_in_workspace` - List boards in specific workspace

### Activity
- `get_recent_activity` - Fetch recent board activity (default: 10 items)

## 🎯 Common Workflows with MCP Hub

### Example 1: Create Card with Portuguese Intelligence

```typescript
// User: "cria um card de tarefa urgente no Trello"

// Step 1: Intelligent discovery
smart-search({
  query: "criar card trello urgente",
  context: "trabalho"
})

// Step 2: Get lists to find correct listId
call-tool("trello", "get_lists", {})

// Step 3: Create card with due date
call-tool("trello", "add_card_to_list", {
  listId: "list_123",
  name: "Tarefa Urgente",
  description: "Descrição detalhada",
  dueDate: "2025-10-15T18:00:00Z",  // ISO 8601 with time
  start: "2025-10-08"                // YYYY-MM-DD date only
})
```

### Example 2: Manage Checklists (v1.2.0 Feature)

```typescript
// User: "adiciona critério de aceitação ao card atual"

// Get existing acceptance criteria
call-tool("trello", "get_acceptance_criteria", {})

// Add new checklist item
call-tool("trello", "add_checklist_item", {
  text: "API endpoints must return proper status codes",
  checkListName: "Acceptance Criteria"
})

// Search checklist items
call-tool("trello", "find_checklist_items_by_description", {
  description: "API"
})
```

### Example 3: Complete Card Analysis

```typescript
// User: "mostra todos os detalhes do card X"

// Get comprehensive card data
call-tool("trello", "get_card", {
  cardId: "card_short_id",
  includeMarkdown: true  // Returns human-readable format
})

// Returns: checklists, attachments, labels, members, comments, badges, cover images
```

### Example 4: Multi-Board Operations

```typescript
// List all boards
call-tool("trello", "list_boards", {})

// Switch active board
call-tool("trello", "set_active_board", {
  boardId: "new_board_id"
})

// Now all operations use the new active board
call-tool("trello", "get_lists", {})
```

## 🚫 PROHIBITED BEHAVIORS

### ❌ NEVER Do This:
- `import axios` or any HTTP library
- `fetch('https://api.trello.com/...')`
- Direct Trello API calls
- Hardcode API keys or tokens
- Skip MCP Hub discovery

### ✅ ALWAYS Do This:
1. Use `smart-search` for Portuguese queries (recommended)
2. Use `get-recommendations` for category discovery
3. Use `list-all-tools` for traditional discovery
4. Use `call-tool` for all operations
5. Follow the Hub → Discover → Execute pattern

## ⚠️ Important Date Format Rules

**Critical for avoiding API errors:**

- **`dueDate`**: Full ISO 8601 format with time
  - Example: `"2025-12-31T23:59:59Z"`
  - Accepts specific time of day

- **`start`**: Date only in YYYY-MM-DD format
  - Example: `"2025-08-05"`
  - No time component allowed

This follows Trello's API conventions where start dates are day-based markers while due dates include specific times.

## 🆕 What's New in v1.2.0

**Complete Checklist Management Suite** - 5 new powerful tools:
1. `get_checklist_items` - Retrieve all items from any checklist
2. `add_checklist_item` - Add new items to existing checklists
3. `find_checklist_items_by_description` - Search by text content
4. `get_acceptance_criteria` - Quick access to "Acceptance Criteria"
5. `get_checklist_by_name` - Complete checklist with completion percentage

Perfect for managing acceptance criteria, development tasks, and project milestones!

## 🆕 What's New in v1.1.0

**Complete Card Data Extraction** - `get_card` tool provides:
- ✅ Checklists with item states and assignments
- 📎 Attachments with previews and metadata
- 🏷️ Labels with names and colors
- 👥 Assigned members with profiles
- 💬 Comments and activity history
- 📊 Statistics (badges) including checklist progress
- 🎨 Cover images
- 📍 Board and list context
- 🔧 Custom fields support

**Markdown Formatting**: Use `includeMarkdown: true` for human-readable output.

## 📚 Integration Patterns

### SPARC Methodology Support

This server integrates with SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology for systematic Test-Driven Development:

1. **Specification Phase**: Use checklists to define acceptance criteria
2. **Pseudocode Phase**: Document algorithm design in card descriptions
3. **Architecture Phase**: Organize cards by architectural components
4. **Refinement Phase**: Track TDD progress with checklist items
5. **Completion Phase**: Move cards through lists representing completion stages

### Ideogram Integration Example

Generate AI images and attach to cards:

```typescript
// 1. Generate image with Ideogram MCP server
call-tool("ideogram", "generate_image", {
  prompt: "Futuristic dashboard design",
  aspect_ratio: "16:9"
})

// 2. Attach to Trello card
call-tool("trello", "attach_image_to_card", {
  cardId: "card_id",
  imageUrl: "https://generated-image-url",
  name: "Dashboard Mockup v1"
})
```

## 🔄 Multi-Board Workflow

Starting with v0.3.0, the server supports dynamic board switching:

```typescript
// 1. Discover available boards
call-tool("trello", "list_boards", {})

// 2. Set active board
call-tool("trello", "set_active_board", { boardId: "abc123" })

// 3. Check current board
call-tool("trello", "get_active_board_info", {})

// 4. All operations now use this board
call-tool("trello", "get_lists", {})

// 5. Override for specific operations
call-tool("trello", "get_lists", { boardId: "different_board" })
```

## 🧠 Portuguese Language Intelligence

The MCP Hub provides revolutionary AI-powered search in Portuguese:

```typescript
// Natural language queries work perfectly
smart-search({ query: "adicionar card urgente", context: "trabalho" })
smart-search({ query: "buscar cards atribuídos a mim" })
smart-search({ query: "criar checklist de critérios" })
smart-search({ query: "mover card para concluído" })
```

**Benefits:**
- 96% intent accuracy for Portuguese queries
- <100ms response time with intelligent caching
- Cultural context awareness (Brazilian Portuguese)
- Learning system improves over time

## 💡 Best Practices

1. **Always discover before executing**: Use intelligent search first
2. **Use Portuguese queries**: Better results with natural language
3. **Respect date formats**: ISO 8601 for dueDate, YYYY-MM-DD for start
4. **Leverage checklists**: Perfect for acceptance criteria and task breakdown
5. **Switch boards dynamically**: No need to restart server
6. **Use markdown output**: `includeMarkdown: true` for readable card data
7. **Multi-board operations**: Use `boardId` parameter to override active board

## 📊 Performance & Rate Limiting

**Automatic rate limiting** handles Trello's API limits:
- 300 requests/10s per API key
- 100 requests/10s per token

Rate limiting is automatic and transparent - requests are queued if limits are reached.

## 🔧 Configuration

**Environment Variables Required:**
- `TRELLO_API_KEY` - Your Trello API key (https://trello.com/app-key)
- `TRELLO_TOKEN` - Generated OAuth token
- `TRELLO_BOARD_ID` - Optional default board (can switch dynamically)
- `TRELLO_WORKSPACE_ID` - Optional default workspace

**Board ID Discovery:**
Found in board URL: `https://trello.com/b/BOARD_ID/board-name`

## 🎯 Quick Reference

**Most Common Operations:**
- Create card: `add_card_to_list`
- Update card: `update_card_details`
- Move card: `move_card`
- Add checklist item: `add_checklist_item`
- Get card details: `get_card`
- Switch board: `set_active_board`

**Always use MCP Hub pattern:**
`smart-search` → `call-tool` → Result

---

**Remember**: The MCP Hub is your ONLY interface to Trello. Never attempt direct API calls or library imports.

For complete API documentation, examples, and changelog, see: `/Users/fernandotaricano/mcp/mcp-server-trello/README.md`

#!/usr/bin/env node
import 'dotenv/config';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { TrelloClient } from './trello-client.js';
import { VERSION } from './version.js';
import {
  listBoards,
  setBoard,
  activeBoard,
  boardLabels,
  boardMembers,
} from './cli/commands/boards.js';
import { lists, cardsInList, addList, archiveList } from './cli/commands/lists.js';
import {
  addCard,
  updateCard,
  moveCard,
  getCard,
  myCards,
  commentCard,
  archiveCard,
  attachImage,
  cardAttachments,
  downloadAttachment,
  deleteAttachment,
  assignMember,
  unassignMember,
} from './cli/commands/cards.js';
import { recentActivity } from './cli/commands/activity.js';
import { listWorkspaces, setWorkspace, workspaceBoards } from './cli/commands/workspaces.js';
import {
  checklistItems,
  addChecklistItem,
  findChecklistItems,
  acceptanceCriteria,
  checklistByName,
} from './cli/commands/checklists.js';
import { loadKeychainCredentials } from './cli/keychain.js';
import { executeCommand } from './cli/run.js';

function makeClient(): TrelloClient {
  const keychain = loadKeychainCredentials();
  const apiKey = process.env.TRELLO_API_KEY ?? keychain.apiKey;
  const token = process.env.TRELLO_TOKEN ?? keychain.token;
  if (!apiKey || !token) {
    process.stderr.write(
      'Error: TRELLO_API_KEY and TRELLO_TOKEN must be set (env, .env file, or macOS keychain via TRELLO_KEYCHAIN_PREFIX)\n'
    );
    process.exit(1);
  }
  const defaultBoardId = process.env.TRELLO_BOARD_ID ?? keychain.boardId;
  return new TrelloClient({ apiKey, token, defaultBoardId, boardId: defaultBoardId });
}

async function run<T extends unknown[]>(
  fn: (client: TrelloClient, ...args: T) => Promise<string>,
  ...args: T
): Promise<void> {
  const client = makeClient();
  const { stdout, exitCode } = await executeCommand(client, fn, ...args);
  process.stdout.write(stdout);
  if (exitCode !== 0) {
    const parsed = JSON.parse(stdout) as { error?: string };
    process.stderr.write(`Error: ${parsed.error ?? 'command failed'}\n`);
    process.exitCode = exitCode;
  }
}

/**
 * Builds the full CLI command tree. Exported (rather than parsed at import time) so tests/parity
 * can introspect every command without executing it — and so the command surface stays in lockstep
 * with the MCP tool set declared in src/mcp-tools.ts.
 */
export function buildProgram(): Command {
  const program = new Command();
  program.name('trello').description('Trello CLI for local agent use').version(VERSION);

  program
    .command('list-boards')
    .description('List all boards you can access')
    .option('--md', 'Render as markdown', false)
    .action(opts => run(listBoards, opts));

  program
    .command('set-board <boardId>')
    .description('Set the active board (persisted to ~/.trello-mcp/config.json)')
    .option('--md', 'Render as markdown', false)
    .action((boardId, opts) => run(setBoard, boardId, opts));

  program
    .command('active-board')
    .description('Show the current active board')
    .option('--md', 'Render as markdown', false)
    .action(opts => run(activeBoard, opts));

  program
    .command('lists')
    .description('List lists on the active (or --board) board')
    .option('--board <id>', 'Override board id')
    .option('--md', 'Render as markdown', false)
    .action(opts => run(lists, opts));

  program
    .command('activity')
    .description('Show recent activity on the active (or --board) board')
    .option('--board <id>', 'Override board id')
    .option('--limit <n>', 'Number of activities to fetch (default: 10)')
    .option('--md', 'Render as markdown', false)
    .action(opts => run(recentActivity, opts));

  program
    .command('workspaces')
    .description('List all workspaces you can access')
    .option('--md', 'Render as markdown', false)
    .action(opts => run(listWorkspaces, opts));

  program
    .command('set-workspace <workspaceId>')
    .description('Set the active workspace')
    .option('--md', 'Render as markdown', false)
    .action((workspaceId, opts) => run(setWorkspace, workspaceId, opts));

  program
    .command('workspace-boards <workspaceId>')
    .description('List all boards in a workspace')
    .option('--md', 'Render as markdown', false)
    .action((workspaceId, opts) => run(workspaceBoards, workspaceId, opts));

  const card = program.command('card').description('Card operations');

  card
    .command('add <listId> <name>')
    .description('Add a new card to a list')
    .option('--desc <text>', 'Card description')
    .option('--due <iso>', 'Due date (ISO 8601)')
    .option('--start <yyyy-mm-dd>', 'Start date (YYYY-MM-DD)')
    .option('--labels <ids>', 'Comma-separated label IDs')
    .option('--board <id>', 'Override board id')
    .option('--md', 'Render as markdown', false)
    .action((listId, name, opts) => run(addCard, listId, name, opts));

  card
    .command('update <cardId>')
    .description('Update an existing card')
    .option('--name <text>', 'New name')
    .option('--desc <text>', 'New description')
    .option('--due <iso>', 'Due date (ISO 8601)')
    .option('--start <yyyy-mm-dd>', 'Start date (YYYY-MM-DD)')
    .option('--done', 'Mark due complete')
    .option('--labels <ids>', 'Comma-separated label IDs')
    .option('--board <id>', 'Override board id')
    .option('--md', 'Render as markdown', false)
    .action((cardId, opts) => run(updateCard, cardId, opts));

  card
    .command('move <cardId> <listId>')
    .description('Move a card to another list')
    .option('--board <id>', 'Override board id')
    .option('--md', 'Render as markdown', false)
    .action((cardId, listId, opts) => run(moveCard, cardId, listId, opts));

  card
    .command('get <cardId>')
    .description('Get full card details')
    .option('--md', 'Render as markdown', false)
    .action((cardId, opts) => run(getCard, cardId, opts));

  card
    .command('comment <cardId> <text>')
    .description('Add a comment to a card')
    .option('--md', 'Render as markdown', false)
    .action((cardId, text, opts) => run(commentCard, cardId, text, opts));

  card
    .command('archive <cardId>')
    .description('Archive a card')
    .option('--board <id>', 'Override board id')
    .option('--md', 'Render as markdown', false)
    .action((cardId, opts) => run(archiveCard, cardId, opts));

  card
    .command('attach <cardId> <imageUrl>')
    .description('Attach an image (by URL) to a card')
    .option('--name <text>', 'Display name for the attachment')
    .option('--board <id>', 'Override board id')
    .option('--md', 'Render as markdown', false)
    .action((cardId, imageUrl, opts) => run(attachImage, cardId, imageUrl, opts));

  card
    .command('attachments <cardId>')
    .description('List all attachments on a card')
    .option('--md', 'Render as markdown', false)
    .action((cardId, opts) => run(cardAttachments, cardId, opts));

  card
    .command('download <cardId> <attachmentId>')
    .description('Download an attachment to disk (authenticates private Trello URLs)')
    .option('--out <path>', 'Output path (defaults to the attachment file name in cwd)')
    .option('--md', 'Render as markdown', false)
    .action((cardId, attachmentId, opts) => run(downloadAttachment, cardId, attachmentId, opts));

  card
    .command('detach <cardId> <attachmentId>')
    .description('Delete an attachment from a card')
    .option('--md', 'Render as markdown', false)
    .action((cardId, attachmentId, opts) => run(deleteAttachment, cardId, attachmentId, opts));

  card
    .command('assign <cardId> <memberId>')
    .description('Assign a member to a card')
    .option('--md', 'Render as markdown', false)
    .action((cardId, memberId, opts) => run(assignMember, cardId, memberId, opts));

  card
    .command('unassign <cardId> <memberId>')
    .description('Unassign a member from a card')
    .option('--md', 'Render as markdown', false)
    .action((cardId, memberId, opts) => run(unassignMember, cardId, memberId, opts));

  const cards = program.command('cards').description('Card list operations');

  cards
    .command('mine')
    .description('Cards assigned to the current user')
    .option('--md', 'Render as markdown', false)
    .action(opts => run(myCards, opts));

  cards
    .command('list <listId>')
    .description('List cards in a specific list')
    .option('--board <id>', 'Override board id')
    .option('--md', 'Render as markdown', false)
    .action((listId, opts) => run(cardsInList, listId, opts));

  const list = program.command('list').description('List operations');

  list
    .command('add <name>')
    .description('Add a new list to the active (or --board) board')
    .option('--board <id>', 'Override board id')
    .option('--md', 'Render as markdown', false)
    .action((name, opts) => run(addList, name, opts));

  list
    .command('archive <listId>')
    .description('Archive a list')
    .option('--board <id>', 'Override board id')
    .option('--md', 'Render as markdown', false)
    .action((listId, opts) => run(archiveList, listId, opts));

  const board = program.command('board').description('Board metadata operations');

  board
    .command('labels')
    .description('List labels on the active (or --board) board')
    .option('--board <id>', 'Override board id')
    .option('--md', 'Render as markdown', false)
    .action(opts => run(boardLabels, opts));

  board
    .command('members')
    .description('List members on the active (or --board) board')
    .option('--board <id>', 'Override board id')
    .option('--md', 'Render as markdown', false)
    .action(opts => run(boardMembers, opts));

  const checklist = program.command('checklist').description('Checklist operations');

  checklist
    .command('items <name>')
    .description('Get all items from a checklist by name')
    .option('--board <id>', 'Override board id')
    .option('--md', 'Render as markdown', false)
    .action((name, opts) => run(checklistItems, name, opts));

  checklist
    .command('add <checkListName> <text>')
    .description('Add a new item to a checklist')
    .option('--board <id>', 'Override board id')
    .option('--md', 'Render as markdown', false)
    .action((checkListName, text, opts) => run(addChecklistItem, checkListName, text, opts));

  checklist
    .command('find <description>')
    .description('Find checklist items whose text contains a substring')
    .option('--board <id>', 'Override board id')
    .option('--md', 'Render as markdown', false)
    .action((description, opts) => run(findChecklistItems, description, opts));

  checklist
    .command('acceptance')
    .description('Get all items from the "Acceptance Criteria" checklist')
    .option('--board <id>', 'Override board id')
    .option('--md', 'Render as markdown', false)
    .action(opts => run(acceptanceCriteria, opts));

  checklist
    .command('get <name>')
    .description('Get a complete checklist with items and completion percentage')
    .option('--board <id>', 'Override board id')
    .option('--md', 'Render as markdown', false)
    .action((name, opts) => run(checklistByName, name, opts));

  return program;
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  buildProgram().parseAsync(process.argv);
}

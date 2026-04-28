#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { TrelloClient } from './trello-client.js';
import { VERSION } from './version.js';
import { listBoards, setBoard, activeBoard } from './cli/commands/boards.js';
import { lists } from './cli/commands/lists.js';
import { addCard, updateCard, moveCard, getCard, myCards } from './cli/commands/cards.js';

function makeClient(): TrelloClient {
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  if (!apiKey || !token) {
    process.stderr.write('Error: TRELLO_API_KEY and TRELLO_TOKEN must be set (env or .env file)\n');
    process.exit(1);
  }
  const defaultBoardId = process.env.TRELLO_BOARD_ID;
  return new TrelloClient({ apiKey, token, defaultBoardId, boardId: defaultBoardId });
}

async function run<T extends unknown[]>(
  fn: (client: TrelloClient, ...args: T) => Promise<string>,
  ...args: T
): Promise<void> {
  const client = makeClient();
  await client.loadConfig();
  try {
    const out = await fn(client, ...args);
    process.stdout.write(out);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: ${msg}\n`);
    process.exit(2);
  }
}

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

const cards = program.command('cards').description('Card list operations');

cards
  .command('mine')
  .description('Cards assigned to the current user')
  .option('--md', 'Render as markdown', false)
  .action(opts => run(myCards, opts));

program.parseAsync(process.argv);

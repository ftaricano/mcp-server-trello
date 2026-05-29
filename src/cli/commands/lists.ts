import type { TrelloClient } from '../../trello-client.js';
import { formatJson } from '../output.js';

interface ListsOpts {
  md: boolean;
  board?: string;
}

export async function lists(client: TrelloClient, opts: ListsOpts): Promise<string> {
  const result = await client.getLists(opts.board);
  if (opts.md) {
    if (result.length === 0) return 'No lists.\n';
    return result.map(l => `- **${l.name}** (\`${l.id}\`)`).join('\n') + '\n';
  }
  return formatJson(result);
}

export async function cardsInList(
  client: TrelloClient,
  listId: string,
  opts: ListsOpts
): Promise<string> {
  const cards = await client.getCardsByList(opts.board, listId);
  if (opts.md) {
    if (cards.length === 0) return 'No cards.\n';
    return cards.map(c => `- **${c.name}** (\`${c.id}\`)`).join('\n') + '\n';
  }
  return formatJson(cards);
}

export async function addList(
  client: TrelloClient,
  name: string,
  opts: ListsOpts
): Promise<string> {
  const list = await client.addList(opts.board, name);
  return opts.md ? `List created: **${list.name}** (\`${list.id}\`)\n` : formatJson(list);
}

export async function archiveList(
  client: TrelloClient,
  listId: string,
  opts: ListsOpts
): Promise<string> {
  const list = await client.archiveList(opts.board, listId);
  return opts.md ? `List archived (\`${list.id}\`)\n` : formatJson(list);
}

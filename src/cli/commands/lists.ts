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

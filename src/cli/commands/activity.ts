import type { TrelloClient } from '../../trello-client.js';
import { formatJson } from '../output.js';

interface ActivityOpts {
  md: boolean;
  board?: string;
  limit?: string;
}

export async function recentActivity(client: TrelloClient, opts: ActivityOpts): Promise<string> {
  const limit = opts.limit ? Number(opts.limit) : 10;
  const actions = await client.getRecentActivity(opts.board, limit);
  if (opts.md) {
    if (actions.length === 0) return 'No recent activity.\n';
    return (
      actions
        .map(a => `- ${a.date} — **${a.type}** by ${a.memberCreator?.fullName ?? 'unknown'}`)
        .join('\n') + '\n'
    );
  }
  return formatJson(actions);
}

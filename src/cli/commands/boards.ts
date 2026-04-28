import type { TrelloClient } from '../../trello-client.js';
import { formatJson, formatBoardsMarkdown } from '../output.js';

interface CommonOpts {
  md: boolean;
}

export async function listBoards(client: TrelloClient, opts: CommonOpts): Promise<string> {
  const boards = await client.listBoards();
  return opts.md ? formatBoardsMarkdown(boards) : formatJson(boards);
}

export async function setBoard(
  client: TrelloClient,
  boardId: string,
  opts: CommonOpts
): Promise<string> {
  const board = await client.setActiveBoard(boardId);
  return opts.md ? `Active board set to **${board.name}** (\`${board.id}\`)\n` : formatJson(board);
}

export async function activeBoard(client: TrelloClient, opts: CommonOpts): Promise<string> {
  const id = client.getActiveBoardId();
  if (!id) {
    return opts.md ? 'No active board set.\n' : formatJson({ active: null });
  }
  const board = await client.getBoardById(id);
  return opts.md ? `**${board.name}** (\`${board.id}\`)\n${board.url}\n` : formatJson(board);
}

interface BoardMetaOpts {
  md: boolean;
  board?: string;
}

export async function boardLabels(client: TrelloClient, opts: BoardMetaOpts): Promise<string> {
  const labels = await client.getBoardLabels(opts.board);
  if (opts.md) {
    if (labels.length === 0) return 'No labels.\n';
    return (
      labels.map(l => `- **${l.name}** (\`${l.id}\`) — ${l.color ?? 'no color'}`).join('\n') + '\n'
    );
  }
  return formatJson(labels);
}

export async function boardMembers(client: TrelloClient, opts: BoardMetaOpts): Promise<string> {
  const members = await client.getBoardMembers(opts.board);
  if (opts.md) {
    if (members.length === 0) return 'No members.\n';
    return members.map(m => `- **${m.fullName}** (@${m.username}, \`${m.id}\`)`).join('\n') + '\n';
  }
  return formatJson(members);
}

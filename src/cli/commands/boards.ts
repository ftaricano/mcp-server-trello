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

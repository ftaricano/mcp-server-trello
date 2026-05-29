import type { TrelloClient } from '../../trello-client.js';
import { formatJson, formatBoardsMarkdown } from '../output.js';

interface CommonOpts {
  md: boolean;
}

export async function listWorkspaces(client: TrelloClient, opts: CommonOpts): Promise<string> {
  const workspaces = await client.listWorkspaces();
  if (opts.md) {
    if (workspaces.length === 0) return 'No workspaces.\n';
    return workspaces.map(w => `- **${w.displayName}** (\`${w.id}\`)`).join('\n') + '\n';
  }
  return formatJson(workspaces);
}

export async function setWorkspace(
  client: TrelloClient,
  workspaceId: string,
  opts: CommonOpts
): Promise<string> {
  const workspace = await client.setActiveWorkspace(workspaceId);
  return opts.md
    ? `Active workspace set to **${workspace.displayName}** (\`${workspace.id}\`)\n`
    : formatJson(workspace);
}

export async function workspaceBoards(
  client: TrelloClient,
  workspaceId: string,
  opts: CommonOpts
): Promise<string> {
  const boards = await client.listBoardsInWorkspace(workspaceId);
  return opts.md ? formatBoardsMarkdown(boards) : formatJson(boards);
}

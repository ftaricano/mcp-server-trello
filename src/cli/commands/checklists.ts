import type { TrelloClient } from '../../trello-client.js';
import type { CheckListItem } from '../../types.js';
import { formatJson } from '../output.js';

interface BoardOpts {
  md: boolean;
  board?: string;
}

function renderItems(items: CheckListItem[]): string {
  return items.map(i => `- [${i.complete ? 'x' : ' '}] ${i.text} (\`${i.id}\`)`).join('\n') + '\n';
}

export async function checklistItems(
  client: TrelloClient,
  name: string,
  opts: BoardOpts
): Promise<string> {
  const items = await client.getChecklistItems(name, opts.board);
  if (opts.md) {
    if (items.length === 0) return 'No items.\n';
    return renderItems(items);
  }
  return formatJson(items);
}

export async function addChecklistItem(
  client: TrelloClient,
  checkListName: string,
  text: string,
  opts: BoardOpts
): Promise<string> {
  const item = await client.addChecklistItem(text, checkListName, opts.board);
  return opts.md ? `Added item to **${checkListName}**: ${text}\n` : formatJson(item);
}

export async function findChecklistItems(
  client: TrelloClient,
  description: string,
  opts: BoardOpts
): Promise<string> {
  const items = await client.findChecklistItemsByDescription(description, opts.board);
  if (opts.md) {
    if (items.length === 0) return 'No matching items.\n';
    return renderItems(items);
  }
  return formatJson(items);
}

export async function acceptanceCriteria(client: TrelloClient, opts: BoardOpts): Promise<string> {
  const items = await client.getAcceptanceCriteria(opts.board);
  if (opts.md) {
    if (items.length === 0) return 'No acceptance criteria.\n';
    return renderItems(items);
  }
  return formatJson(items);
}

export async function checklistByName(
  client: TrelloClient,
  name: string,
  opts: BoardOpts
): Promise<string> {
  const checklist = await client.getChecklistByName(name, opts.board);
  if (!checklist) {
    return opts.md ? `Checklist "${name}" not found.\n` : formatJson({ found: false, name });
  }
  if (opts.md) {
    const header = `## ${checklist.name} (${checklist.percentComplete}%)\n`;
    return header + renderItems(checklist.items);
  }
  return formatJson(checklist);
}

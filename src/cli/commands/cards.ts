import type { TrelloClient } from '../../trello-client.js';
import { formatJson, formatCardMarkdown } from '../output.js';

interface BaseOpts {
  md: boolean;
  board?: string;
}

interface AddOpts extends BaseOpts {
  desc?: string;
  due?: string;
  start?: string;
  labels?: string;
}

interface UpdateOpts extends BaseOpts {
  name?: string;
  desc?: string;
  due?: string;
  start?: string;
  done?: boolean;
  labels?: string;
}

function parseLabels(labels: string | undefined): string[] | undefined {
  if (!labels) return undefined;
  return labels
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export async function addCard(
  client: TrelloClient,
  listId: string,
  name: string,
  opts: AddOpts
): Promise<string> {
  const card = await client.addCard(opts.board, {
    listId,
    name,
    description: opts.desc,
    dueDate: opts.due,
    start: opts.start,
    labels: parseLabels(opts.labels),
  });
  return opts.md ? formatCardMarkdown(card) : formatJson(card);
}

export async function updateCard(
  client: TrelloClient,
  cardId: string,
  opts: UpdateOpts
): Promise<string> {
  const card = await client.updateCard(opts.board, {
    cardId,
    name: opts.name,
    description: opts.desc,
    dueDate: opts.due,
    start: opts.start,
    dueComplete: opts.done,
    labels: parseLabels(opts.labels),
  });
  return opts.md ? formatCardMarkdown(card) : formatJson(card);
}

export async function moveCard(
  client: TrelloClient,
  cardId: string,
  listId: string,
  opts: BaseOpts
): Promise<string> {
  const card = await client.moveCard(opts.board, cardId, listId);
  return opts.md ? formatCardMarkdown(card) : formatJson(card);
}

export async function getCard(
  client: TrelloClient,
  cardId: string,
  opts: BaseOpts
): Promise<string> {
  const result = await client.getCard(cardId, opts.md);
  if (opts.md) {
    return typeof result === 'string' ? result : formatCardMarkdown(result);
  }
  return formatJson(result);
}

export async function myCards(client: TrelloClient, opts: BaseOpts): Promise<string> {
  const cards = await client.getMyCards();
  if (opts.md) {
    if (cards.length === 0) return 'No cards assigned.\n';
    return cards.map(c => `- **${c.name}** (\`${c.id}\`) — list \`${c.idList}\``).join('\n') + '\n';
  }
  return formatJson(cards);
}

export async function commentCard(
  client: TrelloClient,
  cardId: string,
  text: string,
  opts: BaseOpts
): Promise<string> {
  const action = await client.addComment(cardId, text);
  if (opts.md) {
    return `Comment added (\`${action.id}\`): ${text}\n`;
  }
  return formatJson(action);
}

export async function archiveCard(
  client: TrelloClient,
  cardId: string,
  opts: BaseOpts
): Promise<string> {
  const card = await client.archiveCard(opts.board, cardId);
  return opts.md ? `Card archived (\`${card.id}\`)\n` : formatJson(card);
}

export async function attachImage(
  client: TrelloClient,
  cardId: string,
  imageUrl: string,
  opts: BaseOpts & { name?: string }
): Promise<string> {
  const attachment = await client.attachImageToCard(opts.board, cardId, imageUrl, opts.name);
  return opts.md
    ? `Attachment added (\`${attachment.id}\`)\n${attachment.url}\n`
    : formatJson(attachment);
}

export async function assignMember(
  client: TrelloClient,
  cardId: string,
  memberId: string,
  opts: BaseOpts
): Promise<string> {
  const members = await client.assignMember(cardId, memberId);
  return opts.md ? `Assigned member \`${memberId}\` to card \`${cardId}\`\n` : formatJson(members);
}

export async function unassignMember(
  client: TrelloClient,
  cardId: string,
  memberId: string,
  opts: BaseOpts
): Promise<string> {
  const members = await client.unassignMember(cardId, memberId);
  return opts.md
    ? `Unassigned member \`${memberId}\` from card \`${cardId}\`\n`
    : formatJson(members);
}

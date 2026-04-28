import type { TrelloBoard, TrelloCard } from '../types.js';

export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}

export function formatBoardsMarkdown(boards: Pick<TrelloBoard, 'id' | 'name' | 'url'>[]): string {
  if (boards.length === 0) return 'No boards.\n';
  const lines = boards.map(b => `- **${b.name}** (\`${b.id}\`) — ${b.url}`);
  return lines.join('\n') + '\n';
}

export function formatCardMarkdown(
  card: Pick<TrelloCard, 'id' | 'name' | 'desc' | 'idList' | 'due' | 'url'>
): string {
  const lines = [`# ${card.name}`, ''];
  lines.push(`- id: \`${card.id}\``);
  lines.push(`- list: \`${card.idList}\``);
  if (card.due) lines.push(`- due: ${card.due}`);
  lines.push(`- url: ${card.url}`);
  if (card.desc) {
    lines.push('');
    lines.push(card.desc);
  }
  return lines.join('\n') + '\n';
}

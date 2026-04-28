import { describe, it, expect } from 'vitest';
import { formatJson, formatBoardsMarkdown, formatCardMarkdown } from '../../src/cli/output.js';

describe('formatJson', () => {
  it('returns pretty-printed JSON with trailing newline', () => {
    const result = formatJson({ id: '1', name: 'Foo' });
    expect(result).toBe('{\n  "id": "1",\n  "name": "Foo"\n}\n');
  });

  it('handles arrays', () => {
    expect(formatJson([1, 2, 3])).toContain('[\n  1,');
  });
});

describe('formatBoardsMarkdown', () => {
  it('renders a markdown list of boards with id and name', () => {
    const out = formatBoardsMarkdown([
      { id: 'b1', name: 'Personal', url: 'https://trello.com/b/b1' },
      { id: 'b2', name: 'Work', url: 'https://trello.com/b/b2' },
    ]);
    expect(out).toContain('- **Personal** (`b1`)');
    expect(out).toContain('- **Work** (`b2`)');
  });

  it('returns "No boards." for empty array', () => {
    expect(formatBoardsMarkdown([])).toBe('No boards.\n');
  });
});

describe('formatCardMarkdown', () => {
  it('renders card name as heading and includes id, list, due', () => {
    const out = formatCardMarkdown({
      id: 'c1',
      name: 'Task',
      desc: 'Body',
      idList: 'l1',
      due: '2026-05-01T12:00:00Z',
      url: 'https://trello.com/c/c1',
    });
    expect(out).toMatch(/^# Task/);
    expect(out).toContain('`c1`');
    expect(out).toContain('Body');
    expect(out).toContain('2026-05-01');
  });
});

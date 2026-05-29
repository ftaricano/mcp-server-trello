import { describe, it, expect, vi } from 'vitest';
import { getToolDefinitions, extractRawContent } from '../src/mcp-tools.js';
import type { TrelloClient } from '../src/trello-client.js';

function handlerFor(name: string) {
  const def = getToolDefinitions().find(d => d.name === name);
  if (!def) throw new Error(`tool ${name} not found`);
  return def.handler;
}

function textOf(result: unknown): string {
  const blocks = extractRawContent(result);
  const first = blocks?.[0];
  if (!first || first.type !== 'text') throw new Error('expected a text content block');
  return first.text;
}

describe('download_attachment handler', () => {
  it('refuses oversized attachments from metadata, without downloading the bytes', async () => {
    const client = {
      getAttachment: vi.fn().mockResolvedValue({
        id: 'a1',
        name: 'big',
        fileName: 'big.zip',
        mimeType: 'application/zip',
        url: 'https://trello.com/x',
        bytes: 10_000_000,
      }),
      downloadAttachment: vi.fn(),
    };
    const result = await handlerFor('download_attachment')(client as unknown as TrelloClient, {
      cardId: 'c1',
      attachmentId: 'a1',
    });

    expect(client.downloadAttachment).not.toHaveBeenCalled();
    const text = textOf(result);
    expect(text).toContain('exceeds maxBytes');
    expect(text).toContain('"bytes": 10000000');
  });

  it('returns an image block for image attachments within the size limit', async () => {
    const data = Buffer.from('PNGDATA');
    const client = {
      getAttachment: vi.fn().mockResolvedValue({
        id: 'a1',
        name: 'pic',
        fileName: 'pic.png',
        mimeType: 'image/png',
        url: 'https://trello.com/x',
        bytes: data.byteLength,
      }),
      downloadAttachment: vi.fn().mockResolvedValue({
        fileName: 'pic.png',
        mimeType: 'image/png',
        bytes: data.byteLength,
        data,
      }),
    };
    const result = await handlerFor('download_attachment')(client as unknown as TrelloClient, {
      cardId: 'c1',
      attachmentId: 'a1',
    });

    const blocks = extractRawContent(result);
    expect(blocks?.[0]).toEqual({
      type: 'image',
      mimeType: 'image/png',
      data: data.toString('base64'),
    });
  });

  it('falls back to the post-download size guard when metadata lacks bytes', async () => {
    const data = Buffer.alloc(20);
    const client = {
      getAttachment: vi.fn().mockResolvedValue({
        id: 'a1',
        name: 'x',
        fileName: 'x.bin',
        mimeType: 'application/octet-stream',
        url: 'https://trello.com/x',
        bytes: null,
      }),
      downloadAttachment: vi.fn().mockResolvedValue({
        fileName: 'x.bin',
        mimeType: 'application/octet-stream',
        bytes: 20,
        data,
      }),
    };
    const result = await handlerFor('download_attachment')(client as unknown as TrelloClient, {
      cardId: 'c1',
      attachmentId: 'a1',
      maxBytes: 10,
    });

    expect(client.downloadAttachment).toHaveBeenCalled();
    expect(textOf(result)).toContain('exceeds maxBytes 10');
  });

  it('returns base64 + metadata for non-image attachments within the limit', async () => {
    const data = Buffer.from('hello');
    const client = {
      getAttachment: vi.fn().mockResolvedValue({
        id: 'a1',
        name: 'doc',
        fileName: 'doc.pdf',
        mimeType: 'application/pdf',
        url: 'https://trello.com/x',
        bytes: data.byteLength,
      }),
      downloadAttachment: vi.fn().mockResolvedValue({
        fileName: 'doc.pdf',
        mimeType: 'application/pdf',
        bytes: data.byteLength,
        data,
      }),
    };
    const result = await handlerFor('download_attachment')(client as unknown as TrelloClient, {
      cardId: 'c1',
      attachmentId: 'a1',
    });

    const parsed = JSON.parse(textOf(result));
    expect(parsed).toMatchObject({
      fileName: 'doc.pdf',
      mimeType: 'application/pdf',
      bytes: 5,
      base64: data.toString('base64'),
    });
  });
});

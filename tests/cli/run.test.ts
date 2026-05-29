import { describe, it, expect, vi } from 'vitest';
import type { TrelloClient } from '../../src/trello-client.js';
import { executeCommand } from '../../src/cli/run.js';

function clientStub(overrides: Record<string, unknown> = {}): TrelloClient {
  return {
    loadConfig: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as TrelloClient;
}

describe('executeCommand (JAR-256)', () => {
  it('returns handler stdout with exitCode 0 on success', async () => {
    const client = clientStub();
    const fn = vi.fn().mockResolvedValue('{"id":"c1","shortLink":"abc"}\n');
    const res = await executeCommand(client, fn);
    expect(res).toEqual({ stdout: '{"id":"c1","shortLink":"abc"}\n', exitCode: 0 });
  });

  it('emits structured JSON on stdout and a non-zero exit when the handler throws', async () => {
    const client = clientStub();
    const fn = vi.fn().mockRejectedValue(new Error('Trello API Error: 429 rate limited'));
    const res = await executeCommand(client, fn);

    // The core JAR-256 guarantee: stdout is NEVER empty on failure, so a caller
    // cannot mistake an error for "no output" and retry (which duplicated cards).
    expect(res.stdout.trim().length).toBeGreaterThan(0);
    expect(res.exitCode).not.toBe(0);
    expect(JSON.parse(res.stdout)).toMatchObject({
      ok: false,
      error: 'Trello API Error: 429 rate limited',
    });
  });

  it('emits structured JSON when loadConfig fails, without invoking the handler', async () => {
    const client = clientStub({ loadConfig: vi.fn().mockRejectedValue(new Error('config boom')) });
    const fn = vi.fn();
    const res = await executeCommand(client, fn);
    expect(fn).not.toHaveBeenCalled();
    expect(res.exitCode).toBe(1);
    expect(JSON.parse(res.stdout)).toMatchObject({ ok: false, error: 'config boom' });
  });

  it('stringifies non-Error throws so stdout stays parseable', async () => {
    const client = clientStub();
    const fn = vi.fn().mockRejectedValue('plain string failure');
    const res = await executeCommand(client, fn);
    expect(JSON.parse(res.stdout)).toMatchObject({ ok: false, error: 'plain string failure' });
  });

  it('forwards args to the handler', async () => {
    const client = clientStub();
    const fn = vi.fn().mockResolvedValue('ok\n');
    await executeCommand(client, fn, 'l1', 'Title', { md: false });
    expect(fn).toHaveBeenCalledWith(client, 'l1', 'Title', { md: false });
  });
});

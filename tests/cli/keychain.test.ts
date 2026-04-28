import { describe, it, expect, vi, beforeEach } from 'vitest';

const execFileSyncMock = vi.fn();
vi.mock('child_process', () => ({
  execFileSync: (...args: unknown[]) => execFileSyncMock(...args),
}));

import { loadKeychainCredentials } from '../../src/cli/keychain.js';

describe('loadKeychainCredentials', () => {
  beforeEach(() => {
    execFileSyncMock.mockReset();
  });

  it('returns empty object on non-darwin', () => {
    const out = loadKeychainCredentials('linux', 'TRELLO');
    expect(out).toEqual({});
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });

  it('returns empty object when prefix is undefined', () => {
    const out = loadKeychainCredentials('darwin', undefined);
    expect(out).toEqual({});
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });

  it('reads each cred from keychain using the prefix', () => {
    execFileSyncMock.mockImplementation((_cmd: string, args: string[]) => {
      const service = args[args.indexOf('-s') + 1];
      const map: Record<string, string> = {
        TRELLO_API_KEY: 'k\n',
        TRELLO_TOKEN: 't\n',
        TRELLO_BOARD_ID: 'b\n',
      };
      return map[service];
    });

    const out = loadKeychainCredentials('darwin', 'TRELLO');
    expect(out).toEqual({ apiKey: 'k', token: 't', boardId: 'b' });
    expect(execFileSyncMock).toHaveBeenCalledTimes(3);
  });

  it('respects custom prefix (e.g. JARVIS_TRELLO)', () => {
    execFileSyncMock.mockImplementation((_cmd: string, args: string[]) => {
      const service = args[args.indexOf('-s') + 1];
      if (service === 'JARVIS_TRELLO_API_KEY') return 'jk';
      throw new Error('not found');
    });

    const out = loadKeychainCredentials('darwin', 'JARVIS_TRELLO');
    expect(out.apiKey).toBe('jk');
    expect(out.token).toBeUndefined();
    expect(out.boardId).toBeUndefined();
  });

  it('returns undefined for missing items without throwing', () => {
    execFileSyncMock.mockImplementation(() => {
      throw new Error('SecKeychainSearchCopyNext: The specified item could not be found');
    });

    const out = loadKeychainCredentials('darwin', 'TRELLO');
    expect(out).toEqual({ apiKey: undefined, token: undefined, boardId: undefined });
  });

  it('treats empty/whitespace-only keychain values as undefined', () => {
    execFileSyncMock.mockImplementation(() => '   \n');
    const out = loadKeychainCredentials('darwin', 'TRELLO');
    expect(out.apiKey).toBeUndefined();
  });
});

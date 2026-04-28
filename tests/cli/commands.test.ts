import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrelloClient } from '../../src/trello-client.js';
import { listBoards, setBoard, activeBoard } from '../../src/cli/commands/boards.js';

describe('cli boards commands', () => {
  let client: {
    listBoards: ReturnType<typeof vi.fn>;
    setActiveBoard: ReturnType<typeof vi.fn>;
    getBoardById: ReturnType<typeof vi.fn>;
    getActiveBoardId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    client = {
      listBoards: vi.fn(),
      setActiveBoard: vi.fn(),
      getBoardById: vi.fn(),
      getActiveBoardId: vi.fn(),
    };
  });

  it('listBoards returns JSON of all boards', async () => {
    client.listBoards.mockResolvedValue([{ id: 'b1', name: 'B1', url: 'u1' }]);
    const out = await listBoards(client as unknown as TrelloClient, { md: false });
    expect(out).toContain('"id": "b1"');
  });

  it('listBoards returns markdown when md=true', async () => {
    client.listBoards.mockResolvedValue([{ id: 'b1', name: 'B1', url: 'u1' }]);
    const out = await listBoards(client as unknown as TrelloClient, { md: true });
    expect(out).toMatch(/- \*\*B1\*\*/);
  });

  it('setBoard calls client.setActiveBoard with given id and returns confirmation', async () => {
    client.setActiveBoard.mockResolvedValue({ id: 'b1', name: 'B1', url: 'u1' });
    const out = await setBoard(client as unknown as TrelloClient, 'b1', { md: false });
    expect(client.setActiveBoard).toHaveBeenCalledWith('b1');
    expect(out).toContain('"id": "b1"');
  });

  it('setBoard returns markdown confirmation when md=true', async () => {
    client.setActiveBoard.mockResolvedValue({ id: 'b1', name: 'My Board', url: 'u' });
    const out = await setBoard(client as unknown as TrelloClient, 'b1', { md: true });
    expect(out).toContain('My Board');
    expect(out).toContain('b1');
  });

  it('activeBoard returns null marker when no active', async () => {
    client.getActiveBoardId.mockReturnValue(undefined);
    const out = await activeBoard(client as unknown as TrelloClient, { md: false });
    expect(out).toContain('"active": null');
  });

  it('activeBoard fetches and returns the active board details', async () => {
    client.getActiveBoardId.mockReturnValue('b1');
    client.getBoardById.mockResolvedValue({ id: 'b1', name: 'B1', url: 'u' });
    const out = await activeBoard(client as unknown as TrelloClient, { md: false });
    expect(client.getBoardById).toHaveBeenCalledWith('b1');
    expect(out).toContain('"id": "b1"');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrelloClient } from '../../src/trello-client.js';
import { listBoards, setBoard, activeBoard } from '../../src/cli/commands/boards.js';
import { lists as listsCmd } from '../../src/cli/commands/lists.js';

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

describe('cli lists command', () => {
  it('returns lists for active board (no --board)', async () => {
    const client = { getLists: vi.fn().mockResolvedValue([{ id: 'l1', name: 'To Do' }]) };
    const out = await listsCmd(client as unknown as TrelloClient, { md: false });
    expect(client.getLists).toHaveBeenCalledWith(undefined);
    expect(out).toContain('"id": "l1"');
  });

  it('passes --board override', async () => {
    const client = { getLists: vi.fn().mockResolvedValue([]) };
    await listsCmd(client as unknown as TrelloClient, { md: false, board: 'b9' });
    expect(client.getLists).toHaveBeenCalledWith('b9');
  });

  it('renders markdown when md=true', async () => {
    const client = { getLists: vi.fn().mockResolvedValue([{ id: 'l1', name: 'To Do' }]) };
    const out = await listsCmd(client as unknown as TrelloClient, { md: true });
    expect(out).toMatch(/- \*\*To Do\*\* \(`l1`\)/);
  });

  it('renders "No lists." for empty when md=true', async () => {
    const client = { getLists: vi.fn().mockResolvedValue([]) };
    const out = await listsCmd(client as unknown as TrelloClient, { md: true });
    expect(out).toBe('No lists.\n');
  });
});

import { addCard, updateCard, moveCard, getCard, myCards } from '../../src/cli/commands/cards.js';

describe('cli cards commands', () => {
  it('addCard passes name + listId + optional fields', async () => {
    const client = {
      addCard: vi.fn().mockResolvedValue({
        id: 'c1',
        name: 'X',
        desc: 'body',
        idList: 'l1',
        due: null,
        url: 'u',
      }),
    };
    await addCard(client as unknown as TrelloClient, 'l1', 'My Task', {
      md: false,
      desc: 'body',
      due: '2026-05-01T12:00:00Z',
      start: '2026-04-30',
      labels: 'lab1,lab2',
    });
    expect(client.addCard).toHaveBeenCalledWith(undefined, {
      listId: 'l1',
      name: 'My Task',
      description: 'body',
      dueDate: '2026-05-01T12:00:00Z',
      start: '2026-04-30',
      labels: ['lab1', 'lab2'],
    });
  });

  it('addCard --board overrides board param', async () => {
    const client = {
      addCard: vi
        .fn()
        .mockResolvedValue({ id: 'c1', name: 'X', desc: '', idList: 'l1', due: null, url: 'u' }),
    };
    await addCard(client as unknown as TrelloClient, 'l1', 'X', { md: false, board: 'b9' });
    expect(client.addCard).toHaveBeenCalledWith('b9', expect.any(Object));
  });

  it('updateCard maps --done to dueComplete: true', async () => {
    const client = {
      updateCard: vi
        .fn()
        .mockResolvedValue({ id: 'c1', name: 'X', desc: '', idList: 'l1', due: null, url: 'u' }),
    };
    await updateCard(client as unknown as TrelloClient, 'c1', { md: false, done: true });
    expect(client.updateCard).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        cardId: 'c1',
        dueComplete: true,
      })
    );
  });

  it('updateCard passes labels as array', async () => {
    const client = {
      updateCard: vi
        .fn()
        .mockResolvedValue({ id: 'c1', name: 'X', desc: '', idList: 'l1', due: null, url: 'u' }),
    };
    await updateCard(client as unknown as TrelloClient, 'c1', { md: false, labels: 'a,b,c' });
    expect(client.updateCard).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        labels: ['a', 'b', 'c'],
      })
    );
  });

  it('moveCard calls moveCard with cardId + listId', async () => {
    const client = {
      moveCard: vi
        .fn()
        .mockResolvedValue({ id: 'c1', name: 'X', desc: '', idList: 'l2', due: null, url: 'u' }),
    };
    await moveCard(client as unknown as TrelloClient, 'c1', 'l2', { md: false });
    expect(client.moveCard).toHaveBeenCalledWith(undefined, 'c1', 'l2');
  });

  it('getCard returns JSON of card data when md=false', async () => {
    const client = {
      getCard: vi
        .fn()
        .mockResolvedValue({ id: 'c1', name: 'Task', desc: '', idList: 'l1', due: null, url: 'u' }),
    };
    const out = await getCard(client as unknown as TrelloClient, 'c1', { md: false });
    expect(client.getCard).toHaveBeenCalledWith('c1', false);
    expect(out).toContain('"id": "c1"');
  });

  it('getCard passes includeMarkdown=true when md=true and returns the string', async () => {
    const mdString = '# Task\n\n- id: `c1`\n';
    const client = { getCard: vi.fn().mockResolvedValue(mdString) };
    const out = await getCard(client as unknown as TrelloClient, 'c1', { md: true });
    expect(client.getCard).toHaveBeenCalledWith('c1', true);
    expect(out).toBe(mdString);
  });

  it('myCards calls getMyCards', async () => {
    const client = { getMyCards: vi.fn().mockResolvedValue([]) };
    await myCards(client as unknown as TrelloClient, { md: false });
    expect(client.getMyCards).toHaveBeenCalled();
  });

  it('myCards renders markdown list when md=true', async () => {
    const client = {
      getMyCards: vi.fn().mockResolvedValue([{ id: 'c1', name: 'Task', idList: 'l1' }]),
    };
    const out = await myCards(client as unknown as TrelloClient, { md: true });
    expect(out).toContain('Task');
    expect(out).toContain('c1');
    expect(out).toContain('l1');
  });

  it('myCards returns "No cards assigned." for empty when md=true', async () => {
    const client = { getMyCards: vi.fn().mockResolvedValue([]) };
    const out = await myCards(client as unknown as TrelloClient, { md: true });
    expect(out).toBe('No cards assigned.\n');
  });
});

import {
  commentCard,
  archiveCard as archiveCardCmd,
  attachImage,
} from '../../src/cli/commands/cards.js';

describe('cli card comment/archive/attach', () => {
  it('commentCard calls addComment with text', async () => {
    const client = {
      addComment: vi.fn().mockResolvedValue({ id: 'a1', data: { text: 'hi' } }),
    };
    const out = await commentCard(client as unknown as TrelloClient, 'c1', 'hi', { md: false });
    expect(client.addComment).toHaveBeenCalledWith('c1', 'hi');
    expect(out).toContain('"id": "a1"');
  });

  it('commentCard renders markdown when md=true', async () => {
    const client = {
      addComment: vi.fn().mockResolvedValue({ id: 'a1', data: { text: 'hi' } }),
    };
    const out = await commentCard(client as unknown as TrelloClient, 'c1', 'hi', { md: true });
    expect(out).toContain('hi');
    expect(out).toContain('a1');
  });

  it('archiveCardCmd calls archiveCard with cardId', async () => {
    const client = {
      archiveCard: vi.fn().mockResolvedValue({ id: 'c1', closed: true }),
    };
    await archiveCardCmd(client as unknown as TrelloClient, 'c1', { md: false });
    expect(client.archiveCard).toHaveBeenCalledWith(undefined, 'c1');
  });

  it('archiveCardCmd respects --board override', async () => {
    const client = {
      archiveCard: vi.fn().mockResolvedValue({ id: 'c1', closed: true }),
    };
    await archiveCardCmd(client as unknown as TrelloClient, 'c1', { md: false, board: 'b9' });
    expect(client.archiveCard).toHaveBeenCalledWith('b9', 'c1');
  });

  it('attachImage calls attachImageToCard with url + optional name', async () => {
    const client = {
      attachImageToCard: vi.fn().mockResolvedValue({ id: 'a1', url: 'u' }),
    };
    await attachImage(client as unknown as TrelloClient, 'c1', 'https://img.example/x.png', {
      md: false,
      name: 'Cover',
    });
    expect(client.attachImageToCard).toHaveBeenCalledWith(
      undefined,
      'c1',
      'https://img.example/x.png',
      'Cover'
    );
  });

  it('attachImage works without --name', async () => {
    const client = {
      attachImageToCard: vi.fn().mockResolvedValue({ id: 'a1', url: 'u' }),
    };
    await attachImage(client as unknown as TrelloClient, 'c1', 'https://img.example/x.png', {
      md: false,
    });
    expect(client.attachImageToCard).toHaveBeenCalledWith(
      undefined,
      'c1',
      'https://img.example/x.png',
      undefined
    );
  });
});

import {
  assignMember as assignMemberCmd,
  unassignMember as unassignMemberCmd,
} from '../../src/cli/commands/cards.js';

describe('cli card assign/unassign', () => {
  it('assignMember calls client.assignMember', async () => {
    const client = { assignMember: vi.fn().mockResolvedValue([{ id: 'm1' }]) };
    const out = await assignMemberCmd(client as unknown as TrelloClient, 'c1', 'm1', { md: false });
    expect(client.assignMember).toHaveBeenCalledWith('c1', 'm1');
    expect(out).toContain('"id": "m1"');
  });

  it('assignMember --md produces a confirmation', async () => {
    const client = { assignMember: vi.fn().mockResolvedValue([{ id: 'm1' }]) };
    const out = await assignMemberCmd(client as unknown as TrelloClient, 'c1', 'm1', { md: true });
    expect(out).toMatch(/Assigned/);
    expect(out).toContain('m1');
    expect(out).toContain('c1');
  });

  it('unassignMember calls client.unassignMember', async () => {
    const client = { unassignMember: vi.fn().mockResolvedValue([]) };
    await unassignMemberCmd(client as unknown as TrelloClient, 'c1', 'm1', { md: false });
    expect(client.unassignMember).toHaveBeenCalledWith('c1', 'm1');
  });

  it('unassignMember --md produces a confirmation', async () => {
    const client = { unassignMember: vi.fn().mockResolvedValue([]) };
    const out = await unassignMemberCmd(client as unknown as TrelloClient, 'c1', 'm1', {
      md: true,
    });
    expect(out).toMatch(/Unassigned/);
  });
});

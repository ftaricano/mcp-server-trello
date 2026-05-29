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

  it('addCard preserves a multiline desc (markdown/accents/quotes) through JSON output (JAR-256)', async () => {
    const multiline = [
      '**PIS Interpar**',
      'Valor: `R$ 1.234,56`',
      'Vencimento: 25/05 — atenção à "competência"',
      "Obs: çãõé com backticks ``` e aspas 'simples'",
    ].join('\n');
    const client = {
      addCard: vi.fn().mockResolvedValue({
        id: 'c1',
        shortLink: 'abc123',
        name: 'PIS Interpar',
        desc: multiline,
        idList: 'l1',
        due: null,
        url: 'u',
      }),
    };
    const out = await addCard(client as unknown as TrelloClient, 'l1', 'PIS Interpar', {
      md: false,
      desc: multiline,
    });
    // handler forwards the multiline desc unchanged to the client
    expect(client.addCard).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ description: multiline })
    );
    // output is parseable JSON that round-trips the desc exactly and exposes shortLink
    const parsed = JSON.parse(out);
    expect(parsed.desc).toBe(multiline);
    expect(parsed.shortLink).toBe('abc123');
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

import { cardsInList } from '../../src/cli/commands/lists.js';

describe('cli cards list <listId>', () => {
  it('returns cards from the given list', async () => {
    const client = {
      getCardsByList: vi.fn().mockResolvedValue([{ id: 'c1', name: 'Task', shortUrl: 'u' }]),
    };
    const out = await cardsInList(client as unknown as TrelloClient, 'l1', { md: false });
    expect(client.getCardsByList).toHaveBeenCalledWith(undefined, 'l1');
    expect(out).toContain('"id": "c1"');
  });

  it('passes --board override', async () => {
    const client = { getCardsByList: vi.fn().mockResolvedValue([]) };
    await cardsInList(client as unknown as TrelloClient, 'l1', { md: false, board: 'b9' });
    expect(client.getCardsByList).toHaveBeenCalledWith('b9', 'l1');
  });

  it('renders markdown when md=true', async () => {
    const client = {
      getCardsByList: vi.fn().mockResolvedValue([{ id: 'c1', name: 'Task' }]),
    };
    const out = await cardsInList(client as unknown as TrelloClient, 'l1', { md: true });
    expect(out).toMatch(/- \*\*Task\*\* \(`c1`\)/);
  });

  it('returns "No cards." for empty list when md=true', async () => {
    const client = { getCardsByList: vi.fn().mockResolvedValue([]) };
    const out = await cardsInList(client as unknown as TrelloClient, 'l1', { md: true });
    expect(out).toBe('No cards.\n');
  });
});

import { boardLabels, boardMembers } from '../../src/cli/commands/boards.js';

describe('cli board labels/members', () => {
  it('boardLabels returns JSON of all labels', async () => {
    const client = {
      getBoardLabels: vi
        .fn()
        .mockResolvedValue([{ id: 'l1', name: 'Tarefa', color: 'green', idBoard: 'b' }]),
    };
    const out = await boardLabels(client as unknown as TrelloClient, { md: false });
    expect(out).toContain('"name": "Tarefa"');
  });

  it('boardLabels accepts --board override', async () => {
    const client = { getBoardLabels: vi.fn().mockResolvedValue([]) };
    await boardLabels(client as unknown as TrelloClient, { md: false, board: 'bX' });
    expect(client.getBoardLabels).toHaveBeenCalledWith('bX');
  });

  it('boardLabels --md renders list with id and color', async () => {
    const client = {
      getBoardLabels: vi
        .fn()
        .mockResolvedValue([{ id: 'l1', name: 'Tarefa', color: 'green', idBoard: 'b' }]),
    };
    const out = await boardLabels(client as unknown as TrelloClient, { md: true });
    expect(out).toContain('Tarefa');
    expect(out).toContain('l1');
    expect(out).toContain('green');
  });

  it('boardLabels --md with no color shows "no color"', async () => {
    const client = {
      getBoardLabels: vi
        .fn()
        .mockResolvedValue([{ id: 'l1', name: 'Tarefa', color: null, idBoard: 'b' }]),
    };
    const out = await boardLabels(client as unknown as TrelloClient, { md: true });
    expect(out).toContain('no color');
  });

  it('boardMembers returns JSON of all members', async () => {
    const client = {
      getBoardMembers: vi
        .fn()
        .mockResolvedValue([{ id: 'm1', fullName: 'Ferd', username: 'ferd' }]),
    };
    const out = await boardMembers(client as unknown as TrelloClient, { md: false });
    expect(out).toContain('"username": "ferd"');
  });

  it('boardMembers --md renders a list', async () => {
    const client = {
      getBoardMembers: vi
        .fn()
        .mockResolvedValue([{ id: 'm1', fullName: 'Ferd', username: 'ferd' }]),
    };
    const out = await boardMembers(client as unknown as TrelloClient, { md: true });
    expect(out).toContain('Ferd');
    expect(out).toContain('@ferd');
    expect(out).toContain('m1');
  });

  it('boardLabels returns "No labels." for empty when md=true', async () => {
    const client = { getBoardLabels: vi.fn().mockResolvedValue([]) };
    const out = await boardLabels(client as unknown as TrelloClient, { md: true });
    expect(out).toBe('No labels.\n');
  });
});

import { addList, archiveList } from '../../src/cli/commands/lists.js';

describe('cli list add/archive', () => {
  it('addList calls client.addList with board + name', async () => {
    const client = { addList: vi.fn().mockResolvedValue({ id: 'l1', name: 'Backlog' }) };
    const out = await addList(client as unknown as TrelloClient, 'Backlog', { md: false });
    expect(client.addList).toHaveBeenCalledWith(undefined, 'Backlog');
    expect(out).toContain('"id": "l1"');
  });

  it('addList --board override + markdown', async () => {
    const client = { addList: vi.fn().mockResolvedValue({ id: 'l1', name: 'Backlog' }) };
    const out = await addList(client as unknown as TrelloClient, 'Backlog', {
      md: true,
      board: 'b9',
    });
    expect(client.addList).toHaveBeenCalledWith('b9', 'Backlog');
    expect(out).toContain('Backlog');
  });

  it('archiveList calls client.archiveList with board + listId', async () => {
    const client = { archiveList: vi.fn().mockResolvedValue({ id: 'l1', closed: true }) };
    await archiveList(client as unknown as TrelloClient, 'l1', { md: false, board: 'b9' });
    expect(client.archiveList).toHaveBeenCalledWith('b9', 'l1');
  });
});

import { recentActivity } from '../../src/cli/commands/activity.js';

describe('cli activity', () => {
  it('recentActivity defaults limit to 10 and passes board', async () => {
    const client = { getRecentActivity: vi.fn().mockResolvedValue([]) };
    await recentActivity(client as unknown as TrelloClient, { md: false, board: 'b9' });
    expect(client.getRecentActivity).toHaveBeenCalledWith('b9', 10);
  });

  it('recentActivity parses --limit', async () => {
    const client = { getRecentActivity: vi.fn().mockResolvedValue([]) };
    await recentActivity(client as unknown as TrelloClient, { md: false, limit: '5' });
    expect(client.getRecentActivity).toHaveBeenCalledWith(undefined, 5);
  });

  it('recentActivity renders markdown lines', async () => {
    const client = {
      getRecentActivity: vi
        .fn()
        .mockResolvedValue([
          { date: '2026-05-29', type: 'commentCard', memberCreator: { fullName: 'Ferd' } },
        ]),
    };
    const out = await recentActivity(client as unknown as TrelloClient, { md: true });
    expect(out).toContain('commentCard');
    expect(out).toContain('Ferd');
  });
});

import {
  listWorkspaces,
  setWorkspace,
  workspaceBoards,
} from '../../src/cli/commands/workspaces.js';

describe('cli workspaces', () => {
  it('listWorkspaces returns JSON', async () => {
    const client = {
      listWorkspaces: vi.fn().mockResolvedValue([{ id: 'w1', displayName: 'Acme' }]),
    };
    const out = await listWorkspaces(client as unknown as TrelloClient, { md: false });
    expect(out).toContain('"id": "w1"');
  });

  it('setWorkspace calls setActiveWorkspace and confirms', async () => {
    const client = {
      setActiveWorkspace: vi.fn().mockResolvedValue({ id: 'w1', displayName: 'Acme' }),
    };
    const out = await setWorkspace(client as unknown as TrelloClient, 'w1', { md: true });
    expect(client.setActiveWorkspace).toHaveBeenCalledWith('w1');
    expect(out).toContain('Acme');
  });

  it('workspaceBoards lists boards in a workspace', async () => {
    const client = {
      listBoardsInWorkspace: vi.fn().mockResolvedValue([{ id: 'b1', name: 'B1', url: 'u' }]),
    };
    const out = await workspaceBoards(client as unknown as TrelloClient, 'w1', { md: false });
    expect(client.listBoardsInWorkspace).toHaveBeenCalledWith('w1');
    expect(out).toContain('"id": "b1"');
  });
});

import {
  checklistItems,
  addChecklistItem,
  findChecklistItems,
  acceptanceCriteria,
  checklistByName,
} from '../../src/cli/commands/checklists.js';

describe('cli checklists', () => {
  it('checklistItems passes name + board', async () => {
    const client = {
      getChecklistItems: vi.fn().mockResolvedValue([{ id: 'i1', text: 'do it', complete: false }]),
    };
    const out = await checklistItems(client as unknown as TrelloClient, 'QA', {
      md: false,
      board: 'b9',
    });
    expect(client.getChecklistItems).toHaveBeenCalledWith('QA', 'b9');
    expect(out).toContain('"id": "i1"');
  });

  it('checklistItems markdown renders checkbox state', async () => {
    const client = {
      getChecklistItems: vi.fn().mockResolvedValue([{ id: 'i1', text: 'done', complete: true }]),
    };
    const out = await checklistItems(client as unknown as TrelloClient, 'QA', { md: true });
    expect(out).toContain('[x] done');
  });

  it('addChecklistItem maps args to (text, checkListName, board)', async () => {
    const client = { addChecklistItem: vi.fn().mockResolvedValue({ id: 'i1' }) };
    await addChecklistItem(client as unknown as TrelloClient, 'QA', 'new item', { md: false });
    expect(client.addChecklistItem).toHaveBeenCalledWith('new item', 'QA', undefined);
  });

  it('findChecklistItems passes description', async () => {
    const client = { findChecklistItemsByDescription: vi.fn().mockResolvedValue([]) };
    await findChecklistItems(client as unknown as TrelloClient, 'deploy', { md: false });
    expect(client.findChecklistItemsByDescription).toHaveBeenCalledWith('deploy', undefined);
  });

  it('acceptanceCriteria passes board', async () => {
    const client = { getAcceptanceCriteria: vi.fn().mockResolvedValue([]) };
    await acceptanceCriteria(client as unknown as TrelloClient, { md: false, board: 'b9' });
    expect(client.getAcceptanceCriteria).toHaveBeenCalledWith('b9');
  });

  it('checklistByName returns {found:false} for missing checklist (JSON)', async () => {
    const client = { getChecklistByName: vi.fn().mockResolvedValue(null) };
    const out = await checklistByName(client as unknown as TrelloClient, 'Nope', { md: false });
    expect(out).toContain('"found": false');
  });

  it('checklistByName renders header + items in markdown', async () => {
    const client = {
      getChecklistByName: vi.fn().mockResolvedValue({
        id: 'cl1',
        name: 'QA',
        percentComplete: 50,
        items: [{ id: 'i1', text: 'a', complete: true }],
      }),
    };
    const out = await checklistByName(client as unknown as TrelloClient, 'QA', { md: true });
    expect(out).toContain('## QA (50%)');
    expect(out).toContain('[x] a');
  });
});

import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { readFile, rm } from 'node:fs/promises';
import {
  cardAttachments,
  downloadAttachment,
  deleteAttachment,
} from '../../src/cli/commands/cards.js';

describe('cli card attachments', () => {
  it('cardAttachments lists attachments as JSON', async () => {
    const client = {
      getCardAttachments: vi
        .fn()
        .mockResolvedValue([
          { id: 'a1', name: 'doc', url: 'u', mimeType: 'application/pdf', bytes: 10 },
        ]),
    };
    const out = await cardAttachments(client as unknown as TrelloClient, 'c1', { md: false });
    expect(client.getCardAttachments).toHaveBeenCalledWith('c1');
    expect(out).toContain('"id": "a1"');
  });

  it('downloadAttachment writes bytes to --out and reports metadata', async () => {
    const out = join(tmpdir(), `trello-dl-${Date.now()}.bin`);
    const client = {
      downloadAttachment: vi.fn().mockResolvedValue({
        fileName: 'doc.pdf',
        mimeType: 'application/pdf',
        bytes: 5,
        data: Buffer.from('hello'),
      }),
    };
    try {
      const res = await downloadAttachment(client as unknown as TrelloClient, 'c1', 'a1', {
        md: false,
        out,
      });
      expect(client.downloadAttachment).toHaveBeenCalledWith('c1', 'a1');
      const written = await readFile(out);
      expect(written.toString()).toBe('hello');
      expect(res).toContain('"savedTo"');
      expect(res).toContain('"bytes": 5');
    } finally {
      await rm(out, { force: true });
    }
  });

  it('deleteAttachment calls client and confirms in markdown', async () => {
    const client = {
      deleteAttachment: vi.fn().mockResolvedValue({ id: 'a1', deleted: true }),
    };
    const res = await deleteAttachment(client as unknown as TrelloClient, 'c1', 'a1', { md: true });
    expect(client.deleteAttachment).toHaveBeenCalledWith('c1', 'a1');
    expect(res).toMatch(/deleted/);
  });

  it('downloadAttachment basenames the attachment fileName to block path traversal', async () => {
    const traversalName = `../../trello-traversal-${Date.now()}.bin`;
    const expectedTarget = resolve(traversalName.split('/').pop() as string);
    const client = {
      downloadAttachment: vi.fn().mockResolvedValue({
        fileName: traversalName,
        mimeType: 'application/octet-stream',
        bytes: 3,
        data: Buffer.from('abc'),
      }),
    };
    try {
      const res = await downloadAttachment(client as unknown as TrelloClient, 'c1', 'a1', {
        md: false,
      });
      const parsed = JSON.parse(res) as { savedTo: string };
      // The "../../" must be stripped: the file lands inside the cwd, not at a traversed path.
      expect(parsed.savedTo).toBe(expectedTarget);
      expect(parsed.savedTo).not.toContain('..');
      const written = await readFile(expectedTarget);
      expect(written.toString()).toBe('abc');
    } finally {
      await rm(expectedTarget, { force: true });
    }
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

interface MockAxiosInstance {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  interceptors: { request: { use: ReturnType<typeof vi.fn> } };
}

// Hoisted axios mock — must be installed before TrelloClient is imported.
vi.mock('axios', () => {
  const create = vi.fn(() => {
    const instance: MockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: { request: { use: vi.fn() } },
    };
    return instance;
  });
  return {
    default: {
      create,
      get: vi.fn(),
      isAxiosError: vi.fn(() => false),
    },
    isAxiosError: vi.fn(() => false),
  };
});

import axios from 'axios';
import { TrelloClient } from '../src/trello-client.js';
import {
  mockBoard,
  mockCard,
  mockCardArchived,
  mockCardMoved,
  mockList,
  mockListDone,
} from './fixtures/trello-responses.js';

function getMockInstance(client: TrelloClient): MockAxiosInstance {
  void client; // ensure client constructed before reading
  const create = axios.create as unknown as ReturnType<typeof vi.fn>;
  const lastResult = create.mock.results[create.mock.results.length - 1];
  return lastResult.value as MockAxiosInstance;
}

describe('TrelloClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCardsByList', () => {
    it('returns parsed cards from mocked response', async () => {
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        defaultBoardId: 'board123',
      });
      const mock = getMockInstance(client);
      mock.get.mockResolvedValueOnce({ data: [mockCard] });

      const cards = await client.getCardsByList(undefined, 'list1');

      expect(cards).toHaveLength(1);
      expect(cards[0].id).toBe('card1');
      expect(cards[0].name).toBe('Test Card');
    });

    it('calls correct URL /lists/{listId}/cards', async () => {
      const client = new TrelloClient({ apiKey: 'k', token: 't' });
      const mock = getMockInstance(client);
      mock.get.mockResolvedValueOnce({ data: [] });

      await client.getCardsByList(undefined, 'list42');

      expect(mock.get).toHaveBeenCalledTimes(1);
      expect(mock.get).toHaveBeenCalledWith('/lists/list42/cards');
    });
  });

  describe('getLists', () => {
    it('uses defaultBoardId when no override is provided', async () => {
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        defaultBoardId: 'board123',
      });
      const mock = getMockInstance(client);
      mock.get.mockResolvedValueOnce({ data: [mockList, mockListDone] });

      const lists = await client.getLists();

      expect(lists).toHaveLength(2);
      expect(mock.get).toHaveBeenCalledWith('/boards/board123/lists');
    });

    it('uses provided boardId override', async () => {
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        defaultBoardId: 'board123',
      });
      const mock = getMockInstance(client);
      mock.get.mockResolvedValueOnce({ data: [mockList] });

      await client.getLists('boardOverride');

      expect(mock.get).toHaveBeenCalledWith('/boards/boardOverride/lists');
    });

    it('throws when no boardId is available', async () => {
      const client = new TrelloClient({ apiKey: 'k', token: 't' });

      await expect(client.getLists()).rejects.toThrow(/boardId is required/);
    });
  });

  describe('listBoards', () => {
    it('calls /members/me/boards', async () => {
      const client = new TrelloClient({ apiKey: 'k', token: 't' });
      const mock = getMockInstance(client);
      mock.get.mockResolvedValueOnce({ data: [mockBoard] });

      const boards = await client.listBoards();

      expect(boards).toEqual([mockBoard]);
      expect(mock.get).toHaveBeenCalledWith('/members/me/boards');
    });
  });

  describe('addCard', () => {
    it('POSTs to /cards with name and idList in body', async () => {
      const client = new TrelloClient({ apiKey: 'k', token: 't' });
      const mock = getMockInstance(client);
      mock.post.mockResolvedValueOnce({ data: mockCard });

      const card = await client.addCard(undefined, {
        listId: 'list1',
        name: 'New Card',
      });

      expect(card.id).toBe('card1');
      expect(mock.post).toHaveBeenCalledTimes(1);
      const [url, body] = mock.post.mock.calls[0];
      expect(url).toBe('/cards');
      expect(body).toMatchObject({
        idList: 'list1',
        name: 'New Card',
      });
    });

    it('includes optional due (from dueDate) and start when provided', async () => {
      const client = new TrelloClient({ apiKey: 'k', token: 't' });
      const mock = getMockInstance(client);
      mock.post.mockResolvedValueOnce({ data: mockCard });

      await client.addCard(undefined, {
        listId: 'list1',
        name: 'Dated Card',
        description: 'has dates',
        dueDate: '2026-12-31T23:59:59Z',
        start: '2026-12-01',
        labels: ['lbl1', 'lbl2'],
      });

      const [, body] = mock.post.mock.calls[0];
      expect(body).toMatchObject({
        idList: 'list1',
        name: 'Dated Card',
        desc: 'has dates',
        due: '2026-12-31T23:59:59Z',
        start: '2026-12-01',
        idLabels: ['lbl1', 'lbl2'],
      });
    });
  });

  describe('archiveCard', () => {
    it('PUTs to /cards/{cardId} with closed: true', async () => {
      const client = new TrelloClient({ apiKey: 'k', token: 't' });
      const mock = getMockInstance(client);
      mock.put.mockResolvedValueOnce({ data: mockCardArchived });

      const card = await client.archiveCard(undefined, 'card1');

      expect(card.closed).toBe(true);
      expect(mock.put).toHaveBeenCalledTimes(1);
      const [url, body] = mock.put.mock.calls[0];
      expect(url).toBe('/cards/card1');
      expect(body).toEqual({ closed: true });
    });
  });

  describe('moveCard', () => {
    it('PUTs to /cards/{cardId} with idList in body', async () => {
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        defaultBoardId: 'board123',
      });
      const mock = getMockInstance(client);
      mock.put.mockResolvedValueOnce({ data: mockCardMoved });

      const card = await client.moveCard(undefined, 'card1', 'list2');

      expect(card.idList).toBe('list2');
      const [url, body] = mock.put.mock.calls[0];
      expect(url).toBe('/cards/card1');
      expect(body).toMatchObject({
        idList: 'list2',
        idBoard: 'board123',
      });
    });

    it('omits idBoard when none is available', async () => {
      const client = new TrelloClient({ apiKey: 'k', token: 't' });
      const mock = getMockInstance(client);
      mock.put.mockResolvedValueOnce({ data: mockCardMoved });

      await client.moveCard(undefined, 'card1', 'list2');

      const [, body] = mock.put.mock.calls[0];
      expect(body).toEqual({ idList: 'list2' });
      expect(body).not.toHaveProperty('idBoard');
    });
  });

  describe('boardId resolution priority', () => {
    it('boardId override beats activeConfig.boardId beats defaultBoardId', async () => {
      // construct client with both defaultBoardId AND boardId; override at call time
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        defaultBoardId: 'defaultB',
        boardId: 'configB',
      });
      const mock = getMockInstance(client);

      // override wins
      mock.get.mockResolvedValueOnce({ data: [] });
      await client.getLists('overrideB');
      expect(mock.get).toHaveBeenLastCalledWith('/boards/overrideB/lists');

      // no override → activeConfig.boardId wins
      mock.get.mockResolvedValueOnce({ data: [] });
      await client.getLists();
      expect(mock.get).toHaveBeenLastCalledWith('/boards/configB/lists');
    });

    it('falls back to defaultBoardId when boardId not set in config', async () => {
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        defaultBoardId: 'defaultB',
      });
      const mock = getMockInstance(client);
      mock.get.mockResolvedValueOnce({ data: [] });

      await client.getLists();

      expect(mock.get).toHaveBeenCalledWith('/boards/defaultB/lists');
    });
  });

  describe('addComment', () => {
    it('addComment posts to /cards/{id}/actions/comments with text', async () => {
      const client = new TrelloClient({ apiKey: 'k', token: 't' });
      const mock = getMockInstance(client);
      mock.post.mockResolvedValueOnce({
        data: { id: 'a1', data: { text: 'hi' } },
      });

      const action = await client.addComment('card1', 'hi');

      expect(action.id).toBe('a1');
      expect(mock.post).toHaveBeenCalledWith(
        expect.stringContaining('/cards/card1/actions/comments'),
        null,
        expect.objectContaining({ params: expect.objectContaining({ text: 'hi' }) })
      );
    });
  });

  describe('getBoardLabels', () => {
    it('GETs /boards/{id}/labels using activeBoard fallback', async () => {
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        defaultBoardId: 'board123',
      });
      const mock = getMockInstance(client);
      mock.get.mockResolvedValueOnce({
        data: [{ id: 'l1', name: 'Tarefa', color: 'green', idBoard: 'board123' }],
      });

      const labels = await client.getBoardLabels();

      expect(mock.get).toHaveBeenCalledWith('/boards/board123/labels');
      expect(labels[0].name).toBe('Tarefa');
    });

    it('accepts boardId override', async () => {
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        defaultBoardId: 'board123',
      });
      const mock = getMockInstance(client);
      mock.get.mockResolvedValueOnce({ data: [] });

      await client.getBoardLabels('boardX');

      expect(mock.get).toHaveBeenCalledWith('/boards/boardX/labels');
    });

    it('throws when no board configured and no override', async () => {
      const client = new TrelloClient({ apiKey: 'k', token: 't' });

      await expect(client.getBoardLabels()).rejects.toThrow(/boardId is required/);
    });
  });

  describe('getBoardMembers', () => {
    it('GETs /boards/{id}/members', async () => {
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        defaultBoardId: 'board123',
      });
      const mock = getMockInstance(client);
      mock.get.mockResolvedValueOnce({
        data: [{ id: 'm1', fullName: 'Ferd', username: 'ferd' }],
      });

      const members = await client.getBoardMembers();

      expect(mock.get).toHaveBeenCalledWith('/boards/board123/members');
      expect(members[0].username).toBe('ferd');
    });
  });

  describe('assignMember', () => {
    it('POSTs to /cards/{id}/idMembers with value=memberId', async () => {
      const client = new TrelloClient({ apiKey: 'k', token: 't' });
      const mock = getMockInstance(client);
      mock.post.mockResolvedValueOnce({ data: [{ id: 'm1' }] });

      const members = await client.assignMember('card1', 'm1');

      expect(members).toEqual([{ id: 'm1' }]);
      expect(mock.post).toHaveBeenCalledWith(
        expect.stringContaining('/cards/card1/idMembers'),
        null,
        expect.objectContaining({ params: expect.objectContaining({ value: 'm1' }) })
      );
    });
  });

  describe('unassignMember', () => {
    it('DELETEs /cards/{id}/idMembers/{memberId}', async () => {
      const client = new TrelloClient({ apiKey: 'k', token: 't' });
      const mock = getMockInstance(client);
      mock.delete.mockResolvedValueOnce({ data: [] });

      const members = await client.unassignMember('card1', 'm1');

      expect(members).toEqual([]);
      expect(mock.delete).toHaveBeenCalledWith(
        expect.stringContaining('/cards/card1/idMembers/m1')
      );
    });
  });

  describe('attachments', () => {
    it('getCardAttachments GETs /cards/{id}/attachments', async () => {
      const client = new TrelloClient({ apiKey: 'k', token: 't' });
      const mock = getMockInstance(client);
      mock.get.mockResolvedValueOnce({
        data: [{ id: 'att1', name: 'file', url: 'https://trello.com/x' }],
      });

      const atts = await client.getCardAttachments('card1');

      expect(mock.get).toHaveBeenCalledWith('/cards/card1/attachments');
      expect(atts[0].id).toBe('att1');
    });

    it('getAttachment GETs /cards/{id}/attachments/{attId}', async () => {
      const client = new TrelloClient({ apiKey: 'k', token: 't' });
      const mock = getMockInstance(client);
      mock.get.mockResolvedValueOnce({ data: { id: 'att1', name: 'file' } });

      const att = await client.getAttachment('card1', 'att1');

      expect(mock.get).toHaveBeenCalledWith('/cards/card1/attachments/att1');
      expect(att.id).toBe('att1');
    });

    it('downloadAttachment sends OAuth header for trello.com hosts', async () => {
      const client = new TrelloClient({ apiKey: 'mykey', token: 'mytok' });
      const mock = getMockInstance(client);
      mock.get.mockResolvedValueOnce({
        data: {
          id: 'att1',
          name: 'doc',
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          url: 'https://trello.com/1/cards/card1/attachments/att1/download/doc.pdf',
          bytes: 3,
        },
      });
      const axiosGet = axios.get as unknown as ReturnType<typeof vi.fn>;
      axiosGet.mockResolvedValueOnce({
        data: Buffer.from('abc'),
        headers: { 'content-type': 'application/pdf' },
      });

      const dl = await client.downloadAttachment('card1', 'att1');

      expect(dl.fileName).toBe('doc.pdf');
      expect(dl.mimeType).toBe('application/pdf');
      expect(dl.bytes).toBe(3);
      const [url, cfg] = axiosGet.mock.calls[axiosGet.mock.calls.length - 1];
      expect(url).toContain('trello.com');
      expect(cfg.responseType).toBe('arraybuffer');
      expect(cfg.headers.Authorization).toMatch(
        /OAuth oauth_consumer_key="mykey", oauth_token="mytok"/
      );
    });

    it('downloadAttachment does NOT leak credentials to external hosts', async () => {
      const client = new TrelloClient({ apiKey: 'mykey', token: 'mytok' });
      const mock = getMockInstance(client);
      mock.get.mockResolvedValueOnce({
        data: {
          id: 'att2',
          name: 'link',
          fileName: null,
          mimeType: '',
          url: 'https://example.com/file.bin',
          bytes: 0,
        },
      });
      const axiosGet = axios.get as unknown as ReturnType<typeof vi.fn>;
      axiosGet.mockResolvedValueOnce({ data: Buffer.from('x'), headers: {} });

      await client.downloadAttachment('card1', 'att2');

      const [, cfg] = axiosGet.mock.calls[axiosGet.mock.calls.length - 1];
      expect(cfg.headers.Authorization).toBeUndefined();
    });

    it('beforeRedirect drops the OAuth header when a download redirects off trello.com', async () => {
      const client = new TrelloClient({ apiKey: 'mykey', token: 'mytok' });
      const mock = getMockInstance(client);
      mock.get.mockResolvedValueOnce({
        data: {
          id: 'att1',
          name: 'doc',
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          url: 'https://trello.com/1/cards/card1/attachments/att1/download/doc.pdf',
          bytes: 3,
        },
      });
      const axiosGet = axios.get as unknown as ReturnType<typeof vi.fn>;
      axiosGet.mockResolvedValueOnce({
        data: Buffer.from('abc'),
        headers: { 'content-type': 'application/pdf' },
      });

      await client.downloadAttachment('card1', 'att1');

      const [, cfg] = axiosGet.mock.calls[axiosGet.mock.calls.length - 1];
      const beforeRedirect = cfg.beforeRedirect as (o: {
        hostname: string;
        headers: Record<string, string>;
      }) => void;

      // Redirect to a non-Trello host (e.g. S3 presigned URL): credentials must be stripped.
      const foreign = {
        hostname: 'trello-attachments.s3.amazonaws.com',
        headers: { Authorization: 'OAuth x' } as Record<string, string>,
      };
      beforeRedirect(foreign);
      expect(foreign.headers.Authorization).toBeUndefined();

      // Redirect that stays within Trello: header is preserved.
      const internal = {
        hostname: 'api.trello.com',
        headers: { Authorization: 'OAuth x' } as Record<string, string>,
      };
      beforeRedirect(internal);
      expect(internal.headers.Authorization).toBe('OAuth x');
    });

    it('deleteAttachment DELETEs and returns confirmation', async () => {
      const client = new TrelloClient({ apiKey: 'k', token: 't' });
      const mock = getMockInstance(client);
      mock.delete.mockResolvedValueOnce({ data: { _value: null } });

      const res = await client.deleteAttachment('card1', 'att1');

      expect(mock.delete).toHaveBeenCalledWith('/cards/card1/attachments/att1');
      expect(res).toEqual({ id: 'att1', deleted: true });
    });
  });

  describe('axios.create configuration', () => {
    it('creates axios instance with Trello base URL and credential params', () => {
      new TrelloClient({ apiKey: 'my-key', token: 'my-token' });

      const create = axios.create as unknown as ReturnType<typeof vi.fn>;
      expect(create).toHaveBeenCalled();
      const config = create.mock.calls[create.mock.calls.length - 1][0];
      expect(config).toMatchObject({
        baseURL: 'https://api.trello.com/1',
        params: { key: 'my-key', token: 'my-token' },
      });
    });
  });
});

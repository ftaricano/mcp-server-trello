import type { TrelloBoard, TrelloCard, TrelloList, TrelloAction } from '../../src/types.js';

export const mockBoard: TrelloBoard = {
  id: 'board123',
  name: 'Test Board',
  desc: '',
  closed: false,
  idOrganization: 'workspace1',
  url: 'https://trello.com/b/board123',
  shortUrl: 'https://trello.com/b/board123',
};

export const mockBoardSecondary: TrelloBoard = {
  id: 'board456',
  name: 'Other Board',
  desc: '',
  closed: false,
  idOrganization: 'workspace1',
  url: 'https://trello.com/b/board456',
  shortUrl: 'https://trello.com/b/board456',
};

export const mockList: TrelloList = {
  id: 'list1',
  name: 'To Do',
  idBoard: 'board123',
  closed: false,
  pos: 1,
};

export const mockListDone: TrelloList = {
  id: 'list2',
  name: 'Done',
  idBoard: 'board123',
  closed: false,
  pos: 2,
};

export const mockCard: TrelloCard = {
  id: 'card1',
  name: 'Test Card',
  desc: 'Description',
  due: null,
  idList: 'list1',
  idLabels: [],
  closed: false,
  url: 'https://trello.com/c/card1',
  dateLastActivity: '2026-01-01T12:00:00.000Z',
};

export const mockCardArchived: TrelloCard = {
  ...mockCard,
  closed: true,
};

export const mockCardMoved: TrelloCard = {
  ...mockCard,
  idList: 'list2',
};

export const mockAction: TrelloAction = {
  id: 'action1',
  idMemberCreator: 'member1',
  type: 'createCard',
  date: '2026-01-01T12:00:00.000Z',
  data: {
    board: { id: 'board123', name: 'Test Board' },
    card: { id: 'card1', name: 'Test Card' },
    list: { id: 'list1', name: 'To Do' },
  },
  memberCreator: {
    id: 'member1',
    fullName: 'Test User',
    username: 'testuser',
  },
};

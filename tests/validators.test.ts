import { describe, it, expect } from 'vitest';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import {
  validateString,
  validateOptionalString,
  validateNumber,
  validateOptionalNumber,
  validateBoolean,
  validateOptionalBoolean,
  validateStringArray,
  validateOptionalStringArray,
  validateOptionalDateString,
  validateGetCardsListRequest,
  validateGetListsRequest,
  validateGetRecentActivityRequest,
  validateAddCardRequest,
  validateUpdateCardRequest,
  validateArchiveCardRequest,
  validateAddListRequest,
  validateArchiveListRequest,
  validateMoveCardRequest,
  validateAttachImageRequest,
  validateSetActiveBoardRequest,
  validateSetActiveWorkspaceRequest,
  validateListBoardsInWorkspaceRequest,
  validateGetCardRequest,
} from '../src/validators.js';

describe('validateString', () => {
  it('returns the value when it is a string', () => {
    expect(validateString('hello', 'field')).toBe('hello');
  });

  it('throws McpError when value is a number', () => {
    expect(() => validateString(42, 'field')).toThrow(McpError);
  });

  it('error message includes the field name', () => {
    expect(() => validateString(42, 'myField')).toThrow(/myField/);
  });

  it('throws when value is undefined', () => {
    expect(() => validateString(undefined, 'field')).toThrow(McpError);
  });
});

describe('validateOptionalString', () => {
  it('returns undefined when value is undefined', () => {
    expect(validateOptionalString(undefined)).toBeUndefined();
  });

  it('returns the string when value is valid', () => {
    expect(validateOptionalString('hello')).toBe('hello');
  });

  it('throws when value is not a string', () => {
    expect(() => validateOptionalString(123)).toThrow(McpError);
  });
});

describe('validateNumber', () => {
  it('returns the value when it is a number', () => {
    expect(validateNumber(7, 'count')).toBe(7);
  });

  it('throws McpError when value is a string', () => {
    expect(() => validateNumber('7', 'count')).toThrow(McpError);
  });
});

describe('validateOptionalNumber', () => {
  it('returns undefined when value is undefined', () => {
    expect(validateOptionalNumber(undefined)).toBeUndefined();
  });

  it('returns the number when value is valid', () => {
    expect(validateOptionalNumber(0)).toBe(0);
  });

  it('throws when value is not a number', () => {
    expect(() => validateOptionalNumber('1')).toThrow(McpError);
  });
});

describe('validateBoolean', () => {
  it('returns true when value is true', () => {
    expect(validateBoolean(true, 'flag')).toBe(true);
  });

  it('returns false when value is false', () => {
    expect(validateBoolean(false, 'flag')).toBe(false);
  });

  it('throws McpError when value is not a boolean', () => {
    expect(() => validateBoolean('true', 'flag')).toThrow(McpError);
  });
});

describe('validateOptionalBoolean', () => {
  it('returns undefined when value is undefined', () => {
    expect(validateOptionalBoolean(undefined)).toBeUndefined();
  });

  it('returns the boolean when valid', () => {
    expect(validateOptionalBoolean(true)).toBe(true);
  });

  it('throws when value is not a boolean', () => {
    expect(() => validateOptionalBoolean('false')).toThrow(McpError);
  });
});

describe('validateStringArray', () => {
  it('returns the array when all elements are strings', () => {
    expect(validateStringArray(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('returns empty array as-is', () => {
    expect(validateStringArray([])).toEqual([]);
  });

  it('throws when value is not an array', () => {
    expect(() => validateStringArray('not-an-array')).toThrow(McpError);
  });

  it('throws when array contains non-string values', () => {
    expect(() => validateStringArray(['a', 1])).toThrow(McpError);
  });
});

describe('validateOptionalStringArray', () => {
  it('returns undefined when value is undefined', () => {
    expect(validateOptionalStringArray(undefined)).toBeUndefined();
  });

  it('returns the array when valid', () => {
    expect(validateOptionalStringArray(['x'])).toEqual(['x']);
  });

  it('throws when array contains non-strings', () => {
    expect(() => validateOptionalStringArray([1, 2])).toThrow(McpError);
  });
});

describe('validateOptionalDateString', () => {
  it('returns undefined when value is undefined', () => {
    expect(validateOptionalDateString(undefined)).toBeUndefined();
  });

  it('returns the date string when in YYYY-MM-DD format', () => {
    expect(validateOptionalDateString('2025-01-15')).toBe('2025-01-15');
  });

  it('throws when format uses slashes', () => {
    expect(() => validateOptionalDateString('2025/01/15')).toThrow(McpError);
  });

  it('throws when value is not a string', () => {
    expect(() => validateOptionalDateString(20250115)).toThrow(McpError);
  });

  it('throws when value is an empty string', () => {
    expect(() => validateOptionalDateString('')).toThrow(McpError);
  });
});

describe('validateGetCardsListRequest', () => {
  it('returns object with listId when valid', () => {
    expect(validateGetCardsListRequest({ listId: 'l1' })).toEqual({
      boardId: undefined,
      listId: 'l1',
    });
  });

  it('passes through optional boardId', () => {
    expect(validateGetCardsListRequest({ listId: 'l1', boardId: 'b1' })).toEqual({
      boardId: 'b1',
      listId: 'l1',
    });
  });

  it('throws when listId is missing', () => {
    expect(() => validateGetCardsListRequest({})).toThrow(McpError);
  });
});

describe('validateGetListsRequest', () => {
  it('returns object with optional boardId undefined', () => {
    expect(validateGetListsRequest({})).toEqual({ boardId: undefined });
  });

  it('returns object with boardId when given', () => {
    expect(validateGetListsRequest({ boardId: 'b1' })).toEqual({ boardId: 'b1' });
  });

  it('throws when boardId is wrong type', () => {
    expect(() => validateGetListsRequest({ boardId: 123 })).toThrow(McpError);
  });
});

describe('validateGetRecentActivityRequest', () => {
  it('returns object with optional fields undefined', () => {
    expect(validateGetRecentActivityRequest({})).toEqual({
      boardId: undefined,
      limit: undefined,
    });
  });

  it('passes through boardId and limit', () => {
    expect(validateGetRecentActivityRequest({ boardId: 'b1', limit: 5 })).toEqual({
      boardId: 'b1',
      limit: 5,
    });
  });

  it('throws when limit is not a number', () => {
    expect(() => validateGetRecentActivityRequest({ limit: '5' })).toThrow(McpError);
  });
});

describe('validateAddCardRequest', () => {
  it('returns object when minimal required fields are present', () => {
    expect(validateAddCardRequest({ listId: 'l1', name: 'Card' })).toEqual({
      boardId: undefined,
      listId: 'l1',
      name: 'Card',
      description: undefined,
      dueDate: undefined,
      start: undefined,
      labels: undefined,
    });
  });

  it('handles all optional fields populated', () => {
    expect(
      validateAddCardRequest({
        listId: 'l1',
        name: 'Card',
        boardId: 'b1',
        description: 'desc',
        dueDate: '2025-12-31T23:59:59Z',
        start: '2025-08-05',
        labels: ['red', 'blue'],
      })
    ).toEqual({
      boardId: 'b1',
      listId: 'l1',
      name: 'Card',
      description: 'desc',
      dueDate: '2025-12-31T23:59:59Z',
      start: '2025-08-05',
      labels: ['red', 'blue'],
    });
  });

  it('throws when listId is missing', () => {
    expect(() => validateAddCardRequest({ name: 'Card' })).toThrow(McpError);
  });

  it('throws when name is missing', () => {
    expect(() => validateAddCardRequest({ listId: 'l1' })).toThrow(McpError);
  });

  it('throws when start has invalid format', () => {
    expect(() =>
      validateAddCardRequest({ listId: 'l1', name: 'Card', start: '08-05-2025' })
    ).toThrow(McpError);
  });
});

describe('validateUpdateCardRequest', () => {
  it('returns object with cardId only', () => {
    expect(validateUpdateCardRequest({ cardId: 'c1' })).toEqual({
      boardId: undefined,
      cardId: 'c1',
      name: undefined,
      description: undefined,
      dueDate: undefined,
      start: undefined,
      dueComplete: undefined,
      labels: undefined,
    });
  });

  it('handles all optional fields populated', () => {
    expect(
      validateUpdateCardRequest({
        cardId: 'c1',
        boardId: 'b1',
        name: 'New',
        description: 'desc',
        dueDate: '2025-12-31T23:59:59Z',
        start: '2025-08-05',
        dueComplete: true,
        labels: ['green'],
      })
    ).toEqual({
      boardId: 'b1',
      cardId: 'c1',
      name: 'New',
      description: 'desc',
      dueDate: '2025-12-31T23:59:59Z',
      start: '2025-08-05',
      dueComplete: true,
      labels: ['green'],
    });
  });

  it('throws when cardId is missing', () => {
    expect(() => validateUpdateCardRequest({})).toThrow(McpError);
  });

  it('throws when dueComplete is not a boolean', () => {
    expect(() => validateUpdateCardRequest({ cardId: 'c1', dueComplete: 'yes' })).toThrow(McpError);
  });
});

describe('validateArchiveCardRequest', () => {
  it('returns object when cardId is present', () => {
    expect(validateArchiveCardRequest({ cardId: 'c1' })).toEqual({
      boardId: undefined,
      cardId: 'c1',
    });
  });

  it('throws when cardId is missing', () => {
    expect(() => validateArchiveCardRequest({})).toThrow(McpError);
  });
});

describe('validateAddListRequest', () => {
  it('returns object when name is present', () => {
    expect(validateAddListRequest({ name: 'List' })).toEqual({
      boardId: undefined,
      name: 'List',
    });
  });

  it('throws when name is missing', () => {
    expect(() => validateAddListRequest({})).toThrow(McpError);
  });
});

describe('validateArchiveListRequest', () => {
  it('returns object when listId is present', () => {
    expect(validateArchiveListRequest({ listId: 'l1' })).toEqual({
      boardId: undefined,
      listId: 'l1',
    });
  });

  it('throws when listId is missing', () => {
    expect(() => validateArchiveListRequest({})).toThrow(McpError);
  });
});

describe('validateMoveCardRequest', () => {
  it('returns object when cardId and listId are present', () => {
    expect(validateMoveCardRequest({ cardId: 'c1', listId: 'l1' })).toEqual({
      boardId: undefined,
      cardId: 'c1',
      listId: 'l1',
    });
  });

  it('throws when cardId is missing', () => {
    expect(() => validateMoveCardRequest({ listId: 'l1' })).toThrow(McpError);
  });

  it('throws when listId is missing', () => {
    expect(() => validateMoveCardRequest({ cardId: 'c1' })).toThrow(McpError);
  });
});

describe('validateAttachImageRequest', () => {
  it('returns object with valid url and required fields', () => {
    expect(
      validateAttachImageRequest({
        cardId: 'c1',
        imageUrl: 'https://example.com/image.png',
      })
    ).toEqual({
      boardId: undefined,
      cardId: 'c1',
      imageUrl: 'https://example.com/image.png',
      name: undefined,
    });
  });

  it('passes through optional name and boardId', () => {
    expect(
      validateAttachImageRequest({
        cardId: 'c1',
        imageUrl: 'https://example.com/image.png',
        name: 'Cover',
        boardId: 'b1',
      })
    ).toEqual({
      boardId: 'b1',
      cardId: 'c1',
      imageUrl: 'https://example.com/image.png',
      name: 'Cover',
    });
  });

  it('throws when cardId is missing', () => {
    expect(() => validateAttachImageRequest({ imageUrl: 'https://example.com/image.png' })).toThrow(
      McpError
    );
  });

  it('throws when imageUrl is missing', () => {
    expect(() => validateAttachImageRequest({ cardId: 'c1' })).toThrow(McpError);
  });

  it('throws when imageUrl is not a valid URL', () => {
    expect(() => validateAttachImageRequest({ cardId: 'c1', imageUrl: 'not-a-url' })).toThrow(
      McpError
    );
  });
});

describe('validateSetActiveBoardRequest', () => {
  it('returns object when boardId is present', () => {
    expect(validateSetActiveBoardRequest({ boardId: 'b1' })).toEqual({ boardId: 'b1' });
  });

  it('throws when boardId is missing', () => {
    expect(() => validateSetActiveBoardRequest({})).toThrow(McpError);
  });
});

describe('validateSetActiveWorkspaceRequest', () => {
  it('returns object when workspaceId is present', () => {
    expect(validateSetActiveWorkspaceRequest({ workspaceId: 'w1' })).toEqual({
      workspaceId: 'w1',
    });
  });

  it('throws when workspaceId is missing', () => {
    expect(() => validateSetActiveWorkspaceRequest({})).toThrow(McpError);
  });
});

describe('validateListBoardsInWorkspaceRequest', () => {
  it('returns object when workspaceId is present', () => {
    expect(validateListBoardsInWorkspaceRequest({ workspaceId: 'w1' })).toEqual({
      workspaceId: 'w1',
    });
  });

  it('throws when workspaceId is missing', () => {
    expect(() => validateListBoardsInWorkspaceRequest({})).toThrow(McpError);
  });
});

describe('validateGetCardRequest', () => {
  it('returns object with cardId only', () => {
    expect(validateGetCardRequest({ cardId: 'c1' })).toEqual({
      cardId: 'c1',
      includeMarkdown: undefined,
    });
  });

  it('passes through includeMarkdown when provided', () => {
    expect(validateGetCardRequest({ cardId: 'c1', includeMarkdown: true })).toEqual({
      cardId: 'c1',
      includeMarkdown: true,
    });
  });

  it('throws when cardId is missing', () => {
    expect(() => validateGetCardRequest({})).toThrow(McpError);
  });

  it('throws when includeMarkdown is not a boolean', () => {
    expect(() => validateGetCardRequest({ cardId: 'c1', includeMarkdown: 'yes' })).toThrow(
      McpError
    );
  });
});

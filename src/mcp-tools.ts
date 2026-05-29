import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { TrelloClient } from './trello-client.js';
import type { AttachmentDownload } from './types.js';

/**
 * Single source of truth for the MCP tool surface.
 *
 * Each Trello operation is declared exactly once here and consumed by:
 *   - src/index.ts   → registers every entry as an MCP tool
 *   - tests/parity   → asserts the CLI exposes the same operation set
 *
 * Adding an operation in one surface without the other breaks the parity test,
 * which is how CLI ⇄ MCP stay in lockstep.
 */

export type ToolContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string };

export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodRawShape;
  handler: (client: TrelloClient, args: Record<string, unknown>) => Promise<unknown>;
}

const CONTENT = Symbol('mcpContent');

/** Wrap pre-built MCP content blocks so the registration layer renders them verbatim. */
export function rawContent(blocks: ToolContentBlock[]): Record<symbol, ToolContentBlock[]> {
  return { [CONTENT]: blocks };
}

/** Extract pre-built content blocks from a handler result, if any. */
export function extractRawContent(data: unknown): ToolContentBlock[] | null {
  if (data && typeof data === 'object' && CONTENT in (data as object)) {
    return (data as Record<symbol, ToolContentBlock[]>)[CONTENT];
  }
  return null;
}

/**
 * Canonical MCP-tool → CLI-command mapping. This is the parity contract: every key must be an MCP
 * tool name returned by getToolDefinitions(), and every value must resolve to a leaf command in the
 * CLI's buildProgram(). tests/parity.test.ts enforces all three invariants (keys == tool names,
 * values == CLI leaf paths, values unique), so neither surface can gain or lose an operation alone.
 */
export const CLI_PATHS: Record<string, string> = {
  get_cards_by_list_id: 'cards list',
  get_lists: 'lists',
  get_recent_activity: 'activity',
  add_card_to_list: 'card add',
  update_card_details: 'card update',
  archive_card: 'card archive',
  move_card: 'card move',
  add_list_to_board: 'list add',
  archive_list: 'list archive',
  get_my_cards: 'cards mine',
  attach_image_to_card: 'card attach',
  get_card_attachments: 'card attachments',
  download_attachment: 'card download',
  delete_attachment: 'card detach',
  list_boards: 'list-boards',
  set_active_board: 'set-board',
  list_workspaces: 'workspaces',
  set_active_workspace: 'set-workspace',
  list_boards_in_workspace: 'workspace-boards',
  get_active_board_info: 'active-board',
  get_card: 'card get',
  add_comment: 'card comment',
  get_board_labels: 'board labels',
  get_board_members: 'board members',
  assign_member: 'card assign',
  unassign_member: 'card unassign',
  get_checklist_items: 'checklist items',
  add_checklist_item: 'checklist add',
  find_checklist_items_by_description: 'checklist find',
  get_acceptance_criteria: 'checklist acceptance',
  get_checklist_by_name: 'checklist get',
};

const boardIdField = z
  .string()
  .optional()
  .describe('ID of the Trello board (uses the active/default board if not provided)');

const s = (v: unknown): string => String(v);
const optS = (v: unknown): string | undefined => (v === undefined ? undefined : String(v));
const optStrArray = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.map(String) : undefined;

/** Shared "too large for inline download" response used by the download_attachment size guards. */
function attachmentTooLarge(
  cardId: string,
  attachmentId: string,
  fileName: string,
  mimeType: string,
  bytes: number,
  maxBytes: number
): Record<symbol, ToolContentBlock[]> {
  return rawContent([
    {
      type: 'text',
      text:
        `Attachment "${fileName}" is ${bytes} bytes (exceeds maxBytes ${maxBytes}). ` +
        `Use the CLI \`trello card download ${cardId} ${attachmentId} --out <path>\` ` +
        `to save it locally, or raise maxBytes.\n` +
        JSON.stringify({ fileName, mimeType, bytes }, null, 2),
    },
  ]);
}

export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: 'get_cards_by_list_id',
      title: 'Get Cards by List ID',
      description: 'Fetch cards from a specific Trello list on a specific board',
      inputSchema: { boardId: boardIdField, listId: z.string().describe('ID of the Trello list') },
      handler: (client, a) => client.getCardsByList(optS(a.boardId), s(a.listId)),
    },
    {
      name: 'get_lists',
      title: 'Get Lists',
      description: 'Retrieve all lists from the specified board',
      inputSchema: { boardId: boardIdField },
      handler: (client, a) => client.getLists(optS(a.boardId)),
    },
    {
      name: 'get_recent_activity',
      title: 'Get Recent Activity',
      description: 'Fetch recent activity on the Trello board',
      inputSchema: {
        boardId: boardIdField,
        limit: z.number().optional().default(10).describe('Number of activities to fetch'),
      },
      handler: (client, a) =>
        client.getRecentActivity(optS(a.boardId), typeof a.limit === 'number' ? a.limit : 10),
    },
    {
      name: 'add_card_to_list',
      title: 'Add Card to List',
      description: 'Add a new card to a specified list on a specific board',
      inputSchema: {
        boardId: boardIdField,
        listId: z.string().describe('ID of the list to add the card to'),
        name: z.string().describe('Name of the card'),
        description: z.string().optional().describe('Description of the card'),
        dueDate: z.string().optional().describe('Due date for the card (ISO 8601 format)'),
        start: z.string().optional().describe('Start date for the card (YYYY-MM-DD format)'),
        labels: z.array(z.string()).optional().describe('Array of label IDs to apply to the card'),
      },
      handler: (client, a) =>
        client.addCard(optS(a.boardId), {
          listId: s(a.listId),
          name: s(a.name),
          description: optS(a.description),
          dueDate: optS(a.dueDate),
          start: optS(a.start),
          labels: optStrArray(a.labels),
        }),
    },
    {
      name: 'update_card_details',
      title: 'Update Card Details',
      description: "Update an existing card's details on a specific board",
      inputSchema: {
        boardId: boardIdField,
        cardId: z.string().describe('ID of the card to update'),
        name: z.string().optional().describe('New name for the card'),
        description: z.string().optional().describe('New description for the card'),
        dueDate: z.string().optional().describe('New due date for the card (ISO 8601 format)'),
        start: z.string().optional().describe('New start date for the card (YYYY-MM-DD format)'),
        dueComplete: z.boolean().optional().describe('Mark the due date as complete or incomplete'),
        labels: z.array(z.string()).optional().describe('New array of label IDs for the card'),
      },
      handler: (client, a) =>
        client.updateCard(optS(a.boardId), {
          cardId: s(a.cardId),
          name: optS(a.name),
          description: optS(a.description),
          dueDate: optS(a.dueDate),
          start: optS(a.start),
          dueComplete: typeof a.dueComplete === 'boolean' ? a.dueComplete : undefined,
          labels: optStrArray(a.labels),
        }),
    },
    {
      name: 'archive_card',
      title: 'Archive Card',
      description: 'Send a card to the archive on a specific board',
      inputSchema: {
        boardId: boardIdField,
        cardId: z.string().describe('ID of the card to archive'),
      },
      handler: (client, a) => client.archiveCard(optS(a.boardId), s(a.cardId)),
    },
    {
      name: 'move_card',
      title: 'Move Card',
      description: 'Move a card to a different list, potentially on a different board',
      inputSchema: {
        boardId: boardIdField,
        cardId: z.string().describe('ID of the card to move'),
        listId: z.string().describe('ID of the target list'),
      },
      handler: (client, a) => client.moveCard(optS(a.boardId), s(a.cardId), s(a.listId)),
    },
    {
      name: 'add_list_to_board',
      title: 'Add List to Board',
      description: 'Add a new list to the specified board',
      inputSchema: { boardId: boardIdField, name: z.string().describe('Name of the new list') },
      handler: (client, a) => client.addList(optS(a.boardId), s(a.name)),
    },
    {
      name: 'archive_list',
      title: 'Archive List',
      description: 'Send a list to the archive on a specific board',
      inputSchema: {
        boardId: boardIdField,
        listId: z.string().describe('ID of the list to archive'),
      },
      handler: (client, a) => client.archiveList(optS(a.boardId), s(a.listId)),
    },
    {
      name: 'get_my_cards',
      title: 'Get My Cards',
      description: 'Fetch all cards assigned to the current user',
      inputSchema: {},
      handler: client => client.getMyCards(),
    },
    {
      name: 'attach_image_to_card',
      title: 'Attach Image to Card',
      description: 'Attach an image (or any file) to a card from a URL on a specific board',
      inputSchema: {
        boardId: boardIdField,
        cardId: z.string().describe('ID of the card to attach to'),
        imageUrl: z.string().describe('URL of the image/file to attach'),
        name: z.string().optional().describe('Optional display name for the attachment'),
      },
      handler: (client, a) =>
        client.attachImageToCard(optS(a.boardId), s(a.cardId), s(a.imageUrl), optS(a.name)),
    },
    {
      name: 'get_card_attachments',
      title: 'Get Card Attachments',
      description:
        'List all attachments on a card (metadata: id, name, url, fileName, mimeType, bytes). ' +
        'Use download_attachment to fetch the actual file content.',
      inputSchema: { cardId: z.string().describe('ID of the card to list attachments from') },
      handler: (client, a) => client.getCardAttachments(s(a.cardId)),
    },
    {
      name: 'download_attachment',
      title: 'Download Attachment',
      description:
        'Download the binary content of a card attachment. Trello-hosted attachments on private ' +
        'boards require authentication that a plain URL fetch lacks (401) — this tool sends the ' +
        'correct credentials. Returns an image block for images, otherwise base64 + metadata.',
      inputSchema: {
        cardId: z.string().describe('ID of the card the attachment belongs to'),
        attachmentId: z.string().describe('ID of the attachment to download'),
        maxBytes: z
          .number()
          .optional()
          .default(5_000_000)
          .describe('Max inline size; larger files return metadata only (default 5MB)'),
      },
      handler: async (client, a) => {
        const cardId = s(a.cardId);
        const attachmentId = s(a.attachmentId);
        const maxBytes = typeof a.maxBytes === 'number' ? a.maxBytes : 5_000_000;
        // Pre-flight on metadata so an oversized attachment is never buffered into memory: when
        // Trello reports the size up front we refuse before downloading the bytes.
        const meta = await client.getAttachment(cardId, attachmentId);
        const metaName = meta.fileName || meta.name || attachmentId;
        if (typeof meta.bytes === 'number' && meta.bytes > maxBytes) {
          return attachmentTooLarge(
            cardId,
            attachmentId,
            metaName,
            meta.mimeType,
            meta.bytes,
            maxBytes
          );
        }
        const dl: AttachmentDownload = await client.downloadAttachment(cardId, attachmentId);
        // Fallback for attachments whose size Trello did not report in metadata.
        if (dl.bytes > maxBytes) {
          return attachmentTooLarge(
            cardId,
            attachmentId,
            dl.fileName,
            dl.mimeType,
            dl.bytes,
            maxBytes
          );
        }
        const base64 = dl.data.toString('base64');
        if (dl.mimeType.startsWith('image/')) {
          return rawContent([{ type: 'image', data: base64, mimeType: dl.mimeType }]);
        }
        return rawContent([
          {
            type: 'text',
            text: JSON.stringify(
              { fileName: dl.fileName, mimeType: dl.mimeType, bytes: dl.bytes, base64 },
              null,
              2
            ),
          },
        ]);
      },
    },
    {
      name: 'delete_attachment',
      title: 'Delete Attachment',
      description: 'Remove an attachment from a card',
      inputSchema: {
        cardId: z.string().describe('ID of the card the attachment belongs to'),
        attachmentId: z.string().describe('ID of the attachment to delete'),
      },
      handler: (client, a) => client.deleteAttachment(s(a.cardId), s(a.attachmentId)),
    },
    {
      name: 'list_boards',
      title: 'List Boards',
      description: 'List all boards the user has access to',
      inputSchema: {},
      handler: client => client.listBoards(),
    },
    {
      name: 'set_active_board',
      title: 'Set Active Board',
      description: 'Set the active board for future operations',
      inputSchema: { boardId: z.string().describe('ID of the board to set as active') },
      handler: async (client, a) => {
        const board = await client.setActiveBoard(s(a.boardId));
        return `Successfully set active board to "${board.name}" (${board.id})`;
      },
    },
    {
      name: 'list_workspaces',
      title: 'List Workspaces',
      description: 'List all workspaces the user has access to',
      inputSchema: {},
      handler: client => client.listWorkspaces(),
    },
    {
      name: 'set_active_workspace',
      title: 'Set Active Workspace',
      description: 'Set the active workspace for future operations',
      inputSchema: { workspaceId: z.string().describe('ID of the workspace to set as active') },
      handler: async (client, a) => {
        const workspace = await client.setActiveWorkspace(s(a.workspaceId));
        return `Successfully set active workspace to "${workspace.displayName}" (${workspace.id})`;
      },
    },
    {
      name: 'list_boards_in_workspace',
      title: 'List Boards in Workspace',
      description: 'List all boards in a specific workspace',
      inputSchema: { workspaceId: z.string().describe('ID of the workspace to list boards from') },
      handler: (client, a) => client.listBoardsInWorkspace(s(a.workspaceId)),
    },
    {
      name: 'get_active_board_info',
      title: 'Get Active Board Info',
      description: 'Get information about the currently active board',
      inputSchema: {},
      handler: async client => {
        const boardId = client.activeBoardId;
        if (!boardId) {
          throw new McpError(ErrorCode.InvalidParams, 'No active board set');
        }
        const board = await client.getBoardById(boardId);
        return {
          ...board,
          isActive: true,
          activeWorkspaceId: client.activeWorkspaceId || 'Not set',
        };
      },
    },
    {
      name: 'get_card',
      title: 'Get Card',
      description: 'Get detailed information about a specific Trello card',
      inputSchema: {
        cardId: z.string().describe('ID of the card to fetch'),
        includeMarkdown: z
          .boolean()
          .optional()
          .default(false)
          .describe('Return the card rendered as markdown instead of JSON'),
      },
      handler: (client, a) =>
        client.getCard(
          s(a.cardId),
          typeof a.includeMarkdown === 'boolean' ? a.includeMarkdown : false
        ),
    },
    {
      name: 'add_comment',
      title: 'Add Comment',
      description: 'Add a comment to a card',
      inputSchema: {
        cardId: z.string().describe('ID of the card to comment on'),
        text: z.string().describe('Text content of the comment'),
      },
      handler: (client, a) => client.addComment(s(a.cardId), s(a.text)),
    },
    {
      name: 'get_board_labels',
      title: 'Get Board Labels',
      description: 'List all labels defined on a board',
      inputSchema: { boardId: boardIdField },
      handler: (client, a) => client.getBoardLabels(optS(a.boardId)),
    },
    {
      name: 'get_board_members',
      title: 'Get Board Members',
      description: 'List all members of a board',
      inputSchema: { boardId: boardIdField },
      handler: (client, a) => client.getBoardMembers(optS(a.boardId)),
    },
    {
      name: 'assign_member',
      title: 'Assign Member',
      description: 'Assign a member to a card',
      inputSchema: {
        cardId: z.string().describe('ID of the card'),
        memberId: z.string().describe('ID of the member to assign'),
      },
      handler: (client, a) => client.assignMember(s(a.cardId), s(a.memberId)),
    },
    {
      name: 'unassign_member',
      title: 'Unassign Member',
      description: 'Remove a member from a card',
      inputSchema: {
        cardId: z.string().describe('ID of the card'),
        memberId: z.string().describe('ID of the member to remove'),
      },
      handler: (client, a) => client.unassignMember(s(a.cardId), s(a.memberId)),
    },
    {
      name: 'get_checklist_items',
      title: 'Get Checklist Items',
      description: 'Get all items from a checklist by name',
      inputSchema: {
        name: z.string().describe('Name of the checklist to retrieve items from'),
        boardId: boardIdField,
      },
      handler: (client, a) => client.getChecklistItems(s(a.name), optS(a.boardId)),
    },
    {
      name: 'add_checklist_item',
      title: 'Add Checklist Item',
      description: 'Add a new item to a checklist',
      inputSchema: {
        text: z.string().describe('Text content of the checklist item'),
        checkListName: z.string().describe('Name of the checklist to add the item to'),
        boardId: boardIdField,
      },
      handler: (client, a) =>
        client.addChecklistItem(s(a.text), s(a.checkListName), optS(a.boardId)),
    },
    {
      name: 'find_checklist_items_by_description',
      title: 'Find Checklist Items by Description',
      description: 'Search for checklist items containing specific text in their description',
      inputSchema: {
        description: z.string().describe('Text to search for in checklist item descriptions'),
        boardId: boardIdField,
      },
      handler: (client, a) =>
        client.findChecklistItemsByDescription(s(a.description), optS(a.boardId)),
    },
    {
      name: 'get_acceptance_criteria',
      title: 'Get Acceptance Criteria',
      description: 'Get all items from the "Acceptance Criteria" checklist',
      inputSchema: { boardId: boardIdField },
      handler: (client, a) => client.getAcceptanceCriteria(optS(a.boardId)),
    },
    {
      name: 'get_checklist_by_name',
      title: 'Get Checklist by Name',
      description: 'Get a complete checklist with all its items and completion percentage',
      inputSchema: {
        name: z.string().describe('Name of the checklist to retrieve'),
        boardId: boardIdField,
      },
      handler: async (client, a) => {
        const checklist = await client.getChecklistByName(s(a.name), optS(a.boardId));
        if (!checklist) {
          throw new McpError(ErrorCode.InvalidParams, `Checklist "${s(a.name)}" not found`);
        }
        return checklist;
      },
    },
  ];
}

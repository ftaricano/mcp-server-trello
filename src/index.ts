#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TrelloClient } from './trello-client.js';
import { VERSION } from './version.js';
import {
  getToolDefinitions,
  extractRawContent,
  type ToolContentBlock,
  type ToolDefinition,
} from './mcp-tools.js';

/**
 * Non-generic view of McpServer.registerTool. The SDK's generic signature derives the handler's
 * argument type from the Zod schema, which makes tsc give up with TS2589 ("excessively deep"). We
 * validate inputs against the same Zod shape at runtime, so erasing the compile-time generic here
 * is safe and keeps the registration loop free of per-call @ts-expect-error escapes.
 */
type RegisterToolFn = (
  name: string,
  config: { title: string; description: string; inputSchema: ToolDefinition['inputSchema'] },
  handler: (
    args: Record<string, unknown>
  ) => Promise<{ content: ToolContentBlock[]; isError?: boolean }>
) => void;

class TrelloServer {
  private server: McpServer;
  private trelloClient: TrelloClient;

  constructor() {
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    const defaultBoardId = process.env.TRELLO_BOARD_ID;

    if (!apiKey || !token) {
      throw new Error('TRELLO_API_KEY and TRELLO_TOKEN environment variables are required');
    }

    this.trelloClient = new TrelloClient({
      apiKey,
      token,
      defaultBoardId,
      boardId: defaultBoardId,
    });

    this.server = new McpServer({
      name: 'trello-server',
      version: VERSION,
    });

    this.setupTools();

    // Error handling
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupTools() {
    // Every tool is declared once in src/mcp-tools.ts and registered here. The CLI consumes the
    // same operation set; tests/parity.test.ts fails if the two surfaces ever diverge.
    const registerTool = this.server.registerTool.bind(this.server) as unknown as RegisterToolFn;
    for (const def of getToolDefinitions()) {
      registerTool(
        def.name,
        {
          title: def.title,
          description: def.description,
          inputSchema: def.inputSchema,
        },
        async (args: Record<string, unknown>) => {
          try {
            const data = await def.handler(this.trelloClient, args ?? {});
            const raw = extractRawContent(data);
            const content: ToolContentBlock[] = raw ?? [
              {
                type: 'text',
                text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
              },
            ];
            return { content };
          } catch (error) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
                },
              ],
              isError: true,
            };
          }
        }
      );
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    // Load configuration before starting the server
    await this.trelloClient.loadConfig().catch(() => {
      // Continue with default config if loading fails
    });
    await this.server.connect(transport);
  }
}

const server = new TrelloServer();
server.run().catch(() => {
  // Silently handle errors to avoid interfering with MCP protocol
});

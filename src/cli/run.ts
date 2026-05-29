import type { TrelloClient } from '../trello-client.js';
import { formatJson } from './output.js';

export interface CommandResult {
  stdout: string;
  exitCode: number;
}

/**
 * Runs a command handler and ALWAYS produces parseable JSON on stdout — even on
 * failure. A failure emits `{ "ok": false, "error": <message> }` plus a non-zero
 * exit code, so callers never infer "failure" from an empty stdout and retry,
 * which silently duplicated cards (JAR-256).
 */
export async function executeCommand<T extends unknown[]>(
  client: TrelloClient,
  fn: (client: TrelloClient, ...args: T) => Promise<string>,
  ...args: T
): Promise<CommandResult> {
  try {
    await client.loadConfig();
    const stdout = await fn(client, ...args);
    return { stdout, exitCode: 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { stdout: formatJson({ ok: false, error: message }), exitCode: 1 };
  }
}

import { describe, it, expect } from 'vitest';
import type { Command } from 'commander';
import { getToolDefinitions, CLI_PATHS } from '../src/mcp-tools.js';
import { buildProgram } from '../src/cli.js';

/**
 * Parity guard: the MCP server and the CLI must expose the same set of Trello operations.
 *
 * src/mcp-tools.ts is the single source of truth — getToolDefinitions() drives MCP registration,
 * and CLI_PATHS declares the matching CLI command for each tool. These tests fail if either surface
 * gains or loses an operation without the other, which is the durable guarantee against drift.
 */

/** Collect the space-joined path of every leaf (action) command in the CLI tree. */
function collectLeafPaths(cmd: Command, prefix: string[] = []): string[] {
  // commander auto-adds an implicit `help` command to any command that has subcommands.
  const subcommands = cmd.commands.filter(c => c.name() !== 'help');
  if (subcommands.length === 0) {
    return prefix.length ? [prefix.join(' ')] : [];
  }
  return subcommands.flatMap(c => collectLeafPaths(c, [...prefix, c.name()]));
}

describe('CLI ⇄ MCP parity', () => {
  const mcpNames = getToolDefinitions()
    .map(d => d.name)
    .sort();
  const cliLeafPaths = collectLeafPaths(buildProgram()).sort();
  const mappingKeys = Object.keys(CLI_PATHS).sort();
  const mappingValues = Object.values(CLI_PATHS).sort();

  it('CLI_PATHS keys are exactly the MCP tool names (no tool without a mapping, no orphan mapping)', () => {
    expect(mappingKeys).toEqual(mcpNames);
  });

  it('CLI_PATHS values are exactly the CLI leaf commands (no missing CLI command, no unmapped command)', () => {
    expect(mappingValues).toEqual(cliLeafPaths);
  });

  it('no two MCP tools map to the same CLI command', () => {
    expect(new Set(mappingValues).size).toBe(mappingValues.length);
  });

  it('MCP tool names are unique', () => {
    expect(new Set(mcpNames).size).toBe(mcpNames.length);
  });
});

import { execFileSync } from 'child_process';

interface KeychainCreds {
  apiKey?: string;
  token?: string;
  boardId?: string;
}

function readKeychainItem(service: string): string | undefined {
  try {
    const out = execFileSync('security', ['find-generic-password', '-s', service, '-w'], {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    });
    const trimmed = out.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

export function loadKeychainCredentials(
  platform: NodeJS.Platform = process.platform,
  prefix: string | undefined = process.env.TRELLO_KEYCHAIN_PREFIX
): KeychainCreds {
  if (platform !== 'darwin' || !prefix) return {};
  return {
    apiKey: readKeychainItem(`${prefix}_API_KEY`),
    token: readKeychainItem(`${prefix}_TOKEN`),
    boardId: readKeychainItem(`${prefix}_BOARD_ID`),
  };
}

# Security Policy

## Supported Versions

Security fixes are handled on the default branch and in the latest published package version.

## Reporting a Vulnerability

Please report vulnerabilities privately through GitHub Security Advisories:

https://github.com/ftaricano/mcp-server-trello/security/advisories/new

If advisories are not available to you, open a minimal issue that does not include exploit details, credentials, tokens, or private Trello data.

## Credential Handling

This server requires a Trello API key and token. Treat both values as secrets.

Never commit:

- `.env`, `.env.local`, or any file containing real Trello credentials.
- Trello API keys, tokens, OAuth tokens, or cookies.
- Local logs, generated SQLite databases, coverage output, or agent runtime state.
- Machine-specific MCP, Claude, or editor configuration.

If a Trello key or token leaks:

1. Revoke the leaked token in Trello immediately.
2. Generate a new token with the narrowest practical scope and expiration.
3. Replace local environment or Keychain entries.
4. Remove the leaked value from Git history before publishing or sharing the repository.

The CLI can read credentials from the macOS Keychain via `TRELLO_KEYCHAIN_PREFIX`; that avoids storing real secrets in `.env` files.

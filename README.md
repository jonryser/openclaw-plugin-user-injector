# openclaw-plugin-user-injector

Injects user-specific memory context for known Slack users.

## What it does

1. Hooks on Slack `message_received` and `inbound_claim` events.
2. Extracts the sender's Slack ID from event metadata.
3. Checks if the sender is a known user in `USER.md` at the workspace root.
4. If known, reads the user's memory file (`memory/users/<NAME>.md`) and writes its content to `/tmp/openclaw-user-context/<senderId>.json`.
5. Registers a `get_user_context` tool the agent can call to retrieve the injected context.

## Deployment

Copy the `user-injector/` subfolder to `~/.openclaw/extensions/user-injector/`.

## Configuration

No configuration required for the initial version.

## Development

```bash
npm install
npm run lint    # type-check + markdown lint
npm test        # run vitest unit tests
make -C tests test  # run bats integration tests
```

## Testing

Tests live in `tests/`:

- `unit.test.ts` - Vitest unit tests for TypeScript logic
- `bats/` - BATS integration tests for shell(script) behavior

Run all tests: `npm test && make -C tests test`

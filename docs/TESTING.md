# Testing Guide

This document explains how to run, write, and extend tests for `@rayos/wallet-sdk`.

---

## Test Stack

| Tool | Role |
|---|---|
| **Vitest** | Test runner and assertion library |
| **jsdom** | Browser API simulation (for WebAuthn mocking) |
| **`vi.mock()`** | Mocking `@simplewebauthn/browser` and `fetch` |

---

## Running Tests

### All Unit Tests

```bash
pnpm test
```

### Watch Mode (development)

```bash
pnpm exec vitest
```

### With Coverage Report

```bash
pnpm exec vitest run --coverage
```

Coverage reports are generated in `coverage/` (HTML + lcov).

---

## Test Files

| File | What It Tests |
|---|---|
| `tests/passkey.test.ts` | `createCredential()` and `signTransaction()` with mocked WebAuthn |
| `tests/contracts.test.ts` | `WalletClient`, `PolicyClient`, and all `WalletError`/`PolicyError` code mappings |
| `tests/relay.test.ts` | `RelayClient` success paths, retry logic, and zod schema validation |
| `tests/session.test.ts` | `SessionManager` create/retrieve/expiry/revocation |
| `tests/index.test.ts` | `WalletSdk` public API orchestration (integration-style with mocked sub-modules) |

---

## Writing New Tests

### Mocking WebAuthn

```ts
import { vi } from 'vitest';
import * as webauthn from '@simplewebauthn/browser';

vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}));

vi.mocked(webauthn.startRegistration).mockResolvedValueOnce({
  id: 'test-cred',
  rawId: 'raw',
  response: { clientDataJSON: '...', attestationObject: '...' },
  type: 'public-key',
  clientExtensionResults: {},
} as any);
```

### Mocking `fetch` (for RelayClient)

```ts
global.fetch = vi.fn();

vi.mocked(global.fetch).mockResolvedValueOnce({
  ok: true,
  json: async () => ({ hash: 'abc123', status: 'success' }),
} as any);
```

### Test Structure Guidelines

Follow this pattern for new test files:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ModuleName', () => {
  describe('MethodName', () => {
    it('should do X given Y', async () => {
      // Arrange
      // Act
      // Assert
    });

    it('should throw SdkError when Z', async () => {
      await expect(methodCall()).rejects.toThrow('...');
    });
  });
});
```

---

## Testing Strategy

### Unit Tests (fast, always run)
- Mock all external dependencies (`@simplewebauthn/browser`, `fetch`, contract bindings)
- Every public method has at least one happy-path and one error-path test
- Every `WalletError` and `PolicyError` code mapping is explicitly tested

### Integration Tests (nightly CI — not yet implemented)
- Spin up `relay-backend` and `local testnet` via `docker-compose` from the `infra` repo
- Test real WebAuthn flows with a virtual authenticator (Playwright + Chrome DevTools Protocol)
- Verify actual on-chain state after deploy, signer add, and recovery flows

---

## CI

Tests run automatically on every PR via GitHub Actions:

```
.github/workflows/ci.yml
```

The CI pipeline runs: `pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build`

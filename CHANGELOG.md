# Changelog

## 0.1.1

### Patch Changes

- 041d5a2: all check pass

All notable changes to `@rayos/wallet-sdk` will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/) and uses [Changesets](https://github.com/changesets/changesets) for automated release management.

---

## [Unreleased]

### Added
- Initial project scaffolding (Phase 1)
  - TypeScript strict mode setup with `tsup` for ESM + CJS dual output
  - `vitest` test runner with `jsdom` environment
  - ESLint with `typescript-eslint` configuration
  - Changesets for versioning and changelog generation
  - GitHub Actions CI pipeline

- Contract bindings generation (Phase 2)
  - Auto-generated TypeScript bindings for `GuardianWallet`, `WalletFactory`, and `PolicyContract` on Stellar testnet
  - `scripts/regenerate-bindings.sh` for one-command binding refresh

- Core Passkey Module (Phase 3)
  - `createCredential()` — WebAuthn registration wrapper
  - `signTransaction()` — WebAuthn assertion + XDR signing wrapper
  - Full TypeScript type definitions for passkey options and responses

- Contract Client Wrappers (Phase 4)
  - `WalletClient` — `predictAddress`, `deploy`, `addSigner`, `removeSigner`, `getBalance`, `getSigners`
  - `PolicyClient` — `setSpendLimit`, `createSessionKey`, `revokeSessionKey`, `proposeRecovery`, `approveRecovery`
  - Typed error hierarchy: `SdkError`, `WalletError`, `PolicyError` with human-readable messages

- Relay Client (Phase 5)
  - `RelayClient` with `submitTransaction` and `sponsorTransaction`
  - Exponential backoff retry on 5xx errors
  - Zod-validated request/response schemas (placeholder — to be updated when `relay-backend` is built)

- Session Manager (Phase 6)
  - `SessionManager` for session key lifecycle management
  - Pluggable `StorageAdapter` interface for portable storage
  - `InMemoryStorageAdapter` as default
  - Automatic session expiry checking

- Public API Surface (Phase 7)
  - `WalletSdk` class orchestrating all modules
  - `createWallet`, `signAndSubmit`, `createSessionKey`, `proposeRecovery`, `approveRecovery`, `getWalletState`

- Tests (Phase 8)
  - Unit tests: passkey, contracts, relay, session, SDK index
  - 11 tests passing across 5 test files

- Documentation (Phase 9)
  - `README.md` with quick start, project structure, and ecosystem overview
  - `docs/ARCHITECTURE.md` with module map and data flow diagrams
  - `docs/GETTING_STARTED.md` with full setup guide
  - `docs/API_REFERENCE.md` with complete public API docs
  - `docs/TESTING.md` with test writing guidelines
  - `docs/INTEGRATION.md` with cross-repo connection guide
  - `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `LICENSE`
  - GitHub Issue and PR templates

---

*Versions will be appended here automatically by Changesets upon release.*

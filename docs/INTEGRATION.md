# Integration Guide

This document explains how `wallet-sdk` connects to the other repositories in the Guardian Wallet ecosystem and how to set up a full local development environment.

---

## Ecosystem Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Guardian Wallet Ecosystem               │
│                                                             │
│  wallet-contracts  ──(bindings)──►  wallet-sdk              │
│                                         │                   │
│                                    (HTTP relay)             │
│                                         │                   │
│  relay-backend  ◄────────────────────────                   │
│       │                                                     │
│       │ (fee-bump XDR)                                      │
│       ▼                                                     │
│  Stellar Testnet / Mainnet                                  │
│                                                             │
│  wallet-sdk  ──(npm package)──►  web-dashboard              │
│                            ──►  mobile-app                  │
│                            ──►  demo-app                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. wallet-contracts → wallet-sdk (Bindings)

The contract bindings in `src/contracts/generated/` are **auto-generated** from deployed contract WASMs. They are never hand-written.

### When to Regenerate

Regenerate bindings whenever `wallet-contracts` tags a new release with breaking changes to function signatures or error codes.

### How to Regenerate

```bash
# Fill in .env with new contract addresses from wallet-contracts release
WALLET_CONTRACT_ADDRESS="C..."
FACTORY_CONTRACT_ADDRESS="C..."
POLICY_CONTRACT_ADDRESS="C..."
NETWORK="testnet"

# Run the generation script
bash scripts/regenerate-bindings.sh
```

This pulls the latest contract spec from the Stellar RPC and commits the updated bindings.

### Automated Sync (CI)

A scheduled GitHub Actions job (`.github/workflows/sync-bindings.yml`) runs nightly, checks whether `wallet-contracts` has a newer release, and opens an automated PR if bindings are out of date.

---

## 2. wallet-sdk → relay-backend (HTTP API)

The `RelayClient` in `src/relay/client.ts` talks to `relay-backend` over HTTP.

### Current Status

`relay-backend` is not yet built. The relay client currently uses **placeholder Zod schemas**. When `relay-backend` is complete, update `src/relay/types.ts` with the real API schemas from its OpenAPI spec.

### Expected Relay API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `POST /sponsor` | Wraps an unsigned transaction in a fee-bump envelope |
| `POST /submit` | Submits a signed transaction to the Stellar network |

### Connecting to a Local Relay

```ts
const sdk = new WalletSdk({
  relayUrl: 'http://localhost:3000', // local relay-backend
  // ...
});
```

---

## 3. Consumer Apps → wallet-sdk (npm package)

Apps consuming this SDK should:

1. **Pin an exact version** — never use `latest` or a range like `^1.0.0`

   ```json
   {
     "dependencies": {
       "@rayos/wallet-sdk": "1.0.0"
     }
   }
   ```

2. **Upgrade deliberately** — read the [CHANGELOG](../CHANGELOG.md) and test before upgrading

3. **Never import from internal paths** — only import from `@rayos/wallet-sdk`:

   ```ts
   // ✅ Correct
   import { WalletSdk } from '@rayos/wallet-sdk';

   // ❌ Wrong — breaks on any internal refactor
   import { WalletClient } from '@rayos/wallet-sdk/src/contracts/wallet-client';
   ```

---

## 4. Local Full-Stack Setup

To run the entire stack locally (requires `infra` repo):

```bash
# 1. Clone all repos
git clone https://github.com/Rayos-Org/wallet-contracts
git clone https://github.com/Rayos-Org/wallet-sdk
git clone https://github.com/Rayos-Org/relay-backend
git clone https://github.com/Rayos-Org/web-dashboard

# 2. Start local Stellar + relay via infra docker-compose
cd infra
docker-compose up -d

# 3. Deploy contracts to local testnet
cd wallet-contracts
stellar contract deploy ...

# 4. Generate SDK bindings
cd wallet-sdk
cp .env.example .env
# Fill in contract addresses from step 3
bash scripts/regenerate-bindings.sh
pnpm install && pnpm build

# 5. Start web dashboard
cd web-dashboard
pnpm install && pnpm dev
```

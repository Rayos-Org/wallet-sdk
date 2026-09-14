# `@rayos/wallet-sdk`

> The official TypeScript SDK for interacting with **Guardian Wallet** — a passkey-secured, policy-governed smart wallet on the Stellar network.

[![CI](https://github.com/Rayos-Org/wallet-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/Rayos-Org/wallet-sdk/actions/workflows/ci.yml)
[![Release](https://github.com/Rayos-Org/wallet-sdk/actions/workflows/release.yml/badge.svg)](https://github.com/Rayos-Org/wallet-sdk/actions/workflows/release.yml)
[![Sync Bindings](https://github.com/Rayos-Org/wallet-sdk/actions/workflows/sync-bindings.yml/badge.svg)](https://github.com/Rayos-Org/wallet-sdk/actions/workflows/sync-bindings.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@rayos/wallet-sdk.svg)](https://www.npmjs.com/package/@rayos/wallet-sdk)

📦 **[View `@rayos/wallet-sdk` on NPM](https://www.npmjs.com/package/@rayos/wallet-sdk)**

---

## What Is This?

`@rayos/wallet-sdk` is the **single source of truth** for how client applications (web dashboards, mobile apps, demo apps) interact with the Guardian Wallet ecosystem. It wraps:

- **WebAuthn / Passkey** registration and assertion (browser via `@simplewebauthn/browser`, or a custom `PasskeyProvider` for React Native)
- **On-chain reads** over Soroban RPC (wallet existence, signers, native balance, transfer history from events)
- **Passkey-signed transfers**: builds the Soroban `transfer`, has the passkey sign the wallet's authorization entry, and hands the result to the relay
- **Relay backend communication** (wallet deployment, fee-sponsored submission, testnet faucet)

Apps should **never** call contract bindings or WebAuthn APIs directly — everything goes through this SDK.

---

## Repository Ecosystem

This SDK is part of a multi-repo ecosystem. Here is how the repos relate:

```
wallet-contracts  ──generates──►  wallet-sdk  ──used by──►  web-dashboard
                                                        ──►  mobile-app
                                                        ──►  demo-app
                  relay-backend  ◄──── wallet-sdk (HTTP)
```

| Repo | Role |
|---|---|
| [`wallet-contracts`](https://github.com/Rayos-Org/wallet-contracts) | Soroban smart contracts — source of truth for on-chain logic |
| **`wallet-sdk`** (this repo) | TypeScript SDK — wraps contracts + passkeys + relay |
| [`relay-backend`](https://github.com/Rayos-Org/relay-backend) | Fee-sponsorship relay service |
| [`web-dashboard`](https://github.com/Rayos-Org/web-dashboard) | Consumer web app using this SDK |
| [`mobile-app`](https://github.com/Rayos-Org/mobile-app) | Consumer mobile app using this SDK |

---

## Quick Start

### Installation

The package is officially published on npm as [`@rayos/wallet-sdk`](https://www.npmjs.com/package/@rayos/wallet-sdk).

```bash
npm install @rayos/wallet-sdk
# or
pnpm add @rayos/wallet-sdk
```

### Basic Usage

```ts
import { WalletSdk } from '@rayos/wallet-sdk';

const sdk = new WalletSdk({
  networkPassphrase: 'Test SDF Network ; September 2015',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  relayUrl: 'https://relay.your-org.dev/api',
  factoryContractId: 'CCCAMWJOF7IYTVCU7SR6HFTNH5XRMDMWPYN464NY5BCKUPMUM64RZ5CH',
  rpId: 'your-app.com',
});

// 1. Register a passkey (options come from relay POST /webauthn/register/options)
const credential = await sdk.registerPasskey(options);
// credential.publicKeyBytes is the 65-byte P-256 key extracted from the attestation

// 2. Deploy the wallet contract — the relay's sponsor account pays
const salt = crypto.getRandomValues(new Uint8Array(32));
const { address, txHash } = await sdk.deployWallet({ salt, credential });

// 3. Read on-chain state (Soroban RPC, no relay involved)
const state = await sdk.getWalletState(address); // { address, exists, signers, balance }
await sdk.requestFaucet(address);                 // testnet only

// 4. Send XLM: passkey signs the wallet's Soroban auth entry, relay pays the fee
const res = await sdk.transfer({
  walletAddress: address,
  to: 'G...',
  amount: 10_000_000n, // stroops
  credentialId: credential.id,
});
console.log(res.txHash, res.status); // real testnet hash

// 5. History from contract events
const transfers = await sdk.getRecentTransfers(address, 25);
```

`createWallet(options, salt)` does steps 1–2 in one call. On React Native, pass a
`passkeyProvider` (see `mobile-app/native/passkey-adapter.ts`) instead of relying
on the browser default.

---

## Documentation

| Guide | Description |
|---|---|
| [Setup Guide (`SETUP.md`)](./SETUP.md) | Complete environment configuration, local development & bindings setup |
| [Architecture](./docs/ARCHITECTURE.md) | System design, module map, key decisions |
| [Getting Started](./docs/GETTING_STARTED.md) | Full setup guide, prerequisites, env config |
| [API Reference](./docs/API_REFERENCE.md) | Complete public API documentation |
| [Testing Guide](./docs/TESTING.md) | How to run tests, write new tests |
| [Integration Guide](./docs/INTEGRATION.md) | How this SDK connects to other repos |
| [Security Policy](./SECURITY.md) | Reporting vulnerabilities |
| [Contributing](./CONTRIBUTING.md) | How to contribute to this project |
| [Changelog](./CHANGELOG.md) | Release history |

---

## Prerequisites

Before using or developing the SDK, ensure you have:

- **Node.js ≥ 20 LTS** (or `24.x LTS`)
- **pnpm ≥ 9** — `npm install -g pnpm`
- **Stellar CLI** — for regenerating contract bindings
- A browser supporting **WebAuthn / Passkeys**

---

## Development Setup

> 💡 For a detailed walkthrough on setting up contract bindings, environment variables, local package linking, and troubleshooting, see the [**SETUP.md**](./SETUP.md) guide.

```bash
# Clone the repo
git clone https://github.com/Rayos-Org/wallet-sdk.git
cd wallet-sdk

# Install dependencies
pnpm install

# Copy env file and fill in contract addresses
cp .env.example .env

# Regenerate contract bindings (after wallet-contracts releases)
bash scripts/regenerate-bindings.sh

# Run tests
pnpm test

# Build
pnpm build
```

---

## Project Structure

```
wallet-sdk/
├── src/
│   ├── passkey/            # WebAuthn registration/assertion, CBOR + DER + base64url encoding
│   ├── contracts/
│   │   ├── generated/      # Auto-generated Soroban bindings (do not edit)
│   │   ├── wallet-client.ts# RPC reads, auth-entry signing, transfer building
│   │   └── errors.ts
│   ├── relay/              # HTTP client for relay-backend
│   └── index.ts            # Public API surface (WalletSdk)
├── tests/                  # Vitest: unit, testnet integration, testnet e2e (software authenticator)
├── scripts/
│   └── regenerate-bindings.sh
├── docs/                   # Extended documentation
└── .github/                # CI/CD workflows, issue templates
```

---

## Contributing

We welcome contributions of all kinds! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR.

- 🐛 [Report a bug](https://github.com/Rayos-Org/wallet-sdk/issues/new?template=bug_report.yml)
- 💡 [Request a feature](https://github.com/Rayos-Org/wallet-sdk/issues/new?template=feature_request.yml)
- 🔒 [Report a vulnerability](./SECURITY.md)

---

## License

[MIT](./LICENSE) © Rayos Org

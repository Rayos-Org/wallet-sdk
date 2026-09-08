# `@rayos/wallet-sdk`

> The official TypeScript SDK for interacting with **Guardian Wallet** — a passkey-secured, policy-governed smart wallet on the Stellar network.

[![CI](https://github.com/Rayos-Org/wallet-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/Rayos-Org/wallet-sdk/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@rayos/wallet-sdk.svg)](https://www.npmjs.com/package/@rayos/wallet-sdk)

---

## What Is This?

`@rayos/wallet-sdk` is the **single source of truth** for how client applications (web dashboards, mobile apps, demo apps) interact with the Guardian Wallet ecosystem. It wraps:

- **WebAuthn / Passkey** registration and signing via `@simplewebauthn/browser`
- **On-chain contract calls** (wallet deployment, signer management, recovery)
- **Policy management** (spend limits, session keys)
- **Relay backend communication** (fee-sponsored transaction submission)

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
  relayUrl: 'https://relay.your-org.dev',
});

// 1. Create a wallet (register passkey + deploy contract)
const { address, credential } = await sdk.createWallet({
  challenge: await fetchChallengeFromServer(),
  rp: { id: 'your-app.com', name: 'Your App' },
  user: { id: userId, name: userEmail, displayName: userName },
}, crypto.getRandomValues(new Uint8Array(32)));

// 2. Sign and submit a transaction
const result = await sdk.signAndSubmit(unsignedXdr, {
  challenge: txHash,
  credentialId: credential.id,
});

// 3. Get wallet state
const state = await sdk.getWalletState(address, { contractId: USDC_CONTRACT_ID });
console.log(`Balance: ${state.balance}`);
```

---

## Documentation

| Guide | Description |
|---|---|
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

- **Node.js ≥ 20 LTS**
- **pnpm ≥ 9** — `npm install -g pnpm`
- **Stellar CLI** — for regenerating contract bindings
- A browser supporting **WebAuthn / Passkeys**

---

## Development Setup

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
│   ├── passkey/            # WebAuthn registration & signing wrappers
│   ├── contracts/
│   │   ├── generated/      # Auto-generated Soroban bindings (do not edit)
│   │   ├── wallet-client.ts
│   │   ├── policy-client.ts
│   │   └── errors.ts
│   ├── relay/              # HTTP client for relay-backend
│   ├── session/            # Session key lifecycle + StorageAdapter
│   └── index.ts            # Public API surface
├── tests/                  # Vitest unit tests
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

# Environment & Developer Setup Guide (`SETUP.md`)

This guide provides step-by-step instructions to set up your local development environment for `@rayos/wallet-sdk`. Whether you are contributing to the SDK codebase or integrating it with other components of the Guardian Wallet ecosystem, follow the steps below.

---

## 1. System Prerequisites

Before starting, ensure your system has the required tooling installed:

| Tool | Recommended Version | Purpose | Installation |
|---|---|---|---|
| **Node.js** | `≥ 20.x` or `24.x LTS` | Runtime environment | [nodejs.org](https://nodejs.org/) |
| **pnpm** | `≥ 9.x` / `11.x` | Fast & strict package manager | `npm install -g pnpm` |
| **Git** | `≥ 2.40+` | Version control | [git-scm.com](https://git-scm.com/) |
| **Stellar CLI** | `≥ 25.x` | Generating Soroban contract bindings | See below |
| **WebAuthn Support** | Chrome, Edge, Safari, Firefox | Testing passkey ceremonies | Modern OS / Browser |

### Installing Stellar CLI

The Stellar CLI is required if you need to regenerate TypeScript contract bindings from on-chain smart contracts.

- **macOS / Linux:**
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.stellar.org | bash
  ```

- **Windows (PowerShell / winget):**
  ```powershell
  winget install --id Stellar.Stellar
  ```

- **Verify installation:**
  ```bash
  stellar --version
  ```

---

## 2. Cloning & Installing Dependencies

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Rayos-Org/wallet-sdk.git
   cd wallet-sdk
   ```

2. **Install project dependencies with pnpm:**
   ```bash
   pnpm install
   ```

---

## 3. Environment Configuration (`.env`)

The SDK uses environment variables to communicate with deployed Soroban contracts when regenerating TypeScript bindings.

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your contract addresses:**
   ```env
   WALLET_CONTRACT_ADDRESS="CA..."
   FACTORY_CONTRACT_ADDRESS="CB..."
   POLICY_CONTRACT_ADDRESS="CC..."
   NETWORK="testnet"
   ```

### Variable Details

| Variable | Description | Example / Default |
|---|---|---|
| `WALLET_CONTRACT_ADDRESS` | Address of the deployed `GuardianWallet` contract | `C...` |
| `FACTORY_CONTRACT_ADDRESS` | Address of the deployed `WalletFactory` contract | `C...` |
| `POLICY_CONTRACT_ADDRESS` | Address of the deployed `PolicyContract` contract | `C...` |
| `NETWORK` | Target Stellar network | `testnet` (or `mainnet` / `standalone`) |

---

## 4. Soroban Contract Bindings

Contract bindings in `src/contracts/generated/` allow TypeScript code to interact with Soroban contracts in a strictly typed manner.

### Regenerating Bindings

Whenever the smart contracts in [`wallet-contracts`](https://github.com/Rayos-Org/wallet-contracts) are updated or redeployed:

```bash
# On Linux / macOS / Git Bash
bash scripts/regenerate-bindings.sh
```

Or run the underlying Stellar CLI commands directly:
```bash
stellar contract bindings typescript --network testnet --contract-id $WALLET_CONTRACT_ADDRESS --output-dir src/contracts/generated/wallet --overwrite
stellar contract bindings typescript --network testnet --contract-id $FACTORY_CONTRACT_ADDRESS --output-dir src/contracts/generated/factory --overwrite
stellar contract bindings typescript --network testnet --contract-id $POLICY_CONTRACT_ADDRESS --output-dir src/contracts/generated/policy --overwrite
```

> **Note:** The auto-generated files under `src/contracts/generated/` are committed to source control and should **not** be modified by hand.

---

## 5. Development Scripts & Workflow

The repository includes several npm/pnpm scripts to streamline development:

| Command | Description |
|---|---|
| `pnpm build` | Bundles TypeScript into ESM (`dist/index.js`), CJS (`dist/index.cjs`), and declaration files (`dist/index.d.ts`) using `tsup`. |
| `pnpm test` | Runs the test suite using `vitest` in jsdom environment. |
| `pnpm exec vitest` | Runs tests in interactive watch mode for TDD. |
| `pnpm typecheck` | Validates TypeScript types across source files and tests (`tsc --noEmit`). |
| `pnpm lint` | Lints the codebase with ESLint and `typescript-eslint`. |
| `pnpm changeset` | Generates a changeset entry when preparing a feature or fix for release. |

### Running the Full Verification Suite

Before pushing or creating a pull request, run the complete suite:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

---

## 6. Ecosystem Integration

`wallet-sdk` sits between smart contracts, the fee-sponsoring relay, and frontend applications:

```
┌───────────────────────────────────────────────────────────┐
│                 Rayos Guardian Ecosystem                  │
│                                                           │
│  [wallet-contracts]  ───(bindings)───►  [wallet-sdk]      │
│                                              │            │
│  [relay-backend]    ◄──(HTTP sponsor)────────┤            │
│                                              │            │
│  [web-dashboard]    ◄──(import @rayos/sdk)───┤            │
│  [mobile-app]       ◄──(import @rayos/sdk)───┘            │
└───────────────────────────────────────────────────────────┘
```

### Linking Locally for Consumer App Development

If you are developing a frontend application (e.g. `web-dashboard` or `mobile-app`) locally alongside `wallet-sdk`:

1. **In `wallet-sdk` directory:**
   ```bash
   pnpm build
   pnpm link --global
   ```

2. **In your application directory:**
   ```bash
   pnpm link --global @rayos/wallet-sdk
   ```

---

## 7. Troubleshooting & Common Issues

### 1. `EOTP` or 2FA Error During NPM Publishing
- Ensure your GitHub Secret `NPM_TOKEN` is generated as an **Automation Token** on [npmjs.com](https://www.npmjs.com/) (not a standard or publish token).

### 2. Line Ending Issues with Shell Scripts on Windows
- If running `scripts/regenerate-bindings.sh` fails on Linux/CI, verify line endings are `LF` (`\n`) rather than Windows `CRLF` (`\r\n`).

### 3. WebAuthn / Passkey Not Supported in Node Test Environment
- Unit tests use `jsdom` and mock `@simplewebauthn/browser`. Passkey interactions requiring real hardware authenticators should be tested in browser environments with an active origin/relying party configuration.

---

## 8. Related Documentation

- 📖 [README.md](./README.md) — Main repository overview & quick start
- 📐 [Architecture Guide](./docs/ARCHITECTURE.md) — Architectural design, module map, and data flows
- 📚 [API Reference](./docs/API_REFERENCE.md) — Full public SDK API documentation
- 🧪 [Testing Guide](./docs/TESTING.md) — Detailed test suite architecture and writing new tests
- 🔗 [Integration Guide](./docs/INTEGRATION.md) — End-to-end multi-repo integration guide
- 🤝 [Contributing Guide](./CONTRIBUTING.md) — Pull request guidelines and code of conduct

# Getting Started

This guide walks you through everything you need to set up and use `@rayos/wallet-sdk` — whether you are a consumer app developer or an SDK contributor.

---

## Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| **Node.js** | ≥ 20 LTS | Runtime |
| **pnpm** | ≥ 9 | Package manager |
| **Stellar CLI** | ≥ 25.x | Regenerating contract bindings |
| **Git** | Any | Version control |
| **Browser with WebAuthn** | Modern Chrome / Firefox / Safari | Passkey support |

### Install Stellar CLI

```bash
# macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.stellar.org | bash

# Windows (PowerShell)
winget install --id Stellar.Stellar
```

---

## Using the SDK in Your App

### 1. Install

```bash
npm install @rayos/wallet-sdk
# or
pnpm add @rayos/wallet-sdk
```

### 2. Configure

```ts
import { WalletSdk } from '@rayos/wallet-sdk';

const sdk = new WalletSdk({
  // Stellar network passphrase
  networkPassphrase: 'Test SDF Network ; September 2015',
  // Soroban RPC endpoint
  rpcUrl: 'https://soroban-testnet.stellar.org',
  // Your relay-backend URL
  relayUrl: 'https://relay.your-org.dev',
  // Optional: provide a custom storage adapter for session keys
  // storage: new SecureEnclaveStorageAdapter(),
});
```

### 3. Create a Wallet

```ts
const { address, credential } = await sdk.createWallet({
  challenge: await fetchChallengeFromYourServer(),
  rp: { id: window.location.hostname, name: 'My App' },
  user: {
    id: 'user-uuid',
    name: 'user@example.com',
    displayName: 'Alice',
  },
}, crypto.getRandomValues(new Uint8Array(32)));

console.log('Wallet deployed at:', address);
```

> **Important:** The `challenge` must be generated server-side to prevent replay attacks. Never generate it client-side.

### 4. Sign and Submit a Transaction

```ts
const result = await sdk.signAndSubmit(unsignedXdr, {
  challenge: transactionHash,  // hash of the transaction
  credentialId: credential.id,
  rpId: window.location.hostname,
});

console.log('Transaction hash:', result.hash);
```

### 5. Create a Session Key

```ts
const sessionKey = await sdk.createSessionKey(walletAddress, {
  publicKey: ephemeralKeyPair.publicKey,
  expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
});
```

### 6. Guardian Recovery

```ts
// Guardian proposes a new signer
const proposal = await sdk.proposeRecovery(walletAddress, newSigner);

// Another guardian approves
await sdk.approveRecovery(walletAddress, proposal.id);
```

---

## Setting Up for SDK Development

> 💡 For a comprehensive guide covering Stellar CLI configuration, Soroban contract bindings, local package linking, and troubleshooting, refer to [**SETUP.md**](../SETUP.md).

### 1. Clone

```bash
git clone https://github.com/Rayos-Org/wallet-sdk.git
cd wallet-sdk
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your deployed contract addresses:

```env
WALLET_CONTRACT_ADDRESS="C..."
FACTORY_CONTRACT_ADDRESS="C..."
POLICY_CONTRACT_ADDRESS="C..."
NETWORK="testnet"
```

### 4. Regenerate Contract Bindings

After setting your contract addresses in `.env`, generate the TypeScript bindings:

```bash
bash scripts/regenerate-bindings.sh
```

> **Note:** This requires the Stellar CLI and your contracts to be deployed on the configured network.

### 5. Run Tests

```bash
pnpm test
```

### 6. Build

```bash
pnpm build
```

This produces `dist/index.js` (ESM), `dist/index.cjs` (CJS), and `dist/index.d.ts` (types).

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `WALLET_CONTRACT_ADDRESS` | ✅ | Deployed `GuardianWallet` contract ID |
| `FACTORY_CONTRACT_ADDRESS` | ✅ | Deployed `WalletFactory` contract ID |
| `POLICY_CONTRACT_ADDRESS` | ✅ | Deployed `PolicyContract` contract ID |
| `NETWORK` | ✅ | Stellar network: `testnet` or `mainnet` |

# API Reference

Complete documentation for the `@rayos/wallet-sdk` public API.

---

## `WalletSdk` class

The main entry point. Instantiate once and reuse across your app.

### Constructor

```ts
new WalletSdk(config: WalletSdkConfig)
```

**`WalletSdkConfig`**

| Property | Type | Required | Description |
|---|---|---|---|
| `networkPassphrase` | `string` | ✅ | Stellar network passphrase |
| `rpcUrl` | `string` | ✅ | Soroban RPC endpoint URL |
| `relayUrl` | `string` | ✅ | Relay backend base URL |
| `storage` | `StorageAdapter` | ❌ | Custom session key storage (default: in-memory) |

---

### Methods

#### `createWallet(options, saltBytes)`

Full onboarding flow: registers a passkey and deploys the GuardianWallet contract.

```ts
sdk.createWallet(
  options: PasskeyRegistrationOptions,
  saltBytes: Uint8Array
): Promise<{ address: string; credential: PasskeyCredential }>
```

**`PasskeyRegistrationOptions`**

| Property | Type | Required | Description |
|---|---|---|---|
| `challenge` | `string` | ✅ | Server-generated challenge (base64url) |
| `rp` | `{ id: string; name: string }` | ✅ | Relying party info |
| `user` | `{ id: string; name: string; displayName: string }` | ✅ | User info |
| `timeout` | `number` | ❌ | WebAuthn timeout in ms (default: 60000) |
| `authenticatorSelection` | `object` | ❌ | Authenticator constraints |
| `attestation` | `string` | ❌ | Attestation type (default: `"none"`) |

---

#### `signAndSubmit(xdr, options)`

Signs a Stellar transaction with a passkey and submits it through the relay.

```ts
sdk.signAndSubmit(
  xdr: string,
  options: PasskeySignOptions
): Promise<SubmitTransactionResponse>
```

**`PasskeySignOptions`**

| Property | Type | Required | Description |
|---|---|---|---|
| `challenge` | `string` | ✅ | Challenge — should be the transaction hash |
| `credentialId` | `string` | ✅ | Passkey credential ID to authenticate with |
| `timeout` | `number` | ❌ | WebAuthn timeout in ms |
| `userVerification` | `string` | ❌ | `"required"` / `"preferred"` / `"discouraged"` |
| `rpId` | `string` | ❌ | Relying party ID (defaults to current origin) |

**`SubmitTransactionResponse`**

| Property | Type | Description |
|---|---|---|
| `hash` | `string` | Submitted transaction hash |
| `status` | `"pending" \| "success" \| "failed"` | Transaction status |

---

#### `createSessionKey(walletAddress, options)`

Creates and caches a session key for repeated low-risk actions.

```ts
sdk.createSessionKey(
  walletAddress: string,
  opts: SessionKeyOptions
): Promise<SessionKey>
```

**`SessionKeyOptions`**

| Property | Type | Required | Description |
|---|---|---|---|
| `publicKey` | `Uint8Array` | ✅ | Ephemeral public key for the session |
| `expiresAt` | `number` | ✅ | Unix timestamp (ms) when session expires |
| `allowedMethods` | `string[]` | ❌ | Whitelist of allowed contract methods |
| `spendLimit` | `SpendLimit` | ❌ | Max spend per session |

**`SessionKey`**

| Property | Type | Description |
|---|---|---|
| `id` | `string` | Unique session key identifier |
| `publicKey` | `Uint8Array` | The session public key |
| `expiresAt` | `number` | Expiry timestamp |
| `isActive` | `boolean` | Whether the session is still valid |

---

#### `proposeRecovery(walletAddress, newSigner)`

Proposes a guardian recovery — initiates the process of replacing a lost signer.

```ts
sdk.proposeRecovery(
  walletAddress: string,
  newSigner: Signer
): Promise<RecoveryProposal>
```

**`Signer`**

| Property | Type | Description |
|---|---|---|
| `publicKeyBytes` | `Uint8Array` | Raw public key bytes |
| `weight` | `number` | Signing weight |

**`RecoveryProposal`**

| Property | Type | Description |
|---|---|---|
| `id` | `string` | Proposal ID |
| `newSigner` | `Signer` | The proposed replacement signer |
| `proposedAt` | `number` | Timestamp of proposal |
| `status` | `"pending" \| "approved" \| "executed"` | Proposal state |

---

#### `approveRecovery(walletAddress, proposalId)`

Approves an existing recovery proposal (must be called by a current guardian).

```ts
sdk.approveRecovery(
  walletAddress: string,
  proposalId: string
): Promise<void>
```

---

#### `getWalletState(walletAddress, asset)`

Read-only aggregate: fetches balances, signers, and policies.

```ts
sdk.getWalletState(
  walletAddress: string,
  asset: Asset
): Promise<WalletState>
```

**`Asset`**

| Property | Type | Description |
|---|---|---|
| `contractId` | `string` | Token contract address (e.g., USDC on testnet) |

**`WalletState`**

| Property | Type | Description |
|---|---|---|
| `address` | `string` | The wallet contract address |
| `signers` | `Signer[]` | Current registered signers |
| `balance` | `bigint` | Token balance in stroops |

---

## Error Types

All SDK errors extend `SdkError` and have a typed `code` property:

```ts
import { WalletError, PolicyError } from '@rayos/wallet-sdk';

try {
  await sdk.signAndSubmit(xdr, options);
} catch (err) {
  if (err instanceof WalletError) {
    console.error(err.code); // "UNAUTHORIZED" | "INVALID_SIGNATURE" | "UNKNOWN"
  }
  if (err instanceof PolicyError) {
    console.error(err.code); // "SPEND_LIMIT_EXCEEDED" | "INVALID_SESSION" | "UNKNOWN"
  }
}
```

---

## `StorageAdapter` Interface

Implement this to plug in custom session key storage (e.g., Secure Enclave on mobile):

```ts
interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
```

**Example: `localStorage` adapter**

```ts
class LocalStorageAdapter implements StorageAdapter {
  async getItem(key: string) { return localStorage.getItem(key); }
  async setItem(key: string, value: string) { localStorage.setItem(key, value); }
  async removeItem(key: string) { localStorage.removeItem(key); }
}

const sdk = new WalletSdk({ ..., storage: new LocalStorageAdapter() });
```

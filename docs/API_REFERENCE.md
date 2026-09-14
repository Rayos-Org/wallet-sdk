# API Reference — `@rayos/wallet-sdk` 0.2.0

Every method performs real network I/O against Soroban RPC and/or the relay backend. There are no mocked code paths.

---

## `WalletSdk` class

```ts
import { WalletSdk } from '@rayos/wallet-sdk';
```

### Constructor

```ts
new WalletSdk(config: WalletSdkConfig)
```

| Field | Type | Required | Description |
|---|---|---|---|
| `networkPassphrase` | `string` | ✅ | e.g. `Test SDF Network ; September 2015` |
| `rpcUrl` | `string` | ✅ | Soroban RPC endpoint |
| `relayUrl` | `string` | ✅ | relay-backend base URL **including `/api`** (or a same-origin proxy such as `/api`) |
| `factoryContractId` | `string` | ✅ | `WalletFactory` contract (testnet: `CCCAMWJOF7IYTVCU7SR6HFTNH5XRMDMWPYN464NY5BCKUPMUM64RZ5CH`) |
| `nativeTokenContractId` | `string` | ❌ | Native XLM SAC; defaults to `TESTNET_NATIVE_SAC` |
| `rpId` | `string` | ❌ | WebAuthn relying-party id (must be the page's registrable domain on web) |
| `passkeyProvider` | `PasskeyProvider` | ❌ | Platform passkey implementation; defaults to the browser (`@simplewebauthn/browser`) |

### Onboarding

#### `registerPasskey(options): Promise<PasskeyCredential>`
Runs the WebAuthn registration ceremony with the options returned by the relay (`POST /webauthn/register/options`). The result carries `publicKeyBytes` — the 65-byte uncompressed P-256 key parsed from the attestation object (CBOR/COSE). Throws `WalletError('UNSUPPORTED_KEY')` if the authenticator did not produce an ES256 key.

#### `deployWallet(credential, saltBytes): Promise<{ address, txHash }>`
Asks the relay to call `WalletFactory.deploy_wallet(salt, credential_id, public_key)`. The relay's sponsor account pays. `saltBytes` must be 32 bytes.

#### `createWallet(options, saltBytes): Promise<CreateWalletResult>`
`registerPasskey` + `deployWallet` in one call. Returns `{ address, credential, txHash }`.

#### `predictAddress(saltBytes): Promise<string>`
Simulates `WalletFactory.predict_address(salt)` so the wallet address is known before deployment.

### Reads (Soroban RPC only)

#### `getWalletState(walletAddress, asset?): Promise<WalletState>`
```ts
interface WalletState {
  address: string;
  signers: Signer[];   // from get_signers
  balance: bigint;     // stroops, from the token contract's balance()
  exists: boolean;     // false until the contract instance is on the ledger
}
```

#### `getBalance(address, asset?): Promise<bigint>` — stroops.
#### `getSigners(walletAddress): Promise<Signer[]>`
#### `getRecentTransfers(address, limit = 25): Promise<Transfer[]>`
Reads `transfer` events of the native token contract that involve the address, paging through Soroban RPC `getEvents` from the retention window to the chain head.

```ts
interface Transfer {
  at: string;        // ledger close time, ISO
  ledger: number;
  txHash: string;
  from: string;
  to: string;
  amount: bigint;    // stroops
  direction: 'in' | 'out';
}
```

### Sending

#### `transfer(params): Promise<SubmitTransactionResponse>`
```ts
interface TransferParams {
  walletAddress: string;
  to: string;           // G... or C...
  amount: bigint;       // stroops
  credentialId: string; // base64url id of the signing passkey
  asset?: { contractId: string };
}
```
1. Builds `token.transfer(wallet, to, amount)` with the relay sponsor as the transaction source and simulates it.
2. For each `sorobanCredentialsAddress` auth entry belonging to the wallet, computes the Soroban auth-entry hash (V1 `envelopeTypeSorobanAuthorization` or V2 `HashIdPreimageSorobanAuthorizationWithAddress`) and uses it as the WebAuthn challenge.
3. The passkey signs (platform authenticator prompt). The DER signature is converted to raw `r ‖ s` with low-S normalisation and placed, together with `authenticator_data`, `client_data_json` and `credential_id`, in the auth entry's signature map.
4. Submits the XDR to the relay (`POST /relay/submit`), which re-simulates, signs the envelope and pays the fee.

Resolves with `{ txHash, status }` for the real on-chain transaction.

### Relay helpers

- `requestFaucet(walletAddress): Promise<{ txHash, amount }>` — testnet only.
- `getTransactionStatus(txHash): Promise<{ txHash, status }>` — `pending | success | failed | not_found`.
- `relayInfo(): Promise<RelayInfo>` — `{ publicKey, networkPassphrase, factoryContractId, nativeTokenContractId, faucetAmount? }`.
- `getAssertion(options): Promise<PasskeyAssertion>` — raw WebAuthn assertion for login ceremonies against the relay (`/webauthn/assert/*`).
- `static credentialIdBytes(credentialId): Uint8Array`.

#### `signAndSubmit(xdr, options)` — **deprecated**
Submits an already-signed transaction XDR. Use `transfer()`.

---

## `PasskeyProvider`

```ts
interface PasskeyProvider {
  createCredential(options: PasskeyRegistrationOptions): Promise<PasskeyCredential>;
  getAssertion(options: PasskeyAssertionOptions): Promise<PasskeyAssertion>;
}
```
The browser implementation is the default. React Native apps supply their own (see `mobile-app/native/passkey-adapter.ts`, built on `react-native-passkeys`). Both return standard WebAuthn JSON shapes; the SDK does all Stellar-specific work.

`PasskeyAssertionOptions.challenge` is base64url. For on-chain authorisation it is the Soroban auth-entry hash — the wallet contract verifies that `clientDataJSON` carries exactly this value.

---

## Encoding utilities (`export * from './passkey/encoding'`)

`base64urlEncode/Decode`, `hexEncode/Decode`, `utf8Encode/Decode`, `decodeCbor`, `publicKeyFromAttestationObject`, `derSignatureToRaw`, `normaliseLowS`.

---

## Errors

`WalletError extends SdkError` with `code`: `INVALID_SALT`, `UNSUPPORTED_KEY`, `INVALID_XDR`, `INVALID_ADDRESS`, `INVALID_AMOUNT`, `SIMULATION_FAILED`, `UNEXPECTED_RESULT`, `AUTH_REJECTED` (the wallet contract rejected the passkey signature during re-simulation). Relay HTTP failures throw a plain `Error` prefixed `Relay error (<status>)` carrying the relay's message.

---

## Lower-level clients

- `sdk.wallet: WalletClient` — `predictAddress`, `walletExists`, `getSigners`, `getBalance`, `getRecentTransfers`, `buildSignedTransfer`, `static isTransaction`.
- `sdk.relay: RelayClient` — `info`, `deployWallet`, `submitTransaction`, `faucet`, `status`.

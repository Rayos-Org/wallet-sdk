# Architecture


---

## 1. Purpose & Scope

`@rayos/wallet-sdk` is the TypeScript SDK that every client application uses to:

- Register and manage passkeys (WebAuthn)
- Build and sign transactions against Guardian Wallet contracts
- Manage session keys for repeated low-risk actions
- Submit fee-sponsored transactions through the relay backend

**Design principle:** Apps should never call contract bindings or WebAuthn APIs directly. This SDK is the single abstraction layer.

---

## 2. Module Map

```
src/
├── passkey/
│   ├── types.ts          PasskeyCredential, PasskeyAssertion, options
│   ├── register.ts       createCredential() — WebAuthn registration
│   └── sign.ts           signTransaction()  — WebAuthn assertion + XDR
│
├── contracts/
│   ├── generated/        AUTO-GENERATED — never hand-edit
│   │   ├── wallet/       GuardianWallet bindings
│   │   ├── factory/      WalletFactory bindings
│   │   └── policy/       PolicyContract bindings
│   ├── wallet-client.ts  predictAddress, deploy, addSigner, getBalance…
│   ├── policy-client.ts  setSpendLimit, createSessionKey, recovery…
│   └── errors.ts         WalletError, PolicyError typed classes
│
├── relay/
│   ├── types.ts          Zod schemas for relay API
│   └── client.ts         RelayClient — submit, sponsor transactions
│
├── session/
│   ├── types.ts          StorageAdapter interface + InMemoryStorageAdapter
│   └── session-manager.ts SessionManager — create, cache, expire, revoke
│
└── index.ts              WalletSdk class — public API surface
```

---

## 3. Data Flow Diagrams

### Wallet Creation Flow

```
App                  WalletSdk           Passkey Module       Relay
 │                      │                     │                │
 │──createWallet()──────►│                     │                │
 │                      │──createCredential()─►│                │
 │                      │                     │──WebAuthn──────►Browser
 │                      │                     │◄───assertion────Browser
 │                      │◄─PasskeyCredential──│                │
 │                      │──sponsorTx()────────────────────────►│
 │                      │◄─fee-bump XDR───────────────────────│
 │                      │──submitTx()─────────────────────────►│
 │                      │◄─{hash, status}─────────────────────│
 │◄─{address, cred}─────│                     │                │
```

### Sign & Submit Flow

```
App                  WalletSdk           Passkey Module       Relay
 │                      │                     │                │
 │──signAndSubmit()─────►│                     │                │
 │                      │──signTransaction()──►│                │
 │                      │                     │──WebAuthn──────►Browser
 │                      │                     │◄───signature────Browser
 │                      │◄─signedXdr──────────│                │
 │                      │──submitTransaction()────────────────►│
 │                      │◄─{hash, status}─────────────────────│
 │◄─SubmitResponse──────│                     │                │
```

---

## 4. Key Design Decisions

### Bindings Are Never Hand-Written
`scripts/regenerate-bindings.sh` runs `stellar contract bindings typescript` against deployed contract WASMs. These files live in `src/contracts/generated/` and are committed to the repo. They are **never** edited manually.

### All Mutations Route Through the Relay
No module except read-only balance/signer queries ever hits Horizon/RPC directly. All transaction submissions go through `relay/client.ts` for fee sponsorship. This ensures the end user never needs to hold XLM for gas.

### Session Keys Are Cache + On-Chain
Session key authority is enforced **on-chain** by the policy contract. The local `SessionManager` cache is purely a UX optimization (avoiding repeated passkey prompts). Losing the local cache is an inconvenience, not a security hole.

### StorageAdapter for Portability
The `SessionManager` accepts a pluggable `StorageAdapter`. The default `InMemoryStorageAdapter` works for browsers. Mobile apps can inject a Secure Enclave or Keychain-backed adapter without changing any SDK logic.

---

## 5. Error Hierarchy

```
Error
└── SdkError (code: string, contractCode?: number)
    ├── WalletError
    │   ├── UNAUTHORIZED
    │   └── INVALID_SIGNATURE
    └── PolicyError
        ├── SPEND_LIMIT_EXCEEDED
        └── INVALID_SESSION
```

---

## 6. Dependencies on Other Repos

| Dependency | Direction | How |
|---|---|---|
| `wallet-contracts` | Inbound | Generates bindings via `regenerate-bindings.sh` (one-time, not a live dep) |
| `relay-backend` | Outbound | HTTP API calls via `RelayClient`. Schemas typed with Zod placeholders until relay is built |
| `web-dashboard` | Outbound (consumer) | Imports `@rayos/wallet-sdk` as versioned npm package |
| `mobile-app` | Outbound (consumer) | Same as above with custom `StorageAdapter` |

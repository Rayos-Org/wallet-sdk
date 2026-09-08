import { createCredential, signTransaction, PasskeyRegistrationOptions, PasskeySignOptions, PasskeyCredential, PasskeyAssertion } from './passkey/index.js';
import { WalletClient, PolicyClient, Signer, Asset, SpendLimit, SessionKey, SessionKeyOptions, RecoveryProposal } from './contracts/index.js';
import { RelayClient, SubmitTransactionResponse } from './relay/index.js';
import { SessionManager, StorageAdapter } from './session/index.js';

export interface WalletSdkConfig {
  networkPassphrase: string;
  rpcUrl: string;
  relayUrl: string;
  storage?: StorageAdapter;
}

export interface WalletState {
  address: string;
  signers: Signer[];
  balance: bigint;
  // Extensible with policies, etc.
}

export class WalletSdk {
  private walletClient: WalletClient;
  private policyClient: PolicyClient;
  private relayClient: RelayClient;
  private sessionManager: SessionManager;

  constructor(config: WalletSdkConfig) {
    this.walletClient = new WalletClient(config.networkPassphrase, config.rpcUrl);
    this.policyClient = new PolicyClient(config.networkPassphrase, config.rpcUrl);
    this.relayClient = new RelayClient(config.relayUrl);
    this.sessionManager = new SessionManager(this.policyClient, config.storage);
  }

  /**
   * Full onboarding flow: Registers a passkey, predicts the address, and deploys the wallet.
   */
  public async createWallet(options: PasskeyRegistrationOptions, saltBytes: Uint8Array): Promise<{ address: string; credential: PasskeyCredential }> {
    const credential = await createCredential(options);
    const predictedAddress = this.walletClient.predictAddress(saltBytes);
    
    // In a real implementation we would sign the deploy tx and send to relay
    await this.walletClient.deploy(credential);
    
    return { address: predictedAddress, credential };
  }

  /**
   * Signs a transaction with a passkey and submits it via the relay.
   */
  public async signAndSubmit(xdr: string, options: PasskeySignOptions): Promise<SubmitTransactionResponse> {
    // 1. If it needs sponsorship, ask relay first (omitted for brevity here)
    // const sponsored = await this.relayClient.sponsorTransaction({ transaction: xdr });
    
    // 2. Sign the transaction
    const assertion = await signTransaction(xdr, options);
    
    if (!assertion.signedXdr) {
      throw new Error('Failed to sign transaction');
    }

    // 3. Submit to relay
    return this.relayClient.submitTransaction({ transaction: assertion.signedXdr });
  }

  /**
   * Creates and caches a session key for scoped actions.
   */
  public async createSessionKey(walletAddress: string, opts: SessionKeyOptions): Promise<SessionKey> {
    return this.sessionManager.createSession(walletAddress, opts);
  }

  /**
   * Proposes a guardian recovery kickoff.
   */
  public async proposeRecovery(walletAddress: string, newSigner: Signer): Promise<RecoveryProposal> {
    return this.policyClient.proposeRecovery(walletAddress, newSigner);
  }

  /**
   * Approves an existing guardian recovery proposal.
   */
  public async approveRecovery(walletAddress: string, proposalId: string): Promise<void> {
    return this.policyClient.approveRecovery(walletAddress, proposalId);
  }

  /**
   * Read-only aggregate of the wallet state.
   */
  public async getWalletState(walletAddress: string, asset: Asset): Promise<WalletState> {
    const [signers, balance] = await Promise.all([
      this.walletClient.getSigners(walletAddress),
      this.walletClient.getBalance(walletAddress, asset),
    ]);

    return {
      address: walletAddress,
      signers,
      balance,
    };
  }
}

// Re-export types that apps will need
export type {
  PasskeyCredential,
  PasskeyAssertion,
  PasskeyRegistrationOptions,
  PasskeySignOptions,
  Signer,
  Asset,
  SpendLimit,
  SessionKey,
  SessionKeyOptions,
  RecoveryProposal,
  StorageAdapter,
  SubmitTransactionResponse
};

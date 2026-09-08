import { PolicyError } from './errors.js';
import { Signer } from './wallet-client.js';

export interface SpendLimit {
  assetContract: string;
  amount: bigint;
  timeframeSeconds: number;
}

export interface SessionKeyOptions {
  publicKey: Uint8Array;
  expiresAt: number;
  allowedMethods?: string[];
  spendLimit?: SpendLimit;
}

export interface SessionKey {
  id: string;
  publicKey: Uint8Array;
  expiresAt: number;
  isActive: boolean;
}

export interface RecoveryProposal {
  id: string;
  newSigner: Signer;
  proposedAt: number;
  status: 'pending' | 'approved' | 'executed';
}

export class PolicyClient {
  private networkPassphrase: string;
  private rpcUrl: string;

  constructor(networkPassphrase: string, rpcUrl: string) {
    this.networkPassphrase = networkPassphrase;
    this.rpcUrl = rpcUrl;
  }

  public async setSpendLimit(walletAddress: string, limit: SpendLimit): Promise<void> {
    // Placeholder: Construct transaction to policy contract to set spend limit
  }

  public async createSessionKey(walletAddress: string, opts: SessionKeyOptions): Promise<SessionKey> {
    // Placeholder: Construct transaction to policy contract to register session key
    return {
      id: 'session_' + Date.now(),
      publicKey: opts.publicKey,
      expiresAt: opts.expiresAt,
      isActive: true,
    };
  }

  public async revokeSessionKey(walletAddress: string, sessionKeyId: string): Promise<void> {
    // Placeholder: Construct transaction to policy contract to revoke session key
  }

  public async proposeRecovery(walletAddress: string, newSigner: Signer): Promise<RecoveryProposal> {
    // Placeholder: Construct transaction to policy contract to propose recovery
    return {
      id: 'recovery_' + Date.now(),
      newSigner,
      proposedAt: Date.now(),
      status: 'pending',
    };
  }

  public async approveRecovery(walletAddress: string, proposalId: string): Promise<void> {
    // Placeholder: Construct transaction to policy contract to approve recovery proposal
  }
}

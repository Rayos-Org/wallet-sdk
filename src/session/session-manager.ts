import { PolicyClient, SessionKey, SessionKeyOptions } from '../contracts/policy-client.js';
import { StorageAdapter, InMemoryStorageAdapter } from './types.js';

export class SessionManager {
  private policyClient: PolicyClient;
  private storage: StorageAdapter;
  private readonly STORAGE_PREFIX = 'wallet_session_';

  constructor(policyClient: PolicyClient, storage?: StorageAdapter) {
    this.policyClient = policyClient;
    this.storage = storage || new InMemoryStorageAdapter();
  }

  private getStorageKey(walletAddress: string): string {
    return `${this.STORAGE_PREFIX}${walletAddress}`;
  }

  public async createSession(walletAddress: string, opts: SessionKeyOptions): Promise<SessionKey> {
    // Register on-chain
    const sessionKey = await this.policyClient.createSessionKey(walletAddress, opts);
    
    // Cache locally
    await this.storage.setItem(this.getStorageKey(walletAddress), JSON.stringify(sessionKey));
    
    return sessionKey;
  }

  public async getActiveSession(walletAddress: string): Promise<SessionKey | null> {
    const data = await this.storage.getItem(this.getStorageKey(walletAddress));
    if (!data) return null;

    try {
      const sessionKey: SessionKey = JSON.parse(data);
      
      // Check expiry
      if (Date.now() >= sessionKey.expiresAt) {
        await this.storage.removeItem(this.getStorageKey(walletAddress));
        return null;
      }
      
      return sessionKey.isActive ? sessionKey : null;
    } catch {
      return null;
    }
  }

  public async revokeSession(walletAddress: string, sessionKeyId: string): Promise<void> {
    // Revoke on-chain
    await this.policyClient.revokeSessionKey(walletAddress, sessionKeyId);
    
    // Clear cache
    await this.storage.removeItem(this.getStorageKey(walletAddress));
  }

  public async clearExpiredSessions(walletAddresses: string[]): Promise<void> {
    for (const address of walletAddresses) {
      await this.getActiveSession(address); // This internally checks and removes expired keys
    }
  }
}

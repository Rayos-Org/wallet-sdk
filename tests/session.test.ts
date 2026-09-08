import { describe, it, expect, vi } from 'vitest';
import { SessionManager, InMemoryStorageAdapter } from '../src/session/index.js';
import { PolicyClient } from '../src/contracts/index.js';

describe('SessionManager', () => {
  it('should create and retrieve a session', async () => {
    const policyClient = new PolicyClient('TESTNET', 'http://localhost');
    const storage = new InMemoryStorageAdapter();
    const manager = new SessionManager(policyClient, storage);

    const session = await manager.createSession('address1', {
      publicKey: new Uint8Array(),
      expiresAt: Date.now() + 10000,
    });

    expect(session).toBeDefined();

    const active = await manager.getActiveSession('address1');
    expect(active?.id).toBe(session.id);
  });

  it('should return null for expired session', async () => {
    const policyClient = new PolicyClient('TESTNET', 'http://localhost');
    const storage = new InMemoryStorageAdapter();
    const manager = new SessionManager(policyClient, storage);

    await manager.createSession('address2', {
      publicKey: new Uint8Array(),
      expiresAt: Date.now() - 10000, // already expired
    });

    const active = await manager.getActiveSession('address2');
    expect(active).toBeNull();
  });
});

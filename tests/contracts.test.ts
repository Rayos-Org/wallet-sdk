import { describe, it, expect } from 'vitest';
import { WalletClient, PolicyClient, WalletError, PolicyError } from '../src/contracts/index.js';

describe('Contracts Module', () => {
  describe('WalletError & PolicyError mapping', () => {
    it('should map contract error codes correctly', () => {
      const err = WalletError.fromContractError(1);
      expect(err.code).toBe('UNAUTHORIZED');
      
      const policyErr = PolicyError.fromContractError(101);
      expect(policyErr.code).toBe('SPEND_LIMIT_EXCEEDED');
    });
  });

  describe('WalletClient', () => {
    it('should initialize and have predictAddress', () => {
      const client = new WalletClient('TESTNET', 'http://localhost');
      expect(client.predictAddress(new Uint8Array())).toBe('C_PREDICTED_ADDRESS_PLACEHOLDER');
    });
  });

  describe('PolicyClient', () => {
    it('should initialize and create session key locally', async () => {
      const client = new PolicyClient('TESTNET', 'http://localhost');
      const session = await client.createSessionKey('wallet', {
        publicKey: new Uint8Array(),
        expiresAt: 1000,
      });
      expect(session.isActive).toBe(true);
      expect(session.id).toMatch(/^session_/);
    });
  });
});

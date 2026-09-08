import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelayClient } from '../src/relay/index.js';

describe('RelayClient', () => {
  let client: RelayClient;

  beforeEach(() => {
    client = new RelayClient('http://localhost');
    global.fetch = vi.fn();
  });

  it('should successfully submit transaction', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hash: 'test-hash', status: 'success' })
    } as any);

    const res = await client.submitTransaction({ transaction: 'xdr' });
    expect(res.hash).toBe('test-hash');
    expect(res.status).toBe('success');
  });

  it('should throw on relay error', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad transaction', code: '400' })
    } as any);

    await expect(client.submitTransaction({ transaction: 'xdr' })).rejects.toThrow('Relay error: Bad transaction');
  });
});

import {
  DeployWalletRequest,
  DeployWalletResponse,
  DeployWalletResponseSchema,
  FaucetResponse,
  FaucetResponseSchema,
  RelayErrorSchema,
  RelayInfo,
  RelayInfoSchema,
  SubmitTransactionRequest,
  SubmitTransactionResponse,
  SubmitTransactionResponseSchema,
  TransactionStatus,
  TransactionStatusSchema,
} from './types.js';

/**
 * HTTP client for relay-backend's `/relay/*` routes. The relay owns a funded
 * sponsor account: it deploys wallets, pays fees for passkey-authorised
 * transactions and hands out testnet XLM.
 */
export class RelayClient {
  private baseUrl: string;
  private infoCache?: RelayInfo;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(path: string, schema: { parse: (d: unknown) => T }, init?: RequestInit): Promise<T> {
    let response: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch(`${this.baseUrl}${path}`, {
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          ...init,
        });
        if (response.status >= 500 && attempt < 2) {
          await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
          continue;
        }
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
      }
    }
    const data = await response!.json().catch(() => ({}));
    if (!response!.ok) {
      const parsed = RelayErrorSchema.safeParse(data);
      const msg = parsed.success
        ? Array.isArray(parsed.data.message)
          ? parsed.data.message.join(', ')
          : parsed.data.message || parsed.data.error
        : undefined;
      throw new Error(`Relay error (${response!.status}): ${msg ?? JSON.stringify(data)}`);
    }
    return schema.parse(data);
  }

  /** Sponsor public key + network details (cached). */
  public async info(): Promise<RelayInfo> {
    if (!this.infoCache) this.infoCache = await this.request('/relay/info', RelayInfoSchema);
    return this.infoCache;
  }

  /** Deploys a GuardianWallet via the factory, paid by the sponsor. */
  public async deployWallet(request: DeployWalletRequest): Promise<DeployWalletResponse> {
    return this.request('/relay/deploy', DeployWalletResponseSchema, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /** Submits a passkey-authorised transaction; the relay signs the envelope and pays. */
  public async submitTransaction(request: SubmitTransactionRequest): Promise<SubmitTransactionResponse> {
    return this.request('/relay/submit', SubmitTransactionResponseSchema, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /** Testnet only: sponsor sends XLM to the wallet. */
  public async faucet(walletAddress: string): Promise<FaucetResponse> {
    return this.request('/relay/faucet', FaucetResponseSchema, {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    });
  }

  public async status(txHash: string): Promise<TransactionStatus> {
    return this.request(`/relay/status/${encodeURIComponent(txHash)}`, TransactionStatusSchema);
  }
}

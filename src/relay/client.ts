import {
  SubmitTransactionRequest,
  SubmitTransactionResponse,
  SubmitTransactionResponseSchema,
  SponsorTransactionRequest,
  SponsorTransactionResponse,
  SponsorTransactionResponseSchema,
  RelayErrorSchema,
} from './types.js';

export class RelayClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.status >= 500 && i < retries - 1) {
          // Retry on 5xx server errors
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 500));
          continue;
        }
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 500));
      }
    }
    throw new Error('Unreachable code');
  }

  private async parseResponse<T>(response: Response, schema: any): Promise<T> {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const parsedError = RelayErrorSchema.safeParse(data);
      if (parsedError.success) {
        throw new Error(`Relay error: ${parsedError.data.error}`);
      }
      throw new Error(`Relay returned status ${response.status}: ${JSON.stringify(data)}`);
    }

    return schema.parse(data);
  }

  /**
   * Submits a fully signed transaction to the relay.
   */
  public async submitTransaction(request: SubmitTransactionRequest): Promise<SubmitTransactionResponse> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    return this.parseResponse<SubmitTransactionResponse>(response, SubmitTransactionResponseSchema);
  }

  /**
   * Requests fee sponsorship for an unsigned transaction.
   * Returns a transaction wrapped in a fee-bump envelope signed by the relay.
   */
  public async sponsorTransaction(request: SponsorTransactionRequest): Promise<SponsorTransactionResponse> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/sponsor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    return this.parseResponse<SponsorTransactionResponse>(response, SponsorTransactionResponseSchema);
  }
}

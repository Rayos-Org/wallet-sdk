export class SdkError extends Error {
  public readonly code: string;
  public readonly contractCode?: number;

  constructor(message: string, code: string, contractCode?: number) {
    super(message);
    this.name = 'SdkError';
    this.code = code;
    this.contractCode = contractCode;
  }
}

export class WalletError extends SdkError {
  constructor(message: string, code: string, contractCode?: number) {
    super(message, code, contractCode);
    this.name = 'WalletError';
  }

  static fromContractError(code: number): WalletError {
    switch (code) {
      case 1:
        return new WalletError('Unauthorized: caller is not a signer', 'UNAUTHORIZED', code);
      case 2:
        return new WalletError('Invalid signature', 'INVALID_SIGNATURE', code);
      // Add more specific mappings based on actual contract error codes
      default:
        return new WalletError(`Unknown wallet error (code: ${code})`, 'UNKNOWN', code);
    }
  }
}

export class PolicyError extends SdkError {
  constructor(message: string, code: string, contractCode?: number) {
    super(message, code, contractCode);
    this.name = 'PolicyError';
  }

  static fromContractError(code: number): PolicyError {
    switch (code) {
      case 101:
        return new PolicyError('Spend limit exceeded', 'SPEND_LIMIT_EXCEEDED', code);
      case 102:
        return new PolicyError('Session key expired or invalid', 'INVALID_SESSION', code);
      default:
        return new PolicyError(`Unknown policy error (code: ${code})`, 'UNKNOWN', code);
    }
  }
}

import { z } from 'zod';

export const RelayErrorSchema = z.object({
  message: z.union([z.string(), z.array(z.string())]).optional(),
  error: z.string().optional(),
  statusCode: z.number().optional(),
});

export const RelayInfoSchema = z.object({
  publicKey: z.string(),
  networkPassphrase: z.string(),
  factoryContractId: z.string(),
  nativeTokenContractId: z.string(),
  faucetAmount: z.string().optional(),
});
export type RelayInfo = z.infer<typeof RelayInfoSchema>;

export const DeployWalletRequestSchema = z.object({
  saltHex: z.string().length(64),
  credentialId: z.string().min(1).describe('base64url credential id'),
  publicKeyHex: z.string().length(130).describe('uncompressed P-256 key'),
});
export type DeployWalletRequest = z.infer<typeof DeployWalletRequestSchema>;

export const DeployWalletResponseSchema = z.object({
  walletAddress: z.string(),
  txHash: z.string(),
});
export type DeployWalletResponse = z.infer<typeof DeployWalletResponseSchema>;

export const SubmitTransactionRequestSchema = z.object({
  signedXdr: z.string().describe('Transaction XDR with wallet auth entries signed by the passkey'),
});
export type SubmitTransactionRequest = z.infer<typeof SubmitTransactionRequestSchema>;

export const SubmitTransactionResponseSchema = z.object({
  txHash: z.string(),
  status: z.string(),
});
export type SubmitTransactionResponse = z.infer<typeof SubmitTransactionResponseSchema>;

export const FaucetResponseSchema = z.object({
  txHash: z.string(),
  amount: z.string(),
});
export type FaucetResponse = z.infer<typeof FaucetResponseSchema>;

export const TransactionStatusSchema = z.object({
  txHash: z.string(),
  status: z.string(),
});
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

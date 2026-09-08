import { z } from 'zod';

export const RelayErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
});
export type RelayError = z.infer<typeof RelayErrorSchema>;

export const SubmitTransactionRequestSchema = z.object({
  transaction: z.string().describe('The base64 encoded signed XDR transaction'),
});
export type SubmitTransactionRequest = z.infer<typeof SubmitTransactionRequestSchema>;

export const SubmitTransactionResponseSchema = z.object({
  hash: z.string().describe('The transaction hash if successfully submitted'),
  status: z.enum(['pending', 'success', 'failed']),
});
export type SubmitTransactionResponse = z.infer<typeof SubmitTransactionResponseSchema>;

export const SponsorTransactionRequestSchema = z.object({
  transaction: z.string().describe('The base64 encoded unsigned XDR transaction'),
});
export type SponsorTransactionRequest = z.infer<typeof SponsorTransactionRequestSchema>;

export const SponsorTransactionResponseSchema = z.object({
  transaction: z.string().describe('The base64 encoded XDR wrapped in a fee-bump envelope'),
});
export type SponsorTransactionResponse = z.infer<typeof SponsorTransactionResponseSchema>;

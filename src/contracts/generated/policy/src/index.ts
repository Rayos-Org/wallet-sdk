import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CCDM3O2SXX3E24MCWLRK5YBVQHJCA4OQKJFF6KWCK6FHZS65DGMT6DOY",
  }
} as const

export const ContractError = {
  1: {message:"NotInitialized"},
  2: {message:"Unauthorized"},
  3: {message:"SpendLimitExceeded"},
  4: {message:"SessionKeyExpired"},
  5: {message:"SessionKeyWrongScope"},
  6: {message:"SessionKeyRevoked"},
  7: {message:"SessionKeyInvalidSignature"},
  8: {message:"NotAllowListed"},
  9: {message:"InvalidGuardian"},
  10: {message:"ProposalNotFound"},
  11: {message:"AlreadyApproved"},
  12: {message:"TimelockNotExpired"},
  13: {message:"NotEnoughApprovals"},
  14: {message:"ProposalNotActive"}
}

export type DataKey = {tag: "Owner", values: void} | {tag: "SpendLimit", values: readonly [string]} | {tag: "SessionKey", values: readonly [Buffer]} | {tag: "AllowList", values: readonly [string]} | {tag: "AllowListEnabled", values: void} | {tag: "Guardian", values: readonly [string]} | {tag: "RecoveryThreshold", values: void} | {tag: "RecoveryProposal", values: readonly [u64]} | {tag: "ProposalCounter", values: void} | {tag: "RecoveryTimelock", values: void};


export interface SessionKey {
  expiry: u64;
  public_key: Buffer;
  scope: Array<string>;
}


export interface SpendLimit {
  amount: i128;
  current_accumulated: i128;
  current_window_start: u64;
  window_secs: u64;
}

export type ProposalStatus = {tag: "Active", values: void} | {tag: "Executed", values: void} | {tag: "Cancelled", values: void};


export interface RecoveryProposal {
  approvals: Array<string>;
  execute_after: u64;
  new_credential_id: Buffer;
  new_public_key: Buffer;
  status: ProposalStatus;
}

export interface Client {
  /**
   * Construct and simulate a init transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  init: ({owner}: {owner: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a check_spend transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  check_spend: ({token, spend_amount}: {token: string, spend_amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_session transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_session: ({session_id}: {session_id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<SessionKey>>>

  /**
   * Construct and simulate a add_guardian transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_guardian: ({guardian}: {guardian: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_allow_list transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_allow_list: ({target, allowed}: {target: string, allowed: boolean}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a remove_guardian transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  remove_guardian: ({guardian}: {guardian: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_spend_limit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_spend_limit: ({token, amount, window_secs}: {token: string, amount: i128, window_secs: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a approve_recovery transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  approve_recovery: ({caller, proposal_id}: {caller: string, proposal_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a check_allow_list transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  check_allow_list: ({target}: {target: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a execute_recovery transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  execute_recovery: ({wallet, proposal_id}: {wallet: string, proposal_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a propose_recovery transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  propose_recovery: ({caller, new_credential_id, new_public_key}: {caller: string, new_credential_id: Buffer, new_public_key: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u64>>>

  /**
   * Construct and simulate a create_session_key transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_session_key: ({session_id, public_key, scope, expiry}: {session_id: Buffer, public_key: Buffer, scope: Array<string>, expiry: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a revoke_session_key transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  revoke_session_key: ({session_id}: {session_id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_recovery_timelock transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_recovery_timelock: ({delay_secs}: {delay_secs: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_allow_list_enabled transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_allow_list_enabled: ({enabled}: {enabled: boolean}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_recovery_threshold transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_recovery_threshold: ({threshold}: {threshold: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAAAAAAAEaW5pdAAAAAEAAAAAAAAABW93bmVyAAAAAAAAEwAAAAEAAAPpAAAAAgAAB9AAAAANQ29udHJhY3RFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAALY2hlY2tfc3BlbmQAAAAAAgAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAAxzcGVuZF9hbW91bnQAAAALAAAAAQAAA+kAAAACAAAH0AAAAA1Db250cmFjdEVycm9yAAAA",
        "AAAAAAAAAAAAAAALZ2V0X3Nlc3Npb24AAAAAAQAAAAAAAAAKc2Vzc2lvbl9pZAAAAAAADgAAAAEAAAPpAAAH0AAAAApTZXNzaW9uS2V5AAAAAAfQAAAADUNvbnRyYWN0RXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAMYWRkX2d1YXJkaWFuAAAAAQAAAAAAAAAIZ3VhcmRpYW4AAAATAAAAAQAAA+kAAAACAAAH0AAAAA1Db250cmFjdEVycm9yAAAA",
        "AAAAAAAAAAAAAAAOc2V0X2FsbG93X2xpc3QAAAAAAAIAAAAAAAAABnRhcmdldAAAAAAAEwAAAAAAAAAHYWxsb3dlZAAAAAABAAAAAQAAA+kAAAACAAAH0AAAAA1Db250cmFjdEVycm9yAAAA",
        "AAAAAAAAAAAAAAAPcmVtb3ZlX2d1YXJkaWFuAAAAAAEAAAAAAAAACGd1YXJkaWFuAAAAEwAAAAEAAAPpAAAAAgAAB9AAAAANQ29udHJhY3RFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAAPc2V0X3NwZW5kX2xpbWl0AAAAAAMAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAt3aW5kb3dfc2VjcwAAAAAGAAAAAQAAA+kAAAACAAAH0AAAAA1Db250cmFjdEVycm9yAAAA",
        "AAAAAAAAAAAAAAAQYXBwcm92ZV9yZWNvdmVyeQAAAAIAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAAAAAALcHJvcG9zYWxfaWQAAAAABgAAAAEAAAPpAAAAAgAAB9AAAAANQ29udHJhY3RFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAAQY2hlY2tfYWxsb3dfbGlzdAAAAAEAAAAAAAAABnRhcmdldAAAAAAAEwAAAAEAAAPpAAAAAgAAB9AAAAANQ29udHJhY3RFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAAQZXhlY3V0ZV9yZWNvdmVyeQAAAAIAAAAAAAAABndhbGxldAAAAAAAEwAAAAAAAAALcHJvcG9zYWxfaWQAAAAABgAAAAEAAAPpAAAAAgAAB9AAAAANQ29udHJhY3RFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAAQcHJvcG9zZV9yZWNvdmVyeQAAAAMAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAAAAAARbmV3X2NyZWRlbnRpYWxfaWQAAAAAAAAOAAAAAAAAAA5uZXdfcHVibGljX2tleQAAAAAADgAAAAEAAAPpAAAABgAAB9AAAAANQ29udHJhY3RFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAASY3JlYXRlX3Nlc3Npb25fa2V5AAAAAAAEAAAAAAAAAApzZXNzaW9uX2lkAAAAAAAOAAAAAAAAAApwdWJsaWNfa2V5AAAAAAAOAAAAAAAAAAVzY29wZQAAAAAAA+oAAAATAAAAAAAAAAZleHBpcnkAAAAAAAYAAAABAAAD6QAAAAIAAAfQAAAADUNvbnRyYWN0RXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAScmV2b2tlX3Nlc3Npb25fa2V5AAAAAAABAAAAAAAAAApzZXNzaW9uX2lkAAAAAAAOAAAAAQAAA+kAAAACAAAH0AAAAA1Db250cmFjdEVycm9yAAAA",
        "AAAAAAAAAAAAAAAVc2V0X3JlY292ZXJ5X3RpbWVsb2NrAAAAAAAAAQAAAAAAAAAKZGVsYXlfc2VjcwAAAAAABgAAAAEAAAPpAAAAAgAAB9AAAAANQ29udHJhY3RFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAAWc2V0X2FsbG93X2xpc3RfZW5hYmxlZAAAAAAAAQAAAAAAAAAHZW5hYmxlZAAAAAABAAAAAQAAA+kAAAACAAAH0AAAAA1Db250cmFjdEVycm9yAAAA",
        "AAAAAAAAAAAAAAAWc2V0X3JlY292ZXJ5X3RocmVzaG9sZAAAAAAAAQAAAAAAAAAJdGhyZXNob2xkAAAAAAAABAAAAAEAAAPpAAAAAgAAB9AAAAANQ29udHJhY3RFcnJvcgAAAA==",
        "AAAABAAAAAAAAAAAAAAADUNvbnRyYWN0RXJyb3IAAAAAAAAOAAAAAAAAAA5Ob3RJbml0aWFsaXplZAAAAAAAAQAAAAAAAAAMVW5hdXRob3JpemVkAAAAAgAAAAAAAAASU3BlbmRMaW1pdEV4Y2VlZGVkAAAAAAADAAAAAAAAABFTZXNzaW9uS2V5RXhwaXJlZAAAAAAAAAQAAAAAAAAAFFNlc3Npb25LZXlXcm9uZ1Njb3BlAAAABQAAAAAAAAARU2Vzc2lvbktleVJldm9rZWQAAAAAAAAGAAAAAAAAABpTZXNzaW9uS2V5SW52YWxpZFNpZ25hdHVyZQAAAAAABwAAAAAAAAAOTm90QWxsb3dMaXN0ZWQAAAAAAAgAAAAAAAAAD0ludmFsaWRHdWFyZGlhbgAAAAAJAAAAAAAAABBQcm9wb3NhbE5vdEZvdW5kAAAACgAAAAAAAAAPQWxyZWFkeUFwcHJvdmVkAAAAAAsAAAAAAAAAElRpbWVsb2NrTm90RXhwaXJlZAAAAAAADAAAAAAAAAASTm90RW5vdWdoQXBwcm92YWxzAAAAAAANAAAAAAAAABFQcm9wb3NhbE5vdEFjdGl2ZQAAAAAAAA4=",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAACgAAAAAAAAAAAAAABU93bmVyAAAAAAAAAQAAAAAAAAAKU3BlbmRMaW1pdAAAAAAAAQAAABMAAAABAAAAAAAAAApTZXNzaW9uS2V5AAAAAAABAAAADgAAAAEAAAAAAAAACUFsbG93TGlzdAAAAAAAAAEAAAATAAAAAAAAAAAAAAAQQWxsb3dMaXN0RW5hYmxlZAAAAAEAAAAAAAAACEd1YXJkaWFuAAAAAQAAABMAAAAAAAAAAAAAABFSZWNvdmVyeVRocmVzaG9sZAAAAAAAAAEAAAAAAAAAEFJlY292ZXJ5UHJvcG9zYWwAAAABAAAABgAAAAAAAAAAAAAAD1Byb3Bvc2FsQ291bnRlcgAAAAAAAAAAAAAAABBSZWNvdmVyeVRpbWVsb2Nr",
        "AAAAAQAAAAAAAAAAAAAAClNlc3Npb25LZXkAAAAAAAMAAAAAAAAABmV4cGlyeQAAAAAABgAAAAAAAAAKcHVibGljX2tleQAAAAAADgAAAAAAAAAFc2NvcGUAAAAAAAPqAAAAEw==",
        "AAAAAQAAAAAAAAAAAAAAClNwZW5kTGltaXQAAAAAAAQAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAATY3VycmVudF9hY2N1bXVsYXRlZAAAAAALAAAAAAAAABRjdXJyZW50X3dpbmRvd19zdGFydAAAAAYAAAAAAAAAC3dpbmRvd19zZWNzAAAAAAY=",
        "AAAAAgAAAAAAAAAAAAAADlByb3Bvc2FsU3RhdHVzAAAAAAADAAAAAAAAAAAAAAAGQWN0aXZlAAAAAAAAAAAAAAAAAAhFeGVjdXRlZAAAAAAAAAAAAAAACUNhbmNlbGxlZAAAAA==",
        "AAAAAQAAAAAAAAAAAAAAEFJlY292ZXJ5UHJvcG9zYWwAAAAFAAAAAAAAAAlhcHByb3ZhbHMAAAAAAAPqAAAAEwAAAAAAAAANZXhlY3V0ZV9hZnRlcgAAAAAAAAYAAAAAAAAAEW5ld19jcmVkZW50aWFsX2lkAAAAAAAADgAAAAAAAAAObmV3X3B1YmxpY19rZXkAAAAAAA4AAAAAAAAABnN0YXR1cwAAAAAH0AAAAA5Qcm9wb3NhbFN0YXR1cwAA" ]),
      options
    )
  }
  public readonly fromJSON = {
    init: this.txFromJSON<Result<void>>,
        check_spend: this.txFromJSON<Result<void>>,
        get_session: this.txFromJSON<Result<SessionKey>>,
        add_guardian: this.txFromJSON<Result<void>>,
        set_allow_list: this.txFromJSON<Result<void>>,
        remove_guardian: this.txFromJSON<Result<void>>,
        set_spend_limit: this.txFromJSON<Result<void>>,
        approve_recovery: this.txFromJSON<Result<void>>,
        check_allow_list: this.txFromJSON<Result<void>>,
        execute_recovery: this.txFromJSON<Result<void>>,
        propose_recovery: this.txFromJSON<Result<u64>>,
        create_session_key: this.txFromJSON<Result<void>>,
        revoke_session_key: this.txFromJSON<Result<void>>,
        set_recovery_timelock: this.txFromJSON<Result<void>>,
        set_allow_list_enabled: this.txFromJSON<Result<void>>,
        set_recovery_threshold: this.txFromJSON<Result<void>>
  }
}
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
    contractId: "CAIIUPVI5VO2BCXKPUIRZX4BW4YQ6G6FWPJEWVKIVRN4H3KWJTUV3VXM",
  }
} as const


export interface WebAuthnSignature {
  credential_id: Buffer;
  signature: Buffer;
}

export const ContractError = {
  1: {message:"NotInitialized"},
  2: {message:"AlreadyInitialized"},
  3: {message:"InvalidSignature"},
  4: {message:"SignerNotFound"},
  5: {message:"SignerAlreadyExists"},
  6: {message:"Unauthorized"},
  7: {message:"PolicyCallFailed"},
  8: {message:"CannotRemoveLastSigner"}
}

export type DataKey = {tag: "Signers", values: void} | {tag: "PolicyAddress", values: void};

export interface Client {
  /**
   * Construct and simulate a init transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  init: ({credential_id, public_key}: {credential_id: Buffer, public_key: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a add_signer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_signer: ({credential_id, public_key}: {credential_id: Buffer, public_key: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_policy transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_policy: ({policy}: {policy: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_signers transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_signers: (options?: MethodOptions) => Promise<AssembledTransaction<Map<Buffer, Buffer>>>

  /**
   * Construct and simulate a remove_signer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  remove_signer: ({credential_id}: {credential_id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a recover_signer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  recover_signer: ({credential_id, public_key}: {credential_id: Buffer, public_key: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

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
      new ContractSpec([ "AAAAAAAAAAAAAAAEaW5pdAAAAAIAAAAAAAAADWNyZWRlbnRpYWxfaWQAAAAAAAAOAAAAAAAAAApwdWJsaWNfa2V5AAAAAAAOAAAAAQAAA+kAAAACAAAH0AAAAA1Db250cmFjdEVycm9yAAAA",
        "AAAAAAAAAAAAAAAKYWRkX3NpZ25lcgAAAAAAAgAAAAAAAAANY3JlZGVudGlhbF9pZAAAAAAAAA4AAAAAAAAACnB1YmxpY19rZXkAAAAAAA4AAAABAAAD6QAAAAIAAAfQAAAADUNvbnRyYWN0RXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAKc2V0X3BvbGljeQAAAAAAAQAAAAAAAAAGcG9saWN5AAAAAAATAAAAAQAAA+kAAAACAAAH0AAAAA1Db250cmFjdEVycm9yAAAA",
        "AAAAAAAAAAAAAAALZ2V0X3NpZ25lcnMAAAAAAAAAAAEAAAPsAAAADgAAAA4=",
        "AAAAAAAAAAAAAAAMX19jaGVja19hdXRoAAAAAwAAAAAAAAARc2lnbmF0dXJlX3BheWxvYWQAAAAAAAPuAAAAIAAAAAAAAAAJc2lnbmF0dXJlAAAAAAAH0AAAABFXZWJBdXRoblNpZ25hdHVyZQAAAAAAAAAAAAANYXV0aF9jb250ZXh0cwAAAAAAA+oAAAfQAAAAB0NvbnRleHQAAAAAAQAAA+kAAAACAAAH0AAAAA1Db250cmFjdEVycm9yAAAA",
        "AAAAAAAAAAAAAAANcmVtb3ZlX3NpZ25lcgAAAAAAAAEAAAAAAAAADWNyZWRlbnRpYWxfaWQAAAAAAAAOAAAAAQAAA+kAAAACAAAH0AAAAA1Db250cmFjdEVycm9yAAAA",
        "AAAAAAAAAAAAAAAOcmVjb3Zlcl9zaWduZXIAAAAAAAIAAAAAAAAADWNyZWRlbnRpYWxfaWQAAAAAAAAOAAAAAAAAAApwdWJsaWNfa2V5AAAAAAAOAAAAAQAAA+kAAAACAAAH0AAAAA1Db250cmFjdEVycm9yAAAA",
        "AAAAAQAAAAAAAAAAAAAAEVdlYkF1dGhuU2lnbmF0dXJlAAAAAAAAAgAAAAAAAAANY3JlZGVudGlhbF9pZAAAAAAAAA4AAAAAAAAACXNpZ25hdHVyZQAAAAAAA+4AAABA",
        "AAAABAAAAAAAAAAAAAAADUNvbnRyYWN0RXJyb3IAAAAAAAAIAAAAAAAAAA5Ob3RJbml0aWFsaXplZAAAAAAAAQAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAAACAAAAAAAAABBJbnZhbGlkU2lnbmF0dXJlAAAAAwAAAAAAAAAOU2lnbmVyTm90Rm91bmQAAAAAAAQAAAAAAAAAE1NpZ25lckFscmVhZHlFeGlzdHMAAAAABQAAAAAAAAAMVW5hdXRob3JpemVkAAAABgAAAAAAAAAQUG9saWN5Q2FsbEZhaWxlZAAAAAcAAAAAAAAAFkNhbm5vdFJlbW92ZUxhc3RTaWduZXIAAAAAAAg=",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAgAAAAAAAAAAAAAAB1NpZ25lcnMAAAAAAAAAAAAAAAANUG9saWN5QWRkcmVzcwAAAA==" ]),
      options
    )
  }
  public readonly fromJSON = {
    init: this.txFromJSON<Result<void>>,
        add_signer: this.txFromJSON<Result<void>>,
        set_policy: this.txFromJSON<Result<void>>,
        get_signers: this.txFromJSON<Map<Buffer, Buffer>>,
        remove_signer: this.txFromJSON<Result<void>>,
        recover_signer: this.txFromJSON<Result<void>>
  }
}
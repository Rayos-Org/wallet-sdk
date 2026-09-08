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
    contractId: "CCCAMWJOF7IYTVCU7SR6HFTNH5XRMDMWPYN464NY5BCKUPMUM64RZ5CH",
  }
} as const

export type DataKey = {tag: "WasmHash", values: void};

export interface Client {
  /**
   * Construct and simulate a init transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  init: ({wasm_hash}: {wasm_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a deploy_wallet transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  deploy_wallet: ({salt, credential_id, public_key}: {salt: Buffer, credential_id: Buffer, public_key: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a predict_address transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  predict_address: ({salt}: {salt: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<string>>

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
      new ContractSpec([ "AAAAAAAAAAAAAAAEaW5pdAAAAAEAAAAAAAAACXdhc21faGFzaAAAAAAAA+4AAAAgAAAAAA==",
        "AAAAAAAAAAAAAAANZGVwbG95X3dhbGxldAAAAAAAAAMAAAAAAAAABHNhbHQAAAPuAAAAIAAAAAAAAAANY3JlZGVudGlhbF9pZAAAAAAAAA4AAAAAAAAACnB1YmxpY19rZXkAAAAAAA4AAAABAAAAEw==",
        "AAAAAAAAAAAAAAAPcHJlZGljdF9hZGRyZXNzAAAAAAEAAAAAAAAABHNhbHQAAAPuAAAAIAAAAAEAAAAT",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAQAAAAAAAAAAAAAACFdhc21IYXNo" ]),
      options
    )
  }
  public readonly fromJSON = {
    init: this.txFromJSON<null>,
        deploy_wallet: this.txFromJSON<string>,
        predict_address: this.txFromJSON<string>
  }
}
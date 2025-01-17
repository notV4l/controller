import {
  Account as BaseAccount,
  RpcProvider,
  SignerInterface,
  Call,
  EstimateFeeDetails,
  EstimateFee,
  Signature,
  ec,
  InvokeFunctionResponse,
  TypedData,
  BigNumberish,
  InvocationsDetails,
  shortString,
  num,
  AllowArray,
} from "starknet";

import { DeployAccountDocument, DeployAccountMutation } from "generated/graphql";
import { client } from "utils/graphql";

import { selectors, VERSION } from "./selectors";
import Storage from "./storage";
import { CartridgeAccount } from "@cartridge/account-wasm";
import { Session } from "@cartridge/controller";
import { normalizeCalls } from "./connection/execute";

const EST_FEE_MULTIPLIER = 2n;

export enum Status {
  COUNTERFACTUAL = "COUNTERFACTUAL",
  DEPLOYING = "DEPLOYING",
  DEPLOYED = "DEPLOYED",
}

class Account extends BaseAccount {
  rpc: RpcProvider;
  private selector: string;
  chainId: string;
  username: string;
  cartridge: CartridgeAccount;

  constructor(
    chainId: string,
    nodeUrl: string,
    address: string,
    username: string,
    signer: SignerInterface,
    webauthn: {
      rpId: string;
      origin: string;
      credentialId: string;
      publicKey: string;
    },
  ) {
    super({ nodeUrl }, address, signer);

    this.rpc = new RpcProvider({ nodeUrl });
    this.selector = selectors[VERSION].deployment(address, chainId);
    this.chainId = chainId;
    this.username = username;
    this.cartridge = CartridgeAccount.new(
      nodeUrl,
      chainId,
      address,
      webauthn.rpId,
      webauthn.origin,
      webauthn.credentialId,
      webauthn.publicKey,
    );

    this.sync();
  }

  get status() {
    const state = Storage.get(this.selector);
    if (!state || !state.status) {
      return Status.DEPLOYING;
    }

    return state.status;
  }

  set status(status: Status) {
    Storage.update(this.selector, {
      status,
    });
  }

  async requestDeployment(): Promise<string> {
    const hash: DeployAccountMutation = await client.request(DeployAccountDocument, {
      id: this.username,
      chainId: `starknet:${shortString.decodeShortString(this.chainId)}`,
    });

    this.status = Status.DEPLOYING;

    return hash.deployAccount;
  }

  async sync() {
    try {
      switch (this.status) {
        case Status.DEPLOYING: {
          try {
            const classHash = await this.rpc.getClassHashAt(
              this.address,
              "pending",
            );
            Storage.update(this.selector, {
              classHash,
            });
            this.status = Status.DEPLOYED;
          } catch (error) {
            if (
              error instanceof Error &&
              error.message.includes("Contract not found")
            ) {
              this.status = Status.COUNTERFACTUAL;
            } else {
              throw error;
            }
          }
          return;
        }
      }
    } catch (e) {
      /* no-op */
    }
  }

  // @ts-expect-error TODO: fix overload type mismatch
  async execute(
    calls: AllowArray<Call>,
    transactionsDetail?: InvocationsDetails,
    session?: Session,
  ): Promise<InvokeFunctionResponse> {
    if (this.status === Status.COUNTERFACTUAL) {
      throw new Error("Account is not deployed");
    }

    transactionsDetail.nonce =
      transactionsDetail.nonce ?? (await this.getNonce("pending"));
    transactionsDetail.maxFee = num.toHex(transactionsDetail.maxFee);

    const res = await this.cartridge.execute(
      normalizeCalls(calls),
      transactionsDetail,
      session,
    );

    Storage.update(this.selector, {
      nonce: num.toHex(BigInt(transactionsDetail.nonce) + 1n),
    });

    this.rpc
      .waitForTransaction(res.transaction_hash, {
        retryInterval: 1000,
      })
      .catch(() => {
        this.resetNonce();
      });

    return res;
  }

  async estimateInvokeFee(
    calls: AllowArray<Call>,
    details: EstimateFeeDetails = {},
  ): Promise<EstimateFee> {
    details.blockIdentifier = details.blockIdentifier ?? "pending";

    if (this.status === Status.COUNTERFACTUAL) {
      throw new Error("Account is not deployed");
    }

    details.nonce = details.nonce ?? (await super.getNonce("pending"));

    let estFee = await super.estimateInvokeFee(calls, details);

    // FIXME: temp fix for the sepolia fee estimation
    estFee.suggestedMaxFee *= EST_FEE_MULTIPLIER;

    return estFee;
  }

  async verifyMessageHash(
    hash: BigNumberish,
    signature: Signature,
  ): Promise<boolean> {
    if (BigInt(signature[0]) === 0n) {
      return ec.starkCurve.verify(
        // @ts-expect-error TODO(#244): Adapt signature
        signature,
        BigInt(hash).toString(),
        signature[0],
      );
    }

    return super.verifyMessageHash(hash, signature);
  }

  async signMessage(typedData: TypedData): Promise<Signature> {
    return this.cartridge.signMessage(JSON.stringify(typedData));
  }

  async getNonce(blockIdentifier?: any): Promise<string> {
    const chainNonce = await super.getNonce(blockIdentifier);

    if (blockIdentifier !== "pending") {
      return chainNonce;
    }

    const state = Storage.get(this.selector);
    if (!state || !state.nonce || BigInt(chainNonce) > BigInt(state.nonce)) {
      return chainNonce;
    }

    return state.nonce;
  }

  resetNonce() {
    Storage.update(this.selector, {
      nonce: undefined,
    });
  }
}

export default Account;

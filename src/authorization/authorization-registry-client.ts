import {
  Contract,
  type ContractRunner,
} from "ethers";

import {
  mapAuthorizationRequest,
} from "./authorization-mapper";

import type {
  AuthorizationRequest,
} from "../types/decision";

const AUTHORIZATION_REGISTRY_ABI = [
  "function recordAuthorization(bytes32 authorizationId, bytes32 transactionHash, bytes32 evidenceHash, bytes32 policyId, bytes32 policyHash, uint64 policyVersion, uint8 decision, uint64 expiresAt)",
  "function isAuthorizationValid(bytes32 authorizationId, bytes32 transactionHash) view returns (bool)",
  "function authorizers(address) view returns (bool)",
] as const;

export interface AuthorizationSubmission {
  authorizationId: `0x${string}`;
  transactionHash: `0x${string}`;
  txHash: string;
}

export class AuthorizationRegistryClient {
  private readonly contract: Contract;

  constructor(
    registryAddress: string,
    runner: ContractRunner
  ) {
    this.contract = new Contract(
      registryAddress,
      AUTHORIZATION_REGISTRY_ABI,
      runner
    );
  }

  async recordAuthorization(
    request: AuthorizationRequest
  ): Promise<AuthorizationSubmission> {
    const payload =
      mapAuthorizationRequest(request);

    const recordAuthorization =
      this.contract.getFunction(
        "recordAuthorization"
      );

    const transaction =
      await recordAuthorization(
        payload.authorizationId,
        payload.transactionHash,
        payload.evidenceHash,
        payload.policyId,
        payload.policyHash,
        payload.policyVersion,
        payload.decision,
        payload.expiresAt
      );

    await transaction.wait();

    return {
      authorizationId: payload.authorizationId,
      transactionHash: payload.transactionHash,
      txHash: transaction.hash,
    };
  }

  async isAuthorizationValid(
    authorizationId: `0x${string}`,
    transactionHash: `0x${string}`
  ): Promise<boolean> {
    const isAuthorizationValid =
      this.contract.getFunction(
        "isAuthorizationValid"
      );

    const result =
      await isAuthorizationValid.staticCall(
        authorizationId,
        transactionHash
      );

    return Boolean(result);
  }

  async isAuthorizer(
    address: string
  ): Promise<boolean> {
    const authorizers =
      this.contract.getFunction(
        "authorizers"
      );

    const result =
      await authorizers.staticCall(
        address
      );

    return Boolean(result);
  }
}
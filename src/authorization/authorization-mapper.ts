import {
  keccak256,
  toUtf8Bytes,
} from "ethers";

import type {
  AuthorizationRequest,
  PolicyDecision,
} from "../types/decision";

export type SolidityDecision = 0 | 1;

export interface SolidityAuthorizationPayload {
  authorizationId: `0x${string}`;
  transactionHash: `0x${string}`;
  evidenceHash: `0x${string}`;
  policyId: `0x${string}`;
  policyHash: `0x${string}`;
  policyVersion: number;
  decision: SolidityDecision;
  expiresAt: number;
}

function mapDecisionToSolidity(
  decision: PolicyDecision["status"]
): SolidityDecision {
  switch (decision) {
    case "deny":
      return 0;

    case "approve":
      return 1;

    case "review":
      throw new Error(
        "Review decisions cannot be recorded on-chain"
      );
  }
}

function deriveAuthorizationId(
  request: AuthorizationRequest
): `0x${string}` {
  const material = [
    request.transactionHash,
    request.evidenceHash,
    request.policy.id,
    request.policy.hash,
    request.policy.version.toString(),
    request.decision,
    request.expiresAt.toString(),
  ].join(":");

  return keccak256(
    toUtf8Bytes(material)
  ) as `0x${string}`;
}

export function mapAuthorizationRequest(
  request: AuthorizationRequest
): SolidityAuthorizationPayload {
  if (request.decision === "review") {
    throw new Error(
      "Review decisions cannot be recorded on-chain"
    );
  }

  const authorizationId =
    request.authorizationId ??
    deriveAuthorizationId(request);

  return {
    authorizationId,
    transactionHash: request.transactionHash,
    evidenceHash: request.evidenceHash,
    policyId: request.policy.id,
    policyHash: request.policy.hash,
    policyVersion: request.policy.version,
    decision: mapDecisionToSolidity(request.decision),
    expiresAt: request.expiresAt,
  };
}
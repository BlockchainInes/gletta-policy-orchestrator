import { describe, expect, it } from "vitest";

import { mapAuthorizationRequest } from "../src/authorization/authorization-mapper";

import type { AuthorizationRequest } from "../src/types/decision";

const authorizationId =
  "0x1111111111111111111111111111111111111111111111111111111111111111" as const;

const transactionHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

const evidenceHash =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;

const policyId =
  "0x8c58c8e4f125b33e8f7d4db88c9a61dc385dbfa519134e62d84f973c8538e2c1" as const;

const policyHash =
  "0x22bb427620f67f9d707c9e5739b0a2ac4f8fb49e97d7110aac7dbead2d5c9b76" as const;

function createRequest(
  decision: AuthorizationRequest["decision"]
): AuthorizationRequest {
  return {
    authorizationId,
    transactionHash,
    evidenceHash,
    policy: {
      id: policyId,
      hash: policyHash,
      version: 1,
    },
    decision,
    expiresAt: 1787958000,
  };
}

describe("authorization mapper", () => {
  it("maps approve to Solidity decision 1", () => {
    const payload = mapAuthorizationRequest(
      createRequest("approve")
    );

    expect(payload.decision).toBe(1);
  });

  it("maps deny to Solidity decision 0", () => {
    const payload = mapAuthorizationRequest(
      createRequest("deny")
    );

    expect(payload.decision).toBe(0);
  });

  it("rejects review decisions", () => {
    expect(() =>
      mapAuthorizationRequest(
        createRequest("review")
      )
    ).toThrow(
      "Review decisions cannot be recorded on-chain"
    );
  });

  it("preserves authorization id", () => {
    const payload = mapAuthorizationRequest(
      createRequest("approve")
    );

    expect(payload.authorizationId).toBe(
      authorizationId
    );
  });

  it("preserves transaction and evidence hashes", () => {
    const payload = mapAuthorizationRequest(
      createRequest("approve")
    );

    expect(payload.transactionHash).toBe(
      transactionHash
    );

    expect(payload.evidenceHash).toBe(
      evidenceHash
    );
  });

  it("preserves policy reference", () => {
    const payload = mapAuthorizationRequest(
      createRequest("approve")
    );

    expect(payload.policyId).toBe(policyId);
    expect(payload.policyHash).toBe(policyHash);
    expect(payload.policyVersion).toBe(1);
  });

  it("preserves expiry", () => {
    const request = createRequest("approve");

    const payload =
      mapAuthorizationRequest(request);

    expect(payload.expiresAt).toBe(
      request.expiresAt
    );
  });
});
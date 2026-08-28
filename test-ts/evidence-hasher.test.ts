import { describe, expect, it } from "vitest";

import { hashEvidenceBundle } from "../src/evidence/evidence-hasher";

import type {
  EvidenceBundle,
  EvidenceRecord,
} from "../src/types/evidence";

const transactionHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

const baseHash =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;

const evaluatedAt = 1787954400;

const kycEvidence: EvidenceRecord = {
  id: "ev-kyc",
  source: "kyc",
  subject: "institutional-counterparty-001",
  collectedAt: evaluatedAt - 300,
  expiresAt: evaluatedAt + 3600,
  attributes: {
    status: "verified",
    jurisdiction: "FR",
  },
  hash: baseHash,
};

const sanctionsEvidence: EvidenceRecord = {
  id: "ev-sanctions",
  source: "sanctions",
  subject: "institutional-counterparty-001",
  collectedAt: evaluatedAt - 240,
  expiresAt: evaluatedAt + 1800,
  attributes: {
    listed: false,
    provider: "screening-provider",
  },
  hash: baseHash,
};

function createBundle(
  records: readonly EvidenceRecord[]
): EvidenceBundle {
  return {
    transactionHash,
    records,
    assembledAt: evaluatedAt,
  };
}

describe("evidence hasher", () => {
  it("produces the same hash for identical evidence", () => {
    const first = createBundle([
      kycEvidence,
      sanctionsEvidence,
    ]);

    const second = createBundle([
      kycEvidence,
      sanctionsEvidence,
    ]);

    expect(hashEvidenceBundle(first)).toBe(
      hashEvidenceBundle(second)
    );
  });

  it("is independent of evidence record ordering", () => {
    const first = createBundle([
      kycEvidence,
      sanctionsEvidence,
    ]);

    const second = createBundle([
      sanctionsEvidence,
      kycEvidence,
    ]);

    expect(hashEvidenceBundle(first)).toBe(
      hashEvidenceBundle(second)
    );
  });

  it("changes when evidence content changes", () => {
    const original = createBundle([
      kycEvidence,
      sanctionsEvidence,
    ]);

    const modifiedKyc: EvidenceRecord = {
      ...kycEvidence,
      attributes: {
        status: "rejected",
        jurisdiction: "FR",
      },
    };

    const modified = createBundle([
      modifiedKyc,
      sanctionsEvidence,
    ]);

    expect(hashEvidenceBundle(original)).not.toBe(
      hashEvidenceBundle(modified)
    );
  });

  it("changes when the transaction hash changes", () => {
    const first = createBundle([
      kycEvidence,
      sanctionsEvidence,
    ]);

    const second: EvidenceBundle = {
      ...first,
      transactionHash:
        "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    };

    expect(hashEvidenceBundle(first)).not.toBe(
      hashEvidenceBundle(second)
    );
  });

  it("changes when bundle assembly time changes", () => {
    const first = createBundle([
      kycEvidence,
      sanctionsEvidence,
    ]);

    const second: EvidenceBundle = {
      ...first,
      assembledAt: evaluatedAt + 1,
    };

    expect(hashEvidenceBundle(first)).not.toBe(
      hashEvidenceBundle(second)
    );
  });

  it("produces a bytes32-compatible keccak256 hash", () => {
    const bundle = createBundle([
      kycEvidence,
      sanctionsEvidence,
    ]);

    const hash = hashEvidenceBundle(bundle);

    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
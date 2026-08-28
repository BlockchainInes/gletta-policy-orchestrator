import { describe, expect, it } from "vitest";

import { validateEvidence } from "../src/evidence/evidence-validator";

import type {
  EvidenceBundle,
  EvidenceRecord,
  EvidenceSource,
} from "../src/types/evidence";

const evaluatedAt = 1787954400;

const transactionHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

function createEvidence(
  id: string,
  source: EvidenceSource,
  expiresAt = evaluatedAt + 3600
): EvidenceRecord {
  return {
    id,
    source,
    subject: "institutional-counterparty-001",
    collectedAt: evaluatedAt - 300,
    expiresAt,
    attributes: {},
    hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  };
}

function createBundle(
  records: readonly EvidenceRecord[]
): EvidenceBundle {
  return {
    transactionHash,
    records,
    assembledAt: evaluatedAt - 60,
  };
}

const requiredSources: readonly EvidenceSource[] = [
  "kyc",
  "aml",
  "sanctions",
  "wallet-screening",
];

describe("evidence validator", () => {
  it("accepts complete and current evidence", () => {
    const bundle = createBundle([
      createEvidence("ev-kyc", "kyc"),
      createEvidence("ev-aml", "aml"),
      createEvidence("ev-sanctions", "sanctions"),
      createEvidence("ev-wallet", "wallet-screening"),
    ]);

    const result = validateEvidence(
      bundle,
      requiredSources,
      evaluatedAt
    );

    expect(result.valid).toBe(true);
    expect(result.expiredEvidenceIds).toEqual([]);
    expect(result.missingEvidenceSources).toEqual([]);
  });

  it("rejects evidence when a required source is missing", () => {
    const bundle = createBundle([
      createEvidence("ev-kyc", "kyc"),
      createEvidence("ev-aml", "aml"),
      createEvidence("ev-sanctions", "sanctions"),
    ]);

    const result = validateEvidence(
      bundle,
      requiredSources,
      evaluatedAt
    );

    expect(result.valid).toBe(false);
    expect(result.missingEvidenceSources).toEqual([
      "wallet-screening",
    ]);
  });

  it("rejects expired evidence", () => {
    const bundle = createBundle([
      createEvidence("ev-kyc", "kyc"),
      createEvidence("ev-aml", "aml"),
      createEvidence(
        "ev-sanctions",
        "sanctions",
        evaluatedAt - 1
      ),
      createEvidence("ev-wallet", "wallet-screening"),
    ]);

    const result = validateEvidence(
      bundle,
      requiredSources,
      evaluatedAt
    );

    expect(result.valid).toBe(false);
    expect(result.expiredEvidenceIds).toEqual([
      "ev-sanctions",
    ]);
    expect(result.missingEvidenceSources).toEqual([
      "sanctions",
    ]);
  });

  it("treats evidence expiring exactly at evaluation time as expired", () => {
    const bundle = createBundle([
      createEvidence(
        "ev-kyc",
        "kyc",
        evaluatedAt
      ),
      createEvidence("ev-aml", "aml"),
      createEvidence("ev-sanctions", "sanctions"),
      createEvidence("ev-wallet", "wallet-screening"),
    ]);

    const result = validateEvidence(
      bundle,
      requiredSources,
      evaluatedAt
    );

    expect(result.valid).toBe(false);
    expect(result.expiredEvidenceIds).toContain("ev-kyc");
    expect(result.missingEvidenceSources).toContain("kyc");
  });

  it("accepts a required source when another current record exists", () => {
    const bundle = createBundle([
      createEvidence(
        "ev-kyc-old",
        "kyc",
        evaluatedAt - 100
      ),
      createEvidence("ev-kyc-current", "kyc"),
      createEvidence("ev-aml", "aml"),
      createEvidence("ev-sanctions", "sanctions"),
      createEvidence("ev-wallet", "wallet-screening"),
    ]);

    const result = validateEvidence(
      bundle,
      requiredSources,
      evaluatedAt
    );

    expect(result.missingEvidenceSources).not.toContain("kyc");
  });
});
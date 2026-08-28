import { describe, expect, it } from "vitest";

import { orchestratePolicyDecision } from "../src/engine/orchestrator";

import type { EvaluationData } from "../src/engine/field-resolver";
import type {
  EvidenceBundle,
  EvidenceRecord,
  EvidenceSource,
} from "../src/types/evidence";
import type { PolicyDefinition } from "../src/types/policy";

const evaluatedAt = 1787954400;

const transactionHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

const policy: PolicyDefinition = {
  reference: {
    id: "0x8c58c8e4f125b33e8f7d4db88c9a61dc385dbfa519134e62d84f973c8538e2c1",
    hash: "0x22bb427620f67f9d707c9e5739b0a2ac4f8fb49e97d7110aac7dbead2d5c9b76",
    version: 1,
  },
  name: "Institutional Settlement Policy",
  jurisdiction: "EU",
  description:
    "Controls institutional settlement eligibility.",
  active: true,
  rules: [
    {
      id: "counterparty-approved",
      field: "counterparty.status",
      operator: "eq",
      value: "approved",
      reason: "Counterparty is not approved",
    },
    {
      id: "sanctions-clear",
      field: "screening.sanctions",
      operator: "eq",
      value: false,
      reason: "Sanctions screening failed",
    },
    {
      id: "risk-threshold",
      field: "screening.riskScore",
      operator: "lte",
      value: 25,
      reason: "Risk score exceeds settlement threshold",
    },
  ],
};

const approvedData: EvaluationData = {
  counterparty: {
    status: "approved",
  },
  screening: {
    sanctions: false,
    riskScore: 18,
  },
};

const requiredEvidenceSources: readonly EvidenceSource[] = [
  "kyc",
  "aml",
  "sanctions",
  "wallet-screening",
];

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

function createEvidenceBundle(
  records: readonly EvidenceRecord[]
): EvidenceBundle {
  return {
    transactionHash,
    records,
    assembledAt: evaluatedAt - 60,
  };
}

function createCompleteEvidence(): EvidenceBundle {
  return createEvidenceBundle([
    createEvidence("ev-kyc", "kyc"),
    createEvidence("ev-aml", "aml"),
    createEvidence("ev-sanctions", "sanctions"),
    createEvidence("ev-wallet", "wallet-screening"),
  ]);
}

describe("policy orchestrator", () => {
  it("approves when evidence is valid and policy rules pass", () => {
    const result = orchestratePolicyDecision({
      policy,
      data: approvedData,
      evidence: createCompleteEvidence(),
      requiredEvidenceSources,
      transactionHash,
      evaluatedAt,
    });

    expect(result.status).toBe("approve");
    expect(result.evidenceValid).toBe(true);
    expect(result.decision?.status).toBe("approve");
    expect(result.expiredEvidenceIds).toEqual([]);
    expect(result.missingEvidenceSources).toEqual([]);
  });

  it("denies when evidence is valid but a policy rule fails", () => {
    const data: EvaluationData = {
      counterparty: {
        status: "approved",
      },
      screening: {
        sanctions: true,
        riskScore: 18,
      },
    };

    const result = orchestratePolicyDecision({
      policy,
      data,
      evidence: createCompleteEvidence(),
      requiredEvidenceSources,
      transactionHash,
      evaluatedAt,
    });

    expect(result.status).toBe("deny");
    expect(result.evidenceValid).toBe(true);
    expect(result.decision?.status).toBe("deny");

    const failedRules = result.decision?.evaluations.filter(
      (evaluation) => !evaluation.passed
    );

    expect(failedRules?.map((evaluation) => evaluation.ruleId)).toEqual([
      "sanctions-clear",
    ]);
  });

  it("routes to review when required evidence is missing", () => {
    const evidence = createEvidenceBundle([
      createEvidence("ev-kyc", "kyc"),
      createEvidence("ev-aml", "aml"),
      createEvidence("ev-sanctions", "sanctions"),
    ]);

    const result = orchestratePolicyDecision({
      policy,
      data: approvedData,
      evidence,
      requiredEvidenceSources,
      transactionHash,
      evaluatedAt,
    });

    expect(result.status).toBe("review");
    expect(result.evidenceValid).toBe(false);
    expect(result.decision).toBeUndefined();
    expect(result.missingEvidenceSources).toEqual([
      "wallet-screening",
    ]);
  });

  it("routes to review when required evidence is expired", () => {
    const evidence = createEvidenceBundle([
      createEvidence("ev-kyc", "kyc"),
      createEvidence("ev-aml", "aml"),
      createEvidence(
        "ev-sanctions",
        "sanctions",
        evaluatedAt - 1
      ),
      createEvidence("ev-wallet", "wallet-screening"),
    ]);

    const result = orchestratePolicyDecision({
      policy,
      data: approvedData,
      evidence,
      requiredEvidenceSources,
      transactionHash,
      evaluatedAt,
    });

    expect(result.status).toBe("review");
    expect(result.evidenceValid).toBe(false);
    expect(result.decision).toBeUndefined();
    expect(result.expiredEvidenceIds).toEqual([
      "ev-sanctions",
    ]);
    expect(result.missingEvidenceSources).toEqual([
      "sanctions",
    ]);
  });
});
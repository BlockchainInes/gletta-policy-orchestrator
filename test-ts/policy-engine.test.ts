import { describe, expect, it } from "vitest";

import { evaluatePolicy } from "../src/engine/policy-engine";
import type { PolicyDefinition } from "../src/types/policy";
import type { EvaluationData } from "../src/engine/field-resolver";

const policy: PolicyDefinition = {
  reference: {
    id: "0x8c58c8e4f125b33e8f7d4db88c9a61dc385dbfa519134e62d84f973c8538e2c1",
    hash: "0x22bb427620f67f9d707c9e5739b0a2ac4f8fb49e97d7110aac7dbead2d5c9b76",
    version: 1,
  },
  name: "Institutional Settlement Policy",
  jurisdiction: "EU",
  description:
    "Controls settlement eligibility using counterparty, sanctions, risk, and asset criteria.",
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
      id: "jurisdiction-allowed",
      field: "counterparty.jurisdiction",
      operator: "in",
      value: ["FR", "DE", "ES", "NL"],
      reason: "Counterparty jurisdiction is not permitted",
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
    {
      id: "asset-regulated",
      field: "asset.classification",
      operator: "eq",
      value: "regulated",
      reason: "Asset classification is not eligible",
    },
  ],
};

const approvedData: EvaluationData = {
  transaction: {
    amount: 250000,
    currency: "EUR",
  },
  counterparty: {
    status: "approved",
    jurisdiction: "FR",
  },
  screening: {
    sanctions: false,
    riskScore: 18,
  },
  asset: {
    classification: "regulated",
  },
};

const transactionHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

const evidenceHash =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;

describe("policy engine", () => {
  it("approves a transaction when every policy rule passes", () => {
    const decision = evaluatePolicy({
      policy,
      data: approvedData,
      transactionHash,
      evidenceHash,
      evaluatedAt: 1787954400,
    });

    expect(decision.status).toBe("approve");
    expect(decision.policy).toEqual(policy.reference);
    expect(decision.transactionHash).toBe(transactionHash);
    expect(decision.evidenceHash).toBe(evidenceHash);
    expect(decision.evaluations).toHaveLength(5);

    expect(
      decision.evaluations.every(
        (evaluation) => evaluation.passed
      )
    ).toBe(true);
  });

  it("denies a transaction when sanctions screening fails", () => {
    const data: EvaluationData = {
      ...approvedData,
      screening: {
        sanctions: true,
        riskScore: 18,
      },
    };

    const decision = evaluatePolicy({
      policy,
      data,
      transactionHash,
      evidenceHash,
      evaluatedAt: 1787954400,
    });

    expect(decision.status).toBe("deny");

    const failedRules = decision.evaluations.filter(
      (evaluation) => !evaluation.passed
    );

    expect(failedRules).toHaveLength(1);
    expect(failedRules[0]?.ruleId).toBe("sanctions-clear");
    expect(failedRules[0]?.reason).toBe(
      "Sanctions screening failed"
    );
  });

  it("denies a transaction when multiple controls fail", () => {
    const data: EvaluationData = {
      ...approvedData,
      counterparty: {
        status: "approved",
        jurisdiction: "XX",
      },
      screening: {
        sanctions: false,
        riskScore: 72,
      },
    };

    const decision = evaluatePolicy({
      policy,
      data,
      transactionHash,
      evidenceHash,
      evaluatedAt: 1787954400,
    });

    expect(decision.status).toBe("deny");

    const failedRuleIds = decision.evaluations
      .filter((evaluation) => !evaluation.passed)
      .map((evaluation) => evaluation.ruleId);

    expect(failedRuleIds).toEqual([
      "jurisdiction-allowed",
      "risk-threshold",
    ]);
  });

  it("denies when required evaluation data is missing", () => {
    const data: EvaluationData = {
      transaction: {
        amount: 250000,
      },
      counterparty: {
        status: "approved",
        jurisdiction: "FR",
      },
      screening: {
        sanctions: false,
        riskScore: 18,
      },
    };

    const decision = evaluatePolicy({
      policy,
      data,
      transactionHash,
      evidenceHash,
      evaluatedAt: 1787954400,
    });

    expect(decision.status).toBe("deny");

    const assetEvaluation = decision.evaluations.find(
      (evaluation) =>
        evaluation.ruleId === "asset-regulated"
    );

    expect(assetEvaluation?.passed).toBe(false);
  });
});
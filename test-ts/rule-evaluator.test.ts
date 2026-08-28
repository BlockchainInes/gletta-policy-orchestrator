import { describe, expect, it } from "vitest";

import { evaluateRule } from "../src/engine/rule-evaluator";
import type { PolicyRule } from "../src/types/policy";

function createRule(
  operator: PolicyRule["operator"],
  value: PolicyRule["value"],
  reason = "rule failed"
): PolicyRule {
  return {
    id: `rule-${operator}`,
    field: "transaction.amount",
    operator,
    value,
    reason,
  };
}

describe("rule evaluator", () => {
  it("evaluates eq", () => {
    const result = evaluateRule(
      createRule("eq", "regulated"),
      "regulated"
    );

    expect(result.passed).toBe(true);
  });

  it("evaluates neq", () => {
    const result = evaluateRule(
      createRule("neq", "blocked"),
      "approved"
    );

    expect(result.passed).toBe(true);
  });

  it("evaluates gt", () => {
    const result = evaluateRule(
      createRule("gt", 10),
      11
    );

    expect(result.passed).toBe(true);
  });

  it("evaluates gte", () => {
    const result = evaluateRule(
      createRule("gte", 10),
      10
    );

    expect(result.passed).toBe(true);
  });

  it("evaluates lt", () => {
    const result = evaluateRule(
      createRule("lt", 100),
      99
    );

    expect(result.passed).toBe(true);
  });

  it("evaluates lte", () => {
    const result = evaluateRule(
      createRule("lte", 100),
      100
    );

    expect(result.passed).toBe(true);
  });

  it("evaluates in", () => {
    const result = evaluateRule(
      createRule("in", ["FR", "DE", "ES"]),
      "FR"
    );

    expect(result.passed).toBe(true);
  });

  it("evaluates not_in", () => {
    const result = evaluateRule(
      createRule("not_in", ["IR", "KP"]),
      "FR"
    );

    expect(result.passed).toBe(true);
  });

  it("evaluates exists", () => {
    const result = evaluateRule(
      createRule("exists", true),
      "present"
    );

    expect(result.passed).toBe(true);
  });

  it("fails numeric comparison when actual value is not numeric", () => {
    const result = evaluateRule(
      createRule("lte", 100),
      "100"
    );

    expect(result.passed).toBe(false);
  });

  it("fails membership when expected value is not an array", () => {
    const result = evaluateRule(
      createRule("in", "FR"),
      "FR"
    );

    expect(result.passed).toBe(false);
  });

  it("returns failure reason only when rule fails", () => {
    const failed = evaluateRule(
      createRule("eq", "approved", "counterparty not approved"),
      "blocked"
    );

    const passed = evaluateRule(
      createRule("eq", "approved", "counterparty not approved"),
      "approved"
    );

    expect(failed.reason).toBe("counterparty not approved");
    expect("reason" in passed).toBe(false);
  });

  it("compares arrays deterministically", () => {
    const result = evaluateRule(
      createRule("eq", ["AML", "KYC"]),
      ["AML", "KYC"]
    );

    expect(result.passed).toBe(true);
  });

  it("does not treat differently ordered arrays as equal", () => {
    const result = evaluateRule(
      createRule("eq", ["AML", "KYC"]),
      ["KYC", "AML"]
    );

    expect(result.passed).toBe(false);
  });
});
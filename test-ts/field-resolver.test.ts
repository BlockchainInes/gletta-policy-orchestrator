import { describe, expect, it } from "vitest";

import {
  resolveField,
  type EvaluationData,
} from "../src/engine/field-resolver";

const data: EvaluationData = {
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

describe("field resolver", () => {
  it("resolves a nested transaction field", () => {
    expect(
      resolveField(data, "transaction.amount")
    ).toBe(250000);
  });

  it("resolves a nested counterparty field", () => {
    expect(
      resolveField(data, "counterparty.status")
    ).toBe("approved");
  });

  it("resolves boolean values", () => {
    expect(
      resolveField(data, "screening.sanctions")
    ).toBe(false);
  });

  it("resolves numeric values", () => {
    expect(
      resolveField(data, "screening.riskScore")
    ).toBe(18);
  });

  it("resolves asset classification", () => {
    expect(
      resolveField(data, "asset.classification")
    ).toBe("regulated");
  });

  it("returns undefined for an unknown field", () => {
    expect(
      resolveField(data, "transaction.unknown")
    ).toBeUndefined();
  });

  it("returns undefined for an unknown root object", () => {
    expect(
      resolveField(data, "unknown.value")
    ).toBeUndefined();
  });

  it("returns undefined when traversal reaches a primitive", () => {
    expect(
      resolveField(data, "transaction.amount.value")
    ).toBeUndefined();
  });

  it("returns undefined for an empty path", () => {
    expect(
      resolveField(data, "")
    ).toBeUndefined();
  });

  it("does not traverse arrays", () => {
    const arrayData: EvaluationData = {
      screening: {
        providers: ["provider-a", "provider-b"],
      },
    };

    expect(
      resolveField(arrayData, "screening.providers.0")
    ).toBeUndefined();
  });
});
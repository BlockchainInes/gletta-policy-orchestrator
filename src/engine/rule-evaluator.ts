import type {
  PolicyOperator,
  PolicyRule,
  PolicyValue,
} from "../types/policy";

import type { RuleEvaluation } from "../types/decision";

function valuesEqual(
  actual: unknown,
  expected: PolicyValue
): boolean {
  if (Array.isArray(actual) && Array.isArray(expected)) {
    return (
      actual.length === expected.length &&
      actual.every((value, index) => value === expected[index])
    );
  }

  return actual === expected;
}

function compareNumbers(
  actual: unknown,
  expected: PolicyValue,
  operator: PolicyOperator
): boolean {
  if (
    typeof actual !== "number" ||
    typeof expected !== "number"
  ) {
    return false;
  }

  switch (operator) {
    case "gt":
      return actual > expected;

    case "gte":
      return actual >= expected;

    case "lt":
      return actual < expected;

    case "lte":
      return actual <= expected;

    default:
      return false;
  }
}

function evaluateMembership(
  actual: unknown,
  expected: PolicyValue,
  negate: boolean
): boolean {
  if (!Array.isArray(expected)) {
    return false;
  }

  const included = expected.some(
    (value) => value === actual
  );

  return negate ? !included : included;
}

function evaluateOperator(
  operator: PolicyOperator,
  actual: unknown,
  expected: PolicyValue
): boolean {
  switch (operator) {
    case "eq":
      return valuesEqual(actual, expected);

    case "neq":
      return !valuesEqual(actual, expected);

    case "gt":
    case "gte":
    case "lt":
    case "lte":
      return compareNumbers(
        actual,
        expected,
        operator
      );

    case "in":
      return evaluateMembership(
        actual,
        expected,
        false
      );

    case "not_in":
      return evaluateMembership(
        actual,
        expected,
        true
      );

    case "exists":
      return actual !== undefined && actual !== null;

    default:
      return false;
  }
}

export function evaluateRule(
  rule: PolicyRule,
  actualValue: unknown
): RuleEvaluation {
  const passed = evaluateOperator(
    rule.operator,
    actualValue,
    rule.value
  );

  const evaluation: RuleEvaluation = {
    ruleId: rule.id,
    passed,
    actualValue,
    expectedValue: rule.value,
  };

  if (!passed && rule.reason !== undefined) {
    evaluation.reason = rule.reason;
  }

  return evaluation;
}
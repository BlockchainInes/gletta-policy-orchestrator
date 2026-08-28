import type {
  PolicyDefinition,
  PolicyReference,
} from "../types/policy";

import type {
  DecisionSummary,
  PolicyDecision,
  RuleEvaluation,
} from "../types/decision";

import type { EvidenceHash } from "../types/evidence";

import {
  resolveField,
  type EvaluationData,
} from "./field-resolver";

import { evaluateRule } from "./rule-evaluator";

export interface PolicyEvaluationInput {
  policy: PolicyDefinition;
  data: EvaluationData;
  transactionHash: `0x${string}`;
  evidenceHash: EvidenceHash;
  evaluatedAt: number;
}

function createPolicyReference(
  policy: PolicyDefinition
): PolicyReference {
  return {
    id: policy.reference.id,
    hash: policy.reference.hash,
    version: policy.reference.version,
  };
}

function createDecisionSummary(
  evaluations: readonly RuleEvaluation[]
): DecisionSummary {
  const failedRuleIds = evaluations
    .filter((evaluation) => !evaluation.passed)
    .map((evaluation) => evaluation.ruleId);

  return {
    approved: failedRuleIds.length === 0,
    requiresReview: false,
    failedRuleIds,
  };
}

export function evaluatePolicy(
  input: PolicyEvaluationInput
): PolicyDecision {
  const evaluations = input.policy.rules.map((rule) => {
    const actualValue = resolveField(
      input.data,
      rule.field
    );

    return evaluateRule(
      rule,
      actualValue
    );
  });

  const summary = createDecisionSummary(
    evaluations
  );

  return {
    policy: createPolicyReference(
      input.policy
    ),
    status: summary.approved ? "approve" : "deny",
    transactionHash: input.transactionHash,
    evidenceHash: input.evidenceHash,
    evaluatedAt: input.evaluatedAt,
    evaluations,
  };
}
import type {
  EvidenceBundle,
  EvidenceSource,
} from "../types/evidence";

import type {
  DecisionStatus,
  PolicyDecision,
} from "../types/decision";

import type { PolicyDefinition } from "../types/policy";

import type { EvaluationData } from "./field-resolver";

import {
  validateEvidence,
} from "../evidence/evidence-validator";

import {
  hashEvidenceBundle,
} from "../evidence/evidence-hasher";

import {
  evaluatePolicy,
} from "./policy-engine";

export interface OrchestrationInput {
  policy: PolicyDefinition;
  data: EvaluationData;
  evidence: EvidenceBundle;
  requiredEvidenceSources: readonly EvidenceSource[];
  transactionHash: `0x${string}`;
  evaluatedAt: number;
}

export interface OrchestrationResult {
  status: DecisionStatus;
  evidenceValid: boolean;
  decision?: PolicyDecision;
  expiredEvidenceIds: readonly string[];
  missingEvidenceSources: readonly EvidenceSource[];
}

export function orchestratePolicyDecision(
  input: OrchestrationInput
): OrchestrationResult {
  const evidenceValidation = validateEvidence(
    input.evidence,
    input.requiredEvidenceSources,
    input.evaluatedAt
  );

  if (!evidenceValidation.valid) {
    return {
      status: "review",
      evidenceValid: false,
      expiredEvidenceIds:
        evidenceValidation.expiredEvidenceIds,
      missingEvidenceSources:
        evidenceValidation.missingEvidenceSources,
    };
  }

  const evidenceHash = hashEvidenceBundle(
    input.evidence
  );

  const decision = evaluatePolicy({
    policy: input.policy,
    data: input.data,
    transactionHash: input.transactionHash,
    evidenceHash,
    evaluatedAt: input.evaluatedAt,
  });

  return {
    status: decision.status,
    evidenceValid: true,
    decision,
    expiredEvidenceIds: [],
    missingEvidenceSources: [],
  };
}
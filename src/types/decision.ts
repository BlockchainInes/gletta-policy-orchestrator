import type { EvidenceHash } from "./evidence";
import type { PolicyReference } from "./policy";

export type DecisionStatus =
  | "approve"
  | "deny"
  | "review";

export interface RuleEvaluation {
  ruleId: string;
  passed: boolean;
  actualValue?: unknown;
  expectedValue?: unknown;
  reason?: string;
}

export interface PolicyDecision {
  policy: PolicyReference;
  status: DecisionStatus;
  transactionHash: `0x${string}`;
  evidenceHash: EvidenceHash;
  evaluatedAt: number;
  evaluations: readonly RuleEvaluation[];
}

export interface AuthorizationRequest {
  authorizationId: `0x${string}`;
  transactionHash: `0x${string}`;
  evidenceHash: EvidenceHash;
  policy: PolicyReference;
  decision: DecisionStatus;
  expiresAt: number;
}

export interface DecisionSummary {
  approved: boolean;
  requiresReview: boolean;
  failedRuleIds: readonly string[];
}
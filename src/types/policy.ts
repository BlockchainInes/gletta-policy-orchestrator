export type PolicyId = `0x${string}`;
export type PolicyHash = `0x${string}`;

export type PolicyVersion = number;

export interface PolicyReference {
  id: PolicyId;
  hash: PolicyHash;
  version: PolicyVersion;
}

export interface PolicyDefinition {
  reference: PolicyReference;
  name: string;
  jurisdiction: string;
  description: string;
  active: boolean;
  rules: PolicyRule[];
}

export interface PolicyRule {
  id: string;
  field: string;
  operator: PolicyOperator;
  value: PolicyValue;
  reason?: string;
}

export type PolicyOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "exists";

export type PolicyValue =
  | string
  | number
  | boolean
  | readonly string[]
  | readonly number[];

export interface PolicyEvaluationContext {
  policy: PolicyDefinition;
  evaluatedAt: number;
}
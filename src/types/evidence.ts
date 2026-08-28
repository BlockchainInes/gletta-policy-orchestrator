export type EvidenceHash = `0x${string}`;

export type EvidenceSource =
  | "kyc"
  | "aml"
  | "sanctions"
  | "wallet-screening"
  | "transaction-monitoring"
  | "asset-registry"
  | "manual-review"
  | "external-provider";

export interface EvidenceRecord {
  id: string;
  source: EvidenceSource;
  subject: string;
  collectedAt: number;
  expiresAt?: number;
  attributes: Readonly<Record<string, EvidenceValue>>;
  hash: EvidenceHash;
}

export type EvidenceValue =
  | string
  | number
  | boolean
  | readonly string[]
  | readonly number[];

export interface EvidenceBundle {
  transactionHash: `0x${string}`;
  records: readonly EvidenceRecord[];
  assembledAt: number;
}

export interface EvidenceValidationResult {
  valid: boolean;
  expiredEvidenceIds: readonly string[];
  missingEvidenceSources: readonly EvidenceSource[];
}